/**
 * Phase 4 — End-to-end killer chain (auto + human-eye).
 *
 * clone Drifting.moti → publish Size param → fcp_bind_motion_param →
 * buildProjectFcpxml (allowUnsafe=false) → DTD valid → write to disk →
 * open -b com.apple.FinalCutApp → PAUSE (manual mode) to confirm param
 * appears in FCP inspector.
 *
 * Integration risk surfaces:
 *   - The OZML paramId used as the FCPXML key ("3") may not match the
 *     actual FCP key path (e.g. "9999/1/83/3/50"). If FCP shows the param
 *     at its default value, that is a key-format mismatch — check the
 *     diagnostic output below for the emitted key vs. what a real FCP
 *     export shows.
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cloneTemplate } from "@creator-studio-os/motion";
import { publishToFcp } from "@creator-studio-os/motion";
import { buildParamBinding } from "@creator-studio-os/fcp";
import { buildProjectFcpxml } from "@creator-studio-os/fcp";
import { validateFcpxmlAgainstDtd } from "@creator-studio-os/fcp";
import { runApp } from "@creator-studio-os/core";
import { appendLedger } from "@creator-studio-os/core";
import { humanConfirm } from "../prompt.js";
import type { PhaseResult } from "../report.js";
import type { SmokeOpts } from "../index.js";

const DRIFTING_SRC =
  "/Applications/Final Cut Pro Creator Studio.app/Contents/PlugIns/MediaProviders/MotionEffect.fxp/Contents/Resources/Templates.localized/Titles.localized/Build In:Out.localized/Drifting.localized/Drifting.moti";
const DRIFTING_UID =
  ".../Titles.localized/Build In:Out.localized/Drifting.localized/Drifting.moti";

// The Font > Size parameter in Drifting.moti is id=3, name="Size"
const PARAM_NAME = "Size";
const PARAM_ID = 3;
const BIND_VALUE = "120"; // override from the default 198

export async function runPhase4(opts: SmokeOpts): Promise<PhaseResult> {
  const start = Date.now();
  const id = 4;
  const name = "Killer chain: clone → publish → bind → build FCPXML → DTD valid → import";

  if (opts.dryRun) {
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase4", projectName: opts.smokeProjectName, args: { dryRun: true }, result: { dtdValid: true, humanConfirmed: true }, durationMs: 0 });
    return { id, name, status: "pass", durationMs: 0, detail: "dry-run: mocked killer chain end-to-end" };
  }

  try {
    try {
      await access(DRIFTING_SRC);
    } catch {
      return { id, name, status: "skip", durationMs: Date.now() - start, detail: "Drifting.moti not found — FCP Creator Studio not installed" };
    }

    const motionDir = join(opts.smokeProjectDir, "motion");
    const fcpDir = join(opts.smokeProjectDir, "fcp");
    await mkdir(motionDir, { recursive: true });
    await mkdir(fcpDir, { recursive: true });

    // Step 1: Clone
    const cloneDst = join(motionDir, "drifting-killer-chain.moti");
    await cloneTemplate(DRIFTING_SRC, cloneDst);

    // Step 2: Publish the Size parameter so FCP can see it
    await publishToFcp({ path: cloneDst, paramName: PARAM_NAME, paramId: PARAM_ID, publish: true });

    // Step 3: Build param binding
    const binding = await buildParamBinding({ motnPath: cloneDst, paramName: PARAM_NAME, value: BIND_VALUE });
    const ozmlKey = binding.paramId;   // what we emit in FCPXML
    const fcpxmlKey = binding.key;     // same value — the integration risk

    // Step 4: Build FCPXML with the param binding on a title spine item
    const { xml } = buildProjectFcpxml(
      {
        projectName: "CSOS-Smoke-Phase4",
        eventName: "Creator Studio OS Smoke",
        spine: [
          {
            kind: "title",
            name: "Smoke Test Title",
            text: "CSOS Smoke",
            effectUid: DRIFTING_UID,
            effectName: "Drifting",
            offsetSeconds: 0,
            durationSeconds: 5,
            lane: 1,
            params: [{ name: binding.name, key: binding.key, value: BIND_VALUE }],
          },
        ],
      },
      { skipPreflight: true },
    );

    // Step 5: DTD validation
    const validation = await validateFcpxmlAgainstDtd(xml, opts.cfg.fcpDtdPath);
    if (!validation.valid) {
      const durationMs = Date.now() - start;
      await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase4", projectName: opts.smokeProjectName, args: { ozmlKey, fcpxmlKey }, error: { code: "E_FCPXML_INVALID", message: validation.output }, durationMs });
      return { id, name, status: "fail", durationMs, detail: `FCPXML failed DTD validation: ${validation.output}` };
    }

    // Step 6: Write FCPXML to disk
    const fcpxmlPath = join(fcpDir, "killer-chain.fcpxml");
    await writeFile(fcpxmlPath, xml, "utf-8");

    // Step 7: Open in FCP
    await runApp.open(fcpxmlPath, { appBundleId: opts.cfg.fcpBundleId });

    // Step 8: Human-eye confirmation (skipped in --ci or --dry-run)
    const confirmed = await humanConfirm({
      mode: opts.mode,
      dryRun: opts.dryRun,
      title: "Verify param binding in FCP Inspector",
      lines: [
        `FCPXML written to: ${fcpxmlPath}`,
        `Title: "Smoke Test Title" (Drifting template, lane 1)`,
        `Expected param: name="${PARAM_NAME}" key="${fcpxmlKey}" value="${BIND_VALUE}"`,
        "",
        "  ► Open FCP → find the CSOS-Smoke-Phase4 project",
        "  ► Select the 'Smoke Test Title' clip on the timeline",
        "  ► Inspector → Title tab → look for 'Size' showing 120",
        "",
        "  Integration risk: if Size shows 198 (its default), the OZML-derived",
        `  key "${ozmlKey}" does not match FCP's internal key path.`,
        "  Export the FCPXML from FCP and diff the <param key=...> value to find the real path.",
      ],
    });

    const durationMs = Date.now() - start;
    const status = confirmed ? "pass" : "fail";
    const detail = confirmed
      ? `DTD valid, imported, human confirmed param "${PARAM_NAME}" bound to ${BIND_VALUE}`
      : `DTD valid, imported, but human reported param NOT bound (key-format mismatch). OZML key="${ozmlKey}", FCPXML key="${fcpxmlKey}"`;

    await appendLedger({
      ts: new Date().toISOString(), tool: "smoke:phase4", projectName: opts.smokeProjectName,
      args: { ozmlKey, fcpxmlKey, bindValue: BIND_VALUE },
      result: { dtdValid: true, humanConfirmed: confirmed },
      durationMs,
    });

    return {
      id, name, status, durationMs, detail,
      diagnostics: confirmed ? undefined : {
        "OZML param id (emitted as FCPXML key)": ozmlKey,
        "FCPXML key attribute value": fcpxmlKey,
        "Expected bound value": BIND_VALUE,
        "Fix": "Export the FCPXML from FCP after import; the <param key=...> in the export is the real key path. Update fcp_bind_motion_param to use that path.",
      },
    };

  } catch (e) {
    const durationMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase4", projectName: opts.smokeProjectName, args: {}, error: { code: "E_INTERNAL", message: msg }, durationMs });
    return { id, name, status: "fail", durationMs, detail: msg };
  }
}
