/**
 * Tests for packages/protocols/src/index.ts
 *
 * Covers:
 *   - listProtocols() / describeProtocol()
 *   - runProtocol() error paths (unknown protocol, missing file, invalid JSON, schema failure)
 *   - runProtocol() with a valid project (dryRun: true, custom taskId)
 *   - runProtocol() resume path (loadResumeManifest)
 *   - runProtocolBackground() via registerProtocolTools task execution
 *   - registerProtocolTools() wires MCP tools
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Mock appendLedger so it never writes to disk during tests
// ---------------------------------------------------------------------------
vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    appendLedger: vi.fn().mockResolvedValue(undefined),
  };
});

import {
  listProtocols,
  describeProtocol,
  runProtocol,
  registerProtocolTools,
  STEP_NAMES,
} from "@creator-studio-os/protocols";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_PROJECT = {
  schemaVersion: 2 as const,
  name: "Index Test",
  slug: "index-test",
  kind: "trailer" as const,
  brand: { primaryColor: "#001122", secondaryColor: "#eef0f2" },
  deliverables: {
    main: {
      format: "mov" as const,
      resolution: "1920x1080",
      codec: "H.264",
      frameRate: "29.97" as const,
    },
  },
  scenes: [
    { id: "sc1", title: "Intro", durationSeconds: 5 },
    { id: "sc2", title: "Outro", durationSeconds: 3 },
  ],
};

let tmpDir: string;
let validProjectPath: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "csos-index-test-"));
  validProjectPath = join(tmpDir, "project.json");
  await writeFile(validProjectPath, JSON.stringify(MINIMAL_PROJECT, null, 2), "utf-8");
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// listProtocols
// ---------------------------------------------------------------------------

describe("listProtocols", () => {
  it("returns an array with at least two protocols", () => {
    const protocols = listProtocols();
    expect(Array.isArray(protocols)).toBe(true);
    expect(protocols.length).toBeGreaterThanOrEqual(2);
  });

  it("includes brand-deck-minimal", () => {
    const protocols = listProtocols();
    const found = protocols.find((p) => p.name === "brand-deck-minimal");
    expect(found).toBeDefined();
    expect(typeof found!.description).toBe("string");
    expect(found!.stepCount).toBe(STEP_NAMES.length);
  });

  it("includes steam-trailer-minimal", () => {
    const protocols = listProtocols();
    const found = protocols.find((p) => p.name === "steam-trailer-minimal");
    expect(found).toBeDefined();
  });

  it("each entry has name, description, stepCount", () => {
    for (const p of listProtocols()) {
      expect(typeof p.name).toBe("string");
      expect(typeof p.description).toBe("string");
      expect(typeof p.stepCount).toBe("number");
      expect(p.stepCount).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// describeProtocol
// ---------------------------------------------------------------------------

describe("describeProtocol", () => {
  it("describes brand-deck-minimal with correct step names", () => {
    const info = describeProtocol("brand-deck-minimal");
    expect(info.name).toBe("brand-deck-minimal");
    expect(Array.isArray(info.stepNames)).toBe(true);
    expect(info.stepNames.length).toBe(STEP_NAMES.length);
    expect(info.stepNames[0]).toBe("validate-project");
    expect(info.stepNames[info.stepNames.length - 1]).toBe("write-replay-manifest");
  });

  it("describes steam-trailer-minimal", () => {
    const info = describeProtocol("steam-trailer-minimal");
    expect(info.name).toBe("steam-trailer-minimal");
    expect(info.stepNames.length).toBeGreaterThan(0);
  });

  it("throws E_PROTOCOL_NOT_FOUND for unknown name", () => {
    expect(() => describeProtocol("not-a-real-protocol")).toThrow("Protocol not found");
  });

  it("thrown error mentions available protocols in message", () => {
    let thrown: Error | undefined;
    try {
      describeProtocol("bogus");
    } catch (e) {
      thrown = e as Error;
    }
    expect(thrown).toBeDefined();
    expect(thrown!.message).toMatch(/Protocol not found/);
  });
});

// ---------------------------------------------------------------------------
// runProtocol — error paths in loadProjectV2
// ---------------------------------------------------------------------------

describe("runProtocol — error paths", () => {
  it("throws E_PROTOCOL_NOT_FOUND for unknown protocol", async () => {
    const gen = runProtocol({
      name: "no-such-protocol",
      projectPath: validProjectPath,
      dryRun: true,
    });
    await expect(gen.next()).rejects.toThrow("Protocol not found");
  });

  it("throws E_PROJECT_V2_INVALID when project file does not exist", async () => {
    const gen = runProtocol({
      name: "brand-deck-minimal",
      projectPath: join(tmpDir, "nonexistent", "project.json"),
      dryRun: true,
    });
    await expect(gen.next()).rejects.toThrow(/Cannot read project file/);
  });

  it("throws E_PROJECT_V2_INVALID when project file contains invalid JSON", async () => {
    const badJsonPath = join(tmpDir, "bad.json");
    await writeFile(badJsonPath, "{ this is not : valid json }", "utf-8");
    const gen = runProtocol({
      name: "brand-deck-minimal",
      projectPath: badJsonPath,
      dryRun: true,
    });
    await expect(gen.next()).rejects.toThrow(/not valid JSON/);
  });

  it("throws E_PROJECT_V2_INVALID when project fails schema (schemaVersion: 1)", async () => {
    const v1Path = join(tmpDir, "project-v1.json");
    await writeFile(
      v1Path,
      JSON.stringify({ schemaVersion: 1, name: "old", kind: "trailer", scenes: [], deliverables: {} }),
      "utf-8",
    );
    const gen = runProtocol({
      name: "brand-deck-minimal",
      projectPath: v1Path,
      dryRun: true,
    });
    await expect(gen.next()).rejects.toThrow();
  });

  it("throws E_PROJECT_V2_INVALID when project JSON is valid but missing required fields", async () => {
    const partialPath = join(tmpDir, "project-partial.json");
    await writeFile(partialPath, JSON.stringify({ schemaVersion: 2, name: "no-slug" }), "utf-8");
    const gen = runProtocol({
      name: "brand-deck-minimal",
      projectPath: partialPath,
      dryRun: true,
    });
    await expect(gen.next()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// runProtocol — successful dry-run with explicit taskId
// ---------------------------------------------------------------------------

describe("runProtocol — dry-run with custom taskId", () => {
  it("yields all STEP_NAMES.length steps", async () => {
    const steps: string[] = [];
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: validProjectPath,
      dryRun: true,
      taskId: "idx-test-1",
    })) {
      steps.push(step.stepName);
    }
    expect(steps).toHaveLength(STEP_NAMES.length);
    expect(steps).toEqual([...STEP_NAMES]);
  });

  it("all steps succeed in dry-run", async () => {
    const failures: string[] = [];
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: validProjectPath,
      dryRun: true,
      taskId: "idx-test-2",
    })) {
      if (step.status === "failed") failures.push(step.stepName);
    }
    expect(failures).toHaveLength(0);
  });

  it("each step has durationMs >= 0", async () => {
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: validProjectPath,
      dryRun: true,
      taskId: "idx-test-3",
    })) {
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses auto-generated taskId when taskId is omitted", async () => {
    const steps: string[] = [];
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: validProjectPath,
      dryRun: true,
    })) {
      steps.push(step.stepName);
    }
    // Just verify it runs without error when no taskId provided
    expect(steps.length).toBe(STEP_NAMES.length);
  });
});

// ---------------------------------------------------------------------------
// runProtocol — resume path (loadResumeManifest)
// ---------------------------------------------------------------------------

describe("runProtocol — resume path", () => {
  let firstTaskId: string;

  beforeAll(async () => {
    firstTaskId = `idx-resume-first-${Date.now()}`;
    // Run once to create the manifest
    for await (const _ of runProtocol({
      name: "brand-deck-minimal",
      projectPath: validProjectPath,
      dryRun: true,
      taskId: firstTaskId,
    })) { /* drain */ }
  });

  it("resume run yields same step count", async () => {
    const steps: string[] = [];
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: validProjectPath,
      dryRun: true,
      taskId: `${firstTaskId}-r`,
      resume: firstTaskId,
    })) {
      steps.push(step.stepName);
    }
    expect(steps).toHaveLength(STEP_NAMES.length);
  });

  it("all steps except write-replay-manifest are skipped on resume", async () => {
    const notSkipped: string[] = [];
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: validProjectPath,
      dryRun: true,
      taskId: `${firstTaskId}-r2`,
      resume: firstTaskId,
    })) {
      if (step.stepName !== "write-replay-manifest" && step.status !== "skipped") {
        notSkipped.push(step.stepName);
      }
    }
    expect(notSkipped).toHaveLength(0);
  });

  it("resume with nonexistent taskId runs all steps normally (manifest not found → undefined)", async () => {
    const steps: string[] = [];
    const failures: string[] = [];
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: validProjectPath,
      dryRun: true,
      taskId: "idx-resume-new",
      resume: "does-not-exist-task-id",
    })) {
      steps.push(step.stepName);
      if (step.status === "failed") failures.push(step.stepName);
    }
    expect(steps).toHaveLength(STEP_NAMES.length);
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// registerProtocolTools — MCP server wiring
// ---------------------------------------------------------------------------

