/**
 * Protocol registry and orchestrator.
 *
 * Exposes:
 *   runProtocol()       — async generator; use in CLI and smoke harness
 *   listProtocols()     — metadata for all registered protocols
 *   describeProtocol()  — single-protocol metadata
 *   registerProtocolTools() — wires csos_protocol_run MCP task tool
 */
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetTaskResult, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Task } from "@modelcontextprotocol/sdk/types.js";
import { InMemoryTaskStore } from "@modelcontextprotocol/sdk/experimental/tasks/stores/in-memory.js";
import { ProjectV2Schema, type ProjectV2 } from "../projects/types.js";
import { appendLedger } from "../ledger/index.js";
import { CreatorStudioError } from "../errors.js";
import type { ProtocolDef, ProtocolStep, RunProtocolOpts, ReplayManifest } from "./types.js";
import { brandDeckMinimal } from "./brand-deck-minimal.js";
// steam-trailer-minimal kept as a registry alias for backward compat (v1.7.7+).
// The 13-step implementation lives in brand-deck-minimal.
import { steamTrailerMinimal } from "./steam-trailer-minimal.js";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REGISTRY: Record<string, ProtocolDef> = {
  // brand-deck-minimal: 13-step pipeline with optional per-scene Motion render
  "brand-deck-minimal": brandDeckMinimal,
  // steam-trailer-minimal: alias for brand-deck-minimal (v1.7.7+)
  "steam-trailer-minimal": steamTrailerMinimal,
};

export function listProtocols(): Array<{ name: string; description: string; stepCount: number }> {
  return Object.values(REGISTRY).map((p) => ({
    name: p.name,
    description: p.description,
    stepCount: p.stepNames.length,
  }));
}

export function describeProtocol(name: string): {
  name: string;
  description: string;
  stepNames: readonly string[];
} {
  const p = REGISTRY[name];
  if (!p) {
    throw new CreatorStudioError(
      "E_PROTOCOL_NOT_FOUND",
      `Protocol not found: "${name}"`,
      `Available protocols: ${Object.keys(REGISTRY).join(", ")}`,
    );
  }
  return { name: p.name, description: p.description, stepNames: p.stepNames };
}

// ---------------------------------------------------------------------------
// Load ProjectV2 from disk
// ---------------------------------------------------------------------------

