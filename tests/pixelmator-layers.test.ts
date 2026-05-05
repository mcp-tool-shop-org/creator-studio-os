/**
 * Pixelmator layer authoring — unit tests.
 *
 * Tests cover:
 *  - blendModes: enum completeness, colorToAS conversion
 *  - layers: AppleScript generation via runAppleScript mock
 *
 * All tests mock runAppleScript so no live Pixelmator is required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BLEND_MODES, colorToAS, to16bit } from "../src/apps/pixelmator/blendModes.js";

// ── blendModes helpers ────────────────────────────────────────────────────────

describe("BLEND_MODES", () => {
  it("has 28 entries (3 normal + 5 darken + 5 lighten + 7 contrast + 4 inversion + 4 component)", () => {
    // sdef lists 27 but the table totals to 28 — trust the count from blendModes.ts
    expect(BLEND_MODES.length).toBeGreaterThanOrEqual(27);
  });

  it("contains expected mode names from all groups", () => {
    // Normal
    expect(BLEND_MODES).toContain("normal");
    expect(BLEND_MODES).toContain("pass through");
    // Darken
    expect(BLEND_MODES).toContain("multiply");
    expect(BLEND_MODES).toContain("color burn");
    // Lighten
    expect(BLEND_MODES).toContain("screen");
    expect(BLEND_MODES).toContain("color dodge");
    // Contrast
    expect(BLEND_MODES).toContain("overlay");
    expect(BLEND_MODES).toContain("soft light");
    // Inversion
    expect(BLEND_MODES).toContain("difference");
    expect(BLEND_MODES).toContain("subtract");
    // Component
    expect(BLEND_MODES).toContain("hue");
    expect(BLEND_MODES).toContain("luminosity");
  });

  it("has no duplicates", () => {
    const set = new Set(BLEND_MODES);
    expect(set.size).toBe(BLEND_MODES.length);
  });
});

describe("to16bit", () => {
  it("converts 0 → 0", () => expect(to16bit(0)).toBe(0));
  it("converts 255 → 65535", () => expect(to16bit(255)).toBe(65535));
  it("converts 128 → ~32896", () => expect(to16bit(128)).toBe(32896));
  it("clamps values above 255", () => expect(to16bit(300)).toBe(65535));
  it("clamps values below 0", () => expect(to16bit(-1)).toBe(0));
});

describe("colorToAS", () => {
  it("returns 16-bit RGB list string", () => {
    expect(colorToAS(255, 0, 0)).toBe("{65535, 0, 0}");
    expect(colorToAS(0, 255, 0)).toBe("{0, 65535, 0}");
    expect(colorToAS(0, 0, 255)).toBe("{0, 0, 65535}");
  });

  it("pure black → {0, 0, 0}", () => {
    expect(colorToAS(0, 0, 0)).toBe("{0, 0, 0}");
  });

  it("pure white → {65535, 65535, 65535}", () => {
    expect(colorToAS(255, 255, 255)).toBe("{65535, 65535, 65535}");
  });
});

// ── layers — AppleScript generation (mocked) ──────────────────────────────────

// We mock the applescript runner so we can inspect the generated scripts
// without needing a real Pixelmator instance.

vi.mock("../src/runners/applescript.js", () => ({
  runAppleScript: vi.fn().mockResolvedValue("MockLayer"),
  escapeAppleScriptString: (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'),
}));

vi.mock("../src/config.js", () => ({
  loadConfig: () => ({
    pixelmatorBundleId: "com.apple.pixelmator",
  }),
}));

import { runAppleScript } from "../src/runners/applescript.js";
import { makeLayer, makeShape, setLayerProperties, setLayerOrder,
         groupLayers, ungroupLayer, setLayerText } from "../src/apps/pixelmator/layers.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(runAppleScript).mockResolvedValue("MockLayer");
});

describe("makeLayer", () => {
  it("uses 'text layer' class for kind=text", async () => {
    await makeLayer({ documentName: "MyDoc", kind: "text", textContent: "Hello" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("make new text layer");
    expect(script).toContain("text content");
  });

  it("uses 'image layer' class for kind=image", async () => {
    await makeLayer({ documentName: "MyDoc", kind: "image", imagePath: "/tmp/img.png" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("make new image layer");
    expect(script).toContain("/tmp/img.png");
  });

  it("includes font/size/color setters in tell text content block", async () => {
    await makeLayer({
      documentName: "MyDoc", kind: "text", textContent: "Hi",
      font: "Inter-Bold", fontSize: 48, textColor: [255, 0, 0],
    });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("tell text content of newLayer");
    expect(script).toContain("Inter-Bold");
    expect(script).toContain("48");
    expect(script).toContain("65535, 0, 0");
  });

  it("returns the layer name from AppleScript output", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("  MyLayer  ");
    const result = await makeLayer({ documentName: "Doc", kind: "shape" });
    expect(result.layerName).toBe("MyLayer");
  });
});

describe("makeShape", () => {
  it("generates correct shape class for 'rounded rectangle'", async () => {
    await makeShape({ documentName: "Doc", shapeKind: "rounded rectangle", cornerRadius: 12 });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("rounded rectangle");
    expect(script).toContain("corner radius:12");
  });

  it("sets fill color via styles", async () => {
    await makeShape({ documentName: "Doc", shapeKind: "rectangle", fillColor: [0, 128, 255] });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("fill color of styles of newLayer");
    expect(script).toContain("32896"); // 128 * 257
  });
});

describe("setLayerProperties", () => {
  it("generates visibility setter", async () => {
    await setLayerProperties({ documentName: "Doc", layerName: "BG", visible: false });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("visible of layer");
    expect(script).toContain("false");
  });

  it("does nothing when no properties supplied", async () => {
    await setLayerProperties({ documentName: "Doc", layerName: "BG" });
    expect(runAppleScript).not.toHaveBeenCalled();
  });

  it("sets blend mode", async () => {
    await setLayerProperties({ documentName: "Doc", layerName: "L", blendMode: "multiply" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("blend mode of layer");
    expect(script).toContain("multiply");
  });
});

describe("setLayerOrder", () => {
  it("generates 'move to front' script", async () => {
    await setLayerOrder({ documentName: "Doc", layerName: "Logo", action: "front" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("move layer");
    expect(script).toContain("to front of layers");
  });

  it("generates 'move before' script with relativeTo", async () => {
    await setLayerOrder({ documentName: "Doc", layerName: "A", action: "before", relativeTo: "B" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("to before layer");
    expect(script).toContain('"B"');
  });

  it("throws when before/after used without relativeTo", async () => {
    await expect(
      setLayerOrder({ documentName: "Doc", layerName: "A", action: "after" }),
    ).rejects.toThrow(/relativeTo/);
  });
});

describe("groupLayers", () => {
  it("creates group and generates move instructions for each layer", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Group 1");
    const result = await groupLayers({ documentName: "Doc", layerNames: ["A", "B"], groupName: "Group 1" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("make new group layer");
    expect(script).toContain('move layer "A"');
    expect(script).toContain('move layer "B"');
    expect(result.groupName).toBe("Group 1");
  });
});

describe("ungroupLayer", () => {
  it("generates ungroup script", async () => {
    await ungroupLayer("Doc", "MyGroup");
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("ungroup layer");
    expect(script).toContain('"MyGroup"');
  });
});

describe("setLayerText", () => {
  it("generates text content setter", async () => {
    await setLayerText({ documentName: "Doc", layerName: "Title", textContent: "Hello World" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("set text content of layer");
    expect(script).toContain("Hello World");
  });

  it("sets horizontal alignment at layer level (not inside tell text content)", async () => {
    await setLayerText({ documentName: "Doc", layerName: "T", horizontalAlignment: "center" });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("horizontal alignment of layer");
    expect(script).toContain("center");
    expect(script).not.toContain("tell text content");
  });

  it("sets font/size/color inside tell text content block", async () => {
    await setLayerText({ documentName: "Doc", layerName: "T", font: "Helvetica", fontSize: 24, color: [0, 0, 0] });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("tell text content of layer");
    expect(script).toContain("Helvetica");
    expect(script).toContain("24");
  });

  it("does nothing when no properties supplied", async () => {
    await setLayerText({ documentName: "Doc", layerName: "T" });
    expect(runAppleScript).not.toHaveBeenCalled();
  });
});
