/**
 * iwork/shared.ts — full coverage.
 *
 * Mocks runAppleScript + escapeAppleScriptString at the core level so
 * the real iwork/shared.ts logic is exercised without live apps.
 * appInstalled uses spawn; that is mocked via node:child_process.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports of the module under test
// ---------------------------------------------------------------------------

// iwork/shared.ts imports from relative paths inside the core package,
// so we mock the actual source modules, not the package alias.
vi.mock("../packages/core/src/runners/applescript.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../packages/core/src/runners/applescript.js")>();
  return {
    ...actual,
    runAppleScript: vi.fn().mockResolvedValue("false"),
    escapeAppleScriptString: vi.fn((s: string) => s),
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, spawn: vi.fn() };
});

import {
  runAppleScript,
  escapeAppleScriptString,
} from "../packages/core/src/runners/applescript.js";
import { CreatorStudioError } from "@creator-studio-os/core";
import { spawn } from "node:child_process";

import {
  isAppRunning,
  activateApp,
  openDocumentInApp,
  closeDocumentInApp,
  exportDocumentInApp,
  appInstalled,
} from "../packages/core/src/iwork/shared.js";

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

function fakeSpawnChild(exitCode: number, stdout = "") {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: () => void;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  setImmediate(() => {
    if (stdout) child.stdout.emit("data", Buffer.from(stdout));
    child.emit("close", exitCode);
  });
  return child;
}

function errorSpawnChild(msg: string) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: () => void;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  setImmediate(() => child.emit("error", new Error(msg)));
  return child;
}

// ---------------------------------------------------------------------------
// isAppRunning
// ---------------------------------------------------------------------------

describe("isAppRunning", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when script returns 'false'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("false");
    const result = await isAppRunning("com.apple.Pages");
    expect(result).toBe(false);
    expect(runAppleScript).toHaveBeenCalledOnce();
  });

  it("returns true when script returns 'true'", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("true");
    const result = await isAppRunning("com.apple.Pages");
    expect(result).toBe(true);
  });

  it("returns false when script returns 'true ' with whitespace (trim)", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("  true  ");
    const result = await isAppRunning("com.apple.Pages");
    expect(result).toBe(true);
  });

  it("propagates runAppleScript rejection", async () => {
    vi.mocked(runAppleScript).mockRejectedValue(
      new CreatorStudioError("E_OSASCRIPT_FAILED", "timeout"),
    );
    await expect(isAppRunning("com.apple.Pages")).rejects.toMatchObject({
      code: "E_OSASCRIPT_FAILED",
    });
  });
});

// ---------------------------------------------------------------------------
// activateApp
// ---------------------------------------------------------------------------

describe("activateApp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls runAppleScript with activate command", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await activateApp("com.apple.Keynote");
    expect(runAppleScript).toHaveBeenCalledWith(
      expect.stringContaining("com.apple.Keynote"),
    );
    expect(runAppleScript).toHaveBeenCalledWith(
      expect.stringContaining("activate"),
    );
  });

  it("resolves when script succeeds", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await expect(activateApp("com.apple.Keynote")).resolves.toBeUndefined();
  });

  it("propagates error from runAppleScript", async () => {
    vi.mocked(runAppleScript).mockRejectedValue(
      new CreatorStudioError("E_AUTOMATION_DENIED", "denied"),
    );
    await expect(activateApp("com.apple.Keynote")).rejects.toMatchObject({
      code: "E_AUTOMATION_DENIED",
    });
  });
});

// ---------------------------------------------------------------------------
// openDocumentInApp
// ---------------------------------------------------------------------------

describe("openDocumentInApp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns trimmed document name from script output", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("  Report.pages  ");
    const result = await openDocumentInApp("com.apple.Pages", "/docs/Report.pages");
    expect(result).toEqual({ name: "Report.pages" });
  });

  it("calls escapeAppleScriptString on the path", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("doc");
    await openDocumentInApp("com.apple.Pages", '/path/with "quotes".pages');
    expect(escapeAppleScriptString).toHaveBeenCalledWith('/path/with "quotes".pages');
  });

  it("passes 60s timeout to runAppleScript", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("doc");
    await openDocumentInApp("com.apple.Pages", "/doc.pages");
    expect(runAppleScript).toHaveBeenCalledWith(
      expect.any(String),
      { timeoutMs: 60_000 },
    );
  });

  it("propagates error", async () => {
    vi.mocked(runAppleScript).mockRejectedValue(new Error("app not running"));
    await expect(
      openDocumentInApp("com.apple.Pages", "/doc.pages"),
    ).rejects.toThrow("app not running");
  });
});

// ---------------------------------------------------------------------------
// closeDocumentInApp
// ---------------------------------------------------------------------------

describe("closeDocumentInApp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls runAppleScript with correct close script (saving=no default)", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await closeDocumentInApp("com.apple.Pages", "Report.pages");
    expect(runAppleScript).toHaveBeenCalledWith(
      expect.stringContaining("saving no"),
    );
  });

  it("uses saving=yes when specified", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await closeDocumentInApp("com.apple.Pages", "Report.pages", "yes");
    expect(runAppleScript).toHaveBeenCalledWith(
      expect.stringContaining("saving yes"),
    );
  });

  it("uses saving=ask when specified", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await closeDocumentInApp("com.apple.Pages", "Report.pages", "ask");
    expect(runAppleScript).toHaveBeenCalledWith(
      expect.stringContaining("saving ask"),
    );
  });

  it("resolves when script succeeds", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await expect(
      closeDocumentInApp("com.apple.Pages", "Report.pages"),
    ).resolves.toBeUndefined();
  });

  it("propagates error", async () => {
    vi.mocked(runAppleScript).mockRejectedValue(new Error("not found"));
    await expect(
      closeDocumentInApp("com.apple.Pages", "Report.pages"),
    ).rejects.toThrow("not found");
  });
});

// ---------------------------------------------------------------------------
// exportDocumentInApp
// ---------------------------------------------------------------------------

describe("exportDocumentInApp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls runAppleScript with correct export script (no withPropertiesRecord)", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await exportDocumentInApp({
      bundleId: "com.apple.Keynote",
      documentName: "Deck.key",
      outputPath: "/out/Deck.pdf",
      formatLiteral: "PDF",
    });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("PDF");
    expect(script).not.toContain("with properties");
  });

  it("includes with properties when withPropertiesRecord is provided", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await exportDocumentInApp({
      bundleId: "com.apple.Keynote",
      documentName: "Deck.key",
      outputPath: "/out/slides",
      formatLiteral: "slide images",
      withPropertiesRecord: "{image format:PNG}",
    });
    const script = vi.mocked(runAppleScript).mock.calls[0][0] as string;
    expect(script).toContain("with properties {image format:PNG}");
  });

  it("uses 120s timeout", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("");
    await exportDocumentInApp({
      bundleId: "com.apple.Pages",
      documentName: "doc",
      outputPath: "/out/doc.pdf",
      formatLiteral: "PDF",
    });
    expect(runAppleScript).toHaveBeenCalledWith(
      expect.any(String),
      { timeoutMs: 120_000 },
    );
  });

  it("propagates error", async () => {
    vi.mocked(runAppleScript).mockRejectedValue(
      new CreatorStudioError("E_OSASCRIPT_FAILED", "failed"),
    );
    await expect(
      exportDocumentInApp({
        bundleId: "com.apple.Pages",
        documentName: "doc",
        outputPath: "/out",
        formatLiteral: "PDF",
      }),
    ).rejects.toMatchObject({ code: "E_OSASCRIPT_FAILED" });
  });
});

// ---------------------------------------------------------------------------
// appInstalled
// ---------------------------------------------------------------------------

describe("appInstalled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves when osascript returns 'ok'", async () => {
    vi.mocked(spawn).mockReturnValue(
      fakeSpawnChild(0, "ok\n") as ReturnType<typeof spawn>,
    );
    await expect(
      appInstalled("com.apple.Pages", "E_PAGES_NOT_FOUND"),
    ).resolves.toBeUndefined();
  });

  it("rejects with notFoundCode when osascript returns 'missing'", async () => {
    vi.mocked(spawn).mockReturnValue(
      fakeSpawnChild(0, "missing\n") as ReturnType<typeof spawn>,
    );
    await expect(
      appInstalled("com.apple.Pages", "E_PAGES_NOT_FOUND"),
    ).rejects.toMatchObject({ code: "E_PAGES_NOT_FOUND" });
  });

  it("rejects with notFoundCode on spawn error", async () => {
    vi.mocked(spawn).mockReturnValue(
      errorSpawnChild("ENOENT") as ReturnType<typeof spawn>,
    );
    await expect(
      appInstalled("com.apple.Pages", "E_PAGES_NOT_FOUND"),
    ).rejects.toMatchObject({ code: "E_PAGES_NOT_FOUND" });
  });

  it("rejects with correct code for different apps", async () => {
    vi.mocked(spawn).mockReturnValue(
      fakeSpawnChild(0, "missing") as ReturnType<typeof spawn>,
    );
    await expect(
      appInstalled("com.apple.Numbers", "E_NUMBERS_NOT_FOUND"),
    ).rejects.toMatchObject({ code: "E_NUMBERS_NOT_FOUND" });
  });

  it("calls osascript with the bundle id in the script", async () => {
    vi.mocked(spawn).mockReturnValue(
      fakeSpawnChild(0, "ok") as ReturnType<typeof spawn>,
    );
    await appInstalled("com.apple.Pages", "E_PAGES_NOT_FOUND");
    expect(spawn).toHaveBeenCalledWith(
      "osascript",
      expect.arrayContaining(["-e"]),
      expect.any(Object),
    );
    const scriptArg = vi.mocked(spawn).mock.calls[0][1];
    expect(scriptArg.join(" ")).toContain("com.apple.Pages");
  });
});
