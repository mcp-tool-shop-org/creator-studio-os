/**
 * compressor-tools.test.ts
 *
 * Covers tools.ts (registerCompressorTools) — all 15 tools, happy path + error path.
 * Every external dependency is mocked at the module level so no real Apple apps
 * or binaries are required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CreatorStudioError } from "@creator-studio-os/core";

// ---------------------------------------------------------------------------
// Module mocks (must appear before any imports that touch these modules)
// ---------------------------------------------------------------------------

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const real = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...real,
    loadConfig: vi.fn(() => ({
      compressorBundleId: "com.apple.CompressorApp",
      compressorBinaryPath: "/Applications/Compressor.app/Contents/MacOS/Compressor",
      compressorBundledSettingsDir: "/Applications/Compressor.app/Contents/Resources/Settings",
    })),
    runAppleScript: vi.fn(),
    activateApp: vi.fn(),
    isAppRunning: vi.fn(),
    resolveProject: vi.fn(),
  };
});

vi.mock("../packages/compressor/src/app.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../packages/compressor/src/app.js")>();
  return {
    ...real,
    isCompressorRunning: vi.fn(),
    openCompressor: vi.fn(),
  };
});

vi.mock("../packages/compressor/src/monitor.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../packages/compressor/src/monitor.js")>();
  return {
    ...real,
    monitorStream: vi.fn(),
    statusOnce: vi.fn(),
    jobAction: vi.fn(),
    waitFor: vi.fn(),
  };
});

vi.mock("../packages/compressor/src/settings.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../packages/compressor/src/settings.js")>();
  return {
    ...real,
    listCompressorSettings: vi.fn(),
    resolveBundledPreset: vi.fn(),
  };
});

vi.mock("../packages/compressor/src/locations.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../packages/compressor/src/locations.js")>();
  return {
    ...real,
    listCompressorLocations: vi.fn(),
  };
});

vi.mock("../packages/compressor/src/cli.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../packages/compressor/src/cli.js")>();
  return {
    ...real,
    encodeJob: vi.fn(),
  };
});

vi.mock("../packages/compressor/src/inspect.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../packages/compressor/src/inspect.js")>();
  return {
    ...real,
    inspectSetting: vi.fn(),
    resolveSettingByName: vi.fn(),
    getCodecAvailability: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Import mocked modules AFTER vi.mock declarations
// ---------------------------------------------------------------------------

import { registerCompressorTools } from "../packages/compressor/src/tools.js";
import * as appMod from "../packages/compressor/src/app.js";
import * as monitorMod from "../packages/compressor/src/monitor.js";
import * as settingsMod from "../packages/compressor/src/settings.js";
import * as locationsMod from "../packages/compressor/src/locations.js";
import * as cliMod from "../packages/compressor/src/cli.js";
import * as inspectMod from "../packages/compressor/src/inspect.js";
import * as coreMod from "@creator-studio-os/core";

// ---------------------------------------------------------------------------
// Helper: build a minimal mock McpServer + call dispatcher
// ---------------------------------------------------------------------------

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };
type Handler = (args: Record<string, unknown>, extra?: Record<string, unknown>) => Promise<ToolResult>;

function makeMockServer() {
  const registry = new Map<string, Handler>();
  const server = {
    tool(_n: string, _d: string, _s: unknown, h: Handler) {
      registry.set(_n, h);
    },
  } as unknown as McpServer;

  registerCompressorTools(server);

  async function call(name: string, args: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
    const h = registry.get(name);
    if (!h) throw new Error(`No tool registered: ${name}`);
    return h(args, extra);
  }

  return { server, call };
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

function textOf(r: ToolResult): unknown {
  return JSON.parse(r.content[0].text);
}

function makeCSError(code: string) {
  return new CreatorStudioError(code as Parameters<typeof CreatorStudioError.prototype.constructor>[0], `${code} happened`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("compressor_app_open", () => {
  it("happy path — resolves with opened:true", async () => {
    const { call } = makeMockServer();
    vi.mocked(appMod.openCompressor).mockResolvedValueOnce(undefined);
    const r = await call("compressor_app_open");
    expect(r.isError).toBeUndefined();
    expect(textOf(r)).toEqual({ opened: true });
  });

  it("error path — returns isError with CreatorStudioError shape", async () => {
    const { call } = makeMockServer();
    vi.mocked(appMod.openCompressor).mockRejectedValueOnce(makeCSError("E_COMPRESSOR_NOT_FOUND"));
    const r = await call("compressor_app_open");
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_COMPRESSOR_NOT_FOUND" });
  });
});

describe("compressor_app_running", () => {
  it("returns running:true when app is running", async () => {
    const { call } = makeMockServer();
    vi.mocked(appMod.isCompressorRunning).mockResolvedValueOnce(true);
    const r = await call("compressor_app_running");
    expect(textOf(r)).toEqual({ running: true });
  });

  it("returns running:false when app is not running", async () => {
    const { call } = makeMockServer();
    vi.mocked(appMod.isCompressorRunning).mockResolvedValueOnce(false);
    const r = await call("compressor_app_running");
    expect(textOf(r)).toEqual({ running: false });
  });

  it("error path — wraps generic Error as E_INTERNAL", async () => {
    const { call } = makeMockServer();
    vi.mocked(appMod.isCompressorRunning).mockRejectedValueOnce(new Error("osascript blew up"));
    const r = await call("compressor_app_running");
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_INTERNAL" });
  });
});

describe("compressor_settings_list", () => {
  const fakeSettings = [{ name: "H.264", path: "/p.compressorsetting", source: "user" as const }];

  it("returns settings without availability annotation by default", async () => {
    const { call } = makeMockServer();
    vi.mocked(settingsMod.listCompressorSettings).mockResolvedValueOnce(fakeSettings);
    const r = await call("compressor_settings_list", { includeBundled: false, withAvailability: false });
    expect(textOf(r)).toEqual({ settings: fakeSettings });
  });

  it("annotates availability when withAvailability=true", async () => {
    const { call } = makeMockServer();
    vi.mocked(settingsMod.listCompressorSettings).mockResolvedValueOnce(fakeSettings);
    vi.mocked(inspectMod.getCodecAvailability).mockResolvedValueOnce({
      available: ["H.264"], removed: [], appleSilicon: true, version: "5.0",
    });
    vi.mocked(inspectMod.inspectSetting).mockResolvedValueOnce({
      internalName: "H264",
      displayName: "H.264",
      description: "",
      container: "mp4",
      availability: "ok",
      video: { codec: "avc1", codecVendor: "appl", width: 1920, height: 1080, frameRate: 30, bitrate: 8000000, colorPrimaries: 1, colorTransfer: 1, colorMatrix: 1 },
      audio: { codec: "aac", bitrate: 128000, sampleRate: 44100, channels: 2, bitDepth: 16 },
      raw: {},
    });
    const r = await call("compressor_settings_list", { includeBundled: false, withAvailability: true });
    const parsed = textOf(r) as { settings: unknown[]; codecAvailability: unknown };
    expect(parsed.settings).toHaveLength(1);
    expect((parsed.settings[0] as { availability: string }).availability).toBe("ok");
  });

  it("error path — returns isError", async () => {
    const { call } = makeMockServer();
    vi.mocked(settingsMod.listCompressorSettings).mockRejectedValueOnce(makeCSError("E_COMPRESSOR_NOT_FOUND"));
    const r = await call("compressor_settings_list", { includeBundled: false, withAvailability: false });
    expect(r.isError).toBe(true);
  });

  it("falls back to 'ok' availability when inspectSetting throws during annotation", async () => {
    const { call } = makeMockServer();
    vi.mocked(settingsMod.listCompressorSettings).mockResolvedValueOnce(fakeSettings);
    vi.mocked(inspectMod.getCodecAvailability).mockResolvedValueOnce({
      available: [], removed: [], appleSilicon: false, version: "5.0",
    });
    vi.mocked(inspectMod.inspectSetting).mockRejectedValueOnce(new Error("parse failed"));
    const r = await call("compressor_settings_list", { includeBundled: false, withAvailability: true });
    const parsed = textOf(r) as { settings: Array<{ availability: string }> };
    expect(parsed.settings[0].availability).toBe("ok");
  });
});

describe("compressor_locations_list", () => {
  it("returns locations array on success", async () => {
    const { call } = makeMockServer();
    const fakeLocations = [{ name: "Desktop", path: "/desk", source: "user" as const }];
    vi.mocked(locationsMod.listCompressorLocations).mockResolvedValueOnce(fakeLocations);
    const r = await call("compressor_locations_list");
    expect(textOf(r)).toEqual({ locations: fakeLocations });
  });

  it("error path — returns isError", async () => {
    const { call } = makeMockServer();
    vi.mocked(locationsMod.listCompressorLocations).mockRejectedValueOnce(new Error("fs error"));
    const r = await call("compressor_locations_list");
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_INTERNAL" });
  });
});

describe("compressor_encode", () => {
  const baseArgs = {
    jobPath: "/in.mov",
    settingPath: "/s.compressorsetting",
    locationPath: "/out.mov",
  };

  it("happy path — returns jobId", async () => {
    const { call } = makeMockServer();
    vi.mocked(cliMod.encodeJob).mockResolvedValueOnce({ jobId: "j1", rawOutput: "" });
    const r = await call("compressor_encode", baseArgs);
    expect(textOf(r)).toMatchObject({ jobId: "j1" });
  });

  it("accepts optional batchName / priority", async () => {
    const { call } = makeMockServer();
    vi.mocked(cliMod.encodeJob).mockResolvedValueOnce({ jobId: "j2", rawOutput: "" });
    const r = await call("compressor_encode", { ...baseArgs, batchName: "MyBatch", priority: "high" });
    expect(textOf(r)).toMatchObject({ jobId: "j2" });
    // Use the most-recent call (last), not the first
    const calls = vi.mocked(cliMod.encodeJob).mock.calls;
    const lastCallArgs = calls[calls.length - 1][0];
    expect(lastCallArgs).toMatchObject({
      batchName: "MyBatch",
      priority: "high",
    });
  });

  it("error path — wraps CreatorStudioError", async () => {
    const { call } = makeMockServer();
    vi.mocked(cliMod.encodeJob).mockRejectedValueOnce(makeCSError("E_JOB_NOT_FOUND"));
    const r = await call("compressor_encode", baseArgs);
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_JOB_NOT_FOUND" });
  });
});

describe("compressor_encode_project", () => {
  beforeEach(() => {
    vi.mocked(coreMod.resolveProject).mockResolvedValue({
      name: "myproject",
      root: "/data/projects/myproject",
      meta: {} as never,
      paths: {
        footage: "/data/projects/myproject/footage",
        audio: "/data/projects/myproject/audio",
        images: "/data/projects/myproject/images",
        brand: "/data/projects/myproject/brand",
        refs: "/data/projects/myproject/refs",
        fcp: "/data/projects/myproject/fcp",
        out: "/data/projects/myproject/out",
      },
    });
  });

  it("happy path with relative sourceFilename — resolves output to out/", async () => {
    const { call } = makeMockServer();
    vi.mocked(cliMod.encodeJob).mockResolvedValueOnce({ jobId: "j2", rawOutput: "" });
    const r = await call("compressor_encode_project", {
      project: "myproject",
      sourceFilename: "footage/clip.mov",
      settingPath: "/s.compressorsetting",
      outputFilename: "final.mp4",
    });
    const parsed = textOf(r) as { jobId: string; source: string; output: string };
    expect(parsed.jobId).toBe("j2");
    expect(parsed.source).toContain("myproject");
    expect(parsed.output).toContain("out");
  });

  it("happy path with absolute sourceFilename", async () => {
    const { call } = makeMockServer();
    vi.mocked(cliMod.encodeJob).mockResolvedValueOnce({ jobId: "j3", rawOutput: "" });
    const r = await call("compressor_encode_project", {
      project: "myproject",
      sourceFilename: "/absolute/clip.mov",
      settingPath: "/s.compressorsetting",
      outputFilename: "/absolute/final.mp4",
    });
    const parsed = textOf(r) as { source: string; output: string };
    expect(parsed.source).toBe("/absolute/clip.mov");
    expect(parsed.output).toBe("/absolute/final.mp4");
  });

  it("error path — resolveProject rejects", async () => {
    const { call } = makeMockServer();
    vi.mocked(coreMod.resolveProject).mockRejectedValueOnce(makeCSError("E_PROJECT_NOT_FOUND"));
    const r = await call("compressor_encode_project", {
      project: "missing",
      sourceFilename: "clip.mov",
      settingPath: "/s.cs",
      outputFilename: "out.mp4",
    });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_PROJECT_NOT_FOUND" });
  });
});

describe("compressor_status", () => {
  const fakeFrame = {
    jobId: "JOB-001",
    batchId: "BATCH-001",
    status: "active" as const,
    percentComplete: 55,
    timeElapsedSeconds: 30,
    timeRemainingSeconds: 25,
    name: "test",
    submissionTime: "2026-05-01T00:00:00Z",
    sentBy: "csos",
  };

  it("returns a StatusFrame on success", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.statusOnce).mockResolvedValueOnce(fakeFrame);
    const r = await call("compressor_status", { jobId: "JOB-001" });
    expect(textOf(r)).toMatchObject({ jobId: "JOB-001", status: "active" });
  });

  it("error path — returns isError", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.statusOnce).mockRejectedValueOnce(makeCSError("E_COMPRESSOR_MONITOR_FAILED"));
    const r = await call("compressor_status");
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_COMPRESSOR_MONITOR_FAILED" });
  });
});

describe("compressor_monitor_stream", () => {
  afterEach(() => {
    vi.mocked(monitorMod.monitorStream).mockReset();
  });

  const fakeFrame = {
    jobId: "JOB-001",
    batchId: "BATCH-001",
    status: "completed" as const,
    percentComplete: 100,
    timeElapsedSeconds: 60,
    timeRemainingSeconds: 0,
    name: "batch",
    submissionTime: "",
    sentBy: "",
  };

  it("returns lastFrame and frameCount after consuming the async iterable", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.monitorStream).mockImplementationOnce(async function* () {
      yield fakeFrame;
    });
    const r = await call("compressor_monitor_stream", {
      intervalSec: 5,
      timeoutSec: 3600,
    });
    const parsed = textOf(r) as { lastFrame: typeof fakeFrame; frameCount: number };
    expect(parsed.frameCount).toBe(1);
    expect(parsed.lastFrame).toMatchObject({ status: "completed" });
  });

  it("sends progress notifications when progressToken is present", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.monitorStream).mockImplementationOnce(async function* () {
      yield fakeFrame;
    });
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    const extra = {
      _meta: { progressToken: "tok-1" },
      sendNotification,
    };
    await call("compressor_monitor_stream", { intervalSec: 5, timeoutSec: 3600 }, extra as unknown as Record<string, unknown>);
    expect(sendNotification).toHaveBeenCalledOnce();
    const notifArg = sendNotification.mock.calls[0][0] as { params: { progressToken: string; progress: number } };
    expect(notifArg.params.progressToken).toBe("tok-1");
    expect(notifArg.params.progress).toBe(100);
  });

  it("handles empty stream (lastFrame null, frameCount 0)", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.monitorStream).mockImplementationOnce(async function* () {
      // yields nothing
    });
    const r = await call("compressor_monitor_stream", { intervalSec: 5, timeoutSec: 3600 });
    expect(textOf(r)).toEqual({ lastFrame: null, frameCount: 0 });
  });

  it("error path — returns isError", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.monitorStream).mockImplementationOnce(() => {
      throw makeCSError("E_COMPRESSOR_NOT_FOUND");
    });
    const r = await call("compressor_monitor_stream", { intervalSec: 5, timeoutSec: 3600 });
    expect(r.isError).toBe(true);
  });
});

describe("compressor_pause", () => {
  it("happy path — returns paused:true", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.jobAction).mockResolvedValueOnce(undefined);
    const r = await call("compressor_pause", { jobId: "J1" });
    expect(textOf(r)).toEqual({ paused: true });
    expect(vi.mocked(monitorMod.jobAction)).toHaveBeenCalledWith("pause", { jobId: "J1", batchId: undefined });
  });

  it("error path", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.jobAction).mockRejectedValueOnce(new Error("pipe error"));
    const r = await call("compressor_pause", {});
    expect(r.isError).toBe(true);
  });
});

describe("compressor_resume", () => {
  it("happy path — returns resumed:true", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.jobAction).mockResolvedValueOnce(undefined);
    const r = await call("compressor_resume", { batchId: "B1" });
    expect(textOf(r)).toEqual({ resumed: true });
    expect(vi.mocked(monitorMod.jobAction)).toHaveBeenCalledWith("resume", { jobId: undefined, batchId: "B1" });
  });

  it("error path — wraps CreatorStudioError", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.jobAction).mockRejectedValueOnce(makeCSError("E_COMPRESSOR_FAILED"));
    const r = await call("compressor_resume", {});
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_COMPRESSOR_FAILED" });
  });
});

describe("compressor_kill", () => {
  it("happy path — returns killed:true", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.jobAction).mockResolvedValueOnce(undefined);
    const r = await call("compressor_kill", { jobId: "J2" });
    expect(textOf(r)).toEqual({ killed: true });
  });

  it("error path", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.jobAction).mockRejectedValueOnce(new Error("kill failed"));
    const r = await call("compressor_kill", {});
    expect(r.isError).toBe(true);
  });
});

describe("compressor_wait_for", () => {
  const completedFrame = {
    jobId: "j1",
    batchId: "",
    status: "completed" as const,
    percentComplete: 100,
    timeElapsedSeconds: 60,
    timeRemainingSeconds: 0,
    name: "test",
    submissionTime: "",
    sentBy: "",
  };

  it("returns StatusFrame on success", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.waitFor).mockResolvedValueOnce(completedFrame);
    const r = await call("compressor_wait_for", {
      jobId: "j1",
      untilStatus: "completed",
      timeoutSec: 3600,
    });
    expect(textOf(r)).toMatchObject({ jobId: "j1", status: "completed" });
  });

  it("error path — timeout", async () => {
    const { call } = makeMockServer();
    vi.mocked(monitorMod.waitFor).mockRejectedValueOnce(makeCSError("E_COMPRESSOR_FLUSH_TIMEOUT"));
    const r = await call("compressor_wait_for", { untilStatus: "completed", timeoutSec: 1 });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_COMPRESSOR_FLUSH_TIMEOUT" });
  });
});

describe("compressor_settings_inspect", () => {
  const fakeInspected = {
    internalName: "H264HD",
    displayName: "H.264 HD",
    description: "",
    container: "mp4",
    availability: "ok" as const,
    video: { codec: "avc1", codecVendor: "appl", width: 1920, height: 1080, frameRate: 30, bitrate: 8000000, colorPrimaries: 1, colorTransfer: 1, colorMatrix: 1 },
    audio: { codec: "aac", bitrate: 128000, sampleRate: 44100, channels: 2, bitDepth: 16 },
    raw: {},
  };

  it("returns inspected setting on success", async () => {
    const { call } = makeMockServer();
    vi.mocked(inspectMod.inspectSetting).mockResolvedValueOnce(fakeInspected);
    const r = await call("compressor_settings_inspect", {
      path: "/h264.compressorsetting",
      resolveNames: true,
      decodeEncoderProperties: false,
    });
    expect(textOf(r)).toMatchObject({ displayName: "H.264 HD", video: { codec: "avc1" } });
  });

  it("error path — E_SETTING_NOT_FOUND", async () => {
    const { call } = makeMockServer();
    vi.mocked(inspectMod.inspectSetting).mockRejectedValueOnce(makeCSError("E_SETTING_NOT_FOUND"));
    const r = await call("compressor_settings_inspect", {
      path: "/missing.compressorsetting",
      resolveNames: false,
      decodeEncoderProperties: false,
    });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_SETTING_NOT_FOUND" });
  });
});

describe("compressor_settings_resolve", () => {
  it("returns path on success", async () => {
    const { call } = makeMockServer();
    vi.mocked(inspectMod.resolveSettingByName).mockResolvedValueOnce("/presets/h264.compressorsetting");
    const r = await call("compressor_settings_resolve", { displayName: "H.264 HD" });
    expect(textOf(r)).toEqual({ path: "/presets/h264.compressorsetting" });
  });

  it("error path — name not found", async () => {
    const { call } = makeMockServer();
    vi.mocked(inspectMod.resolveSettingByName).mockRejectedValueOnce(makeCSError("E_SETTING_NOT_FOUND"));
    const r = await call("compressor_settings_resolve", { displayName: "No Such Preset" });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_SETTING_NOT_FOUND" });
  });
});

describe("compressor_codec_availability", () => {
  it("returns codec availability on success", async () => {
    const { call } = makeMockServer();
    vi.mocked(inspectMod.getCodecAvailability).mockResolvedValueOnce({
      available: ["H.264", "HEVC"],
      removed: [],
      appleSilicon: true,
      version: "5.2",
    });
    const r = await call("compressor_codec_availability");
    const parsed = textOf(r) as { available: string[]; appleSilicon: boolean };
    expect(parsed.available).toContain("H.264");
    expect(parsed.appleSilicon).toBe(true);
  });

  it("error path — generic error", async () => {
    const { call } = makeMockServer();
    vi.mocked(inspectMod.getCodecAvailability).mockRejectedValueOnce(new Error("arch detection failed"));
    const r = await call("compressor_codec_availability");
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatchObject({ code: "E_INTERNAL" });
  });
});
