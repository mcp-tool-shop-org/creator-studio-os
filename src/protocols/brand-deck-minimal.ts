/**
 * Protocol: brand-deck-minimal
 *
 * 13-step pipeline that builds a titled brand-card deck and ProRes slideshow
 * from a ProjectV2 project.json. Each scene gets a Pixelmator-rendered title
 * card (hue-shifted background, scene title text). When motionTemplatePath is
 * set, step 3 renders per-scene Motion lower-third clips via Compressor and
 * uses them as the final source (brand cards become the fallback).
 *
 * Dry-run mode mocks all external calls (AppleScript, Compressor, FCP) while
 * still exercising the full harness including FCPXML building and file I/O.
 *
 * Steps:
 *  1  validate-project        — assert ProjectV2 schema + scene count
 *  2  compose-brand-cards     — Pixelmator brand card PNGs per scene
 *  3  render-scene-clips      — per-scene Motion lower-third render via Compressor
 *  4  edit-motion-title       — set project-level Motion template title (single clip)
 *  5  resolve-fcp-params      — compute timeline geometry
 *  6  build-fcpxml            — write .fcpxml to out/fcp/
 *  7  safety-preflight        — assert brand card files exist
 *  8  dtd-validate            — xmllint against bundled FCP DTD
 *  9  fcp-import              — open .fcpxml in Final Cut Pro
 * 10  compressor-encode       — submit encode job to Compressor
 * 11  monitor-encode          — poll encode until done
 * 12  verify-output           — assert MOV/MP4 exists and has bytes
 * 13  write-replay-manifest   — finalise manifest with completedAt
 */
import { mkdir, writeFile, readFile, access, stat } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { runAppleScript } from "../runners/applescript.js";
import { buildProjectFcpxml } from "../fcpxml/builder.js";
import { loadConfig } from "../config.js";
import { appendLedger } from "../ledger/index.js";
import { CreatorStudioError } from "../errors.js";
import type { ProjectV2, Scene } from "../projects/types.js";
import type { ProtocolDef, ProtocolStep, RunProtocolOpts, ReplayManifest } from "./types.js";

// ---------------------------------------------------------------------------
// Step names (exported so smoke phase can assert count)
// ---------------------------------------------------------------------------

