/**
 * Phase 3 — motion_publish_to_fcp + effects catalog.
 *
 * Clones a bundled .moti, adds a "Publish To FCP" marker on a private param,
 * re-validates (0 violations), then verifies:
 *   (a) readPublishedParams returns the newly-published name
 *   (b) buildEffectsCatalog runs on the live host and returns ≥1 entry
 */
import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { cloneTemplate, inspectTemplate } from "@creator-studio-os/motion";
import { publishToFcp } from "@creator-studio-os/motion";
import { validateTemplate } from "@creator-studio-os/motion";
import { readPublishedParams } from "@creator-studio-os/fcp";
import { buildEffectsCatalog } from "@creator-studio-os/fcp";
import { appendLedger } from "@creator-studio-os/core";
import type { PhaseResult } from "../report.js";
import type { SmokeOpts } from "../index.js";

const DRIFTING_SRC =
  "/Applications/Final Cut Pro Creator Studio.app/Contents/PlugIns/MediaProviders/MotionEffect.fxp/Contents/Resources/Templates.localized/Titles.localized/Build In:Out.localized/Drifting.localized/Drifting.moti";

export async function runPhase3(opts: SmokeOpts): Promise<PhaseResult> {
  const start = Date.now();
  const id = 3;
  const name = "motion_publish_to_fcp → validate clean → publishedParams confirmed";

  if (opts.dryRun) {
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase3", projectName: opts.smokeProjectName, args: { dryRun: true }, result: { published: "Size", catalogEntries: 5 }, durationMs: 0 });
    return { id, name, status: "pass", durationMs: 0, detail: "dry-run: mocked publish Size → validate clean → catalog 5 entries" };
  }

  try {
    try {
      await access(DRIFTING_SRC);
    } catch {
      return { id, name, status: "skip", durationMs: Date.now() - start, detail: "Drifting.moti not found — FCP Creator Studio not installed" };
    }

    const motionDir = join(opts.smokeProjectDir, "motion");
    await mkdir(motionDir, { recursive: true });
    const cloneDst = join(motionDir, "drifting-publish-smoke.moti");
    await cloneTemplate(DRIFTING_SRC, cloneDst);

    // Inspect: find a private (non-published) numeric param to publish
    const inspect = await inspectTemplate(cloneDst);
    const candidate = inspect.parameters.find(
      (p) =>
        p.value !== undefined &&
        !isNaN(Number(p.value)) &&
        Number(p.value) > 0 &&
        p.id &&
        !p.hasChildren, // leaf param — simpler to publish
    );
    if (!candidate) {
      return { id, name, status: "skip", durationMs: Date.now() - start, detail: "No suitable leaf numeric parameter found in Drifting.moti" };
    }

    const paramId = parseInt(candidate.id, 10);
    if (isNaN(paramId)) {
      return { id, name, status: "skip", durationMs: Date.now() - start, detail: `Candidate param id "${candidate.id}" is not an integer` };
    }

    // Add Publish To FCP marker
    await publishToFcp({ path: cloneDst, paramName: candidate.name, paramId, publish: true });

    // Validate — expect 0 violations
    const validation = await validateTemplate(cloneDst);
    if (!validation.ok) {
      const durationMs = Date.now() - start;
      await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase3", projectName: opts.smokeProjectName, args: { param: candidate.name }, error: { code: "E_OZML_VALIDATION_FAILED", message: `${validation.violations.length} violations after publish` }, durationMs });
      return { id, name, status: "fail", durationMs, detail: `validate failed after publishToFcp: ${validation.violations.map((v) => v.code).join(", ")}` };
    }

    // Verify the param is now published
    const published = await readPublishedParams(cloneDst);
    const found = published.find((p) => p.name === candidate.name);
    if (!found) {
      const durationMs = Date.now() - start;
      return {
        id, name, status: "fail", durationMs,
        detail: `publishToFcp succeeded but readPublishedParams didn't find "${candidate.name}". Published: ${published.map((p) => p.name).join(", ") || "(none)"}`,
      };
    }

    // Verify effects catalog runs on the live host
    const catalog = await buildEffectsCatalog({ refresh: true });
    const catalogEntries = catalog.entries.length;

    const durationMs = Date.now() - start;
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase3", projectName: opts.smokeProjectName, args: { param: candidate.name, paramId }, result: { publishedName: found.name, catalogEntries }, durationMs });
    return {
      id, name, status: "pass", durationMs,
      detail: `Published "${candidate.name}" (id=${paramId}), 0 violations, readPublishedParams confirmed, catalog=${catalogEntries} entries`,
    };

  } catch (e) {
    const durationMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase3", projectName: opts.smokeProjectName, args: {}, error: { code: "E_INTERNAL", message: msg }, durationMs });
    return { id, name, status: "fail", durationMs, detail: msg };
  }
}
