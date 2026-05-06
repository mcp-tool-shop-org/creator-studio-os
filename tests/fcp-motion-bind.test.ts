import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPublishedParams, buildParamBinding, buildProjectFcpxml } from "@creator-studio-os/fcp";
import { CreatorStudioError } from "@creator-studio-os/core";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-bind-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const TEMPLATE_TWO_PUBLISHED = `<ozml version="4.0">
  <scenenode id="10" factoryID="1">
    <parameter id="200" name="Headline" flags="16" value="Hello">
      <parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>
    </parameter>
    <parameter id="201" name="Subtitle" flags="16" value="Sub">
      <parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>
    </parameter>
    <parameter id="202" name="Hidden" flags="16" value="Not published"/>
  </scenenode>
</ozml>`;

const TEMPLATE_NONE_PUBLISHED = `<ozml version="4.0">
  <scenenode id="10" factoryID="1">
    <parameter id="100" name="Size" flags="4" value="72"/>
  </scenenode>
</ozml>`;

// ─── readPublishedParams ──────────────────────────────────────────────────────

describe("readPublishedParams", () => {
  it("returns all published parameters", async () => {
    const src = join(tmp, "t.moti");
    await writeFile(src, TEMPLATE_TWO_PUBLISHED, "utf-8");

    const params = await readPublishedParams(src);
    expect(params).toHaveLength(2);
    const names = params.map((p) => p.name);
    expect(names).toContain("Headline");
    expect(names).toContain("Subtitle");
  });

  it("does NOT include unpublished parameters", async () => {
    const src = join(tmp, "t.moti");
    await writeFile(src, TEMPLATE_TWO_PUBLISHED, "utf-8");

    const params = await readPublishedParams(src);
    expect(params.map((p) => p.name)).not.toContain("Hidden");
  });

  it("returns the OZML parameter id", async () => {
    const src = join(tmp, "t.moti");
    await writeFile(src, TEMPLATE_TWO_PUBLISHED, "utf-8");

    const params = await readPublishedParams(src);
    const headline = params.find((p) => p.name === "Headline");
    expect(headline?.paramId).toBe("200");
  });

  it("returns empty array when nothing is published", async () => {
    const src = join(tmp, "t.moti");
    await writeFile(src, TEMPLATE_NONE_PUBLISHED, "utf-8");

    const params = await readPublishedParams(src);
    expect(params).toHaveLength(0);
  });

  it("throws E_OZML_FILE_MISSING for missing file", async () => {
    await expect(readPublishedParams(join(tmp, "ghost.moti"))).rejects.toMatchObject({
      code: "E_OZML_FILE_MISSING",
    } satisfies Partial<CreatorStudioError>);
  });

  it("throws E_OZML_INVALID for non-OZML content", async () => {
    const src = join(tmp, "bad.moti");
    await writeFile(src, "<html/>", "utf-8");
    await expect(readPublishedParams(src)).rejects.toMatchObject({
      code: "E_OZML_INVALID",
    } satisfies Partial<CreatorStudioError>);
  });
});

// ─── buildParamBinding ────────────────────────────────────────────────────────

describe("buildParamBinding", () => {
  it("returns a MotionParamBinding for a published param", async () => {
    const src = join(tmp, "t.moti");
    await writeFile(src, TEMPLATE_TWO_PUBLISHED, "utf-8");

    const binding = await buildParamBinding({ motnPath: src, paramName: "Headline", value: "My Title" });
    expect(binding.name).toBe("Headline");
    expect(binding.value).toBe("My Title");
    expect(binding.paramId).toBe("200");
    expect(binding.key).toBe("200");
  });

  it("throws E_OZML_PARAM_NOT_FOUND for an unpublished param", async () => {
    const src = join(tmp, "t.moti");
    await writeFile(src, TEMPLATE_TWO_PUBLISHED, "utf-8");

    await expect(
      buildParamBinding({ motnPath: src, paramName: "Hidden", value: "x" }),
    ).rejects.toMatchObject({ code: "E_OZML_PARAM_NOT_FOUND" } satisfies Partial<CreatorStudioError>);
  });
});

// ─── builder <param> emission ─────────────────────────────────────────────────

describe("buildProjectFcpxml — TitleSpec.params", () => {
  const BASE_SPEC = {
    projectName: "Test",
    assets: [],
    markers: [],
  };

  it("emits <param> elements for bindings on a title", () => {
    const result = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        {
          kind: "title",
          name: "My Motion Title",
          text: "placeholder",
          offsetSeconds: 0,
          durationSeconds: 5,
          lane: 1,
          effectUid: ".../Custom.localized/Custom.moti",
          effectName: "Custom",
          params: [
            { name: "Headline", key: "200", value: "the showcase project" },
            { name: "Subtitle", key: "201", value: "A space merchant RPG" },
          ],
        },
      ],
    });

    expect(result.xml).toContain('<param name="Headline" key="200" value="the showcase project"/>');
    expect(result.xml).toContain('<param name="Subtitle" key="201" value="A space merchant RPG"/>');
  });

  it("XML-escapes param values", () => {
    const result = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        {
          kind: "title",
          name: "T",
          text: "x",
          offsetSeconds: 0,
          durationSeconds: 3,
          lane: 1,
          effectUid: ".../Custom.localized/Custom.moti",
          effectName: "Custom",
          params: [{ name: "Text", key: "100", value: 'a "quoted" & <special>' }],
        },
      ],
    });

    expect(result.xml).toContain('value="a &quot;quoted&quot; &amp; &lt;special&gt;"');
  });

  it("produces no <param> block when params is absent", () => {
    const result = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        {
          kind: "title",
          name: "Plain",
          text: "hello",
          offsetSeconds: 0,
          durationSeconds: 3,
          lane: 1,
          effectUid: ".../Custom.localized/Custom.moti",
          effectName: "Custom",
        },
      ],
    });

    expect(result.xml).not.toContain("<param ");
  });
});
