/**
 * Phase 8 — Protocol smoke: steam-trailer-minimal.
 *
 * Branches on app health (as reported by Phase 0):
 *
 *  REAL path (fcp + compressor + motion + pixelmator all healthy):
 *    Runs the real protocol (dryRun: false) against demo/csos-showcase/project.json.
 *    Asserts all 12 steps complete, replay manifest is valid, and
 *    demo/csos-showcase/out/csos-showcase-main.mov exists and is non-empty.
 *    Also runs a resume pass to verify idempotency.
 *
 *  DRY-RUN fallback (any required app unhealthy, or --dry-run mode):
 *    Runs the protocol in dry-run mode against an in-memory 2-scene fixture written
 *    to the smoke project dir. Same 12-step / manifest / idempotency gates, but
 *    no real apps or encode output required. Safe for CI.
 */
import { writeFile, readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runProtocol } from "../../protocols/index.js";
import { appendLedger } from "../../ledger/index.js";
import { STEP_NAMES } from "../../protocols/brand-deck-minimal.js";
import type { PhaseResult } from "../report.js";
import type { SmokeOpts } from "../index.js";
import type { ReplayManifest } from "../../protocols/types.js";

// ---------------------------------------------------------------------------
// Apps required for the real-render path
// ---------------------------------------------------------------------------

const SHOWCASE_REQUIRED_APPS = ["fcp", "compressor", "motion", "pixelmator"] as const;

// ---------------------------------------------------------------------------
// 2-scene fixture for the dry-run fallback path
// ---------------------------------------------------------------------------

const FIXTURE_SLUG = "csos-smoke-protocol";

const FIXTURE_PROJECT = {
  schemaVersion: 2 as const,
  name: "Smoke Protocol Test",
  slug: FIXTURE_SLUG,
  kind: "trailer" as const,
  brand: { primaryColor: "#000000", secondaryColor: "#ffffff" },
  deliverables: {
    main: {
      format: "mov" as const,
      resolution: "1920x1080",
      codec: "H.264",
      frameRate: "29.97" as const,
    },
  },
  scenes: [
    { id: "scene-a", title: "Scene Alpha", durationSeconds: 5 },
    { id: "scene-b", title: "Scene Beta", durationSeconds: 8 },
  ],
};

// ---------------------------------------------------------------------------
// Shared gate helpers
// ---------------------------------------------------------------------------

interface GateOpts {
  id: number;
  name: string;
  start: number;
}

function stepCountGate(
  gateOpts: GateOpts,
  steps: Array<{ stepName: string; status: string }>,
): PhaseResult | null {
  if (steps.length !== STEP_NAMES.length) {
    return {
      id: gateOpts.id,
      name: gateOpts.name,
      status: "fail",
      durationMs: Date.now() - gateOpts.start,
      detail: `Expected ${STEP_NAMES.length} steps, got ${steps.length}: ${steps.map((s) => s.stepName).join(", ")}`,
    };
  }
  return null;
}

function noFailuresGate(
  gateOpts: GateOpts,
  steps: Array<{ stepName: string; status: string }>,
): PhaseResult | null {
  const failed = steps.filter((s) => s.status === "failed");
  if (failed.length > 0) {
    return {
      id: gateOpts.id,
      name: gateOpts.name,
      status: "fail",
      durationMs: Date.now() - gateOpts.start,
      detail: `${failed.length} step(s) failed: ${failed.map((s) => s.stepName).join(", ")}`,
    };
  }
  return null;
}

