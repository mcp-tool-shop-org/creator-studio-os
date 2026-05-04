import { spawn } from "node:child_process";
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

export async function encodeJob(job: EncodeJob): Promise<EncodeResult> {
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
        const idMatch = merged.match(/<([0-9A-F-]{36})>/i);
        const jobId = idMatch ? idMatch[1] : "submitted";
        resolve({ jobId, rawOutput: merged });
      } else {
        reject(
          new CreatorStudioError(
            "E_COMPRESSOR_FAILED",
            `Compressor exit ${code}: ${merged || "no output"}`,
            "Run 'creator-studio-os verify' and confirm Compressor's purchase validation completed by opening it once interactively.",
          ),
        );
      }
    });
  });
}
