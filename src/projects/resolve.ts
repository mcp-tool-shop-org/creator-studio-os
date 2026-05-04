import { readFile, readdir, stat, mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { CreatorStudioError } from "../errors.js";
import { ProjectMetaSchema, type ProjectMeta } from "./schema.js";
import { loadConfig } from "../config.js";

export interface ResolvedProject {
  name: string;
  root: string;
  meta: ProjectMeta;
  paths: {
    footage: string;
    audio: string;
    images: string;
    brand: string;
    refs: string;
    fcp: string;
    out: string;
  };
}

const SUBDIRS = ["footage", "audio", "images", "brand", "refs", "fcp", "out"] as const;

export async function listProjects(): Promise<string[]> {
  const cfg = loadConfig();
  const projectsDir = join(cfg.dataDir, "projects");
  try {
    const entries = await readdir(projectsDir);
    const dirs: string[] = [];
    for (const e of entries) {
      if (e.startsWith(".") || e.startsWith("._")) continue;
      const s = await stat(join(projectsDir, e));
      if (s.isDirectory()) dirs.push(e);
    }
    return dirs.sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CreatorStudioError(
        "E_DATA_DIR_MISSING",
        `Data directory does not exist: ${projectsDir}`,
        "Run 'creator-studio-os verify' to scaffold the data directory, or set CREATOR_STUDIO_DATA_DIR.",
      );
    }
    throw err;
  }
}

export async function resolveProject(name: string): Promise<ResolvedProject> {
  const cfg = loadConfig();
  const root = join(cfg.dataDir, "projects", name);
  const projectFile = join(root, "project.json");

  try {
    await access(root);
  } catch {
    throw new CreatorStudioError(
      "E_PROJECT_NOT_FOUND",
      `Project not found: ${name}`,
      `Expected directory: ${root}. Use 'createProject' to scaffold one.`,
    );
  }

  let raw: string;
  try {
    raw = await readFile(projectFile, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CreatorStudioError(
        "E_PROJECT_INVALID",
        `Missing project.json: ${projectFile}`,
        "Every project needs project.json at its root.",
      );
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new CreatorStudioError(
      "E_PROJECT_INVALID",
      `${projectFile} is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
      "Inspect project.json — it must be a valid JSON object matching ProjectMetaSchema.",
    );
  }

  const result = ProjectMetaSchema.safeParse(parsed);
  if (!result.success) {
    throw new CreatorStudioError(
      "E_PROJECT_INVALID",
      `${projectFile} failed schema: ${result.error.message}`,
    );
  }
  const meta: ProjectMeta = result.data;

  const paths = SUBDIRS.reduce(
    (acc, k) => ({ ...acc, [k]: join(root, k) }),
    {} as ResolvedProject["paths"],
  );

  return { name, root, meta, paths };
}

export async function createProject(
  name: string,
  meta: Partial<ProjectMeta> = {},
): Promise<ResolvedProject> {
  const cfg = loadConfig();
  const root = join(cfg.dataDir, "projects", name);

  await mkdir(root, { recursive: true });
  for (const sub of SUBDIRS) {
    await mkdir(join(root, sub), { recursive: true });
  }

  const finalMeta = ProjectMetaSchema.parse({ name, ...meta });
  await writeFile(
    join(root, "project.json"),
    JSON.stringify(finalMeta, null, 2),
    "utf-8",
  );

  return resolveProject(name);
}
