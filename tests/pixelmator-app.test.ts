/**
 * Pixelmator Pro — app.ts unit tests.
 *
 * Covers: isPixelmatorRunning, openPixelmator, pixelmatorInstalled.
 * Mocks runAppleScript/loadConfig and node:child_process spawn.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

// ── Mock @creator-studio-os/core ──────────────────────────────────────────────
vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockReturnValue({
      pixelmatorBundleId: "com.apple.pixelmator",
      pixelmatorAppPath: "/Applications/Pixelmator Pro.app",
      dataDir: "/data",
    }),
    runAppleScript: vi.fn().mockResolvedValue("true"),
    CreatorStudioError: actual.CreatorStudioError,
  };
});

// ── Mock node:child_process spawn ─────────────────────────────────────────────
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

import { runAppleScript, loadConfig } from "@creator-studio-os/core";
import { spawn } from "node:child_process";
import { isPixelmatorRunning, openPixelmator, pixelmatorInstalled } from "../packages/pixelmator/src/app.js";

/** Build a minimal fake spawn process with stdout EventEmitter and close cb. */
function makeSpawnProcess(stdoutData: string, exitCode = 0) {
  const stdout = new EventEmitter() as any;
  const proc = new EventEmitter() as any;
  proc.stdout = stdout;
  // Schedule data + close asynchronously
  setTimeout(() => {
    stdout.emit("data", Buffer.from(stdoutData));
    proc.emit("close", exitCode);
  }, 0);
  return proc;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadConfig).mockReturnValue({
    pixelmatorBundleId: "com.apple.pixelmator",
    pixelmatorAppPath: "/Applications/Pixelmator Pro.app",
    dataDir: "/data",
  } as ReturnType<typeof loadConfig>);
  vi.mocked(runAppleScript).mockResolvedValue("true");
});

// ── isPixelmatorRunning ────────────────────────────────────────────────────────

describe("isPixelmatorRunning", () => {
  it("returns true when AppleScript returns 'true'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("true");
    const result = await isPixelmatorRunning();
    expect(result).toBe(true);
  });

  it("returns false when AppleScript returns 'false'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("false");
    const result = await isPixelmatorRunning();
    expect(result).toBe(false);
  });

  it("returns false when AppleScript returns whitespace-padded 'false'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("  false  ");
    const result = await isPixelmatorRunning();
    expect(result).toBe(false);
  });

  it("uses pixelmatorBundleId from config in the script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("true");
    await isPixelmatorRunning();
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("com.apple.pixelmator");
  });

  it("propagates errors from runAppleScript", async () => {
    vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("script timeout"));
    await expect(isPixelmatorRunning()).rejects.toThrow("script timeout");
  });
});

// ── openPixelmator ─────────────────────────────────────────────────────────────

describe("openPixelmator", () => {
  it("calls runAppleScript with activate command containing bundleId", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await openPixelmator();
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("activate");
    expect(script).toContain("com.apple.pixelmator");
  });

  it("resolves without value", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await expect(openPixelmator()).resolves.toBeUndefined();
  });

  it("propagates errors from runAppleScript", async () => {
    vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("not installed"));
    await expect(openPixelmator()).rejects.toThrow("not installed");
  });
});

// ── pixelmatorInstalled ────────────────────────────────────────────────────────

describe("pixelmatorInstalled", () => {
  it("returns true when osascript outputs 'ok'", async () => {
    vi.mocked(spawn).mockReturnValue(makeSpawnProcess("ok\n") as any);
    const result = await pixelmatorInstalled();
    expect(result).toBe(true);
  });

  it("returns false when osascript outputs 'missing'", async () => {
    vi.mocked(spawn).mockReturnValue(makeSpawnProcess("missing\n") as any);
    const result = await pixelmatorInstalled();
    expect(result).toBe(false);
  });

  it("returns false when spawn emits error event", async () => {
    const proc = new EventEmitter() as any;
    const stdout = new EventEmitter() as any;
    proc.stdout = stdout;
    setTimeout(() => {
      proc.emit("error", new Error("ENOENT"));
    }, 0);
    vi.mocked(spawn).mockReturnValue(proc as any);
    const result = await pixelmatorInstalled();
    expect(result).toBe(false);
  });

  it("passes bundleId from config to the script", async () => {
    vi.mocked(spawn).mockReturnValue(makeSpawnProcess("ok") as any);
    await pixelmatorInstalled();
    const args = vi.mocked(spawn).mock.calls[0];
    expect(args[0]).toBe("osascript");
    const script = (args[1] as string[]).join(" ");
    expect(script).toContain("com.apple.pixelmator");
  });
});
