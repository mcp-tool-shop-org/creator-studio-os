/**
 * ledger reader — unit tests.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readLedger, parseSince, formatLedger } from "../src/ledger/reader.js";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(tmpdir(), `csos-ledger-reader-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
  // Override data dir for this test
  process.env.CREATOR_STUDIO_DATA_DIR = tmpDir;

  // Seed a ledger for project "test-proj"
  const ledgerDir = join(tmpDir, "projects", "test-proj", ".csos");
  await mkdir(ledgerDir, { recursive: true });
  const entries = [
    { ts: new Date(Date.now() - 3_600_000).toISOString(), tool: "fcp_fcpxml_build", args: {}, durationMs: 100 },
    { ts: new Date(Date.now() - 1800_000).toISOString(), tool: "compressor_encode", args: {}, result: { jobId: "abc" }, durationMs: 200 },
    { ts: new Date().toISOString(), tool: "motion_render_via_compressor", args: {}, error: { code: "E_COMPRESSOR_FAILED", message: "daemon error" }, durationMs: 50 },
  ];
  const jsonl = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  await writeFile(join(ledgerDir, "ledger.jsonl"), jsonl, "utf-8");
});

afterAll(async () => {
  delete process.env.CREATOR_STUDIO_DATA_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

describe("readLedger", () => {
  it("returns all entries when no filters", async () => {
    const result = await readLedger({ projectName: "test-proj" });
    expect(result.totalLines).toBe(3);
    expect(result.entries).toHaveLength(3);
  });

  it("filters by tool name (substring match)", async () => {
    // "compressor_encode" (exact) is the only tool starting with that exact prefix
    const result = await readLedger({ projectName: "test-proj", tool: "compressor_encode" });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].tool).toBe("compressor_encode");
  });

  it("filters errorsOnly", async () => {
    const result = await readLedger({ projectName: "test-proj", errorsOnly: true });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].error?.code).toBe("E_COMPRESSOR_FAILED");
  });

  it("filters by tail", async () => {
    const result = await readLedger({ projectName: "test-proj", tail: 1 });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].tool).toBe("motion_render_via_compressor");
  });

  it("returns empty result for missing project", async () => {
    const result = await readLedger({ projectName: "no-such-project" });
    expect(result.entries).toHaveLength(0);
    expect(result.totalLines).toBe(0);
  });
});

describe("parseSince", () => {
  it("parses 1h to a timestamp ~1 hour ago", () => {
    const ts = parseSince("1h");
    const diff = Date.now() - new Date(ts).getTime();
    expect(diff).toBeGreaterThan(3_500_000);
    expect(diff).toBeLessThan(3_700_000);
  });

  it("parses 30m to ~30 minutes ago", () => {
    const ts = parseSince("30m");
    const diff = Date.now() - new Date(ts).getTime();
    expect(diff).toBeGreaterThan(1_700_000);
    expect(diff).toBeLessThan(1_900_000);
  });

  it("passes through an ISO string unchanged", () => {
    const iso = "2026-05-01T00:00:00.000Z";
    expect(parseSince(iso)).toBe(iso);
  });
});

describe("formatLedger", () => {
  it("shows 'No ledger found' when entries empty and totalLines 0", () => {
    const out = formatLedger({ path: "/x", entries: [], totalLines: 0, filteredCount: 0 });
    expect(out).toMatch(/No ledger found/);
  });

  it("formats entries with tool name and duration", async () => {
    const result = await readLedger({ projectName: "test-proj" });
    const out = formatLedger(result);
    expect(out).toMatch(/fcp_fcpxml_build/);
    expect(out).toMatch(/compressor_encode/);
    expect(out).toMatch(/motion_render_via_compressor/);
  });

  it("marks error entries with ✗", async () => {
    const result = await readLedger({ projectName: "test-proj", errorsOnly: true });
    const out = formatLedger(result);
    expect(out).toMatch(/✗/);
    expect(out).toMatch(/E_COMPRESSOR_FAILED/);
  });
});
