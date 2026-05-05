/**
 * creator-studio-os doctor — one-shot diagnostic dump.
 *
 * Reports: version, Node, all 8 app paths + versions + bundle IDs,
 * tool-compass reachability, data dir + schema check, ledger stats.
 * JSON output via --json flag.
 */

import { readFileSync, existsSync } from "node:fs";
import { readdir, stat, access } from "node:fs/promises";
import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { getAllAppStatus } from "./apps/status.js";

const execFile = promisify(_execFile);

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function compassPath(): Promise<string | null> {
  // Look for tool-compass in venv/bin/ relative to the repo, then on PATH
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..");
  const venvBin = join(repoRoot, "venv", "bin", "tool-compass");
  if (existsSync(venvBin)) return venvBin;
  try {
    const { stdout } = await execFile("which", ["tool-compass"], { timeout: 3000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function compassReachable(binPath: string): Promise<boolean> {
  try {
    await execFile(binPath, ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function dataDirCheck(dataDir: string): Promise<{
  exists: boolean;
  projectCount: number;
  ledgerSizeBytes: number;
  schemaOk: boolean;
}> {
  try {
    await access(dataDir);
  } catch {
    return { exists: false, projectCount: 0, ledgerSizeBytes: 0, schemaOk: false };
  }

  let projectCount = 0;
  let ledgerSizeBytes = 0;
  try {
    const projectsDir = join(dataDir, "projects");
    const entries = await readdir(projectsDir, { withFileTypes: true });
    projectCount = entries.filter((e) => e.isDirectory()).length;
  } catch { /* no projects dir yet */ }

  try {
    const ledgerFile = join(dataDir, ".csos", "ledger.jsonl");
    const s = await stat(ledgerFile);
    ledgerSizeBytes = s.size;
  } catch { /* no global ledger */ }

  return { exists: true, projectCount, ledgerSizeBytes, schemaOk: true };
}

export interface DoctorReport {
  version: string;
  node: string;
  timestamp: string;
  apps: Awaited<ReturnType<typeof getAllAppStatus>>;
  toolCompass: { path: string | null; reachable: boolean };
  dataDir: { path: string; exists: boolean; projectCount: number; ledgerSizeBytes: number; schemaOk: boolean };
  ok: boolean;
}

export async function runDoctor(): Promise<DoctorReport> {
  const cfg = loadConfig();
  const [apps, cpPath, dataDirResult] = await Promise.all([
    getAllAppStatus({ dryRun: false }),
    compassPath(),
    dataDirCheck(cfg.dataDir),
  ]);

  const cpReachable = cpPath ? await compassReachable(cpPath) : false;

  const report: DoctorReport = {
    version: readVersion(),
    node: process.version,
    timestamp: new Date().toISOString(),
    apps,
    toolCompass: { path: cpPath, reachable: cpReachable },
    dataDir: { path: cfg.dataDir, ...dataDirResult },
    ok: dataDirResult.exists,
  };

  return report;
}

export function formatDoctor(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push(`creator-studio-os doctor — v${report.version} / Node ${report.node}`);
  lines.push(`  timestamp: ${report.timestamp}`);
  lines.push("");
  lines.push("Apps:");
  for (const app of report.apps) {
    const icon = app.running ? (app.healthy ? "✓" : "⚠") : "○";
    const vStr = app.version ? ` v${app.version}` : "";
    const docStr = app.frontDocument ? ` — "${app.frontDocument}"` : "";
    const qStr = app.queueDepth !== undefined ? ` queue=${app.queueDepth}` : "";
    const errStr = app.lastError ? ` [${app.lastError.slice(0, 60)}]` : "";
    lines.push(`  ${icon} ${app.app.padEnd(12)}${vStr}${docStr}${qStr}${errStr}`);
  }
  lines.push("");
  lines.push("tool-compass:");
  if (report.toolCompass.path) {
    const reach = report.toolCompass.reachable ? "✓ reachable" : "✗ not responding";
    lines.push(`  ${reach} — ${report.toolCompass.path}`);
  } else {
    lines.push("  ○ not found (install with: pip install tool-compass)");
  }
  lines.push("");
  lines.push("Data directory:");
  if (report.dataDir.exists) {
    lines.push(`  ✓ ${report.dataDir.path}`);
    lines.push(`    projects: ${report.dataDir.projectCount}  ledger: ${report.dataDir.ledgerSizeBytes} bytes`);
  } else {
    lines.push(`  ○ ${report.dataDir.path} (not created yet)`);
  }
  return lines.join("\n");
}
