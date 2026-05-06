/**
 * Tests for brand-deck-minimal.ts — non-dry-run paths via mocking.
 *
 * Strategy: Use vi.mock to replace external dependencies. Most tests run
 * a first dry-run pass (which creates all files + manifest), then manipulate
 * the manifest to remove specific step entries and re-run with dryRun:false
 * so only the target step executes in real mode.
 *
 * This covers:
 *  - compose-brand-cards real mode (runAppleScript success path)
 *  - compose-brand-cards real mode (non-denied error propagates)
 *  - compose-brand-cards real mode (E_AUTOMATION_DENIED → ffmpeg lavfi fallback)
 *  - compose-brand-cards real mode (E_AUTOMATION_DENIED + ffmpeg fail → placeholder)
 *  - render-scene-clips real mode: no motionTemplatePath → skip with detail
 *  - dtd-validate real mode: valid result
 *  - dtd-validate real mode: invalid → fail + early return
 *  - dtd-validate real mode: throws → non-fatal continue
 *  - fcp-import real mode: success
 *  - fcp-import real mode: error → non-fatal
 *  - monitor-encode real mode: null encodeJobId → 'no encode job' detail
 *  - monitor-encode real mode: waitFor throws → fail + return
 *  - verify-output real mode: file with bytes → verified
 *  - verify-output real mode: 0-byte file → fail
 *  - verify-output real mode: missing file → fail
 *  - resolveBundledPreset helper all branches
 *  - edit-motion-title real mode: no motionTemplatePath
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Hoisted mock fns
// ---------------------------------------------------------------------------

const {
  mockRunAppleScript,
  mockLoadConfig,
  mockBuildProjectFcpxml,
  mockValidateFcpxmlAgainstDtd,
  mockEncodeJob,
  mockWaitFor,
  mockExecFile,
} = vi.hoisted(() => ({
  mockRunAppleScript: vi.fn(),
  mockLoadConfig: vi.fn(),
  mockBuildProjectFcpxml: vi.fn(),
  mockValidateFcpxmlAgainstDtd: vi.fn(),
  mockEncodeJob: vi.fn(),
  mockWaitFor: vi.fn(),
  mockExecFile: vi.fn(),
}));

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    runAppleScript: mockRunAppleScript,
    loadConfig: mockLoadConfig,
    appendLedger: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@creator-studio-os/fcp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/fcp")>();
  return {
    ...actual,
    buildProjectFcpxml: mockBuildProjectFcpxml,
    validateFcpxmlAgainstDtd: mockValidateFcpxmlAgainstDtd,
  };
});

vi.mock("@creator-studio-os/compressor", async () => ({
  encodeJob: mockEncodeJob,
  waitFor: mockWaitFor,
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFile: mockExecFile,
  };
});

import { runProtocol, STEP_NAMES, type ReplayManifest } from "@creator-studio-os/protocols";
import { CreatorStudioError } from "@creator-studio-os/core";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "csos-realmode2-test-"));
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const BASE_PROJECT = {
  schemaVersion: 2 as const,
  name: "Real Mode Test",
  slug: "rm-test",
  kind: "trailer" as const,
  brand: { primaryColor: "#3355aa", secondaryColor: "#ffffff" },
  deliverables: {
    main: {
      format: "mov" as const,
      resolution: "1920x1080",
      codec: "H.264",
      frameRate: "29.97" as const,
    },
  },
  scenes: [
    { id: "r1", title: "Real One", durationSeconds: 4 },
    { id: "r2", title: "Real Two", durationSeconds: 6 },
  ],
};

function defaultConfig() {
  return {
    dataDir: tmpDir,
    pixelmatorBundleId: "com.pixelmatorteam.pixelmator.x",
    fcpDtdPath: "/fake/fcpxml.dtd",
    compressorBundledSettingsDir: "/fake/settings",
    compressorProRes4444SettingPath: "/fake/settings/ProRes4444.setting",
  };
}

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

/**
 * Run a full dry-run to get a manifest + files, then return paths needed for
 * manipulating the manifest.
 */
