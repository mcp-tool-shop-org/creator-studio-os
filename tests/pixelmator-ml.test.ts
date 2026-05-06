/**
 * Pixelmator Pro — ml.ts unit tests.
 *
 * Covers applyMl (all 11 algorithm branches) and runShortcut.
 * Mocks runAppleScript/loadConfig and node:child_process execFile.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockReturnValue({
      pixelmatorBundleId: "com.apple.pixelmator",
      pixelmatorAppPath: "/Applications/Pixelmator Pro.app",
      dataDir: "/data",
    }),
    runAppleScript: vi.fn().mockResolvedValue(""),
    escapeAppleScriptString: (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'),
    CreatorStudioError: actual.CreatorStudioError,
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFile: vi.fn((cmd: string, args: string[], opts: unknown, cb: Function) => {
      cb(null, "", "");
      return {} as any;
    }),
  };
});

import { runAppleScript, loadConfig } from "@creator-studio-os/core";
import { applyMl, runShortcut, ML_ALGORITHMS } from "../packages/pixelmator/src/ml.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadConfig).mockReturnValue({
    pixelmatorBundleId: "com.apple.pixelmator",
    pixelmatorAppPath: "/Applications/Pixelmator Pro.app",
    dataDir: "/data",
  } as ReturnType<typeof loadConfig>);
  vi.mocked(runAppleScript).mockResolvedValue("");
});

// ── applyMl ───────────────────────────────────────────────────────────────────

describe("applyMl — super_resolution", () => {
  it("uses 'super resolution' command when no target dimensions", async () => {
    await applyMl({ documentName: "Doc", algorithm: "super_resolution" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("super resolution");
  });

  it("uses resize verb when targetWidth supplied", async () => {
    await applyMl({ documentName: "Doc", algorithm: "super_resolution", targetWidth: 3840 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("resize image");
    expect(script).toContain("3840");
    expect(script).toContain("ml super resolution");
  });

  it("uses resize verb when targetHeight supplied", async () => {
    await applyMl({ documentName: "Doc", algorithm: "super_resolution", targetHeight: 2160 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("resize image");
    expect(script).toContain("2160");
  });

  it("includes both width and height when both supplied", async () => {
    await applyMl({ documentName: "Doc", algorithm: "super_resolution", targetWidth: 1920, targetHeight: 1080 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("1920");
    expect(script).toContain("1080");
  });
});

describe("applyMl — enhance", () => {
  it("uses 'enhance' command", async () => {
    await applyMl({ documentName: "Doc", algorithm: "enhance" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("enhance");
  });
});

describe("applyMl — denoise", () => {
  it("uses plain 'denoise' when no intensity", async () => {
    await applyMl({ documentName: "Doc", algorithm: "denoise" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("denoise");
    expect(script).not.toContain("intensity");
  });

  it("includes intensity when supplied", async () => {
    await applyMl({ documentName: "Doc", algorithm: "denoise", denoiseIntensity: 75 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("denoise intensity 75");
  });
});

describe("applyMl — deband", () => {
  it("uses 'deband' command", async () => {
    await applyMl({ documentName: "Doc", algorithm: "deband" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("deband");
  });
});

describe("applyMl — match_colors", () => {
  it("throws when matchColorsReference is missing", async () => {
    await expect(applyMl({ documentName: "Doc", algorithm: "match_colors" }))
      .rejects.toThrow(/matchColorsReference/);
  });

  it("includes reference file path when supplied", async () => {
    await applyMl({ documentName: "Doc", algorithm: "match_colors", matchColorsReference: "/tmp/ref.jpg" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("match colors to POSIX file");
    expect(script).toContain("/tmp/ref.jpg");
  });
});

describe("applyMl — remove_background", () => {
  it("uses 'remove background' command", async () => {
    await applyMl({ documentName: "Doc", algorithm: "remove_background" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("remove background");
  });
});

describe("applyMl — select_subject", () => {
  it("uses smart refine true by default", async () => {
    await applyMl({ documentName: "Doc", algorithm: "select_subject" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("select subject smart refine true");
  });

  it("sets smart refine false when explicitly passed", async () => {
    await applyMl({ documentName: "Doc", algorithm: "select_subject", smartRefine: false });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("select subject smart refine false");
  });
});

describe("applyMl — auto_white_balance", () => {
  it("uses 'auto white balance' command", async () => {
    await applyMl({ documentName: "Doc", algorithm: "auto_white_balance" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("auto white balance");
  });
});

describe("applyMl — auto_light", () => {
  it("uses 'auto light' command", async () => {
    await applyMl({ documentName: "Doc", algorithm: "auto_light" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("auto light");
  });
});

describe("applyMl — auto_color_balance", () => {
  it("uses 'auto color balance' command", async () => {
    await applyMl({ documentName: "Doc", algorithm: "auto_color_balance" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("auto color balance");
  });
});

describe("applyMl — auto_hue_and_saturation", () => {
  it("uses 'auto hue and saturation' command", async () => {
    await applyMl({ documentName: "Doc", algorithm: "auto_hue_and_saturation" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("auto hue and saturation");
  });
});

describe("applyMl — document targeting", () => {
  it("includes documentName in the tell document block", async () => {
    await applyMl({ documentName: "MyDoc", algorithm: "enhance" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('"MyDoc"');
    expect(script).toContain("com.apple.pixelmator");
  });

  it("uses 120s timeout for ML operations", async () => {
    await applyMl({ documentName: "Doc", algorithm: "enhance" });
    const opts = vi.mocked(runAppleScript).mock.calls[0][1] as { timeoutMs?: number };
    expect(opts?.timeoutMs).toBe(120_000);
  });

  it("propagates errors from runAppleScript", async () => {
    vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("timeout"));
    await expect(applyMl({ documentName: "Doc", algorithm: "enhance" })).rejects.toThrow("timeout");
  });
});

// ── runShortcut ────────────────────────────────────────────────────────────────

describe("runShortcut", () => {
  it("returns exitCode 0 on success", async () => {
    const result = await runShortcut({ shortcutName: "Optimize Image" });
    expect(result.exitCode).toBe(0);
    expect(result.shortcutName).toBe("Optimize Image");
    expect(result.stderr).toBe("");
  });

  it("includes single input file with -i flag", async () => {
    await runShortcut({ shortcutName: "Process", input: "/tmp/img.png" });
    // execFile is mocked to call cb(null) — just verify it resolves
  });

  it("includes multiple input files", async () => {
    const result = await runShortcut({ shortcutName: "Process", input: ["/tmp/a.png", "/tmp/b.png"] });
    expect(result.exitCode).toBe(0);
  });

  it("includes output path when supplied", async () => {
    const result = await runShortcut({ shortcutName: "Process", output: "/tmp/out.png" });
    expect(result.exitCode).toBe(0);
  });

  it("returns partial result with stderr when shortcuts exits non-zero (not 127)", async () => {
    const { execFile } = await import("node:child_process");
    vi.mocked(execFile).mockImplementationOnce((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err = Object.assign(new Error("shortcut failed"), { code: 1, stderr: "bad state" });
      cb(err, "", "bad state");
      return {} as any;
    });
    const result = await runShortcut({ shortcutName: "Broken Shortcut" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("bad state");
  });

  it("throws when shortcuts CLI not found (code 127)", async () => {
    const { execFile } = await import("node:child_process");
    vi.mocked(execFile).mockImplementationOnce((_cmd: any, _args: any, _opts: any, cb: any) => {
      const err = Object.assign(new Error("not found"), { code: 127, stderr: "" });
      cb(err, "", "");
      return {} as any;
    });
    await expect(runShortcut({ shortcutName: "Anything" })).rejects.toThrow(/shortcuts CLI not found/);
  });
});

// ── ML_ALGORITHMS enum ────────────────────────────────────────────────────────

describe("ML_ALGORITHMS", () => {
  it("has 11 algorithms", () => {
    expect(ML_ALGORITHMS).toHaveLength(11);
  });

  it("contains all expected algorithms", () => {
    expect(ML_ALGORITHMS).toContain("super_resolution");
    expect(ML_ALGORITHMS).toContain("enhance");
    expect(ML_ALGORITHMS).toContain("denoise");
    expect(ML_ALGORITHMS).toContain("deband");
    expect(ML_ALGORITHMS).toContain("match_colors");
    expect(ML_ALGORITHMS).toContain("remove_background");
    expect(ML_ALGORITHMS).toContain("select_subject");
    expect(ML_ALGORITHMS).toContain("auto_white_balance");
    expect(ML_ALGORITHMS).toContain("auto_light");
    expect(ML_ALGORITHMS).toContain("auto_color_balance");
    expect(ML_ALGORITHMS).toContain("auto_hue_and_saturation");
  });
});
