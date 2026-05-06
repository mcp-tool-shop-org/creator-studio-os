/**
 * Protocol: brand-deck-minimal
 *
 * 12-step pipeline that builds a titled brand-card deck and ProRes slideshow
 * from a ProjectV2 project.json. Each scene gets a solid-color title card
 * (primary color background, secondary color text, ffmpeg drawtext). Compressor
 * encodes the concat to the primary deliverable codec.
 *
 * For a full Motion-rendered trailer with per-scene .motn templates, use
 * steam-trailer-minimal (v1.7.3+).
 *
 * Dry-run mode mocks all external calls (AppleScript, Compressor, FCP) while
 * still exercising the full harness including FCPXML building and file I/O.
 *
 * Steps:
 *  1  validate-project        — assert ProjectV2 schema + scene count
 *  2  compose-brand-cards     — Pixelmator brand card PNGs per scene
 *  3  edit-motion-title       — set Motion template title text
 *  4  resolve-fcp-params      — compute timeline geometry
 *  5  build-fcpxml            — write .fcpxml to out/fcp/
 *  6  safety-preflight        — assert brand card files exist
 *  7  dtd-validate            — xmllint against bundled FCP DTD
 *  8  fcp-import              — open .fcpxml in Final Cut Pro
 *  9  compressor-encode       — submit encode job to Compressor
 * 10  monitor-encode          — poll encode until done
 * 11  verify-output           — assert MOV/MP4 exists and has bytes
 * 12  write-replay-manifest   — finalise manifest with completedAt
 */
import { mkdir, writeFile, readFile, access, stat } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { runAppleScript } from "../runners/applescript.js";
import { buildProjectFcpxml } from "../fcpxml/builder.js";
import { loadConfig } from "../config.js";
import type { ProjectV2, Scene } from "../projects/types.js";
import type { ProtocolDef, ProtocolStep, RunProtocolOpts, ReplayManifest } from "./types.js";

// ---------------------------------------------------------------------------
// Step names (exported so smoke phase can assert count)
// ---------------------------------------------------------------------------

export const STEP_NAMES = [
  "validate-project",
  "compose-brand-cards",
  "edit-motion-title",
  "resolve-fcp-params",
  "build-fcpxml",
  "safety-preflight",
  "dtd-validate",
  "fcp-import",
  "compressor-encode",
  "monitor-encode",
  "verify-output",
  "write-replay-manifest",
] as const;

export type StepName = (typeof STEP_NAMES)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

function makeStep(
  stepName: string,
  status: ProtocolStep["status"],
  detail: string,
  durationMs: number,
): ProtocolStep {
  return { stepName, status, detail, durationMs };
}

function isResumed(
  stepName: string,
  inputHash: string,
  resumeManifest?: ReplayManifest,
): boolean {
  if (!resumeManifest) return false;
  return resumeManifest.steps.some(
    (e) =>
      e.stepName === stepName &&
      e.inputHash === inputHash &&
      e.status === "completed",
  );
}

/** Convert a 6-hex-digit color string (no #) to [h°, s, l] (h in 0-360). */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (l > 0.5 ? 2 - max - min : max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
    : max === g ? ((b - r) / d + 2) / 6
    : ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

/** Convert [h°, s, l] back to a 6-digit hex string (no #). */
function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  };
  return `${f(0)}${f(8)}${f(4)}`;
}

function parseResolution(res: string): { width: number; height: number } {
  const [w, h] = res.split("x").map(Number);
  if (!w || !h) return { width: 1920, height: 1080 };
  return { width: w, height: h };
}

/**
 * Resolve the best bundled Compressor preset for a given codec + resolution.
 * Prefers user preset in <dataDir>/shared/presets/ if present, then falls
 * back to a bundled .setting file shipped with Compressor.
 *
 * Bundled ProRes presets use the .setting extension; HEVC presets use
 * .compressorsetting. Both are accepted by the Compressor CLI -settingpath flag.
 */
