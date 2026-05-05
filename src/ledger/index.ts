import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CreatorStudioError } from "../errors.js";
import { loadConfig } from "../config.js";

export interface LedgerEntry {
  ts: string;
  tool: string;
  projectName?: string;
  args: unknown;
  result?: unknown;
  error?: { code: string; message: string; hint?: string };
  durationMs: number;
}

function ledgerPath(projectName?: string): string {
  const cfg = loadConfig();
  if (projectName) {
    return join(cfg.dataDir, "projects", projectName, ".csos", "ledger.jsonl");
  }
  return join(cfg.dataDir, ".csos", "ledger.jsonl");
}

export async function appendLedger(entry: LedgerEntry): Promise<void> {
  const path = ledgerPath(entry.projectName);
  try {
    await mkdir(dirname(path), { recursive: true });
    // O_APPEND ensures each write is atomic at the POSIX level for small records
    await appendFile(path, JSON.stringify(entry) + "\n", { encoding: "utf-8", flag: "a" });
  } catch (e) {
    throw new CreatorStudioError(
      "E_LEDGER_WRITE_FAILED",
      `Failed to write ledger entry: ${e instanceof Error ? e.message : String(e)}`,
      `Ledger path: ${path}`,
    );
  }
}

export async function withLedger<T>(
  opts: { tool: string; projectName?: string; args: unknown },
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  let result: T;
  try {
    result = await fn();
  } catch (e) {
    const entry: LedgerEntry = {
      ts: new Date().toISOString(),
      tool: opts.tool,
      projectName: opts.projectName,
      args: opts.args,
      durationMs: Date.now() - start,
    };
    if (e instanceof CreatorStudioError) {
      entry.error = { code: e.code, message: e.message, hint: e.hint };
    } else if (e instanceof Error) {
      entry.error = { code: "E_INTERNAL", message: e.message };
    } else {
      entry.error = { code: "E_INTERNAL", message: String(e) };
    }
    // best-effort — never mask the original error
    await appendLedger(entry).catch(() => undefined);
    throw e;
  }
  await appendLedger({
    ts: new Date().toISOString(),
    tool: opts.tool,
    projectName: opts.projectName,
    args: opts.args,
    result,
    durationMs: Date.now() - start,
  });
  return result;
}
