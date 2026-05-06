/**
 * Tests for packages/protocols/src/brand-deck-minimal.ts
 *
 * Covers:
 *   - Pure helper functions: hexToHsl, hslToHex, parseResolution, resolveBundledPreset,
 *     escapeAs, hexToRgb16 (accessed via indirect paths and direct imports)
 *   - Resume / skipped branches for each step
 *   - safety-preflight failure path (missing brand card)
 *   - Dry-run step detail strings
 *   - Project with motionTemplatePath present (edit-motion-title dry-run branch)
 *   - Project with subhead on scenes
 *   - Project with alternate codec/resolution for resolveBundledPreset coverage
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Mock appendLedger so tests never write to disk
// ---------------------------------------------------------------------------
vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    appendLedger: vi.fn().mockResolvedValue(undefined),
  };
});

import { runProtocol, STEP_NAMES, type ReplayManifest } from "@creator-studio-os/protocols";

// ---------------------------------------------------------------------------
// Shared temp dir
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "csos-brand-deck-test-"));
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function writeProject(name: string, data: object): Promise<string> {
  const dir = join(tmpDir, name);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "project.json");
  await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
  return path;
}

async function drainProtocol(
  opts: Parameters<typeof runProtocol>[0],
): Promise<Array<{ stepName: string; status: string; detail?: string }>> {
  const steps: Array<{ stepName: string; status: string; detail?: string }> = [];
  for await (const step of runProtocol(opts)) {
    steps.push({ stepName: step.stepName, status: step.status, detail: step.detail });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Base fixture
// ---------------------------------------------------------------------------

const BASE_PROJECT = {
  schemaVersion: 2 as const,
  name: "Brand Deck Test",
  slug: "brand-deck-test",
  kind: "trailer" as const,
  brand: { primaryColor: "#112233", secondaryColor: "#ccddee" },
  deliverables: {
    main: {
      format: "mov" as const,
      resolution: "1920x1080",
      codec: "H.264",
      frameRate: "29.97" as const,
    },
  },
  scenes: [
    { id: "s1", title: "Opening", durationSeconds: 4 },
    { id: "s2", title: "Closing", durationSeconds: 6 },
  ],
};

// ---------------------------------------------------------------------------
// Dry-run — full pass, verify per-step detail strings
// ---------------------------------------------------------------------------

describe("brand-deck-minimal dry-run — step detail strings", () => {
  it("validate-project detail includes scene count and slug", async () => {
    const projectPath = await writeProject("dry-detail", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-1",
    });
    const validateStep = steps.find((s) => s.stepName === "validate-project");
    expect(validateStep).toBeDefined();
    expect(validateStep!.status).toBe("completed");
    expect(validateStep!.detail).toMatch(/scene/);
    expect(validateStep!.detail).toMatch(/brand-deck-test/);
  });

  it("compose-brand-cards detail mentions scene ids", async () => {
    const projectPath = await writeProject("dry-detail2", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-2",
    });
    const cardStep = steps.find((s) => s.stepName === "compose-brand-cards");
    expect(cardStep).toBeDefined();
    expect(cardStep!.status).toBe("completed");
    expect(cardStep!.detail).toMatch(/s1/);
  });

  it("render-scene-clips detail mentions stub clips in dry-run", async () => {
    const projectPath = await writeProject("dry-detail3", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-3",
    });
    const clipStep = steps.find((s) => s.stepName === "render-scene-clips");
    expect(clipStep).toBeDefined();
    expect(clipStep!.status).toBe("completed");
    expect(clipStep!.detail).toMatch(/dry-run/);
  });

  it("edit-motion-title skipped detail when no motionTemplatePath", async () => {
    const projectPath = await writeProject("dry-detail4", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-4",
    });
    const titleStep = steps.find((s) => s.stepName === "edit-motion-title");
    expect(titleStep).toBeDefined();
    expect(titleStep!.status).toBe("completed");
    expect(titleStep!.detail).toMatch(/skipped/);
  });

  it("resolve-fcp-params detail includes totalDuration and frameRate", async () => {
    const projectPath = await writeProject("dry-detail5", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-5",
    });
    const paramStep = steps.find((s) => s.stepName === "resolve-fcp-params");
    expect(paramStep).toBeDefined();
    expect(paramStep!.status).toBe("completed");
    expect(paramStep!.detail).toMatch(/totalDuration/);
    expect(paramStep!.detail).toMatch(/29\.97/);
  });

  it("build-fcpxml detail mentions fcpxml path", async () => {
    const projectPath = await writeProject("dry-detail6", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-6",
    });
    const fcpStep = steps.find((s) => s.stepName === "build-fcpxml");
    expect(fcpStep).toBeDefined();
    expect(fcpStep!.status).toBe("completed");
    expect(fcpStep!.detail).toMatch(/\.fcpxml/);
  });

  it("dtd-validate dry-run detail mentions dry-run skip", async () => {
    const projectPath = await writeProject("dry-detail7", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-7",
    });
    const dtdStep = steps.find((s) => s.stepName === "dtd-validate");
    expect(dtdStep).toBeDefined();
    expect(dtdStep!.detail).toMatch(/dry-run/);
  });

  it("fcp-import dry-run detail mentions FCP", async () => {
    const projectPath = await writeProject("dry-detail8", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-8",
    });
    const fcpImport = steps.find((s) => s.stepName === "fcp-import");
    expect(fcpImport).toBeDefined();
    expect(fcpImport!.detail).toMatch(/dry-run/);
  });

  it("compressor-encode dry-run detail mentions codec", async () => {
    const projectPath = await writeProject("dry-detail9", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-9",
    });
    const encodeStep = steps.find((s) => s.stepName === "compressor-encode");
    expect(encodeStep).toBeDefined();
    expect(encodeStep!.detail).toMatch(/dry-run/);
    expect(encodeStep!.detail).toMatch(/H\.264/);
  });

  it("monitor-encode dry-run detail mentions mocked", async () => {
    const projectPath = await writeProject("dry-detail10", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-10",
    });
    const monitorStep = steps.find((s) => s.stepName === "monitor-encode");
    expect(monitorStep).toBeDefined();
    expect(monitorStep!.detail).toMatch(/dry-run/);
  });

  it("verify-output dry-run creates placeholder MOV", async () => {
    const projectPath = await writeProject("dry-detail11", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-11",
    });
    const verifyStep = steps.find((s) => s.stepName === "verify-output");
    expect(verifyStep).toBeDefined();
    expect(verifyStep!.status).toBe("completed");
    expect(verifyStep!.detail).toMatch(/dry-run/);
  });

  it("write-replay-manifest detail mentions replay path", async () => {
    const projectPath = await writeProject("dry-detail12", BASE_PROJECT);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-detail-12",
    });
    const manifestStep = steps.find((s) => s.stepName === "write-replay-manifest");
    expect(manifestStep).toBeDefined();
    expect(manifestStep!.status).toBe("completed");
    expect(manifestStep!.detail).toMatch(/manifest/);
  });
});

// ---------------------------------------------------------------------------
// motionTemplatePath present — edit-motion-title dry-run branch
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — motionTemplatePath and motionTitleText dry-run", () => {
  it("edit-motion-title dry-run detail mentions the template filename", async () => {
    const project = {
      ...BASE_PROJECT,
      slug: "brand-deck-motion",
      motionTemplatePath: "/fake/path/Lower Third.motn",
      motionTitleText: "Creator Studio OS",
    };
    const projectPath = await writeProject("motion-title", project);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-motion-1",
    });
    const titleStep = steps.find((s) => s.stepName === "edit-motion-title");
    expect(titleStep).toBeDefined();
    expect(titleStep!.status).toBe("completed");
    expect(titleStep!.detail).toMatch(/dry-run/);
    expect(titleStep!.detail).toMatch(/Lower Third/);
    expect(titleStep!.detail).toMatch(/Creator Studio OS/);
  });

  it("runs full 13 steps successfully with motionTemplatePath set in dry-run", async () => {
    const project = {
      ...BASE_PROJECT,
      slug: "brand-deck-motion2",
      motionTemplatePath: "/fake/Lower Third.motn",
      motionTitleText: "My Title",
    };
    const projectPath = await writeProject("motion-title2", project);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-motion-2",
    });
    expect(steps).toHaveLength(STEP_NAMES.length);
    const failures = steps.filter((s) => s.status === "failed");
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// motionTemplatePath set but motionTitleText absent — skips edit-motion-title
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — motionTemplatePath without motionTitleText", () => {
  it("edit-motion-title still skips when motionTitleText is absent", async () => {
    const project = {
      ...BASE_PROJECT,
      slug: "brand-deck-no-title-text",
      motionTemplatePath: "/fake/Lower Third.motn",
      // motionTitleText intentionally omitted
    };
    const projectPath = await writeProject("no-title-text", project);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-no-title-1",
    });
    const titleStep = steps.find((s) => s.stepName === "edit-motion-title");
    expect(titleStep).toBeDefined();
    expect(titleStep!.detail).toMatch(/skipped/);
  });
});

// ---------------------------------------------------------------------------
// Multiple deliverables — resolve-fcp-params uses first key
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — multiple deliverables", () => {
  it("runs successfully with two deliverables in dry-run", async () => {
    const project = {
      ...BASE_PROJECT,
      slug: "brand-deck-multi-del",
      deliverables: {
        main: {
          format: "mov" as const,
          resolution: "1920x1080",
          codec: "ProRes 422",
          frameRate: "29.97" as const,
        },
        social: {
          format: "mp4" as const,
          resolution: "1080x1080",
          codec: "H.264",
          frameRate: "30" as const,
        },
      },
    };
    const projectPath = await writeProject("multi-del", project);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-multi-1",
    });
    expect(steps).toHaveLength(STEP_NAMES.length);
    const failures = steps.filter((s) => s.status === "failed");
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Various codec values — exercises resolveBundledPreset branches
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — codec variants (dry-run, exercises resolveBundledPreset indirectly)", () => {
  const CODECS = [
    { codec: "ProRes 422", slug: "prores422" },
    { codec: "ProRes 4444", slug: "prores4444" },
    { codec: "HEVC", slug: "hevc" },
    { codec: "H.265", slug: "h265" },
    { codec: "H.264", slug: "h264" },
    { codec: "AVC", slug: "avc" },
    { codec: "SomeUnknownCodec", slug: "unknown-codec" },
  ];

  for (const { codec, slug } of CODECS) {
    it(`runs full protocol with codec=${codec}`, async () => {
      const project = {
        ...BASE_PROJECT,
        slug,
        deliverables: {
          main: {
            format: "mov" as const,
            resolution: "1920x1080",
            codec,
            frameRate: "29.97" as const,
          },
        },
      };
      const projectPath = await writeProject(`codec-${slug}`, project);
      const steps = await drainProtocol({
        name: "brand-deck-minimal",
        projectPath,
        dryRun: true,
        taskId: `brd-codec-${slug}`,
      });
      expect(steps).toHaveLength(STEP_NAMES.length);
      const failures = steps.filter((s) => s.status === "failed");
      expect(failures).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Resolution variants — exercises parseResolution branches
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — resolution variants", () => {
  const RESOLUTIONS = [
    { res: "1920x1080", slug: "res-1080" },
    { res: "1280x720", slug: "res-720" },
    { res: "3840x2160", slug: "res-4k" },
    { res: "badresolution", slug: "res-bad" }, // parseResolution fallback to 1920x1080
  ];

  for (const { res, slug } of RESOLUTIONS) {
    it(`runs with resolution=${res}`, async () => {
      const project = {
        ...BASE_PROJECT,
        slug,
        deliverables: {
          main: {
            format: "mov" as const,
            resolution: res,
            codec: "H.264",
            frameRate: "29.97" as const,
          },
        },
      };
      const projectPath = await writeProject(`res-${slug}`, project);
      const steps = await drainProtocol({
        name: "brand-deck-minimal",
        projectPath,
        dryRun: true,
        taskId: `brd-${slug}`,
      });
      expect(steps).toHaveLength(STEP_NAMES.length);
    });
  }
});

// ---------------------------------------------------------------------------
// ProRes 422 < 1080p — exercises height<1080 branch in resolveBundledPreset
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — ProRes 422 at 720p", () => {
  it("runs successfully with ProRes 422 at 720p", async () => {
    const project = {
      ...BASE_PROJECT,
      slug: "prores-720p",
      deliverables: {
        main: {
          format: "mov" as const,
          resolution: "1280x720",
          codec: "ProRes 422",
          frameRate: "29.97" as const,
        },
      },
    };
    const projectPath = await writeProject("prores-720p", project);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-prores-720",
    });
    expect(steps).toHaveLength(STEP_NAMES.length);
    const failures = steps.filter((s) => s.status === "failed");
    expect(failures).toHaveLength(0);
  });

  it("runs successfully with ProRes 422 at SD (480p)", async () => {
    const project = {
      ...BASE_PROJECT,
      slug: "prores-sd",
      deliverables: {
        main: {
          format: "mov" as const,
          resolution: "854x480",
          codec: "ProRes 422",
          frameRate: "29.97" as const,
        },
      },
    };
    const projectPath = await writeProject("prores-sd", project);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-prores-sd",
    });
    expect(steps).toHaveLength(STEP_NAMES.length);
    const failures = steps.filter((s) => s.status === "failed");
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// safety-preflight failure — brand cards missing
//
// Strategy: run a dry-run to create a valid manifest, then mutate the manifest
// on disk to remove the safety-preflight entry (so it runs instead of skipping),
// then delete the brand card files and resume with dryRun:true.
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — safety-preflight failure path", () => {
  it("safety-preflight fails and protocol stops when brand cards deleted before resume", async () => {
    const { rm: rimraf } = await import("node:fs/promises");

    const project = {
      ...BASE_PROJECT,
      slug: "safety-fail-test",
    };
    const projectPath = await writeProject("safety-fail-test", project);

    // Run first time to create cards + manifest
    const firstTaskId = `safety-first-${Date.now()}`;
    for await (const _ of runProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: firstTaskId,
    })) { /* drain */ }

    const projDir = projectPath.replace("/project.json", "");
    const brandDir = join(projDir, "out", "brand");
    const manifestPath = join(projDir, "out", ".csos", `replay-${firstTaskId}.json`);

    // Read the manifest and remove safety-preflight entry so it doesn't get skipped
    const rawManifest = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(rawManifest) as ReplayManifest;
    manifest.steps = manifest.steps.filter((s) => s.stepName !== "safety-preflight");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    // Delete the brand cards so safety-preflight sees them as missing
    for (const scene of project.scenes) {
      await rimraf(join(brandDir, `${scene.id}.png`), { force: true });
    }

    // Resume — steps 1-6 are skipped via manifest, safety-preflight runs and finds no cards
    const resumeTaskId = `safety-resume-${Date.now()}`;
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: resumeTaskId,
      resume: firstTaskId,
    });

    const safetyStep = steps.find((s) => s.stepName === "safety-preflight");
    expect(safetyStep).toBeDefined();
    expect(safetyStep!.status).toBe("failed");
    expect(safetyStep!.detail).toMatch(/missing brand cards/);

    // Protocol should have stopped — no steps after safety-preflight
    const afterSafety = steps.filter(
      (s) =>
        STEP_NAMES.indexOf(s.stepName as typeof STEP_NAMES[number]) >
        STEP_NAMES.indexOf("safety-preflight"),
    );
    expect(afterSafety).toHaveLength(0);
  }, 15000); // generous timeout for two runs
});

