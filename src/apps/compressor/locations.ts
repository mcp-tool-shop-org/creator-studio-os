import { readdir, stat, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export interface CompressorLocation {
  name: string;
  path: string;
  source: "user" | "system";
}

const LOCATION_EXT = ".compressorlocation";

async function listInDir(
  dir: string,
  source: CompressorLocation["source"],
): Promise<CompressorLocation[]> {
  try {
    await access(dir);
  } catch {
    return [];
  }
  const entries = await readdir(dir);
  const out: CompressorLocation[] = [];
  for (const e of entries) {
    if (e.startsWith(".") || e.startsWith("._")) continue;
    if (!e.endsWith(LOCATION_EXT)) continue;
    const p = join(dir, e);
    try {
      const s = await stat(p);
      if (s.isFile()) {
        out.push({
          name: e.slice(0, -LOCATION_EXT.length),
          path: p,
          source,
        });
      }
    } catch {
      continue;
    }
  }
  return out;
}

export async function listCompressorLocations(): Promise<CompressorLocation[]> {
  const userDir = join(
    homedir(),
    "Library",
    "Application Support",
    "Compressor",
    "Locations",
  );
  const systemDir = "/Library/Application Support/Compressor/Locations";

  const out: CompressorLocation[] = [];
  out.push(...(await listInDir(userDir, "user")));
  out.push(...(await listInDir(systemDir, "system")));
  out.sort((a, b) => {
    if (a.source !== b.source) return a.source === "user" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}
