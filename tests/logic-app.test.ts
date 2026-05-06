/**
 * logic/app.ts — real-function coverage via mocked system primitives.
 *
 * Does NOT mock the logic/src/app.js module itself so the real
 * isLogicRunning / openLogic / openLogicProject code paths execute.
 * Mocks runAppleScript, loadConfig, and child_process.spawn instead.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    runAppleScript: vi.fn().mockResolvedValue("false"),
    loadConfig: vi.fn().mockReturnValue({ logicBundleId: "com.apple.logic10" }),
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, spawn: vi.fn() };
});

import { runAppleScript } from "@creator-studio-os/core";
import { spawn } from "node:child_process";
import { isLogicRunning, openLogic, openLogicProject } from "../packages/logic/src/app.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeChild(exitCode: number, stderrMsg = "") {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: () => void;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  setImmediate(() => {
    if (stderrMsg) child.stderr.emit("data", Buffer.from(stderrMsg));
    child.emit("close", exitCode);
  });
  return child;
}

function errorChild(msg: string) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: () => void;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  setImmediate(() => child.emit("error", new Error(msg)));
  return child;
}

// ---------------------------------------------------------------------------
// isLogicRunning
// ---------------------------------------------------------------------------

describe("isLogicRunning", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when osascript returns 'false'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("false");
    expect(await isLogicRunning()).toBe(false);
  });

  it("returns true when osascript returns 'true'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("true\n");
    expect(await isLogicRunning()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// openLogic
// ---------------------------------------------------------------------------

describe("openLogic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves when open exits 0", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await expect(openLogic()).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledWith("open", ["-b", "com.apple.logic10"], expect.any(Object));
  });

  it("rejects with E_LOGIC_NOT_FOUND when open exits non-zero", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(1, "not installed") as ReturnType<typeof spawn>);
    await expect(openLogic()).rejects.toMatchObject({ code: "E_LOGIC_NOT_FOUND" });
  });

  it("rejects with E_LOGIC_NOT_FOUND on spawn error event", async () => {
    vi.mocked(spawn).mockReturnValue(errorChild("ENOENT") as ReturnType<typeof spawn>);
    await expect(openLogic()).rejects.toMatchObject({ code: "E_LOGIC_NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// openLogicProject
// ---------------------------------------------------------------------------

describe("openLogicProject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves when open exits 0", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await expect(openLogicProject("/sessions/song.logicx")).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledWith(
      "open",
      ["-b", "com.apple.logic10", "/sessions/song.logicx"],
      expect.any(Object),
    );
  });

  it("rejects with E_LOGIC_NOT_FOUND when open exits non-zero", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(2, "error") as ReturnType<typeof spawn>);
    await expect(openLogicProject("/bad.logicx")).rejects.toMatchObject({
      code: "E_LOGIC_NOT_FOUND",
    });
  });

  it("rejects with E_LOGIC_NOT_FOUND on spawn error", async () => {
    vi.mocked(spawn).mockReturnValue(errorChild("ENOENT") as ReturnType<typeof spawn>);
    await expect(openLogicProject("/bad.logicx")).rejects.toMatchObject({
      code: "E_LOGIC_NOT_FOUND",
    });
  });
});
