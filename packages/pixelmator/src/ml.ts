/**
 * Pixelmator Pro — ML operations and Shortcuts.app bridge.
 *
 * ML operations are thin wrappers around sdef commands + the resize verb's
 * `algorithm ml super resolution` parameter.
 *
 * The Shortcuts bridge shells out to `shortcuts run` — the user must have the
 * named shortcut installed in their Shortcuts library. csos ships a curated set
 * of `.shortcut` bundles in presets/shortcuts/ (future).
 *
 * Reference: docs/research/2026-05-05-deepswarm/03-pixelmator-depth.md §5, §6
 */
import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
import { runAppleScript, escapeAppleScriptString } from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";

const execFile = promisify(_execFile);

// ── ML algorithms ─────────────────────────────────────────────────────────────

export const ML_ALGORITHMS = [
  "super_resolution",   // dedicated verb (fixed 3× upscale) OR resize algorithm
  "enhance",
  "denoise",
  "deband",
  "match_colors",
  "remove_background",
  "select_subject",
  "auto_white_balance",
  "auto_light",
  "auto_color_balance",
  "auto_hue_and_saturation",
] as const;

export type MlAlgorithm = (typeof ML_ALGORITHMS)[number];

export interface ApplyMlOpts {
  documentName: string;
  algorithm: MlAlgorithm;
  /** Denoise intensity 0–100 (denoise only) */
  denoiseIntensity?: number;
  /** Reference image path for match_colors */
  matchColorsReference?: string;
  /** Smart refine for select_subject */
  smartRefine?: boolean;
  /** Target width/height for super_resolution via resize verb (optional — omit for fixed 3×) */
  targetWidth?: number;
  targetHeight?: number;
}

export async function applyMl(opts: ApplyMlOpts): Promise<void> {
  const { documentName, algorithm, denoiseIntensity, matchColorsReference, smartRefine,
          targetWidth, targetHeight } = opts;
  const cfg = loadConfig();
  const docEsc = escapeAppleScriptString(documentName);

  let cmd: string;
  switch (algorithm) {
    case "super_resolution":
      if (targetWidth != null || targetHeight != null) {
        // Use resize verb with ML algorithm for exact dimensions
        const wPart = targetWidth != null ? ` width ${targetWidth}` : "";
        const hPart = targetHeight != null ? ` height ${targetHeight}` : "";
        cmd = `resize image${wPart}${hPart} algorithm ml super resolution`;
      } else {
        cmd = "super resolution";
      }
      break;
    case "enhance":
      cmd = "enhance";
      break;
    case "denoise":
      cmd = denoiseIntensity != null ? `denoise intensity ${denoiseIntensity}` : "denoise";
      break;
    case "deband":
      cmd = "deband";
      break;
    case "match_colors":
      if (!matchColorsReference) throw new Error("match_colors requires matchColorsReference path");
      cmd = `match colors to POSIX file "${escapeAppleScriptString(matchColorsReference)}"`;
      break;
    case "remove_background":
      cmd = "remove background";
      break;
    case "select_subject":
      cmd = `select subject smart refine ${smartRefine !== false}`;
      break;
    case "auto_white_balance":
      cmd = "auto white balance";
      break;
    case "auto_light":
      cmd = "auto light";
      break;
    case "auto_color_balance":
      cmd = "auto color balance";
      break;
    case "auto_hue_and_saturation":
      cmd = "auto hue and saturation";
      break;
  }

  const script = `tell application id "${cfg.pixelmatorBundleId}"
  tell document "${docEsc}"
    ${cmd}
  end tell
end tell`;

  await runAppleScript(script, { timeoutMs: 120_000 });
}

// ── Shortcuts.app bridge ──────────────────────────────────────────────────────

export interface RunShortcutOpts {
  /** Name of the installed Shortcuts action (user's library) */
  shortcutName: string;
  /** Input file(s) — POSIX absolute path(s) */
  input?: string | string[];
  /** Output file POSIX path */
  output?: string;
}

export interface RunShortcutResult {
  shortcutName: string;
  exitCode: number;
  stderr: string;
}

export async function runShortcut(opts: RunShortcutOpts): Promise<RunShortcutResult> {
  const { shortcutName, input, output } = opts;
  const args: string[] = ["run", shortcutName];

  const inputs = input ? (Array.isArray(input) ? input : [input]) : [];
  for (const i of inputs) args.push("-i", i);
  if (output) args.push("-o", output);

  try {
    await execFile("shortcuts", args, { timeout: 120_000 });
    return { shortcutName, exitCode: 0, stderr: "" };
  } catch (e: unknown) {
    // `shortcuts run` exits non-zero on error but also on "shortcut not found"
    const code = (e as { code?: number }).code ?? 1;
    const stderr = (e as { stderr?: string }).stderr ?? String(e);
    // Re-throw only for system errors (not found = code 127)
    if (code === 127) {
      throw new Error(`shortcuts CLI not found — requires macOS 12+`);
    }
    // Return partial result with stderr so the caller can log/diagnose
    return { shortcutName, exitCode: code, stderr: stderr.slice(0, 500) };
  }
}
