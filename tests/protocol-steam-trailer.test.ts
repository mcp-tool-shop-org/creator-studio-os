/**
 * Integration tests for steam-trailer-minimal protocol — dry-run only.
 *
 * These tests run the full 13-step pipeline in dry-run mode.
 * No AppleScript, no Compressor, no FCP — all external calls are mocked.
 * Files are written to a temp directory.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runProtocol, listProtocols, describeProtocol } from "../src/protocols/index.js";
import { STEP_NAMES } from "../src/protocols/steam-trailer-minimal.js";
import type { ReplayManifest } from "../src/protocols/types.js";
import { ProjectV2Schema } from "../src/projects/types.js";
import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURE_PROJECT = {
  schemaVersion: 2 as const,
  name: "Protocol Test",
  slug: "proto-test",
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
    { id: "alpha", title: "Alpha Scene", durationSeconds: 4 },
    { id: "beta", title: "Beta Scene", durationSeconds: 6 },
  ],
};

let tmpDir: string;
let projectPath: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "csos-protocol-test-"));
  projectPath = join(tmpDir, "project.json");
  await writeFile(projectPath, JSON.stringify(FIXTURE_PROJECT, null, 2), "utf-8");
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe("listProtocols", () => {
  it("returns at least one protocol", () => {
    const protocols = listProtocols();
    expect(protocols.length).toBeGreaterThanOrEqual(1);
  });

  it("includes steam-trailer-minimal", () => {
    const protocols = listProtocols();
    const found = protocols.find((p) => p.name === "steam-trailer-minimal");
    expect(found).toBeDefined();
    expect(found!.stepCount).toBe(STEP_NAMES.length);
  });
});

describe("describeProtocol", () => {
  it("describes steam-trailer-minimal with correct step count", () => {
    const info = describeProtocol("steam-trailer-minimal");
    expect(info.stepNames).toHaveLength(STEP_NAMES.length);
    expect(info.stepNames[0]).toBe("validate-project");
    expect(info.stepNames[STEP_NAMES.length - 1]).toBe("write-replay-manifest");
  });

  it("throws E_PROTOCOL_NOT_FOUND for unknown protocol", () => {
    expect(() => describeProtocol("does-not-exist")).toThrow("Protocol not found");
  });
});

// ---------------------------------------------------------------------------
// Dry-run execution
// ---------------------------------------------------------------------------

describe("steam-trailer-minimal dry-run", () => {
  it("yields exactly 13 steps", async () => {
    const steps: Array<{ stepName: string; status: string }> = [];
    for await (const step of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: "test-run-1",
    })) {
      steps.push({ stepName: step.stepName, status: step.status });
    }
    expect(steps).toHaveLength(STEP_NAMES.length);
  });

  it("all steps complete without failures", async () => {
    const failures: string[] = [];
    for await (const step of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: "test-run-2",
    })) {
      if (step.status === "failed") failures.push(step.stepName);
    }
    expect(failures).toHaveLength(0);
  });

  it("step names match STEP_NAMES in order", async () => {
    const names: string[] = [];
    for await (const step of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: "test-run-3",
    })) {
      names.push(step.stepName);
    }
    expect(names).toEqual([...STEP_NAMES]);
  });

  it("writes brand card stubs for each scene", async () => {
    for await (const _ of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: "test-run-4",
    })) { /* drain */ }

    const outBrand = join(tmpDir, "out", "brand");
    for (const scene of FIXTURE_PROJECT.scenes) {
      const cardPath = join(outBrand, `${scene.id}.png`);
      const s = await stat(cardPath);
      expect(s.size).toBeGreaterThan(0);
    }
  });

  it("writes .fcpxml to out/fcp/", async () => {
    for await (const _ of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: "test-run-5",
    })) { /* drain */ }

    const fcpDir = join(tmpDir, "out", "fcp");
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(fcpDir);
    const fcpxmls = files.filter((f) => f.endsWith(".fcpxml"));
    expect(fcpxmls.length).toBeGreaterThanOrEqual(1);
  });

  it("writes MOV placeholder in dry-run", async () => {
    for await (const _ of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: "test-run-6",
    })) { /* drain */ }

    const movPath = join(tmpDir, "out", "proto-test-main.mov");
    const s = await stat(movPath);
    expect(s.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Replay manifest
// ---------------------------------------------------------------------------

describe("replay manifest", () => {
  let taskId: string;

  beforeAll(async () => {
    taskId = `test-manifest-${Date.now()}`;
    for await (const _ of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId,
    })) { /* drain */ }
  });

  it("writes replay manifest to out/.csos/replay-<taskId>.json", async () => {
    const manifestPath = join(tmpDir, "out", ".csos", `replay-${taskId}.json`);
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as ReplayManifest;
    expect(manifest.taskId).toBe(taskId);
  });

  it("manifest has correct protocolName and projectSlug", async () => {
    const manifestPath = join(tmpDir, "out", ".csos", `replay-${taskId}.json`);
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as ReplayManifest;
    expect(manifest.protocolName).toBe("steam-trailer-minimal");
    expect(manifest.projectSlug).toBe("proto-test");
  });

  it("manifest has idempotencyKey (32 hex chars)", async () => {
    const manifestPath = join(tmpDir, "out", ".csos", `replay-${taskId}.json`);
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as ReplayManifest;
    expect(manifest.idempotencyKey).toMatch(/^[0-9a-f]{32}$/);
  });

  it("manifest has 12 step entries (13 steps minus write-replay-manifest)", async () => {
    const manifestPath = join(tmpDir, "out", ".csos", `replay-${taskId}.json`);
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as ReplayManifest;
    // write-replay-manifest writes itself last; the manifest body contains all
    // prior steps (STEP_NAMES.length - 1 = 12).
    expect(manifest.steps.length).toBe(STEP_NAMES.length - 1);
  });

  it("manifest has startedAt and completedAt ISO timestamps", async () => {
    const manifestPath = join(tmpDir, "out", ".csos", `replay-${taskId}.json`);
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as ReplayManifest;
    expect(manifest.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(manifest.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("each manifest step has inputHash (32 hex chars)", async () => {
    const manifestPath = join(tmpDir, "out", ".csos", `replay-${taskId}.json`);
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as ReplayManifest;
    for (const entry of manifest.steps) {
      expect(entry.inputHash).toMatch(/^[0-9a-f]{32}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// Idempotency — resume
// ---------------------------------------------------------------------------

describe("resume / idempotency", () => {
  let taskId: string;

  beforeAll(async () => {
    taskId = `test-resume-${Date.now()}`;
    for await (const _ of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId,
    })) { /* drain */ }
  });

  it("resume run emits same step count", async () => {
    const steps: string[] = [];
    for await (const step of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: `${taskId}-r`,
      resume: taskId,
    })) {
      steps.push(step.stepName);
    }
    expect(steps).toHaveLength(STEP_NAMES.length);
  });

  it("all steps except write-replay-manifest are skipped on resume", async () => {
    const notSkipped: string[] = [];
    for await (const step of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: `${taskId}-r2`,
      resume: taskId,
    })) {
      if (step.stepName !== "write-replay-manifest" && step.status !== "skipped") {
        notSkipped.push(step.stepName);
      }
    }
    expect(notSkipped).toHaveLength(0);
  });

  it("idempotency key is stable across runs for same project", async () => {
    const taskId2 = `test-idkey-${Date.now()}`;
    for await (const _ of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId: taskId2,
    })) { /* drain */ }

    const path1 = join(tmpDir, "out", ".csos", `replay-${taskId}.json`);
    const path2 = join(tmpDir, "out", ".csos", `replay-${taskId2}.json`);
    const m1 = JSON.parse(await readFile(path1, "utf-8")) as ReplayManifest;
    const m2 = JSON.parse(await readFile(path2, "utf-8")) as ReplayManifest;
    expect(m1.idempotencyKey).toBe(m2.idempotencyKey);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws E_PROTOCOL_NOT_FOUND for unknown protocol", async () => {
    const gen = runProtocol({ name: "no-such-protocol", projectPath, dryRun: true });
    await expect(gen.next()).rejects.toThrow("Protocol not found");
  });

  it("throws E_PROJECT_V2_INVALID for missing project file", async () => {
    const gen = runProtocol({
      name: "steam-trailer-minimal",
      projectPath: "/nonexistent/project.json",
      dryRun: true,
    });
    await expect(gen.next()).rejects.toThrow();
  });

  it("throws E_PROJECT_V2_INVALID for v1 project.json", async () => {
    const v1Path = join(tmpDir, "project-v1.json");
    await writeFile(
      v1Path,
      JSON.stringify({ name: "old", kind: "trailer" }),
      "utf-8",
    );
    const gen = runProtocol({
      name: "steam-trailer-minimal",
      projectPath: v1Path,
      dryRun: true,
    });
    await expect(gen.next()).rejects.toThrow();
  });
});
