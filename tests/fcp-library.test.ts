import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @creator-studio-os/core ─────────────────────────────────────────────
vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    runAppleScript: vi.fn(),
    escapeAppleScriptString: (s: string) => s.replace(/"/g, '\\"'),
  };
});

import {
  listLibraries,
  listEvents,
  listProjects,
  readProjectMetadata,
} from "@creator-studio-os/fcp";
import { runAppleScript } from "@creator-studio-os/core";

const mockRunAppleScript = vi.mocked(runAppleScript);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listLibraries ────────────────────────────────────────────────────────────

describe("listLibraries", () => {
  it("parses line-delimited library names", async () => {
    mockRunAppleScript.mockResolvedValue("MyLibrary\nAnotherLib\n");
    const result = await listLibraries();
    expect(result).toEqual([{ name: "MyLibrary" }, { name: "AnotherLib" }]);
  });

  it("returns empty array for empty output", async () => {
    mockRunAppleScript.mockResolvedValue("");
    const result = await listLibraries();
    expect(result).toEqual([]);
  });

  it("trims whitespace from names", async () => {
    mockRunAppleScript.mockResolvedValue("  Lib One  \n  Lib Two  \n");
    const result = await listLibraries();
    expect(result).toEqual([{ name: "Lib One" }, { name: "Lib Two" }]);
  });

  it("handles CRLF line endings", async () => {
    mockRunAppleScript.mockResolvedValue("Alpha\r\nBeta\r\n");
    const result = await listLibraries();
    expect(result).toEqual([{ name: "Alpha" }, { name: "Beta" }]);
  });

  it("propagates errors from runAppleScript", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("Automation not permitted"));
    await expect(listLibraries()).rejects.toThrow("Automation not permitted");
  });
});

// ─── listEvents ───────────────────────────────────────────────────────────────

describe("listEvents", () => {
  it("returns events for a library", async () => {
    mockRunAppleScript.mockResolvedValue("Event A\nEvent B\n");
    const result = await listEvents("MyLibrary");
    expect(result).toEqual([{ name: "Event A" }, { name: "Event B" }]);
  });

  it("passes the library name to the script", async () => {
    mockRunAppleScript.mockResolvedValue("");
    await listEvents("SpecialLib");
    expect(mockRunAppleScript.mock.calls[0][0]).toContain("SpecialLib");
  });

  it("returns empty array when no events", async () => {
    mockRunAppleScript.mockResolvedValue("");
    const result = await listEvents("EmptyLib");
    expect(result).toEqual([]);
  });

  it("propagates errors", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("FCP not running"));
    await expect(listEvents("Lib")).rejects.toThrow("FCP not running");
  });
});

// ─── listProjects ─────────────────────────────────────────────────────────────

describe("listProjects (FCP library projects)", () => {
  it("returns projects for a library and event", async () => {
    mockRunAppleScript.mockResolvedValue("Project Alpha\nProject Beta\n");
    const result = await listProjects("MyLib", "MyEvent");
    expect(result).toEqual([{ name: "Project Alpha" }, { name: "Project Beta" }]);
  });

  it("passes library and event names to the script", async () => {
    mockRunAppleScript.mockResolvedValue("");
    await listProjects("TestLib", "TestEvent");
    const script = mockRunAppleScript.mock.calls[0][0] as string;
    expect(script).toContain("TestLib");
    expect(script).toContain("TestEvent");
  });

  it("returns empty array when no projects", async () => {
    mockRunAppleScript.mockResolvedValue("");
    const result = await listProjects("Lib", "Event");
    expect(result).toEqual([]);
  });
});

// ─── readProjectMetadata ──────────────────────────────────────────────────────

describe("readProjectMetadata", () => {
  it("parses metadata returned by AppleScript", async () => {
    // dv|ds|fv|fs|tcf
    mockRunAppleScript.mockResolvedValue("60000|60000|1001|60000|dropFrame");
    const meta = await readProjectMetadata("MyLib", "MyEvent", "MyProject");
    expect(meta.projectName).toBe("MyProject");
    expect(meta.durationSeconds).toBeCloseTo(1.0, 3);
    expect(meta.frameDurationSeconds).toBeCloseTo(1001 / 60000, 5);
    expect(meta.timecodeFormat).toBe("dropFrame");
  });

  it("returns 'unspecified' for empty tcf", async () => {
    mockRunAppleScript.mockResolvedValue("0|60000|1001|60000|");
    const meta = await readProjectMetadata("L", "E", "P");
    expect(meta.timecodeFormat).toBe("unspecified");
  });

  it("computes durationSeconds correctly", async () => {
    // 300000 / 60000 = 5 seconds
    mockRunAppleScript.mockResolvedValue("300000|60000|1001|60000|nonDropFrame");
    const meta = await readProjectMetadata("L", "E", "P");
    expect(meta.durationSeconds).toBeCloseTo(5.0, 3);
  });

  it("passes library, event, and project names to the script", async () => {
    mockRunAppleScript.mockResolvedValue("0|1|0|1|none");
    await readProjectMetadata("SomeLib", "SomeEvent", "SomeProject");
    const script = mockRunAppleScript.mock.calls[0][0] as string;
    expect(script).toContain("SomeLib");
    expect(script).toContain("SomeEvent");
    expect(script).toContain("SomeProject");
  });

  it("propagates errors", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("Library locked"));
    await expect(readProjectMetadata("L", "E", "P")).rejects.toThrow("Library locked");
  });
});