async function movNonEmptyGate(
  gateOpts: GateOpts,
  movPath: string,
): Promise<PhaseResult | null> {
  try {
    const s = await stat(movPath);
    if (s.size === 0) throw new Error("file is 0 bytes");
  } catch (err) {
    return {
      id: gateOpts.id,
      name: gateOpts.name,
      status: "fail",
      durationMs: Date.now() - gateOpts.start,
      detail: `MOV not found or empty at ${movPath}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  return null;
}

async function manifestGate(
  gateOpts: GateOpts,
  replayPath: string,
): Promise<{ result: PhaseResult; manifest?: undefined } | { result?: undefined; manifest: ReplayManifest }> {
  let manifest: ReplayManifest;
  try {
    const raw = await readFile(replayPath, "utf-8");
    manifest = JSON.parse(raw) as ReplayManifest;
  } catch (err) {
    return {
      result: {
        id: gateOpts.id,
        name: gateOpts.name,
        status: "fail",
        durationMs: Date.now() - gateOpts.start,
        detail: `Replay manifest missing or invalid at ${replayPath}: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  const expectedEntries = STEP_NAMES.length - 1;
  if (manifest.steps.length !== expectedEntries) {
    return {
      result: {
        id: gateOpts.id,
        name: gateOpts.name,
        status: "fail",
        durationMs: Date.now() - gateOpts.start,
        detail: `Manifest has ${manifest.steps.length} entries, expected ${expectedEntries} (write-replay-manifest records itself externally)`,
      },
    };
  }

  if (!manifest.taskId || !manifest.idempotencyKey || !manifest.startedAt || !manifest.completedAt) {
    return {
      result: {
        id: gateOpts.id,
        name: gateOpts.name,
        status: "fail",
        durationMs: Date.now() - gateOpts.start,
        detail: "Manifest missing required fields (taskId/idempotencyKey/startedAt/completedAt)",
      },
    };
  }

  return { manifest };
}

async function idempotencyGate(
  gateOpts: GateOpts,
  projectPath: string,
  taskId: string,
  dryRun: boolean,
): Promise<PhaseResult | { resumeSteps: Array<{ stepName: string; status: string }> }> {
  const resumeSteps: Array<{ stepName: string; status: string }> = [];
  try {
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun,
      taskId: `${taskId}-resume`,
      resume: taskId,
    })) {
      resumeSteps.push({ stepName: step.stepName, status: step.status });
    }
  } catch (err) {
    return {
      id: gateOpts.id,
      name: gateOpts.name,
      status: "fail",
      durationMs: Date.now() - gateOpts.start,
      detail: `Resume run threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (resumeSteps.length !== STEP_NAMES.length) {
    return {
      id: gateOpts.id,
      name: gateOpts.name,
      status: "fail",
      durationMs: Date.now() - gateOpts.start,
      detail: `Resume run: expected ${STEP_NAMES.length} steps, got ${resumeSteps.length}`,
    };
  }

  const notSkipped = resumeSteps.filter(
    (s) => s.stepName !== "write-replay-manifest" && s.status !== "skipped",
  );
  if (notSkipped.length > 0) {
    return {
      id: gateOpts.id,
      name: gateOpts.name,
      status: "fail",
      durationMs: Date.now() - gateOpts.start,
      detail: `Resume run: ${notSkipped.length} step(s) not skipped: ${notSkipped.map((s) => `${s.stepName}(${s.status})`).join(", ")}`,
    };
  }

  return { resumeSteps };
}

// ---------------------------------------------------------------------------
// Real-render path — runs against demo/csos-showcase/project.json
// ---------------------------------------------------------------------------

async function runPhase8Real(id: number, name: string, start: number): Promise<PhaseResult> {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..", "..");
  const showcaseProjectPath = join(repoRoot, "demo", "csos-showcase", "project.json");
  const showcaseOutDir = join(repoRoot, "demo", "csos-showcase", "out");
  const expectedMov = join(showcaseOutDir, "csos-showcase-main.mov");
  const taskId = `smoke-p8-real-${Date.now()}`;
  const replayDir = join(showcaseOutDir, ".csos");
  const replayPath = join(replayDir, `replay-${taskId}.json`);
  const gateOpts: GateOpts = { id, name, start };

  const steps: Array<{ stepName: string; status: string }> = [];
  try {
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: showcaseProjectPath,
      dryRun: false,
      taskId,
    })) {
      steps.push({ stepName: step.stepName, status: step.status });
    }
  } catch (err) {
    const durationMs = Date.now() - start;
    await appendLedger({
      ts: new Date().toISOString(),
      tool: "smoke:phase8",
      args: { dryRun: false, showcase: true },
      result: { error: String(err) },
      durationMs,
    });
    return {
      id, name, status: "fail", durationMs,
      detail: `Protocol threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const g1 = stepCountGate(gateOpts, steps);
  if (g1) return g1;

  const g2 = noFailuresGate(gateOpts, steps);
  if (g2) return g2;

  const g3 = await movNonEmptyGate(gateOpts, expectedMov);
  if (g3) return g3;

  const g4 = await manifestGate(gateOpts, replayPath);
  if (g4.result) return g4.result;
  const manifest = g4.manifest!;

  const g5 = await idempotencyGate(gateOpts, showcaseProjectPath, taskId, false);
  if ("status" in g5) return g5;
  const { resumeSteps } = g5;

  const movStat = await stat(expectedMov);

  await appendLedger({
    ts: new Date().toISOString(),
    tool: "smoke:phase8",
    args: { taskId, dryRun: false, showcase: true },
    result: { steps: steps.length, resumeSteps: resumeSteps.length, manifestSteps: manifest.steps.length, movBytes: movStat.size },
    durationMs: Date.now() - start,
  });

  return {
    id, name, status: "pass", durationMs: Date.now() - start,
    detail: [
      `Run 1: ${steps.length}/${STEP_NAMES.length} steps completed`,
      `MOV: csos-showcase-main.mov (${movStat.size} bytes)`,
      `Replay manifest: ${manifest.steps.length} entries, taskId=${manifest.taskId.slice(0, 16)}…`,
      `Run 2 (resume): ${resumeSteps.filter((s) => s.status === "skipped").length} skipped, 1 re-ran (write-replay-manifest)`,
    ].join(" | "),
  };
}

// ---------------------------------------------------------------------------
// Dry-run fallback path — 2-scene fixture, no real apps required
// ---------------------------------------------------------------------------

async function runPhase8DryRun(
  id: number,
  name: string,
  start: number,
  smokeProjectDir: string,
): Promise<PhaseResult> {
  const fixtureProjectPath = join(smokeProjectDir, "protocol-fixture.json");
  await writeFile(fixtureProjectPath, JSON.stringify(FIXTURE_PROJECT, null, 2), "utf-8");

  const fixtureOutDir = join(smokeProjectDir, "out");
  const replayDir = join(fixtureOutDir, ".csos");
  const expectedMov = join(fixtureOutDir, `${FIXTURE_SLUG}-main.mov`);
  const taskId = `smoke-p8-${Date.now()}`;
  const replayPath = join(replayDir, `replay-${taskId}.json`);
  const gateOpts: GateOpts = { id, name, start };

  const steps: Array<{ stepName: string; status: string }> = [];
  try {
    for await (const step of runProtocol({
      name: "brand-deck-minimal",
      projectPath: fixtureProjectPath,
      dryRun: true,
      taskId,
    })) {
      steps.push({ stepName: step.stepName, status: step.status });
    }
  } catch (err) {
    const durationMs = Date.now() - start;
    await appendLedger({
      ts: new Date().toISOString(),
      tool: "smoke:phase8",
      args: { dryRun: true },
      result: { error: String(err) },
      durationMs,
    });
    return {
      id, name, status: "fail", durationMs,
      detail: `Protocol threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const g1 = stepCountGate(gateOpts, steps);
  if (g1) return g1;

  const g2 = noFailuresGate(gateOpts, steps);
  if (g2) return g2;

  const g3 = await movNonEmptyGate(gateOpts, expectedMov);
  if (g3) return g3;

  const g4 = await manifestGate(gateOpts, replayPath);
  if (g4.result) return g4.result;
  const manifest = g4.manifest!;

  const g5 = await idempotencyGate(gateOpts, fixtureProjectPath, taskId, true);
  if ("status" in g5) return g5;
  const { resumeSteps } = g5;

  await appendLedger({
    ts: new Date().toISOString(),
    tool: "smoke:phase8",
    args: { taskId, dryRun: true },
    result: { steps: steps.length, resumeSteps: resumeSteps.length, manifestSteps: manifest.steps.length },
    durationMs: Date.now() - start,
  });

  return {
    id, name, status: "pass", durationMs: Date.now() - start,
    detail: [
      `Run 1: ${steps.length}/${STEP_NAMES.length} steps completed`,
      `MOV placeholder: ✓`,
      `Replay manifest: ${manifest.steps.length} entries, taskId=${manifest.taskId.slice(0, 16)}…`,
      `Run 2 (resume): ${resumeSteps.filter((s) => s.status === "skipped").length} skipped, 1 re-ran (write-replay-manifest)`,
    ].join(" | "),
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function runPhase8(
  opts: SmokeOpts,
  healthMap: Record<string, boolean>,
): Promise<PhaseResult> {
  const start = Date.now();
  const id = 8;
  const appsHealthy = SHOWCASE_REQUIRED_APPS.every((a) => healthMap[a] === true);

  if (appsHealthy) {
    return runPhase8Real(
      id,
      "Protocol: brand-deck-minimal real render — showcase project, MOV assert, idempotency",
      start,
    );
  }

  return runPhase8DryRun(
    id,
    "Protocol: brand-deck-minimal dry-run — 12 steps, manifest, idempotency",
    start,
    opts.smokeProjectDir,
  );
}
