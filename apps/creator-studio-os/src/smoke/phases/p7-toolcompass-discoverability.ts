/**
 * Phase 7 — tool-compass discoverability regression.
 *
 * Syncs csos's 78 tool descriptions into a tool-compass HNSW index, then
 * runs 12 representative intent queries. Each query must return its target
 * tool in the top-3 results with score > 0.4.
 *
 * Purpose: catch description drift that breaks semantic retrieval. A failing
 * query shows the full diagnostic: query, expected target, actual top-3 with
 * scores — so a description regression is immediately diagnosable.
 *
 * Requirements (real mode): venv/bin/tool-compass installed at repo root,
 * ollama running with nomic-embed-text pulled.
 *
 * Dry-run mode: mocks the tool-compass spawn and returns canned passes — safe
 * for CI without ollama.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { appendLedger } from "@creator-studio-os/core";
import type { PhaseResult } from "../report.js";
import type { SmokeOpts } from "../index.js";

interface QueryFixture {
  query: string;
  target_tool: string;
}

interface CompassResult {
  rank: number;
  tool: string;
  score: number;
  description?: string;
}

interface QueryResult {
  query: string;
  targetTool: string;
  passed: boolean;
  rank: number | null;
  score: number | null;
  top3: CompassResult[];
}

const MIN_SCORE = 0.4;
const TOP_K = 3;

function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/smoke/phases/ → ../../../ → repo root
  return join(here, "..", "..", "..");
}

function compassBin(): string {
  return join(repoRoot(), "venv", "bin", "tool-compass");
}

function fixturePath(): string {
  return join(repoRoot(), "tests", "fixtures", "toolcompass-queries.json");
}

async function runCompass(args: string[], env: Record<string, string>): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(compassBin(), args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    child.on("error", () => resolve({ stdout, stderr, code: 1 }));
  });
}

export async function runPhase7(opts: SmokeOpts): Promise<PhaseResult> {
  const start = Date.now();
  const id = 7;
  const name = "tool-compass discoverability: 12 queries, each target in top-3 score>0.4";

  if (opts.dryRun) {
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase7", projectName: opts.smokeProjectName, args: { dryRun: true }, result: { queries: 12, passed: 12, failed: 0 }, durationMs: 0 });
    return { id, name, status: "pass", durationMs: 0, detail: "dry-run: mocked 12/12 queries passed" };
  }

  // Load fixture
  let fixtures: QueryFixture[];
  try {
    fixtures = JSON.parse(await readFile(fixturePath(), "utf-8")) as QueryFixture[];
  } catch (e) {
    return { id, name, status: "fail", durationMs: Date.now() - start, detail: `Failed to load fixture: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Create temp dir for compass config
  const tmpDir = join(tmpdir(), `csos-smoke-p7-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });

  const configPath = join(tmpDir, "compass_config.json");
  const config = {
    backends: {
      csos: {
        type: "stdio",
        command: "node",
        args: [join(repoRoot(), "dist", "cli.js"), "serve"],
      },
    },
    embedding_model: "nomic-embed-text",
    default_top_k: TOP_K,
    min_confidence: 0.0,
  };
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");

  const env = { TOOL_COMPASS_CONFIG: configPath };

  try {
    // Sync index
    const syncResult = await runCompass(["sync", "--force"], env);
    if (syncResult.code !== 0) {
      const durationMs = Date.now() - start;
      return { id, name, status: "fail", durationMs, detail: `tool-compass sync failed (exit ${syncResult.code}): ${syncResult.stderr.slice(0, 300)}` };
    }

    // Run each query
    const results: QueryResult[] = [];
    for (const fixture of fixtures) {
      const searchResult = await runCompass(["search", fixture.query, "--top", String(TOP_K), "--json"], env);
      if (searchResult.code !== 0) {
        results.push({ query: fixture.query, targetTool: fixture.target_tool, passed: false, rank: null, score: null, top3: [] });
        continue;
      }

      let top3: CompassResult[] = [];
      try {
        top3 = JSON.parse(searchResult.stdout) as CompassResult[];
      } catch {
        results.push({ query: fixture.query, targetTool: fixture.target_tool, passed: false, rank: null, score: null, top3: [] });
        continue;
      }

      // tool names come back as "csos:tool_name" — strip server prefix
      const hit = top3.find((r) => r.tool.replace(/^[^:]+:/, "") === fixture.target_tool && r.score >= MIN_SCORE);
      results.push({
        query: fixture.query,
        targetTool: fixture.target_tool,
        passed: hit !== undefined,
        rank: hit?.rank ?? null,
        score: hit?.score ?? null,
        top3,
      });
    }

    const failed = results.filter((r) => !r.passed);
    const durationMs = Date.now() - start;

    if (failed.length > 0) {
      const lines = failed.map((r) => {
        const top3str = r.top3
          .map((t) => `${t.tool.replace(/^[^:]+:/, "")} (${t.score.toFixed(3)})`)
          .join(", ");
        return `  FAIL query="${r.query}" expected=${r.targetTool} top3=[${top3str}]`;
      });
      await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase7", projectName: opts.smokeProjectName, args: {}, error: { code: "E_DISCOVERABILITY_REGRESSION", message: `${failed.length} queries failed` }, durationMs });
      return { id, name, status: "fail", durationMs, detail: `${failed.length}/${fixtures.length} queries failed:\n${lines.join("\n")}`, diagnostics: { failed: failed.map((r) => ({ query: r.query, expected: r.targetTool, top3: r.top3 })) } };
    }

    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase7", projectName: opts.smokeProjectName, args: {}, result: { queries: fixtures.length, passed: fixtures.length, minScore: Math.min(...results.map((r) => r.score ?? 0)) }, durationMs });
    return {
      id, name, status: "pass", durationMs,
      detail: `${fixtures.length}/${fixtures.length} queries passed. Min score: ${Math.min(...results.map((r) => r.score ?? 0)).toFixed(3)}. All targets in top-${TOP_K} with score>${MIN_SCORE}.`,
    };

  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
