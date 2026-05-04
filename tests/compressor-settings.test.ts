import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { listCompressorSettings } from "../src/apps/compressor/settings.js";

const realHomeUserDir = join(
  homedir(),
  "Library",
  "Application Support",
  "Compressor",
  "Settings",
);

describe("listCompressorSettings", () => {
  let tmp: string;
  let originalBundled: string | undefined;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "csos-settings-"));
    originalBundled = process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS;
  });

  afterEach(async () => {
    if (originalBundled === undefined)
      delete process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS;
    else process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS = originalBundled;
    await rm(tmp, { recursive: true, force: true });
  });

  it("returns an array (empty if no settings dirs exist) without throwing", async () => {
    process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS = join(tmp, "missing");
    const settings = await listCompressorSettings({ includeBundled: true });
    expect(Array.isArray(settings)).toBe(true);
  });

  it("discovers .compressorsetting files in a bundled directory when includeBundled=true", async () => {
    const bundledDir = join(tmp, "bundled");
    await mkdir(bundledDir, { recursive: true });
    await writeFile(join(bundledDir, "MyPreset.compressorsetting"), "x", "utf-8");
    await writeFile(join(bundledDir, "Other.compressorsetting"), "x", "utf-8");
    await writeFile(join(bundledDir, "ignore.txt"), "x", "utf-8");
    process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS = bundledDir;

    const settings = await listCompressorSettings({ includeBundled: true });
    const bundled = settings.filter((s) => s.source === "bundled");
    expect(bundled.length).toBe(2);
    expect(bundled.map((s) => s.name).sort()).toEqual(["MyPreset", "Other"]);
  });

  it("excludes bundled settings by default", async () => {
    const bundledDir = join(tmp, "bundled");
    await mkdir(bundledDir, { recursive: true });
    await writeFile(join(bundledDir, "Bundled.compressorsetting"), "x", "utf-8");
    process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS = bundledDir;

    const settings = await listCompressorSettings();
    expect(settings.find((s) => s.source === "bundled")).toBeUndefined();
  });
});
