import {
  runAppleScript,
  escapeAppleScriptString,
} from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";

const EXPORT_FORMATS = [
  "PNG",
  "JPEG",
  "TIFF",
  "HEIC",
  "GIF",
  "JPEG2000",
  "BMP",
  "WebP",
  "SVG",
  "PDF",
] as const;
export type PixelmatorExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_FORMAT_LIST = EXPORT_FORMATS;

function tellApp(body: string): string {
  const cfg = loadConfig();
  return `tell application id "${cfg.pixelmatorBundleId}"\n${body}\nend tell`;
}

export async function openDocument(path: string): Promise<{ name: string }> {
  const escaped = escapeAppleScriptString(path);
  const script = tellApp(`  activate
  open POSIX file "${escaped}"
  delay 1.5
  return name of front document`);
  const name = await runAppleScript(script, { timeoutMs: 60_000 });
  return { name: name.trim() };
}

export async function closeDocument(name: string): Promise<void> {
  const escaped = escapeAppleScriptString(name);
  const script = tellApp(`  close document "${escaped}" saving no`);
  await runAppleScript(script);
}

export interface ExportOptions {
  documentName: string;
  outputPath: string;
  format: PixelmatorExportFormat;
}

export async function exportDocument(opts: ExportOptions): Promise<void> {
  const docName = escapeAppleScriptString(opts.documentName);
  const out = escapeAppleScriptString(opts.outputPath);
  const script = tellApp(`  tell document "${docName}" to export to (POSIX file "${out}") as ${opts.format}`);
  await runAppleScript(script, { timeoutMs: 60_000 });
}

export interface ResizeOptions {
  documentName: string;
  width?: number;
  height?: number;
  resolutionPpi?: number;
}

export async function resizeDocument(opts: ResizeOptions): Promise<void> {
  const docName = escapeAppleScriptString(opts.documentName);
  const parts: string[] = [];
  if (opts.width !== undefined) parts.push(`width ${opts.width}`);
  if (opts.height !== undefined) parts.push(`height ${opts.height}`);
  if (opts.resolutionPpi !== undefined)
    parts.push(`resolution ${opts.resolutionPpi}`);
  if (parts.length === 0) {
    throw new Error("resize requires at least one of: width, height, resolutionPpi");
  }
  const script = tellApp(`  tell document "${docName}" to resize image ${parts.join(" ")}`);
  await runAppleScript(script, { timeoutMs: 60_000 });
}

export interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropDocument(
  documentName: string,
  bounds: CropBounds,
  deleteMode = false,
): Promise<void> {
  const docName = escapeAppleScriptString(documentName);
  const dm = deleteMode ? " delete mode true" : "";
  const script = tellApp(
    `  tell document "${docName}" to crop bounds {${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height}}${dm}`,
  );
  await runAppleScript(script, { timeoutMs: 60_000 });
}

export type Rotation = "180" | "right" | "left";

export async function rotateDocument(
  documentName: string,
  direction: Rotation,
): Promise<void> {
  const docName = escapeAppleScriptString(documentName);
  const cmd =
    direction === "180"
      ? "rotate 180"
      : direction === "right"
        ? "rotate right"
        : "rotate left";
  const script = tellApp(`  tell document "${docName}" to ${cmd}`);
  await runAppleScript(script);
}

export type FlipAxis = "horizontal" | "vertical";

export async function flipDocument(
  documentName: string,
  axis: FlipAxis,
): Promise<void> {
  const docName = escapeAppleScriptString(documentName);
  const cmd =
    axis === "horizontal" ? "flip horizontally" : "flip vertically";
  const script = tellApp(`  tell document "${docName}" to ${cmd}`);
  await runAppleScript(script);
}

// ── HDR + advanced exports ────────────────────────────────────────────────────

/**
 * HDR export formats.
 * Pitfall: document must have `display hdr content true` set before export —
 * otherwise Pixelmator tone-maps to SDR silently.
 */
export const HDR_FORMATS = ["HDR JPEG", "HDR HEIC", "HDR AVIF", "HDR PNG"] as const;
export type HdrFormat = (typeof HDR_FORMATS)[number];

export interface HdrExportOpts {
  documentName: string;
  outputPath: string;
  format: HdrFormat;
  /** Compression quality 1–100 (JPEG/HEIC/AVIF) */
  compressionFactor?: number;
  /** Color profile name e.g. "Display P3" (default: keep document profile) */
  colorProfile?: string;
}

