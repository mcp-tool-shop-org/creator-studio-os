import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { loadConfig } from "../../config.js";
import { CreatorStudioError } from "../../errors.js";

export type EffectKind = "title" | "generator" | "effect" | "transition";

export interface EffectEntry {
  path: string;
  kind: EffectKind;
  /** Display name: factory description if present, else file basename without extension */
  name: string;
  /** Immediate parent folder name with .localized stripped */
  bundleName: string;
  /** Param names that have a "Publish To FCP" marker (exposed in FCP inspector) */
  publishedParams: string[];
  paramCount: number;
}

export interface EffectCatalog {
  buildTime: string;
  entries: EffectEntry[];
}

const CACHE_SUBPATH = ".csos/effects-catalog.json";

const KIND_MAP: Record<string, EffectKind> = {
  "Titles.localized": "title",
  "Generators.localized": "generator",
  "Effects.localized": "effect",
  "Transitions.localized": "transition",
};

function defaultSearchRoots(cfg: ReturnType<typeof loadConfig>): string[] {
  return [
    join(homedir(), "Movies", "Motion Templates.localized"),
    "/Library/Application Support/Motion/Templates.localized",
    join(
      cfg.fcpAppPath,
      "Contents/PlugIns/MediaProviders/MotionEffect.fxp/Contents/Resources/Templates.localized",
    ),
  ];
}

function stripLocalized(name: string): string {
  return name.endsWith(".localized") ? name.slice(0, -".localized".length) : name;
}

function parseParamCount(xml: string): number {
  const re = /<parameter\b/g;
  let count = 0;
  while (re.exec(xml)) count++;
  return count;
}

function parseFactoryName(xml: string): string | null {
  const m = xml.match(/<factory\b[^>]*>\s*<description>([^<]+)<\/description>/);
  return m ? m[1].trim() : null;
}

/**
 * Stack-based OZML walker that finds parameter names whose direct child is the
 * "Publish To FCP" self-closing marker.
 */
function extractPublishedParams(xml: string): string[] {
  const published: string[] = [];
  const tagRe = /<\/?parameter\b([^>]*)>/g;
  const stack: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(xml)) !== null) {
    const fullTag = m[0];
    const attrs = m[1];

    if (fullTag.startsWith("</")) {
      stack.pop();
    } else if (attrs.trimEnd().endsWith("/")) {
      // Self-closing: check if it's the Publish To FCP marker
      const nameMatch = attrs.match(/name="([^"]+)"/);
      if (nameMatch?.[1] === "Publish To FCP" && stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (parent) published.push(parent);
      }
      // Self-closing tags do not push to stack
    } else {
      // Open tag: push its name
      const nameMatch = attrs.match(/name="([^"]+)"/);
      stack.push(nameMatch?.[1] ?? "");
    }
  }

  return [...new Set(published)];
}

async function walkForTemplates(
  dir: string,
  kind: EffectKind,
  entries: EffectEntry[],
): Promise<void> {
  let children: string[];
  try {
    children = await readdir(dir);
  } catch {
    return;
  }

  for (const child of children) {
    const fullPath = join(dir, child);
    let s;
    try {
      s = await stat(fullPath);
    } catch {
      continue;
    }

    if (s.isDirectory()) {
      await walkForTemplates(fullPath, kind, entries);
    } else if (child.endsWith(".moti") || child.endsWith(".motn")) {
      let xml: string;
      try {
        xml = await readFile(fullPath, "utf-8");
      } catch {
        continue;
      }

      if (!xml.includes("<ozml")) continue;

      const factoryName = parseFactoryName(xml);
      const nameNoExt = child.slice(0, child.lastIndexOf("."));
      const displayName = factoryName ?? stripLocalized(nameNoExt);
      const bundleName = stripLocalized(basename(dir));

      entries.push({
        path: fullPath,
        kind,
        name: displayName,
        bundleName,
        publishedParams: extractPublishedParams(xml),
        paramCount: parseParamCount(xml),
      });
    }
  }
}

async function walkKindRoot(
  templatesRoot: string,
  entries: EffectEntry[],
): Promise<void> {
  let topDirs: string[];
  try {
    topDirs = await readdir(templatesRoot);
  } catch {
    return;
  }

  for (const dir of topDirs) {
    const kind = KIND_MAP[dir];
    if (!kind) continue;
    await walkForTemplates(join(templatesRoot, dir), kind, entries);
  }
}

export async function buildEffectsCatalog(opts?: {
  refresh?: boolean;
  /** Override search roots (used in tests) */
  searchRoots?: string[];
}): Promise<EffectCatalog> {
  const cfg = loadConfig();
  const cachePath = join(cfg.dataDir, CACHE_SUBPATH);

  if (!opts?.refresh) {
    try {
      const raw = await readFile(cachePath, "utf-8");
      const cached = JSON.parse(raw) as EffectCatalog;
      if (cached.buildTime && Array.isArray(cached.entries)) {
        return cached;
      }
    } catch {
      // No cache or corrupt — rebuild
    }
  }

  const roots = opts?.searchRoots ?? defaultSearchRoots(cfg);
  const entries: EffectEntry[] = [];

  for (const root of roots) {
    await walkKindRoot(root, entries);
  }

  const catalog: EffectCatalog = {
    buildTime: new Date().toISOString(),
    entries,
  };

  await mkdir(join(cfg.dataDir, ".csos"), { recursive: true });
  await writeFile(cachePath, JSON.stringify(catalog, null, 2), "utf-8");

  return catalog;
}

/** Find an effect by name (case-insensitive). Throws E_EFFECT_NOT_FOUND if missing. */
export function findEffect(name: string, catalog: EffectCatalog): EffectEntry {
  const lower = name.toLowerCase();
  const match = catalog.entries.find((e) => e.name.toLowerCase() === lower);
  if (!match) {
    throw new CreatorStudioError(
      "E_EFFECT_NOT_FOUND",
      `Effect "${name}" not found in catalog (${catalog.entries.length} entries).`,
      "Run fcp_effects_catalog with refresh=true to rebuild. Use motion_template_inspect to look up params directly from a .moti path.",
    );
  }
  return match;
}
