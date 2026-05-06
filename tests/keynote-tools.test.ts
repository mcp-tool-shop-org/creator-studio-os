/**
 * Unit tests for registerKeynoteTools — covers all 56 tools in
 * packages/keynote/src/tools.ts plus the recovery profile.
 *
 * Target: packages/keynote/src ≥75% line coverage AND ≥75% branch coverage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ---------------------------------------------------------------------------
// Mocks — must be top-level (vi.mock is hoisted)
// ---------------------------------------------------------------------------

vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockReturnValue({
      keynoteBundleId: "com.apple.iWork.Keynote",
      fcpBundleId: "com.apple.FinalCut",
    }),
    runAppleScript: vi.fn().mockResolvedValue(""),
    activateApp: vi.fn().mockResolvedValue(undefined),
    isAppRunning: vi.fn().mockResolvedValue(true),
    openDocumentInApp: vi.fn().mockResolvedValue("My Presentation"),
    closeDocumentInApp: vi.fn().mockResolvedValue(undefined),
    exportDocumentInApp: vi.fn().mockResolvedValue(undefined),
    openWithApp: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@creator-studio-os/fcp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/fcp")>();
  return {
    ...actual,
    buildProjectFcpxml: vi.fn().mockReturnValue({ xml: "<fcpxml/>" }),
  };
});

vi.mock("@creator-studio-os/compressor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/compressor")>();
  return {
    ...actual,
    encodeJob: vi.fn().mockResolvedValue({ jobId: "job-1", batchId: "batch-1" }),
  };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue(["slide1.png", "slide2.png"]),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../packages/keynote/src/markdown.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/keynote/src/markdown.js")>();
  return {
    ...actual,
    parseMarkdown: vi.fn().mockReturnValue([
      { title: "Slide 1", body: "", notes: "", master: "cover" },
    ]),
    slidesToAppleScript: vi.fn().mockReturnValue('tell application "Keynote" to end tell'),
  };
});

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { registerKeynoteTools, recovery } from "@creator-studio-os/keynote";
import { CreatorStudioError } from "@creator-studio-os/core";
import {
  loadConfig,
  runAppleScript,
  activateApp,
  isAppRunning,
  openDocumentInApp,
  closeDocumentInApp,
  exportDocumentInApp,
  openWithApp,
} from "@creator-studio-os/core";
import { buildProjectFcpxml } from "@creator-studio-os/fcp";
import { encodeJob } from "@creator-studio-os/compressor";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { parseMarkdown, slidesToAppleScript } from "../packages/keynote/src/markdown.js";

// ---------------------------------------------------------------------------
// Mock server helper
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

function parsed(r: ToolResult) {
  return JSON.parse(r.content[0]!.text);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("registerKeynoteTools", () => {
  let call: ReturnType<typeof makeMockServer>["call"];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return values
    vi.mocked(loadConfig).mockReturnValue({
      keynoteBundleId: "com.apple.iWork.Keynote",
      fcpBundleId: "com.apple.FinalCut",
    } as ReturnType<typeof loadConfig>);
    vi.mocked(runAppleScript).mockResolvedValue("");
    vi.mocked(activateApp).mockResolvedValue(undefined);
    vi.mocked(isAppRunning).mockResolvedValue(true);
    vi.mocked(openDocumentInApp).mockResolvedValue("My Presentation");
    vi.mocked(closeDocumentInApp).mockResolvedValue(undefined);
    vi.mocked(exportDocumentInApp).mockResolvedValue(undefined);
    vi.mocked(openWithApp).mockResolvedValue(undefined);
    vi.mocked(buildProjectFcpxml).mockReturnValue({ xml: "<fcpxml/>" } as ReturnType<typeof buildProjectFcpxml>);
    vi.mocked(encodeJob).mockResolvedValue({ jobId: "job-1", batchId: "batch-1" } as ReturnType<typeof encodeJob>);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(readdir).mockResolvedValue(["Slide 001.png", "Slide 002.png"] as unknown as ReturnType<typeof readdir>);
    vi.mocked(writeFile).mockResolvedValue(undefined);
    vi.mocked(parseMarkdown).mockReturnValue([
      { title: "Slide 1", body: "", notes: "", master: "cover" } as ReturnType<typeof parseMarkdown>[0],
    ]);
    vi.mocked(slidesToAppleScript).mockReturnValue('tell application "Keynote" to end tell');

    const ms = makeMockServer();
    registerKeynoteTools(ms.server);
    call = ms.call;
  });

  // ── App lifecycle ────────────────────────────────────────────────────────

  describe("keynote_app_open", () => {
    it("happy path — activates app and returns {opened:true}", async () => {
      const r = await call("keynote_app_open");
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toEqual({ opened: true });
      expect(activateApp).toHaveBeenCalledWith("com.apple.iWork.Keynote");
    });

    it("CreatorStudioError path", async () => {
      vi.mocked(activateApp).mockRejectedValueOnce(
        new CreatorStudioError("E_KEYNOTE_NOT_FOUND", "keynote not found"),
      );
      const r = await call("keynote_app_open");
      expect(r.isError).toBe(true);
      const body = parsed(r);
      expect(body.code).toBe("E_KEYNOTE_NOT_FOUND");
    });

    it("generic Error path", async () => {
      vi.mocked(activateApp).mockRejectedValueOnce(new Error("spawn failed"));
      const r = await call("keynote_app_open");
      expect(r.isError).toBe(true);
      expect(parsed(r).code).toBe("E_INTERNAL");
    });
  });

  describe("keynote_app_running", () => {
    it("happy path — returns running status", async () => {
      vi.mocked(isAppRunning).mockResolvedValueOnce(false);
      const r = await call("keynote_app_running");
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toEqual({ running: false });
    });

    it("error path", async () => {
      vi.mocked(isAppRunning).mockRejectedValueOnce(new Error("failed"));
      const r = await call("keynote_app_running");
      expect(r.isError).toBe(true);
    });
  });

  // ── Document management ──────────────────────────────────────────────────

  describe("keynote_open", () => {
    it("happy path — returns document name", async () => {
      vi.mocked(openDocumentInApp).mockResolvedValueOnce("Test.key");
      const r = await call("keynote_open", { path: "/tmp/Test.key" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toBe("Test.key");
    });

    it("error path", async () => {
      vi.mocked(openDocumentInApp).mockRejectedValueOnce(
        new CreatorStudioError("E_KEYNOTE_NOT_FOUND", "not found"),
      );
      const r = await call("keynote_open", { path: "/tmp/missing.key" });
      expect(r.isError).toBe(true);
      expect(parsed(r).code).toBe("E_KEYNOTE_NOT_FOUND");
    });
  });

  describe("keynote_close", () => {
    it("happy path", async () => {
      const r = await call("keynote_close", { name: "MyDeck", saving: "yes" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toEqual({ closed: "MyDeck" });
      expect(closeDocumentInApp).toHaveBeenCalledWith(
        "com.apple.iWork.Keynote",
        "MyDeck",
        "yes",
      );
    });

    it("error path", async () => {
      vi.mocked(closeDocumentInApp).mockRejectedValueOnce(new Error("close failed"));
      const r = await call("keynote_close", { name: "MyDeck", saving: "no" });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_list_presentations", () => {
    it("happy path — parses comma-separated doc names", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("Doc1, Doc2");
      const r = await call("keynote_list_presentations");
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toEqual({ documents: ["Doc1", "Doc2"] });
    });

    it("returns empty array when AppleScript returns blank", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("  ");
      const r = await call("keynote_list_presentations");
      expect(parsed(r)).toEqual({ documents: [] });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("oops"));
      const r = await call("keynote_list_presentations");
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_create_presentation", () => {
    it("happy path without theme", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("Untitled");
      const r = await call("keynote_create_presentation", {});
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ name: "Untitled", created: true });
    });

    it("happy path with width+height and theme", async () => {
      vi.mocked(runAppleScript)
        .mockResolvedValueOnce("NewDoc") // make
        .mockResolvedValueOnce(""); // apply theme
      const r = await call("keynote_create_presentation", {
        themeName: "Black",
        width: 1280,
        height: 720,
      });
      expect(r.isError).toBeFalsy();
      expect(runAppleScript).toHaveBeenCalledTimes(2);
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("timeout"));
      const r = await call("keynote_create_presentation", {});
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_save", () => {
    it("happy path in-place", async () => {
      const r = await call("keynote_save", { name: "Deck" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ saved: "Deck", path: "in place" });
    });

    it("happy path with outputPath", async () => {
      const r = await call("keynote_save", { name: "Deck", outputPath: "/tmp/out.key" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ saved: "Deck", path: "/tmp/out.key" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("save failed"));
      const r = await call("keynote_save", { name: "Deck" });
      expect(r.isError).toBe(true);
    });
  });

  // ── Theme & master ───────────────────────────────────────────────────────

  describe("keynote_list_themes", () => {
    it("happy path — returns themes array", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("White, Black, Gradient");
      const r = await call("keynote_list_themes");
      expect(r.isError).toBeFalsy();
      expect(parsed(r).themes).toHaveLength(3);
      expect(parsed(r).themes[0]).toEqual({ name: "White" });
    });

    it("empty when blank output", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("");
      const r = await call("keynote_list_themes");
      expect(parsed(r).themes).toEqual([]);
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("oops"));
      const r = await call("keynote_list_themes");
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_apply_theme", () => {
    it("happy path", async () => {
      const r = await call("keynote_apply_theme", { name: "Deck", themeName: "White" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ applied: "White", to: "Deck" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("theme not found"));
      const r = await call("keynote_apply_theme", { name: "Deck", themeName: "Bogus" });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_list_masters", () => {
    it("happy path — parses master names", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("Title Slide, Blank, Content");
      const r = await call("keynote_list_masters", { name: "Deck" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).masters).toHaveLength(3);
    });

    it("empty when blank", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("  ");
      const r = await call("keynote_list_masters", { name: "Deck" });
      expect(parsed(r).masters).toEqual([]);
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_list_masters", { name: "Deck" });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_set_slide_master", () => {
    it("happy path", async () => {
      const r = await call("keynote_set_slide_master", {
        name: "Deck",
        slideIndex: 1,
        masterName: "Blank",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 1, masterName: "Blank" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_slide_master", {
        name: "Deck",
        slideIndex: 1,
        masterName: "Blank",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── Slide CRUD ───────────────────────────────────────────────────────────

  describe("keynote_list_slides", () => {
    it("happy path — parses slide list", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce(
        "slideNumber:1, title:Hello, skipped:false",
      );
      const r = await call("keynote_list_slides", { name: "Deck" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).slides).toHaveLength(1);
      expect(parsed(r).slides[0]).toMatchObject({ slideNumber: 1, title: "Hello", skipped: false });
    });

    it("empty slides list", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("");
      const r = await call("keynote_list_slides", { name: "Deck" });
      expect(parsed(r).slides).toEqual([]);
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_list_slides", { name: "Deck" });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_make_slide", () => {
    it("happy path — no options", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("3");
      const r = await call("keynote_make_slide", { name: "Deck" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 3, document: "Deck" });
    });

    it("happy path — with masterName and afterSlide", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("2");
      const r = await call("keynote_make_slide", {
        name: "Deck",
        masterName: "Blank",
        afterSlide: 1,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).slideIndex).toBe(2);
    });

    it("handles non-integer response", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("not a number");
      const r = await call("keynote_make_slide", { name: "Deck" });
      expect(parsed(r).slideIndex).toBeNull();
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_make_slide", { name: "Deck" });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_delete_slide", () => {
    it("happy path", async () => {
      const r = await call("keynote_delete_slide", { name: "Deck", slideIndex: 2 });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ deleted: 2, document: "Deck" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_delete_slide", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_duplicate_slide", () => {
    it("happy path", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("3");
      const r = await call("keynote_duplicate_slide", { name: "Deck", slideIndex: 2 });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ original: 2, duplicate: 3 });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_duplicate_slide", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_reorder_slide", () => {
    it("happy path — move after a slide", async () => {
      const r = await call("keynote_reorder_slide", {
        name: "Deck",
        slideIndex: 3,
        afterSlide: 1,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ moved: 3, afterSlide: 1 });
    });

    it("happy path — move to beginning (afterSlide=0)", async () => {
      const r = await call("keynote_reorder_slide", {
        name: "Deck",
        slideIndex: 3,
        afterSlide: 0,
      });
      expect(r.isError).toBeFalsy();
      // Should use 'before slide 1' branch
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("before slide 1");
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_reorder_slide", { name: "Deck", slideIndex: 1, afterSlide: 0 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_skip_slide", () => {
    it("happy path — skip", async () => {
      const r = await call("keynote_skip_slide", {
        name: "Deck",
        slideIndex: 2,
        skipped: true,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 2, skipped: true });
    });

    it("happy path — unskip", async () => {
      const r = await call("keynote_skip_slide", {
        name: "Deck",
        slideIndex: 2,
        skipped: false,
      });
      expect(parsed(r).skipped).toBe(false);
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_skip_slide", { name: "Deck", slideIndex: 1, skipped: true });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_get_slide", () => {
    it("happy path — parses pipe-delimited response", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce(
        "title=Hello|||body=World|||notes=Speaker|||effect=dissolve|||duration=1|||skipped=false",
      );
      const r = await call("keynote_get_slide", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBeFalsy();
      const body = parsed(r);
      expect(body.title).toBe("Hello");
      expect(body.body).toBe("World");
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_get_slide", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_list_items", () => {
    it("happy path — parses item list", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce(
        "shape class:100,200:300x150, image class:50,50:200x100",
      );
      const r = await call("keynote_list_items", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).items).toHaveLength(2);
    });

    it("empty slide returns empty items", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("  ");
      const r = await call("keynote_list_items", { name: "Deck", slideIndex: 1 });
      expect(parsed(r).items).toEqual([]);
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_list_items", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  // ── Content ──────────────────────────────────────────────────────────────

  describe("keynote_set_title", () => {
    it("happy path", async () => {
      const r = await call("keynote_set_title", {
        name: "Deck",
        slideIndex: 1,
        title: "My Title",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 1, title: "My Title" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_title", { name: "Deck", slideIndex: 1, title: "T" });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_set_body", () => {
    it("happy path without fontSize", async () => {
      const r = await call("keynote_set_body", {
        name: "Deck",
        slideIndex: 1,
        body: "Body text",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 1, body: "Body text" });
    });

    it("happy path with fontSize", async () => {
      const r = await call("keynote_set_body", {
        name: "Deck",
        slideIndex: 1,
        body: "Body text",
        fontSize: 24,
      });
      expect(r.isError).toBeFalsy();
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("set size of");
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_body", { name: "Deck", slideIndex: 1, body: "B" });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_set_text_style", () => {
    it("happy path — all style options on title", async () => {
      const r = await call("keynote_set_text_style", {
        name: "Deck",
        slideIndex: 1,
        itemKind: "title",
        font: "HelveticaNeue-Bold",
        fontSize: 36,
        colorR: 65535,
        colorG: 0,
        colorB: 0,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ itemKind: "title", styled: true });
    });

    it("happy path — body with paragraphIndex", async () => {
      const r = await call("keynote_set_text_style", {
        name: "Deck",
        slideIndex: 1,
        itemKind: "body",
        font: "Arial",
        paragraphIndex: 2,
      });
      expect(r.isError).toBeFalsy();
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("paragraph 2");
    });

    it("noOp when no style options provided", async () => {
      const r = await call("keynote_set_text_style", {
        name: "Deck",
        slideIndex: 1,
        itemKind: "title",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ noOp: true });
      expect(runAppleScript).not.toHaveBeenCalled();
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_text_style", {
        name: "Deck",
        slideIndex: 1,
        itemKind: "title",
        fontSize: 24,
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_get_presenter_notes", () => {
    it("happy path", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("  My notes  ");
      const r = await call("keynote_get_presenter_notes", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 1, notes: "My notes" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_get_presenter_notes", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_set_presenter_notes", () => {
    it("happy path", async () => {
      const r = await call("keynote_set_presenter_notes", {
        name: "Deck",
        slideIndex: 1,
        notes: "Speaker notes here",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 1, notesLength: 18 });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_presenter_notes", {
        name: "Deck",
        slideIndex: 1,
        notes: "N",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_extract_all_notes", () => {
    it("happy path — parses entries", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce(
        "1|||Slide One|||Notes here, 2|||Slide Two|||",
      );
      const r = await call("keynote_extract_all_notes", { name: "Deck" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).slides).toHaveLength(2);
      expect(parsed(r).slides[0]).toMatchObject({ slideNumber: 1, title: "Slide One" });
    });

    it("empty when blank", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("  ");
      const r = await call("keynote_extract_all_notes", { name: "Deck" });
      expect(parsed(r).slides).toEqual([]);
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_extract_all_notes", { name: "Deck" });
      expect(r.isError).toBe(true);
    });
  });

  // ── Transitions ──────────────────────────────────────────────────────────

  describe("keynote_set_transition", () => {
    it("happy path", async () => {
      const r = await call("keynote_set_transition", {
        name: "Deck",
        slideIndex: 1,
        effect: "dissolve",
        duration: 0.5,
        delay: 0,
        automatic: false,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 1, effect: "dissolve" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_transition", {
        name: "Deck",
        slideIndex: 1,
        effect: "dissolve",
        duration: 1,
        delay: 0,
        automatic: true,
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── Visual elements ──────────────────────────────────────────────────────

  describe("keynote_insert_image", () => {
    it("happy path — minimal", async () => {
      const r = await call("keynote_insert_image", {
        name: "Deck",
        slideIndex: 1,
        filePath: "/tmp/photo.png",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ inserted: "image", slideIndex: 1 });
    });

    it("happy path — with all optional properties", async () => {
      const r = await call("keynote_insert_image", {
        name: "Deck",
        slideIndex: 1,
        filePath: "/tmp/photo.png",
        x: 50,
        y: 50,
        width: 400,
        height: 300,
        description: "A photo",
      });
      expect(r.isError).toBeFalsy();
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("description:");
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_insert_image", {
        name: "Deck",
        slideIndex: 1,
        filePath: "/tmp/photo.png",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_set_voiceover_description", () => {
    it("happy path", async () => {
      const r = await call("keynote_set_voiceover_description", {
        name: "Deck",
        slideIndex: 1,
        imageIndex: 1,
        description: "A chart showing revenue",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 1, imageIndex: 1 });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_voiceover_description", {
        name: "Deck",
        slideIndex: 1,
        imageIndex: 1,
        description: "desc",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_insert_shape", () => {
    it("happy path — without text", async () => {
      const r = await call("keynote_insert_shape", {
        name: "Deck",
        slideIndex: 1,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ inserted: "shape" });
    });

    it("happy path — with text", async () => {
      const r = await call("keynote_insert_shape", {
        name: "Deck",
        slideIndex: 1,
        text: "Hello",
      });
      expect(r.isError).toBeFalsy();
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("object text:");
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_insert_shape", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_insert_line", () => {
    it("happy path", async () => {
      const r = await call("keynote_insert_line", {
        name: "Deck",
        slideIndex: 1,
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        rotation: 0,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ inserted: "line" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_insert_line", {
        name: "Deck",
        slideIndex: 1,
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        rotation: 0,
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_insert_table", () => {
    it("happy path", async () => {
      const r = await call("keynote_insert_table", {
        name: "Deck",
        slideIndex: 1,
        rows: 3,
        columns: 3,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ inserted: "table", rows: 3, columns: 3 });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_insert_table", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_read_table", () => {
    it("happy path", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce("{{cell1, cell2}, {cell3, cell4}}");
      const r = await call("keynote_read_table", { name: "Deck", slideIndex: 1, tableIndex: 1 });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slideIndex: 1, tableIndex: 1 });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_read_table", { name: "Deck", slideIndex: 1, tableIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_write_table", () => {
    it("happy path — 2D data", async () => {
      const r = await call("keynote_write_table", {
        name: "Deck",
        slideIndex: 1,
        tableIndex: 1,
        data: [
          ["A", "B"],
          [1, 2],
        ],
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ cellsWritten: 4 });
    });

    it("noOp when data is empty", async () => {
      const r = await call("keynote_write_table", {
        name: "Deck",
        slideIndex: 1,
        tableIndex: 1,
        data: [],
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ noOp: true });
    });

    it("skips null/undefined cells", async () => {
      const r = await call("keynote_write_table", {
        name: "Deck",
        slideIndex: 1,
        tableIndex: 1,
        data: [[null, "B"]],
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).cellsWritten).toBe(1);
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_write_table", {
        name: "Deck",
        slideIndex: 1,
        tableIndex: 1,
        data: [["A"]],
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_make_chart", () => {
    it("happy path", async () => {
      const r = await call("keynote_make_chart", {
        name: "Deck",
        slideIndex: 1,
        rowNames: ["Q1", "Q2"],
        columnNames: ["Revenue"],
        data: [[100], [200]],
        chartType: "vertical_bar_2d",
        groupBy: "group by column",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ inserted: "chart", chartType: "vertical_bar_2d" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_make_chart", {
        name: "Deck",
        slideIndex: 1,
        rowNames: ["Q1"],
        columnNames: ["Rev"],
        data: [[100]],
        chartType: "pie_2d",
        groupBy: "group by row",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_make_image_slides", () => {
    it("happy path", async () => {
      const r = await call("keynote_make_image_slides", {
        name: "Deck",
        filePaths: ["/tmp/a.png", "/tmp/b.png"],
        setTitles: true,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ inserted: 2, setTitles: true });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_make_image_slides", {
        name: "Deck",
        filePaths: ["/tmp/a.png"],
        setTitles: false,
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── Item positioning & formatting ────────────────────────────────────────

  describe("keynote_position_item", () => {
    it("happy path — x+y together", async () => {
      const r = await call("keynote_position_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
        x: 100,
        y: 200,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ repositioned: true });
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("set position of iWork item");
    });

    it("x only branch", async () => {
      const r = await call("keynote_position_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
        x: 50,
      });
      expect(r.isError).toBeFalsy();
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("item 1 of position");
    });

    it("y only branch", async () => {
      const r = await call("keynote_position_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
        y: 50,
      });
      expect(r.isError).toBeFalsy();
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("item 2 of position");
    });

    it("width and height only", async () => {
      const r = await call("keynote_position_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
        width: 400,
        height: 300,
      });
      expect(r.isError).toBeFalsy();
    });

    it("noOp when no args", async () => {
      const r = await call("keynote_position_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
      });
      expect(parsed(r)).toMatchObject({ noOp: true });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_position_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
        x: 10,
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_format_item", () => {
    it("happy path — all options", async () => {
      const r = await call("keynote_format_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
        opacity: 80,
        rotation: 45,
        reflectionShowing: true,
        reflectionValue: 50,
        locked: false,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ formatted: true });
    });

    it("noOp when no options", async () => {
      const r = await call("keynote_format_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
      });
      expect(parsed(r)).toMatchObject({ noOp: true });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_format_item", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
        opacity: 50,
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_get_item_info", () => {
    it("happy path — parses key=value pipe format", async () => {
      vi.mocked(runAppleScript).mockResolvedValueOnce(
        "x=100|||y=200|||w=300|||h=150|||opacity=100|||rotation=0|||locked=false",
      );
      const r = await call("keynote_get_item_info", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
      });
      expect(r.isError).toBeFalsy();
      const body = parsed(r);
      expect(body.x).toBe("100");
      expect(body.y).toBe("200");
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_get_item_info", {
        name: "Deck",
        slideIndex: 1,
        itemIndex: 1,
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── Slideshow ────────────────────────────────────────────────────────────

  describe("keynote_start", () => {
    it("happy path — no fromSlide", async () => {
      const r = await call("keynote_start", { name: "Deck" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ presenting: true, fromSlide: 1 });
    });

    it("happy path — with fromSlide", async () => {
      const r = await call("keynote_start", { name: "Deck", fromSlide: 3 });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).fromSlide).toBe(3);
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("from slide 3");
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_start", { name: "Deck" });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_stop", () => {
    it("happy path", async () => {
      const r = await call("keynote_stop", { name: "Deck" });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ stopped: true });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_stop", { name: "Deck" });
      expect(r.isError).toBe(true);
    });
  });

  // ── Creator Studio AI ────────────────────────────────────────────────────

  describe("keynote_clean_up_slide", () => {
    it("happy path", async () => {
      const r = await call("keynote_clean_up_slide", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ cleanedUp: true, slideIndex: 1 });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_clean_up_slide", { name: "Deck", slideIndex: 1 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_super_resolution", () => {
    it("happy path", async () => {
      const r = await call("keynote_super_resolution", {
        name: "Deck",
        slideIndex: 1,
        imageIndex: 1,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ applied: "super_resolution" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_super_resolution", {
        name: "Deck",
        slideIndex: 1,
        imageIndex: 1,
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_remove_background", () => {
    it("happy path", async () => {
      const r = await call("keynote_remove_background", {
        name: "Deck",
        slideIndex: 1,
        imageIndex: 1,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ applied: "remove_background" });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_remove_background", {
        name: "Deck",
        slideIndex: 1,
        imageIndex: 1,
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── Export ───────────────────────────────────────────────────────────────

  describe("keynote_export_pdf", () => {
    it("happy path", async () => {
      const r = await call("keynote_export_pdf", {
        documentName: "Deck",
        outputPath: "/tmp/out.pdf",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ format: "PDF" });
      expect(exportDocumentInApp).toHaveBeenCalledWith(
        expect.objectContaining({ formatLiteral: "PDF" }),
      );
    });

    it("CreatorStudioError path", async () => {
      vi.mocked(exportDocumentInApp).mockRejectedValueOnce(
        new CreatorStudioError("E_KEYNOTE_NOT_FOUND", "not found"),
      );
      const r = await call("keynote_export_pdf", {
        documentName: "Deck",
        outputPath: "/tmp/out.pdf",
      });
      expect(r.isError).toBe(true);
      expect(parsed(r).code).toBe("E_KEYNOTE_NOT_FOUND");
    });

    it("generic error path", async () => {
      vi.mocked(exportDocumentInApp).mockRejectedValueOnce(new Error("write failed"));
      const r = await call("keynote_export_pdf", {
        documentName: "Deck",
        outputPath: "/tmp/out.pdf",
      });
      expect(r.isError).toBe(true);
      expect(parsed(r).code).toBe("E_INTERNAL");
    });
  });

  describe("keynote_export_pdf_advanced", () => {
    it("happy path — without password", async () => {
      const r = await call("keynote_export_pdf_advanced", {
        documentName: "Deck",
        outputPath: "/tmp/out.pdf",
        exportStyle: "IndividualSlides",
        imageQuality: "Best",
        includeSlideNumbers: false,
        includeDate: false,
        includeSkippedSlides: false,
        includeBorders: false,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ format: "PDF" });
    });

    it("happy path — with password and hint", async () => {
      const r = await call("keynote_export_pdf_advanced", {
        documentName: "Deck",
        outputPath: "/tmp/out.pdf",
        exportStyle: "SlideWithNotes",
        imageQuality: "Good",
        includeSlideNumbers: true,
        includeDate: true,
        includeSkippedSlides: true,
        includeBorders: true,
        password: "secret",
        passwordHint: "think hard",
      });
      expect(r.isError).toBeFalsy();
      const exportArg = vi.mocked(exportDocumentInApp).mock.calls[0]![0];
      expect((exportArg as { withPropertiesRecord?: string }).withPropertiesRecord).toContain("password:");
    });

    it("error path", async () => {
      vi.mocked(exportDocumentInApp).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_export_pdf_advanced", {
        documentName: "Deck",
        outputPath: "/tmp/out.pdf",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_export_images", () => {
    it("happy path — PNG (no compressionFactor)", async () => {
      const r = await call("keynote_export_images", {
        documentName: "Deck",
        outputPath: "/tmp/slides",
        imageFormat: "PNG",
        allStages: false,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ format: "slide images", imageFormat: "PNG" });
    });

    it("happy path — JPEG with compressionFactor", async () => {
      const r = await call("keynote_export_images", {
        documentName: "Deck",
        outputPath: "/tmp/slides",
        imageFormat: "JPEG",
        allStages: false,
        compressionFactor: 0.8,
      });
      expect(r.isError).toBeFalsy();
      const exportArg = vi.mocked(exportDocumentInApp).mock.calls[0]![0];
      expect((exportArg as { withPropertiesRecord?: string }).withPropertiesRecord).toContain("compression factor:");
    });

    it("compressionFactor ignored for non-JPEG", async () => {
      const r = await call("keynote_export_images", {
        documentName: "Deck",
        outputPath: "/tmp/slides",
        imageFormat: "PNG",
        allStages: false,
        compressionFactor: 0.5,
      });
      expect(r.isError).toBeFalsy();
      const exportArg = vi.mocked(exportDocumentInApp).mock.calls[0]![0];
      expect((exportArg as { withPropertiesRecord?: string }).withPropertiesRecord).not.toContain("compression factor:");
    });

    it("error path", async () => {
      vi.mocked(exportDocumentInApp).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_export_images", {
        documentName: "Deck",
        outputPath: "/tmp/slides",
        imageFormat: "PNG",
        allStages: false,
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_export_movie", () => {
    it("happy path", async () => {
      const r = await call("keynote_export_movie", {
        documentName: "Deck",
        outputPath: "/tmp/out.mov",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ format: "QuickTime movie" });
    });

    it("error path", async () => {
      vi.mocked(exportDocumentInApp).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_export_movie", {
        documentName: "Deck",
        outputPath: "/tmp/out.mov",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_export_movie_advanced", () => {
    it("happy path", async () => {
      const r = await call("keynote_export_movie_advanced", {
        documentName: "Deck",
        outputPath: "/tmp/out.mov",
        movieFormat: "format1080p",
        movieCodec: "h264",
        movieFramerate: "FPS30",
        allStages: false,
        includeComments: false,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ movieFormat: "format1080p", movieCodec: "h264" });
    });

    it("error path", async () => {
      vi.mocked(exportDocumentInApp).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_export_movie_advanced", {
        documentName: "Deck",
        outputPath: "/tmp/out.mov",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_export_pptx", () => {
    it("happy path", async () => {
      const r = await call("keynote_export_pptx", {
        documentName: "Deck",
        outputPath: "/tmp/out.pptx",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ format: "Microsoft PowerPoint" });
    });

    it("error path", async () => {
      vi.mocked(exportDocumentInApp).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_export_pptx", {
        documentName: "Deck",
        outputPath: "/tmp/out.pptx",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_export_html", () => {
    it("happy path", async () => {
      const r = await call("keynote_export_html", {
        documentName: "Deck",
        outputPath: "/tmp/html",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ format: "HTML" });
    });

    it("error path", async () => {
      vi.mocked(exportDocumentInApp).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_export_html", {
        documentName: "Deck",
        outputPath: "/tmp/html",
      });
      expect(r.isError).toBe(true);
    });
  });

  // ── Document config ──────────────────────────────────────────────────────

  describe("keynote_set_doc_size", () => {
    it("happy path", async () => {
      const r = await call("keynote_set_doc_size", {
        name: "Deck",
        width: 1920,
        height: 1080,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ width: 1920, height: 1080 });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_doc_size", { name: "Deck", width: 1920, height: 1080 });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_set_kiosk_mode", () => {
    it("happy path", async () => {
      const r = await call("keynote_set_kiosk_mode", {
        name: "Deck",
        autoPlay: true,
        autoLoop: true,
        autoRestart: true,
        maxIdleDuration: 600,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).kiosk).toMatchObject({ autoPlay: true, maxIdleDuration: 600 });
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_set_kiosk_mode", { name: "Deck" });
      expect(r.isError).toBe(true);
    });
  });

  // ── Cross-app composition ────────────────────────────────────────────────

  describe("keynote_from_markdown", () => {
    it("happy path — creates slides from markdown", async () => {
      vi.mocked(parseMarkdown).mockReturnValueOnce([
        { title: "Cover", body: "", notes: "", master: "cover" } as ReturnType<typeof parseMarkdown>[0],
        { title: "Slide 2", body: "Body", notes: "", master: "h2" } as ReturnType<typeof parseMarkdown>[0],
      ]);
      const r = await call("keynote_from_markdown", {
        markdownText: "# Cover\n## Slide 2\nBody",
        documentName: "Deck",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slidesCreated: 2, document: "Deck" });
      expect(runAppleScript).toHaveBeenCalled();
    });

    it("returns warning when no slides parsed", async () => {
      vi.mocked(parseMarkdown).mockReturnValueOnce([]);
      const r = await call("keynote_from_markdown", {
        markdownText: "no headings here",
        documentName: "Deck",
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ slidesCreated: 0, warning: expect.stringContaining("No slides") });
      expect(runAppleScript).not.toHaveBeenCalled();
    });

    it("uses imageDir when provided", async () => {
      vi.mocked(parseMarkdown).mockReturnValueOnce([
        { title: "S", body: "", notes: "", master: "cover" } as ReturnType<typeof parseMarkdown>[0],
      ]);
      const r = await call("keynote_from_markdown", {
        markdownText: "# Cover",
        documentName: "Deck",
        imageDir: "/tmp/images",
        masterMap: { cover: "Title Slide" },
      });
      expect(r.isError).toBeFalsy();
      expect(slidesToAppleScript).toHaveBeenCalledWith(
        expect.any(Array),
        "Deck",
        "/tmp/images",
      );
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("script failed"));
      vi.mocked(parseMarkdown).mockReturnValueOnce([
        { title: "S", body: "", notes: "", master: "cover" } as ReturnType<typeof parseMarkdown>[0],
      ]);
      const r = await call("keynote_from_markdown", {
        markdownText: "# Cover",
        documentName: "Deck",
      });
      expect(r.isError).toBe(true);
    });
  });

  describe("keynote_to_storyboard_fcp", () => {
    it("happy path — without importIntoFcp", async () => {
      // runAppleScript called twice: export images + extract notes
      vi.mocked(runAppleScript)
        .mockResolvedValueOnce("") // export images
        .mockResolvedValueOnce("1|||Slide One|||Notes"); // extract notes

      const r = await call("keynote_to_storyboard_fcp", {
        documentName: "Deck",
        outputDir: "/tmp/storyboard",
        fcpProjectName: "MyStoryboard",
        slideDurationSeconds: 5,
        frameRate: "29.97",
        importIntoFcp: false,
      });
      expect(r.isError).toBeFalsy();
      const body = parsed(r);
      expect(body).toMatchObject({ slidesExported: 2, imported: false });
      expect(buildProjectFcpxml).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalled();
      expect(openWithApp).not.toHaveBeenCalled();
    });

    it("happy path — with importIntoFcp=true", async () => {
      vi.mocked(runAppleScript)
        .mockResolvedValueOnce("")
        .mockResolvedValueOnce("1|||Slide|||");

      const r = await call("keynote_to_storyboard_fcp", {
        documentName: "Deck",
        outputDir: "/tmp/sb",
        fcpProjectName: "Proj",
        slideDurationSeconds: 3,
        frameRate: "24",
        importIntoFcp: true,
      });
      expect(r.isError).toBeFalsy();
      expect(openWithApp).toHaveBeenCalled();
      expect(parsed(r).imported).toBe(true);
    });

    it("handles empty notes from AppleScript", async () => {
      vi.mocked(runAppleScript)
        .mockResolvedValueOnce("") // export images
        .mockResolvedValueOnce("  "); // notes — empty
      vi.mocked(readdir).mockResolvedValueOnce([] as unknown as ReturnType<typeof readdir>);

      const r = await call("keynote_to_storyboard_fcp", {
        documentName: "Deck",
        outputDir: "/tmp/sb",
        fcpProjectName: "Proj",
        slideDurationSeconds: 5,
        frameRate: "29.97",
        importIntoFcp: false,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).slidesExported).toBe(0);
    });

    it("with custom resolution", async () => {
      vi.mocked(runAppleScript)
        .mockResolvedValueOnce("")
        .mockResolvedValueOnce("");

      const r = await call("keynote_to_storyboard_fcp", {
        documentName: "Deck",
        outputDir: "/tmp/sb",
        fcpProjectName: "Proj",
        slideDurationSeconds: 5,
        frameRate: "30",
        resolution: { width: 3840, height: 2160 },
        importIntoFcp: false,
      });
      expect(r.isError).toBeFalsy();
    });

    it("error path — mkdir fails", async () => {
      vi.mocked(mkdir).mockRejectedValueOnce(new Error("no permission"));
      const r = await call("keynote_to_storyboard_fcp", {
        documentName: "Deck",
        outputDir: "/no-perm",
        fcpProjectName: "Proj",
        slideDurationSeconds: 5,
        frameRate: "29.97",
        importIntoFcp: false,
      });
      expect(r.isError).toBe(true);
    });

    it("CreatorStudioError path", async () => {
      vi.mocked(mkdir).mockRejectedValueOnce(
        new CreatorStudioError("E_INTERNAL", "internal err"),
      );
      const r = await call("keynote_to_storyboard_fcp", {
        documentName: "Deck",
        outputDir: "/tmp/sb",
        fcpProjectName: "Proj",
        slideDurationSeconds: 5,
        frameRate: "29.97",
        importIntoFcp: false,
      });
      expect(r.isError).toBe(true);
      expect(parsed(r).code).toBe("E_INTERNAL");
    });
  });

  describe("keynote_to_compressor_gif", () => {
    it("happy path — no movieFormat", async () => {
      const r = await call("keynote_to_compressor_gif", {
        documentName: "Deck",
        outputDir: "/tmp/gif",
        settingPath: "/path/to/setting.compressorsetting",
      });
      expect(r.isError).toBeFalsy();
      const body = parsed(r);
      expect(body).toMatchObject({ jobId: "job-1", document: "Deck" });
      expect(encodeJob).toHaveBeenCalled();
    });

    it("happy path — with movieFormat", async () => {
      const r = await call("keynote_to_compressor_gif", {
        documentName: "Deck",
        outputDir: "/tmp/gif",
        settingPath: "/path/to/setting.compressorsetting",
        movieFormat: "format720p",
      });
      expect(r.isError).toBeFalsy();
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("movie format");
    });

    it("error path — encodeJob fails", async () => {
      vi.mocked(encodeJob).mockRejectedValueOnce(new Error("encode failed"));
      const r = await call("keynote_to_compressor_gif", {
        documentName: "Deck",
        outputDir: "/tmp/gif",
        settingPath: "/path/to/setting.compressorsetting",
      });
      expect(r.isError).toBe(true);
    });

    it("CreatorStudioError from encodeJob", async () => {
      vi.mocked(encodeJob).mockRejectedValueOnce(
        new CreatorStudioError("E_COMPRESSOR_FAILED", "compressor failed"),
      );
      const r = await call("keynote_to_compressor_gif", {
        documentName: "Deck",
        outputDir: "/tmp/gif",
        settingPath: "/path/to/setting.compressorsetting",
      });
      expect(r.isError).toBe(true);
      expect(parsed(r).code).toBe("E_COMPRESSOR_FAILED");
    });
  });

  describe("keynote_plan_magic_move", () => {
    it("happy path — no element pairs", async () => {
      const r = await call("keynote_plan_magic_move", {
        name: "Deck",
        fromSlide: 1,
        toSlide: 2,
        transitionDuration: 1.5,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r)).toMatchObject({ magicMove: true, fromSlide: 1, toSlide: 2, pairedElements: 0 });
    });

    it("happy path — with element pairs", async () => {
      const r = await call("keynote_plan_magic_move", {
        name: "Deck",
        fromSlide: 1,
        toSlide: 2,
        transitionDuration: 2.0,
        elementNamePairs: [
          { fromItemIndex: 1, toItemIndex: 1, pairName: "hero" },
          { fromItemIndex: 2, toItemIndex: 2, pairName: "logo" },
        ],
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).pairedElements).toBe(2);
      const scriptArg = vi.mocked(runAppleScript).mock.calls[0]![0];
      expect(scriptArg).toContain("hero");
    });

    it("adds warning when toSlide != fromSlide + 1", async () => {
      const r = await call("keynote_plan_magic_move", {
        name: "Deck",
        fromSlide: 1,
        toSlide: 3,
        transitionDuration: 1.5,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).warning).toContain("Magic Move works best");
    });

    it("no warning when toSlide == fromSlide + 1", async () => {
      const r = await call("keynote_plan_magic_move", {
        name: "Deck",
        fromSlide: 2,
        toSlide: 3,
        transitionDuration: 1.0,
      });
      expect(r.isError).toBeFalsy();
      expect(parsed(r).warning).toBeUndefined();
    });

    it("error path", async () => {
      vi.mocked(runAppleScript).mockRejectedValueOnce(new Error("err"));
      const r = await call("keynote_plan_magic_move", {
        name: "Deck",
        fromSlide: 1,
        toSlide: 2,
        transitionDuration: 1.0,
      });
      expect(r.isError).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Recovery profile
// ---------------------------------------------------------------------------

describe("recovery", () => {
  it("has app=keynote", () => {
    expect(recovery.app).toBe("keynote");
  });

  it("badStatePattern is null", () => {
    expect(recovery.badStatePattern).toBeNull();
  });

  it("recover() resolves", async () => {
    await expect(recovery.recover()).resolves.toBeUndefined();
  });
});