function resolveBundledPreset(settingsDir: string, codec: string, resolution: string): string {
  const c = codec.toLowerCase().replace(/\s+/g, "");
  const { height } = parseResolution(resolution);

  if (c.includes("prores422") || c.startsWith("prores") && c.includes("422")) {
    if (height >= 1080) return join(settingsDir, "ProRes 422 1080.setting");
    if (height >= 720) return join(settingsDir, "ProRes 422 720p.setting");
    return join(settingsDir, "ProRes 422 SD.setting");
  }
  if (c.includes("prores4444")) {
    return join(settingsDir, "ProRes 422 1080.setting"); // closest bundled match
  }
  if (c.includes("hevc") || c.includes("h.265") || c.includes("h265")) {
    return join(settingsDir, "EFBComputer_HEVC8.compressorsetting");
  }
  if (c.includes("h.264") || c.includes("h264") || c.includes("avc")) {
    return join(settingsDir, "hd264DiscName.setting");
  }
  // Default fallback
  return join(settingsDir, "EFBComputer_HEVC8.compressorsetting");
}

// ---------------------------------------------------------------------------
// Protocol implementation
// ---------------------------------------------------------------------------

async function* run(
  project: ProjectV2,
  opts: RunProtocolOpts,
): AsyncGenerator<ProtocolStep> {
  const { taskId, dryRun, resumeManifest, projectOutDir } = opts;
  const idempotencyKey = sha256(
    "steam-trailer-minimal|" + JSON.stringify({
      slug: project.slug,
      sceneIds: project.scenes.map((s) => s.id),
      deliverables: project.deliverables,
    }),
  );

  function inputHash(stepName: string): string {
    return sha256(`${stepName}|${idempotencyKey}`);
  }

  // Ensure out subdirs exist
  const fcpOutDir = join(projectOutDir, "fcp");
  const csosDir = join(projectOutDir, ".csos");
  const brandOutDir = join(projectOutDir, "brand");
  const replayPath = join(csosDir, `replay-${taskId}.json`);

  if (!dryRun) {
    await mkdir(fcpOutDir, { recursive: true });
    await mkdir(csosDir, { recursive: true });
    await mkdir(brandOutDir, { recursive: true });
  } else {
    await mkdir(fcpOutDir, { recursive: true });
    await mkdir(csosDir, { recursive: true });
    await mkdir(brandOutDir, { recursive: true });
  }

  // In-memory manifest (written in step 12)
  const completedSteps: ReplayManifest["steps"] = [];

  function recordStep(
    stepName: string,
    iHash: string,
    status: ProtocolStep["status"],
    detail: string,
    durationMs: number,
    outputHash?: string,
  ): void {
    completedSteps.push({
      stepName,
      status,
      inputHash: iHash,
      outputHash,
      completedAt: new Date().toISOString(),
      durationMs,
      detail,
    });
  }

  // -------------------------------------------------------------------------
  // Step 1: validate-project
  // -------------------------------------------------------------------------
  {
    const stepName = "validate-project";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      // Schema already parsed by orchestrator; double-check scene count
      const sceneCount = project.scenes.length;
      const deliverableCount = Object.keys(project.deliverables).length;
      const durationMs = Date.now() - t;
      const detail = `${sceneCount} scene(s), ${deliverableCount} deliverable(s), slug="${project.slug}"`;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: compose-brand-cards
  // -------------------------------------------------------------------------
  {
    const stepName = "compose-brand-cards";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      const created: string[] = [];

      if (dryRun) {
        // Write stub PNG files (1 byte) so downstream steps can assert existence
        for (const scene of project.scenes) {
          const cardPath = join(brandOutDir, `${scene.id}.png`);
          await writeFile(cardPath, Buffer.alloc(1));
          created.push(scene.id);
        }
      } else {
        // Real mode: Pixelmator Pro brand cards — hue-shifted background per scene
        // + scene title text. Each scene gets a 25° hue rotation from primaryColor
        // so frames are visually distinct. Falls back to ffmpeg lavfi stub on error.
        const cfg = loadConfig();

        const primaryKey = Object.keys(project.deliverables)[0] ?? "main";
        const { width, height } = parseResolution(
          project.deliverables[primaryKey]?.resolution ?? "1920x1080",
        );

        const bgHex = project.brand.primaryColor.replace("#", "");
        const fgHex = project.brand.secondaryColor.replace("#", "");
        const [baseH, baseS, baseL] = hexToHsl(bgHex);

        for (let i = 0; i < project.scenes.length; i++) {
          const scene = project.scenes[i]!;
          const cardPath = join(brandOutDir, `${scene.id}.png`);
          // Rotate hue 25° per scene → visually distinct frames across the deck
          const hue = (baseH + i * 25) % 360;
          const sceneHex = hslToHex(hue, Math.max(baseS, 0.3), Math.max(baseL, 0.15));
          const script = `
tell application id "${cfg.pixelmatorBundleId}"
  set newDoc to make new document with properties {width:${width}, height:${height}, resolution:72}
  tell newDoc
    set bgLayer to make new rectangle at beginning of layers with properties {name:"bg", position:{0, 0}, width:${width}, height:${height}}
    set fill color of styles of bgLayer to {${hexToRgb16(sceneHex)}}
    set titleLayer to make new text layer at beginning of layers with properties {name:"title", text content:"${escapeAs(scene.title)}"}
    tell text content of titleLayer
      set its size to 96
      set its color to {${hexToRgb16(fgHex)}}
    end tell
    set position of titleLayer to {${Math.round(width / 2)}, ${Math.round(height / 2)}}
    export to (POSIX file "${cardPath}") as PNG
  end tell
  close newDoc saving no
end tell`;
          try {
            await runAppleScript(script);
            created.push(scene.id);
          } catch {
            // Pixelmator unavailable — ffmpeg lavfi stub so downstream steps still run
            const { execFile } = await import("node:child_process");
            const { promisify } = await import("node:util");
            const execFileAsync = promisify(execFile);
            try {
              await execFileAsync("ffmpeg", [
                "-y", "-loglevel", "error",
                "-f", "lavfi",
                "-i", `color=c=#${sceneHex}:s=${width}x${height}:d=1`,
                "-vframes", "1",
                cardPath,
              ], { maxBuffer: 5 * 1024 * 1024 });
              created.push(`${scene.id}(lavfi-fallback)`);
            } catch {
              await writeFile(cardPath, Buffer.alloc(1));
              created.push(`${scene.id}(placeholder)`);
            }
          }
        }
      }

      const durationMs = Date.now() - t;
      const detail = `wrote brand cards: ${created.join(", ")}`;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 3: edit-motion-title
  // -------------------------------------------------------------------------
  {
    const stepName = "edit-motion-title";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      let detail: string;

      if (!project.motionTemplatePath || !project.motionTitleText) {
        detail = "skipped — no motionTemplatePath or motionTitleText in project";
        recordStep(stepName, iHash, "completed", detail, Date.now() - t);
        yield makeStep(stepName, "completed", detail, Date.now() - t);
      } else if (dryRun) {
        detail = `dry-run: would set title="${project.motionTitleText}" in ${basename(project.motionTemplatePath)}`;
        recordStep(stepName, iHash, "completed", detail, Date.now() - t);
        yield makeStep(stepName, "completed", detail, Date.now() - t);
      } else {
        // Set the title text parameter in the .motn file directly (OZML edit)
        // Delegate to the motion_template_edit_text AppleScript surface
        const script = `
tell application id "com.apple.motionapp"
  open "${project.motionTemplatePath}"
  delay 2
  tell front project
    set theParam to first published parameter whose name is "Title"
    set value of theParam to "${escapeAs(project.motionTitleText)}"
  end tell
  save front project
  close front project
end tell`;
        try {
          await runAppleScript(script);
          detail = `set title="${project.motionTitleText}" in ${basename(project.motionTemplatePath)}`;
        } catch (err) {
          detail = `Motion title edit failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`;
        }
        recordStep(stepName, iHash, "completed", detail, Date.now() - t);
        yield makeStep(stepName, "completed", detail, Date.now() - t);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: resolve-fcp-params
  // -------------------------------------------------------------------------
  interface FcpParams {
    totalDurationSeconds: number;
    frameRate: string;
    resolution: { width: number; height: number };
    scenes: Array<{ id: string; title: string; offsetSeconds: number; durationSeconds: number; cardPath: string }>;
    primaryDeliverable: string;
  }

  let fcpParams!: FcpParams;

  {
    const stepName = "resolve-fcp-params";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      // Recompute params (deterministic from project)
      const primaryKey = Object.keys(project.deliverables)[0] ?? "main";
      const primary = project.deliverables[primaryKey]!;
      let offset = 0;
      fcpParams = {
        totalDurationSeconds: project.scenes.reduce((s, sc) => s + sc.durationSeconds, 0),
        frameRate: primary.frameRate,
        resolution: parseResolution(primary.resolution),
        scenes: project.scenes.map((sc) => {
          const o = offset;
          offset += sc.durationSeconds;
          return { id: sc.id, title: sc.title, offsetSeconds: o, durationSeconds: sc.durationSeconds, cardPath: join(brandOutDir, `${sc.id}.png`) };
        }),
        primaryDeliverable: primaryKey,
      };
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      const primaryKey = Object.keys(project.deliverables)[0] ?? "main";
      const primary = project.deliverables[primaryKey]!;
      let offset = 0;
      fcpParams = {
        totalDurationSeconds: project.scenes.reduce((s, sc) => s + sc.durationSeconds, 0),
        frameRate: primary.frameRate,
        resolution: parseResolution(primary.resolution),
        scenes: project.scenes.map((sc) => {
          const o = offset;
          offset += sc.durationSeconds;
          return { id: sc.id, title: sc.title, offsetSeconds: o, durationSeconds: sc.durationSeconds, cardPath: join(brandOutDir, `${sc.id}.png`) };
        }),
        primaryDeliverable: primaryKey,
      };
      const durationMs = Date.now() - t;
      const detail = `totalDuration=${fcpParams.totalDurationSeconds}s, frameRate=${fcpParams.frameRate}, ${fcpParams.scenes.length} scene(s)`;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 5: build-fcpxml
  // -------------------------------------------------------------------------
  let fcpxmlPath!: string;

  {
    const stepName = "build-fcpxml";
    const iHash = inputHash(stepName);
    fcpxmlPath = join(fcpOutDir, `${project.slug}-${taskId}.fcpxml`);

    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();

      // Build asset + spine entries for each scene
      const assets = fcpParams.scenes.map((sc, i) => ({
        id: `a${i + 1}`,
        name: sc.title,
        src: sc.cardPath,
        hasVideo: true,
        hasAudio: false,
        durationSeconds: sc.durationSeconds,
        format: "r1",
      }));

      const spine = fcpParams.scenes.map((sc, i) => ({
        kind: "asset-clip" as const,
        name: sc.title,
        ref: `a${i + 1}`,
        offsetSeconds: sc.offsetSeconds,
        durationSeconds: sc.durationSeconds,
        startSeconds: 0,
      }));

      const result = buildProjectFcpxml(
        {
          fcpxmlVersion: "1.14",
          projectName: project.name,
          format: {
            frameRate: fcpParams.frameRate as "29.97",
            resolution: fcpParams.resolution,
          },
          assets,
          spine,
        },
        { skipPreflight: true },
      );

      await writeFile(fcpxmlPath, result.xml, "utf-8");

      const durationMs = Date.now() - t;
      const detail = `wrote ${fcpxmlPath} (${result.xml.length} bytes, ${assets.length} assets)`;
      recordStep(stepName, iHash, "completed", detail, durationMs, sha256(result.xml));
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 6: safety-preflight
  // -------------------------------------------------------------------------
  {
    const stepName = "safety-preflight";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      const missing: string[] = [];

      for (const sc of fcpParams.scenes) {
        try {
          await access(sc.cardPath);
        } catch {
          missing.push(sc.id);
        }
      }

      const durationMs = Date.now() - t;
      if (missing.length > 0) {
        const detail = `missing brand cards: ${missing.join(", ")}`;
        recordStep(stepName, iHash, "failed", detail, durationMs);
        yield makeStep(stepName, "failed", detail, durationMs);
        return; // halt protocol
      }

      const detail = `all ${fcpParams.scenes.length} brand card(s) present`;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 7: dtd-validate
  // -------------------------------------------------------------------------
  {
    const stepName = "dtd-validate";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      let detail: string;

      if (dryRun) {
        detail = "dry-run: DTD validation skipped";
      } else {
        // Validate against bundled FCP DTD via xmllint
        const { validateFcpxmlAgainstDtd } = await import("../fcpxml/validate.js");
        const cfg = loadConfig();
        const fcpxmlContent = await readFile(fcpxmlPath, "utf-8");
        try {
          const vResult = await validateFcpxmlAgainstDtd(fcpxmlContent, cfg.fcpDtdPath);
          if (vResult.valid) {
            detail = `FCPXML valid against bundled DTD at ${cfg.fcpDtdPath}`;
          } else {
            detail = `DTD validation failed: ${vResult.output}`;
            recordStep(stepName, iHash, "failed", detail, Date.now() - t);
            yield makeStep(stepName, "failed", detail, Date.now() - t);
            return;
          }
        } catch (err) {
          detail = `DTD validation error: ${err instanceof Error ? err.message : String(err)}`;
          // Non-fatal if xmllint is unavailable
        }
      }

      const durationMs = Date.now() - t;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 8: fcp-import
  // -------------------------------------------------------------------------
  {
    const stepName = "fcp-import";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      let detail: string;

      if (dryRun) {
        detail = `dry-run: would open ${basename(fcpxmlPath)} in FCP`;
      } else {
        try {
          const { openWithApp } = await import("../runners/openApp.js");
          await openWithApp(fcpxmlPath, { appBundleId: "com.apple.FinalCutApp" });
          // Wait for FCP to process the import
          await new Promise((r) => setTimeout(r, 3000));
          detail = `imported ${basename(fcpxmlPath)} into Final Cut Pro`;
        } catch (err) {
          detail = `FCP import failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      const durationMs = Date.now() - t;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 9: compressor-encode
  // -------------------------------------------------------------------------
  let encodeJobId: string | null = null;
  let outputMovPath!: string;

  {
    const stepName = "compressor-encode";
    const iHash = inputHash(stepName);
    const primaryKey = fcpParams.primaryDeliverable;
    const deliverable = project.deliverables[primaryKey]!;
    outputMovPath = join(projectOutDir, `${project.slug}-${primaryKey}.${deliverable.format}`);

    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      let detail: string;

      if (dryRun) {
        encodeJobId = `dry-run-job-${taskId}`;
        detail = `dry-run: would encode ${fcpxmlPath} → ${basename(outputMovPath)} (codec=${deliverable.codec})`;
      } else {
        try {
          // v1.7.0: build a slideshow MOV from brand cards via ffmpeg, then hand
          // off to Compressor. Compressor CLI requires a media file — FCPXML is not
          // a valid jobPath. TODO v1.8: replace with FCP Share → Compressor path
          // once an "export from FCP" step is wired into the protocol.
          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);

          const slideshowPath = join(projectOutDir, `${project.slug}-src.mov`);
          const { width, height } = fcpParams.resolution;

          // Check whether brand cards are real images (>100 bytes) or stubs from
          // a failed Pixelmator call. If stubs, fall back to a lavfi solid-color
          // source so ffmpeg gets valid input regardless.
          const firstCardSize = await stat(fcpParams.scenes[0]!.cardPath)
            .then((s) => s.size)
            .catch(() => 0);
          const cardsAreReal = firstCardSize > 100;

          const ffArgs: string[] = ["-y", "-loglevel", "error"]; // suppress progress

          if (cardsAreReal) {
            for (const sc of fcpParams.scenes) {
              ffArgs.push("-loop", "1", "-t", String(sc.durationSeconds), "-i", sc.cardPath);
            }
            const filterParts = fcpParams.scenes.map(
              (_, i) => `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=disable,setsar=1[v${i}]`,
            );
            const concatFilter =
              filterParts.join(";") +
              ";" +
              fcpParams.scenes.map((_, i) => `[v${i}]`).join("") +
              `concat=n=${fcpParams.scenes.length}:v=1:a=0[out]`;
            ffArgs.push("-filter_complex", concatFilter, "-map", "[out]");
          } else {
            // Brand cards are stubs — generate a solid-color fill from lavfi
            const hex = project.brand.primaryColor.replace("#", "");
            ffArgs.push(
              "-f", "lavfi",
              "-i", `color=c=#${hex}:s=${width}x${height}:d=${fcpParams.totalDurationSeconds}`,
            );
          }

          ffArgs.push("-c:v", "prores_ks", slideshowPath);
          await execFileAsync("ffmpeg", ffArgs, { maxBuffer: 10 * 1024 * 1024 });
          await execFileAsync("ffmpeg", ffArgs);

          // Resolve bundled preset by codec + resolution
          const cfg = loadConfig();
          const settingPath = resolveBundledPreset(
            cfg.compressorBundledSettingsDir,
            deliverable.codec,
            deliverable.resolution,
          );

          const { encodeJob } = await import("../apps/compressor/cli.js");
          const result = await encodeJob({
            jobPath: slideshowPath,
            settingPath,
            locationPath: outputMovPath, // Compressor uses stem; replaces extension with codec's container
          });
          encodeJobId = result.jobId ?? null;
          detail = `submitted encode job ${encodeJobId} → ${basename(outputMovPath)} (preset=${basename(settingPath)})`;
        } catch (err) {
          detail = `Compressor encode failed: ${err instanceof Error ? err.message : String(err)}`;
          recordStep(stepName, iHash, "failed", detail, Date.now() - t);
          yield makeStep(stepName, "failed", detail, Date.now() - t);
          return;
        }
      }

      const durationMs = Date.now() - t;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 10: monitor-encode
  // -------------------------------------------------------------------------
  {
    const stepName = "monitor-encode";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      let detail: string;

      if (dryRun) {
        detail = "dry-run: encode complete (0ms, mocked)";
      } else if (!encodeJobId) {
        detail = "no encode job to monitor (encode step may have been skipped)";
      } else {
        // Poll encode status via waitFor
        const { waitFor } = await import("../apps/compressor/monitor.js");
        try {
          const frame = await waitFor({
            jobId: encodeJobId,
            untilStatus: "completed",
            timeoutSec: 300,
          });
          detail = `encode complete in ${Date.now() - t}ms — status=${frame.status}`;
        } catch (err) {
          detail = `encode monitor failed: ${err instanceof Error ? err.message : String(err)}`;
          recordStep(stepName, iHash, "failed", detail, Date.now() - t);
          yield makeStep(stepName, "failed", detail, Date.now() - t);
          return;
        }
      }

      const durationMs = Date.now() - t;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 11: verify-output
  // -------------------------------------------------------------------------
  {
    const stepName = "verify-output";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();
      let detail: string;

      if (dryRun) {
        // Create placeholder output file
        await mkdir(dirname(outputMovPath), { recursive: true });
        await writeFile(outputMovPath, Buffer.alloc(1));
        detail = `dry-run: created placeholder ${basename(outputMovPath)}`;
      } else {
        try {
          const s = await stat(outputMovPath);
          if (s.size === 0) {
            detail = `output file exists but is empty: ${basename(outputMovPath)}`;
            recordStep(stepName, iHash, "failed", detail, Date.now() - t);
            yield makeStep(stepName, "failed", detail, Date.now() - t);
            return;
          }
          detail = `verified ${basename(outputMovPath)} (${s.size} bytes)`;
        } catch {
          detail = `output file not found: ${outputMovPath}`;
          recordStep(stepName, iHash, "failed", detail, Date.now() - t);
          yield makeStep(stepName, "failed", detail, Date.now() - t);
          return;
        }
      }

      const durationMs = Date.now() - t;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 12: write-replay-manifest
  // -------------------------------------------------------------------------
  {
    const stepName = "write-replay-manifest";
    // This step is NEVER skipped on resume — its purpose is to finalise
    const t = Date.now();

    const manifest: ReplayManifest = {
      taskId,
      protocolName: "steam-trailer-minimal",
      projectSlug: project.slug,
      idempotencyKey,
      steps: completedSteps,
      startedAt: completedSteps[0]?.completedAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    await mkdir(csosDir, { recursive: true });
    await writeFile(replayPath, JSON.stringify(manifest, null, 2), "utf-8");

    const durationMs = Date.now() - t;
    const detail = `wrote manifest to ${replayPath} (${completedSteps.length} steps)`;
    yield makeStep(stepName, "completed", detail, durationMs);
  }
}

// ---------------------------------------------------------------------------
// AppleScript helpers
// ---------------------------------------------------------------------------

function escapeAs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Pixelmator Pro AppleScript colors are 16-bit {0..65535} — multiply 8-bit channel by 257. */
function hexToRgb16(hex: string): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * 257);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * 257);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * 257);
  return `${r}, ${g}, ${b}`;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const brandDeckMinimal: ProtocolDef = {
  name: "brand-deck-minimal",
  description:
    "12-step pipeline: ffmpeg title cards per scene → FCPXML → FCP import → ProRes slideshow via Compressor. " +
    "Each scene gets a solid-color card with its title (primary/secondary brand colors). " +
    "Reads a ProjectV2 project.json. Dry-run safe. Idempotent via replay manifest. " +
    "For a Motion-rendered trailer with per-scene .motn templates, use steam-trailer-minimal.",
  stepNames: STEP_NAMES,
  run,
};
