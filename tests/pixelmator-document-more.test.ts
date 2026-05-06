/**
 * Pixelmator Pro — document.ts additional coverage.
 *
 * The existing pixelmator-document.test.ts only checks EXPORT_FORMAT_LIST.
 * This file covers the actual document functions: openDocument, closeDocument,
 * exportDocument, resizeDocument, cropDocument, rotateDocument, flipDocument.
 *
 * All tests mock runAppleScript so no live Pixelmator is required.
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

import { runAppleScript, loadConfig } from "@creator-studio-os/core";
import {
  openDocument,
  closeDocument,
  exportDocument,
  resizeDocument,
  cropDocument,
  rotateDocument,
  flipDocument,
} from "../packages/pixelmator/src/document.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadConfig).mockReturnValue({
    pixelmatorBundleId: "com.apple.pixelmator",
    pixelmatorAppPath: "/Applications/Pixelmator Pro.app",
    dataDir: "/data",
  } as ReturnType<typeof loadConfig>);
  vi.mocked(runAppleScript).mockResolvedValue("MyDocument");
});

// ── openDocument ──────────────────────────────────────────────────────────────

describe("openDocument", () => {
  it("returns name from AppleScript output", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("  My Image  ");
    const result = await openDocument("/tmp/test.png");
    expect(result.name).toBe("My Image");
  });

  it("generates open POSIX file script with activate", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Doc");
    await openDocument("/Users/test/photo.pxd");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("activate");
    expect(script).toContain("open POSIX file");
    expect(script).toContain("/Users/test/photo.pxd");
  });

  it("includes bundleId from config", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Doc");
    await openDocument("/tmp/img.png");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("com.apple.pixelmator");
  });

  it("uses 60s timeout", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Doc");
    await openDocument("/tmp/img.png");
    const opts = vi.mocked(runAppleScript).mock.calls[0][1] as { timeoutMs?: number };
    expect(opts?.timeoutMs).toBe(60_000);
  });

  it("propagates errors from runAppleScript", async () => {
    vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("file not found"));
    await expect(openDocument("/missing.png")).rejects.toThrow("file not found");
  });

  it("escapes special characters in path", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Doc");
    await openDocument('/tmp/my "photo".png');
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('\\"photo\\"');
  });
});

// ── closeDocument ─────────────────────────────────────────────────────────────

describe("closeDocument", () => {
  it("generates close document saving no script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await closeDocument("MyDoc");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('close document "MyDoc"');
    expect(script).toContain("saving no");
  });

  it("resolves without value", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await expect(closeDocument("TestDoc")).resolves.toBeUndefined();
  });

  it("propagates errors", async () => {
    vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("doc not found"));
    await expect(closeDocument("Missing")).rejects.toThrow("doc not found");
  });
});

// ── exportDocument ────────────────────────────────────────────────────────────

describe("exportDocument", () => {
  it("generates export as PNG script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await exportDocument({ documentName: "Doc", outputPath: "/tmp/out.png", format: "PNG" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("export to");
    expect(script).toContain("as PNG");
    expect(script).toContain("/tmp/out.png");
  });

  it("uses correct format keyword for JPEG", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await exportDocument({ documentName: "Doc", outputPath: "/tmp/out.jpg", format: "JPEG" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("as JPEG");
  });

  it("includes documentName in tell block", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await exportDocument({ documentName: "My Brand Card", outputPath: "/out.png", format: "PNG" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('"My Brand Card"');
  });

  it("uses 60s timeout", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await exportDocument({ documentName: "Doc", outputPath: "/tmp/x.png", format: "PNG" });
    const opts = vi.mocked(runAppleScript).mock.calls[0][1] as { timeoutMs?: number };
    expect(opts?.timeoutMs).toBe(60_000);
  });

  it("propagates errors", async () => {
    vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("export failed"));
    await expect(exportDocument({ documentName: "D", outputPath: "/x", format: "PNG" }))
      .rejects.toThrow("export failed");
  });
});

// ── resizeDocument ────────────────────────────────────────────────────────────

describe("resizeDocument", () => {
  it("throws when no dimension supplied", async () => {
    await expect(resizeDocument({ documentName: "Doc" })).rejects.toThrow(/resize requires/);
  });

  it("generates resize script with width only", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await resizeDocument({ documentName: "Doc", width: 1920 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("resize image width 1920");
    expect(script).not.toContain("height");
  });

  it("generates resize script with height only", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await resizeDocument({ documentName: "Doc", height: 1080 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("resize image height 1080");
    expect(script).not.toContain("width");
  });

  it("generates resize script with both dimensions", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await resizeDocument({ documentName: "Doc", width: 3840, height: 2160 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("width 3840");
    expect(script).toContain("height 2160");
  });

  it("includes resolution when supplied", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await resizeDocument({ documentName: "Doc", width: 1000, resolutionPpi: 300 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("resolution 300");
  });

  it("uses 60s timeout", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await resizeDocument({ documentName: "Doc", width: 800 });
    const opts = vi.mocked(runAppleScript).mock.calls[0][1] as { timeoutMs?: number };
    expect(opts?.timeoutMs).toBe(60_000);
  });
});

// ── cropDocument ──────────────────────────────────────────────────────────────

describe("cropDocument", () => {
  it("generates crop bounds script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await cropDocument("Doc", { x: 10, y: 20, width: 800, height: 600 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("crop bounds");
    expect(script).toContain("{10, 20, 800, 600}");
  });

  it("omits delete mode by default", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await cropDocument("Doc", { x: 0, y: 0, width: 100, height: 100 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).not.toContain("delete mode");
  });

  it("includes delete mode true when requested", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await cropDocument("Doc", { x: 0, y: 0, width: 100, height: 100 }, true);
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("delete mode true");
  });

  it("uses 60s timeout", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await cropDocument("Doc", { x: 0, y: 0, width: 100, height: 100 });
    const opts = vi.mocked(runAppleScript).mock.calls[0][1] as { timeoutMs?: number };
    expect(opts?.timeoutMs).toBe(60_000);
  });
});

// ── rotateDocument ────────────────────────────────────────────────────────────

describe("rotateDocument", () => {
  it("generates 'rotate 180' script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await rotateDocument("Doc", "180");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("rotate 180");
  });

  it("generates 'rotate right' script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await rotateDocument("Doc", "right");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("rotate right");
  });

  it("generates 'rotate left' script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await rotateDocument("Doc", "left");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("rotate left");
  });

  it("includes documentName in script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await rotateDocument("MyPhoto", "right");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('"MyPhoto"');
  });
});

// ── flipDocument ──────────────────────────────────────────────────────────────

describe("flipDocument", () => {
  it("generates 'flip horizontally' script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await flipDocument("Doc", "horizontal");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("flip horizontally");
  });

  it("generates 'flip vertically' script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await flipDocument("Doc", "vertical");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("flip vertically");
  });

  it("includes documentName in script", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await flipDocument("MyImage", "horizontal");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('"MyImage"');
  });
});
