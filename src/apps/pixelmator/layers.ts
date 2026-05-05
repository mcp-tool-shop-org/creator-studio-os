/**
 * Pixelmator Pro — layer authoring operations.
 *
 * All operations target an open document by name (returned from openDocument).
 * Document names do NOT include the file extension — Pixelmator strips it.
 *
 * Color pitfall: Pixelmator AppleScript setters expect 16-bit RGB {0..65535}.
 * All functions here accept 8-bit (0-255) and use colorToAS() internally.
 *
 * Layer selector: layers are addressed by name string.  Internally we wrap the
 * name in `layer named "..."` specifiers.  Duplicate names in the same document
 * address the topmost layer — caller's responsibility to use unique names.
 *
 * Reference: docs/research/2026-05-05-deepswarm/03-pixelmator-depth.md §2, §7
 */

import { runAppleScript, escapeAppleScriptString } from "../../runners/applescript.js";
import { loadConfig } from "../../config.js";
import { colorToAS, type BlendMode } from "./blendModes.js";

function tellDoc(docName: string, body: string): string {
  const cfg = loadConfig();
  const esc = escapeAppleScriptString(docName);
  return `tell application id "${cfg.pixelmatorBundleId}"
  tell document "${esc}"
${body}
  end tell
end tell`;
}

// ── Layer creation ────────────────────────────────────────────────────────────

export type LayerKind = "image" | "shape" | "text";

export interface MakeLayerOpts {
  documentName: string;
  kind: LayerKind;
  name?: string;
  /** Source image path — required when kind="image" */
  imagePath?: string;
  /** Initial position [x, y] in pixels from top-left */
  position?: [number, number];
  width?: number;
  height?: number;
  /** Text content — required when kind="text" */
  textContent?: string;
  /** Initial text font (PostScript name) */
  font?: string;
  /** Initial text size in points */
  fontSize?: number;
  /** Initial text color [r, g, b] as 8-bit */
  textColor?: [number, number, number];
}

export interface MakeLayerResult {
  layerName: string;
}

export async function makeLayer(opts: MakeLayerOpts): Promise<MakeLayerResult> {
  const {
    documentName, kind, name,
    imagePath, position, width, height,
    textContent, font, fontSize, textColor,
  } = opts;

  const posAS = position ? `position:{${position[0]}, ${position[1]}}` : null;
  const sizeW = width != null ? `width:${width}` : null;
  const sizeH = height != null ? `height:${height}` : null;

  const propParts: string[] = [];
  if (name) propParts.push(`name:"${escapeAppleScriptString(name)}"`);
  if (posAS) propParts.push(posAS);
  if (sizeW) propParts.push(sizeW);
  if (sizeH) propParts.push(sizeH);
  if (kind === "text" && textContent) {
    propParts.push(`text content:"${escapeAppleScriptString(textContent)}"`);
  }

  let layerClass: string;
  let extraLines = "";

  switch (kind) {
    case "image": {
      layerClass = "image layer";
      if (imagePath) {
        propParts.push(`file:POSIX file "${escapeAppleScriptString(imagePath)}"`);
      }
      break;
    }
    case "text": {
      layerClass = "text layer";
      if (font || fontSize || textColor) {
        const textSetters: string[] = [];
        if (font) textSetters.push(`      set its font to "${escapeAppleScriptString(font)}"`);
        if (fontSize != null) textSetters.push(`      set its size to ${fontSize}`);
        if (textColor) textSetters.push(`      set its color to ${colorToAS(...textColor)}`);
        extraLines += `    tell text content of newLayer\n${textSetters.join("\n")}\n    end tell\n`;
      }
      break;
    }
    case "shape":
    default: {
      layerClass = "shape layer";
      break;
    }
  }

  const propsStr = propParts.length > 0 ? ` with properties {${propParts.join(", ")}}` : "";
  const body = `    set newLayer to make new ${layerClass} at beginning of layers${propsStr}
${extraLines}    return name of newLayer`;

  const rawName = await runAppleScript(tellDoc(documentName, body), { timeoutMs: 30_000 });
  return { layerName: rawName.trim() };
}

