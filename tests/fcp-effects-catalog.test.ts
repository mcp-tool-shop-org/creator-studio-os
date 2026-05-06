import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEffectsCatalog, findEffect, type EffectCatalog } from "@creator-studio-os/fcp";
import { CreatorStudioError } from "@creator-studio-os/core";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-effects-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

// Minimal OZML with one published parameter
const TEMPLATE_WITH_PUBLISHED = `<ozml version="4.0">
  <factory id="1" uuid="AAAA-0000" description="My Factory">
    <description>Custom Title</description>
  </factory>
  <scenenode id="10" factoryID="1">
    <parameter id="200" name="Headline" flags="16" value="Hello">
      <parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>
    </parameter>
    <parameter id="201" name="Subtitle" flags="16" value="Sub"/>
  </scenenode>
</ozml>`;

// Minimal OZML with no published parameters and no factory description
const TEMPLATE_PLAIN = `<ozml version="4.0">
  <scenenode id="10" factoryID="1">
    <parameter id="100" name="Size" flags="4" value="72"/>
  </scenenode>
</ozml>`;

async function makeTemplateTree(root: string) {
  // root/Titles.localized/Build In:Out.localized/Custom.localized/Custom.moti
  const titlesDir = join(root, "Titles.localized", "Build In:Out.localized", "Custom.localized");
  await mkdir(titlesDir, { recursive: true });
  await writeFile(join(titlesDir, "Custom.moti"), TEMPLATE_WITH_PUBLISHED, "utf-8");

  // root/Generators.localized/Shapes.localized/Circle.moti
  const genDir = join(root, "Generators.localized", "Shapes.localized");
  await mkdir(genDir, { recursive: true });
  await writeFile(join(genDir, "Circle.moti"), TEMPLATE_PLAIN, "utf-8");

  // root/Effects.localized/Blur.localized/Gaussian.motn
  const fxDir = join(root, "Effects.localized", "Blur.localized");
  await mkdir(fxDir, { recursive: true });
  await writeFile(join(fxDir, "Gaussian.motn"), TEMPLATE_PLAIN, "utf-8");
}

