import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { EnvInfo } from "./env.js";

export interface PhaseResult {
  id: number;
  name: string;
  status: "pass" | "fail" | "skip";
  durationMs: number;
  detail: string;
  /** Extra structured data for failure diagnosis */
  diagnostics?: Record<string, unknown>;
}

export interface SmokeReport {
  version: string;
  tag: string;
  timestamp: string;
  mode: "manual" | "ci";
  dryRun: boolean;
  environment: EnvInfo;
  smokeProjectDir: string;
  phases: PhaseResult[];
  ledgerEntriesCount: number;
  passed: number;
  failed: number;
  skipped: number;
  overallStatus: "pass" | "fail" | "partial";
}

export function summarize(phases: PhaseResult[]): Pick<SmokeReport, "passed" | "failed" | "skipped" | "overallStatus"> {
  const passed = phases.filter((p) => p.status === "pass").length;
  const failed = phases.filter((p) => p.status === "fail").length;
  const skipped = phases.filter((p) => p.status === "skip").length;
  const overallStatus: SmokeReport["overallStatus"] =
    failed > 0 ? "fail" : skipped > 0 ? "partial" : "pass";
  return { passed, failed, skipped, overallStatus };
}

export async function writeReport(report: SmokeReport, outDir: string): Promise<string> {
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `smoke-v${report.version}-report.json`);
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf-8");
  return outPath;
}

export function printPhaseResult(r: PhaseResult): void {
  const icon = r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : "–";
  const label = r.status.toUpperCase().padEnd(4);
  console.log(`  ${icon} Phase ${r.id}: ${r.name} [${label}] ${r.durationMs}ms`);
  if (r.status !== "pass") {
    console.log(`    ${r.detail}`);
    if (r.diagnostics) {
      console.log("    Diagnostics:");
      for (const [k, v] of Object.entries(r.diagnostics)) {
        console.log(`      ${k}: ${JSON.stringify(v)}`);
      }
    }
  }
}
