/**
 * Phase 6 — Ledger integrity check.
 *
 * Reads the smoke project's ledger.jsonl and asserts:
 *   - ≥6 entries exist (one per phase that ran)
 *   - Every line is parseable as JSON
 *   - Every entry has ts (ISO string), tool (string), and durationMs (number)
 */
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { appendLedger } from "@creator-studio-os/core";
import type { PhaseResult } from "../report.js";
import type { SmokeOpts } from "../index.js";

export async function runPhase6(opts: SmokeOpts): Promise<PhaseResult & { ledgerCount: number }> {
  const start = Date.now();
  const id = 6;
  const name = "Ledger: ≥6 JSONL entries with ts + tool + durationMs";

  if (opts.dryRun) {
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase6", projectName: opts.smokeProjectName, args: { dryRun: true }, result: { entries: 6, allValid: true }, durationMs: 0 });
    return { id, name, status: "pass", durationMs: 0, detail: "dry-run: mocked 6 valid ledger entries", ledgerCount: 6 };
  }

  // Write this phase's entry first (will be counted in the check below)
  const phaseStart = start;
  const ledgerPath = join(opts.cfg.dataDir, "projects", opts.smokeProjectName, ".csos", "ledger.jsonl");

  try {
    await access(ledgerPath);
  } catch {
    const durationMs = Date.now() - start;
    return {
      id, name, status: "fail", durationMs,
      detail: `ledger.jsonl not found at ${ledgerPath} — no phases wrote to it`,
      ledgerCount: 0,
    };
  }

  const raw = await readFile(ledgerPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const entries: unknown[] = [];
  const parseErrors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      entries.push(JSON.parse(lines[i]));
    } catch {
      parseErrors.push(`Line ${i + 1}: ${lines[i].slice(0, 80)}`);
    }
  }

  if (parseErrors.length > 0) {
    const durationMs = Date.now() - start;
    return {
      id, name, status: "fail", durationMs,
      detail: `${parseErrors.length} JSONL parse error(s): ${parseErrors[0]}`,
      ledgerCount: entries.length,
    };
  }

  // Validate schema of each entry
  const schemaErrors: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as Record<string, unknown>;
    if (typeof e.ts !== "string" || !e.ts) schemaErrors.push(`Entry ${i + 1}: missing ts`);
    if (typeof e.tool !== "string" || !e.tool) schemaErrors.push(`Entry ${i + 1}: missing tool`);
    if (typeof e.durationMs !== "number") schemaErrors.push(`Entry ${i + 1}: durationMs not a number`);
  }

  if (schemaErrors.length > 0) {
    const durationMs = Date.now() - start;
    return {
      id, name, status: "fail", durationMs,
      detail: `Schema errors in ledger: ${schemaErrors.slice(0, 3).join("; ")}`,
      ledgerCount: entries.length,
    };
  }

  if (entries.length < 6) {
    const durationMs = Date.now() - start;
    return {
      id, name, status: "fail", durationMs,
      detail: `Only ${entries.length} ledger entries — expected ≥6 (one per phase). Skipped phases write 0 entries; run with all phases enabled to meet this gate.`,
      ledgerCount: entries.length,
    };
  }

  const durationMs = Date.now() - start;
  await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase6", projectName: opts.smokeProjectName, args: { ledgerPath }, result: { entries: entries.length, allValid: true }, durationMs });
  return {
    id, name, status: "pass", durationMs,
    detail: `${entries.length} entries, all valid JSONL, all have ts + tool + durationMs`,
    ledgerCount: entries.length,
  };
}