// ── Shape creation ────────────────────────────────────────────────────────────

export type ShapeKind =
  | "rectangle"
  | "rounded rectangle"
  | "ellipse"
  | "line";

export interface MakeShapeOpts {
  documentName: string;
  shapeKind: ShapeKind;
  name?: string;
  position?: [number, number];
  width?: number;
  height?: number;
  /** Corner radius in pixels — rounded rectangle only */
  cornerRadius?: number;
  /** Fill color [r, g, b] as 8-bit (0–255) */
  fillColor?: [number, number, number];
  /** Fill opacity 0–100 */
  fillOpacity?: number;
  /** Stroke color [r, g, b] as 8-bit */
  strokeColor?: [number, number, number];
  strokeWidth?: number;
  /** Layer opacity 0–100 */
  opacity?: number;
}

export async function makeShape(opts: MakeShapeOpts): Promise<MakeLayerResult> {
  const { documentName, shapeKind, name, position, width, height, cornerRadius,
          fillColor, fillOpacity, strokeColor, strokeWidth, opacity } = opts;

  const propParts: string[] = [];
  if (name) propParts.push(`name:"${escapeAppleScriptString(name)}"`);
  if (position) propParts.push(`position:{${position[0]}, ${position[1]}}`);
  if (width != null) propParts.push(`width:${width}`);
  if (height != null) propParts.push(`height:${height}`);
  if (cornerRadius != null && shapeKind === "rounded rectangle") {
    propParts.push(`corner radius:${cornerRadius}`);
  }

  const propsStr = propParts.length > 0 ? ` with properties {${propParts.join(", ")}}` : "";

  const styleLines: string[] = [];
  if (fillColor) styleLines.push(`      set fill color of styles of newLayer to ${colorToAS(...fillColor)}`);
  if (fillOpacity != null) styleLines.push(`      set fill opacity of styles of newLayer to ${fillOpacity}`);
  if (strokeColor) styleLines.push(`      set stroke color of styles of newLayer to ${colorToAS(...strokeColor)}`);
  if (strokeWidth != null) styleLines.push(`      set stroke width of styles of newLayer to ${strokeWidth}`);
  if (opacity != null) styleLines.push(`    set opacity of newLayer to ${opacity}`);

  const body = `    set newLayer to make new ${shapeKind} at beginning of layers${propsStr}
${styleLines.join("\n")}
    return name of newLayer`;

  const rawName = await runAppleScript(tellDoc(documentName, body), { timeoutMs: 30_000 });
  return { layerName: rawName.trim() };
}

// ── Layer properties ──────────────────────────────────────────────────────────

export interface SetLayerPropertiesOpts {
  documentName: string;
  layerName: string;
  visible?: boolean;
  /** 0–100 */
  opacity?: number;
  blendMode?: BlendMode;
  position?: [number, number];
  width?: number;
  height?: number;
}

export async function setLayerProperties(opts: SetLayerPropertiesOpts): Promise<void> {
  const { documentName, layerName, visible, opacity, blendMode, position, width, height } = opts;
  const esc = escapeAppleScriptString(layerName);

  const setters: string[] = [];
  if (visible != null) setters.push(`    set visible of layer "${esc}" to ${visible}`);
  if (opacity != null) setters.push(`    set opacity of layer "${esc}" to ${opacity}`);
  if (blendMode) setters.push(`    set blend mode of layer "${esc}" to ${blendMode}`);
  if (position) setters.push(`    set position of layer "${esc}" to {${position[0]}, ${position[1]}}`);
  if (width != null) setters.push(`    set width of layer "${esc}" to ${width}`);
  if (height != null) setters.push(`    set height of layer "${esc}" to ${height}`);

  if (setters.length === 0) return; // nothing to do

  await runAppleScript(tellDoc(documentName, setters.join("\n")), { timeoutMs: 30_000 });
}

// ── Layer ordering ────────────────────────────────────────────────────────────

export type LayerOrderAction = "front" | "back" | "before" | "after";

export interface LayerOrderOpts {
  documentName: string;
  layerName: string;
  action: LayerOrderAction;
  /** Target layer name — required for "before" / "after" */
  relativeTo?: string;
}

