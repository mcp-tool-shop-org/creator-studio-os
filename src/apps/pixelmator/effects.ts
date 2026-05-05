/**
 * Pixelmator Pro — effects and color adjustment operations.
 *
 * Two dispatch tools:
 *  1. pixelmator_apply_effect — 23 effect classes from the Pixelmator Pro Effects Suite
 *  2. pixelmator_apply_color_adjustment — 24 color-adjustment properties
 *
 * Both operate on the front-most layer of the named document by default.
 * Use layerName to target a specific layer.
 *
 * Reference: docs/research/2026-05-05-deepswarm/03-pixelmator-depth.md §5, §9
 */
import { runAppleScript, escapeAppleScriptString } from "../../runners/applescript.js";
import { loadConfig } from "../../config.js";

// ── Effect classes (23 from Effects Suite) ────────────────────────────────────

export const EFFECT_CLASSES = [
  "gaussian blur",
  "box blur",
  "disc blur",
  "motion blur",
  "zoom blur",
  "spin blur",
  "tilt-shift blur",
  "focus blur",
  "bump distortion",
  "pinch distortion",
  "circle splash distortion",
  "hole distortion",
  "light tunnel distortion",
  "twirl distortion",
  "vortex distortion",
  "pixelate",
  "pointillize",
  "crystallize",
  "checkerboard",
  "stripes",
  "color fill",
  "image fill",
  "pattern fill",
] as const;

export type EffectClass = (typeof EFFECT_CLASSES)[number];

export interface ApplyEffectOpts {
  documentName: string;
  /** Name of the target layer; omit to apply to the front layer */
  layerName?: string;
  effectClass: EffectClass;
  /** Numeric intensity / radius parameter (meaning varies by effect) */
  intensity?: number;
  /** Additional name=value params passed as AppleScript properties record */
  params?: Record<string, number | string | boolean>;
}

export async function applyEffect(opts: ApplyEffectOpts): Promise<void> {
  const { documentName, layerName, effectClass, intensity, params } = opts;
  const cfg = loadConfig();
  const docEsc = escapeAppleScriptString(documentName);

  const propParts: string[] = [];
  if (intensity != null) propParts.push(`intensity:${intensity}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      const val = typeof v === "string" ? `"${escapeAppleScriptString(v)}"` : String(v);
      propParts.push(`${k}:${val}`);
    }
  }
  const propsStr = propParts.length > 0 ? ` with properties {${propParts.join(", ")}}` : "";

  let targetExpr: string;
  if (layerName) {
    const layerEsc = escapeAppleScriptString(layerName);
    targetExpr = `layer "${layerEsc}" of document "${docEsc}"`;
  } else {
    targetExpr = `current layer of document "${docEsc}"`;
  }

  const script = `tell application id "${cfg.pixelmatorBundleId}"
  make new ${effectClass}${propsStr} at end of effects of ${targetExpr}
end tell`;

  await runAppleScript(script, { timeoutMs: 60_000 });
}

// ── Color adjustments (24 properties) ────────────────────────────────────────

export const COLOR_ADJUSTMENT_PROPS = [
  "temperature",
  "tint",
  "hue",
  "saturation",
  "vibrance",
  "exposure",
  "highlights",
  "shadows",
  "brightness",
  "contrast",
  "black point",
  "texture",
  "clarity",
  "black and white",
  "sepia",
  "invert",
  "fade",
  "vignette",
  "vignette exposure",
  "vignette black point",
  "vignette softness",
  "grain",
  "grain size",
  "sharpen",
  "sharpen radius",
  "custom lut",
] as const;

export type ColorAdjustmentProp = (typeof COLOR_ADJUSTMENT_PROPS)[number];

export interface ColorAdjustmentEntry {
  property: ColorAdjustmentProp;
  /** Numeric value for numeric properties; file path for custom lut; true/false for booleans */
  value: number | string | boolean;
}

export interface ApplyColorAdjustmentsOpts {
  documentName: string;
  layerName?: string;
  adjustments: ColorAdjustmentEntry[];
  /**
   * When true, creates a non-destructive color adjustments layer instead of
   * setting properties on the target layer's own color adjustments slot.
   */
  nonDestructive?: boolean;
}

export async function applyColorAdjustments(opts: ApplyColorAdjustmentsOpts): Promise<void> {
  const { documentName, layerName, adjustments, nonDestructive } = opts;
  const cfg = loadConfig();
  const docEsc = escapeAppleScriptString(documentName);

  const setters = adjustments.map((adj) => {
    let valExpr: string;
    if (typeof adj.value === "boolean") {
      valExpr = String(adj.value);
    } else if (typeof adj.value === "string") {
      // custom lut — a file path
      valExpr = `POSIX file "${escapeAppleScriptString(adj.value)}"`;
    } else {
      valExpr = String(adj.value);
    }
    return `    set ${adj.property} of caTarget to ${valExpr}`;
  });

  let script: string;
  if (nonDestructive) {
    // Create a new color-adjustments layer on top
    const layerExpr = layerName
      ? `layer "${escapeAppleScriptString(layerName)}" of document "${docEsc}"`
      : `current layer of document "${docEsc}"`;
    script = `tell application id "${cfg.pixelmatorBundleId}"
  tell document "${docEsc}"
    set adjLayer to make new color adjustments layer at beginning of layers
    set caTarget to color adjustments of adjLayer
${setters.join("\n")}
  end tell
end tell`;
    void layerExpr; // not needed for non-destructive path
  } else {
    const layerExpr = layerName ? `layer "${escapeAppleScriptString(layerName)}"` : "current layer";
    script = `tell application id "${cfg.pixelmatorBundleId}"
  tell document "${docEsc}"
    set caTarget to color adjustments of ${layerExpr}
${setters.join("\n")}
  end tell
end tell`;
  }

  await runAppleScript(script, { timeoutMs: 60_000 });
}
