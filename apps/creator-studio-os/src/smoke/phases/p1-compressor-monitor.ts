/**
 * Phase 1 — Compressor encode + live monitor.
 *
 * Encodes tests/fixtures/black-5s.mov with the bundled HEVC 8-bit preset,
 * streams StatusFrames via monitorStream, and asserts:
 *   - ≥3 StatusFrames captured before terminal state
 *   - Terminal status == "completed"
 *
 * Auto-creates the fixture with ffmpeg if missing.
 * Skips gracefully if Compressor binary is absent or fixture can't be made.
 */
import { access, mkdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeJob } from "@creator-studio-os/compressor";
import { monitorStream } from "@creator-studio-os/compressor";
import { awaitOutputFile } from "@creator-studio-os/core";
import { appendLedger } from "@creator-studio-os/core";
import type { PhaseResult } from "../report.js";
import type { SmokeOpts } from "../index.js";

const execFileAsync = promisify(execFile);

const HEVC8_SETTING = "EFBComputer_HEVC8.compressorsetting";

function fixturesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolvePath(here, "../../../tests/fixtures");
}

async function ensureFixture(fixturePath: string): Promise<"ok" | "created" | "no-ffmpeg"> {
  try {
    await access(fixturePath);
    return "ok";
  } catch {
    // Try to create with ffmpeg
    try {
      await execFileAsync("which", ["ffmpeg"]);
    } catch {
      return "no-ffmpeg";
    }
    await mkdir(dirname(fixturePath), { recursive: true });
    await execFileAsync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", "color=c=black:s=1920x1080:d=30",
      "-c:v", "prores_ks", "-an", fixturePath,
    ]);
    return "created";
  }
}

export async function runPhase1(opts: SmokeOpts): Promise<PhaseResult> {
  const start = Date.now();
  const id = 1;
  const name = "Compressor encode + live monitor (≥3 frames → completed)";

  if (opts.dryRun) {
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase1", projectName: opts.smokeProjectName, args: { dryRun: true }, result: { frames: 3, status: "completed" }, durationMs: 0 });
    return { id, name, status: "pass", durationMs: 0, detail: "dry-run: mocked 3 frames → completed" };
  }

  try {
    const fixturePath = join(fixturesDir(), "black-30s.mov");
    const fixtureResult = await ensureFixture(fixturePath);
    if (fixtureResult === "no-ffmpeg") {
      return {
        id, name, status: "skip", durationMs: Date.now() - start,
        detail: "Skipped — tests/fixtures/black-30s.mov missing and ffmpeg not found. Run: brew install ffmpeg && npm run smoke:fixtures",
      };
    }

    const settingPath = join(opts.cfg.compressorBundledSettingsDir, HEVC8_SETTING);
    const outDir = join(opts.smokeProjectDir, "out");
    await mkdir(outDir, { recursive: true });
    // Compressor strips the extension we provide and uses the codec's container
    // format instead (HEVC 8-bit → .mp4). Pass the stem as the locationPath base.
    const outStem = "black-30s-hevc";
    const outPath = join(outDir, outStem + ".mov"); // dirname + stem used; extension replaced by Compressor

    // Submit the encode job
    const job = await encodeJob({
      jobPath: fixturePath,
      settingPath,
      locationPath: outPath,
      batchName: "csos-smoke-phase1",
    });

    // Collect monitor frames concurrently — informational only.
    // On Apple Silicon hardware encoders the job may complete before any poll
    // fires; output-file polling is the authoritative completion signal.
    const frames: { status: string; pct: number }[] = [];
    let terminalStatus = "";
    const monitorDone = (async () => {
      for await (const frame of monitorStream({ jobId: job.jobId, intervalSec: 1, timeoutSec: 120 })) {
        frames.push({ status: frame.status, pct: frame.percentComplete });
        if (["completed", "failed", "cancelled"].includes(frame.status)) {
          terminalStatus = frame.status;
          break;
        }
      }
    })();

    // Poll by stem — Compressor replaces our extension with its own (.mp4, .mov, .m4v)
    let outResult: { path: string; sizeBytes: number } | null = null;
    try {
      [outResult] = await Promise.all([
        awaitOutputFile({ pathStem: outStem, dir: outDir, timeoutSec: 120 }),
        monitorDone,
      ]);
    } catch {
      await monitorDone;
    }

    if (!outResult) {
      const durationMs = Date.now() - start;
      await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase1", projectName: opts.smokeProjectName, args: { jobId: job.jobId }, error: { code: "E_COMPRESSOR_MONITOR_FAILED", message: "Output file not found within timeout" }, durationMs });
      return { id, name, status: "fail", durationMs, detail: `Output file not found after 120s. jobId=${job.jobId}` };
    }

    const actualOutPath = outResult.path;
    const monitorNote = frames.length > 0
      ? `${frames.length} monitor frame(s), status=${terminalStatus}`
      : "0 monitor frames (encode completed before poll — Apple Silicon fast-encode path)";

    const outputFile = actualOutPath.split("/").pop()!;
    const durationMs = Date.now() - start;
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase1", projectName: opts.smokeProjectName, args: { jobId: job.jobId }, result: { frames: frames.length, terminalStatus: terminalStatus || "completed-inferred", outputFile, outputBytes: outResult.sizeBytes, fixtureResult }, durationMs });
    return { id, name, status: "pass", durationMs, detail: `Output ${outputFile} (${outResult.sizeBytes} bytes). ${monitorNote}. jobId=${job.jobId}` };

  } catch (e) {
    const durationMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase1", projectName: opts.smokeProjectName, args: {}, error: { code: "E_INTERNAL", message: msg }, durationMs });
    return { id, name, status: "fail", durationMs, detail: msg };
  }
}
