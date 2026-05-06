/**
 * iwork-docs — Pages and Numbers MCP tool coverage.
 *
 * Mocks all AppleScript/OS leaf calls via @creator-studio-os/core so no
 * live apps are required. Exercises happy paths and both error branches
 * (CreatorStudioError and generic Error) for every registered tool.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ---------------------------------------------------------------------------
// Core mock — intercepts all app helpers used by pages/tools + numbers/tools
// ---------------------------------------------------------------------------

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    loadConfig: () => ({
      pagesBundleId: "com.apple.iWork.Pages",
      numbersBundleId: "com.apple.Numbers",
    }),
    activateApp: vi.fn().mockResolvedValue(undefined),
    isAppRunning: vi.fn().mockResolvedValue(false),
    openDocumentInApp: vi.fn().mockResolvedValue({ name: "doc.pages" }),
    closeDocumentInApp: vi.fn().mockResolvedValue(undefined),
    exportDocumentInApp: vi.fn().mockResolvedValue(undefined),
  };
});

import {
  activateApp,
  isAppRunning,
  openDocumentInApp,
  closeDocumentInApp,
  exportDocumentInApp,
  CreatorStudioError,
} from "@creator-studio-os/core";
import { registerPagesTools } from "@creator-studio-os/iwork-docs";
import { registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// ---------------------------------------------------------------------------
// Minimal mock server — captures tool handlers for direct invocation
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
// Pages tools
// ---------------------------------------------------------------------------

describe("registerPagesTools", () => {
  let call: ReturnType<typeof makeMockServer>["call"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(activateApp).mockResolvedValue(undefined);
    vi.mocked(isAppRunning).mockResolvedValue(true);
    vi.mocked(openDocumentInApp).mockResolvedValue({ name: "My Doc.pages" });
    vi.mocked(closeDocumentInApp).mockResolvedValue(undefined);
    vi.mocked(exportDocumentInApp).mockResolvedValue(undefined);

    const ms = makeMockServer();
    registerPagesTools(ms.server);
    call = ms.call;
  });

  it("pages_app_open — happy path", async () => {
    const r = await call("pages_app_open");
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ opened: true });
    expect(activateApp).toHaveBeenCalledWith("com.apple.iWork.Pages");
  });

  it("pages_app_open — error path (CreatorStudioError)", async () => {
    vi.mocked(activateApp).mockRejectedValueOnce(
      new CreatorStudioError("E_AUTOMATION_DENIED", "denied"),
    );
    const r = await call("pages_app_open");
    expect(r.isError).toBe(true);
    const body = JSON.parse(r.content[0].text);
    expect(body.code).toBe("E_AUTOMATION_DENIED");
  });

  it("pages_app_open — error path (generic Error)", async () => {
    vi.mocked(activateApp).mockRejectedValueOnce(new Error("unexpected"));
    const r = await call("pages_app_open");
    expect(r.isError).toBe(true);
    const body = JSON.parse(r.content[0].text);
    expect(body.code).toBe("E_INTERNAL");
    expect(body.message).toBe("unexpected");
  });

  it("pages_app_running — true", async () => {
    vi.mocked(isAppRunning).mockResolvedValue(true);
    const r = await call("pages_app_running");
    expect(JSON.parse(r.content[0].text)).toEqual({ running: true });
  });

  it("pages_app_running — false", async () => {
    vi.mocked(isAppRunning).mockResolvedValue(false);
    const r = await call("pages_app_running");
    expect(JSON.parse(r.content[0].text)).toEqual({ running: false });
  });

  it("pages_app_running — error path", async () => {
    vi.mocked(isAppRunning).mockRejectedValueOnce(new Error("osascript fail"));
    const r = await call("pages_app_running");
    expect(r.isError).toBe(true);
  });

  it("pages_open — happy path", async () => {
    const r = await call("pages_open", { path: "/docs/letter.pages" });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ name: "My Doc.pages" });
    expect(openDocumentInApp).toHaveBeenCalledWith("com.apple.iWork.Pages", "/docs/letter.pages");
  });

  it("pages_open — error path", async () => {
    vi.mocked(openDocumentInApp).mockRejectedValueOnce(
      new CreatorStudioError("E_OSASCRIPT_FAILED", "open failed"),
    );
    const r = await call("pages_open", { path: "/missing.pages" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_OSASCRIPT_FAILED");
  });

  it("pages_close — happy path", async () => {
    const r = await call("pages_close", { name: "My Doc.pages", saving: "no" });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ closed: "My Doc.pages" });
    expect(closeDocumentInApp).toHaveBeenCalledWith("com.apple.iWork.Pages", "My Doc.pages", "no");
  });

  it("pages_close — error path", async () => {
    vi.mocked(closeDocumentInApp).mockRejectedValueOnce(new Error("busy"));
    const r = await call("pages_close", { name: "x.pages", saving: "yes" });
    expect(r.isError).toBe(true);
  });

  it("pages_export PDF — happy path", async () => {
    const r = await call("pages_export", {
      documentName: "Report.pages",
      outputPath: "/out/report.pdf",
      format: "PDF",
    });
    expect(r.isError).toBeFalsy();
    const body = JSON.parse(r.content[0].text);
    expect(body).toEqual({ exported: "/out/report.pdf", format: "PDF" });
    expect(exportDocumentInApp).toHaveBeenCalledWith(
      expect.objectContaining({ formatLiteral: "PDF" }),
    );
  });

  it("pages_export Word — happy path", async () => {
    const r = await call("pages_export", {
      documentName: "Report.pages",
      outputPath: "/out/report.docx",
      format: "Word",
    });
    expect(r.isError).toBeFalsy();
    expect(exportDocumentInApp).toHaveBeenCalledWith(
      expect.objectContaining({ formatLiteral: "Microsoft Word" }),
    );
  });

  it("pages_export — error path", async () => {
    vi.mocked(exportDocumentInApp).mockRejectedValueOnce(
      new CreatorStudioError("E_OSASCRIPT_FAILED", "export blocked"),
    );
    const r = await call("pages_export", {
      documentName: "x.pages",
      outputPath: "/out/x.pdf",
      format: "PDF",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_OSASCRIPT_FAILED");
  });
});

// ---------------------------------------------------------------------------
// Numbers tools
// ---------------------------------------------------------------------------

describe("registerNumbersTools", () => {
  let call: ReturnType<typeof makeMockServer>["call"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(activateApp).mockResolvedValue(undefined);
    vi.mocked(isAppRunning).mockResolvedValue(true);
    vi.mocked(openDocumentInApp).mockResolvedValue({ name: "Sheet.numbers" });
    vi.mocked(closeDocumentInApp).mockResolvedValue(undefined);
    vi.mocked(exportDocumentInApp).mockResolvedValue(undefined);

    const ms = makeMockServer();
    registerNumbersTools(ms.server);
    call = ms.call;
  });

  it("numbers_app_open — happy path", async () => {
    const r = await call("numbers_app_open");
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ opened: true });
    expect(activateApp).toHaveBeenCalledWith("com.apple.Numbers");
  });

  it("numbers_app_open — error path", async () => {
    vi.mocked(activateApp).mockRejectedValueOnce(new Error("fail"));
    const r = await call("numbers_app_open");
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_INTERNAL");
  });

  it("numbers_app_running — true", async () => {
    vi.mocked(isAppRunning).mockResolvedValue(true);
    const r = await call("numbers_app_running");
    expect(JSON.parse(r.content[0].text)).toEqual({ running: true });
  });

  it("numbers_app_running — false", async () => {
    vi.mocked(isAppRunning).mockResolvedValue(false);
    const r = await call("numbers_app_running");
    expect(JSON.parse(r.content[0].text)).toEqual({ running: false });
  });

  it("numbers_app_running — error path (CreatorStudioError)", async () => {
    vi.mocked(isAppRunning).mockRejectedValueOnce(
      new CreatorStudioError("E_AUTOMATION_DENIED", "denied"),
    );
    const r = await call("numbers_app_running");
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_AUTOMATION_DENIED");
  });

  it("numbers_open — happy path", async () => {
    const r = await call("numbers_open", { path: "/data/sales.numbers" });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ name: "Sheet.numbers" });
  });

  it("numbers_open — error path", async () => {
    vi.mocked(openDocumentInApp).mockRejectedValueOnce(new Error("not found"));
    const r = await call("numbers_open", { path: "/missing.numbers" });
    expect(r.isError).toBe(true);
  });

  it("numbers_close — happy path", async () => {
    const r = await call("numbers_close", { name: "Sheet.numbers", saving: "yes" });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({ closed: "Sheet.numbers" });
  });

  it("numbers_close — error path", async () => {
    vi.mocked(closeDocumentInApp).mockRejectedValueOnce(
      new CreatorStudioError("E_OSASCRIPT_FAILED", "locked"),
    );
    const r = await call("numbers_close", { name: "x.numbers", saving: "no" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).code).toBe("E_OSASCRIPT_FAILED");
  });

  it("numbers_export PDF — happy path", async () => {
    const r = await call("numbers_export", {
      documentName: "Sales.numbers",
      outputPath: "/out/sales.pdf",
      format: "PDF",
    });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toEqual({
      exported: "/out/sales.pdf",
      format: "PDF",
    });
    expect(exportDocumentInApp).toHaveBeenCalledWith(
      expect.objectContaining({ formatLiteral: "PDF" }),
    );
  });

  it("numbers_export Excel — happy path", async () => {
    const r = await call("numbers_export", {
      documentName: "Sales.numbers",
      outputPath: "/out/sales.xlsx",
      format: "Excel",
    });
    expect(r.isError).toBeFalsy();
    expect(exportDocumentInApp).toHaveBeenCalledWith(
      expect.objectContaining({ formatLiteral: "Microsoft Excel" }),
    );
  });

  it("numbers_export CSV — happy path", async () => {
    const r = await call("numbers_export", {
      documentName: "Sales.numbers",
      outputPath: "/out/sales.csv",
      format: "CSV",
    });
    expect(r.isError).toBeFalsy();
    expect(exportDocumentInApp).toHaveBeenCalledWith(
      expect.objectContaining({ formatLiteral: "CSV" }),
    );
  });

  it("numbers_export — error path", async () => {
    vi.mocked(exportDocumentInApp).mockRejectedValueOnce(new Error("disk full"));
    const r = await call("numbers_export", {
      documentName: "x.numbers",
      outputPath: "/out/x.pdf",
      format: "PDF",
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text).message).toBe("disk full");
  });
});

// ---------------------------------------------------------------------------
// Recovery profiles — verify shape and that recover() is callable
// ---------------------------------------------------------------------------

describe("iwork-docs recovery profiles", () => {
  it("pagesRecovery has correct app and null pattern", () => {
    expect(pagesRecovery.app).toBe("pages");
    expect(pagesRecovery.badStatePattern).toBeNull();
  });

  it("pagesRecovery.recover() resolves without throwing", async () => {
    await expect(pagesRecovery.recover()).resolves.toBeUndefined();
  });

  it("numbersRecovery has correct app and null pattern", () => {
    expect(numbersRecovery.app).toBe("numbers");
    expect(numbersRecovery.badStatePattern).toBeNull();
  });

  it("numbersRecovery.recover() resolves without throwing", async () => {
    await expect(numbersRecovery.recover()).resolves.toBeUndefined();
  });
});
