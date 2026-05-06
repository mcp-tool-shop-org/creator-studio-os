/**
 * Phase 2 — Motion headless render via Compressor.
 *
 * Clones Atmospheric-Lower Third.motn, mutates a numeric param,
 * validates clean (0 violations), renders headlessly via Compressor,
 * waits for completion, asserts output file exists and is non-empty.
 */
import { access, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { cloneTemplate, inspectTemplate, setParam } from "@creator-studio-os/motion";
import { validateTemplate } from "@creator-studio-os/motion";
import { renderViaCompressor } from "@creator-studio-os/motion";
import { awaitOutputFile } from "@creator-studio-os/core";
import { appendLedger } from "@creator-studio-os/core";
import type { PhaseResult } from "../report.js";
import type { SmokeOpts } from "../index.js";

const ATMOSPHERIC_SRC =
  "/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Atmospheric.localized/Atmospheric-Lower Third.localized/Atmospheric-Lower Third.motn";
const HEVC8_SETTING = "EFBComputer_HEVC8.compressorsetting";

export async function runPhase2(opts: SmokeOpts): Promise<PhaseResult> {
  const start = Date.now();
  const id = 2;
  const name = "Motion clone → setParam → validate → render (output file non-empty)";

  if (opts.dryRun) {
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase2", projectName: opts.smokeProjectName, args: { dryRun: true }, result: { cloned: true, violations: 0, rendered: true }, durationMs: 0 });
    return { id, name, status: "pass", durationMs: 0, detail: "dry-run: mocked clone → validate clean → render → output exists" };
  }

  try {
    // Check Motion app is installed
    try {
      await access(ATMOSPHERIC_SRC);
    } catch {
      return { id, name, status: "skip", durationMs: Date.now() - start, detail: "Atmospheric-Lower Third.motn not found — Motion Creator Studio not installed" };
    }

    const motionDir = join(opts.smokeProjectDir, "motion");
    const outDir = join(opts.smokeProjectDir, "out");
    await mkdir(motionDir, { recursive: true });
    await mkdir(outDir, { recursive: true });

    // Clone
    const cloneDst = join(motionDir, "atmospheric-smoke.motn");
    await cloneTemplate(ATMOSPHERIC_SRC, cloneDst);

    // Inspect: find a numeric parameter to mutate
    const inspect = await inspectTemplate(cloneDst);
    const numericParam = inspect.parameters.find(
      (p) => p.value !== undefined && !isNaN(Number(p.value)) && Number(p.value) > 0 && p.id,
    );
    if (!numericParam) {
      return { id, name, status: "skip", durationMs: Date.now() - start, detail: "No numeric parameter found in Atmospheric-Lower Third.motn" };
    }

    const oldVal = numericParam.value ?? "0";
    const newVal = String(Number(oldVal) * 0.9); // slight change, stays valid
    await setParam(cloneDst, numericParam.name, numericParam.id, newVal);

    // Validate — expect 0 violations
    const validation = await validateTemplate(cloneDst);
    if (!validation.ok) {
      const durationMs = Date.now() - start;
      await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase2", projectName: opts.smokeProjectName, args: { param: numericParam.name }, error: { code: "E_OZML_VALIDATION_FAILED", message: `${validation.violations.length} violations` }, durationMs });
      return { id, name, status: "fail", durationMs, detail: `validate failed after setParam: ${validation.violations.map((v) => v.code).join(", ")}` };
    }

    // Render headlessly — submit job, then poll by stem for completion.
    // Compressor replaces our extension with the codec's container format
    // (.mp4 for HEVC, .mov for ProRes etc). Poll by stem to find actual output.
    const settingPath = join(opts.cfg.compressorBundledSettingsDir, HEVC8_SETTING);
    const outStem = "atmospheric-smoke";
    const outPath = join(outDir, outStem + ".mov"); // dirname + stem only; extension replaced by Compressor
    await renderViaCompressor({ motnPath: cloneDst, settingPath, locationPath: outPath, batchName: "csos-smoke-phase2" });

    let outResult: { path: string; sizeBytes: number };
    try {
      outResult = await awaitOutputFile({ pathStem: outStem, dir: outDir, timeoutSec: 180 });
    } catch {
      const durationMs = Date.now() - start;
      await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase2", projectName: opts.smokeProjectName, args: { param: numericParam.name }, error: { code: "E_COMPRESSOR_MONITOR_FAILED", message: "Output file not found within 180s" }, durationMs });
      return { id, name, status: "fail", durationMs, detail: `Render output not found after 180s (stem: ${outStem})` };
    }

    const outputFile = outResult.path.split("/").pop()!;
    const durationMs = Date.now() - start;
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase2", projectName: opts.smokeProjectName, args: { param: numericParam.name }, result: { outputFile, sizeBytes: outResult.sizeBytes }, durationMs });
    return {
      id, name, status: "pass", durationMs,
      detail: `Mutated "${numericParam.name}" (${oldVal}→${newVal}), 0 violations, rendered → ${outputFile} (${outResult.sizeBytes} bytes)`,
    };

  } catch (e) {
    const durationMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    await appendLedger({ ts: new Date().toISOString(), tool: "smoke:phase2", projectName: opts.smokeProjectName, args: {}, error: { code: "E_INTERNAL", message: msg }, durationMs });
    return { id, name, status: "fail", durationMs, detail: msg };
  }
}