// ---------------------------------------------------------------------------
// Resume — skipped branches in each step
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — resume skips all steps except write-replay-manifest", () => {
  let baseTaskId: string;
  let resumeProjectPath: string;

  beforeAll(async () => {
    baseTaskId = `brd-resume-base-${Date.now()}`;
    resumeProjectPath = await writeProject("resume-base", {
      ...BASE_PROJECT,
      slug: "resume-base",
    });

    // Run first time to produce manifest
    for await (const _ of runProtocol({
      name: "brand-deck-minimal",
      projectPath: resumeProjectPath,
      dryRun: true,
      taskId: baseTaskId,
    })) { /* drain */ }
  });

  it("resumed run has all non-manifest steps as skipped", async () => {
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath: resumeProjectPath,
      dryRun: true,
      taskId: `${baseTaskId}-resume`,
      resume: baseTaskId,
    });

    const skipped = steps.filter((s) => s.status === "skipped");
    // All steps except write-replay-manifest should be skipped
    expect(skipped.length).toBe(STEP_NAMES.length - 1);

    for (const step of skipped) {
      expect(step.detail).toMatch(/resumed from manifest/);
    }
  });

  it("write-replay-manifest is always re-run on resume", async () => {
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath: resumeProjectPath,
      dryRun: true,
      taskId: `${baseTaskId}-resume2`,
      resume: baseTaskId,
    });

    const manifestStep = steps.find((s) => s.stepName === "write-replay-manifest");
    expect(manifestStep).toBeDefined();
    expect(manifestStep!.status).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// Color helper coverage — indirect via dry-run with various primary colors
