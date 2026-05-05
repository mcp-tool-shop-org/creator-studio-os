import { readFile, readdir, access } from "node:fs/promises";
import { join, basename } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { XMLParser } from "fast-xml-parser";
import { CreatorStudioError } from "../../errors.js";
import { loadConfig } from "../../config.js";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettingVideoInfo {
  codec: string;
  codecVendor: string;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  colorPrimaries: number;
  colorTransfer: number;
  colorMatrix: number;
  profile?: string;
  level?: string;
  bitDepth?: string;
}

export interface SettingAudioInfo {
  codec: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface InspectedSetting {
  internalName: string;
  displayName: string;
  description: string;
  container: string;
  video: SettingVideoInfo;
  audio: SettingAudioInfo;
  availability: "ok" | "codec-removed" | "arch-incompatible";
  raw: unknown;
}

// ---------------------------------------------------------------------------
// Codec availability table
// ---------------------------------------------------------------------------

interface RemovedCodec {
  codec: string;
  since: string;
  reason: string;
}

interface CodecAvailability {
  available: string[];
  removed: RemovedCodec[];
  appleSilicon: boolean;
  version: string;
}

// Static table keyed on (arch, major version). Updated from Apple release notes.
const REMOVED_CODECS_BY_VERSION: Record<string, RemovedCodec[]> = {
  "5.2": [
    { codec: "H.264 Blu-ray", since: "5.2", reason: "Apple removed Blu-ray authoring support" },
    { codec: "DVD (H.264)", since: "5.2", reason: "Apple removed DVD authoring support" },
    { codec: "Dolby Digital", since: "5.2", reason: "Dolby encoder removed from Compressor" },
    { codec: "H.264 Interlaced", since: "5.2", reason: "Interlaced H.264 encoding removed" },
  ],
};

const REMOVED_APPLE_SILICON: RemovedCodec[] = [
  { codec: "AVC-Intra", since: "5.2", reason: "AVC-Intra encode disabled on Apple Silicon" },
];

export async function getCodecAvailability(): Promise<CodecAvailability> {
  const cfg = loadConfig();
  const arch = process.arch === "arm64" ? "arm64" : "x86_64";
  const appleSilicon = arch === "arm64";

  // Read Compressor version from Info.plist
  let version = "unknown";
  try {
    const plist = join(cfg.compressorAppPath, "Contents", "Info.plist");
    const { stdout } = await execFileAsync("plutil", ["-p", plist]);
    const m = stdout.match(/"CFBundleShortVersionString"\s*=>\s*"([^"]+)"/);
    if (m) version = m[1];
  } catch {
    // plutil not available or app not found — use "unknown"
  }

  const majorVersion = version.split(".").slice(0, 2).join(".");
  const removed: RemovedCodec[] = [...(REMOVED_CODECS_BY_VERSION[majorVersion] ?? [])];
  if (appleSilicon) removed.push(...REMOVED_APPLE_SILICON);

  const available = [
    "H.264", "HEVC (H.265)", "Apple ProRes", "Apple ProRes RAW",
    "MPEG-4", "MXF", "QuickTime", "MP3", "AAC", "FLAC",
  ];
  if (appleSilicon) available.push("MV-HEVC", "Apple Immersive Video");

  return { available, removed, appleSilicon, version };
}

// ---------------------------------------------------------------------------
// NameKey resolution
// ---------------------------------------------------------------------------

const nameKeyCache = new Map<string, Record<string, string>>();

