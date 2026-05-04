import { basename } from "node:path";
import {
  runAppleScript,
  escapeAppleScriptString,
} from "../../runners/applescript.js";
import { loadConfig } from "../../config.js";

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
  delay 0.3`);
  await runAppleScript(script, { timeoutMs: 60_000 });
  return { name: basename(path) };
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