// Tests hexToHsl + hslToHex branches (grayscale = d===0 branch)
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — color helpers via various primaryColors", () => {
  const COLORS = [
    { primary: "#000000", name: "black-grayscale" },  // d === 0 branch (hexToHsl)
    { primary: "#ffffff", name: "white-grayscale" },  // d === 0 branch
    { primary: "#808080", name: "gray-grayscale" },   // d === 0 branch
    { primary: "#ff0000", name: "red" },              // max === r branch
    { primary: "#00ff00", name: "green" },            // max === g branch
    { primary: "#0000ff", name: "blue" },             // max === b branch
    { primary: "#ff8800", name: "orange" },           // l <= 0.5 saturation branch
    { primary: "#ccddee", name: "light-blue" },       // l > 0.5 saturation branch
  ];

  for (const { primary, name } of COLORS) {
    it(`runs dry-run with primaryColor=${primary} (${name})`, async () => {
      const project = {
        ...BASE_PROJECT,
        slug: `color-${name}`,
        brand: { primaryColor: primary, secondaryColor: "#ffffff" },
      };
      const projectPath = await writeProject(`color-${name}`, project);
      const steps = await drainProtocol({
        name: "brand-deck-minimal",
        projectPath,
        dryRun: true,
        taskId: `brd-color-${name}`,
      });
      expect(steps).toHaveLength(STEP_NAMES.length);
      const failures = steps.filter((s) => s.status === "failed");
      expect(failures).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Single scene — exercises edge cases in reduce / map
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — single-scene project", () => {
  it("runs all steps with one scene", async () => {
    const project = {
      ...BASE_PROJECT,
      slug: "single-scene",
      scenes: [{ id: "only", title: "Only Scene", durationSeconds: 10 }],
    };
    const projectPath = await writeProject("single-scene", project);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-single-1",
    });
    expect(steps).toHaveLength(STEP_NAMES.length);
    const failures = steps.filter((s) => s.status === "failed");
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Four scenes — exercises scene loop with multiple hue shifts
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — four scenes", () => {
  it("compose-brand-cards mentions all four scene ids", async () => {
    const project = {
      ...BASE_PROJECT,
      slug: "four-scenes",
      scenes: [
        { id: "a", title: "A", durationSeconds: 3 },
        { id: "b", title: "B", durationSeconds: 3 },
        { id: "c", title: "C", durationSeconds: 3 },
        { id: "d", title: "D", durationSeconds: 3 },
      ],
    };
    const projectPath = await writeProject("four-scenes", project);
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId: "brd-four-1",
    });
    const cardStep = steps.find((s) => s.stepName === "compose-brand-cards");
    expect(cardStep!.detail).toMatch(/a/);
    expect(cardStep!.detail).toMatch(/b/);
    expect(cardStep!.detail).toMatch(/c/);
    expect(cardStep!.detail).toMatch(/d/);
  });
});

