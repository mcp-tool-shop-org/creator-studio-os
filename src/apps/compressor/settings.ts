import { readdir, stat, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { loadConfig } from "../../config.js";

export interface CompressorSetting {
  name: string;
  path: string;
  source: "user" | "system" | "bundled";
}

const SETTING_EXTS = [".compressorsetting", ".cmprstng"];

async function listInDir(
  dir: string,
  source: CompressorSetting["source"],
): Promise<CompressorSetting[]> {
  try {
    await access(dir);
  } catch {
    return [];
  }
  const entries = await readdir(dir);
  const out: CompressorSetting[] = [];
  for (const e of entries) {
    if (e.startsWith(".") || e.startsWith("._")) continue;
    if (!SETTING_EXTS.some((ext) => e.endsWith(ext))) continue;
    const p = join(dir, e);
    try {
      const s = await stat(p);
      if (s.isFile()) {
        const baseName = SETTING_EXTS.reduce(
          (acc, ext) => (acc.endsWith(ext) ? acc.slice(0, -ext.length) : acc),
          e,
        );
        out.push({ name: baseName, path: p, source });
      }
    } catch {
      continue;
    }
  }
  return out;
}

export async function listCompressorSettings(opts: {
  includeBundled?: boolean;
} = {}): Promise<CompressorSetting[]> {
  const cfg = loadConfig();
  const userDir = join(
    homedir(),
    "Library",
    "Application Support",
    "Compressor",
    "Settings",
  );
  const systemDir = "/Library/Application Support/Compressor/Settings";

  const sources: CompressorSetting[] = [];
  sources.push(...(await listInDir(userDir, "user")));
  sources.push(...(await listInDir(systemDir, "system")));

  if (opts.includeBundled) {
    sources.push(...(await listInDir(cfg.compressorBundledSettingsDir, "bundled")));
  }

  sources.sort((a, b) => {
    const ord = { user: 0, system: 1, bundled: 2 } as const;
    if (ord[a.source] !== ord[b.source]) return ord[a.source] - ord[b.source];
    return a.name.localeCompare(b.name);
  });

  return sources;
}
