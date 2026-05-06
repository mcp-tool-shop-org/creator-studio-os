import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveProject,
  createProject,
  listProjects,
  CreatorStudioError,
} from "@creator-studio-os/core";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-test-"));
  process.env.CREATOR_STUDIO_DATA_DIR = tmp;
  await mkdir(join(tmp, "projects"), { recursive: true });
});

afterEach(async () => {
  delete process.env.CREATOR_STUDIO_DATA_DIR;
  await rm(tmp, { recursive: true, force: true });
});

describe("createProject + resolveProject", () => {
  it("creates the standard subdir layout and project.json", async () => {
    const proj = await createProject("trailer-showcase", {
      kind: "trailer",
      target: { aspect: "16:9", frameRate: "29.97" },
    });
    expect(proj.meta.name).toBe("trailer-showcase");
    expect(proj.meta.kind).toBe("trailer");
    expect(proj.paths.fcp).toMatch(/trailer-showcase\/fcp$/);

    const resolved = await resolveProject("trailer-showcase");
    expect(resolved.meta.kind).toBe("trailer");
  });

  it("throws E_PROJECT_NOT_FOUND when missing", async () => {
    await expect(resolveProject("nope")).rejects.toMatchObject({
      code: "E_PROJECT_NOT_FOUND",
    } satisfies Partial<CreatorStudioError>);
  });

  it("throws E_PROJECT_INVALID when project.json is malformed", async () => {
    const root = join(tmp, "projects", "broken");
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "project.json"), "not json", "utf-8");
    await expect(resolveProject("broken")).rejects.toMatchObject({
      code: expect.stringMatching(/E_PROJECT_INVALID|E_INTERNAL/),
    });
  });
});

describe("listProjects", () => {
  it("returns directory names sorted, skipping dotfiles and AppleDouble", async () => {
    await createProject("alpha");
    await createProject("beta");
    await writeFile(join(tmp, "projects", ".hidden"), "x");
    await writeFile(join(tmp, "projects", "._sidecar"), "x");
    const out = await listProjects();
    expect(out).toEqual(["alpha", "beta"]);
  });
});
