/**
 * fcp-tools.test.ts
 * Coverage for packages/fcp/src/tools.ts — all registered MCP tools.
 *
 * Strategy: mock the individual sub-modules that tools.ts imports from,
 * using their resolved paths. tools.ts itself is NOT mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ─── Mock @creator-studio-os/core ─────────────────────────────────────────────
vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    loadConfig: vi.fn(() => ({
      fcpAppPath: "/Applications/FCP.app",
      fcpBundleId: "com.apple.FinalCutApp",
      fcpDtdPath: "/fake/FCPXMLv1_14.dtd",
      dataDir: "/data",
    })),
    resolveProject: vi.fn(),
    createProject: vi.fn(),
    listProjects: vi.fn(),
    runApp: {
      open: vi.fn(),
      osascript: vi.fn(),
      batch: vi.fn(),
    },
  };
});

// ─── Mock fcp sub-modules (relative paths that tools.ts uses) ────────────────
vi.mock("../packages/fcp/src/fcpxml/builder.js", () => ({
  buildProjectFcpxml: vi.fn(),
}));

vi.mock("../packages/fcp/src/fcpxml/validate.js", () => ({
  validateFcpxmlAgainstDtd: vi.fn(),
  dirname: {},
}));

vi.mock("../packages/fcp/src/library.js", () => ({
  listLibraries: vi.fn(),
  listEvents: vi.fn(),
  listProjects: vi.fn(),
  readProjectMetadata: vi.fn(),
}));

vi.mock("../packages/fcp/src/app.js", () => ({
  openFcp: vi.fn(),
  activateFcp: vi.fn(),
  isFcpRunning: vi.fn(),
  fcpInstalled: vi.fn(),
}));

vi.mock("../packages/fcp/src/effects.js", () => ({
  buildEffectsCatalog: vi.fn(),
  findEffect: vi.fn(),
}));

vi.mock("../packages/fcp/src/safety.js", () => ({
  validateCompoundSafety: vi.fn(),
  lintCaptions: vi.fn(),
  checkAnchorSafety: vi.fn(),
  runSafetyPreflights: vi.fn(),
}));

vi.mock("../packages/fcp/src/motion-bind.js", () => ({
  readPublishedParams: vi.fn(),
  buildParamBinding: vi.fn(),
  buildMotionParamBinding: vi.fn(),
}));

vi.mock("../packages/fcp/src/fcpxml/parser.js", () => ({
  parseFcpxml: vi.fn(),
}));

vi.mock("../packages/fcp/src/fcpxml/diff.js", () => ({
  diffTimelines: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import { registerFcpTools } from "../packages/fcp/src/tools.js";
import {
  loadConfig,
  resolveProject,
  createProject,
  listProjects as listProjectDirs,
  runApp,
  CreatorStudioError,
} from "@creator-studio-os/core";
import { buildProjectFcpxml } from "../packages/fcp/src/fcpxml/builder.js";
import { validateFcpxmlAgainstDtd } from "../packages/fcp/src/fcpxml/validate.js";
import { listLibraries, listEvents, listProjects as listFcpProjects, readProjectMetadata } from "../packages/fcp/src/library.js";
import { openFcp, activateFcp, isFcpRunning } from "../packages/fcp/src/app.js";
import { buildEffectsCatalog, findEffect } from "../packages/fcp/src/effects.js";
import { validateCompoundSafety, lintCaptions, checkAnchorSafety } from "../packages/fcp/src/safety.js";
import { readPublishedParams, buildParamBinding } from "../packages/fcp/src/motion-bind.js";
import { parseFcpxml } from "../packages/fcp/src/fcpxml/parser.js";
import { diffTimelines } from "../packages/fcp/src/fcpxml/diff.js";
import { mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises";

// ─── MockServer helper ────────────────────────────────────────────────────────

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };
type Handler = (args: Record<string, unknown>) => Promise<ToolResult>;

function makeMockServer() {
  const registry = new Map<string, Handler>();
  const server = {
    tool(_n: string, _d: string, _s: unknown, h: Handler) {
      registry.set(_n, h);
    },
  } as unknown as McpServer;

  async function call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    const h = registry.get(name);
    if (!h) throw new Error(`No tool registered: ${name}`);
    return h(args);
  }

  return { server, call };
}

function getText(result: ToolResult): unknown {
  return JSON.parse(result.content[0].text);
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const FAKE_PROJECT = {
  root: "/data/projects/MyProject",
  meta: { name: "MyProject", kind: "trailer" },
  paths: {
    fcp: "/data/projects/MyProject/fcp",
    footage: "/data/projects/MyProject/footage",
    audio: "/data/projects/MyProject/audio",
    images: "/data/projects/MyProject/images",
    brand: "/data/projects/MyProject/brand",
    refs: "/data/projects/MyProject/refs",
    out: "/data/projects/MyProject/out",
  },
};

const MINIMAL_SPEC = {
  projectName: "TestProject",
  assets: [],
  spine: [],
};

const MINIMAL_BUILT = {
  xml: '<?xml version="1.0"?><!DOCTYPE fcpxml><fcpxml version="1.14"/>',
  spec: { fcpxmlVersion: "1.14" },
  preflight: { allClear: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadConfig).mockReturnValue({
    fcpAppPath: "/Applications/FCP.app",
    fcpBundleId: "com.apple.FinalCutApp",
    fcpDtdPath: "/fake/FCPXMLv1_14.dtd",
    dataDir: "/data",
  } as ReturnType<typeof loadConfig>);
  vi.mocked(mkdir).mockResolvedValue(undefined);
  vi.mocked(writeFile).mockResolvedValue(undefined);
});

// ─── fcp_project_list ─────────────────────────────────────────────────────────

describe("fcp_project_list", () => {
  it("returns projects on success", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listProjectDirs).mockResolvedValue(["Alpha", "Beta"]);

    const result = await call("fcp_project_list");
    expect(result.isError).toBeFalsy();
    expect(getText(result)).toEqual({ projects: ["Alpha", "Beta"] });
  });

  it("returns error on failure", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listProjectDirs).mockRejectedValue(new Error("fs error"));

    const result = await call("fcp_project_list");
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_INTERNAL");
  });

  it("returns structured error for CreatorStudioError", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listProjectDirs).mockRejectedValue(
      new CreatorStudioError("E_PROJECT_NOT_FOUND", "not found", "create one first"),
    );

    const result = await call("fcp_project_list");
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string; hint: string };
    expect(body.code).toBe("E_PROJECT_NOT_FOUND");
    expect(body.hint).toBe("create one first");
  });
});

// ─── fcp_project_create ───────────────────────────────────────────────────────

describe("fcp_project_create", () => {
  it("creates a project and returns root/meta/paths", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(createProject).mockResolvedValue(FAKE_PROJECT as never);

    const result = await call("fcp_project_create", { name: "MyProject" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { root: string };
    expect(body.root).toBe("/data/projects/MyProject");
  });

  it("passes optional args to createProject", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(createProject).mockResolvedValue(FAKE_PROJECT as never);

    await call("fcp_project_create", {
      name: "MyProject",
      kind: "devlog",
      aspect: "9:16",
      frameRate: "60",
      deliverable: "YouTube Short",
      durationSeconds: 60,
      notes: "test notes",
    });

    const callArgs = vi.mocked(createProject).mock.calls[0];
    expect(callArgs[0]).toBe("MyProject");
    expect(callArgs[1]).toMatchObject({ kind: "devlog" });
  });

  it("returns error on failure", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(createProject).mockRejectedValue(new Error("disk full"));

    const result = await call("fcp_project_create", { name: "X" });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_project_info ─────────────────────────────────────────────────────────

describe("fcp_project_info", () => {
  it("returns project info on success", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(resolveProject).mockResolvedValue(FAKE_PROJECT as never);

    const result = await call("fcp_project_info", { name: "MyProject" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { root: string };
    expect(body.root).toBe("/data/projects/MyProject");
  });

  it("returns error when project not found", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(resolveProject).mockRejectedValue(
      new CreatorStudioError("E_PROJECT_NOT_FOUND", "missing"),
    );

    const result = await call("fcp_project_info", { name: "Ghost" });
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_PROJECT_NOT_FOUND");
  });
});

// ─── fcp_fcpxml_build ─────────────────────────────────────────────────────────

describe("fcp_fcpxml_build", () => {
  it("builds FCPXML and returns xml/version/preflight", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildProjectFcpxml).mockReturnValue(MINIMAL_BUILT as never);

    const result = await call("fcp_fcpxml_build", { spec: MINIMAL_SPEC });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { xml: string; fcpxmlVersion: string };
    expect(body.xml).toContain("fcpxml");
    expect(body.fcpxmlVersion).toBe("1.14");
  });

  it("passes allowUnsafe and skipPreflight to builder", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildProjectFcpxml).mockReturnValue(MINIMAL_BUILT as never);

    await call("fcp_fcpxml_build", { spec: MINIMAL_SPEC, allowUnsafe: true, skipPreflight: true });
    const callArgs = vi.mocked(buildProjectFcpxml).mock.calls[0];
    expect(callArgs[1]).toMatchObject({ allowUnsafe: true, skipPreflight: true });
  });

  it("returns error on build failure (CreatorStudioError)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildProjectFcpxml).mockImplementation(() => {
      throw new CreatorStudioError("E_COMPOUND_UNSAFE", "unsafe");
    });

    const result = await call("fcp_fcpxml_build", { spec: MINIMAL_SPEC });
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_COMPOUND_UNSAFE");
  });

  it("returns error on build failure (generic Error)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildProjectFcpxml).mockImplementation(() => {
      throw new Error("unknown build error");
    });

    const result = await call("fcp_fcpxml_build", { spec: MINIMAL_SPEC });
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string; message: string };
    expect(body.code).toBe("E_INTERNAL");
    expect(body.message).toBe("unknown build error");
  });
});

// ─── fcp_fcpxml_validate ──────────────────────────────────────────────────────

describe("fcp_fcpxml_validate", () => {
  it("validates XML and returns result", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(validateFcpxmlAgainstDtd).mockResolvedValue({
      valid: true,
      output: "ok",
      validatorPath: "/usr/bin/xmllint",
    });

    const result = await call("fcp_fcpxml_validate", { xml: "<fcpxml/>" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("returns error on validation failure", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(validateFcpxmlAgainstDtd).mockRejectedValue(
      new CreatorStudioError("E_FCP_DTD_MISSING", "dtd missing"),
    );

    const result = await call("fcp_fcpxml_validate", { xml: "<fcpxml/>" });
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_FCP_DTD_MISSING");
  });
});

// ─── fcp_fcpxml_write ─────────────────────────────────────────────────────────

describe("fcp_fcpxml_write", () => {
  it("writes XML to project fcp/ directory", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(resolveProject).mockResolvedValue(FAKE_PROJECT as never);

    const result = await call("fcp_fcpxml_write", {
      project: "MyProject",
      xml: "<fcpxml/>",
      filename: "timeline.fcpxml",
    });

    expect(result.isError).toBeFalsy();
    const body = getText(result) as { path: string };
    expect(body.path).toContain("timeline.fcpxml");
    expect(vi.mocked(mkdir)).toHaveBeenCalled();
    expect(vi.mocked(writeFile)).toHaveBeenCalled();
  });

  it("uses absolute filename directly when provided", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(resolveProject).mockResolvedValue(FAKE_PROJECT as never);

    const result = await call("fcp_fcpxml_write", {
      project: "MyProject",
      xml: "<fcpxml/>",
      filename: "/absolute/path/out.fcpxml",
    });

    expect(result.isError).toBeFalsy();
    const body = getText(result) as { path: string };
    expect(body.path).toBe("/absolute/path/out.fcpxml");
  });

  it("returns error when project resolve fails", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(resolveProject).mockRejectedValue(new Error("no project"));

    const result = await call("fcp_fcpxml_write", {
      project: "Ghost",
      xml: "<fcpxml/>",
      filename: "t.fcpxml",
    });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_fcpxml_import ────────────────────────────────────────────────────────

describe("fcp_fcpxml_import", () => {
  it("opens file in FCP and returns opened path", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(runApp.open).mockResolvedValue(undefined as never);

    const result = await call("fcp_fcpxml_import", { path: "/tmp/test.fcpxml" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { opened: string };
    expect(body.opened).toBe("/tmp/test.fcpxml");
  });

  it("passes fcpBundleId to runApp.open", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(runApp.open).mockResolvedValue(undefined as never);

    await call("fcp_fcpxml_import", { path: "/tmp/test.fcpxml" });
    const callArgs = vi.mocked(runApp.open).mock.calls[0];
    expect(callArgs[1]).toMatchObject({ appBundleId: "com.apple.FinalCutApp" });
  });

  it("returns error when open fails", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(runApp.open).mockRejectedValue(new Error("FCP not installed"));

    const result = await call("fcp_fcpxml_import", { path: "/tmp/test.fcpxml" });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_fcpxml_build_write_import ────────────────────────────────────────────

describe("fcp_fcpxml_build_write_import", () => {
  it("builds, writes, and imports in one call (skipValidate=true)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(resolveProject).mockResolvedValue(FAKE_PROJECT as never);
    vi.mocked(buildProjectFcpxml).mockReturnValue(MINIMAL_BUILT as never);
    vi.mocked(runApp.open).mockResolvedValue(undefined as never);

    const result = await call("fcp_fcpxml_build_write_import", {
      project: "MyProject",
      spec: MINIMAL_SPEC,
      filename: "timeline.fcpxml",
      skipValidate: true,
    });

    expect(result.isError).toBeFalsy();
    const body = getText(result) as { opened: boolean; validation: null };
    expect(body.opened).toBe(true);
    expect(body.validation).toBeNull();
  });

  it("validates when skipValidate=false (valid)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(resolveProject).mockResolvedValue(FAKE_PROJECT as never);
    vi.mocked(buildProjectFcpxml).mockReturnValue(MINIMAL_BUILT as never);
    vi.mocked(validateFcpxmlAgainstDtd).mockResolvedValue({ valid: true, output: "ok", validatorPath: "/usr/bin/xmllint" });
    vi.mocked(runApp.open).mockResolvedValue(undefined as never);

    const result = await call("fcp_fcpxml_build_write_import", {
      project: "MyProject",
      spec: MINIMAL_SPEC,
      filename: "timeline.fcpxml",
      skipValidate: false,
    });

    expect(result.isError).toBeFalsy();
    const body = getText(result) as { validation: { valid: boolean } };
    expect(body.validation?.valid).toBe(true);
  });

  it("throws E_FCPXML_INVALID when validation fails", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(resolveProject).mockResolvedValue(FAKE_PROJECT as never);
    vi.mocked(buildProjectFcpxml).mockReturnValue(MINIMAL_BUILT as never);
    vi.mocked(validateFcpxmlAgainstDtd).mockResolvedValue({ valid: false, output: "error: bad", validatorPath: "/usr/bin/xmllint" });

    const result = await call("fcp_fcpxml_build_write_import", {
      project: "MyProject",
      spec: MINIMAL_SPEC,
      skipValidate: false,
    });

    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_FCPXML_INVALID");
  });
});

// ─── fcp_library_list ─────────────────────────────────────────────────────────

describe("fcp_library_list", () => {
  it("returns libraries list", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listLibraries).mockResolvedValue([{ name: "Lib1" }, { name: "Lib2" }]);

    const result = await call("fcp_library_list");
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { libraries: { name: string }[] };
    expect(body.libraries).toHaveLength(2);
  });

  it("returns error on failure", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listLibraries).mockRejectedValue(new Error("FCP not running"));

    const result = await call("fcp_library_list");
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_library_events ───────────────────────────────────────────────────────

describe("fcp_library_events", () => {
  it("returns events for a library", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listEvents).mockResolvedValue([{ name: "Ev1" }]);

    const result = await call("fcp_library_events", { library: "MyLib" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { events: { name: string }[] };
    expect(body.events[0].name).toBe("Ev1");
  });

  it("returns error on failure", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listEvents).mockRejectedValue(new Error("lib not found"));

    const result = await call("fcp_library_events", { library: "X" });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_event_projects ───────────────────────────────────────────────────────

describe("fcp_event_projects", () => {
  it("returns projects for a library and event", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listFcpProjects).mockResolvedValue([{ name: "Proj1" }]);

    const result = await call("fcp_event_projects", { library: "L", event: "E" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { projects: { name: string }[] };
    expect(body.projects[0].name).toBe("Proj1");
  });

  it("returns error on failure", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(listFcpProjects).mockRejectedValue(new Error("err"));

    const result = await call("fcp_event_projects", { library: "L", event: "E" });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_project_metadata ─────────────────────────────────────────────────────

describe("fcp_project_metadata", () => {
  it("returns sequence metadata", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(readProjectMetadata).mockResolvedValue({
      projectName: "P",
      durationSeconds: 5,
      frameDurationSeconds: 1 / 30,
      timecodeFormat: "nonDropFrame",
    });

    const result = await call("fcp_project_metadata", { library: "L", event: "E", project: "P" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { durationSeconds: number };
    expect(body.durationSeconds).toBe(5);
  });

  it("returns error on failure", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(readProjectMetadata).mockRejectedValue(new Error("not found"));

    const result = await call("fcp_project_metadata", { library: "L", event: "E", project: "P" });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_safety_compound ─────────────────────────────────────────────────────

describe("fcp_safety_compound", () => {
  it("returns safety result for valid spec (safe=true)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(validateCompoundSafety).mockReturnValue({ safe: true, violations: [] });

    const result = await call("fcp_safety_compound", { spec: { projectName: "T", spine: [] } });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { safe: boolean };
    expect(body.safe).toBe(true);
  });

  it("returns compound violations for overlapping clips", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(validateCompoundSafety).mockReturnValue({
      safe: false,
      violations: [{ clipA: "A", clipB: "B", overlapSeconds: 2 }],
    });

    const result = await call("fcp_safety_compound", { spec: { projectName: "T", spine: [] } });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { safe: boolean; violations: unknown[] };
    expect(body.safe).toBe(false);
    expect(body.violations).toHaveLength(1);
  });

  it("returns error for invalid spec shape", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    // spec that fails ProjectSpecSchema.safeParse (missing projectName)
    const result = await call("fcp_safety_compound", { spec: "not-an-object" });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_safety_captions ─────────────────────────────────────────────────────

describe("fcp_safety_captions", () => {
  it("returns lint result for valid spec (ok=true)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(lintCaptions).mockReturnValue({ ok: true, issues: [] });

    const result = await call("fcp_safety_captions", { spec: { projectName: "T", spine: [] } });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns issues for malformed roles", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(lintCaptions).mockReturnValue({
      ok: false,
      issues: [{ clipName: "Cap", reason: "missing a subrole" }],
    });

    const result = await call("fcp_safety_captions", { spec: { projectName: "T", spine: [] } });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { ok: boolean; issues: { reason: string }[] };
    expect(body.ok).toBe(false);
    expect(body.issues[0].reason).toContain("subrole");
  });

  it("returns error for invalid spec", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    const result = await call("fcp_safety_captions", { spec: null });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_safety_anchors ───────────────────────────────────────────────────────

describe("fcp_safety_anchors", () => {
  it("returns anchor safety result (safe=true)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(checkAnchorSafety).mockReturnValue({ safe: true, collisions: [] });

    const result = await call("fcp_safety_anchors", { spec: { projectName: "T", spine: [] } });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { safe: boolean };
    expect(body.safe).toBe(true);
  });

  it("returns collision info when unsafe", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(checkAnchorSafety).mockReturnValue({
      safe: false,
      collisions: [{ titleA: "A", titleB: "B", lane: 1, overlapSeconds: 2 }],
    });

    const result = await call("fcp_safety_anchors", { spec: { projectName: "T", spine: [] } });
    const body = getText(result) as { safe: boolean; collisions: unknown[] };
    expect(body.safe).toBe(false);
    expect(body.collisions).toHaveLength(1);
  });

  it("returns error for invalid spec", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    const result = await call("fcp_safety_anchors", { spec: undefined });
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_app_open ─────────────────────────────────────────────────────────────

describe("fcp_app_open", () => {
  it("opens FCP and returns running=true", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(openFcp).mockResolvedValue(undefined);

    const result = await call("fcp_app_open");
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { running: boolean };
    expect(body.running).toBe(true);
  });

  it("returns error when openFcp throws (CreatorStudioError)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(openFcp).mockRejectedValue(new CreatorStudioError("E_APP_NOT_INSTALLED", "not installed"));

    const result = await call("fcp_app_open");
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_APP_NOT_INSTALLED");
  });

  it("returns error when openFcp throws (generic Error)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(openFcp).mockRejectedValue(new Error("Cannot open"));

    const result = await call("fcp_app_open");
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_INTERNAL");
  });
});

// ─── fcp_app_activate ────────────────────────────────────────────────────────

describe("fcp_app_activate", () => {
  it("activates FCP and returns activated=true", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(activateFcp).mockResolvedValue(undefined);

    const result = await call("fcp_app_activate");
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { activated: boolean };
    expect(body.activated).toBe(true);
  });

  it("returns error when activateFcp throws (CreatorStudioError)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(activateFcp).mockRejectedValue(new CreatorStudioError("E_APP_NOT_INSTALLED", "not installed"));

    const result = await call("fcp_app_activate");
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_APP_NOT_INSTALLED");
  });

  it("returns error when activateFcp throws (generic Error)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(activateFcp).mockRejectedValue(new Error("Not running"));

    const result = await call("fcp_app_activate");
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_app_running ─────────────────────────────────────────────────────────

describe("fcp_app_running", () => {
  it("returns running=true when FCP is running", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(isFcpRunning).mockResolvedValue(true);

    const result = await call("fcp_app_running");
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { running: boolean };
    expect(body.running).toBe(true);
  });

  it("returns running=false when FCP is not running", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(isFcpRunning).mockResolvedValue(false);

    const result = await call("fcp_app_running");
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { running: boolean };
    expect(body.running).toBe(false);
  });

  it("returns error when check throws (CreatorStudioError)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(isFcpRunning).mockRejectedValue(new CreatorStudioError("E_AUTOMATION_DENIED", "denied"));

    const result = await call("fcp_app_running");
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_AUTOMATION_DENIED");
  });

  it("returns error when check throws (generic)", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(isFcpRunning).mockRejectedValue(new Error("Automation denied"));

    const result = await call("fcp_app_running");
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_bind_motion_param ────────────────────────────────────────────────────

describe("fcp_bind_motion_param", () => {
  it("returns published params when paramName is not given", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(readPublishedParams).mockResolvedValue([
      { name: "Headline", paramId: "200", defaultValue: "Hello" },
    ]);

    const result = await call("fcp_bind_motion_param", { motnPath: "/templates/Custom.moti" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { publishedParams: { name: string }[] };
    expect(body.publishedParams[0].name).toBe("Headline");
  });

  it("returns binding when paramName and value are given", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildParamBinding).mockResolvedValue({ name: "Headline", paramId: "200", key: "200", value: "My Title" });

    const result = await call("fcp_bind_motion_param", {
      motnPath: "/templates/Custom.moti",
      paramName: "Headline",
      value: "My Title",
    });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { binding: { name: string; value: string } };
    expect(body.binding.name).toBe("Headline");
    expect(body.binding.value).toBe("My Title");
  });

  it("returns E_OZML_PARAM_NOT_FOUND when paramName is given without value", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    const result = await call("fcp_bind_motion_param", {
      motnPath: "/templates/Custom.moti",
      paramName: "Headline",
      // value is absent
    });
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_OZML_PARAM_NOT_FOUND");
  });

  it("returns error when readPublishedParams fails", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(readPublishedParams).mockRejectedValue(
      new CreatorStudioError("E_OZML_FILE_MISSING", "file not found"),
    );

    const result = await call("fcp_bind_motion_param", { motnPath: "/missing.moti" });
    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_OZML_FILE_MISSING");
  });
});

// ─── fcp_effects_catalog ──────────────────────────────────────────────────────

describe("fcp_effects_catalog", () => {
  const CATALOG = {
    buildTime: "2025-01-01T00:00:00.000Z",
    entries: [
      { path: "/t.moti", kind: "title", name: "Custom Title", bundleName: "Custom", publishedParams: ["Headline"], paramCount: 2 },
      { path: "/g.moti", kind: "generator", name: "Shapes", bundleName: "Shapes", publishedParams: [], paramCount: 1 },
    ],
  };

  it("returns full catalog", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildEffectsCatalog).mockResolvedValue(CATALOG as never);

    const result = await call("fcp_effects_catalog", {});
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { count: number; entries: unknown[] };
    expect(body.count).toBe(2);
    expect(body.entries).toHaveLength(2);
  });

  it("filters by kind", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildEffectsCatalog).mockResolvedValue(CATALOG as never);

    const result = await call("fcp_effects_catalog", { kind: "title" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { count: number; entries: { kind: string }[] };
    expect(body.count).toBe(1);
    expect(body.entries[0].kind).toBe("title");
  });

  it("returns named entry via findEffect", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildEffectsCatalog).mockResolvedValue(CATALOG as never);
    vi.mocked(findEffect).mockReturnValue(CATALOG.entries[0] as never);

    const result = await call("fcp_effects_catalog", { name: "Custom Title" });
    expect(result.isError).toBeFalsy();
    const body = getText(result) as { count: number; entries: { name: string }[] };
    expect(body.count).toBe(1);
    expect(body.entries[0].name).toBe("Custom Title");
  });

  it("passes refresh flag to buildEffectsCatalog", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildEffectsCatalog).mockResolvedValue(CATALOG as never);

    await call("fcp_effects_catalog", { refresh: true });
    expect(vi.mocked(buildEffectsCatalog).mock.calls[0][0]).toMatchObject({ refresh: true });
  });

  it("returns error on catalog build failure", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);
    vi.mocked(buildEffectsCatalog).mockRejectedValue(new Error("scan failed"));

    const result = await call("fcp_effects_catalog", {});
    expect(result.isError).toBe(true);
  });
});

// ─── fcp_round_trip_diff ──────────────────────────────────────────────────────

describe("fcp_round_trip_diff", () => {
  it("diffs two FCPXML files and returns result", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    vi.mocked(readFile)
      .mockResolvedValueOnce("<fcpxml before/>" as never)
      .mockResolvedValueOnce("<fcpxml after/>" as never);

    vi.mocked(parseFcpxml).mockReturnValue({ projectName: "P", eventName: "E", assets: [], spine: [], format: {} } as never);
    vi.mocked(diffTimelines).mockReturnValue({ diffs: [], summary: "No differences found." } as never);

    const result = await call("fcp_round_trip_diff", {
      beforePath: "/tmp/before.fcpxml",
      afterPath: "/tmp/after.fcpxml",
    });

    expect(result.isError).toBeFalsy();
    const body = getText(result) as { summary: string };
    expect(body.summary).toMatch(/No differences/);
  });

  it("returns E_FCPXML_PARSE_FAILED when before file is missing", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    // Both readFile calls happen concurrently — provide mocks for both
    vi.mocked(readFile)
      .mockRejectedValueOnce(new Error("ENOENT"))         // before file
      .mockResolvedValueOnce("<fcpxml/>" as never);        // after file (not used)

    const result = await call("fcp_round_trip_diff", {
      beforePath: "/tmp/missing.fcpxml",
      afterPath: "/tmp/after.fcpxml",
    });

    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_FCPXML_PARSE_FAILED");
  });

  it("returns E_FCPXML_PARSE_FAILED when after file is missing", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    vi.mocked(readFile)
      .mockResolvedValueOnce("<fcpxml/>" as never)
      .mockRejectedValueOnce(new Error("ENOENT"));

    vi.mocked(parseFcpxml).mockReturnValue({ projectName: "P", eventName: "E", assets: [], spine: [], format: {} } as never);

    const result = await call("fcp_round_trip_diff", {
      beforePath: "/tmp/before.fcpxml",
      afterPath: "/tmp/missing.fcpxml",
    });

    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_FCPXML_PARSE_FAILED");
  });
});

// ─── fcp_round_trip_capture ───────────────────────────────────────────────────
// fcp_round_trip_capture uses dynamic import("node:fs/promises") internally.
// Since node:fs/promises is globally mocked, we restore real implementations
// for tests that need real filesystem access.

describe("fcp_round_trip_capture", () => {
  let realFs: typeof import("node:fs/promises");
  let testDir: string;

  beforeEach(async () => {
    realFs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    // Restore real implementations so the tool's dynamic import works correctly
    vi.mocked(readFile).mockImplementation(realFs.readFile as never);
    vi.mocked(readdir).mockImplementation(realFs.readdir as never);
    vi.mocked(stat).mockImplementation(realFs.stat as never);
    testDir = await realFs.mkdtemp("/tmp/csos-capture-test-");
  });

  afterEach(async () => {
    await realFs.rm(testDir, { recursive: true, force: true });
    // Reset mocks to default state for other test suites
    vi.mocked(readFile).mockResolvedValue(undefined as never);
    vi.mocked(readdir).mockResolvedValue([] as never);
    vi.mocked(stat).mockResolvedValue(undefined as never);
  });

  it("returns E_FCPXML_PARSE_FAILED when no fcpxml files found in empty dir", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    const result = await call("fcp_round_trip_capture", { libraryPath: testDir });

    expect(result.isError).toBe(true);
    const body = getText(result) as { code: string };
    expect(body.code).toBe("E_FCPXML_PARSE_FAILED");
  });

  it("reads first fcpxml file when no project name filter", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    await realFs.writeFile(`${testDir}/object.fcpxml`, '<?xml version="1.0"?><fcpxml/>', "utf-8");

    const result = await call("fcp_round_trip_capture", { libraryPath: testDir });

    expect(result.isError).toBeFalsy();
    const body = getText(result) as { xml: string; found: number };
    expect(body.found).toBe(1);
    expect(body.xml).toContain("fcpxml");
  });

  it("filters by projectName when found", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    await realFs.writeFile(`${testDir}/myproject.fcpxml`, '<fcpxml version="1.14"/>', "utf-8");
    await realFs.writeFile(`${testDir}/other.fcpxml`, "<fcpxml/>", "utf-8");

    const result = await call("fcp_round_trip_capture", {
      libraryPath: testDir,
      projectName: "myproject",
    });

    expect(result.isError).toBeFalsy();
    const body = getText(result) as { xml: string; found: number };
    expect(body.found).toBe(2);
    expect(body.xml).toContain("1.14");
  });

  it("returns null xml when projectName not matched", async () => {
    const { server, call } = makeMockServer();
    registerFcpTools(server);

    await realFs.writeFile(`${testDir}/other.fcpxml`, "<fcpxml/>", "utf-8");

    const result = await call("fcp_round_trip_capture", {
      libraryPath: testDir,
      projectName: "nonexistent",
    });

    expect(result.isError).toBeFalsy();
    const body = getText(result) as { xml: null; path: null };
    expect(body.xml).toBeNull();
    expect(body.path).toBeNull();
  });
});

// ─── fcp recovery profile ─────────────────────────────────────────────────────

describe("fcp recovery profile", () => {
  it("has app='fcp' and no badStatePattern", async () => {
    const { recovery } = await import("../packages/fcp/src/recovery.js");
    expect(recovery.app).toBe("fcp");
    expect(recovery.badStatePattern).toBeNull();
  });

  it("recover() resolves without error", async () => {
    const { recovery } = await import("../packages/fcp/src/recovery.js");
    await expect(recovery.recover()).resolves.toBeUndefined();
  });
});