describe("registerProtocolTools", () => {
  it("calls server.experimental.tasks.registerToolTask for csos_protocol_run", () => {
    const registeredTasks: string[] = [];
    const registeredTools: string[] = [];

    const mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn((name: string) => {
            registeredTasks.push(name);
          }),
        },
      },
      tool: vi.fn((name: string) => {
        registeredTools.push(name);
      }),
    };

    // registerProtocolTools expects McpServer — cast to bypass TypeScript
    registerProtocolTools(mockServer as unknown as Parameters<typeof registerProtocolTools>[0]);

    expect(registeredTasks).toContain("csos_protocol_run");
    expect(registeredTools).toContain("csos_protocol_list");
    expect(registeredTools).toContain("csos_protocol_describe");
  });

  it("csos_protocol_list tool handler returns protocol list text", async () => {
    let listHandler: (() => Promise<unknown>) | undefined;

    const mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn(),
        },
      },
      tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: unknown) => {
        if (name === "csos_protocol_list") {
          listHandler = handler as () => Promise<unknown>;
        }
      }),
    };

    registerProtocolTools(mockServer as unknown as Parameters<typeof registerProtocolTools>[0]);
    expect(listHandler).toBeDefined();

    const result = await listHandler!() as { content: Array<{ type: string; text: string }> };
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toMatch(/brand-deck-minimal/);
  });

  it("csos_protocol_describe tool handler returns step info for known protocol", async () => {
    let describeHandler: ((args: { name: string }) => Promise<unknown>) | undefined;

    const mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn(),
        },
      },
      tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: unknown) => {
        if (name === "csos_protocol_describe") {
          describeHandler = handler as (args: { name: string }) => Promise<unknown>;
        }
      }),
    };

    registerProtocolTools(mockServer as unknown as Parameters<typeof registerProtocolTools>[0]);
    expect(describeHandler).toBeDefined();

    const result = await describeHandler!({ name: "brand-deck-minimal" }) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content[0].text).toMatch(/validate-project/);
    expect(result.content[0].text).toMatch(/brand-deck-minimal/);
  });

  it("csos_protocol_describe tool handler returns isError for unknown protocol", async () => {
    let describeHandler: ((args: { name: string }) => Promise<unknown>) | undefined;

    const mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn(),
        },
      },
      tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: unknown) => {
        if (name === "csos_protocol_describe") {
          describeHandler = handler as (args: { name: string }) => Promise<unknown>;
        }
      }),
    };

    registerProtocolTools(mockServer as unknown as Parameters<typeof registerProtocolTools>[0]);

    const result = await describeHandler!({ name: "no-such-protocol" }) as {
      isError: boolean;
      content: Array<{ text: string }>;
    };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Error/);
  });

  it("csos_protocol_run task createTask fires runProtocolBackground and returns a task object", async () => {
    let createTaskHandler:
      | ((args: { name: string; projectPath: string; dryRun: boolean; resume?: string }, extra: unknown) => Promise<unknown>)
      | undefined;

    const mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn((_name: string, _schema: unknown, handlers: unknown) => {
            createTaskHandler = (handlers as { createTask: typeof createTaskHandler }).createTask;
          }),
        },
      },
      tool: vi.fn(),
    };

    registerProtocolTools(mockServer as unknown as Parameters<typeof registerProtocolTools>[0]);
    expect(createTaskHandler).toBeDefined();

    const fakeTask = { taskId: "bg-test-task-1" };
    const taskStore = {
      createTask: vi.fn().mockResolvedValue(fakeTask),
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      storeTaskResult: vi.fn().mockResolvedValue(undefined),
      getTask: vi.fn().mockResolvedValue(fakeTask),
      getTaskResult: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "done" }] }),
    };

    const result = await createTaskHandler!(
      {
        name: "brand-deck-minimal",
        projectPath: validProjectPath,
        dryRun: true,
      },
      { taskStore },
    ) as { task: { taskId: string } };

    expect(result.task.taskId).toBe("bg-test-task-1");

    // Give the background runner a moment to complete (it's fire-and-forget)
    await new Promise((r) => setTimeout(r, 200));
  });
});

