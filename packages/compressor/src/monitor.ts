import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { CreatorStudioError } from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";

export interface StatusFrame {
  jobId: string;
  batchId: string;
  status: "queued" | "active" | "completed" | "failed" | "cancelled";
  percentComplete: number;
  timeElapsedSeconds: number;
  timeRemainingSeconds: number;
  name: string;
  submissionTime: string;
  sentBy: string;
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function parseStatus(raw: unknown): "queued" | "active" | "completed" | "failed" | "cancelled" {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  if (s === "queued" || s === "active" || s === "completed" || s === "failed" || s === "cancelled") {
    return s;
  }
  // Compressor may use "encoding" or "transcoding" for active
  if (s === "encoding" || s === "transcoding" || s === "processing") return "active";
  return "queued";
}

function parseFrame(obj: Record<string, unknown>): StatusFrame {
  return {
    jobId: String(obj.jobid ?? obj.jobID ?? obj.job_id ?? ""),
    batchId: String(obj.batchid ?? obj.batchID ?? obj.batch_id ?? ""),
    status: parseStatus(obj.status),
    percentComplete: Number(obj.percentComplete ?? obj.percent_complete ?? 0),
    timeElapsedSeconds: Number(obj.timeElapsedSeconds ?? obj.timeElapsed ?? 0),
    timeRemainingSeconds: Number(obj.timeRemainingSeconds ?? obj.timeRemaining ?? 0),
    name: String(obj.name ?? ""),
    submissionTime: String(obj.submissionTime ?? ""),
    sentBy: String(obj.sentBy ?? ""),
  };
}

function extractFrames(text: string): StatusFrame[] {
  const frames: StatusFrame[] = [];
  // Try to find JSON objects in the output (may be line-delimited or embedded in text)
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") frames.push(parseFrame(item as Record<string, unknown>));
        }
      } else if (parsed && typeof parsed === "object") {
        // May be wrapped: { batches: [...], jobs: [...] } or a flat status frame
        const p = parsed as Record<string, unknown>;
        if (p.status !== undefined) {
          frames.push(parseFrame(p));
        } else if (Array.isArray(p.jobs)) {
          for (const j of p.jobs as Record<string, unknown>[]) frames.push(parseFrame(j));
        } else if (Array.isArray(p.batches)) {
          for (const b of p.batches as Record<string, unknown>[]) frames.push(parseFrame(b));
        }
      }
    } catch {
      // not JSON, skip
    }
  }
  return frames;
}

async function ensureBinary(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new CreatorStudioError("E_COMPRESSOR_NOT_FOUND", `Compressor binary not found: ${path}`);
  }
}

function buildMonitorArgs(opts: {
  jobId?: string;
  batchId?: string;
  intervalSec?: number;
  timeoutSec?: number;
  once?: boolean;
  format?: string;
}): string[] {
  const args: string[] = ["-monitor"];
  args.push("-format", opts.format ?? "json");
  if (opts.jobId) args.push("-jobid", opts.jobId);
  if (opts.batchId) args.push("-batchid", opts.batchId);
  if (opts.once) {
    args.push("-once");
  } else {
    if (opts.intervalSec != null) args.push("-query", String(opts.intervalSec));
    if (opts.timeoutSec != null) args.push("-timeout", String(opts.timeoutSec));
  }
  return args;
}

export async function statusOnce(opts: {
  jobId?: string;
  batchId?: string;
}): Promise<StatusFrame> {
  const cfg = loadConfig();
  await ensureBinary(cfg.compressorBinaryPath);

  const args = buildMonitorArgs({ ...opts, once: true });

  return new Promise((resolve, reject) => {
    const child = spawn(cfg.compressorBinaryPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      const frames = extractFrames(stdout);
      if (frames.length > 0) {
        resolve(frames[frames.length - 1]);
        return;
      }
      reject(
        new CreatorStudioError(
          "E_COMPRESSOR_MONITOR_FAILED",
          `Compressor -monitor returned no status (exit ${code}): ${stderr.trim() || stdout.trim() || "no output"}`,
          "Ensure a job or batch ID is active. Run compressor_encode first.",
        ),
      );
    });
    child.on("error", (e) =>
      reject(new CreatorStudioError("E_COMPRESSOR_MONITOR_FAILED", `Compressor failed: ${e.message}`)),
    );
  });
}

