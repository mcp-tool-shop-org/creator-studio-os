/**
 * Pixelmator Pro — detection and replacement operations.
 *
 * Detection:
 *  - detect face   → FaceFeatureInformation (bounds, position, size)
 *  - detect QR     → QrFeatureInformation (bounds, position, size, message)
 *
 * Replacement:
 *  - replace text in all text layers (sdef `replace` command)
 *  - replace image layer content while preserving styles (sdef `replace image`)
 *
 * Reference: docs/research/2026-05-05-deepswarm/03-pixelmator-depth.md §3, §4
 *
 * Pitfalls:
 *  - detect face returns "missing value" (not []) when no faces found
 *  - replace text is silent on no-match (returns no count)
 */
import { runAppleScript, escapeAppleScriptString } from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";

function tellDoc(docName: string, body: string): string {
  const cfg = loadConfig();
  const esc = escapeAppleScriptString(docName);
  return `tell application id "${cfg.pixelmatorBundleId}"
  tell document "${esc}"
${body}
  end tell
end tell`;
}

// ── Detection ─────────────────────────────────────────────────────────────────

export interface BoundingBox { x: number; y: number; width: number; height: number; }

export interface FaceDetectionResult {
  kind: "face";
  count: number;
  faces: Array<{ bounds: BoundingBox }>;
}

export interface QrDetectionResult {
  kind: "qr";
  count: number;
  codes: Array<{ bounds: BoundingBox; message: string }>;
}

export type DetectionResult = FaceDetectionResult | QrDetectionResult;

export async function detectInDocument(
  documentName: string,
  kind: "face" | "qr",
): Promise<DetectionResult> {
  if (kind === "face") {
    // Returns list of {bounds, position, size} records or "missing value"
    const script = tellDoc(documentName, `    set faceResult to detect face
    if faceResult is missing value then
      return "[]"
    end if
    -- encode as simple list of bound-quads
    set out to "["
    repeat with f in faceResult
      set b to bounds of f
      set out to out & "{"
      set out to out & (item 1 of b as text) & "," & (item 2 of b as text) & ","
      set out to out & (item 3 of b as text) & "," & (item 4 of b as text)
      set out to out & "},"
    end repeat
    return out & "]"`);
    const raw = await runAppleScript(script, { timeoutMs: 30_000 });
    const bounds = parseAppleScriptBoundsList(raw);
    return {
      kind: "face",
      count: bounds.length,
      faces: bounds.map((b) => ({ bounds: b })),
    };
  } else {
    // detect QR — returns list with message field
    const script = tellDoc(documentName, `    set qrResult to detect QR code
    if qrResult is missing value then
      return "[]"
    end if
    set out to "["
    repeat with q in qrResult
      set b to bounds of q
      set msg to message of q
      set out to out & "{"
      set out to out & (item 1 of b as text) & "," & (item 2 of b as text) & ","
      set out to out & (item 3 of b as text) & "," & (item 4 of b as text)
      set out to out & "|" & msg & "},"
    end repeat
    return out & "]"`);
    const raw = await runAppleScript(script, { timeoutMs: 30_000 });
    const codes = parseQrList(raw);
    return { kind: "qr", count: codes.length, codes };
  }
}

/** Parse "[ {x,y,w,h},{x,y,w,h}, ]" into BoundingBox array. */
function parseAppleScriptBoundsList(raw: string): BoundingBox[] {
  const matches = raw.matchAll(/\{([\d,\s]+)\}/g);
  const result: BoundingBox[] = [];
  for (const m of matches) {
    const parts = m[1].split(",").map((s) => parseInt(s.trim(), 10));
    if (parts.length >= 4) {
      result.push({ x: parts[0], y: parts[1], width: parts[2], height: parts[3] });
    }
  }
  return result;
}

/** Parse QR list "[ {x,y,w,h|message}, ]" format. */
function parseQrList(raw: string): Array<{ bounds: BoundingBox; message: string }> {
  const matches = raw.matchAll(/\{([\d,\s]+)\|([^}]*)\}/g);
  const result: Array<{ bounds: BoundingBox; message: string }> = [];
  for (const m of matches) {
    const parts = m[1].split(",").map((s) => parseInt(s.trim(), 10));
    if (parts.length >= 4) {
      result.push({
        bounds: { x: parts[0], y: parts[1], width: parts[2], height: parts[3] },
        message: m[2].trim(),
      });
    }
  }
  return result;
}

// ── Text replacement ──────────────────────────────────────────────────────────

export interface ReplaceTextOpts {
  documentName: string;
  findText: string;
  replaceWith: string;
  matchWords?: boolean;
  caseSensitive?: boolean;
}

export async function replaceText(opts: ReplaceTextOpts): Promise<{ replaced: boolean }> {
  const { documentName, findText, replaceWith, matchWords, caseSensitive } = opts;
  const findEsc = escapeAppleScriptString(findText);
  const replEsc = escapeAppleScriptString(replaceWith);
  const mw = matchWords != null ? `, match words:${matchWords}` : "";
  const cs = caseSensitive != null ? `, case sensitive:${caseSensitive}` : "";
  const body = `    replace text "${findEsc}" with "${replEsc}" with properties {${mw}${cs}}`;
  await runAppleScript(tellDoc(documentName, body), { timeoutMs: 30_000 });
  // Pixelmator returns no count — assume replaced if no error thrown
  return { replaced: true };
}

// ── Image layer replacement ───────────────────────────────────────────────────

export type ScaleMode = "original" | "stretch" | "scale to fill" | "scale to fit";

export interface ReplaceLayerImageOpts {
  documentName: string;
  layerName: string;
  newImagePath: string;
  scaleMode?: ScaleMode;
}

export async function replaceLayerImage(opts: ReplaceLayerImageOpts): Promise<void> {
  const { documentName, layerName, newImagePath, scaleMode } = opts;
  const layerEsc = escapeAppleScriptString(layerName);
  const pathEsc = escapeAppleScriptString(newImagePath);
  const scaleExpr = scaleMode ? ` scale mode ${scaleMode}` : "";
  const body = `    replace image (layer "${layerEsc}") with POSIX file "${pathEsc}"${scaleExpr}`;
  await runAppleScript(tellDoc(documentName, body), { timeoutMs: 60_000 });
}