export async function setLayerOrder(opts: LayerOrderOpts): Promise<void> {
  const { documentName, layerName, action, relativeTo } = opts;
  const esc = escapeAppleScriptString(layerName);
  let body: string;
  switch (action) {
    case "front": body = `    move layer "${esc}" to front of layers`; break;
    case "back":  body = `    move layer "${esc}" to back of layers`; break;
    case "before":
    case "after": {
      if (!relativeTo) throw new Error(`layerOrder action="${action}" requires relativeTo`);
      const escRel = escapeAppleScriptString(relativeTo);
      body = `    move layer "${esc}" to ${action} layer "${escRel}"`;
      break;
    }
  }
  await runAppleScript(tellDoc(documentName, body), { timeoutMs: 30_000 });
}

// ── Group / ungroup ───────────────────────────────────────────────────────────

export interface GroupLayersOpts {
  documentName: string;
  /** Layer names to move into the new group */
  layerNames: string[];
  groupName?: string;
}

export interface GroupLayersResult {
  groupName: string;
}

export async function groupLayers(opts: GroupLayersOpts): Promise<GroupLayersResult> {
  const { documentName, layerNames, groupName } = opts;
  const nameProp = groupName ? ` with properties {name:"${escapeAppleScriptString(groupName)}"}` : "";

  // Create the group, then move each layer into it.
  // The "move layer to front of groupVar" pattern is reliable for same-document layers.
  const moveLines = layerNames
    .map((n) => `    move layer "${escapeAppleScriptString(n)}" to front of newGroup`)
    .join("\n");

  const body = `    set newGroup to make new group layer${nameProp}
${moveLines}
    return name of newGroup`;

  const rawName = await runAppleScript(tellDoc(documentName, body), { timeoutMs: 30_000 });
  return { groupName: rawName.trim() };
}

export async function ungroupLayer(documentName: string, layerName: string): Promise<void> {
  const esc = escapeAppleScriptString(layerName);
  const body = `    ungroup layer "${esc}"`;
  await runAppleScript(tellDoc(documentName, body), { timeoutMs: 30_000 });
}

// ── Text layer editing ────────────────────────────────────────────────────────

export interface SetLayerTextOpts {
  documentName: string;
  layerName: string;
  /** Replace entire text content */
  textContent?: string;
  /** PostScript or display font name */
  font?: string;
  /** Point size */
  fontSize?: number;
  /** 8-bit RGB */
  color?: [number, number, number];
  /** horizontal: left | center | right | justify */
  horizontalAlignment?: "left" | "center" | "right" | "justify";
  /** vertical: top | center | bottom */
  verticalAlignment?: "top" | "center" | "bottom";
}

export async function setLayerText(opts: SetLayerTextOpts): Promise<void> {
  const { documentName, layerName, textContent, font, fontSize, color,
          horizontalAlignment, verticalAlignment } = opts;
  const esc = escapeAppleScriptString(layerName);

  const lines: string[] = [];
  if (textContent != null) {
    lines.push(`    set text content of layer "${esc}" to "${escapeAppleScriptString(textContent)}"`);
  }
  if (horizontalAlignment) {
    lines.push(`    set horizontal alignment of layer "${esc}" to ${horizontalAlignment}`);
  }
  if (verticalAlignment) {
    lines.push(`    set vertical alignment of layer "${esc}" to ${verticalAlignment}`);
  }

  const richTextSetters: string[] = [];
  if (font) richTextSetters.push(`      set its font to "${escapeAppleScriptString(font)}"`);
  if (fontSize != null) richTextSetters.push(`      set its size to ${fontSize}`);
  if (color) richTextSetters.push(`      set its color to ${colorToAS(...color)}`);

  if (richTextSetters.length > 0) {
    lines.push(`    tell text content of layer "${esc}"\n${richTextSetters.join("\n")}\n    end tell`);
  }

  if (lines.length === 0) return;
  await runAppleScript(tellDoc(documentName, lines.join("\n")), { timeoutMs: 30_000 });
}
