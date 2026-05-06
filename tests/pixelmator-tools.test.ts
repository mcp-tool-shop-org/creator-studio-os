/**
 * Pixelmator Pro — tools.ts unit tests.
 *
 * Covers registerPixelmatorTools (all ~28 tool registrations).
 * Uses makeMockServer() pattern to capture and invoke registered handlers.
 *
 * All underlying operations are mocked — no live Pixelmator required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ---------------------------------------------------------------------------
// Mocks — must be top-level (vi.mock is hoisted)
// ---------------------------------------------------------------------------

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
    activateApp: vi.fn().mockResolvedValue(undefined),
    isAppRunning: vi.fn().mockResolvedValue(true),
    escapeAppleScriptString: (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'),
    resolveProject: vi.fn().mockResolvedValue({
      name: "testproject",
      root: "/data/projects/testproject",
      meta: {},
      paths: {
        footage: "/data/projects/testproject/footage",
        audio: "/data/projects/testproject/audio",
        images: "/data/projects/testproject/images",
        brand: "/data/projects/testproject/brand",
        refs: "/data/projects/testproject/refs",
        fcp: "/data/projects/testproject/fcp",
        out: "/data/projects/testproject/out",
      },
    }),
    CreatorStudioError: actual.CreatorStudioError,
  };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    access: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue(["photo.png", "banner.jpg", ".DS_Store", "._hidden"]),
  };
});

vi.mock("../packages/pixelmator/src/app.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/pixelmator/src/app.js")>();
  return {
    ...actual,
    isPixelmatorRunning: vi.fn().mockResolvedValue(true),
    openPixelmator: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../packages/pixelmator/src/document.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/pixelmator/src/document.js")>();
  return {
    ...actual,
    openDocument: vi.fn().mockResolvedValue({ name: "TestDoc" }),
    closeDocument: vi.fn().mockResolvedValue(undefined),
    exportDocument: vi.fn().mockResolvedValue(undefined),
    resizeDocument: vi.fn().mockResolvedValue(undefined),
    cropDocument: vi.fn().mockResolvedValue(undefined),
    rotateDocument: vi.fn().mockResolvedValue(undefined),
    flipDocument: vi.fn().mockResolvedValue(undefined),
    exportHdr: vi.fn().mockResolvedValue(undefined),
    exportVideo: vi.fn().mockResolvedValue(undefined),
    exportAnimated: vi.fn().mockResolvedValue(undefined),
    exportForWeb: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../packages/pixelmator/src/detect.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/pixelmator/src/detect.js")>();
  return {
    ...actual,
    detectInDocument: vi.fn().mockResolvedValue({ kind: "face", count: 0, faces: [] }),
    replaceText: vi.fn().mockResolvedValue({ replaced: true }),
    replaceLayerImage: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../packages/pixelmator/src/layers.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/pixelmator/src/layers.js")>();
  return {
    ...actual,
    makeLayer: vi.fn().mockResolvedValue({ layerName: "New Layer" }),
    makeShape: vi.fn().mockResolvedValue({ layerName: "New Shape" }),
    setLayerProperties: vi.fn().mockResolvedValue(undefined),
    setLayerOrder: vi.fn().mockResolvedValue(undefined),
    groupLayers: vi.fn().mockResolvedValue({ groupName: "Group 1" }),
    ungroupLayer: vi.fn().mockResolvedValue(undefined),
    setLayerText: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../packages/pixelmator/src/effects.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/pixelmator/src/effects.js")>();
  return {
    ...actual,
    applyEffect: vi.fn().mockResolvedValue(undefined),
    applyColorAdjustments: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../packages/pixelmator/src/ml.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/pixelmator/src/ml.js")>();
  return {
    ...actual,
    applyMl: vi.fn().mockResolvedValue(undefined),
    runShortcut: vi.fn().mockResolvedValue({ shortcutName: "Process", exitCode: 0, stderr: "" }),
  };
});

vi.mock("../packages/pixelmator/src/styles.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/pixelmator/src/styles.js")>();
  return {
    ...actual,
    setBlendMode: vi.fn().mockResolvedValue(undefined),
    setLayerShadow: vi.fn().mockResolvedValue(undefined),
    setLayerStroke: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../packages/pixelmator/src/brandCard.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/pixelmator/src/brandCard.js")>();
  return {
    ...actual,
    composeBrandCard: vi.fn().mockResolvedValue({
      templateName: "card-template",
      outputs: [{ path: "/tmp/out/brand-card-1080p.png", width: 1920, height: 1080, label: "1080p" }],
    }),
  };
});

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { registerPixelmatorTools } from "../packages/pixelmator/src/tools.js";
import { CreatorStudioError } from "@creator-studio-os/core";
import { isPixelmatorRunning, openPixelmator } from "../packages/pixelmator/src/app.js";
import {
  openDocument, closeDocument, exportDocument, resizeDocument,
  cropDocument, rotateDocument, flipDocument,
  exportHdr, exportVideo, exportAnimated, exportForWeb,
} from "../packages/pixelmator/src/document.js";
import { detectInDocument, replaceText, replaceLayerImage } from "../packages/pixelmator/src/detect.js";
import {
  makeLayer, makeShape, setLayerProperties, setLayerOrder,
  groupLayers, ungroupLayer, setLayerText,
} from "../packages/pixelmator/src/layers.js";
import { applyEffect, applyColorAdjustments } from "../packages/pixelmator/src/effects.js";
import { applyMl, runShortcut } from "../packages/pixelmator/src/ml.js";
import { setBlendMode, setLayerShadow, setLayerStroke } from "../packages/pixelmator/src/styles.js";
import { composeBrandCard } from "../packages/pixelmator/src/brandCard.js";
import { access, mkdir, readdir } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Mock server helper
// ---------------------------------------------------------------------------

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };
type Handler = (args: Record<string, unknown>) => Promise<ToolResult>;

function makeMockServer() {
  const registry = new Map<string, Handler>();
  const server = {
    tool(_name: string, _desc: string, _schema: unknown, handler: Handler) {
      registry.set(_name, handler);
    },
  } as unknown as McpServer;
  async function call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    const h = registry.get(name);
    if (!h) throw new Error(`Tool not registered: ${name}`);
    return h(args);
  }
  return { server, call };
}

function parsed(r: ToolResult) {
  return JSON.parse(r.content[0]!.text);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("registerPixelmatorTools", () => {
  let call: ReturnType<typeof makeMockServer>["call"];

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mock defaults
    vi.mocked(isPixelmatorRunning).mockResolvedValue(true);
    vi.mocked(openPixelmator).mockResolvedValue(undefined);
    vi.mocked(openDocument).mockResolvedValue({ name: "TestDoc" });
    vi.mocked(closeDocument).mockResolvedValue(undefined);
    vi.mocked(exportDocument).mockResolvedValue(undefined);
    vi.mocked(resizeDocument).mockResolvedValue(undefined);
    vi.mocked(cropDocument).mockResolvedValue(undefined);
    vi.mocked(rotateDocument).mockResolvedValue(undefined);
    vi.mocked(flipDocument).mockResolvedValue(undefined);
    vi.mocked(exportHdr).mockResolvedValue(undefined);
    vi.mocked(exportVideo).mockResolvedValue(undefined);
    vi.mocked(exportAnimated).mockResolvedValue(undefined);
    vi.mocked(exportForWeb).mockResolvedValue(undefined);
    vi.mocked(detectInDocument).mockResolvedValue({ kind: "face", count: 0, faces: [] });
    vi.mocked(replaceText).mockResolvedValue({ replaced: true });
    vi.mocked(replaceLayerImage).mockResolvedValue(undefined);
    vi.mocked(makeLayer).mockResolvedValue({ layerName: "New Layer" });
    vi.mocked(makeShape).mockResolvedValue({ layerName: "New Shape" });
    vi.mocked(setLayerProperties).mockResolvedValue(undefined);
    vi.mocked(setLayerOrder).mockResolvedValue(undefined);
    vi.mocked(groupLayers).mockResolvedValue({ groupName: "Group 1" });
    vi.mocked(ungroupLayer).mockResolvedValue(undefined);
    vi.mocked(setLayerText).mockResolvedValue(undefined);
    vi.mocked(applyEffect).mockResolvedValue(undefined);
    vi.mocked(applyColorAdjustments).mockResolvedValue(undefined);
    vi.mocked(applyMl).mockResolvedValue(undefined);
    vi.mocked(runShortcut).mockResolvedValue({ shortcutName: "Process", exitCode: 0, stderr: "" });
    vi.mocked(setBlendMode).mockResolvedValue(undefined);
    vi.mocked(setLayerShadow).mockResolvedValue(undefined);
    vi.mocked(setLayerStroke).mockResolvedValue(undefined);
    vi.mocked(composeBrandCard).mockResolvedValue({
      templateName: "card-template",
      outputs: [{ path: "/tmp/out/card.png", width: 1920, height: 1080, label: "1080p" }],
    });
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(readdir).mockResolvedValue(["photo.png", "banner.jpg", ".DS_Store", "._hidden"] as any);

    const ms = makeMockServer();
    registerPixelmatorTools(ms.server);
    call = ms.call;
  });

  // ── pixelmator_app_open ───────────────────────────────────────────────────

  describe("pixelmator_app_open", () => {
    it("happy path — returns {opened: true}", async () => {
      const r = await call("pixelmator_app_open");
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toEqual({ opened: true });
      expect(openPixelmator).toHaveBeenCalled();
    });

    it("error path — CreatorStudioError", async () => {
      vi.mocked(openPixelmator).mockRejectedValueOnce(
        new CreatorStudioError("E_NOT_INSTALLED", "not installed"),
      );
      const r = await call("pixelmator_app_open");
      expect(r.isError).toBe(true);
      expect(parsed(r).code).toBe("E_NOT_INSTALLED");
    });

    it("error path — generic Error", async () => {
      vi.mocked(openPixelmator).mockRejectedValueOnce(new Error("spawn failed"));
      const r = await call("pixelmator_app_open");
      expect(r.isError).toBe(true);
      expect(parsed(r).code).toBe("E_INTERNAL");
    });
  });

  // ── pixelmator_app_running ────────────────────────────────────────────────

  describe("pixelmator_app_running", () => {
    it("returns {running: true} when running", async () => {
      vi.mocked(isPixelmatorRunning).mockResolvedValue(true);
      const r = await call("pixelmator_app_running");
      expect(parsed(r)).toEqual({ running: true });
    });

    it("returns {running: false} when not running", async () => {
      vi.mocked(isPixelmatorRunning).mockResolvedValue(false);
      const r = await call("pixelmator_app_running");
      expect(parsed(r)).toEqual({ running: false });
    });

    it("error path", async () => {
      vi.mocked(isPixelmatorRunning).mockRejectedValueOnce(new Error("osascript timeout"));
      const r = await call("pixelmator_app_running");
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_open ───────────────────────────────────────────────────────

  describe("pixelmator_open", () => {
    it("happy path — returns document name", async () => {
      vi.mocked(openDocument).mockResolvedValue({ name: "MyPhoto" });
      const r = await call("pixelmator_open", { path: "/tmp/photo.png" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).name).toBe("MyPhoto");
    });

    it("error path", async () => {
      vi.mocked(openDocument).mockRejectedValueOnce(new Error("file missing"));
      const r = await call("pixelmator_open", { path: "/missing.png" });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_close ──────────────────────────────────────────────────────

  describe("pixelmator_close", () => {
    it("happy path — returns {closed: name}", async () => {
      const r = await call("pixelmator_close", { name: "MyDoc" });
      expect(parsed(r)).toEqual({ closed: "MyDoc" });
    });

    it("error path", async () => {
      vi.mocked(closeDocument).mockRejectedValueOnce(new Error("close failed"));
      const r = await call("pixelmator_close", { name: "D" });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_export ─────────────────────────────────────────────────────

  describe("pixelmator_export", () => {
    it("happy path — returns {exported, format}", async () => {
      const r = await call("pixelmator_export", {
        documentName: "Doc", outputPath: "/tmp/out.png", format: "PNG",
      });
      expect(parsed(r).format).toBe("PNG");
      expect(parsed(r).exported).toBe("/tmp/out.png");
    });

    it("error path", async () => {
      vi.mocked(exportDocument).mockRejectedValueOnce(new Error("export failed"));
      const r = await call("pixelmator_export", {
        documentName: "D", outputPath: "/x", format: "PNG",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_resize ─────────────────────────────────────────────────────

  describe("pixelmator_resize", () => {
    it("happy path — returns {resized: documentName}", async () => {
      const r = await call("pixelmator_resize", { documentName: "Doc", width: 1920 });
      expect(parsed(r)).toEqual({ resized: "Doc" });
      expect(resizeDocument).toHaveBeenCalledWith(
        expect.objectContaining({ documentName: "Doc", width: 1920 }),
      );
    });

    it("passes height and resolution through", async () => {
      const r = await call("pixelmator_resize", { documentName: "D", height: 1080, resolutionPpi: 300 });
      expect(r.isError).toBeFalsy();
      expect(resizeDocument).toHaveBeenCalledWith(
        expect.objectContaining({ height: 1080, resolutionPpi: 300 }),
      );
    });

    it("error path", async () => {
      vi.mocked(resizeDocument).mockRejectedValueOnce(new Error("resize error"));
      const r = await call("pixelmator_resize", { documentName: "D", width: 100 });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_crop ───────────────────────────────────────────────────────

  describe("pixelmator_crop", () => {
    it("happy path — returns {cropped}", async () => {
      const r = await call("pixelmator_crop", {
        documentName: "Doc",
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        deleteMode: false,
      });
      expect(parsed(r)).toEqual({ cropped: "Doc" });
    });

    it("passes deleteMode through", async () => {
      await call("pixelmator_crop", {
        documentName: "Doc",
        bounds: { x: 10, y: 10, width: 500, height: 400 },
        deleteMode: true,
      });
      expect(cropDocument).toHaveBeenCalledWith("Doc", expect.anything(), true);
    });

    it("error path", async () => {
      vi.mocked(cropDocument).mockRejectedValueOnce(new Error("crop failed"));
      const r = await call("pixelmator_crop", {
        documentName: "D",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        deleteMode: false,
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_rotate ─────────────────────────────────────────────────────

  describe("pixelmator_rotate", () => {
    it("happy path 180", async () => {
      const r = await call("pixelmator_rotate", { documentName: "Doc", direction: "180" });
      expect(parsed(r).direction).toBe("180");
    });

    it("happy path right", async () => {
      const r = await call("pixelmator_rotate", { documentName: "Doc", direction: "right" });
      expect(parsed(r).direction).toBe("right");
    });

    it("happy path left", async () => {
      const r = await call("pixelmator_rotate", { documentName: "Doc", direction: "left" });
      expect(r.isError).toBeFalsy();
    });

    it("error path", async () => {
      vi.mocked(rotateDocument).mockRejectedValueOnce(new Error("rotate failed"));
      const r = await call("pixelmator_rotate", { documentName: "D", direction: "right" });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_flip ───────────────────────────────────────────────────────

  describe("pixelmator_flip", () => {
    it("happy path horizontal", async () => {
      const r = await call("pixelmator_flip", { documentName: "Doc", axis: "horizontal" });
      expect(parsed(r).axis).toBe("horizontal");
    });

    it("happy path vertical", async () => {
      const r = await call("pixelmator_flip", { documentName: "Doc", axis: "vertical" });
      expect(r.isError).toBeFalsy();
    });

    it("error path", async () => {
      vi.mocked(flipDocument).mockRejectedValueOnce(new Error("flip failed"));
      const r = await call("pixelmator_flip", { documentName: "D", axis: "horizontal" });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_export_hdr ─────────────────────────────────────────────────

  describe("pixelmator_export_hdr", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_export_hdr", {
        documentName: "Doc", outputPath: "/tmp/out.heic", format: "HDR HEIC",
      });
      expect(parsed(r).format).toBe("HDR HEIC");
    });

    it("passes compressionFactor and colorProfile", async () => {
      await call("pixelmator_export_hdr", {
        documentName: "D", outputPath: "/o", format: "HDR JPEG",
        compressionFactor: 80, colorProfile: "Display P3",
      });
      expect(exportHdr).toHaveBeenCalledWith(
        expect.objectContaining({ compressionFactor: 80, colorProfile: "Display P3" }),
      );
    });

    it("error path", async () => {
      vi.mocked(exportHdr).mockRejectedValueOnce(new Error("hdr failed"));
      const r = await call("pixelmator_export_hdr", {
        documentName: "D", outputPath: "/o", format: "HDR PNG",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_export_video ───────────────────────────────────────────────

  describe("pixelmator_export_video", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_export_video", {
        documentName: "Doc", outputPath: "/tmp/v.mp4", format: "MP4",
      });
      expect(parsed(r).format).toBe("MP4");
    });

    it("passes frameRate", async () => {
      await call("pixelmator_export_video", {
        documentName: "D", outputPath: "/v.mp4", format: "MP4", frameRate: 24,
      });
      expect(exportVideo).toHaveBeenCalledWith(expect.objectContaining({ frameRate: 24 }));
    });

    it("error path", async () => {
      vi.mocked(exportVideo).mockRejectedValueOnce(new Error("video failed"));
      const r = await call("pixelmator_export_video", {
        documentName: "D", outputPath: "/v", format: "MP4",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_export_animated ────────────────────────────────────────────

  describe("pixelmator_export_animated", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_export_animated", {
        documentName: "Doc", outputPath: "/tmp/a.gif", format: "Animated GIF",
      });
      expect(parsed(r).format).toBe("Animated GIF");
    });

    it("error path", async () => {
      vi.mocked(exportAnimated).mockRejectedValueOnce(new Error("anim failed"));
      const r = await call("pixelmator_export_animated", {
        documentName: "D", outputPath: "/a", format: "Animated PNG",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_export_for_web ─────────────────────────────────────────────

  describe("pixelmator_export_for_web", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_export_for_web", {
        documentName: "Doc", outputPath: "/tmp/w.webp", format: "WebP",
      });
      expect(parsed(r).format).toBe("WebP");
    });

    it("passes all options", async () => {
      await call("pixelmator_export_for_web", {
        documentName: "D", outputPath: "/w.png", format: "PNG",
        compressionFactor: 90, scale: 2, convertToSRGB: true, keepTransparency: false,
      });
      expect(exportForWeb).toHaveBeenCalledWith(
        expect.objectContaining({ compressionFactor: 90, scale: 2, convertToSRGB: true }),
      );
    });

    it("error path", async () => {
      vi.mocked(exportForWeb).mockRejectedValueOnce(new Error("web failed"));
      const r = await call("pixelmator_export_for_web", {
        documentName: "D", outputPath: "/w", format: "PNG",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_compose_brand_card ─────────────────────────────────────────

  describe("pixelmator_compose_brand_card", () => {
    it("happy path — returns outputs array", async () => {
      const r = await call("pixelmator_compose_brand_card", {
        brand: { headline: "Test" },
        sizes: [{ width: 1920, height: 1080, label: "1080p" }],
        outputDir: "/tmp/out",
        hdr: false,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).outputs).toHaveLength(1);
    });

    it("passes hdr flag through", async () => {
      await call("pixelmator_compose_brand_card", {
        brand: {},
        sizes: [{ width: 1920, height: 1080 }],
        outputDir: "/tmp/out",
        hdr: true,
      });
      expect(composeBrandCard).toHaveBeenCalledWith(expect.objectContaining({ hdr: true }));
    });

    it("error path", async () => {
      vi.mocked(composeBrandCard).mockRejectedValueOnce(new Error("compose failed"));
      const r = await call("pixelmator_compose_brand_card", {
        brand: {},
        sizes: [{ width: 100, height: 100 }],
        outputDir: "/tmp/out",
        hdr: false,
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_batch_export_project_images ────────────────────────────────

  describe("pixelmator_batch_export_project_images", () => {
    it("happy path — processes .png and .jpg, skips dotfiles", async () => {
      vi.mocked(readdir).mockResolvedValue(["photo.png", "banner.jpg", ".DS_Store", "._hidden"] as any);
      const r = await call("pixelmator_batch_export_project_images", {
        project: "testproject", format: "PNG",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).count).toBe(2);
    });

    it("resizes when width/height provided", async () => {
      vi.mocked(readdir).mockResolvedValue(["img.png"] as any);
      await call("pixelmator_batch_export_project_images", {
        project: "testproject", format: "JPEG", width: 800, height: 600,
      });
      expect(resizeDocument).toHaveBeenCalled();
    });

    it("error path — access throws", async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error("dir not found"));
      const r = await call("pixelmator_batch_export_project_images", {
        project: "testproject", format: "PNG",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_make_layer ─────────────────────────────────────────────────

  describe("pixelmator_make_layer", () => {
    it("happy path text layer", async () => {
      vi.mocked(makeLayer).mockResolvedValue({ layerName: "Title" });
      const r = await call("pixelmator_make_layer", {
        documentName: "Doc", kind: "text", textContent: "Hello",
      });
      expect(parsed(r).layerName).toBe("Title");
    });

    it("happy path image layer", async () => {
      const r = await call("pixelmator_make_layer", {
        documentName: "Doc", kind: "image", imagePath: "/tmp/img.png",
      });
      expect(r.isError).toBeFalsy();
    });

    it("passes optional props (font, fontSize, textColor, position)", async () => {
      await call("pixelmator_make_layer", {
        documentName: "Doc", kind: "text", textContent: "Hi",
        font: "Inter-Bold", fontSize: 48, textColor: [255, 0, 0], position: [100, 200],
      });
      expect(makeLayer).toHaveBeenCalledWith(
        expect.objectContaining({ font: "Inter-Bold", fontSize: 48 }),
      );
    });

    it("error path", async () => {
      vi.mocked(makeLayer).mockRejectedValueOnce(new Error("make failed"));
      const r = await call("pixelmator_make_layer", {
        documentName: "D", kind: "shape",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_set_layer_properties ───────────────────────────────────────

  describe("pixelmator_set_layer_properties", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_set_layer_properties", {
        documentName: "Doc", layerName: "BG", visible: false,
      });
      expect(parsed(r)).toEqual({ updated: "BG" });
    });

    it("error path", async () => {
      vi.mocked(setLayerProperties).mockRejectedValueOnce(new Error("set failed"));
      const r = await call("pixelmator_set_layer_properties", {
        documentName: "D", layerName: "L",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_layer_order ────────────────────────────────────────────────

  describe("pixelmator_layer_order", () => {
    it("happy path front", async () => {
      const r = await call("pixelmator_layer_order", {
        documentName: "Doc", layerName: "Logo", action: "front",
      });
      expect(parsed(r)).toEqual({ reordered: "Logo", action: "front" });
    });

    it("happy path before with relativeTo", async () => {
      const r = await call("pixelmator_layer_order", {
        documentName: "Doc", layerName: "A", action: "before", relativeTo: "B",
      });
      expect(r.isError).toBeFalsy();
    });

    it("error path", async () => {
      vi.mocked(setLayerOrder).mockRejectedValueOnce(new Error("order failed"));
      const r = await call("pixelmator_layer_order", {
        documentName: "D", layerName: "L", action: "back",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_group_layers ───────────────────────────────────────────────

  describe("pixelmator_group_layers", () => {
    it("happy path", async () => {
      vi.mocked(groupLayers).mockResolvedValue({ groupName: "My Group" });
      const r = await call("pixelmator_group_layers", {
        documentName: "Doc", layerNames: ["A", "B"], groupName: "My Group",
      });
      expect(parsed(r).groupName).toBe("My Group");
    });

    it("error path", async () => {
      vi.mocked(groupLayers).mockRejectedValueOnce(new Error("group failed"));
      const r = await call("pixelmator_group_layers", {
        documentName: "D", layerNames: ["A"],
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_ungroup ────────────────────────────────────────────────────

  describe("pixelmator_ungroup", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_ungroup", {
        documentName: "Doc", layerName: "Group 1",
      });
      expect(parsed(r)).toEqual({ ungrouped: "Group 1" });
    });

    it("error path", async () => {
      vi.mocked(ungroupLayer).mockRejectedValueOnce(new Error("ungroup failed"));
      const r = await call("pixelmator_ungroup", {
        documentName: "D", layerName: "G",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_set_layer_text ─────────────────────────────────────────────

  describe("pixelmator_set_layer_text", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_set_layer_text", {
        documentName: "Doc", layerName: "Title", textContent: "Hello",
      });
      expect(parsed(r)).toEqual({ updated: "Title" });
    });

    it("passes optional styling props", async () => {
      await call("pixelmator_set_layer_text", {
        documentName: "Doc", layerName: "T",
        font: "Helvetica", fontSize: 24, color: [255, 255, 255],
        horizontalAlignment: "center", verticalAlignment: "top",
      });
      expect(setLayerText).toHaveBeenCalledWith(
        expect.objectContaining({ font: "Helvetica", horizontalAlignment: "center" }),
      );
    });

    it("error path", async () => {
      vi.mocked(setLayerText).mockRejectedValueOnce(new Error("text failed"));
      const r = await call("pixelmator_set_layer_text", {
        documentName: "D", layerName: "T",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_make_shape ─────────────────────────────────────────────────

  describe("pixelmator_make_shape", () => {
    it("happy path rectangle", async () => {
      vi.mocked(makeShape).mockResolvedValue({ layerName: "Rect 1" });
      const r = await call("pixelmator_make_shape", {
        documentName: "Doc", shapeKind: "rectangle",
      });
      expect(parsed(r).layerName).toBe("Rect 1");
    });

    it("passes all shape properties", async () => {
      await call("pixelmator_make_shape", {
        documentName: "Doc", shapeKind: "rounded rectangle",
        name: "MyShape", position: [10, 20], width: 200, height: 100,
        cornerRadius: 12, fillColor: [255, 0, 0], fillOpacity: 80,
        strokeColor: [0, 0, 0], strokeWidth: 2, opacity: 90,
      });
      expect(makeShape).toHaveBeenCalledWith(
        expect.objectContaining({ cornerRadius: 12, fillOpacity: 80 }),
      );
    });

    it("error path", async () => {
      vi.mocked(makeShape).mockRejectedValueOnce(new Error("shape failed"));
      const r = await call("pixelmator_make_shape", {
        documentName: "D", shapeKind: "ellipse",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_set_blend_mode ─────────────────────────────────────────────

  describe("pixelmator_set_blend_mode", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_set_blend_mode", {
        documentName: "Doc", layerName: "Logo", blendMode: "multiply",
      });
      expect(parsed(r)).toEqual({ layerName: "Logo", blendMode: "multiply" });
    });

    it("error path", async () => {
      vi.mocked(setBlendMode).mockRejectedValueOnce(new Error("blend failed"));
      const r = await call("pixelmator_set_blend_mode", {
        documentName: "D", layerName: "L", blendMode: "screen",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_set_layer_shadow ───────────────────────────────────────────

  describe("pixelmator_set_layer_shadow", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_set_layer_shadow", {
        documentName: "Doc", layerName: "Title",
        color: [0, 0, 0], blur: 8, distance: 4, angle: 45, opacity: 70,
      });
      expect(parsed(r)).toEqual({ updated: "Title" });
    });

    it("error path", async () => {
      vi.mocked(setLayerShadow).mockRejectedValueOnce(new Error("shadow failed"));
      const r = await call("pixelmator_set_layer_shadow", {
        documentName: "D", layerName: "L",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_set_layer_stroke ───────────────────────────────────────────

  describe("pixelmator_set_layer_stroke", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_set_layer_stroke", {
        documentName: "Doc", layerName: "Box",
        color: [255, 255, 255], width: 3, position: "outside", opacity: 100,
      });
      expect(parsed(r)).toEqual({ updated: "Box" });
    });

    it("error path", async () => {
      vi.mocked(setLayerStroke).mockRejectedValueOnce(new Error("stroke failed"));
      const r = await call("pixelmator_set_layer_stroke", {
        documentName: "D", layerName: "L",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_apply_effect ───────────────────────────────────────────────

  describe("pixelmator_apply_effect", () => {
    it("happy path with specific layer", async () => {
      const r = await call("pixelmator_apply_effect", {
        documentName: "Doc", effectClass: "gaussian blur",
        layerName: "BG", intensity: 10,
      });
      expect(parsed(r)).toEqual({ applied: "gaussian blur", layerName: "BG" });
    });

    it("happy path defaults to 'front layer' when no layerName", async () => {
      const r = await call("pixelmator_apply_effect", {
        documentName: "Doc", effectClass: "pixelate",
      });
      expect(parsed(r).layerName).toBe("front layer");
    });

    it("error path", async () => {
      vi.mocked(applyEffect).mockRejectedValueOnce(new Error("effect failed"));
      const r = await call("pixelmator_apply_effect", {
        documentName: "D", effectClass: "motion blur",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_apply_color_adjustment ─────────────────────────────────────

  describe("pixelmator_apply_color_adjustment", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_apply_color_adjustment", {
        documentName: "Doc",
        adjustments: [{ property: "exposure", value: -10 }],
        nonDestructive: false,
      });
      expect(parsed(r).adjusted).toContain("exposure");
    });

    it("error path", async () => {
      vi.mocked(applyColorAdjustments).mockRejectedValueOnce(new Error("adj failed"));
      const r = await call("pixelmator_apply_color_adjustment", {
        documentName: "D",
        adjustments: [{ property: "saturation", value: 20 }],
        nonDestructive: false,
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_apply_ml ───────────────────────────────────────────────────

  describe("pixelmator_apply_ml", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_apply_ml", {
        documentName: "Doc", algorithm: "enhance",
      });
      expect(parsed(r)).toEqual({ applied: "enhance", documentName: "Doc" });
    });

    it("passes all optional ML params", async () => {
      await call("pixelmator_apply_ml", {
        documentName: "D", algorithm: "super_resolution",
        targetWidth: 3840, targetHeight: 2160,
      });
      expect(applyMl).toHaveBeenCalledWith(
        expect.objectContaining({ targetWidth: 3840, targetHeight: 2160 }),
      );
    });

    it("error path", async () => {
      vi.mocked(applyMl).mockRejectedValueOnce(new Error("ml failed"));
      const r = await call("pixelmator_apply_ml", {
        documentName: "D", algorithm: "denoise",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_run_shortcut ───────────────────────────────────────────────

  describe("pixelmator_run_shortcut", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_run_shortcut", {
        shortcutName: "Optimize Image",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).exitCode).toBe(0);
    });

    it("passes input and output", async () => {
      await call("pixelmator_run_shortcut", {
        shortcutName: "Process", input: "/tmp/in.png", output: "/tmp/out.png",
      });
      expect(runShortcut).toHaveBeenCalledWith(
        expect.objectContaining({ input: "/tmp/in.png", output: "/tmp/out.png" }),
      );
    });

    it("error path", async () => {
      vi.mocked(runShortcut).mockRejectedValueOnce(new Error("shortcuts not found"));
      const r = await call("pixelmator_run_shortcut", {
        shortcutName: "Missing",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_detect ─────────────────────────────────────────────────────

  describe("pixelmator_detect", () => {
    it("happy path face", async () => {
      vi.mocked(detectInDocument).mockResolvedValue({ kind: "face", count: 1, faces: [{ bounds: { x: 0, y: 0, width: 100, height: 100 } }] });
      const r = await call("pixelmator_detect", {
        documentName: "Doc", kind: "face",
      });
      expect(parsed(r).kind).toBe("face");
    });

    it("happy path qr", async () => {
      vi.mocked(detectInDocument).mockResolvedValue({ kind: "qr", count: 1, codes: [{ bounds: { x: 0, y: 0, width: 64, height: 64 }, message: "https://example.com" }] });
      const r = await call("pixelmator_detect", {
        documentName: "Doc", kind: "qr",
      });
      expect(parsed(r).kind).toBe("qr");
    });

    it("error path", async () => {
      vi.mocked(detectInDocument).mockRejectedValueOnce(new Error("detect failed"));
      const r = await call("pixelmator_detect", {
        documentName: "D", kind: "face",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_replace_text ───────────────────────────────────────────────

  describe("pixelmator_replace_text", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_replace_text", {
        documentName: "Doc", findText: "OLD", replaceWith: "NEW",
      });
      expect(parsed(r).replaced).toBe(true);
    });

    it("passes matchWords and caseSensitive", async () => {
      await call("pixelmator_replace_text", {
        documentName: "D", findText: "foo", replaceWith: "bar",
        matchWords: true, caseSensitive: true,
      });
      expect(replaceText).toHaveBeenCalledWith(
        expect.objectContaining({ matchWords: true, caseSensitive: true }),
      );
    });

    it("error path", async () => {
      vi.mocked(replaceText).mockRejectedValueOnce(new Error("replace failed"));
      const r = await call("pixelmator_replace_text", {
        documentName: "D", findText: "x", replaceWith: "y",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_replace_layer ──────────────────────────────────────────────

  describe("pixelmator_replace_layer", () => {
    it("happy path", async () => {
      const r = await call("pixelmator_replace_layer", {
        documentName: "Doc", layerName: "Hero", newImagePath: "/tmp/new.png",
        scaleMode: "scale to fit",
      });
      expect(parsed(r)).toEqual({ replaced: "Hero", newImage: "/tmp/new.png" });
    });

    it("error path", async () => {
      vi.mocked(replaceLayerImage).mockRejectedValueOnce(new Error("replace failed"));
      const r = await call("pixelmator_replace_layer", {
        documentName: "D", layerName: "L", newImagePath: "/i.png",
        scaleMode: "stretch",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── pixelmator_batch_export_project_images_dryrun ─────────────────────────

  describe("pixelmator_batch_export_project_images_dryrun", () => {
    it("happy path — lists plan without calling openDocument", async () => {
      vi.mocked(readdir).mockResolvedValue(["photo.png", "banner.jpg", ".DS_Store"] as any);
      const r = await call("pixelmator_batch_export_project_images_dryrun", {
        project: "testproject", format: "JPEG",
      });
      expect(r.isError).toBeFalsy();
      const data = parsed(r);
      expect(data.count).toBe(2);
      expect(data.plan).toHaveLength(2);
      // Should NOT have called openDocument
      expect(openDocument).not.toHaveBeenCalled();
    });

    it("error path — access throws", async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error("dir missing"));
      const r = await call("pixelmator_batch_export_project_images_dryrun", {
        project: "testproject", format: "PNG",
      });
      expect(r.isError).toBe(true);
    });
  });
});
