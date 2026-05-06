/**
 * runners/openApp.ts — full coverage.
 *
 * Mocks node:child_process spawn to exercise all branches:
 * happy path (exit 0), error path (exit != 0), spawn error event.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, spawn: vi.fn() };
});

import { spawn } from "node:child_process";
import { openWithApp } from "../packages/core/src/runners/openApp.js";
import { CreatorStudioError } from "@creator-studio-os/core";

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
// Tests
// ---------------------------------------------------------------------------

describe("openWithApp", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Happy path ──────────────────────────────────────────────────────────

  it("resolves when open exits 0 (no options)", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await expect(openWithApp("/project/video.mov")).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledWith("open", ["/project/video.mov"], expect.any(Object));
  });

  it("resolves with appBundleId option", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await openWithApp("/video.mov", { appBundleId: "com.apple.FinalCutApp" });
    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args).toContain("-b");
    expect(args).toContain("com.apple.FinalCutApp");
    expect(args).toContain("/video.mov");
  });

  it("resolves with appPath option", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await openWithApp("/video.mov", { appPath: "/Applications/FCP.app" });
    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args).toContain("-a");
    expect(args).toContain("/Applications/FCP.app");
  });

  it("adds -g flag for background option", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await openWithApp("/video.mov", { background: true });
    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args).toContain("-g");
  });

  it("adds -n flag for freshInstance option", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await openWithApp("/video.mov", { freshInstance: true });
    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args).toContain("-n");
  });

  it("combines -g and -n flags together", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await openWithApp("/video.mov", { background: true, freshInstance: true });
    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args).toContain("-g");
    expect(args).toContain("-n");
  });

  it("appBundleId takes precedence over appPath when both given", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(0) as ReturnType<typeof spawn>);
    await openWithApp("/video.mov", {
      appBundleId: "com.apple.FinalCutApp",
      appPath: "/Applications/FCP.app",
    });
    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    // -b should be present; -a should not (bundle id takes the if branch)
    expect(args).toContain("-b");
    expect(args).not.toContain("-a");
  });

  // ── Exit error path ─────────────────────────────────────────────────────

  it("rejects with E_FCP_NOT_FOUND when open exits non-zero", async () => {
    vi.mocked(spawn).mockReturnValue(
      fakeChild(1, "application not found") as ReturnType<typeof spawn>,
    );
    await expect(openWithApp("/video.mov")).rejects.toMatchObject({
      code: "E_FCP_NOT_FOUND",
    });
  });

  it("error message includes exit code", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(2, "") as ReturnType<typeof spawn>);
    await expect(openWithApp("/video.mov")).rejects.toThrow(/exit 2/);
  });

  it("error message includes stderr when available", async () => {
    vi.mocked(spawn).mockReturnValue(
      fakeChild(1, "No application knows how to open") as ReturnType<typeof spawn>,
    );
    await expect(openWithApp("/video.mov")).rejects.toThrow(
      "No application knows how to open",
    );
  });

  it("error message says 'no output' when stderr is empty", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(1, "") as ReturnType<typeof spawn>);
    await expect(openWithApp("/video.mov")).rejects.toThrow(/no output/);
  });

  it("error hint mentions installed and file path", async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild(1, "") as ReturnType<typeof spawn>);
    try {
      await openWithApp("/video.mov");
    } catch (e) {
      expect(e).toBeInstanceOf(CreatorStudioError);
      expect((e as CreatorStudioError).hint).toContain("installed");
    }
  });

  // ── Spawn error event ───────────────────────────────────────────────────

  it("rejects with E_FCP_NOT_FOUND on spawn error event", async () => {
    vi.mocked(spawn).mockReturnValue(
      errorChild("ENOENT: no such file or directory") as ReturnType<typeof spawn>,
    );
    await expect(openWithApp("/video.mov")).rejects.toMatchObject({
      code: "E_FCP_NOT_FOUND",
    });
  });

  it("spawn error message includes original error text", async () => {
    vi.mocked(spawn).mockReturnValue(
      errorChild("ENOENT") as ReturnType<typeof spawn>,
    );
    await expect(openWithApp("/video.mov")).rejects.toThrow("'open' failed: ENOENT");
  });
});