export async function exportHdr(opts: HdrExportOpts): Promise<void> {
  const { documentName, outputPath, format, compressionFactor, colorProfile } = opts;
  const docEsc = escapeAppleScriptString(documentName);
  const outEsc = escapeAppleScriptString(outputPath);

  const optParts: string[] = [];
  if (compressionFactor != null) optParts.push(`compression factor:${compressionFactor}`);
  if (colorProfile) optParts.push(`color profile:"${escapeAppleScriptString(colorProfile)}"`);
  const optsExpr = optParts.length > 0 ? ` with options {${optParts.join(", ")}}` : "";

  // Must enable HDR content on document first
  const script = tellApp(`  tell document "${docEsc}"
    set display hdr content to true
    export to (POSIX file "${outEsc}") as ${format}${optsExpr}
  end tell`);
  await runAppleScript(script, { timeoutMs: 120_000 });
}

/** Video export formats via Pixelmator Pro (for video layers / animated docs). */
export const VIDEO_FORMATS = ["MP4", "QuickTime Movie"] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export interface VideoExportOpts {
  documentName: string;
  outputPath: string;
  format: VideoFormat;
  /** Frame rate (frames per second) */
  frameRate?: number;
}

export async function exportVideo(opts: VideoExportOpts): Promise<void> {
  const { documentName, outputPath, format, frameRate } = opts;
  const docEsc = escapeAppleScriptString(documentName);
  const outEsc = escapeAppleScriptString(outputPath);
  const optsExpr = frameRate != null ? ` with options {frame rate:${frameRate}}` : "";
  const script = tellApp(
    `  tell document "${docEsc}" to export to (POSIX file "${outEsc}") as ${format}${optsExpr}`,
  );
  await runAppleScript(script, { timeoutMs: 120_000 });
}

/** Animated export formats. */
export const ANIMATED_FORMATS = ["Animated GIF", "Animated PNG"] as const;
export type AnimatedFormat = (typeof ANIMATED_FORMATS)[number];

export interface AnimatedExportOpts {
  documentName: string;
  outputPath: string;
  format: AnimatedFormat;
  frameRate?: number;
}

export async function exportAnimated(opts: AnimatedExportOpts): Promise<void> {
  const { documentName, outputPath, format, frameRate } = opts;
  const docEsc = escapeAppleScriptString(documentName);
  const outEsc = escapeAppleScriptString(outputPath);
  const optsExpr = frameRate != null ? ` with options {frame rate:${frameRate}}` : "";
  const script = tellApp(
    `  tell document "${docEsc}" to export to (POSIX file "${outEsc}") as ${format}${optsExpr}`,
  );
  await runAppleScript(script, { timeoutMs: 120_000 });
}

/** "Export for Web" — produces optimized PNG/JPEG/WebP/GIF/SVG. */
export const WEB_FORMATS = ["PNG", "JPEG", "WebP", "GIF", "SVG"] as const;
export type WebFormat = (typeof WEB_FORMATS)[number];

export interface WebExportOpts {
  documentName: string;
  outputPath: string;
  format: WebFormat;
  /** Quality 1–100 for JPEG/WebP */
  compressionFactor?: number;
  /** Integer scale factor (1, 2, 3…) */
  scale?: number;
  convertToSRGB?: boolean;
  keepTransparency?: boolean;
}

export async function exportForWeb(opts: WebExportOpts): Promise<void> {
  const { documentName, outputPath, format, compressionFactor, scale, convertToSRGB, keepTransparency } = opts;
  const docEsc = escapeAppleScriptString(documentName);
  const outEsc = escapeAppleScriptString(outputPath);

  const optParts: string[] = [];
  if (compressionFactor != null) optParts.push(`compression factor:${compressionFactor}`);
  if (scale != null) optParts.push(`scale:${scale}`);
  if (convertToSRGB != null) optParts.push(`convert to sRGB:${convertToSRGB}`);
  if (keepTransparency != null) optParts.push(`keep transparency:${keepTransparency}`);
  const optsExpr = optParts.length > 0 ? ` with options {${optParts.join(", ")}}` : "";

  const script = tellApp(
    `  tell document "${docEsc}" to export for web to (POSIX file "${outEsc}") as ${format}${optsExpr}`,
  );
  await runAppleScript(script, { timeoutMs: 120_000 });
}
