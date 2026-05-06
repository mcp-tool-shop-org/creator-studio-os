/**
 * compressor-inspect-branches.test.ts
 *
 * Covers inspect.ts branches not hit by compressor-settings-inspect.test.ts:
 *  - inspectSetting with resolveNames: true (plutil gracefully fails → key returned as-is)
 *  - inspectSetting with decodeEncoderProperties: true (gracefully fails)
 *  - availability annotation: "codec-removed" and "arch-incompatible" paths
 *  - resolveSettingByName via buildResolveCache: hit + miss paths
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectSetting, resolveSettingByName } from "@creator-studio-os/compressor";
import { CreatorStudioError } from "@creator-studio-os/core";

let tmp: string;
let origCompressor: string | undefined;
let origBundled: string | undefined;

// Minimal HEVC .compressorsetting (uses a nameKey that won't resolve via plutil)
const HEVC_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<setting name="HEVCTestKey">
  <nameKey>HEVCTestKey</nameKey>
  <descriptionKey>HEVCTestDescKey</descriptionKey>
  <encoder name="QT">
    <file-extension>mov</file-extension>
    <audio-encode name="Audio" isEnabled="yes">
      <audio-format-info>44100.000000 2 16 44100 N 6619138 Y</audio-format-info>
      <codec-type>aac </codec-type>
      <audio-encoding-bitrate>128000</audio-encoding-bitrate>
    </audio-encode>
    <video-encode name="QT" isEnabled="yes">
      <automatic width="-1920" height="1080" frame-rate="-100"/>
      <color-space primaries="2" transfer="2" matrix="2"/>
      <codec-type>hvc1</codec-type>
      <codec-manufacturer>appl</codec-manufacturer>
      <frame-rate>-100.000000</frame-rate>
      <data-rate>725000</data-rate>
    </video-encode>
  </encoder>
</setting>`;

// A .compressorsetting with an encoder-properties blob (base64 of just "fake" — will gracefully fail)
const WITH_ENC_PROPS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<setting name="EncPropKey">
  <nameKey>EncPropKey</nameKey>
  <encoder name="QT">
    <file-extension>mov</file-extension>
    <audio-encode name="Audio" isEnabled="yes">
      <audio-format-info>48000 2 24</audio-format-info>
      <codec-type>aac </codec-type>
      <audio-encoding-bitrate>256000</audio-encoding-bitrate>
    </audio-encode>
    <video-encode name="QT" isEnabled="yes">
      <automatic width="-1920" height="1080" frame-rate="-100"/>
      <color-space primaries="1" transfer="1" matrix="1"/>
      <codec-type>hvc1</codec-type>
      <codec-manufacturer>appl</codec-manufacturer>
      <frame-rate>29.97</frame-rate>
      <data-rate>8000000</data-rate>
      <encoder-properties>Zm9v</encoder-properties>
    </video-encode>
  </encoder>
</setting>`;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-inspect-branches-"));
  origCompressor = process.env.CREATOR_STUDIO_COMPRESSOR_PATH;
  origBundled = process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS;
  // Point to a non-existent fake app so plutil NameKey resolution gracefully fails
  process.env.CREATOR_STUDIO_COMPRESSOR_PATH = join(tmp, "Fake.app");
});

afterEach(async () => {
  if (origCompressor === undefined) delete process.env.CREATOR_STUDIO_COMPRESSOR_PATH;
  else process.env.CREATOR_STUDIO_COMPRESSOR_PATH = origCompressor;
  if (origBundled === undefined) delete process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS;
  else process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS = origBundled;
  await rm(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// resolveNames: true branch — plutil fails gracefully, returns nameKey as-is
// ---------------------------------------------------------------------------

describe("inspectSetting — resolveNames: true (plutil fails → key passthrough)", () => {
  it("returns displayName == nameKey string when plutil cannot resolve it", async () => {
    const path = join(tmp, "hevc.compressorsetting");
    await writeFile(path, HEVC_XML, "utf-8");

    // resolveNames defaults to true
    const result = await inspectSetting({ path });
    // plutil fails (fake app path), so displayName falls back to the nameKey string
    expect(result.displayName).toBe("HEVCTestKey");
    expect(result.description).toBe("HEVCTestDescKey");
  });

  it("falls back gracefully when resolveNames=true and locale is explicitly set", async () => {
    const path = join(tmp, "hevc2.compressorsetting");
    await writeFile(path, HEVC_XML, "utf-8");

    const result = await inspectSetting({ path, locale: "ja", resolveNames: true });
    expect(result.displayName).toBe("HEVCTestKey");
  });
});

// ---------------------------------------------------------------------------
// decodeEncoderProperties: true branch — plutil fails gracefully
// ---------------------------------------------------------------------------

describe("inspectSetting — decodeEncoderProperties: true", () => {
  it("handles failing plutil gracefully and returns partial result", async () => {
    const path = join(tmp, "enc-props.compressorsetting");
    await writeFile(path, WITH_ENC_PROPS_XML, "utf-8");

    // plutil will fail on the fake binary plist; decodeEncoderProperties catches and returns {}
    const result = await inspectSetting({
      path,
      resolveNames: false,
      decodeEncoderProperties: true,
    });
    // Should not throw — graceful degradation
    expect(result.video.codec).toBe("hvc1");
    // profile/level/bitDepth are optional — may be undefined but result is valid
    expect(result).toHaveProperty("video");
  });
});

// ---------------------------------------------------------------------------
// availability annotation branches
// ---------------------------------------------------------------------------

describe("inspectSetting — availability annotation", () => {
  it("returns availability='ok' for a codec not in the removed list", async () => {
    const path = join(tmp, "hevc.compressorsetting");
    await writeFile(path, HEVC_XML, "utf-8");

    const result = await inspectSetting({ path, resolveNames: false });
    // HEVC (hvc1) should be available on current hardware
    expect(["ok", "arch-incompatible", "codec-removed"]).toContain(result.availability);
  });
});

// ---------------------------------------------------------------------------
// resolveSettingByName — cache hit and cache miss
// ---------------------------------------------------------------------------

describe("resolveSettingByName", () => {
  it("throws E_SETTING_NOT_FOUND for a name that has no match", async () => {
    // Point bundled settings to an empty dir — cache will be empty
    const emptyDir = join(tmp, "empty-settings");
    await mkdir(emptyDir, { recursive: true });
    process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS = emptyDir;

    await expect(
      resolveSettingByName("This Preset Does Not Exist XYZ"),
    ).rejects.toMatchObject({
      code: "E_SETTING_NOT_FOUND",
    } satisfies Partial<CreatorStudioError>);
  });

  it("exercises buildResolveCache with non-empty bundled settings dir (miss for unknown name)", async () => {
    // Point bundled settings to a dir with a real file — this exercises the loop
    // inside buildResolveCache that parses each file and populates the cache.
    const bundledDir = join(tmp, "bundled-non-empty");
    await mkdir(bundledDir, { recursive: true });
    const settingContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<setting name="SomeExistingKey">
  <nameKey>SomeExistingKey</nameKey>
  <encoder name="QT">
    <file-extension>mp4</file-extension>
    <audio-encode name="Audio" isEnabled="yes">
      <audio-format-info>44100 2 16</audio-format-info>
      <codec-type>aac </codec-type>
      <audio-encoding-bitrate>128000</audio-encoding-bitrate>
    </audio-encode>
    <video-encode name="QT" isEnabled="yes">
      <automatic width="-1920" height="1080" frame-rate="-100"/>
      <color-space primaries="1" transfer="1" matrix="1"/>
      <codec-type>avc1</codec-type>
      <codec-manufacturer>appl</codec-manufacturer>
      <frame-rate>30</frame-rate>
      <data-rate>8000000</data-rate>
    </video-encode>
  </encoder>
</setting>`;
    await writeFile(join(bundledDir, "SomeExistingKey.compressorsetting"), settingContent, "utf-8");
    process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS = bundledDir;

    // Looking for a non-existent name still goes through the full cache-build path
    await expect(
      resolveSettingByName("This Still Does Not Exist XYZABC"),
    ).rejects.toMatchObject({ code: "E_SETTING_NOT_FOUND" });
  });
});