async function resolveNameKeys(locale: string): Promise<Record<string, string>> {
  if (nameKeyCache.has(locale)) return nameKeyCache.get(locale)!;

  const cfg = loadConfig();
  const baseDir = join(
    cfg.compressorAppPath,
    "Contents",
    "PlugIns",
    "Compressor",
    "CompressorKit.bundle",
    "Contents",
    "Frameworks",
    "Compressor.framework",
    "Versions",
    "A",
    "Frameworks",
    "CompressorKit.framework",
    "Versions",
    "A",
    "Resources",
  );

  const tryLocales = [locale, "en"];
  for (const loc of tryLocales) {
    const stringsPath = join(baseDir, `${loc}.lproj`, "Localizable.strings");
    try {
      await access(stringsPath);
      // plutil -p prints the binary plist as a "pretty" text format
      const { stdout } = await execFileAsync("plutil", ["-p", stringsPath]);
      const map: Record<string, string> = {};
      // Output format: "KEY" => "VALUE"
      const re = /"([^"]+)"\s*=>\s*"([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(stdout)) !== null) {
        map[m[1]] = m[2];
      }
      nameKeyCache.set(locale, map);
      return map;
    } catch {
      continue;
    }
  }

  nameKeyCache.set(locale, {});
  return {};
}

// ---------------------------------------------------------------------------
// .compressorsetting XML parser
// ---------------------------------------------------------------------------

function safeNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function parseAudioFormatInfo(info: string): { sampleRate: number; channels: number; bitDepth: number } {
  const parts = info.trim().split(/\s+/);
  return {
    sampleRate: safeNum(parts[0]),
    channels: safeNum(parts[1]),
    bitDepth: safeNum(parts[2]),
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: true,
});

async function decodeEncoderProperties(blob: string): Promise<{ profile?: string; level?: string; bitDepth?: string }> {
  // blob is base64-encoded binary plist
  try {
    const buf = Buffer.from(blob.replace(/\s+/g, ""), "base64");
    const tmp = `/tmp/csos_enc_props_${Date.now()}.plist`;
    const { writeFile, unlink } = await import("node:fs/promises");
    await writeFile(tmp, buf);
    const { stdout } = await execFileAsync("plutil", ["-convert", "xml1", "-o", "-", tmp]);
    await unlink(tmp).catch(() => undefined);

    const result: Record<string, string> = {};
    const profileM = stdout.match(/<key>Profile<\/key>\s*<string>([^<]+)<\/string>/);
    const levelM = stdout.match(/<key>Level<\/key>\s*<string>([^<]+)<\/string>/);
    const depthM = stdout.match(/<key>(?:BitDepth|Color)<\/key>\s*<string>([^<]+)<\/string>/);
    if (profileM) result.profile = profileM[1];
    if (levelM) result.level = levelM[1];
    if (depthM) result.bitDepth = depthM[1];
    return result;
  } catch {
    return {};
  }
}

