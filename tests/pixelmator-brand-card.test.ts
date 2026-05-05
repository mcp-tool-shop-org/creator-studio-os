/**
 * Pixelmator Pro — brand-card composer unit tests.
 *
 * Mocks document operations (open/close/resize/export) and detect operations
 * (replaceText/replaceLayerImage) so no live Pixelmator is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config.js", () => ({
  loadConfig: () => ({
    pixelmatorBundleId: "com.apple.pixelmator",
    dataDir: "/fake/datadir",
  }),
}));

// Mock fs/promises: access always resolves (files exist), mkdir is a no-op
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    access: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock document operations
vi.mock("../src/apps/pixelmator/document.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/apps/pixelmator/document.js")>();
  return {
    ...actual,
    openDocument: vi.fn().mockResolvedValue({ name: "card-template" }),
    closeDocument: vi.fn().mockResolvedValue(undefined),
    resizeDocument: vi.fn().mockResolvedValue(undefined),
    exportDocument: vi.fn().mockResolvedValue(undefined),
    exportHdr: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock detect operations used for text/image replacement
vi.mock("../src/apps/pixelmator/detect.js", () => ({
  replaceText: vi.fn().mockResolvedValue({ replaced: true }),
  replaceLayerImage: vi.fn().mockResolvedValue(undefined),
}));

import { composeBrandCard } from "../src/apps/pixelmator/brandCard.js";
import { openDocument, closeDocument, exportDocument, resizeDocument, exportHdr } from "../src/apps/pixelmator/document.js";
import { replaceText, replaceLayerImage } from "../src/apps/pixelmator/detect.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(openDocument).mockResolvedValue({ name: "card-template" });
  vi.mocked(closeDocument).mockResolvedValue(undefined);
  vi.mocked(resizeDocument).mockResolvedValue(undefined);
  vi.mocked(exportDocument).mockResolvedValue(undefined);
  vi.mocked(exportHdr).mockResolvedValue(undefined);
  vi.mocked(replaceText).mockResolvedValue({ replaced: true });
  vi.mocked(replaceLayerImage).mockResolvedValue(undefined);
});

describe("composeBrandCard", () => {
  it("opens the template, populates text slots, exports at each size", async () => {
    const result = await composeBrandCard({
      brand: { headline: "Creator Studio OS", subhead: "Compose Everything" },
      sizes: [
        { width: 1920, height: 1080, label: "1080p" },
        { width: 1024, height: 1024, label: "square" },
      ],
      outputDir: "/tmp/out",
      templatePath: "/fake/template.pxd",
    });

    expect(openDocument).toHaveBeenCalledWith("/fake/template.pxd");
    expect(replaceText).toHaveBeenCalledWith(expect.objectContaining({
      findText: "{{HEADLINE}}", replaceWith: "Creator Studio OS",
    }));
    expect(replaceText).toHaveBeenCalledWith(expect.objectContaining({
      findText: "{{SUBHEAD}}", replaceWith: "Compose Everything",
    }));
    expect(resizeDocument).toHaveBeenCalledTimes(2);
    expect(exportDocument).toHaveBeenCalledTimes(2);
    expect(closeDocument).toHaveBeenCalled();
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs[0].label).toBe("1080p");
    expect(result.outputs[1].label).toBe("square");
  });

  it("uses exportHdr when hdr=true", async () => {
    await composeBrandCard({
      brand: {},
      sizes: [{ width: 1920, height: 1080, label: "hdr" }],
      outputDir: "/tmp/out",
      templatePath: "/fake/t.pxd",
      hdr: true,
    });

    expect(exportHdr).toHaveBeenCalled();
    // standard export should NOT be called
    expect(exportDocument).not.toHaveBeenCalled();
  });

  it("replaces logo image layer when logoPath supplied", async () => {
    await composeBrandCard({
      brand: { logoPath: "/fake/logo.png" },
      sizes: [{ width: 400, height: 400 }],
      outputDir: "/tmp/out",
      templatePath: "/fake/t.pxd",
    });

    expect(replaceLayerImage).toHaveBeenCalledWith(expect.objectContaining({
      layerName: "{{LOGO}}",
      newImagePath: "/fake/logo.png",
    }));
  });

  it("closes the document even when export throws", async () => {
    vi.mocked(exportDocument).mockRejectedValueOnce(new Error("export failed"));

    await expect(composeBrandCard({
      brand: {},
      sizes: [{ width: 100, height: 100 }],
      outputDir: "/tmp/out",
      templatePath: "/fake/t.pxd",
    })).rejects.toThrow("export failed");

    expect(closeDocument).toHaveBeenCalled();
  });

  it("skips text replacement when no text fields supplied", async () => {
    await composeBrandCard({
      brand: {},
      sizes: [{ width: 100, height: 100 }],
      outputDir: "/tmp/out",
      templatePath: "/fake/t.pxd",
    });

    // replaceText should not be called when no headline/subhead/tagline
    expect(replaceText).not.toHaveBeenCalled();
  });

  it("returns output paths with correct width/height", async () => {
    const result = await composeBrandCard({
      brand: { headline: "Test" },
      sizes: [{ width: 2560, height: 1440, label: "2k" }],
      outputDir: "/tmp/cards",
      templatePath: "/fake/t.pxd",
      stem: "my-card",
    });

    expect(result.outputs[0].width).toBe(2560);
    expect(result.outputs[0].height).toBe(1440);
    expect(result.outputs[0].path).toContain("my-card");
    expect(result.outputs[0].path).toContain("2k");
    expect(result.outputs[0].path).toContain("/tmp/cards");
  });
});