export async function* monitorStream(opts: {
  jobId?: string;
  batchId?: string;
  intervalSec?: number;
  timeoutSec?: number;
}): AsyncGenerator<StatusFrame> {
  const cfg = loadConfig();
  await ensureBinary(cfg.compressorBinaryPath);

  const intervalSec = opts.intervalSec ?? 1;
  const timeoutSec = opts.timeoutSec ?? 3600;

  const args = buildMonitorArgs({ ...opts, intervalSec, timeoutSec });

  const child = spawn(cfg.compressorBinaryPath, args, { stdio: ["ignore", "pipe", "pipe"] });

  let buffer = "";
  const frames: StatusFrame[] = [];
  let done = false;
  let yieldedTerminal = false;

  child.stdout.on("data", (d: Buffer) => {
    buffer += d.toString();
    // Parse any complete lines we have
    const newFrames = extractFrames(buffer);
    // Keep unparsed tail in buffer
    const lastNl = buffer.lastIndexOf("\n");
    if (lastNl >= 0) buffer = buffer.slice(lastNl + 1);
    frames.push(...newFrames);
  });

  child.on("close", () => {
    // Flush remaining buffer
    if (buffer.trim()) frames.push(...extractFrames(buffer));
    done = true;
  });
  child.on("error", () => { done = true; });

  // Yield frames as they arrive, polling with a short sleep
  const POLL_MS = 250;
  let elapsed = 0;
  const maxMs = timeoutSec * 1000;

  while (!done || frames.length > 0) {
    if (frames.length > 0) {
      const frame = frames.shift()!;
      yield frame;
      if (TERMINAL_STATUSES.has(frame.status)) {
        yieldedTerminal = true;
        child.kill();
        return;
      }
    } else if (!done) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      elapsed += POLL_MS;
      if (elapsed > maxMs) {
        child.kill();
        throw new CreatorStudioError(
          "E_COMPRESSOR_MONITOR_FAILED",
          `Monitor timed out after ${timeoutSec}s`,
          "Increase timeoutSec or check if the job is still active.",
        );
      }
    }
  }

  // Job may have finished before the first poll tick (common for short encodes on Apple Silicon).
  // Emit a -once snapshot so callers always receive at least one terminal frame.
  if (!yieldedTerminal && (opts.jobId || opts.batchId)) {
    try {
      const finalFrame = await statusOnce({ jobId: opts.jobId, batchId: opts.batchId });
      yield finalFrame;
    } catch {
      // Job already gone from queue — already terminal, nothing to emit.
    }
  }
}

export async function drainCompressorQueue(timeoutSec = 60): Promise<void> {
  const cfg = loadConfig();
  await ensureBinary(cfg.compressorBinaryPath);

  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    const allFrames = await new Promise<StatusFrame[]>((resolve) => {
      const args = ["-monitor", "-format", "json", "-once"];
      const child = spawn(cfg.compressorBinaryPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      child.stdout.on("data", (d: Buffer) => (out += d.toString()));
      child.on("close", () => resolve(extractFrames(out)));
      child.on("error", () => resolve([]));
    });

    if (allFrames.length === 0) return; // queue empty

    const nonTerminal = allFrames.filter((f) => !TERMINAL_STATUSES.has(f.status));
    if (nonTerminal.length === 0) return;

    // Kill non-terminal jobs/batches
    for (const frame of nonTerminal) {
      const killArgs = ["-kill"];
      if (frame.batchId) killArgs.push("-batchid", frame.batchId);
      else if (frame.jobId) killArgs.push("-jobid", frame.jobId);
      const kc = spawn(cfg.compressorBinaryPath, killArgs, { stdio: "ignore" });
      await new Promise((r) => kc.on("close", r));
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
}

export async function jobAction(
  action: "pause" | "resume" | "kill",
  opts: { jobId?: string; batchId?: string },
): Promise<void> {
  const cfg = loadConfig();
  await ensureBinary(cfg.compressorBinaryPath);

  const args: string[] = [`-${action}`];
  if (opts.jobId) args.push("-jobid", opts.jobId);
  if (opts.batchId) args.push("-batchid", opts.batchId);

  return new Promise((resolve, reject) => {
    const child = spawn(cfg.compressorBinaryPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      if (code === 0) { resolve(); return; }
      reject(
        new CreatorStudioError(
          "E_COMPRESSOR_MONITOR_FAILED",
          `Compressor -${action} exit ${code}: ${stderr.trim() || "no output"}`,
          "Confirm job/batch ID is correct and the job is in a state that accepts this action.",
        ),
      );
    });
    child.on("error", (e) =>
      reject(new CreatorStudioError("E_COMPRESSOR_MONITOR_FAILED", `Compressor failed: ${e.message}`)),
    );
  });
}

export async function waitFor(opts: {
  jobId?: string;
  batchId?: string;
  untilStatus: "completed" | "failed" | "cancelled";
  timeoutSec?: number;
}): Promise<StatusFrame> {
  let lastFrame: StatusFrame | undefined;
  for await (const frame of monitorStream({
    jobId: opts.jobId,
    batchId: opts.batchId,
    timeoutSec: opts.timeoutSec,
  })) {
    lastFrame = frame;
    if (frame.status === opts.untilStatus || TERMINAL_STATUSES.has(frame.status)) {
      return frame;
    }
  }
  if (lastFrame) return lastFrame;
  // Stream ended with 0 frames — job completed before any poll fired (common on
  // Apple Silicon hardware encoders). Return a synthetic completed frame; the
  // caller must validate the output file independently.
  return {
    jobId: opts.jobId ?? "",
    batchId: opts.batchId ?? "",
    status: "completed",
    percentComplete: 100,
    timeElapsedSeconds: 0,
    timeRemainingSeconds: 0,
    name: "",
    submissionTime: "",
    sentBy: "",
  };
}