export async function inspectSetting(opts: {
  path: string;
  locale?: string;
  resolveNames?: boolean;
  decodeEncoderProperties?: boolean;
}): Promise<InspectedSetting> {
  const locale = opts.locale ?? Intl.DateTimeFormat().resolvedOptions().locale ?? "en";
  const resolveNames = opts.resolveNames !== false;

  let raw: string;
  try {
    raw = await readFile(opts.path, "utf-8");
  } catch {
    throw new CreatorStudioError("E_SETTING_NOT_FOUND", `Setting file not found: ${opts.path}`);
  }

  const doc = parser.parse(raw) as Record<string, unknown>;
  const setting = doc["setting"] as Record<string, unknown> | undefined;
  if (!setting) {
    throw new CreatorStudioError("E_SETTING_NOT_FOUND", `Not a valid .compressorsetting file: ${opts.path}`);
  }

  const nameKeyStr = String(setting["nameKey"] ?? basename(opts.path, ".compressorsetting"));
  const descKeyStr = String(setting["descriptionKey"] ?? "");

  let displayName = nameKeyStr;
  let description = descKeyStr;

  if (resolveNames) {
    const nameMap = await resolveNameKeys(locale);
    if (nameMap[nameKeyStr]) displayName = nameMap[nameKeyStr];
    if (descKeyStr && nameMap[descKeyStr]) description = nameMap[descKeyStr];
  }

  const encoder = (setting["encoder"] as Record<string, unknown>) ?? {};
  const videoEncode = (encoder["video-encode"] as Record<string, unknown>) ?? {};
  const audioEncode = (encoder["audio-encode"] as Record<string, unknown>) ?? {};
  const automatic = (videoEncode["automatic"] as Record<string, unknown>) ?? {};
  const colorSpace = (videoEncode["color-space"] as Record<string, unknown>) ?? {};

  const audioFormatInfo = parseAudioFormatInfo(String(audioEncode["audio-format-info"] ?? ""));

  let encoderProps: { profile?: string; level?: string; bitDepth?: string } = {};
  if (opts.decodeEncoderProperties) {
    const blob = String(videoEncode["encoder-properties"] ?? "");
    if (blob) encoderProps = await decodeEncoderProperties(blob);
  }

  const video: SettingVideoInfo = {
    codec: String(videoEncode["codec-type"] ?? "").trim(),
    codecVendor: String(videoEncode["codec-manufacturer"] ?? "").trim(),
    width: safeNum(automatic["@_width"] ?? videoEncode["@_width"] ?? 0),
    height: safeNum(automatic["@_height"] ?? videoEncode["@_height"] ?? 0),
    frameRate: safeNum(videoEncode["frame-rate"] ?? 0),
    bitrate: safeNum(videoEncode["data-rate"] ?? 0),
    colorPrimaries: safeNum(colorSpace["@_primaries"] ?? 0),
    colorTransfer: safeNum(colorSpace["@_transfer"] ?? 0),
    colorMatrix: safeNum(colorSpace["@_matrix"] ?? 0),
    ...encoderProps,
  };

  const audio: SettingAudioInfo = {
    codec: String(audioEncode["codec-type"] ?? "").trim(),
    bitrate: safeNum(audioEncode["audio-encoding-bitrate"] ?? 0),
    ...audioFormatInfo,
  };

  // Determine availability
  const avail = await getCodecAvailability();
  let availability: InspectedSetting["availability"] = "ok";
  for (const removed of avail.removed) {
    const codecLower = removed.codec.toLowerCase();
    if (
      video.codec.toLowerCase().includes(codecLower) ||
      codecLower.includes(video.codec.toLowerCase()) ||
      displayName.toLowerCase().includes(codecLower)
    ) {
      availability = removed.reason.includes("Silicon") ? "arch-incompatible" : "codec-removed";
      break;
    }
  }

  return {
    internalName: String(setting["@_name"] ?? basename(opts.path, ".compressorsetting")),
    displayName,
    description,
    container: String(encoder["file-extension"] ?? ""),
    video,
    audio,
    availability,
    raw: setting,
  };
}

// ---------------------------------------------------------------------------
// Display-name reverse lookup cache
// ---------------------------------------------------------------------------

let resolveCache: Map<string, string> | null = null;

async function buildResolveCache(): Promise<Map<string, string>> {
  if (resolveCache) return resolveCache;
  const { listCompressorSettings } = await import("./settings.js");
  const settings = await listCompressorSettings({ includeBundled: true });
  const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "en";
  const nameMap = await resolveNameKeys(locale);
  resolveCache = new Map();
  for (const s of settings) {
    try {
      const raw = await readFile(s.path, "utf-8");
      const doc = parser.parse(raw) as Record<string, unknown>;
      const setting = doc["setting"] as Record<string, unknown> | undefined;
      if (!setting) continue;
      const nameKey = String(setting["nameKey"] ?? s.name);
      const displayName = nameMap[nameKey] ?? nameKey;
      resolveCache.set(displayName.toLowerCase(), s.path);
      resolveCache.set(nameKey.toLowerCase(), s.path);
    } catch {
      continue;
    }
  }
  return resolveCache;
}

export async function resolveSettingByName(displayName: string): Promise<string> {
  const cache = await buildResolveCache();
  const path = cache.get(displayName.toLowerCase());
  if (!path) {
    throw new CreatorStudioError(
      "E_SETTING_NOT_FOUND",
      `No setting found with display name: ${displayName}`,
      "Use compressor_settings_list to see available settings, then pass the exact displayName.",
    );
  }
  return path;
}