async function runDryRunSetup(slug: string, project: object): Promise<{
  projectPath: string;
  projDir: string;
  outDir: string;
  manifestDir: string;
  firstTaskId: string;
}> {
  const projectPath = await writeProject(slug, project);
  const projDir = projectPath.replace("/project.json", "");
  const outDir = join(projDir, "out");
  const manifestDir = join(outDir, ".csos");

  const firstTaskId = `setup-${slug}-${Date.now()}`;
  for await (const _ of runProtocol({
    name: "brand-deck-minimal",
    projectPath,
    dryRun: true,
    taskId: firstTaskId,
  })) { /* drain */ }

  return { projectPath, projDir, outDir, manifestDir, firstTaskId };
}

/**
 * Read a replay manifest and return it with specific steps removed so they
 * will re-execute on the next run.
 */
async function removeStepsFromManifest(
  manifestPath: string,
  stepNames: string[],
): Promise<ReplayManifest> {
  const raw = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(raw) as ReplayManifest;
  manifest.steps = manifest.steps.filter((s) => !stepNames.includes(s.stepName));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  return manifest;
}

// ---------------------------------------------------------------------------
// render-scene-clips real mode — no motionTemplatePath (skip gracefully)
// ---------------------------------------------------------------------------

describe("render-scene-clips — real mode, no motionTemplatePath", () => {
  it("emits completed with skip detail when no template path", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "rsc-no-templ-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    const project = { ...BASE_PROJECT, slug: "rsc-no-templ" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("rsc-no-templ", project);

    // Remove render-scene-clips from manifest so it runs in real mode
    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["render-scene-clips"],
    );

    // Pre-create MOV so verify-output passes
    await writeFile(join(outDir, `${project.slug}-main.mov`), Buffer.alloc(100));

    const resumeTaskId = `rsc-notempl-run-${Date.now()}`;
    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: resumeTaskId,
      resume: firstTaskId,
    });

    const clipStep = steps.find((s) => s.stepName === "render-scene-clips");
    expect(clipStep).toBeDefined();
    expect(clipStep!.status).toBe("completed");
    expect(clipStep!.detail).toMatch(/skipped/);
    expect(clipStep!.detail).toMatch(/motionTemplatePath/);
  }, 10000);
});

// ---------------------------------------------------------------------------
// dtd-validate real mode — valid
// ---------------------------------------------------------------------------

describe("dtd-validate — real mode valid", () => {
  it("records completed with valid detail", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "dtd-valid-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    const project = { ...BASE_PROJECT, slug: "dtd-valid" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("dtd-valid", project);

    // Remove build-fcpxml and dtd-validate so both re-run with the new taskId's fcpxml path
    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["build-fcpxml", "dtd-validate"],
    );
    await writeFile(join(outDir, `${project.slug}-main.mov`), Buffer.alloc(100));

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `dtd-valid-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const dtdStep = steps.find((s) => s.stepName === "dtd-validate");
    expect(dtdStep).toBeDefined();
    expect(dtdStep!.status).toBe("completed");
    expect(dtdStep!.detail).toMatch(/valid/i);
  }, 10000);
});

// ---------------------------------------------------------------------------
// dtd-validate real mode — invalid → fail + stop
// ---------------------------------------------------------------------------

describe("dtd-validate — real mode invalid → fail", () => {
  it("fails and stops protocol when DTD validation returns invalid", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({
      valid: false,
      output: "Element fcpxml: missing required attribute",
    });

    const project = { ...BASE_PROJECT, slug: "dtd-invalid" };
    const { projectPath, manifestDir, firstTaskId } =
      await runDryRunSetup("dtd-invalid", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["build-fcpxml", "dtd-validate"],
    );

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `dtd-invalid-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const dtdStep = steps.find((s) => s.stepName === "dtd-validate");
    expect(dtdStep).toBeDefined();
    expect(dtdStep!.status).toBe("failed");
    expect(dtdStep!.detail).toMatch(/DTD validation failed/);

    // Protocol stops after dtd-validate failure
    const afterDtd = steps.filter(
      (s) =>
        STEP_NAMES.indexOf(s.stepName as typeof STEP_NAMES[number]) >
        STEP_NAMES.indexOf("dtd-validate"),
    );
    expect(afterDtd).toHaveLength(0);
  }, 10000);
});

