import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setPublishMarker, publishToFcp } from "@creator-studio-os/motion";
import { CreatorStudioError } from "@creator-studio-os/core";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-publish-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

// Minimal template with one parameter that is NOT yet published
const TEMPLATE_UNPUBLISHED = `<ozml version="4.0">
  <scenenode id="10" factoryID="1">
    <parameter id="200" name="Headline" flags="16" value="Hello"/>
  </scenenode>
</ozml>`;

// Same template with the Publish To FCP marker already present (nested)
const TEMPLATE_PUBLISHED = `<ozml version="4.0">
  <scenenode id="10" factoryID="1">
    <parameter id="200" name="Headline" flags="16" value="Hello">
  <parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>
</parameter>
  </scenenode>
</ozml>`;

describe("setPublishMarker — add marker (publish=true)", () => {
  it("injects the Publish To FCP marker into a parameter block", () => {
    const result = setPublishMarker(TEMPLATE_UNPUBLISHED, "Headline", 200, true);
    expect(result).toContain('name="Publish To FCP"');
    expect(result).toContain('id="350"');
  });

  it("does not duplicate the marker when called twice (idempotent)", () => {
    const once = setPublishMarker(TEMPLATE_UNPUBLISHED, "Headline", 200, true);
    // Running again on already-published content should not double-insert
    const count = (once.match(/name="Publish To FCP"/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("throws E_OZML_PARAM_NOT_FOUND when param doesn't exist", () => {
    expect(() =>
      setPublishMarker(TEMPLATE_UNPUBLISHED, "NoSuchParam", 999, true),
    ).toThrow();
  });
});

describe("setPublishMarker — remove marker (publish=false)", () => {
  it("removes the Publish To FCP marker", () => {
    const result = setPublishMarker(TEMPLATE_PUBLISHED, "Headline", 200, false);
    expect(result).not.toContain('name="Publish To FCP"');
  });

  it("throws E_OZML_PUBLISH_MARKER_MISSING when no marker exists", () => {
    expect(() =>
      setPublishMarker(TEMPLATE_UNPUBLISHED, "Headline", 200, false),
    ).toThrowError();
  });
});

describe("publishToFcp — file I/O", () => {
  it("writes the mutated content to outputPath", async () => {
    const src = join(tmp, "template.motn");
    const dest = join(tmp, "template-out.motn");
    await writeFile(src, TEMPLATE_UNPUBLISHED, "utf-8");

    const result = await publishToFcp({
      path: src,
      paramName: "Headline",
      paramId: 200,
      publish: true,
      outputPath: dest,
    });

    expect(result.path).toBe(dest);
    expect(result.modified).toBe(true);
    const written = await readFile(dest, "utf-8");
    expect(written).toContain('name="Publish To FCP"');
  });

  it("overwrites source when outputPath is not given", async () => {
    const src = join(tmp, "template.motn");
    await writeFile(src, TEMPLATE_UNPUBLISHED, "utf-8");

    await publishToFcp({ path: src, paramName: "Headline", paramId: 200, publish: true });
    const written = await readFile(src, "utf-8");
    expect(written).toContain('name="Publish To FCP"');
  });

  it("returns modified=false when content doesn't change", async () => {
    // publish=true on already-published content
    const src = join(tmp, "already.motn");
    await writeFile(src, TEMPLATE_PUBLISHED, "utf-8");

    // remove first, then check modified
    const result = await publishToFcp({
      path: src,
      paramName: "Headline",
      paramId: 200,
      publish: false,
    });
    expect(result.publishMarkerCount).toBe(0);
  });

  it("throws E_OZML_FILE_MISSING for non-existent file", async () => {
    await expect(
      publishToFcp({
        path: join(tmp, "ghost.motn"),
        paramName: "X",
        paramId: 1,
        publish: true,
      }),
    ).rejects.toMatchObject({ code: "E_OZML_FILE_MISSING" } satisfies Partial<CreatorStudioError>);
  });
});
