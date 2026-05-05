/**
 * creator-studio-os smoke — v1.6.0 regression harness.
 *
 * Six phases matching the Phase-1 ship criteria from docs/phase-1.md.
 * Runs against real apps in --manual mode; pauses on Phase 4 for human
 * confirmation of the FCP inspector binding.
 *
 * Usage:
 *   creator-studio-os smoke             # --manual mode (default)
 *   creator-studio-os smoke --ci        # skip human prompts, run all auto-verifiable phases
 *   creator-studio-os smoke --dry-run   # mock all external calls, verify harness shape
 *
 * Output:
 *   out/smoke-v<version>-report.json    (relative to cwd)
 *   <dataDir>/projects/csos-smoke-v160/report.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadConfig } from "../config.js";
import { getEnvInfo } from "./env.js";
import {
  summarize,
  writeReport,
  printPhaseResult,
  type PhaseResult,
  type SmokeReport,
} from "./report.js";
import { runPhase1 } from "./phases/p1-compressor-monitor.js";
import { runPhase2 } from "./phases/p2-motion-render.js";
import { runPhase3 } from "./phases/p3-motion-publish-catalog.js";
import { runPhase4 } from "./phases/p4-killer-chain.js";
import { runPhase5 } from "./phases/p5-round-trip-diff.js";
import { runPhase6 } from "./phases/p6-ledger.js";
import { runPhase7 } from "./phases/p7-toolcompass-discoverability.js";
import { drainCompressorQueue } from "../apps/compressor/monitor.js";

export interface SmokeOpts {
  mode: "manual" | "ci";
  dryRun: boolean;
  version: string;
  smokeProjectName: string;
  smokeProjectDir: string;
  cfg: ReturnType<typeof loadConfig>;
}

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function runSmoke(args: string[]): Promise<void> {
  const mode: SmokeOpts["mode"] = args.includes("--ci") ? "ci" : "manual";
  const dryRun = args.includes("--dry-run");

  const version = readVersion();
  const smokeProjectName = `csos-smoke-v${version.replace(/\./g, "")}`;

  const cfg = loadConfig();
  const smokeProjectDir = join(cfg.dataDir, "projects", smokeProjectName);
  await mkdir(smokeProjectDir, { recursive: true });

  const opts: SmokeOpts = { mode, dryRun, version, smokeProjectName, smokeProjectDir, cfg };

  console.log(`\ncsos smoke v${version} — mode=${mode}${dryRun ? " [dry-run]" : ""}`);
  console.log(`  project dir: ${smokeProjectDir}\n`);

  const phases: PhaseResult[] = [];

  const runners = [runPhase1, runPhase2, runPhase3, runPhase4, runPhase5];
  for (const runner of runners) {
    const result = await runner(opts);
    phases.push(result);
    printPhaseResult(result);
    // Drain Compressor queue after Phase 1 so Phase 2 can submit cleanly.
    if (result.id === 1 && !opts.dryRun) {
      await drainCompressorQueue(60).catch(() => {});
    }
  }

  // Phase 6 returns ledgerCount in addition to PhaseResult
  const p6 = await runPhase6(opts);
  const { ledgerCount, ...p6result } = p6;
  phases.push(p6result);
  printPhaseResult(p6result);

  // Phase 7 — tool-compass discoverability regression
  const p7 = await runPhase7(opts);
  phases.push(p7);
  printPhaseResult(p7);

  const { passed, failed, skipped, overallStatus } = summarize(phases);

  const envInfo = await getEnvInfo({
    fcpAppPath: cfg.fcpAppPath,
    compressorAppPath: cfg.compressorAppPath,
    motionAppPath: cfg.motionAppPath,
  });

  const report: SmokeReport = {
    version,
    tag: `v${version}`,
    timestamp: new Date().toISOString(),
    mode,
    dryRun,
    environment: envInfo,
    smokeProjectDir,
    phases,
    ledgerEntriesCount: ledgerCount,
    passed,
    failed,
    skipped,
    overallStatus,
  };

  // Write to cwd/out/ and to smoke project dir
  const outDir = join(process.cwd(), "out");
  const reportPath = await writeReport(report, outDir);
  const projectReportPath = join(smokeProjectDir, `smoke-v${version}-report.json`);
  await writeFile(projectReportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n  Report: ${reportPath}`);
  console.log(`  Ledger entries: ${ledgerCount}`);
  console.log(
    `  Result: ${passed} passed, ${failed} failed, ${skipped} skipped — ${overallStatus.toUpperCase()}\n`,
  );

  process.exit(overallStatus === "pass" || overallStatus === "partial" ? 0 : 1);
}