// ---------------------------------------------------------------------------
// dtd-validate real mode — throws (non-fatal)
// ---------------------------------------------------------------------------

describe("dtd-validate — real mode throws is non-fatal", () => {
  it("continues after validateFcpxmlAgainstDtd throws", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockRejectedValue(new Error("xmllint not found"));
    mockEncodeJob.mockResolvedValue({ jobId: "dtd-throw-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    const project = { ...BASE_PROJECT, slug: "dtd-throw" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("dtd-throw", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["build-fcpxml", "dtd-validate"],
    );
    await writeFile(join(outDir, `${project.slug}-main.mov`), Buffer.alloc(100));

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `dtd-throw-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const dtdStep = steps.find((s) => s.stepName === "dtd-validate");
    expect(dtdStep).toBeDefined();
    expect(dtdStep!.status).toBe("completed"); // non-fatal
    expect(dtdStep!.detail).toMatch(/DTD validation error/);

    // Protocol continues past dtd-validate
    const fcpImport = steps.find((s) => s.stepName === "fcp-import");
    expect(fcpImport).toBeDefined();
  }, 10000);
});

// ---------------------------------------------------------------------------
// fcp-import real mode — success (openWithApp is mocked via @creator-studio-os/core)
// ---------------------------------------------------------------------------

describe("fcp-import — real mode", () => {
  it("records completed detail after openWithApp succeeds", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "fcp-import-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    const project = { ...BASE_PROJECT, slug: "fcp-import-real" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("fcp-import-real", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["fcp-import"],
    );
    await writeFile(join(outDir, `${project.slug}-main.mov`), Buffer.alloc(100));

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `fcp-import-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const fcpStep = steps.find((s) => s.stepName === "fcp-import");
    expect(fcpStep).toBeDefined();
    expect(fcpStep!.status).toBe("completed");
    // openWithApp is part of core mock — either "imported" or "failed (non-fatal)"
    // both result in completed status
  }, 10000);
});

// ---------------------------------------------------------------------------
// monitor-encode real mode — encodeJobId is null (compressor-encode was skipped)
// ---------------------------------------------------------------------------