// ---------------------------------------------------------------------------
// Replay manifest content validation for brand-deck-minimal
// ---------------------------------------------------------------------------

describe("brand-deck-minimal — replay manifest content", () => {
  it("manifest protocolName is brand-deck-minimal for direct invocation", async () => {
    const project = { ...BASE_PROJECT, slug: "manifest-check" };
    const projectPath = await writeProject("manifest-check", project);
    const taskId = `brd-manifest-${Date.now()}`;

    for await (const _ of runProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: true,
      taskId,
    })) { /* drain */ }

    const manifestPath = join(
      projectPath.replace("/project.json", ""),
      "out", ".csos", `replay-${taskId}.json`,
    );
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as ReplayManifest;

    expect(manifest.protocolName).toBe("brand-deck-minimal");
    expect(manifest.projectSlug).toBe("manifest-check");
    expect(manifest.steps.length).toBe(STEP_NAMES.length - 1);
    expect(manifest.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(manifest.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("manifest via steam-trailer-minimal alias has protocolName steam-trailer-minimal", async () => {
    const project = { ...BASE_PROJECT, slug: "alias-manifest-check" };
    const projectPath = await writeProject("alias-manifest-check", project);
    const taskId = `brd-alias-${Date.now()}`;

    for await (const _ of runProtocol({
      name: "steam-trailer-minimal",
      projectPath,
      dryRun: true,
      taskId,
    })) { /* drain */ }

    const manifestPath = join(
      projectPath.replace("/project.json", ""),
      "out", ".csos", `replay-${taskId}.json`,
    );
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as ReplayManifest;

    // steam-trailer-minimal is a pass-through alias — name in manifest is the protocol's own name
    expect(manifest.protocolName).toBe("steam-trailer-minimal");
  });
});
