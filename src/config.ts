import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_DATA_DIR = "/Volumes/T9-Shared/AI/creator-studio";
const FALLBACK_DATA_DIR = join(homedir(), "creator-studio");

export interface Config {
  dataDir: string;
  fcpAppPath: string;
  fcpBundleId: string;
  fcpDtdPath: string;
  compressorAppPath: string;
  compressorBundleId: string;
  compressorBinaryPath: string;
  compressorBundledSettingsDir: string;
  /** ProRes 4444 with alpha — for scene-clip renders that need transparent canvas overlay. */
  compressorProRes4444SettingPath: string;
  pixelmatorAppPath: string;
  pixelmatorBundleId: string;
  logicAppPath: string;
  logicBundleId: string;
  motionAppPath: string;
  motionBundleId: string;
  keynoteAppPath: string;
  keynoteBundleId: string;
  pagesAppPath: string;
  pagesBundleId: string;
  numbersAppPath: string;
  numbersBundleId: string;
}

export function loadConfig(): Config {
  const dataDir = process.env.CREATOR_STUDIO_DATA_DIR ?? DEFAULT_DATA_DIR;

  const compressorAppPath =
    process.env.CREATOR_STUDIO_COMPRESSOR_PATH ??
    "/Applications/Compressor Creator Studio.app";

  return {
    dataDir,
    fcpAppPath:
      process.env.CREATOR_STUDIO_FCP_PATH ??
      "/Applications/Final Cut Pro Creator Studio.app",
    fcpBundleId: "com.apple.FinalCutApp",
    fcpDtdPath:
      process.env.CREATOR_STUDIO_FCP_DTD ??
      "/Applications/Final Cut Pro Creator Studio.app/Contents/Frameworks/Interchange.framework/Versions/A/Resources/FCPXMLv1_14.dtd",
    compressorAppPath,
    compressorBundleId: "com.apple.CompressorApp",
    compressorBinaryPath:
      process.env.CREATOR_STUDIO_COMPRESSOR_BIN ??
      `${compressorAppPath}/Contents/MacOS/Compressor`,
    compressorBundledSettingsDir:
      process.env.CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS ??
      `${compressorAppPath}/Contents/PlugIns/Compressor/CompressorKit.bundle/Contents/Frameworks/Compressor.framework/Versions/A/Frameworks/CompressorKit.framework/Versions/A/Resources/Settings`,
    compressorProRes4444SettingPath:
      process.env.CREATOR_STUDIO_COMPRESSOR_PRORES4444_SETTING ??
      `${compressorAppPath}/Contents/PlugIns/Compressor/CompressorKit.bundle/Contents/Frameworks/Compressor.framework/Versions/A/Frameworks/StompUI.framework/Versions/A/Resources/BuiltInSettings/ProRes/proRes4444Name.compressorsetting`,
    pixelmatorAppPath:
      process.env.CREATOR_STUDIO_PIXELMATOR_PATH ??
      "/Applications/Pixelmator Pro Creator Studio.app",
    pixelmatorBundleId: "com.apple.pixelmator",
    logicAppPath:
      process.env.CREATOR_STUDIO_LOGIC_PATH ??
      "/Applications/Logic Pro Creator Studio.app",
    logicBundleId: "com.apple.mobilelogic",
    motionAppPath:
      process.env.CREATOR_STUDIO_MOTION_PATH ??
      "/Applications/Motion Creator Studio.app",
    motionBundleId: "com.apple.motionappApp",
    keynoteAppPath:
      process.env.CREATOR_STUDIO_KEYNOTE_PATH ??
      "/Applications/Keynote Creator Studio.app",
    keynoteBundleId: "com.apple.Keynote",
    pagesAppPath:
      process.env.CREATOR_STUDIO_PAGES_PATH ??
      "/Applications/Pages Creator Studio.app",
    pagesBundleId: "com.apple.Pages",
    numbersAppPath:
      process.env.CREATOR_STUDIO_NUMBERS_PATH ??
      "/Applications/Numbers Creator Studio.app",
    numbersBundleId: "com.apple.Numbers",
  };
}

export function fallbackDataDir(): string {
  return FALLBACK_DATA_DIR;
}