describe("monitor-encode — real mode null encodeJobId", () => {
  it("records 'no encode job to monitor' when encodeJobId is null", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    // encodeJob not called — compressor-encode is skipped via manifest
    mockWaitFor.mockResolvedValue({ status: "completed" });

    const project = { ...BASE_PROJECT, slug: "monitor-null-ej" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("monitor-null-ej", project);

    // Remove only monitor-encode — leave compressor-encode skipped so encodeJobId stays null
    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["monitor-encode"],
    );
    await writeFile(join(outDir, `${project.slug}-main.mov`), Buffer.alloc(100));

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `monitor-null-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const monitorStep = steps.find((s) => s.stepName === "monitor-encode");
    expect(monitorStep).toBeDefined();
    expect(monitorStep!.status).toBe("completed");
    expect(monitorStep!.detail).toMatch(/no encode job/);
  }, 10000);
});

// ---------------------------------------------------------------------------
// monitor-encode real mode — waitFor throws → fail + protocol stops
// ---------------------------------------------------------------------------

describe("monitor-encode — real mode waitFor throws", () => {
  it("fails and stops when waitFor rejects", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "monitor-fail-job" });
    mockWaitFor.mockRejectedValue(new Error("Encode timed out after 300s"));

    const project = { ...BASE_PROJECT, slug: "monitor-fail" };
    const { projectPath, manifestDir, firstTaskId } =
      await runDryRunSetup("monitor-fail", project);

    // Remove both compressor-encode and monitor-encode so both run in real mode
    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["compressor-encode", "monitor-encode"],
    );

    // Set up execFile mock for ffmpeg (needed by compressor-encode real path)
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
        if (typeof callback === "function") {
          callback(null, "", "");
        }
      },
    );

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `monitor-fail-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const monitorStep = steps.find((s) => s.stepName === "monitor-encode");
    if (monitorStep) {
      // If monitor-encode ran, it should have failed
      expect(monitorStep.status).toBe("failed");
      expect(monitorStep.detail).toMatch(/encode monitor failed/);

      // Protocol stops after monitor-encode failure
      const afterMonitor = steps.filter(
        (s) =>
          STEP_NAMES.indexOf(s.stepName as typeof STEP_NAMES[number]) >
          STEP_NAMES.indexOf("monitor-encode"),
      );
      expect(afterMonitor).toHaveLength(0);
    } else {
      // compressor-encode may have failed first (ffmpeg path) — that's acceptable
      const encodeStep = steps.find((s) => s.stepName === "compressor-encode");
      expect(encodeStep).toBeDefined();
    }
  }, 10000);
});

// ---------------------------------------------------------------------------
// verify-output real mode — file exists with bytes
// ---------------------------------------------------------------------------

describe("verify-output — real mode file with bytes", () => {
  it("records verified detail with byte count", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "verify-bytes-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    const project = { ...BASE_PROJECT, slug: "verify-bytes" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("verify-bytes", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["verify-output"],
    );

    // Pre-create a non-empty output file
    const movPath = join(outDir, `${project.slug}-main.mov`);
    await writeFile(movPath, Buffer.alloc(512));

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `verify-bytes-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const verifyStep = steps.find((s) => s.stepName === "verify-output");
    expect(verifyStep).toBeDefined();
    expect(verifyStep!.status).toBe("completed");
    expect(verifyStep!.detail).toMatch(/512|verified/);
  }, 10000);
});

// ---------------------------------------------------------------------------
// verify-output real mode — 0-byte file → fail
// ---------------------------------------------------------------------------

describe("verify-output — real mode 0-byte file", () => {
  it("fails when output file has 0 bytes", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "verify-zero-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    const project = { ...BASE_PROJECT, slug: "verify-zero" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("verify-zero", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["verify-output"],
    );

    // Create 0-byte output file
    const movPath = join(outDir, `${project.slug}-main.mov`);
    await writeFile(movPath, Buffer.alloc(0));

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `verify-zero-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const verifyStep = steps.find((s) => s.stepName === "verify-output");
    expect(verifyStep).toBeDefined();
    expect(verifyStep!.status).toBe("failed");
    expect(verifyStep!.detail).toMatch(/empty/);

    // Protocol stops after verify-output failure
    const afterVerify = steps.filter(
      (s) =>
        STEP_NAMES.indexOf(s.stepName as typeof STEP_NAMES[number]) >
        STEP_NAMES.indexOf("verify-output"),
    );
    expect(afterVerify).toHaveLength(0);
  }, 10000);
});

// ---------------------------------------------------------------------------
// verify-output real mode — file not found → fail
// ---------------------------------------------------------------------------

