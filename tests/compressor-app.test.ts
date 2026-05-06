/**
 * compressor-app.test.ts
 *
 * Covers packages/compressor/src/app.ts real logic.
 * Mocks @creator-studio-os/core (runAppleScript, loadConfig)
 * and node:child_process (spawn) to avoid hitting actual Apple binaries.
 */

import { describe, it, expect, vi } from "vitest";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const real = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...real,
    runAppleScript: vi.fn(),
    loadConfig: vi.fn(() => ({
      compressorBundleId: "com.apple.CompressorApp",
      compressorBinaryPath: "/fake/Compressor",
      compressorBundledSettingsDir: "/fake/Settings",
    })),
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:child_process")>();
  return { ...real, spawn: vi.fn() };
});

// ---------------------------------------------------------------------------
// Imports (after vi.mock)
// ---------------------------------------------------------------------------

import { isCompressorRunning, openCompressor } from "../packages/compressor/src/app.js";
import * as coreMod from "@creator-studio-os/core";
import * as childProcess from "node:child_process";
import { CreatorStudioError } from "@creator-studio-os/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a fake child_process-like EventEmitter with stderr stream. */
function makeSpawnResult(exitCode: number | null, spawnError?: Error) {
  const proc = new EventEmitter() as ChildProcess;
  const stderr = new EventEmitter();
  (proc as unknown as Record<string, unknown>).stderr = stderr;

  // Queue the event emission asynchronously so consumers can attach listeners first
  setImmediate(() => {
    if (spawnError) {
      proc.emit("error", spawnError);
    } else {
      proc.emit("close", exitCode);
    }
  });

  return proc;
}

// ---------------------------------------------------------------------------
// Tests: isCompressorRunning
// ---------------------------------------------------------------------------

describe("isCompressorRunning", () => {
  it("returns true when osascript output is 'true'", async () => {
    vi.mocked(coreMod.runAppleScript).mockResolvedValueOnce("true\n");
    const result = await isCompressorRunning();
    expect(result).toBe(true);
  });

  it("returns false when osascript output is 'false'", async () => {
    vi.mocked(coreMod.runAppleScript).mockResolvedValueOnce("false\n");
    const result = await isCompressorRunning();
    expect(result).toBe(false);
  });

  it("returns false when osascript output is empty", async () => {
    vi.mocked(coreMod.runAppleScript).mockResolvedValueOnce("");
    const result = await isCompressorRunning();
    expect(result).toBe(false);
  });

  it("propagates errors thrown by runAppleScript", async () => {
    vi.mocked(coreMod.runAppleScript).mockRejectedValueOnce(new Error("osascript not available"));
    await expect(isCompressorRunning()).rejects.toThrow("osascript not available");
  });
});

// ---------------------------------------------------------------------------
// Tests: openCompressor
// ---------------------------------------------------------------------------

describe("openCompressor", () => {
  it("resolves when spawn exits with code 0", async () => {
    const proc = makeSpawnResult(0);
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc);
    await expect(openCompressor()).resolves.toBeUndefined();
  });

  it("rejects with E_COMPRESSOR_NOT_FOUND when spawn exits with non-zero code", async () => {
    const proc = makeSpawnResult(1);
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc);
    await expect(openCompressor()).rejects.toMatchObject({
      code: "E_COMPRESSOR_NOT_FOUND",
    } satisfies Partial<CreatorStudioError>);
  });

  it("rejects with E_COMPRESSOR_NOT_FOUND when spawn emits an error event", async () => {
    const proc = makeSpawnResult(null, new Error("ENOENT: no such file or directory"));
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc);
    await expect(openCompressor()).rejects.toMatchObject({
      code: "E_COMPRESSOR_NOT_FOUND",
    } satisfies Partial<CreatorStudioError>);
  });

  it("passes the bundle id from loadConfig to 'open -b'", async () => {
    vi.mocked(coreMod.loadConfig).mockReturnValueOnce({
      compressorBundleId: "com.apple.CompressorApp.custom",
      compressorBinaryPath: "/fake/Compressor",
      compressorBundledSettingsDir: "/fake/Settings",
    } as ReturnType<typeof coreMod.loadConfig>);
    const proc = makeSpawnResult(0);
    vi.mocked(childProcess.spawn).mockReturnValueOnce(proc);
    await openCompressor();
    expect(vi.mocked(childProcess.spawn)).toHaveBeenCalledWith(
      "open",
      ["-b", "com.apple.CompressorApp.custom"],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });
});
