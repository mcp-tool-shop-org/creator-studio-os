/**
 * Higher-level facade over the raw osascript / open / CLI primitives.
 *
 * Key win: the BatchRunner accumulates script fragments and flushes them as
 * a single osascript process — eliminating the ~400ms startup tax that adds up
 * across iWork bulk operations.
 *
 * The underlying runAppleScript() stays as the primitive. This module sits
 * above it and adds batching, dry-run, and a transcript hook for the ledger.
 */
import { runAppleScript, type AppleScriptOptions } from "./applescript.js";
import { openWithApp, type OpenOptions } from "./openApp.js";

export interface TranscriptEntry {
  op: "osascript" | "open" | "osascript-batch";
  script?: string;
  args?: string[];
  durationMs: number;
  result?: string;
  error?: string;
}

export interface RunAppOpts {
  /** Skip actual execution; return empty string / no-op. Useful for unit tests. */
  dryRun?: boolean;
  timeoutMs?: number;
  /** Called after every executed operation with timing + result. */
  transcriptHook?: (entry: TranscriptEntry) => void;
}

class BatchRunner {
  private readonly scripts: string[] = [];
  private readonly opts: RunAppOpts;

  constructor(opts: RunAppOpts) {
    this.opts = opts;
  }

  add(script: string): this {
    this.scripts.push(script);
    return this;
  }

  /** Flush: run all accumulated scripts as one osascript call. */
  async run(): Promise<string> {
    if (this.scripts.length === 0) return "";

    // Single-script fast path (no batching overhead)
    const combined =
      this.scripts.length === 1
        ? this.scripts[0]
        : this.scripts.join("\n\n");

    const start = Date.now();

    if (this.opts.dryRun) {
      this.opts.transcriptHook?.({
        op: "osascript-batch",
        script: combined,
        durationMs: 0,
        result: "",
      });
      return "";
    }

    try {
      const scriptOpts: AppleScriptOptions = {};
      if (this.opts.timeoutMs !== undefined) scriptOpts.timeoutMs = this.opts.timeoutMs;
      const result = await runAppleScript(combined, scriptOpts);
      this.opts.transcriptHook?.({
        op: "osascript-batch",
        script: combined,
        durationMs: Date.now() - start,
        result,
      });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.opts.transcriptHook?.({
        op: "osascript-batch",
        script: combined,
        durationMs: Date.now() - start,
        error: msg,
      });
      throw e;
    }
  }
}

async function osascript(script: string, opts: RunAppOpts = {}): Promise<string> {
  const start = Date.now();

  if (opts.dryRun) {
    opts.transcriptHook?.({ op: "osascript", script, durationMs: 0, result: "" });
    return "";
  }

  try {
    const asOpts: AppleScriptOptions = {};
    if (opts.timeoutMs !== undefined) asOpts.timeoutMs = opts.timeoutMs;
    const result = await runAppleScript(script, asOpts);
    opts.transcriptHook?.({ op: "osascript", script, durationMs: Date.now() - start, result });
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    opts.transcriptHook?.({ op: "osascript", script, durationMs: Date.now() - start, error: msg });
    throw e;
  }
}

async function open(filePath: string, openOpts: OpenOptions, opts: RunAppOpts = {}): Promise<void> {
  const start = Date.now();

  if (opts.dryRun) {
    opts.transcriptHook?.({ op: "open", args: [filePath], durationMs: 0, result: "" });
    return;
  }

  try {
    await openWithApp(filePath, openOpts);
    opts.transcriptHook?.({ op: "open", args: [filePath], durationMs: Date.now() - start, result: "ok" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    opts.transcriptHook?.({ op: "open", args: [filePath], durationMs: Date.now() - start, error: msg });
    throw e;
  }
}

function batch(opts: RunAppOpts = {}): BatchRunner {
  return new BatchRunner(opts);
}

export const runApp = { osascript, open, batch };
