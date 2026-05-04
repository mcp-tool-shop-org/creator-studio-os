import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_DATA_DIR = "/Volumes/T9-Shared/AI/creator-studio";
const FALLBACK_DATA_DIR = join(homedir(), "creator-studio");

export interface Config {
  dataDir: string;
  fcpAppPath: string;
  fcpBundleId: string;
  fcpDtdPath: string;
}

export function loadConfig(): Config {
  const dataDir = process.env.CREATOR_STUDIO_DATA_DIR ?? DEFAULT_DATA_DIR;

  return {
    dataDir,
    fcpAppPath:
      process.env.CREATOR_STUDIO_FCP_PATH ??
      "/Applications/Final Cut Pro Creator Studio.app",
    fcpBundleId: "com.apple.FinalCutApp",
    fcpDtdPath:
      process.env.CREATOR_STUDIO_FCP_DTD ??
      "/Applications/Final Cut Pro Creator Studio.app/Contents/Frameworks/Interchange.framework/Versions/A/Resources/FCPXMLv1_13.dtd",
  };
}

export function fallbackDataDir(): string {
  return FALLBACK_DATA_DIR;
}