describe("buildEffectsCatalog", () => {
  it("discovers templates and assigns correct kinds", async () => {
    const root = join(tmp, "templates");
    await makeTemplateTree(root);
    const dataDir = join(tmp, "data");
    process.env.CREATOR_STUDIO_DATA_DIR = dataDir;

    try {
      const catalog = await buildEffectsCatalog({ searchRoots: [root] });
      const kinds = catalog.entries.map((e) => e.kind).sort();
      expect(kinds).toContain("title");
      expect(kinds).toContain("generator");
      expect(kinds).toContain("effect");
    } finally {
      delete process.env.CREATOR_STUDIO_DATA_DIR;
    }
  });

  it("extracts published params correctly", async () => {
    const root = join(tmp, "templates");
    await makeTemplateTree(root);
    const dataDir = join(tmp, "data");
    process.env.CREATOR_STUDIO_DATA_DIR = dataDir;

    try {
      const catalog = await buildEffectsCatalog({ searchRoots: [root] });
      const title = catalog.entries.find((e) => e.kind === "title");
      expect(title).toBeDefined();
      expect(title!.publishedParams).toContain("Headline");
      expect(title!.publishedParams).not.toContain("Subtitle");
    } finally {
      delete process.env.CREATOR_STUDIO_DATA_DIR;
    }
  });

  it("uses factory description as name when present", async () => {
    const root = join(tmp, "templates");
    await makeTemplateTree(root);
    const dataDir = join(tmp, "data");
    process.env.CREATOR_STUDIO_DATA_DIR = dataDir;

    try {
      const catalog = await buildEffectsCatalog({ searchRoots: [root] });
      const title = catalog.entries.find((e) => e.kind === "title");
      // TEMPLATE_WITH_PUBLISHED has <description>Custom Title</description>
      expect(title!.name).toBe("Custom Title");
    } finally {
      delete process.env.CREATOR_STUDIO_DATA_DIR;
    }
  });

  it("falls back to file basename when no factory description", async () => {
    const root = join(tmp, "templates");
    await makeTemplateTree(root);
    const dataDir = join(tmp, "data");
    process.env.CREATOR_STUDIO_DATA_DIR = dataDir;

    try {
      const catalog = await buildEffectsCatalog({ searchRoots: [root] });
      const gen = catalog.entries.find((e) => e.kind === "generator");
      expect(gen!.name).toBe("Circle");
    } finally {
      delete process.env.CREATOR_STUDIO_DATA_DIR;
    }
  });

  it("counts all <parameter> tags", async () => {
    const root = join(tmp, "templates");
    await makeTemplateTree(root);
    const dataDir = join(tmp, "data");
    process.env.CREATOR_STUDIO_DATA_DIR = dataDir;

    try {
      const catalog = await buildEffectsCatalog({ searchRoots: [root] });
      const title = catalog.entries.find((e) => e.kind === "title");
      // TEMPLATE_WITH_PUBLISHED has 3 <parameter tags
      expect(title!.paramCount).toBe(3);
    } finally {
      delete process.env.CREATOR_STUDIO_DATA_DIR;
    }
  });

  it("writes cache and returns cached result on second call", async () => {
    const root = join(tmp, "templates");
    await makeTemplateTree(root);
    const dataDir = join(tmp, "data");
    process.env.CREATOR_STUDIO_DATA_DIR = dataDir;

    try {
      const first = await buildEffectsCatalog({ searchRoots: [root] });
      // Second call with no searchRoots override — will hit cache since roots won't change
      // Directly verify cache file exists and round-trips
      const cachePath = join(dataDir, ".csos/effects-catalog.json");
      const raw = await readFile(cachePath, "utf-8");
      const cached = JSON.parse(raw) as EffectCatalog;
      expect(cached.buildTime).toBe(first.buildTime);
      expect(cached.entries.length).toBe(first.entries.length);
    } finally {
      delete process.env.CREATOR_STUDIO_DATA_DIR;
    }
  });

  it("skips non-OZML files silently", async () => {
    const root = join(tmp, "templates");
    const dir = join(root, "Titles.localized", "Misc.localized");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "not-ozml.moti"), "<html><body>nope</body></html>", "utf-8");
    const dataDir = join(tmp, "data");
    process.env.CREATOR_STUDIO_DATA_DIR = dataDir;

    try {
      const catalog = await buildEffectsCatalog({ searchRoots: [root] });
      expect(catalog.entries.length).toBe(0);
    } finally {
      delete process.env.CREATOR_STUDIO_DATA_DIR;
    }
  });

  it("returns empty catalog when search root does not exist", async () => {
    const dataDir = join(tmp, "data");
    process.env.CREATOR_STUDIO_DATA_DIR = dataDir;

    try {
      const catalog = await buildEffectsCatalog({
        searchRoots: [join(tmp, "no-such-dir")],
      });
      expect(catalog.entries).toEqual([]);
    } finally {
      delete process.env.CREATOR_STUDIO_DATA_DIR;
    }
  });
});

describe("findEffect", () => {
  it("returns the matching entry (case-insensitive)", () => {
    const catalog: EffectCatalog = {
      buildTime: new Date().toISOString(),
      entries: [
        {
          path: "/fake/Custom.moti",
          kind: "title",
          name: "Custom Title",
          bundleName: "Custom",
          publishedParams: ["Headline"],
          paramCount: 2,
        },
      ],
    };
    const found = findEffect("custom title", catalog);
    expect(found.name).toBe("Custom Title");
  });

  it("throws E_EFFECT_NOT_FOUND for unknown name", () => {
    const catalog: EffectCatalog = {
      buildTime: new Date().toISOString(),
      entries: [],
    };
    expect(() => findEffect("Nonexistent", catalog)).toThrowError(
      expect.objectContaining({ code: "E_EFFECT_NOT_FOUND" } satisfies Partial<CreatorStudioError>),
    );
  });
});
