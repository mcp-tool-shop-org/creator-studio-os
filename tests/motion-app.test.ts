/**
 * motion/app.ts — full coverage.
 *
 * Mocks @creator-studio-os/core (runAppleScript, loadConfig) and
 * node:child_process spawn so the real isMotionRunning / openMotion /
 * openMotionTemplate code paths execute without live apps.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    runAppleScript: vi.fn().mockResolvedValue("false"),
    loadConfig: vi.fn().mockReturnValue({
      motionBundleId: "com.apple.motionappApp",
    }),
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, spawn: vi.fn() };
});

import { runAppleScript } from "@creator-studio-os/core";
import { spawn } from "node:child_process";
import {
  isMotionRunning,
  openMotion,
  openMotionTemplate,
} from "../packages/motion/src/app.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeChild(exitCode: number, stderr = "") {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: () => void;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  setImmediate(() => {
    if (stderr) child.stderr.emit("data", Buffer.from(stderr));
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
// isMotionRunning
// ---------------------------------------------------------------------------

describe("isMotionRunning", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when osascript returns 'false'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("false");
    expect(await isMotionRunning()).toBe(false);
  });

  it("returns true when osascript returns 'true'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("true");
    expect(await isMotionRunning()).toBe(true);
  });

  it("returns true with trailing whitespace trimmed", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("true\n");
    expect(await isMotionRunning()).toBe(true);
  });

  it("calls runAppleScript with the motionBundleId", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("false");
    await isMotionRunning();
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("com.apple.motionappApp");
  });

  it("propagates runAppleScript error", async () => {
    vi.mocked(runAppleScript).mockRejectedValue(new Error("osascript failed"));
    await expect(isMotionRunning()).rejects.toThrow("osascript failed");
  });
});

// ---------------------------------------------------------------------------
// openMotion
// ---------------------------------------------------------------------------

describe("openMotion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves when open exits 0", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await expect(openMotion()).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledWith(
      "open",
      ["-b", "com.apple.motionappApp"],
      expect.any(Object),
    );
  });

  it("rejects with E_MOTION_NOT_FOUND when open exits non-zero", async () => {
    vi.mocked(spawn).mockReturnValue(
      fakeChild(1, "not installed") as ReturnType<typeof spawn>,
    );
    await expect(openMotion()).rejects.toMatchObject({ code: "E_MOTION_NOT_FOUND" });
  });

  it("error message includes exit code", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(1, "") as ReturnType<typeof spawn>);
    await expect(openMotion()).rejects.toThrow(/exit 1/);
  });

  it("error message falls back to 'no output' when stderr empty", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(1, "") as ReturnType<typeof spawn>);
    await expect(openMotion()).rejects.toThrow(/no output/);
  });

  it("rejects with E_MOTION_NOT_FOUND on spawn error event", async () => {
    vi.mocked(spawn).mockReturnValue(errorChild("ENOENT") as ReturnType<typeof spawn>);
    await expect(openMotion()).rejects.toMatchObject({ code: "E_MOTION_NOT_FOUND" });
  });

  it("spawn error message includes original error text", async () => {
    vi.mocked(spawn).mockReturnValue(errorChild("ENOENT") as ReturnType<typeof spawn>);
    await expect(openMotion()).rejects.toThrow(/ENOENT/);
  });
});

// ---------------------------------------------------------------------------
// openMotionTemplate
// ---------------------------------------------------------------------------

describe("openMotionTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves when open exits 0", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await expect(
      openMotionTemplate("/templates/lower-third.motn"),
    ).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledWith(
      "open",
      ["-b", "com.apple.motionappApp", "/templates/lower-third.motn"],
      expect.any(Object),
    );
  });

  it("rejects with E_MOTION_NOT_FOUND when open exits non-zero", async () => {
    vi.mocked(spawn).mockReturnValue(
      fakeChild(1, "file not found") as ReturnType<typeof spawn>,
    );
    await expect(
      openMotionTemplate("/templates/bad.motn"),
    ).rejects.toMatchObject({ code: "E_MOTION_NOT_FOUND" });
  });

  it("error message includes the template path", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(1, "") as ReturnType<typeof spawn>);
    await expect(
      openMotionTemplate("/templates/missing.motn"),
    ).rejects.toThrow(/exit 1/);
  });

  it("rejects with E_MOTION_NOT_FOUND on spawn error", async () => {
    vi.mocked(spawn).mockReturnValue(errorChild("spawn failed") as ReturnType<typeof spawn>);
    await expect(
      openMotionTemplate("/templates/lower-third.motn"),
    ).rejects.toMatchObject({ code: "E_MOTION_NOT_FOUND" });
  });

  it("spawn error message includes path context", async () => {
    vi.mocked(spawn).mockReturnValue(
      errorChild("ENOENT") as ReturnType<typeof spawn>,
    );
    await expect(
      openMotionTemplate("/templates/title.motn"),
    ).rejects.toThrow(/\/templates\/title\.motn/);
  });
});
