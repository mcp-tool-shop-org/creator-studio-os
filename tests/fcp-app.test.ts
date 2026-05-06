import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @creator-studio-os/core ─────────────────────────────────────────────
vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    runAppleScript: vi.fn(),
    loadConfig: vi.fn(() => ({ fcpAppPath: "/Applications/FCP.app", fcpBundleId: "com.apple.FinalCutApp", dataDir: "/data" })),
  };
});

// ─── Mock node:child_process ──────────────────────────────────────────────────
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

import { isFcpRunning, openFcp, activateFcp, fcpInstalled } from "@creator-studio-os/fcp";
import { runAppleScript } from "@creator-studio-os/core";
import { spawn } from "node:child_process";

const mockRunAppleScript = vi.mocked(runAppleScript);
const mockSpawn = vi.mocked(spawn);

function makeSpawnProcess(stdout: string, exitCode: number, error?: Error) {
  const stdoutListeners: Record<string, (data: Buffer) => void> = {};
  const processListeners: Record<string, (...args: unknown[]) => void> = {};

  const proc = {
    stdout: {
      on: vi.fn((event: string, cb: (data: Buffer) => void) => {
        stdoutListeners[event] = cb;
      }),
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      processListeners[event] = cb;
    }),
  };

  // Trigger events asynchronously
  setTimeout(() => {
    if (error) {
      processListeners["error"]?.(error);
    } else {
      stdoutListeners["data"]?.(Buffer.from(stdout));
      processListeners["close"]?.(exitCode);
    }
  }, 0);

  return proc as unknown as ReturnType<typeof spawn>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── isFcpRunning ─────────────────────────────────────────────────────────────

describe("isFcpRunning", () => {
  it("returns true when AppleScript returns 'true'", async () => {
    mockRunAppleScript.mockResolvedValue("true");
    const result = await isFcpRunning();
    expect(result).toBe(true);
    expect(mockRunAppleScript).toHaveBeenCalledOnce();
  });

  it("returns false when AppleScript returns 'false'", async () => {
    mockRunAppleScript.mockResolvedValue("false");
    const result = await isFcpRunning();
    expect(result).toBe(false);
  });

  it("returns false when AppleScript returns whitespace-padded 'true'", async () => {
    // trim() makes '  true  ' → 'true'
    mockRunAppleScript.mockResolvedValue("  true  ");
    const result = await isFcpRunning();
    expect(result).toBe(true);
  });

  it("returns false for unexpected output", async () => {
    mockRunAppleScript.mockResolvedValue("error: something");
    const result = await isFcpRunning();
    expect(result).toBe(false);
  });

  it("propagates errors from runAppleScript", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("Permission denied"));
    await expect(isFcpRunning()).rejects.toThrow("Permission denied");
  });
});

// ─── openFcp ──────────────────────────────────────────────────────────────────

describe("openFcp", () => {
  it("calls runAppleScript with activate command", async () => {
    mockRunAppleScript.mockResolvedValue("");
    await openFcp();
    expect(mockRunAppleScript).toHaveBeenCalledOnce();
    expect(mockRunAppleScript.mock.calls[0][0]).toContain("activate");
    expect(mockRunAppleScript.mock.calls[0][0]).toContain("com.apple.FinalCutApp");
  });

  it("propagates errors from runAppleScript", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("Not authorized"));
    await expect(openFcp()).rejects.toThrow("Not authorized");
  });
});

// ─── activateFcp ──────────────────────────────────────────────────────────────

describe("activateFcp", () => {
  it("calls runAppleScript with activate command", async () => {
    mockRunAppleScript.mockResolvedValue("");
    await activateFcp();
    expect(mockRunAppleScript).toHaveBeenCalledOnce();
    expect(mockRunAppleScript.mock.calls[0][0]).toContain("activate");
  });

  it("propagates errors from runAppleScript", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("App busy"));
    await expect(activateFcp()).rejects.toThrow("App busy");
  });
});

// ─── fcpInstalled ─────────────────────────────────────────────────────────────

describe("fcpInstalled", () => {
  it("returns true when osascript exits 0 with 'ok'", async () => {
    mockSpawn.mockReturnValue(makeSpawnProcess("ok", 0));
    const result = await fcpInstalled("com.apple.FinalCutApp");
    expect(result).toBe(true);
  });

  it("returns false when osascript returns 'missing'", async () => {
    mockSpawn.mockReturnValue(makeSpawnProcess("missing", 0));
    const result = await fcpInstalled("com.apple.FinalCutApp");
    expect(result).toBe(false);
  });

  it("returns false when spawn emits an error", async () => {
    mockSpawn.mockReturnValue(makeSpawnProcess("", 1, new Error("ENOENT")));
    const result = await fcpInstalled("com.apple.FinalCutApp");
    expect(result).toBe(false);
  });

  it("returns false when stdout is empty", async () => {
    mockSpawn.mockReturnValue(makeSpawnProcess("", 0));
    const result = await fcpInstalled("com.apple.FinalCutApp");
    expect(result).toBe(false);
  });
});