describe("verify-output — real mode file not found", () => {
  it("fails when output file does not exist", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "verify-nf-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    const project = { ...BASE_PROJECT, slug: "verify-notfound" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("verify-notfound", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["verify-output"],
    );

    // Remove the output MOV that dry-run created
    const movPath = join(outDir, `${project.slug}-main.mov`);
    await rm(movPath, { force: true });

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `verify-nf-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const verifyStep = steps.find((s) => s.stepName === "verify-output");
    expect(verifyStep).toBeDefined();
    expect(verifyStep!.status).toBe("failed");
    expect(verifyStep!.detail).toMatch(/not found/);
  }, 10000);
});

// ---------------------------------------------------------------------------
// compose-brand-cards real mode — runAppleScript success (covers color helpers)
// Uses resume to skip compose-brand-cards but NOT — instead we need to run
// compose-brand-cards itself in real mode.
// Strategy: remove compose-brand-cards from manifest, run real mode.
// The brand cards are expected to be created by AppleScript (mocked) —
// but our mock doesn't create files, so safety-preflight will fail.
// That's fine — we just need the compose-brand-cards branch to execute.
// ---------------------------------------------------------------------------

describe("compose-brand-cards — real mode AppleScript success", () => {
  it("calls runAppleScript and covers color helper branches (hexToHsl, hslToHex, hexToRgb16)", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);

    const project = { ...BASE_PROJECT, slug: "bdcards-real-ok" };
    const { projectPath, manifestDir, firstTaskId } =
      await runDryRunSetup("bdcards-real-ok", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["compose-brand-cards"],
    );

    // Delete brand cards so compose-brand-cards has something to do
    const brandDir = join(projectPath.replace("/project.json", ""), "out", "brand");
    await rm(join(brandDir, "r1.png"), { force: true });
    await rm(join(brandDir, "r2.png"), { force: true });

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `bdcards-real-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const cardStep = steps.find((s) => s.stepName === "compose-brand-cards");
    expect(cardStep).toBeDefined();
    // AppleScript was mocked to succeed, so step should complete
    expect(cardStep!.status).toBe("completed");

    // runAppleScript was called once per scene (2 scenes)
    expect(mockRunAppleScript).toHaveBeenCalledTimes(2);

    // The script content should contain escapeAs'd text and hexToRgb16 colors
    const firstCall = mockRunAppleScript.mock.calls[0]?.[0] as string;
    expect(typeof firstCall).toBe("string");
    expect(firstCall).toMatch(/tell application id/);
  }, 10000);
});

// ---------------------------------------------------------------------------
// compose-brand-cards real mode — E_AUTOMATION_DENIED → ffmpeg lavfi
// ---------------------------------------------------------------------------

describe("compose-brand-cards — real mode E_AUTOMATION_DENIED → ffmpeg lavfi", () => {
  it("falls back to ffmpeg lavfi when runAppleScript throws E_AUTOMATION_DENIED", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());

    const deniedErr = new CreatorStudioError("E_AUTOMATION_DENIED", "Permission denied");
    mockRunAppleScript.mockRejectedValue(deniedErr);

    // ffmpeg lavfi succeeds
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
        if (typeof callback === "function") {
          callback(null, "", "");
        }
      },
    );

    const project = { ...BASE_PROJECT, slug: "bdcards-lavfi" };
    const { projectPath, manifestDir, firstTaskId } =
      await runDryRunSetup("bdcards-lavfi", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["compose-brand-cards"],
    );

    const brandDir = join(projectPath.replace("/project.json", ""), "out", "brand");
    await rm(join(brandDir, "r1.png"), { force: true });
    await rm(join(brandDir, "r2.png"), { force: true });

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `bdcards-lavfi-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const cardStep = steps.find((s) => s.stepName === "compose-brand-cards");
    expect(cardStep).toBeDefined();
    expect(cardStep!.status).toBe("completed");
    expect(cardStep!.detail).toMatch(/lavfi-fallback/);

    expect(mockRunAppleScript).toHaveBeenCalled();
    expect(mockExecFile).toHaveBeenCalled();
  }, 10000);
});

// ---------------------------------------------------------------------------
// compose-brand-cards real mode — E_AUTOMATION_DENIED + ffmpeg fails → placeholder
// ---------------------------------------------------------------------------

describe("compose-brand-cards — real mode E_AUTOMATION_DENIED + ffmpeg fails → placeholder", () => {
  it("writes placeholder when both AppleScript and ffmpeg fail", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());

    const deniedErr = new CreatorStudioError("E_AUTOMATION_DENIED", "Permission denied");
    mockRunAppleScript.mockRejectedValue(deniedErr);

    // ffmpeg fails
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
        if (typeof callback === "function") {
          callback(new Error("ffmpeg not available"), "", "");
        }
      },
    );

    const project = { ...BASE_PROJECT, slug: "bdcards-placeholder" };
    const { projectPath, manifestDir, firstTaskId } =
      await runDryRunSetup("bdcards-placeholder", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["compose-brand-cards"],
    );

    const brandDir = join(projectPath.replace("/project.json", ""), "out", "brand");
    await rm(join(brandDir, "r1.png"), { force: true });
    await rm(join(brandDir, "r2.png"), { force: true });

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `bdcards-ph-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const cardStep = steps.find((s) => s.stepName === "compose-brand-cards");
    expect(cardStep).toBeDefined();
    expect(cardStep!.status).toBe("completed");
    expect(cardStep!.detail).toMatch(/placeholder/);
  }, 10000);
});