async function loadProjectV2(projectPath: string): Promise<ProjectV2> {
  let raw: string;
  try {
    raw = await readFile(projectPath, "utf-8");
  } catch {
    throw new CreatorStudioError(
      "E_PROJECT_V2_INVALID",
      `Cannot read project file: ${projectPath}`,
      "Pass the absolute path to a project.json v2 file.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CreatorStudioError(
      "E_PROJECT_V2_INVALID",
      `${projectPath} is not valid JSON`,
    );
  }

  const result = ProjectV2Schema.safeParse(parsed);
  if (!result.success) {
    throw new CreatorStudioError(
      "E_PROJECT_V2_INVALID",
      `${projectPath} failed ProjectV2 schema: ${result.error.message}`,
      'Ensure schemaVersion is 2 and all required fields are present. See demo/csos-showcase/project.json.',
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Load resume manifest
// ---------------------------------------------------------------------------

async function loadResumeManifest(
  projectOutDir: string,
  taskId: string,
): Promise<ReplayManifest | undefined> {
  const replayPath = join(projectOutDir, ".csos", `replay-${taskId}.json`);
  try {
    const raw = await readFile(replayPath, "utf-8");
    return JSON.parse(raw) as ReplayManifest;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Public run API (used by CLI and smoke)
// ---------------------------------------------------------------------------

export interface RunProtocolPublicOpts {
  name: string;
  /** Absolute path to project.json v2 */
  projectPath: string;
  dryRun?: boolean;
  /** taskId from a previous run; enables step skipping via replay manifest */
  resume?: string;
  /** Override task ID (default: derived from timestamp) */
  taskId?: string;
}

export async function* runProtocol(
  opts: RunProtocolPublicOpts,
): AsyncGenerator<ProtocolStep> {
  const { name, projectPath, dryRun = false } = opts;

  const proto = REGISTRY[name];
  if (!proto) {
    throw new CreatorStudioError(
      "E_PROTOCOL_NOT_FOUND",
      `Protocol not found: "${name}"`,
      `Available: ${Object.keys(REGISTRY).join(", ")}`,
    );
  }

  const project = await loadProjectV2(projectPath);
  const projectOutDir = resolve(dirname(projectPath), "out"); // must be absolute for external CLIs
  await mkdir(projectOutDir, { recursive: true });

  const taskId = opts.taskId ?? `cli-${Date.now()}`;

  let resumeManifest: ReplayManifest | undefined;
  if (opts.resume) {
    resumeManifest = await loadResumeManifest(projectOutDir, opts.resume);
  }

  const runOpts: RunProtocolOpts = {
    taskId,
    dryRun,
    resumeManifest,
    projectOutDir,
    protocolName: proto.name,
  };

  for await (const step of proto.run(project, runOpts)) {
    // Ledger entry per step
    await appendLedger({
      ts: new Date().toISOString(),
      tool: `protocol:${name}:${step.stepName}`,
      args: { dryRun, taskId },
      result: { status: step.status, detail: step.detail },
      durationMs: step.durationMs,
    }).catch(() => undefined);

    yield step;
  }
}

// ---------------------------------------------------------------------------
// Background runner for MCP task tool
// ---------------------------------------------------------------------------

async function runProtocolBackground(
  taskId: string,
  args: { name: string; projectPath: string; dryRun: boolean; resume?: string },
  taskStore: {
    updateTaskStatus(taskId: string, status: Task["status"], statusMessage?: string): Promise<void>;
    storeTaskResult(
      taskId: string,
      status: "completed" | "failed",
      result: CallToolResult,
    ): Promise<void>;
  },
): Promise<void> {
  const steps: ProtocolStep[] = [];
  try {
    for await (const step of runProtocol({ ...args, taskId })) {
      steps.push(step);
      const msg = `${step.stepName}: ${step.status}${step.detail ? ` — ${step.detail}` : ""}`;
      await taskStore
        .updateTaskStatus(taskId, "working", msg)
        .catch(() => undefined);
    }

    const summary = steps.map((s) => `${s.stepName}: ${s.status}`).join("\n");
    const failed = steps.filter((s) => s.status === "failed");

    if (failed.length > 0) {
      await taskStore.storeTaskResult(taskId, "failed", {
        content: [
          {
            type: "text",
            text: `Protocol "${args.name}" failed at: ${failed.map((s) => s.stepName).join(", ")}\n\n${summary}`,
          },
        ],
        isError: true,
      });
    } else {
      await taskStore.storeTaskResult(taskId, "completed", {
        content: [
          {
            type: "text",
            text: `Protocol "${args.name}" completed successfully.\n\n${summary}`,
          },
        ],
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await taskStore
      .storeTaskResult(taskId, "failed", {
        content: [{ type: "text", text: `Protocol "${args.name}" error: ${message}` }],
        isError: true,
      })
      .catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// MCP tool registration
// ---------------------------------------------------------------------------

export function registerProtocolTools(server: McpServer): void {
  server.experimental.tasks.registerToolTask(
    "csos_protocol_run",
    {
      title: "Run csos protocol",
      description:
        "Run a creator-studio-os cross-app protocol end-to-end against a ProjectV2 project.json. " +
        "Returns a taskId immediately; poll tasks/get for status and tasks/result for the final " +
        "step summary. Supports --resume <taskId> to skip already-completed steps (idempotent).",
      inputSchema: {
        name: z
          .string()
          .describe('Protocol name, e.g. "steam-trailer-minimal". Use csos_protocol_list to enumerate.'),
        projectPath: z
          .string()
          .describe("Absolute path to a project.json v2 file."),
        dryRun: z
          .boolean()
          .default(false)
          .describe(
            "Mock all external calls (AppleScript, Compressor, FCP). Exercises full harness without real apps.",
          ),
        resume: z
          .string()
          .optional()
          .describe(
            "taskId of a previous run. Steps whose replay-manifest entry is 'completed' will be skipped.",
          ),
      },
      execution: { taskSupport: "required" },
    },
    {
      createTask: async ({ name, projectPath, dryRun, resume }, extra) => {
        const task = await extra.taskStore.createTask({ ttl: 3_600_000 });
        // Fire-and-forget background execution
        void runProtocolBackground(
          task.taskId,
          { name, projectPath, dryRun, resume },
          extra.taskStore,
        );
        return { task };
      },
      getTask: async (_args, extra) => {
        const task = await extra.taskStore.getTask(extra.taskId);
        return task as unknown as GetTaskResult;
      },
      getTaskResult: async (_args, extra) => {
        return (await extra.taskStore.getTaskResult(extra.taskId)) as CallToolResult;
      },
    },
  );

  // csos_protocol_list — lightweight, synchronous
  server.tool(
    "csos_protocol_list",
    "List all registered csos cross-app protocols with their names, descriptions, and step counts.",
    {},
    async () => {
      const protocols = listProtocols();
      return {
        content: [
          {
            type: "text",
            text: protocols
              .map((p) => `${p.name} (${p.stepCount} steps)\n  ${p.description}`)
              .join("\n\n"),
          },
        ],
      };
    },
  );

  // csos_protocol_describe
  server.tool(
    "csos_protocol_describe",
    "Describe a single csos cross-app protocol — its purpose, step names, and usage notes.",
    {
      name: z.string().describe("Protocol name returned by csos_protocol_list"),
    },
    async ({ name }) => {
      try {
        const info = describeProtocol(name);
        return {
          content: [
            {
              type: "text",
              text: [
                `Protocol: ${info.name}`,
                `Description: ${info.description}`,
                `Steps (${info.stepNames.length}):`,
                info.stepNames.map((s, i) => `  ${i + 1}. ${s}`).join("\n"),
              ].join("\n"),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: err instanceof CreatorStudioError
                ? `Error: ${err.message}\nHint: ${err.hint ?? ""}`
                : String(err),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
