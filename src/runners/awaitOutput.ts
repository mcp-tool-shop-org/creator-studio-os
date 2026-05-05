/**
 * awaitOutputFile — polls a directory for a file whose stem matches pathStem.
 *
 * Motivation (from v1.6 smoke): Compressor replaces the caller-supplied extension
 * with the codec's native container format (HEVC 8-bit → .mp4, ProRes → .mov, etc.).
 * Output-file mtime is more authoritative than monitor frame count, especially on
 * Apple Silicon hardware encoders that complete sub-second leaving 0 monitor frames.
 *
 * Usage:
 *   const outPath = await awaitOutputFile({
 *     pathStem: "black-30s-hevc",
 *     dir: outDir,
 *     timeoutSec: 120,
 *     settledMs: 300,
 *   });
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export interface AwaitOutputOpts {
  /** Filename without extension — the stem to match */
  pathStem: string;
  /** Directory to search */
  dir: string;
  /** Hard timeout in seconds (default: 120) */
  timeoutSec?: number;
  /** Once a candidate file is found, wait this many ms for size to stabilise.
   *  Prevents returning a partially-written file. Default: 300 ms.
   *  Set to 0 to disable stability check (single-poll confirmation). */
  settledMs?: number;
  /** Poll interval in milliseconds (default: 500) */
  pollMs?: number;
}

export interface AwaitOutputResult {
  /** Absolute path to the matched file */
  path: string;
  /** File size in bytes at the time the stability check passed */
  sizeBytes: number;
}

/**
 * Poll `dir` for a file whose name starts with `pathStem + "."`.
 *
 * Returns when such a file exists with size > 0 and the size has been stable
 * for `settledMs`. Throws if the deadline is reached first.
 */
export async function awaitOutputFile(opts: AwaitOutputOpts): Promise<AwaitOutputResult> {
  const {
    pathStem,
    dir,
    timeoutSec = 120,
    settledMs = 300,
    pollMs = 500,
  } = opts;

  const prefix = pathStem + ".";
  const deadline = Date.now() + timeoutSec * 1000;

  let candidate = "";
  let candidateSize = 0;
  let candidateStableAt = 0;

  while (Date.now() < deadline) {
    const files = await readdir(dir).catch(() => [] as string[]);
    const match = files.find((f) => f.startsWith(prefix));

    if (match) {
      const fullPath = join(dir, match);
      const s = await stat(fullPath).catch(() => null);
      if (s && s.size > 0) {
        if (settledMs === 0) {
          return { path: fullPath, sizeBytes: s.size };
        }

        if (candidate !== fullPath || s.size !== candidateSize) {
          // File changed or new candidate — reset the stability clock
          candidate = fullPath;
          candidateSize = s.size;
          candidateStableAt = Date.now() + settledMs;
        } else if (Date.now() >= candidateStableAt) {
          // Size has been stable for settledMs — we're done
          return { path: fullPath, sizeBytes: s.size };
        }
      }
    } else {
      // No file found yet — reset candidate tracking
      candidate = "";
      candidateSize = 0;
      candidateStableAt = 0;
    }

    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error(
    `awaitOutputFile: timed out after ${timeoutSec}s waiting for "${prefix}*" in ${dir}`,
  );
}
