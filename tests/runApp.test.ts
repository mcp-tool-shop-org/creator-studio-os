import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runApp, type TranscriptEntry, CreatorStudioError } from "@creator-studio-os/core";

let tmp: string;
let origOsascript: string | undefined;

// We override PATH so our fake 'osascript' runs instead of the real one.
function setFakeOsascript(content: string) {
  // runAppleScript spawns "osascript" — we need to put a fake on PATH
  // Easier: the real osascript is at /usr/bin/osascript. We can't easily shadow it.
  // Instead, test dry-run mode and the BatchRunner combinatorial logic
  // without actually spawning processes.
}

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-runapp-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("runApp.osascript — dry-run mode", () => {
  it("returns empty string without spawning a process", async () => {
    const result = await runApp.osascript(`tell application "Fake" to do something`, { dryRun: true });
    expect(result).toBe("");
  });

  it("fires transcriptHook with op=osascript", async () => {
    const entries: TranscriptEntry[] = [];
    await runApp.osascript("return 1", {
      dryRun: true,
      transcriptHook: (e) => entries.push(e),
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].op).toBe("osascript");
    expect(entries[0].script).toBe("return 1");
    expect(entries[0].result).toBe("");
  });
});

describe("runApp.open — dry-run mode", () => {
  it("is a no-op in dry-run", async () => {
    // open() with a non-existent file + dryRun should NOT throw
    await expect(
      runApp.open("/no/such/file.fcpxml", { appBundleId: "com.apple.FinalCutApp" }, { dryRun: true }),
    ).resolves.toBeUndefined();
  });

  it("fires transcriptHook with op=open", async () => {
    const entries: TranscriptEntry[] = [];
    await runApp.open("/no/such/file", {}, {
      dryRun: true,
      transcriptHook: (e) => entries.push(e),
    });
    expect(entries[0].op).toBe("open");
    expect(entries[0].args).toContain("/no/such/file");
  });
});

describe("runApp.batch — dry-run mode", () => {
  it("returns empty string when no scripts added", async () => {
    const b = runApp.batch({ dryRun: true });
    expect(await b.run()).toBe("");
  });

  it("returns empty string for scripts in dry-run", async () => {
    const b = runApp.batch({ dryRun: true });
    b.add("return 1").add("return 2");
    expect(await b.run()).toBe("");
  });

  it("fires transcriptHook with op=osascript-batch", async () => {
    const entries: TranscriptEntry[] = [];
    const b = runApp.batch({ dryRun: true, transcriptHook: (e) => entries.push(e) });
    b.add("return 1").add("return 2");
    await b.run();
    expect(entries).toHaveLength(1);
    expect(entries[0].op).toBe("osascript-batch");
    // combined script should contain both fragments
    expect(entries[0].script).toContain("return 1");
    expect(entries[0].script).toContain("return 2");
  });

  it("does not fire transcriptHook when batch is empty", async () => {
    const entries: TranscriptEntry[] = [];
    const b = runApp.batch({ dryRun: true, transcriptHook: (e) => entries.push(e) });
    await b.run();
    expect(entries).toHaveLength(0);
  });

  it("single-script batch does not add extra whitespace", async () => {
    const entries: TranscriptEntry[] = [];
    const b = runApp.batch({ dryRun: true, transcriptHook: (e) => entries.push(e) });
    b.add("return 42");
    await b.run();
    expect(entries[0].script).toBe("return 42");
  });
});

describe("runApp.batch — real osascript (if available)", () => {
  it("executes a trivial script and returns its result", async () => {
    // This test only runs where osascript is present (macOS).
    // On other platforms vitest will skip via platform guard.
    if (process.platform !== "darwin") return;

    const result = await runApp.batch().add("return 42").run();
    expect(result).toBe("42");
  });

  it("accumulates two scripts and runs as one osascript call", async () => {
    if (process.platform !== "darwin") return;

    // Two independent expressions — only the last value is returned
    const b = runApp.batch();
    b.add("set x to 1");
    b.add("return x + 1");
    const result = await b.run();
    expect(result).toBe("2");
  });

  it("transcriptHook receives result from real execution", async () => {
    if (process.platform !== "darwin") return;

    const entries: TranscriptEntry[] = [];
    await runApp.batch({ transcriptHook: (e) => entries.push(e) })
      .add("return \"hello\"")
      .run();
    expect(entries[0].result).toBe("hello");
    expect(entries[0].durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("runApp.osascript — real execution (if available)", () => {
  it("maps osascript failure to CreatorStudioError with E_OSASCRIPT_FAILED", async () => {
    if (process.platform !== "darwin") return;

    await expect(
      runApp.osascript("this is not valid AppleScript"),
    ).rejects.toMatchObject({ code: "E_OSASCRIPT_FAILED" } satisfies Partial<CreatorStudioError>);
  });

  it("transcriptHook receives error string on failure", async () => {
    if (process.platform !== "darwin") return;

    const entries: TranscriptEntry[] = [];
    await runApp
      .osascript("syntax error here", { transcriptHook: (e) => entries.push(e) })
      .catch(() => undefined);
    expect(entries[0].error).toBeDefined();
  });
});
