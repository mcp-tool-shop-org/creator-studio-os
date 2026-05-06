/**
 * Ledger reader — parses a project's ledger.jsonl and supports filtering/formatting.
 *
 * Used by the `creator-studio-os ledger <projectName>` CLI command.
 */
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../config.js";
import type { LedgerEntry } from "./index.js";

export interface ReadLedgerOpts {
  /** Project name (reads its per-project ledger) or undefined for global ledger */
  projectName?: string;
  /** Only return entries newer than this ISO timestamp */
  since?: string;
  /** Only return entries for this tool name (prefix match OK) */
  tool?: string;
  /** Only return entries that have an error field */
  errorsOnly?: boolean;
  /** Return the last N entries (after all other filters) */
  tail?: number;
}

function ledgerPath(projectName?: string): string {
  const cfg = loadConfig();
  if (projectName) {
    return join(cfg.dataDir, "projects", projectName, ".csos", "ledger.jsonl");
  }
  return join(cfg.dataDir, ".csos", "ledger.jsonl");
}

export interface LedgerReadResult {
  path: string;
  entries: LedgerEntry[];
  totalLines: number;
  filteredCount: number;
}

export async function readLedger(opts: ReadLedgerOpts = {}): Promise<LedgerReadResult> {
  const path = ledgerPath(opts.projectName);

  try {
    await access(path);
  } catch {
    return { path, entries: [], totalLines: 0, filteredCount: 0 };
  }

  const raw = await readFile(path, "utf-8");
  const lines = raw.split("\n").filter(Boolean);
  const allEntries: LedgerEntry[] = [];

  for (const line of lines) {
    try {
      allEntries.push(JSON.parse(line) as LedgerEntry);
    } catch { /* skip malformed lines */ }
  }

  let filtered = allEntries;

  if (opts.since) {
    const sinceTs = new Date(opts.since).getTime();
    filtered = filtered.filter((e) => new Date(e.ts).getTime() >= sinceTs);
  }
  if (opts.tool) {
    const toolFilter = opts.tool.toLowerCase();
    filtered = filtered.filter((e) => e.tool.toLowerCase().includes(toolFilter));
  }
  if (opts.errorsOnly) {
    filtered = filtered.filter((e) => Boolean(e.error));
  }
  if (opts.tail !== undefined && opts.tail > 0) {
    filtered = filtered.slice(-opts.tail);
  }

  return {
    path,
    entries: filtered,
    totalLines: allEntries.length,
    filteredCount: filtered.length,
  };
}

/** Parse a `--since` shorthand like "1h", "30m", "2d" → ISO timestamp */
export function parseSince(since: string): string {
  const now = Date.now();
  const m = since.match(/^(\d+)([smhd])$/);
  if (!m) return since; // assume it's already an ISO string
  const n = Number(m[1]);
  const unit = m[2];
  const ms =
    unit === "s" ? n * 1000 :
    unit === "m" ? n * 60_000 :
    unit === "h" ? n * 3_600_000 :
    n * 86_400_000; // d
  return new Date(now - ms).toISOString();
}

export function formatLedger(result: LedgerReadResult): string {
  if (result.entries.length === 0) {
    if (result.totalLines === 0) {
      return `No ledger found at ${result.path}`;
    }
    return `0 matching entries (${result.totalLines} total in ${result.path})`;
  }

  const lines: string[] = [
    `${result.filteredCount} entries (${result.totalLines} total) — ${result.path}`,
    "",
  ];

  for (const e of result.entries) {
    const dt = new Date(e.ts).toLocaleTimeString();
    const durStr = e.durationMs > 0 ? ` ${e.durationMs}ms` : "";
    const errStr = e.error ? ` ✗ ${e.error.code}: ${e.error.message.slice(0, 80)}` : " ✓";
    lines.push(`  ${dt}  ${e.tool}${durStr}${errStr}`);
  }

  return lines.join("\n");
}