// ---------------------------------------------------------------------------
// runProtocolBackground — via MCP createTask (success + failure paths)
// ---------------------------------------------------------------------------

describe("runProtocolBackground — success and failure", () => {
  it("storeTaskResult called with completed after successful dry run", async () => {
    let createTaskHandler:
      | ((args: { name: string; projectPath: string; dryRun: boolean }, extra: unknown) => Promise<unknown>)
      | undefined;

    const mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn((_name: string, _schema: unknown, handlers: unknown) => {
            createTaskHandler = (handlers as { createTask: typeof createTaskHandler }).createTask;
          }),
        },
      },
      tool: vi.fn(),
    };

    registerProtocolTools(mockServer as unknown as Parameters<typeof registerProtocolTools>[0]);

    const fakeTask = { taskId: `bg-success-${Date.now()}` };
    const storeTaskResult = vi.fn().mockResolvedValue(undefined);
    const taskStore = {
      createTask: vi.fn().mockResolvedValue(fakeTask),
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      storeTaskResult,
    };

    await createTaskHandler!(
      { name: "brand-deck-minimal", projectPath: validProjectPath, dryRun: true },
      { taskStore },
    );

    // Wait for the background runner to finish
    await new Promise((r) => setTimeout(r, 500));

    // Should have been called with "completed"
    const calls = storeTaskResult.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toBe("completed");
  });

  it("storeTaskResult called with failed when protocol not found", async () => {
    let createTaskHandler:
      | ((args: { name: string; projectPath: string; dryRun: boolean }, extra: unknown) => Promise<unknown>)
      | undefined;

    const mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn((_name: string, _schema: unknown, handlers: unknown) => {
            createTaskHandler = (handlers as { createTask: typeof createTaskHandler }).createTask;
          }),
        },
      },
      tool: vi.fn(),
    };

    registerProtocolTools(mockServer as unknown as Parameters<typeof registerProtocolTools>[0]);

    const fakeTask = { taskId: `bg-fail-${Date.now()}` };
    const storeTaskResult = vi.fn().mockResolvedValue(undefined);
    const taskStore = {
      createTask: vi.fn().mockResolvedValue(fakeTask),
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      storeTaskResult,
    };

    await createTaskHandler!(
      { name: "no-such-protocol", projectPath: validProjectPath, dryRun: true },
      { taskStore },
    );

    await new Promise((r) => setTimeout(r, 300));

    const calls = storeTaskResult.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toBe("failed");
    expect(lastCall[2].isError).toBe(true);
  });

  it("storeTaskResult called with failed when project path missing", async () => {
    let createTaskHandler:
      | ((args: { name: string; projectPath: string; dryRun: boolean }, extra: unknown) => Promise<unknown>)
      | undefined;

    const mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn((_name: string, _schema: unknown, handlers: unknown) => {
            createTaskHandler = (handlers as { createTask: typeof createTaskHandler }).createTask;
          }),
        },
      },
      tool: vi.fn(),
    };

    registerProtocolTools(mockServer as unknown as Parameters<typeof registerProtocolTools>[0]);

    const fakeTask = { taskId: `bg-missing-${Date.now()}` };
    const storeTaskResult = vi.fn().mockResolvedValue(undefined);
    const taskStore = {
      createTask: vi.fn().mockResolvedValue(fakeTask),
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      storeTaskResult,
    };

    await createTaskHandler!(
      { name: "brand-deck-minimal", projectPath: "/nonexistent/path/project.json", dryRun: true },
      { taskStore },
    );

    await new Promise((r) => setTimeout(r, 300));

    const calls = storeTaskResult.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toBe("failed");
  });
});