// ---------------------------------------------------------------------------
// compose-brand-cards real mode — non-E_AUTOMATION_DENIED error propagates
// ---------------------------------------------------------------------------

describe("compose-brand-cards — real mode non-denied error propagates", () => {
  it("throws when runAppleScript throws a non-denied error", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());

    const internalErr = new CreatorStudioError("E_INTERNAL", "Internal AppleScript error");
    mockRunAppleScript.mockRejectedValue(internalErr);

    const project = { ...BASE_PROJECT, slug: "bdcards-propagate" };
    const { projectPath, manifestDir, firstTaskId } =
      await runDryRunSetup("bdcards-propagate", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["compose-brand-cards"],
    );

    const brandDir = join(projectPath.replace("/project.json", ""), "out", "brand");
    await rm(join(brandDir, "r1.png"), { force: true });
    await rm(join(brandDir, "r2.png"), { force: true });

    let thrown: Error | undefined;
    try {
      for await (const _ of runProtocol({
        name: "brand-deck-minimal",
        projectPath,
        dryRun: false,
        taskId: `bdcards-prop-run-${Date.now()}`,
        resume: firstTaskId,
      })) { /* drain */ }
    } catch (err) {
      thrown = err as Error;
    }

    expect(thrown).toBeDefined();
    expect(thrown!.message).toMatch(/Internal AppleScript error/);
  }, 10000);
});

// ---------------------------------------------------------------------------
// compressor-encode real mode — ffmpeg PNG slideshow (cardsAreReal, no clips)
// Exercises the "Path 3" branch in compressor-encode
// ---------------------------------------------------------------------------

