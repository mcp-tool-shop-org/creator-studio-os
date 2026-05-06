/**
 * compressor-locations.test.ts
 *
 * Covers packages/compressor/src/locations.ts real logic.
 * Mocks node:fs/promises (readdir, stat, access) to simulate
 * various directory layouts without touching the real filesystem.
 * Also exercises recovery.ts by calling compressorRecovery.recover().
 */

import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...real,
    readdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:child_process")>();
  // Mock execFile so killall resolves immediately (no real process kill)
  const execFileMock = vi.fn((_cmd: string, _args: string[], cb: (...args: unknown[]) => void) => {
    cb(null, "", "");
    return {} as ReturnType<typeof real.execFile>;
  });
  return { ...real, execFile: execFileMock };
});

// ---------------------------------------------------------------------------
// Imports (after vi.mock)
// ---------------------------------------------------------------------------

import { listCompressorLocations } from "../packages/compressor/src/locations.js";
import { compressorRecovery } from "../packages/compressor/src/recovery.js";
import * as fs from "node:fs/promises";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Produce a minimal stat mock that reports isFile()=true */
function fileStatMock() {
  return { isFile: () => true } as ReturnType<typeof fs.stat> extends Promise<infer S> ? S : never;
}

/** Produce a minimal stat mock that reports isFile()=false (directory) */
function dirStatMock() {
  return { isFile: () => false } as ReturnType<typeof fs.stat> extends Promise<infer S> ? S : never;
}

// ---------------------------------------------------------------------------
// Tests: listCompressorLocations
// ---------------------------------------------------------------------------

describe("listCompressorLocations", () => {
  it("returns empty array when both user dir and system dir are inaccessible", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));
    const result = await listCompressorLocations();
    expect(result).toEqual([]);
  });

  it("returns locations from user dir (system dir missing)", async () => {
    // access: user dir OK, system dir fails
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)  // user dir
      .mockRejectedValue(new Error("ENOENT")); // system dir

    vi.mocked(fs.readdir).mockResolvedValueOnce([
      "Desktop.compressorlocation",
      "Movies.compressorlocation",
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    vi.mocked(fs.stat).mockResolvedValue(fileStatMock());

    const result = await listCompressorLocations();
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.source === "user")).toBe(true);
    expect(result.map((l) => l.name).sort()).toEqual(["Desktop", "Movies"]);
  });

  it("returns locations from both user and system dirs, sorted user-first then alpha", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined); // both dirs accessible

    // user dir returns one entry, system dir returns one entry
    vi.mocked(fs.readdir)
      .mockResolvedValueOnce(["BDesktop.compressorlocation"] as unknown as Awaited<ReturnType<typeof fs.readdir>>)
      .mockResolvedValueOnce(["ANetwork.compressorlocation"] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    vi.mocked(fs.stat).mockResolvedValue(fileStatMock());

    const result = await listCompressorLocations();
    expect(result).toHaveLength(2);
    // user entries come before system entries
    expect(result[0].source).toBe("user");
    expect(result[1].source).toBe("system");
  });

  it("filters out dotfiles", async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error("ENOENT"));

    vi.mocked(fs.readdir).mockResolvedValueOnce([
      ".DS_Store",
      "._hidden.compressorlocation",
      "Real.compressorlocation",
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    vi.mocked(fs.stat).mockResolvedValue(fileStatMock());

    const result = await listCompressorLocations();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Real");
  });

  it("filters out non-.compressorlocation files", async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error("ENOENT"));

    vi.mocked(fs.readdir).mockResolvedValueOnce([
      "readme.txt",
      "Good.compressorlocation",
      "bad.json",
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    vi.mocked(fs.stat).mockResolvedValue(fileStatMock());

    const result = await listCompressorLocations();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Good");
  });

  it("skips entries where stat reports isFile()=false (directories)", async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error("ENOENT"));

    vi.mocked(fs.readdir).mockResolvedValueOnce([
      "ActualDir.compressorlocation",
      "RealFile.compressorlocation",
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    // First stat returns dir, second returns file
    vi.mocked(fs.stat)
      .mockResolvedValueOnce(dirStatMock())
      .mockResolvedValueOnce(fileStatMock());

    const result = await listCompressorLocations();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("RealFile");
  });

  it("skips entries where stat throws (continues gracefully)", async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error("ENOENT"));

    vi.mocked(fs.readdir).mockResolvedValueOnce([
      "Broken.compressorlocation",
      "Good.compressorlocation",
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    vi.mocked(fs.stat)
      .mockRejectedValueOnce(new Error("EPERM"))
      .mockResolvedValueOnce(fileStatMock());

    const result = await listCompressorLocations();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Good");
  });

  it("alpha-sorts multiple system locations", async () => {
    vi.mocked(fs.access)
      .mockRejectedValueOnce(new Error("ENOENT")) // user dir missing
      .mockResolvedValueOnce(undefined);           // system dir ok

    vi.mocked(fs.readdir).mockResolvedValueOnce([
      "Zebra.compressorlocation",
      "Alpha.compressorlocation",
      "Mango.compressorlocation",
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    vi.mocked(fs.stat).mockResolvedValue(fileStatMock());

    const result = await listCompressorLocations();
    expect(result.map((l) => l.name)).toEqual(["Alpha", "Mango", "Zebra"]);
    expect(result.every((l) => l.source === "system")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: compressorRecovery.recover() — covers recovery.ts line
// ---------------------------------------------------------------------------

describe("compressorRecovery", () => {
  it("has app = 'compressor' and a badStatePattern", () => {
    expect(compressorRecovery.app).toBe("compressor");
    expect(compressorRecovery.badStatePattern.test("Unable to submit to queue")).toBe(true);
    expect(compressorRecovery.badStatePattern.test("some unrelated message")).toBe(false);
  });

  it("recover() completes without throwing even when killall fails", async () => {
    // recover() calls execFile("killall", ["Compressor"]) then waits 2s.
    // We mock setTimeout to be immediate so the test finishes fast.
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler) => {
      if (typeof fn === "function") fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    try {
      await expect(compressorRecovery.recover()).resolves.toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });
});
