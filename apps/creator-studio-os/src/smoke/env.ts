import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { arch } from "node:os";

const execFileAsync = promisify(execFile);

export interface EnvInfo {
  macosVersion: string;
  arch: string;
  nodeVersion: string;
  fcpVersion: string;
  compressorVersion: string;
  motionVersion: string;
}

async function readBundleVersion(appPath: string): Promise<string> {
  try {
    const plistPath = join(appPath, "Contents", "Info.plist");
    const { stdout } = await execFileAsync("plutil", ["-p", plistPath]);
    const m = stdout.match(/"CFBundleShortVersionString"\s*=>\s*"([^"]+)"/);
    return m?.[1] ?? "unknown";
  } catch {
    return "not-installed";
  }
}

export async function getEnvInfo(opts: {
  fcpAppPath: string;
  compressorAppPath: string;
  motionAppPath: string;
}): Promise<EnvInfo> {
  const [fcpVersion, compressorVersion, motionVersion] = await Promise.all([
    readBundleVersion(opts.fcpAppPath),
    readBundleVersion(opts.compressorAppPath),
    readBundleVersion(opts.motionAppPath),
  ]);

  let macosVersion = "unknown";
  try {
    const { stdout } = await execFileAsync("sw_vers", ["-productVersion"]);
    macosVersion = stdout.trim();
  } catch {
    // non-mac dry-run
  }

  return {
    macosVersion,
    arch: arch(),
    nodeVersion: process.version,
    fcpVersion,
    compressorVersion,
    motionVersion,
  };
}