export const STEP_NAMES = [
  "validate-project",
  "compose-brand-cards",
  "render-scene-clips",
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
    // ProRes 4444 lives in a different settings tree (StompUI.framework, not CompressorKit.framework).
    // Callers that need 4444 should use cfg.compressorProRes4444SettingPath directly rather than
    // this helper, which only knows the CompressorKit settings directory.
    return join(settingsDir, "ProRes 422 1080.setting");
  }
  if (c.includes("hevc") || c.includes("h.265") || c.includes("h265")) {
    return join(settingsDir, "EFBComputer_HEVC8.compressorsetting");
  }
  if (c.includes("h.264") || c.includes("h264") || c.includes("avc")) {
    return join(settingsDir, "hd264DiscName.setting");
  }
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
    "brand-deck-minimal|" + JSON.stringify({
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

  await mkdir(fcpOutDir, { recursive: true });
  await mkdir(csosDir, { recursive: true });
  await mkdir(brandOutDir, { recursive: true });

  // In-memory manifest (written in step 13)
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
          const hue = (baseH + i * 25) % 360;
          const sceneHex = hslToHex(hue, Math.max(baseS, 0.3), Math.max(baseL, 0.15));
          // Pitfall: background shape class is "rectangle shape layer", NOT "rectangle".
          // "make new rectangle" produces error -2710 which the catch silently swallows,
          // falling back to ffmpeg lavfi. This was the root cause of solid-color-only
          // output from v1.7.0–v1.7.3. Text styling uses `tell text content of layer`
          // per the sdef canonical form — verified working in Pixelmator Pro 4.2.
          const script = `
tell application id "${cfg.pixelmatorBundleId}"
  set newDoc to make new document with properties {width:${width}, height:${height}, resolution:72}
  tell newDoc
    set bgLayer to make new rectangle shape layer at beginning of layers with properties {name:"bg", position:{0, 0}, width:${width}, height:${height}}
    set fill color of styles of bgLayer to {${hexToRgb16(sceneHex)}}
    set titleLayer to make new text layer at beginning of layers with properties {name:"title", text content:"Creator Studio OS"}
    tell text content of titleLayer
      set its size to 108
      set its color to {${hexToRgb16(fgHex)}}
    end tell
    set horizontal alignment of titleLayer to center
    set position of titleLayer to {${Math.round(width / 2 - 400)}, ${Math.round(height * 0.35)}}
    export to (POSIX file "${cardPath}") as PNG
  end tell
  close newDoc saving no
end tell`;
          try {
            await runAppleScript(script);
            created.push(scene.id);
          } catch (err) {
            // Only swallow E_AUTOMATION_DENIED (app not running / permission denied).
            // All other errors — including osascript exit -2710 (wrong class name) —
            // are code bugs and must propagate so they're never silently papered over.
            if (!(err instanceof CreatorStudioError && err.code === "E_AUTOMATION_DENIED")) {
              throw err;
            }
            const errMsg = err instanceof Error ? err.message : String(err);
            await appendLedger({
              ts: new Date().toISOString(),
              tool: "pixelmator_brand_card",
              projectName: project.name,
              args: { sceneId: scene.id, fallback: "ffmpeg-lavfi" },
              error: {
                code: err instanceof CreatorStudioError ? err.code : "E_INTERNAL",
                message: errMsg,
              },
              durationMs: Date.now() - t,
            }).catch(() => undefined);
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
  // Step 3: render-scene-clips
  //
  // Per-scene Motion lower-third render: clone .motn → set scene title via
  // OZML editText → headless Compressor render → waitFor per scene.
  // Produces one .mov per scene under out/.csos/scene-clips/.
  //
  // When motionTemplatePath is empty: skips gracefully. compressor-encode
  // falls back to the Pixelmator PNG slideshow path.
  //
  // Bundled Apple templates must never be mutated directly — cloneTemplate
  // copies them before any edit, so the original is always preserved.
  // -------------------------------------------------------------------------

  // Populated by this step; consumed by compressor-encode.
  const sceneClipPaths: string[] = [];
  const sceneClipsDir = join(csosDir, "scene-clips");
  const sceneMotnsDir = join(csosDir, "scene-motns");

  {
    const stepName = "render-scene-clips";
    const iHash = inputHash(stepName);
    if (isResumed(stepName, iHash, resumeManifest)) {
      yield makeStep(stepName, "skipped", "resumed from manifest", 0);
    } else {
      const t = Date.now();

      if (dryRun) {
        await mkdir(sceneClipsDir, { recursive: true });
        for (const scene of project.scenes) {
          const clipPath = join(sceneClipsDir, `${scene.id}.mov`);
          await writeFile(clipPath, Buffer.alloc(1));
          sceneClipPaths.push(clipPath);
        }
        const detail = `dry-run: wrote ${sceneClipPaths.length} stub clip(s) to .csos/scene-clips/`;
        recordStep(stepName, iHash, "completed", detail, Date.now() - t);
        yield makeStep(stepName, "completed", detail, Date.now() - t);
      } else if (!project.motionTemplatePath) {
        const detail = "skipped — no motionTemplatePath in project; compressor-encode will use Pixelmator PNG slideshow";
        recordStep(stepName, iHash, "completed", detail, Date.now() - t);
        yield makeStep(stepName, "completed", detail, Date.now() - t);
      } else {
        await mkdir(sceneClipsDir, { recursive: true });
        await mkdir(sceneMotnsDir, { recursive: true });
        const { cloneTemplate } = await import("../apps/motion/ozml.js");
        const { editText, patchSiblingText } = await import("../apps/motion/textEdit.js");
        const { renderViaCompressor } = await import("../apps/motion/render.js");
        const { waitFor } = await import("../apps/compressor/monitor.js");
        const cfg = loadConfig();
        // Scene clips are rendered as ProRes 4444 (alpha-channel) so they can be
        // composited over brand cards in compressor-encode via ffmpeg overlay.
        // Atmospheric-Lower Third and all Apple Compositions lower-third templates
        // have a transparent canvas above the lower-third band (probe confirmed
        // yuva444p12le, rows 0-779 A=0 on a 1080p frame).
        const sceneClipSettingPath = cfg.compressorProRes4444SettingPath;
        const rendered: string[] = [];
        for (const scene of project.scenes) {
          const clonedMotnPath = join(sceneMotnsDir, `${scene.id}.motn`);
          const clipPath = join(sceneClipsDir, `${scene.id}.mov`);
          await cloneTemplate(project.motionTemplatePath, clonedMotnPath);
          // Apple Compositions templates use sibling-object layout (styleRun + <text>
          // + sibling <object> elements). editText handles glyph-inside-text layout;
          // fall back to patchSiblingText when editText finds no factory nodes.
          try {
            await editText(clonedMotnPath, scene.title);
          } catch (err) {
            if (err instanceof CreatorStudioError && err.code === "E_OZML_PARAM_NOT_FOUND") {
              await patchSiblingText(clonedMotnPath, scene.title);
            } else {
              throw err;
            }
          }
          // Patch subhead (textNodeIndex=1) when project scene specifies one.
          // Clears the template's default "Description" placeholder.
          if (scene.subhead !== undefined) {
            try {
              await editText(clonedMotnPath, scene.subhead, { textNodeIndex: 1 });
            } catch (err) {
              if (err instanceof CreatorStudioError && err.code === "E_OZML_PARAM_NOT_FOUND") {
                await patchSiblingText(clonedMotnPath, scene.subhead, { textNodeIndex: 1 });
              } else {
                throw err;
              }
            }
          }
          const { jobId } = await renderViaCompressor({
            motnPath: clonedMotnPath,
            settingPath: sceneClipSettingPath,
            locationPath: clipPath,
            batchName: `csos-${project.slug}-${scene.id}`,
          });
          await waitFor({ jobId, untilStatus: "completed", timeoutSec: 120 });
          // Compressor reports "completed" before the QuickTime moov atom is
          // fully flushed to disk. Poll ffprobe until the file is readable
          // (up to 5s) before handing the path to the composite step.
          {
            const { execFile: ef } = await import("node:child_process");
            const { promisify: prom } = await import("node:util");
            const probe = prom(ef);
            let ready = false;
            for (let attempt = 0; attempt < 10; attempt++) {
              try {
                await probe("ffprobe", [
                  "-v", "error",
                  "-show_entries", "stream=codec_name",
                  "-of", "default=noprint_wrappers=1",
                  clipPath,
                ]);
                ready = true;
                break;
              } catch {
                await new Promise((r) => setTimeout(r, 500));
              }
            }
            if (!ready) {
              throw new CreatorStudioError(
                "E_COMPRESSOR_FLUSH_TIMEOUT",
                `moov atom not ready after 5s: ${clipPath}`,
                "Compressor may need more time to flush — try increasing the poll timeout",
              );
            }
          }
          sceneClipPaths.push(clipPath);
          rendered.push(scene.id);
        }
        const durationMs = Date.now() - t;
        const detail = `rendered ${rendered.length} scene clip(s) via Motion+Compressor: ${rendered.join(", ")}`;
        recordStep(stepName, iHash, "completed", detail, durationMs);
        yield makeStep(stepName, "completed", detail, durationMs);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: edit-motion-title
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
  // Step 5: resolve-fcp-params
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
  // Step 6: build-fcpxml
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
  // Step 7: safety-preflight
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
        return;
      }

      const detail = `all ${fcpParams.scenes.length} brand card(s) present`;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 8: dtd-validate
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
        }
      }

      const durationMs = Date.now() - t;
      recordStep(stepName, iHash, "completed", detail, durationMs);
      yield makeStep(stepName, "completed", detail, durationMs);
    }
  }

  // -------------------------------------------------------------------------
  // Step 9: fcp-import
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
  // Step 10: compressor-encode
  //
  // Source priority:
  //   1. Per-scene Motion clips from render-scene-clips — concat demuxer with
  //      -c copy (no transcode; Motion renders ProRes, stream through directly)
  //   2. Pixelmator PNG slideshow — ffmpeg filter_complex concat → prores_ks
  //   3. lavfi solid-color fill — last resort when Pixelmator is unavailable
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
        detail = `dry-run: would encode → ${basename(outputMovPath)} (codec=${deliverable.codec})`;
      } else {
        try {
          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);

          const slideshowPath = join(projectOutDir, `${project.slug}-src.mov`);
          const { width, height } = fcpParams.resolution;

          const firstClipSize = sceneClipPaths.length > 0
            ? await stat(sceneClipPaths[0]!).then((s) => s.size).catch(() => 0)
            : 0;
          const clipsAreReal = firstClipSize > 100;

          const firstCardSize = await stat(fcpParams.scenes[0]!.cardPath)
            .then((s) => s.size)
            .catch(() => 0);
          const cardsAreReal = firstCardSize > 100;

          if (clipsAreReal && sceneClipPaths.length === fcpParams.scenes.length && cardsAreReal) {
            // Path 1: composite brand card (background) + ProRes 4444 Motion clip (overlay)
            // per scene, then concat. The Motion clips have a transparent canvas above the
            // lower-third band (yuva444p12le, A=0 outside rows 780-960 on 1080p), so the
            // brand card shows through in the upper region.
            const compositedDir = join(csosDir, "scene-composited");
            await mkdir(compositedDir, { recursive: true });
            const compositedPaths: string[] = [];
            for (let i = 0; i < project.scenes.length; i++) {
              const scene = project.scenes[i]!;
              const compositedPath = join(compositedDir, `${scene.id}.mov`);
              await execFileAsync("ffmpeg", [
                "-y", "-loglevel", "error",
                "-loop", "1", "-t", String(scene.durationSeconds), "-i", fcpParams.scenes[i]!.cardPath,
                "-i", sceneClipPaths[i]!,
                "-filter_complex",
                `[0:v]scale=${width}:${height}:force_original_aspect_ratio=disable,setsar=1[bg];[bg][1:v]overlay=0:0:shortest=1[out]`,
                "-map", "[out]",
                "-c:v", "prores_ks",
                "-t", String(scene.durationSeconds),
                compositedPath,
              ], { maxBuffer: 20 * 1024 * 1024 });
              compositedPaths.push(compositedPath);
            }
            const concatListPath = join(csosDir, "scene-composited.txt");
            await writeFile(concatListPath, compositedPaths.map((p) => `file '${p}'`).join("\n"), "utf-8");
            await execFileAsync("ffmpeg", [
              "-y", "-loglevel", "error",
              "-f", "concat", "-safe", "0", "-i", concatListPath,
              "-c", "copy",
              slideshowPath,
            ], { maxBuffer: 10 * 1024 * 1024 });
          } else if (clipsAreReal && sceneClipPaths.length === fcpParams.scenes.length) {
            // Path 2: concat raw Motion clips — no brand cards available
            const concatListPath = join(csosDir, "scene-clips.txt");
            await writeFile(concatListPath, sceneClipPaths.map((p) => `file '${p}'`).join("\n"), "utf-8");
            await execFileAsync("ffmpeg", [
              "-y", "-loglevel", "error",
              "-f", "concat", "-safe", "0", "-i", concatListPath,
              "-c", "copy",
              slideshowPath,
            ], { maxBuffer: 10 * 1024 * 1024 });
          } else if (cardsAreReal) {
            // Path 3: PNG slideshow → ProRes transcode (no Motion clips)
            const ffArgs: string[] = ["-y", "-loglevel", "error"];
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
            ffArgs.push("-filter_complex", concatFilter, "-map", "[out]", "-c:v", "prores_ks", slideshowPath);
            await execFileAsync("ffmpeg", ffArgs, { maxBuffer: 10 * 1024 * 1024 });
          } else {
            // Path 4: lavfi solid-color fill — last resort
            const hex = project.brand.primaryColor.replace("#", "");
            await execFileAsync("ffmpeg", [
              "-y", "-loglevel", "error",
              "-f", "lavfi",
              "-i", `color=c=#${hex}:s=${width}x${height}:d=${fcpParams.totalDurationSeconds}`,
              "-c:v", "prores_ks",
              slideshowPath,
            ], { maxBuffer: 10 * 1024 * 1024 });
          }

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
            locationPath: outputMovPath,
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
  // Step 11: monitor-encode
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
  // Step 12: verify-output
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
  // Step 13: write-replay-manifest
  // -------------------------------------------------------------------------
  {
    const stepName = "write-replay-manifest";
    const t = Date.now();

    const manifest: ReplayManifest = {
      taskId,
      protocolName: opts.protocolName ?? "brand-deck-minimal",
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
    "13-step pipeline: Pixelmator brand cards per scene → optional per-scene Motion lower-third render → " +
    "FCPXML → FCP import → Compressor encode → verify. " +
    "When motionTemplatePath is set, render-scene-clips produces Motion-rendered clips and " +
    "compressor-encode uses them as the source (brand cards are the fallback). " +
    "Reads a ProjectV2 project.json. Dry-run safe. Idempotent via replay manifest.",
  stepNames: STEP_NAMES,
  run,
};
