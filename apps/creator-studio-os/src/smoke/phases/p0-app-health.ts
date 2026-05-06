/**
 * Phase 0 — app health pre-flight.
 *
 * Runs csos_app_status for the apps required by downstream smoke phases.
 * If any required app is unhealthy (not running or failed health probe),
 * downstream phases that depend on it surface as "skip" rather than "fail" —
 * keeping the smoke signal honest.
 *
 * Returns a PhaseResult plus a healthMap so the orchestrator can gate later
 * phases without modifying each phase runner.
 *
 * Dry-run: marks all required apps healthy (mocked) so phases 1–7 still run.
 */
import { getAllAppStatus, type AppName } from "@creator-studio-os/core";
import { appendLedger } from "@creator-studio-os/core";
import type { PhaseResult } from "../report.js";
import type { SmokeOpts } from "../index.js";

export interface Phase0Result extends PhaseResult {
  /** Map of AppName → healthy.  Used by the orchestrator to gate phases 1–5. */
  healthMap: Record<string, boolean>;
}

/** Apps that must be healthy for each phase to run (dry-run always skips the gate). */
export const PHASE_REQUIRED_APPS: Record<number, AppName[]> = {
  1: ["compressor"],
  2: ["motion"],
  3: ["motion"],
  4: ["fcp", "motion"],
  5: ["fcp"],
};

export async function runPhase0(opts: SmokeOpts): Promise<Phase0Result> {
  const start = Date.now();
  const id = 0;
  const name = "app health pre-flight: csos_app_status for all required apps";

  if (opts.dryRun) {
    const healthMap: Record<string, boolean> = { fcp: true, compressor: true, motion: true };
    await appendLedger({
      ts: new Date().toISOString(),
      tool: "smoke:phase0",
      projectName: opts.smokeProjectName,
      args: { dryRun: true },
      result: { allHealthy: true },
      durationMs: 0,
    });
    return {
      id, name, status: "pass", durationMs: 0,
      detail: "dry-run: all required apps healthy (mocked)",
      healthMap,
    };
  }

  const requiredApps: AppName[] = ["compressor", "motion", "fcp"];
  try {
    const statuses = await getAllAppStatus({ dryRun: false });
    const healthMap: Record<string, boolean> = {};
    for (const s of statuses) {
      healthMap[s.app] = s.healthy;
    }

    const unhealthy = requiredApps.filter((a) => !(healthMap[a] ?? false));
    const durationMs = Date.now() - start;

    if (unhealthy.length > 0) {
      const detail =
        `Required apps not healthy: ${unhealthy.join(", ")}. ` +
        `Phases that depend on them will be skipped (not failed).`;
      await appendLedger({
        ts: new Date().toISOString(),
        tool: "smoke:phase0",
        projectName: opts.smokeProjectName,
        args: {},
        error: { code: "E_APP_HEALTH_FAILED", message: detail },
        durationMs,
      });
      return {
        id, name, status: "fail", durationMs, detail, healthMap,
        diagnostics: { unhealthy, healthMap },
      };
    }

    await appendLedger({
      ts: new Date().toISOString(),
      tool: "smoke:phase0",
      projectName: opts.smokeProjectName,
      args: {},
      result: { healthy: requiredApps },
      durationMs,
    });
    return {
      id, name, status: "pass", durationMs,
      detail: `All required apps healthy: ${requiredApps.join(", ")}`,
      healthMap,
    };
  } catch (e) {
    const durationMs = Date.now() - start;
    return {
      id, name, status: "fail", durationMs,
      detail: `Health check error: ${e instanceof Error ? e.message : String(e)}`,
      healthMap: {},
    };
  }
}
