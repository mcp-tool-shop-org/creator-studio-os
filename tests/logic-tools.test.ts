/**
 * logic — MCP tool and app-layer coverage.
 *
 * Two test layers:
 * 1. Tools layer — mocks app.js leaf so tools.ts dispatch logic is covered.
 * 2. App layer — mocks runAppleScript + child_process.spawn so app.ts
 *    logic is covered without invoking a real system.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ---------------------------------------------------------------------------
// Mock leaf modules for tool-dispatch layer
// ---------------------------------------------------------------------------

vi.mock("../packages/logic/src/app.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/logic/src/app.js")>();
  return {
    ...actual,
    isLogicRunning: vi.fn().mockResolvedValue(false),
    openLogic: vi.fn().mockResolvedValue(undefined),
    openLogicProject: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return { ...actual };
});

import { isLogicRunning, openLogic, openLogicProject } from "../packages/logic/src/app.js";
import { registerLogicTools, recovery as logicRecovery } from "@creator-studio-os/logic";
import { CreatorStudioError } from "@creator-studio-os/core";

// ---------------------------------------------------------------------------
// Minimal mock server
// ---------------------------------------------------------------------------

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };
type Handler = (args: Record<string, unknown>) => Promise<ToolResult>;

function makeMockServer() {
  const registry = new Map<string, Handler>();
  const server = {
    tool(_name: string, _desc: string, _schema: unknown, handler: Handler) {
      registry.set(_name, handler);
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
// Tool tests
// ---------------------------------------------------------------------------

describe("registerLogicTools", () => {
  let call: ReturnType<typeof makeMockServer>["call"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isLogicRunning).mockResolvedValue(false);
    vi.mocked(openLogic).mockResolvedValue(undefined);
    vi.mocked(openLogicProject).mockResolvedValue(undefined);

    const ms = makeMockServer();
    registerLogicTools(ms.server);
    call = ms.call;
  });

  // logic_app_open
  it("logic_app_open — happy path", async () => {
    const r = await call("logic_app_open");
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ opened: true });
    expect(openLogic).toHaveBeenCalled();
  });

  it("logic_app_open — CreatorStudioError path", async () => {
    vi.mocked(openLogic).mockRejectedValueOnce(
      new CreatorStudioError("E_LOGIC_NOT_FOUND", "not found"),
    );
    const r = await call("logic_app_open");
    expect(r.isError).toBe(true);
    const body = JSON.parse(r.content[0].text);
    expect(body.code).toBe("E_LOGIC_NOT_FOUND");
  });

  it("logic_app_open — generic Error path", async () => {
    vi.mocked(openLogic).mockRejectedValueOnce(new Error("spawn failed"));
    const r = await call("logic_app_open");
    expect(r.isError).toBe(true);
    const body = JSON.parse(r.content[0].text);
    expect(body.code).toBe("E_INTERNAL");
    expect(body.message).toBe("spawn failed");
  });

  // logic_app_running
  it("logic_app_running — running=false", async () => {
    vi.mocked(isLogicRunning).mockResolvedValue(false);
    const r = await call("logic_app_running");
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ running: false });
  });

  it("logic_app_running — running=true", async () => {
    vi.mocked(isLogicRunning).mockResolvedValue(true);
    const r = await call("logic_app_running");
    expect(JSON.parse(r.content[0].text)).toEqual({ running: true });
  });

  it("logic_app_running — error path", async () => {
    vi.mocked(isLogicRunning).mockRejectedValueOnce(new Error("osascript denied"));
    const r = await call("logic_app_running");
    expect(r.isError).toBe(true);
  });

  // logic_open
  it("logic_open — happy path", async () => {
    const r = await call("logic_open", { path: "/projects/session.logicx" });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ opened: "/projects/session.logicx" });
    expect(openLogicProject).toHaveBeenCalledWith("/projects/session.logicx");
  });

  it("logic_open — CreatorStudioError path", async () => {
    vi.mocked(openLogicProject).mockRejectedValueOnce(
      new CreatorStudioError("E_LOGIC_NOT_FOUND", "project missing"),
    );
    const r = await call("logic_open", { path: "/missing.logicx" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_LOGIC_NOT_FOUND");
  });

  it("logic_open — generic Error path", async () => {
    vi.mocked(openLogicProject).mockRejectedValueOnce(new Error("exit 1"));
    const r = await call("logic_open", { path: "/bad.logicx" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).message).toBe("exit 1");
  });
});

// ---------------------------------------------------------------------------
// Recovery profile
// ---------------------------------------------------------------------------

describe("logicRecovery", () => {
  it("has correct app and null pattern", () => {
    expect(logicRecovery.app).toBe("logic");
    expect(logicRecovery.badStatePattern).toBeNull();
  });

  it("recover() resolves without throwing", async () => {
    await expect(logicRecovery.recover()).resolves.toBeUndefined();
  });
});
