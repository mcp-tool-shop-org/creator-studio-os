import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
import { access } from "node:fs/promises";
import { CreatorStudioError } from "../../errors.js";
import { loadConfig } from "../../config.js";

export interface EncodeJob {
  jobPath: string;
  settingPath: string;
  locationPath: string;
  batchName?: string;
  computerGroup?: string;
  priority?: "low" | "medium" | "high";
}

export interface EncodeResult {
  jobId: string;
  batchId?: string;
  rawOutput: string;
}

const NOISE_PATTERNS = [
  /^objc\[\d+\]:/,
  /^Class JE[A-Za-z]+ is implemented/,
  /^Class JP[A-Za-z]+ is implemented/,
  /^Class _Page/,
  /^Class _JE/,
  /^This may cause spurious casting failures/,
  /^One of the duplicates must be removed/,
];

function stripObjcNoise(s: string): string {
  return s
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return !NOISE_PATTERNS.some((p) => p.test(trimmed));
    })
    .join("\n")
    .trim();
}

async function ensureExists(path: string, code: "E_JOB_NOT_FOUND" | "E_SETTING_NOT_FOUND" | "E_COMPRESSOR_NOT_FOUND") {
  try {
    await access(path);
  } catch {
    throw new CreatorStudioError(code, `Path does not exist: ${path}`);
  }
}

export async function encodeJob(job: EncodeJob, _retried = false): Promise<EncodeResult> {
  const cfg = loadConfig();
  await ensureExists(cfg.compressorBinaryPath, "E_COMPRESSOR_NOT_FOUND");
  await ensureExists(job.jobPath, "E_JOB_NOT_FOUND");
  await ensureExists(job.settingPath, "E_SETTING_NOT_FOUND");

  const args: string[] = [];
  if (job.computerGroup) args.push("-computergroup", job.computerGroup);
  if (job.batchName) args.push("-batchname", job.batchName);
  if (job.priority) args.push("-priority", job.priority);
  args.push("-jobpath", job.jobPath);
  args.push("-settingpath", job.settingPath);
  args.push("-locationpath", job.locationPath);

  return new Promise((resolve, reject) => {
    const child = spawn(cfg.compressorBinaryPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      reject(
        new CreatorStudioError(
          "E_COMPRESSOR_FAILED",
          `Compressor failed to start: ${err.message}`,
        ),
      );
    });
    child.on("close", (code) => {
      const cleanOut = stripObjcNoise(stdout);
      const cleanErr = stripObjcNoise(stderr);
      const merged = [cleanOut, cleanErr].filter(Boolean).join("\n");

      if (code === 0) {
        const jobMatch = merged.match(/<jobID\s+([0-9A-F-]{36})\s*\/?>/i);
        const batchMatch = merged.match(/<batchID\s+([0-9A-F-]{36})\s*\/?>/i);
        const jobId = jobMatch ? jobMatch[1] : "submitted";
        const batchId = batchMatch ? batchMatch[1] : undefined;
        resolve({ jobId, batchId, rawOutput: merged });
      } else {
        const errorMsg = merged || "no output";
        // Compressor daemon can land in a bad state and refuse new submissions.
        // Reset: kill the daemon (it respawns on next CLI call), wait 2s, retry once.
        if (!_retried && /Unable to submit to queue/i.test(errorMsg)) {
          execFileAsync("killall", ["Compressor"])
            .catch(() => {})
            .then(() => new Promise((r) => setTimeout(r, 2000)))
            .then(() => encodeJob(job, true))
            .then(resolve, reject);
          return;
        }
        reject(
          new CreatorStudioError(
            "E_COMPRESSOR_FAILED",
            `Compressor exit ${code}: ${errorMsg}`,
            "Run 'creator-studio-os verify' and confirm Compressor's purchase validation completed by opening it once interactively.",
          ),
        );
      }
    });
  });
}
