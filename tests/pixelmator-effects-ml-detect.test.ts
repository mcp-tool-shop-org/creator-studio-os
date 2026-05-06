/**
 * Pixelmator Pro — effects, ML, and detection unit tests.
 *
 * Mocks runAppleScript so no live Pixelmator is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EFFECT_CLASSES, COLOR_ADJUSTMENT_PROPS } from "@creator-studio-os/pixelmator";

// ── Enum completeness ─────────────────────────────────────────────────────────

describe("EFFECT_CLASSES", () => {
  it("has 23 entries", () => {
    expect(EFFECT_CLASSES).toHaveLength(23);
  });

  it("contains key effect names", () => {
    expect(EFFECT_CLASSES).toContain("gaussian blur");
    expect(EFFECT_CLASSES).toContain("motion blur");
    expect(EFFECT_CLASSES).toContain("pixelate");
    expect(EFFECT_CLASSES).toContain("color fill");
    expect(EFFECT_CLASSES).toContain("image fill");
  });
});

describe("COLOR_ADJUSTMENT_PROPS", () => {
  it("has at least 24 entries", () => {
    expect(COLOR_ADJUSTMENT_PROPS.length).toBeGreaterThanOrEqual(24);
  });

  it("contains key properties", () => {
    expect(COLOR_ADJUSTMENT_PROPS).toContain("temperature");
    expect(COLOR_ADJUSTMENT_PROPS).toContain("exposure");
    expect(COLOR_ADJUSTMENT_PROPS).toContain("saturation");
    expect(COLOR_ADJUSTMENT_PROPS).toContain("custom lut");
    expect(COLOR_ADJUSTMENT_PROPS).toContain("vignette");
    expect(COLOR_ADJUSTMENT_PROPS).toContain("sharpen");
  });
});

// ── AppleScript generation (mocked) ──────────────────────────────────────────

vi.mock("@creator-studio-os/core", () => ({
  runAppleScript: vi.fn().mockResolvedValue(""),
  escapeAppleScriptString: (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'),
  loadConfig: () => ({
    pixelmatorBundleId: "com.apple.pixelmator",
  }),
}));

import { runAppleScript } from "@creator-studio-os/core";
import { applyEffect, applyColorAdjustments, setBlendMode, setLayerShadow, setLayerStroke, detectInDocument, replaceText, replaceLayerImage, ML_ALGORITHMS } from "@creator-studio-os/pixelmator";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(runAppleScript).mockResolvedValue("");
});

// ── styles ────────────────────────────────────────────────────────────────────

describe("setBlendMode", () => {
  it("generates blend mode setter script", async () => {
    await setBlendMode("Doc", "Logo", "multiply");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("blend mode of layer");
    expect(script).toContain("multiply");
  });
});

describe("setLayerShadow", () => {
  it("generates shadow color and blur setters", async () => {
    await setLayerShadow({ documentName: "Doc", layerName: "Title", color: [0, 0, 0], blur: 8 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("shadow color of styles of layer");
    expect(script).toContain("shadow blur of styles of layer");
    expect(script).toContain("8");
  });

  it("does nothing when no properties supplied", async () => {
    await setLayerShadow({ documentName: "Doc", layerName: "L" });
    expect(runAppleScript).not.toHaveBeenCalled();
  });
});

describe("setLayerStroke", () => {
  it("generates stroke width and position setters", async () => {
    await setLayerStroke({ documentName: "Doc", layerName: "L", width: 2, position: "outside" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("stroke width of styles of layer");
    expect(script).toContain("stroke position of styles of layer");
    expect(script).toContain("outside");
  });
});

// ── effects ───────────────────────────────────────────────────────────────────

describe("applyEffect", () => {
  it("generates make new effect script", async () => {
    await applyEffect({ documentName: "Doc", effectClass: "gaussian blur", intensity: 5 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("make new gaussian blur");
    expect(script).toContain("intensity:5");
  });

  it("targets specific layer when layerName provided", async () => {
    await applyEffect({ documentName: "Doc", effectClass: "pixelate", layerName: "BG" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('layer "BG"');
  });

  it("targets current layer when no layerName", async () => {
    await applyEffect({ documentName: "Doc", effectClass: "pixelate" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("current layer");
  });
});

// ── color adjustments ─────────────────────────────────────────────────────────

describe("applyColorAdjustments", () => {
  it("generates property setters for each adjustment", async () => {
    await applyColorAdjustments({
      documentName: "Doc",
      adjustments: [{ property: "exposure", value: -15 }, { property: "saturation", value: 20 }],
    });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("set exposure of caTarget to -15");
    expect(script).toContain("set saturation of caTarget to 20");
  });

  it("uses POSIX file for custom lut property", async () => {
    await applyColorAdjustments({
      documentName: "Doc",
      adjustments: [{ property: "custom lut", value: "/path/to/look.cube" }],
    });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('POSIX file "/path/to/look.cube"');
  });

  it("creates adjustment layer when nonDestructive=true", async () => {
    await applyColorAdjustments({
      documentName: "Doc",
      adjustments: [{ property: "brightness", value: 10 }],
      nonDestructive: true,
    });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("make new color adjustments layer");
  });
});

// ── ML algorithms ─────────────────────────────────────────────────────────────

describe("ML_ALGORITHMS", () => {
  it("has expected algorithms", () => {
    expect(ML_ALGORITHMS).toContain("super_resolution");
    expect(ML_ALGORITHMS).toContain("enhance");
    expect(ML_ALGORITHMS).toContain("denoise");
    expect(ML_ALGORITHMS).toContain("remove_background");
    expect(ML_ALGORITHMS).toContain("match_colors");
  });
});

// ── detection ─────────────────────────────────────────────────────────────────

describe("detectInDocument — face", () => {
  it("returns empty result when AS returns empty list", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("[]");
    const result = await detectInDocument("Doc", "face");
    expect(result.kind).toBe("face");
    expect(result.count).toBe(0);
  });

  it("parses bounds from AppleScript bound-quad list", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("[{10,20,100,80},{200,300,50,60},]");
    const result = await detectInDocument("Doc", "face");
    expect(result.kind).toBe("face");
    if (result.kind === "face") {
      expect(result.count).toBe(2);
      expect(result.faces[0].bounds).toEqual({ x: 10, y: 20, width: 100, height: 80 });
    }
  });
});

describe("detectInDocument — qr", () => {
  it("returns qr with message", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("[{0,0,64,64|hello-world},]");
    const result = await detectInDocument("Doc", "qr");
    expect(result.kind).toBe("qr");
    if (result.kind === "qr") {
      expect(result.count).toBe(1);
      expect(result.codes[0].message).toBe("hello-world");
    }
  });
});

describe("replaceText", () => {
  it("generates replace text script", async () => {
    await replaceText({ documentName: "Doc", findText: "OLD", replaceWith: "NEW" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain('replace text "OLD"');
    expect(script).toContain('"NEW"');
  });
});

describe("replaceLayerImage", () => {
  it("generates replace image script with scale mode", async () => {
    await replaceLayerImage({ documentName: "Doc", layerName: "Hero", newImagePath: "/tmp/new.png", scaleMode: "scale to fill" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("replace image");
    expect(script).toContain('"Hero"');
    expect(script).toContain("scale to fill");
    expect(script).toContain("/tmp/new.png");
  });
});
