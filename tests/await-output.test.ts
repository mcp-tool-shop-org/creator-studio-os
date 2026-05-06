/**
 * awaitOutputFile — unit tests.
 *
 * Uses a real temp directory to avoid mocking fs primitives.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { awaitOutputFile } from "@creator-studio-os/core";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(tmpdir(), `csos-await-output-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("awaitOutputFile", () => {
  it("returns immediately when the file already exists", async () => {
    const stem = `existing-${Date.now()}`;
    await writeFile(join(tmpDir, `${stem}.mp4`), "fake content", "utf-8");
    const result = await awaitOutputFile({
      pathStem: stem,
      dir: tmpDir,
      timeoutSec: 5,
      settledMs: 0,
    });
    expect(result.path).toContain(stem);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  it("finds a file created after polling starts", async () => {
    const stem = `delayed-${Date.now()}`;
    const delayed = (async () => {
      await new Promise((r) => setTimeout(r, 200));
      await writeFile(join(tmpDir, `${stem}.mov`), "fake content 123", "utf-8");
    })();
    const result = await awaitOutputFile({
      pathStem: stem,
      dir: tmpDir,
      timeoutSec: 5,
      settledMs: 0,
      pollMs: 50,
    });
    await delayed;
    expect(result.path).toContain(stem);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  it("matches any extension for the given stem", async () => {
    const stem = `any-ext-${Date.now()}`;
    await writeFile(join(tmpDir, `${stem}.hevc`), "data", "utf-8");
    const result = await awaitOutputFile({
      pathStem: stem,
      dir: tmpDir,
      timeoutSec: 5,
      settledMs: 0,
    });
    expect(result.path).toMatch(/\.hevc$/);
  });

  it("throws after timeout if file never appears", async () => {
    const stem = `never-exists-${Date.now()}`;
    await expect(
      awaitOutputFile({ pathStem: stem, dir: tmpDir, timeoutSec: 0.2, settledMs: 0, pollMs: 50 }),
    ).rejects.toThrow(/timed out/);
  });

  it("does not match a zero-byte file", async () => {
    const stem = `zero-byte-${Date.now()}`;
    await writeFile(join(tmpDir, `${stem}.mp4`), "", "utf-8");
    await expect(
      awaitOutputFile({ pathStem: stem, dir: tmpDir, timeoutSec: 0.2, settledMs: 0, pollMs: 50 }),
    ).rejects.toThrow(/timed out/);
  });
});