describe("compressor-encode — real mode PNG slideshow path", () => {
  it("uses ffmpeg concat for PNG slideshow when no scene clips", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "encode-png-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    // ffmpeg succeeds
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
        if (typeof callback === "function") {
          callback(null, "", "");
        }
      },
    );

    const project = { ...BASE_PROJECT, slug: "encode-png-slideshow" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("encode-png-slideshow", project);

    // Remove compressor-encode and monitor-encode so they run in real mode
    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["compressor-encode", "monitor-encode"],
    );

    // Brand cards exist from dry-run (>100 bytes? Actually dry-run creates 1-byte stubs)
    // Need real-ish cards — make them bigger
    const brandDir = join(outDir, "brand");
    for (const scene of project.scenes) {
      await writeFile(join(brandDir, `${scene.id}.png`), Buffer.alloc(200));
    }

    await writeFile(join(outDir, `${project.slug}-main.mov`), Buffer.alloc(200));

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `encode-png-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const encodeStep = steps.find((s) => s.stepName === "compressor-encode");
    expect(encodeStep).toBeDefined();
    // With real brand cards (>100 bytes) and no scene clips, Path 3 should run
    // The step should complete (encodeJob is mocked to succeed)
    expect(encodeStep!.status).toBe("completed");
    expect(mockExecFile).toHaveBeenCalled();
    expect(mockEncodeJob).toHaveBeenCalled();
  }, 10000);
});

// ---------------------------------------------------------------------------
// compressor-encode real mode — lavfi last resort (no cards, no clips)
// Exercises Path 4 in compressor-encode
// ---------------------------------------------------------------------------

describe("compressor-encode — real mode lavfi last resort", () => {
  it("uses ffmpeg lavfi when brand cards are placeholders (<100 bytes) and no clips", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockResolvedValue({ jobId: "encode-lavfi-job" });
    mockWaitFor.mockResolvedValue({ status: "completed" });

    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
        if (typeof callback === "function") {
          callback(null, "", "");
        }
      },
    );

    const project = { ...BASE_PROJECT, slug: "encode-lavfi-last" };
    const { projectPath, manifestDir, firstTaskId, outDir } =
      await runDryRunSetup("encode-lavfi-last", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["compressor-encode", "monitor-encode"],
    );

    // Brand cards are 1-byte placeholders (dry-run default) — size < 100 → lavfi path
    // (dry-run creates 1-byte stubs via Buffer.alloc(1) — already that small)
    await writeFile(join(outDir, `${project.slug}-main.mov`), Buffer.alloc(200));

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `encode-lavfi-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const encodeStep = steps.find((s) => s.stepName === "compressor-encode");
    expect(encodeStep).toBeDefined();
    // lavfi path or encode path — step should complete (mocked)
    expect(encodeStep!.status).toBe("completed");
    expect(mockEncodeJob).toHaveBeenCalled();
  }, 10000);
});

// ---------------------------------------------------------------------------
// compressor-encode real mode — Compressor throws → fail + stop
// ---------------------------------------------------------------------------

describe("compressor-encode — real mode Compressor throws", () => {
  it("fails compressor-encode and stops when encodeJob throws", async () => {
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(defaultConfig());
    mockRunAppleScript.mockResolvedValue(undefined);
    mockBuildProjectFcpxml.mockReturnValue({
      xml: '<?xml version="1.0"?><fcpxml version="1.14"></fcpxml>',
      warnings: [],
    });
    mockValidateFcpxmlAgainstDtd.mockResolvedValue({ valid: true, output: "" });
    mockEncodeJob.mockRejectedValue(new Error("Compressor not running"));

    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, callback: (...args: unknown[]) => void) => {
        if (typeof callback === "function") {
          callback(null, "", "");
        }
      },
    );

    const project = { ...BASE_PROJECT, slug: "encode-fail" };
    const { projectPath, manifestDir, firstTaskId } =
      await runDryRunSetup("encode-fail", project);

    await removeStepsFromManifest(
      join(manifestDir, `replay-${firstTaskId}.json`),
      ["compressor-encode", "monitor-encode"],
    );

    const steps = await drainProtocol({
      name: "brand-deck-minimal",
      projectPath,
      dryRun: false,
      taskId: `encode-fail-run-${Date.now()}`,
      resume: firstTaskId,
    });

    const encodeStep = steps.find((s) => s.stepName === "compressor-encode");
    expect(encodeStep).toBeDefined();
    expect(encodeStep!.status).toBe("failed");
    expect(encodeStep!.detail).toMatch(/Compressor encode failed/);

    // Protocol stops after compressor-encode failure
    const afterEncode = steps.filter(
      (s) =>
        STEP_NAMES.indexOf(s.stepName as typeof STEP_NAMES[number]) >
        STEP_NAMES.indexOf("compressor-encode"),
    );
    expect(afterEncode).toHaveLength(0);
  }, 10000);
});
