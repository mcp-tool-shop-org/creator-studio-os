import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectSetting, getCodecAvailability } from "../src/apps/compressor/inspect.js";
import { CreatorStudioError } from "../src/errors.js";

let tmp: string;
let origCompressor: string | undefined;

// Minimal .compressorsetting fixture matching the real schema from the research doc
const HEVC_SETTING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<setting name="BroadbandHDHEVCNameKey">
  <version>401408</version>
  <description>BroadbandHDHEVCDescKey</description>
  <nameKey>BroadbandHDHEVCNameKey</nameKey>
  <descriptionKey>BroadbandHDHEVCDescKey</descriptionKey>
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
  <filter-set/>
</setting>`;

const H264_SETTING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<setting name="H264HDNameKey">
  <nameKey>H264HDNameKey</nameKey>
  <descriptionKey>H264HDDescKey</descriptionKey>
  <encoder name="QT">
    <file-extension>mp4</file-extension>
    <audio-encode name="Audio" isEnabled="yes">
      <audio-format-info>48000.000000 2 24</audio-format-info>
      <codec-type>aac </codec-type>
      <audio-encoding-bitrate>256000</audio-encoding-bitrate>
    </audio-encode>
    <video-encode name="QT" isEnabled="yes">
      <automatic width="-1920" height="1080" frame-rate="-100"/>
      <color-space primaries="1" transfer="1" matrix="1"/>
      <codec-type>avc1</codec-type>
      <codec-manufacturer>appl</codec-manufacturer>
      <frame-rate>29.970000</frame-rate>
      <data-rate>8000000</data-rate>
    </video-encode>
  </encoder>
  <filter-set/>
</setting>`;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-inspect-test-"));
  origCompressor = process.env.CREATOR_STUDIO_COMPRESSOR_PATH;
  // Point to a fake app path so plutil-based NameKey resolution gracefully fails
  process.env.CREATOR_STUDIO_COMPRESSOR_PATH = join(tmp, "Fake.app");
});

afterEach(async () => {
  if (origCompressor === undefined) delete process.env.CREATOR_STUDIO_COMPRESSOR_PATH;
  else process.env.CREATOR_STUDIO_COMPRESSOR_PATH = origCompressor;
  await rm(tmp, { recursive: true, force: true });
});

describe("inspectSetting", () => {
  it("parses video codec, container, and color tags from HEVC fixture", async () => {
    const path = join(tmp, "hevc.compressorsetting");
    await writeFile(path, HEVC_SETTING_XML, "utf-8");

    const result = await inspectSetting({ path, resolveNames: false });

    expect(result.internalName).toBe("BroadbandHDHEVCNameKey");
    expect(result.container).toBe("mov");
    expect(result.video.codec).toBe("hvc1");
    expect(result.video.codecVendor).toBe("appl");
    expect(result.video.height).toBe(1080);
    expect(result.video.colorPrimaries).toBe(2);
    expect(result.video.bitrate).toBe(725000);
  });

  it("parses audio codec and bitrate", async () => {
    const path = join(tmp, "hevc.compressorsetting");
    await writeFile(path, HEVC_SETTING_XML, "utf-8");

    const result = await inspectSetting({ path, resolveNames: false });

    expect(result.audio.codec).toBe("aac");
    expect(result.audio.bitrate).toBe(128000);
    expect(result.audio.sampleRate).toBe(44100);
    expect(result.audio.channels).toBe(2);
  });

  it("parses H264 fixture correctly", async () => {
    const path = join(tmp, "h264.compressorsetting");
    await writeFile(path, H264_SETTING_XML, "utf-8");

    const result = await inspectSetting({ path, resolveNames: false });

    expect(result.container).toBe("mp4");
    expect(result.video.codec).toBe("avc1");
    expect(result.video.bitrate).toBe(8000000);
    expect(result.audio.channels).toBe(2);
    expect(result.audio.sampleRate).toBe(48000);
  });

  it("returns displayName equal to nameKey when resolveNames=false", async () => {
    const path = join(tmp, "hevc.compressorsetting");
    await writeFile(path, HEVC_SETTING_XML, "utf-8");

    const result = await inspectSetting({ path, resolveNames: false });
    expect(result.displayName).toBe("BroadbandHDHEVCNameKey");
  });

  it("throws E_SETTING_NOT_FOUND for missing file", async () => {
    await expect(
      inspectSetting({ path: join(tmp, "no-such.compressorsetting"), resolveNames: false }),
    ).rejects.toMatchObject({ code: "E_SETTING_NOT_FOUND" } satisfies Partial<CreatorStudioError>);
  });

  it("throws E_SETTING_NOT_FOUND for non-setting XML", async () => {
    const path = join(tmp, "bad.compressorsetting");
    await writeFile(path, `<?xml version="1.0"?><root><child/></root>`, "utf-8");
    await expect(
      inspectSetting({ path, resolveNames: false }),
    ).rejects.toMatchObject({ code: "E_SETTING_NOT_FOUND" });
  });
});

describe("getCodecAvailability", () => {
  it("returns an object with available, removed, appleSilicon, version", async () => {
    const result = await getCodecAvailability();
    expect(Array.isArray(result.available)).toBe(true);
    expect(Array.isArray(result.removed)).toBe(true);
    expect(typeof result.appleSilicon).toBe("boolean");
    expect(typeof result.version).toBe("string");
  });

  it("available list includes H.264", async () => {
    const result = await getCodecAvailability();
    expect(result.available.some((c) => c.includes("H.264"))).toBe(true);
  });

  it("appleSilicon matches process.arch", async () => {
    const result = await getCodecAvailability();
    expect(result.appleSilicon).toBe(process.arch === "arm64");
  });
});
