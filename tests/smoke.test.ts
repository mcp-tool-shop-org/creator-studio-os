/**
 * Smoke harness shape verification — runs entirely in --dry-run mode.
 *
 * These tests prove the harness executes without calling any real apps,
 * produces a valid SmokeReport, writes JSONL to the ledger, and exits
 * with the expected status. Safe to run in CI (Linux) and on Mac without
 * FCP/Compressor/Motion installed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../src/config.js";
import type { SmokeOpts } from "../src/smoke/index.js";
import { runPhase1 } from "../src/smoke/phases/p1-compressor-monitor.js";
import { runPhase2 } from "../src/smoke/phases/p2-motion-render.js";
import { runPhase3 } from "../src/smoke/phases/p3-motion-publish-catalog.js";
import { runPhase4 } from "../src/smoke/phases/p4-killer-chain.js";
import { runPhase5 } from "../src/smoke/phases/p5-round-trip-diff.js";
import { runPhase6 } from "../src/smoke/phases/p6-ledger.js";
import { runPhase7 } from "../src/smoke/phases/p7-toolcompass-discoverability.js";
import { summarize, type PhaseResult } from "../src/smoke/report.js";
import { appendLedger } from "../src/ledger/index.js";

let tmpDir: string;
let smokeProjectDir: string;
let opts: SmokeOpts;

beforeAll(async () => {
  tmpDir = await mkdir(join(tmpdir(), `csos-smoke-test-${Date.now()}`), { recursive: true }).then(() =>
    join(tmpdir(), `csos-smoke-test-${Date.now() - 1}`),
  );
  // Re-create with the actual path we'll use
  tmpDir = join(tmpdir(), `csos-smoke-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
  smokeProjectDir = join(tmpDir, "projects", "csos-smoke-test");
  await mkdir(smokeProjectDir, { recursive: true });

  const cfg = loadConfig();
  // Override dataDir so ledger writes go to our tmp dir
  process.env.CREATOR_STUDIO_DATA_DIR = tmpDir;

  opts = {
    mode: "ci",
    dryRun: true,
    version: "1.6.0",
    smokeProjectName: "csos-smoke-test",
    smokeProjectDir,
    cfg: { ...cfg, dataDir: tmpDir },
  };
});

afterAll(async () => {
  delete process.env.CREATOR_STUDIO_DATA_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

// ── Phase dry-run shapes ──────────────────────────────────────────────────────

describe("Phase 1 (dry-run)", () => {
  it("returns pass with durationMs=0 and mocked detail", async () => {
    const r = await runPhase1(opts);
    expect(r.id).toBe(1);
    expect(r.status).toBe("pass");
    expect(r.durationMs).toBe(0);
    expect(r.detail).toMatch(/dry-run/);
  });
});

describe("Phase 2 (dry-run)", () => {
  it("returns pass with mocked render", async () => {
    const r = await runPhase2(opts);
    expect(r.id).toBe(2);
    expect(r.status).toBe("pass");
    expect(r.detail).toMatch(/dry-run/);
  });
});

describe("Phase 3 (dry-run)", () => {
  it("returns pass with mocked catalog entries", async () => {
    const r = await runPhase3(opts);
    expect(r.id).toBe(3);
    expect(r.status).toBe("pass");
    expect(r.detail).toMatch(/dry-run/);
  });
});

describe("Phase 4 (dry-run)", () => {
  it("returns pass without calling FCP", async () => {
    const r = await runPhase4(opts);
    expect(r.id).toBe(4);
    expect(r.status).toBe("pass");
    expect(r.detail).toMatch(/dry-run/);
  });
});

describe("Phase 5 (real — round-trip diff engine is pure TS)", () => {
  it("detects ≥3 DiffKind codes in synthetic pairs without calling real apps", async () => {
    const r = await runPhase5({ ...opts, dryRun: false });
    expect(r.id).toBe(5);
    expect(r.status).toBe("pass");
    expect(r.detail).toMatch(/DiffKind codes confirmed/);
    // The detail should list at least 3 codes
    const match = r.detail.match(/(\d+) DiffKind codes/);
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(3);
  });
});

describe("Phase 6 (ledger integrity)", () => {
  it("fails gracefully when no ledger entries exist yet", async () => {
    // Phase 6 checks for ≥6 entries; since we haven't written that many in dry-run, it should fail
    const r = await runPhase6({ ...opts, dryRun: false });
    expect(r.id).toBe(6);
    // Either fail (no ledger file) or fail (< 6 entries) — both are valid
    expect(["fail", "skip"]).toContain(r.status);
  });

  it("passes after ≥6 entries are written", async () => {
    // Seed the ledger with 6 entries via appendLedger
    for (let i = 1; i <= 6; i++) {
      await appendLedger({
        ts: new Date().toISOString(),
        tool: `smoke:phase${i}`,
        projectName: opts.smokeProjectName,
        args: { seeded: true },
        result: { phase: i },
        durationMs: i * 10,
      });
    }
    const r = await runPhase6({ ...opts, dryRun: false });
    expect(r.id).toBe(6);
    expect(r.status).toBe("pass");
    expect(r.ledgerCount).toBeGreaterThanOrEqual(6);
  });
});

describe("Phase 7 (dry-run)", () => {
  it("returns pass with mocked discoverability results", async () => {
    const r = await runPhase7(opts);
    expect(r.id).toBe(7);
    expect(r.status).toBe("pass");
    expect(r.durationMs).toBe(0);
    expect(r.detail).toMatch(/dry-run/);
    expect(r.detail).toMatch(/12\/12/);
  });
});

// ── Report summarizer ─────────────────────────────────────────────────────────

describe("summarize()", () => {
  it("all-pass → overallStatus=pass", () => {
    const phases: PhaseResult[] = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1, name: `Phase ${i + 1}`, status: "pass", durationMs: 10, detail: "ok",
    }));
    const s = summarize(phases);
    expect(s.overallStatus).toBe("pass");
    expect(s.passed).toBe(6);
    expect(s.failed).toBe(0);
  });

  it("any-fail → overallStatus=fail", () => {
    const phases: PhaseResult[] = [
      { id: 1, name: "P1", status: "pass", durationMs: 0, detail: "" },
      { id: 2, name: "P2", status: "fail", durationMs: 0, detail: "broken" },
    ];
    expect(summarize(phases).overallStatus).toBe("fail");
  });

  it("skip but no fail → overallStatus=partial", () => {
    const phases: PhaseResult[] = [
      { id: 1, name: "P1", status: "pass", durationMs: 0, detail: "" },
      { id: 2, name: "P2", status: "skip", durationMs: 0, detail: "" },
    ];
    expect(summarize(phases).overallStatus).toBe("partial");
  });
});

// ── Ledger round-trip ─────────────────────────────────────────────────────────

describe("ledger JSONL round-trip", () => {
  it("appendLedger writes valid JSONL parseable by Phase 6", async () => {
    const name = `csos-ledger-rt-${Date.now()}`;
    await appendLedger({ ts: new Date().toISOString(), tool: "test:ledger-rt", projectName: name, args: {}, result: { ok: true }, durationMs: 5 });
    const ledgerPath = join(tmpDir, "projects", name, ".csos", "ledger.jsonl");
    const raw = await readFile(ledgerPath, "utf-8");
    const parsed = JSON.parse(raw.trim());
    expect(parsed.tool).toBe("test:ledger-rt");
    expect(typeof parsed.durationMs).toBe("number");
    expect(typeof parsed.ts).toBe("string");
  });
});
