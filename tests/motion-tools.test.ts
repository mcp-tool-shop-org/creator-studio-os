/**
 * motion/tools.ts — full dispatch coverage.
 *
 * Mocks all leaf modules so no real files, apps, or AppleScript are needed.
 * Covers happy path + CreatorStudioError + generic Error for every tool.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ---------------------------------------------------------------------------
// Mock app helpers
// ---------------------------------------------------------------------------

vi.mock("../packages/motion/src/app.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/motion/src/app.js")>();
  return {
    ...actual,
    isMotionRunning: vi.fn().mockResolvedValue(false),
    openMotion: vi.fn().mockResolvedValue(undefined),
    openMotionTemplate: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../packages/motion/src/ozml.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/motion/src/ozml.js")>();
  return {
    ...actual,
    inspectTemplate: vi.fn().mockResolvedValue({
      path: "/tmp/test.motn",
      ozmlVersion: "1.0",
      byteSize: 1024,
      parameterCount: 2,
      parameters: [
        { name: "Size", id: "1", flags: "", value: "100", hasChildren: false, rawAttrs: "" },
        { name: "Opacity", id: "2", flags: "", value: "1.0", hasChildren: false, rawAttrs: "" },
      ],
      factories: [{ id: "f1", uuid: "uuid-1", description: "Title" }],
    }),
    setParam: vi.fn().mockResolvedValue({ modified: true, outputPath: "/tmp/test.motn" }),
    cloneTemplate: vi.fn().mockResolvedValue({
      sourcePath: "/src/test.motn",
      destinationPath: "/dst/test.motn",
    }),
  };
});

vi.mock("../packages/motion/src/validate.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/motion/src/validate.js")>();
  return {
    ...actual,
    validateTemplate: vi.fn().mockResolvedValue({
      ok: true,
      violations: [],
      warnings: [],
    }),
  };
});

vi.mock("../packages/motion/src/render.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/motion/src/render.js")>();
  return {
    ...actual,
    renderViaCompressor: vi.fn().mockResolvedValue({
      jobId: "job-1",
      batchId: "batch-1",
      motnPath: "/tmp/test.motn",
      settingPath: "/tmp/setting.compressorsetting",
      locationPath: "/tmp/out.mov",
    }),
  };
});

vi.mock("../packages/motion/src/publish.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/motion/src/publish.js")>();
  return {
    ...actual,
    publishToFcp: vi.fn().mockResolvedValue({ modified: true, published: true }),
  };
});

vi.mock("../packages/motion/src/textEdit.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/motion/src/textEdit.js")>();
  return {
    ...actual,
    editText: vi.fn().mockResolvedValue({
      outputPath: "/tmp/test.motn",
      newText: "Hello",
      glyphCount: 5,
      styleRunCount: 1,
    }),
  };
});

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return { ...actual };
});

// ---------------------------------------------------------------------------
// Now import the module under test + mocked leaf exports
// ---------------------------------------------------------------------------

import { isMotionRunning, openMotion, openMotionTemplate } from "../packages/motion/src/app.js";
import { inspectTemplate, setParam, cloneTemplate } from "../packages/motion/src/ozml.js";
import { validateTemplate } from "../packages/motion/src/validate.js";
import { renderViaCompressor } from "../packages/motion/src/render.js";
import { publishToFcp } from "../packages/motion/src/publish.js";
import { editText } from "../packages/motion/src/textEdit.js";
import { CreatorStudioError } from "@creator-studio-os/core";
import { registerMotionTools } from "../packages/motion/src/tools.js";

// ---------------------------------------------------------------------------
// Mock MCP server
// ---------------------------------------------------------------------------

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
    if (!h) throw new Error(`Tool not registered: ${name}`);
    return h(args);
  }
  return { server, call };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("registerMotionTools", () => {
  let call: ReturnType<typeof makeMockServer>["call"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMotionRunning).mockResolvedValue(false);
    vi.mocked(openMotion).mockResolvedValue(undefined);
    vi.mocked(openMotionTemplate).mockResolvedValue(undefined);
    vi.mocked(inspectTemplate).mockResolvedValue({
      path: "/tmp/test.motn",
      ozmlVersion: "1.0",
      byteSize: 1024,
      parameterCount: 2,
      parameters: [
        { name: "Size", id: "1", flags: "", value: "100", hasChildren: false, rawAttrs: "" },
        { name: "Opacity", id: "2", flags: "", value: "1.0", hasChildren: false, rawAttrs: "" },
      ],
      factories: [{ id: "f1", uuid: "uuid-1", description: "Title" }],
    });
    vi.mocked(setParam).mockResolvedValue({ modified: true, outputPath: "/tmp/test.motn" });
    vi.mocked(cloneTemplate).mockResolvedValue({
      sourcePath: "/src/test.motn",
      destinationPath: "/dst/test.motn",
    });
    vi.mocked(validateTemplate).mockResolvedValue({
      ok: true,
      violations: [],
      warnings: [],
    });
    vi.mocked(renderViaCompressor).mockResolvedValue({
      jobId: "job-1",
      batchId: "batch-1",
      motnPath: "/tmp/test.motn",
      settingPath: "/tmp/setting.compressorsetting",
      locationPath: "/tmp/out.mov",
    });
    vi.mocked(publishToFcp).mockResolvedValue({ modified: true, published: true });
    vi.mocked(editText).mockResolvedValue({
      outputPath: "/tmp/test.motn",
      newText: "Hello",
      glyphCount: 5,
      styleRunCount: 1,
    });

    const ms = makeMockServer();
    registerMotionTools(ms.server);
    call = ms.call;
  });

  // ── motion_app_open ────────────────────────────────────────────────────

  it("motion_app_open — happy path", async () => {
    const r = await call("motion_app_open");
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ opened: true });
    expect(openMotion).toHaveBeenCalled();
  });

  it("motion_app_open — CreatorStudioError path", async () => {
    vi.mocked(openMotion).mockRejectedValueOnce(
      new CreatorStudioError("E_MOTION_NOT_FOUND", "not found"),
    );
    const r = await call("motion_app_open");
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_MOTION_NOT_FOUND");
  });

  it("motion_app_open — generic Error path", async () => {
    vi.mocked(openMotion).mockRejectedValueOnce(new Error("spawn failed"));
    const r = await call("motion_app_open");
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  // ── motion_app_running ─────────────────────────────────────────────────

  it("motion_app_running — returns running=false", async () => {
    vi.mocked(isMotionRunning).mockResolvedValue(false);
    const r = await call("motion_app_running");
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ running: false });
  });

  it("motion_app_running — returns running=true", async () => {
    vi.mocked(isMotionRunning).mockResolvedValue(true);
    const r = await call("motion_app_running");
    expect(JSON.parse(r.content[0].text)).toEqual({ running: true });
  });

  it("motion_app_running — error path", async () => {
    vi.mocked(isMotionRunning).mockRejectedValueOnce(new Error("osascript denied"));
    const r = await call("motion_app_running");
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  // ── motion_open ────────────────────────────────────────────────────────

  it("motion_open — happy path", async () => {
    const r = await call("motion_open", { path: "/templates/lower-third.motn" });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ opened: "/templates/lower-third.motn" });
    expect(openMotionTemplate).toHaveBeenCalledWith("/templates/lower-third.motn");
  });

  it("motion_open — CreatorStudioError path", async () => {
    vi.mocked(openMotionTemplate).mockRejectedValueOnce(
      new CreatorStudioError("E_MOTION_NOT_FOUND", "template missing"),
    );
    const r = await call("motion_open", { path: "/bad.motn" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_MOTION_NOT_FOUND");
  });

  it("motion_open — generic Error path", async () => {
    vi.mocked(openMotionTemplate).mockRejectedValueOnce(new Error("exit 1"));
    const r = await call("motion_open", { path: "/bad.motn" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).message).toBe("exit 1");
  });

  // ── motion_template_inspect ────────────────────────────────────────────

  it("motion_template_inspect — happy path returns summary", async () => {
    const r = await call("motion_template_inspect", { path: "/tmp/test.motn" });
    expect(r.isError).toBeFalsy();
    const body = JSON.parse(r.content[0].text);
    expect(body.ozmlVersion).toBe("1.0");
    expect(body.parameterCount).toBe(2);
    expect(body.returnedParameters).toBe(2);
  });

  it("motion_template_inspect — filterName trims parameter list", async () => {
    const r = await call("motion_template_inspect", {
      path: "/tmp/test.motn",
      filterName: "Size",
    });
    const body = JSON.parse(r.content[0].text);
    expect(body.filteredParameterCount).toBe(1);
    expect(body.parameters[0].name).toBe("Size");
  });

  it("motion_template_inspect — limit trims returned list", async () => {
    const r = await call("motion_template_inspect", {
      path: "/tmp/test.motn",
      limit: 1,
    });
    const body = JSON.parse(r.content[0].text);
    expect(body.returnedParameters).toBe(1);
    expect(body.filteredParameterCount).toBe(2);
  });

  it("motion_template_inspect — CreatorStudioError path", async () => {
    vi.mocked(inspectTemplate).mockRejectedValueOnce(
      new CreatorStudioError("E_OZML_INVALID", "bad file"),
    );
    const r = await call("motion_template_inspect", { path: "/bad.motn" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_OZML_INVALID");
  });

  it("motion_template_inspect — generic Error path", async () => {
    vi.mocked(inspectTemplate).mockRejectedValueOnce(new Error("read failed"));
    const r = await call("motion_template_inspect", { path: "/bad.motn" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  // ── motion_template_set_param ──────────────────────────────────────────

  it("motion_template_set_param — happy path", async () => {
    const r = await call("motion_template_set_param", {
      path: "/tmp/test.motn",
      name: "Size",
      id: "1",
      value: "200",
    });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text).modified).toBe(true);
    expect(setParam).toHaveBeenCalledWith(
      "/tmp/test.motn", "Size", "1", "200",
      { outputPath: undefined, matchIndex: undefined },
    );
  });

  it("motion_template_set_param — passes optional outputPath and matchIndex", async () => {
    const r = await call("motion_template_set_param", {
      path: "/tmp/test.motn",
      name: "Size",
      id: "1",
      value: "200",
      outputPath: "/out/test.motn",
      matchIndex: 1,
    });
    expect(r.isError).toBeFalsy();
    expect(setParam).toHaveBeenCalledWith(
      "/tmp/test.motn", "Size", "1", "200",
      { outputPath: "/out/test.motn", matchIndex: 1 },
    );
  });

  it("motion_template_set_param — CreatorStudioError path", async () => {
    vi.mocked(setParam).mockRejectedValueOnce(
      new CreatorStudioError("E_OZML_PARAM_NOT_FOUND", "param missing"),
    );
    const r = await call("motion_template_set_param", {
      path: "/tmp/test.motn",
      name: "Missing",
      id: "99",
      value: "0",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_OZML_PARAM_NOT_FOUND");
  });

  it("motion_template_set_param — generic Error path", async () => {
    vi.mocked(setParam).mockRejectedValueOnce(new Error("write failed"));
    const r = await call("motion_template_set_param", {
      path: "/tmp/test.motn",
      name: "Size",
      id: "1",
      value: "100",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  // ── motion_template_validate ───────────────────────────────────────────

  it("motion_template_validate — happy path returns ok=true", async () => {
    const r = await call("motion_template_validate", { path: "/tmp/test.motn" });
    expect(r.isError).toBeFalsy();
    const body = JSON.parse(r.content[0].text);
    expect(body.ok).toBe(true);
    expect(body.violations).toEqual([]);
  });

  it("motion_template_validate — CreatorStudioError path", async () => {
    vi.mocked(validateTemplate).mockRejectedValueOnce(
      new CreatorStudioError("E_OZML_VALIDATION_FAILED", "bad"),
    );
    const r = await call("motion_template_validate", { path: "/bad.motn" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_OZML_VALIDATION_FAILED");
  });

  it("motion_template_validate — generic Error path", async () => {
    vi.mocked(validateTemplate).mockRejectedValueOnce(new Error("file missing"));
    const r = await call("motion_template_validate", { path: "/bad.motn" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  // ── motion_template_clone ──────────────────────────────────────────────

  it("motion_template_clone — happy path", async () => {
    const r = await call("motion_template_clone", {
      sourcePath: "/src/test.motn",
      destinationPath: "/dst/test.motn",
    });
    expect(r.isError).toBeFalsy();
    const body = JSON.parse(r.content[0].text);
    expect(body.sourcePath).toBe("/src/test.motn");
    expect(body.destinationPath).toBe("/dst/test.motn");
  });

  it("motion_template_clone — CreatorStudioError path", async () => {
    vi.mocked(cloneTemplate).mockRejectedValueOnce(
      new CreatorStudioError("E_OZML_FILE_MISSING", "source missing"),
    );
    const r = await call("motion_template_clone", {
      sourcePath: "/missing.motn",
      destinationPath: "/dst/test.motn",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_OZML_FILE_MISSING");
  });

  it("motion_template_clone — generic Error path", async () => {
    vi.mocked(cloneTemplate).mockRejectedValueOnce(new Error("permission denied"));
    const r = await call("motion_template_clone", {
      sourcePath: "/src/test.motn",
      destinationPath: "/dst/test.motn",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  // ── motion_render_via_compressor ───────────────────────────────────────

  it("motion_render_via_compressor — happy path", async () => {
    const r = await call("motion_render_via_compressor", {
      motnPath: "/tmp/test.motn",
      settingPath: "/tmp/setting.compressorsetting",
      locationPath: "/tmp/out.mov",
    });
    expect(r.isError).toBeFalsy();
    const body = JSON.parse(r.content[0].text);
    expect(body.jobId).toBe("job-1");
    expect(renderViaCompressor).toHaveBeenCalledWith({
      motnPath: "/tmp/test.motn",
      settingPath: "/tmp/setting.compressorsetting",
      locationPath: "/tmp/out.mov",
      batchName: undefined,
    });
  });

  it("motion_render_via_compressor — passes batchName when provided", async () => {
    const r = await call("motion_render_via_compressor", {
      motnPath: "/tmp/test.motn",
      settingPath: "/tmp/setting.compressorsetting",
      locationPath: "/tmp/out.mov",
      batchName: "My Batch",
    });
    expect(r.isError).toBeFalsy();
    expect(renderViaCompressor).toHaveBeenCalledWith(
      expect.objectContaining({ batchName: "My Batch" }),
    );
  });

  it("motion_render_via_compressor — CreatorStudioError path", async () => {
    vi.mocked(renderViaCompressor).mockRejectedValueOnce(
      new CreatorStudioError("E_COMPRESSOR_FAILED", "encode failed"),
    );
    const r = await call("motion_render_via_compressor", {
      motnPath: "/tmp/test.motn",
      settingPath: "/tmp/setting.compressorsetting",
      locationPath: "/tmp/out.mov",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_COMPRESSOR_FAILED");
  });

  it("motion_render_via_compressor — generic Error path", async () => {
    vi.mocked(renderViaCompressor).mockRejectedValueOnce(new Error("no compressor"));
    const r = await call("motion_render_via_compressor", {
      motnPath: "/tmp/test.motn",
      settingPath: "/tmp/setting.compressorsetting",
      locationPath: "/tmp/out.mov",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  // ── motion_publish_to_fcp ──────────────────────────────────────────────

  it("motion_publish_to_fcp — happy path publish=true", async () => {
    const r = await call("motion_publish_to_fcp", {
      path: "/tmp/test.motn",
      paramName: "Headline",
      paramId: 42,
      publish: true,
    });
    expect(r.isError).toBeFalsy();
    const body = JSON.parse(r.content[0].text);
    expect(body.modified).toBe(true);
    expect(publishToFcp).toHaveBeenCalledWith({
      path: "/tmp/test.motn",
      paramName: "Headline",
      paramId: 42,
      publish: true,
      matchIndex: undefined,
      outputPath: undefined,
    });
  });

  it("motion_publish_to_fcp — happy path publish=false", async () => {
    const r = await call("motion_publish_to_fcp", {
      path: "/tmp/test.motn",
      paramName: "Headline",
      paramId: 42,
      publish: false,
    });
    expect(r.isError).toBeFalsy();
    expect(publishToFcp).toHaveBeenCalledWith(
      expect.objectContaining({ publish: false }),
    );
  });

  it("motion_publish_to_fcp — passes optional outputPath and matchIndex", async () => {
    const r = await call("motion_publish_to_fcp", {
      path: "/tmp/test.motn",
      paramName: "Headline",
      paramId: 42,
      publish: true,
      outputPath: "/out/test.motn",
      matchIndex: 0,
    });
    expect(r.isError).toBeFalsy();
    expect(publishToFcp).toHaveBeenCalledWith(
      expect.objectContaining({ outputPath: "/out/test.motn", matchIndex: 0 }),
    );
  });

  it("motion_publish_to_fcp — CreatorStudioError path", async () => {
    vi.mocked(publishToFcp).mockRejectedValueOnce(
      new CreatorStudioError("E_OZML_PUBLISH_MARKER_MISSING", "marker gone"),
    );
    const r = await call("motion_publish_to_fcp", {
      path: "/tmp/test.motn",
      paramName: "Headline",
      paramId: 42,
      publish: false,
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_OZML_PUBLISH_MARKER_MISSING");
  });

  it("motion_publish_to_fcp — generic Error path", async () => {
    vi.mocked(publishToFcp).mockRejectedValueOnce(new Error("write failed"));
    const r = await call("motion_publish_to_fcp", {
      path: "/tmp/test.motn",
      paramName: "Headline",
      paramId: 42,
      publish: true,
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  // ── motion_template_edit_text ──────────────────────────────────────────

  it("motion_template_edit_text — happy path", async () => {
    const r = await call("motion_template_edit_text", {
      path: "/tmp/test.motn",
      newText: "Hello World",
    });
    expect(r.isError).toBeFalsy();
    const body = JSON.parse(r.content[0].text);
    expect(body.newText).toBe("Hello");
    expect(editText).toHaveBeenCalledWith("/tmp/test.motn", "Hello World", {
      textNodeIndex: undefined,
      outputPath: undefined,
      allowNonAscii: undefined,
    });
  });

  it("motion_template_edit_text — passes optional params", async () => {
    const r = await call("motion_template_edit_text", {
      path: "/tmp/test.motn",
      newText: "Hello",
      textNodeIndex: 1,
      outputPath: "/out/test.motn",
      allowNonAscii: true,
    });
    expect(r.isError).toBeFalsy();
    expect(editText).toHaveBeenCalledWith("/tmp/test.motn", "Hello", {
      textNodeIndex: 1,
      outputPath: "/out/test.motn",
      allowNonAscii: true,
    });
  });

  it("motion_template_edit_text — CreatorStudioError path", async () => {
    vi.mocked(editText).mockRejectedValueOnce(
      new CreatorStudioError("E_NON_ASCII", "non-ascii blocked"),
    );
    const r = await call("motion_template_edit_text", {
      path: "/tmp/test.motn",
      newText: "日本語",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_NON_ASCII");
  });

  it("motion_template_edit_text — generic Error path", async () => {
    vi.mocked(editText).mockRejectedValueOnce(new Error("file locked"));
    const r = await call("motion_template_edit_text", {
      path: "/tmp/test.motn",
      newText: "Test",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
    expect(JSON.parse(r.content[0].text).message).toBe("file locked");
  });
});

// ---------------------------------------------------------------------------
// Motion recovery profile
// ---------------------------------------------------------------------------

describe("motion recovery", () => {
  it("has correct app and null badStatePattern", async () => {
    const { recovery } = await import("../packages/motion/src/recovery.js");
    expect(recovery.app).toBe("motion");
    expect(recovery.badStatePattern).toBeNull();
  });

  it("recover() resolves without throwing", async () => {
    const { recovery } = await import("../packages/motion/src/recovery.js");
    await expect(recovery.recover()).resolves.toBeUndefined();
  });
});
