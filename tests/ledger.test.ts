import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLedger, withLedger, type LedgerEntry } from "../src/ledger/index.js";
import { CreatorStudioError } from "../src/errors.js";

let tmp: string;
let origDataDir: string | undefined;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-ledger-test-"));
  origDataDir = process.env.CREATOR_STUDIO_DATA_DIR;
  process.env.CREATOR_STUDIO_DATA_DIR = tmp;
});

afterEach(async () => {
  if (origDataDir === undefined) delete process.env.CREATOR_STUDIO_DATA_DIR;
  else process.env.CREATOR_STUDIO_DATA_DIR = origDataDir;
  await rm(tmp, { recursive: true, force: true });
});

describe("appendLedger", () => {
  it("creates the ledger file and writes a parseable JSONL entry", async () => {
    const entry: LedgerEntry = {
      ts: new Date().toISOString(),
      tool: "test_tool",
      args: { foo: "bar" },
      durationMs: 42,
    };
    await appendLedger(entry);

    const content = await readFile(join(tmp, ".csos", "ledger.jsonl"), "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.tool).toBe("test_tool");
    expect(parsed.durationMs).toBe(42);
    expect(parsed.args).toEqual({ foo: "bar" });
  });

  it("falls back to root .csos path when no projectName", async () => {
    await appendLedger({ ts: new Date().toISOString(), tool: "t", args: {}, durationMs: 1 });
    const content = await readFile(join(tmp, ".csos", "ledger.jsonl"), "utf-8");
    expect(JSON.parse(content.trim()).tool).toBe("t");
  });

  it("writes to project-scoped path when projectName is provided", async () => {
    const entry: LedgerEntry = {
      ts: new Date().toISOString(),
      tool: "test_tool",
      projectName: "my-project",
      args: {},
      durationMs: 10,
    };
    await appendLedger(entry);

    const path = join(tmp, "projects", "my-project", ".csos", "ledger.jsonl");
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content.trim());
    expect(parsed.projectName).toBe("my-project");
  });

  it("appends multiple entries, all parseable as JSONL", async () => {
    for (let i = 0; i < 3; i++) {
      await appendLedger({
        ts: new Date().toISOString(),
        tool: `tool_${i}`,
        args: { i },
        durationMs: i * 10,
      });
    }

    const content = await readFile(join(tmp, ".csos", "ledger.jsonl"), "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    expect(JSON.parse(lines[2]).tool).toBe("tool_2");
  });

  it("concurrent appends all land without corruption", async () => {
    const writes = Array.from({ length: 10 }, (_, i) =>
      appendLedger({
        ts: new Date().toISOString(),
        tool: `concurrent_${i}`,
        args: { i },
        durationMs: i,
      }),
    );
    await Promise.all(writes);

    const content = await readFile(join(tmp, ".csos", "ledger.jsonl"), "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    expect(lines).toHaveLength(10);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});

describe("withLedger", () => {
  it("returns the wrapped function result", async () => {
    const result = await withLedger(
      { tool: "my_tool", args: { x: 1 } },
      async () => ({ ok: true }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("captures result in the ledger entry", async () => {
    await withLedger({ tool: "my_tool", args: { x: 1 } }, async () => ({ ok: true }));

    const content = await readFile(join(tmp, ".csos", "ledger.jsonl"), "utf-8");
    const entry = JSON.parse(content.trim());
    expect(entry.result).toEqual({ ok: true });
    expect(entry.error).toBeUndefined();
    expect(typeof entry.durationMs).toBe("number");
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("captures error shape and re-throws for CreatorStudioError", async () => {
    await expect(
      withLedger({ tool: "failing_tool", args: {} }, async () => {
        throw new CreatorStudioError("E_INTERNAL", "test error", "a hint");
      }),
    ).rejects.toMatchObject({ code: "E_INTERNAL", message: "test error" });

    const content = await readFile(join(tmp, ".csos", "ledger.jsonl"), "utf-8");
    const entry = JSON.parse(content.trim());
    expect(entry.error).toEqual({ code: "E_INTERNAL", message: "test error", hint: "a hint" });
  });

  it("captures generic Error and re-throws", async () => {
    await expect(
      withLedger({ tool: "boom_tool", args: {} }, async () => {
        throw new Error("generic boom");
      }),
    ).rejects.toThrow("generic boom");

    const content = await readFile(join(tmp, ".csos", "ledger.jsonl"), "utf-8");
    const entry = JSON.parse(content.trim());
    expect(entry.error?.message).toBe("generic boom");
    expect(entry.error?.code).toBe("E_INTERNAL");
  });

  it("includes projectName in the ledger entry", async () => {
    await withLedger(
      { tool: "proj_tool", projectName: "alpha", args: {} },
      async () => "done",
    );

    const path = join(tmp, "projects", "alpha", ".csos", "ledger.jsonl");
    const entry = JSON.parse((await readFile(path, "utf-8")).trim());
    expect(entry.projectName).toBe("alpha");
    expect(entry.tool).toBe("proj_tool");
  });
});
