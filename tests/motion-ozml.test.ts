import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  inspectTemplate,
  setParam,
  cloneTemplate,
} from "../src/apps/motion/ozml.js";

const SAMPLE_MOTN = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ozxmlscene>
<ozml version="4.0">

<factory id="1" uuid="abc-1">
\t<description>Style</description>
\t<manufacturer>Apple</manufacturer>
</factory>

<factory id="2" uuid="abc-2">
\t<description>Channel</description>
\t<manufacturer>Apple</manufacturer>
</factory>

<scene>
\t<scenenode>
\t\t<parameter name="Size" id="3" flags="16777296" default="48" value="74"/>
\t\t<parameter name="Tracking" id="4" flags="16777296" default="0" value="0"/>
\t\t<parameter name="Scale" id="8" flags="4176">
\t\t\t<parameter name="X" id="1" flags="16777296" default="1" value="1"/>
\t\t\t<parameter name="Y" id="2" flags="16777296" default="1" value="1"/>
\t\t</parameter>
\t\t<parameter name="Rotation" id="65" flags="4176">
\t\t\t<parameter name="X" id="1" flags="16777296" default="0" value="0"/>
\t\t\t<parameter name="Y" id="2" flags="16777296" default="0" value="0"/>
\t\t\t<parameter name="Z" id="3" flags="16777296" default="0" value="0"/>
\t\t</parameter>
\t</scenenode>
</scene>
</ozml>
`;

let tmp: string;
let samplePath: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-ozml-test-"));
  samplePath = join(tmp, "sample.motn");
  await writeFile(samplePath, SAMPLE_MOTN, "utf-8");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("inspectTemplate", () => {
  it("parses ozml version + factory list + parameter list", async () => {
    const r = await inspectTemplate(samplePath);
    expect(r.ozmlVersion).toBe("4.0");
    expect(r.factories.length).toBe(2);
    expect(r.factories[0]).toMatchObject({
      id: "1",
      uuid: "abc-1",
      description: "Style",
    });
    expect(r.parameterCount).toBe(9);
    const sizeParam = r.parameters.find(
      (p) => p.name === "Size" && p.id === "3",
    );
    expect(sizeParam).toBeDefined();
    expect(sizeParam!.value).toBe("74");
    expect(sizeParam!.flags).toBe("16777296");
    expect(sizeParam!.defaultValue).toBe("48");
  });

  it("rejects non-OZML files", async () => {
    const bad = join(tmp, "bad.xml");
    await writeFile(bad, "<root>not ozml</root>");
    await expect(inspectTemplate(bad)).rejects.toMatchObject({
      code: "E_OZML_INVALID",
    });
  });

  it("rejects missing files", async () => {
    await expect(inspectTemplate(join(tmp, "nope.motn"))).rejects.toMatchObject(
      { code: "E_OZML_FILE_MISSING" },
    );
  });
});

describe("setParam", () => {
  it("mutates a single parameter's value", async () => {
    const result = await setParam(samplePath, "Size", "3", "120");
    expect(result.oldValue).toBe("74");
    expect(result.newValue).toBe("120");
    expect(result.matchedAt).toBe(0);

    const after = await readFile(samplePath, "utf-8");
    expect(after).toContain('name="Size" id="3" flags="16777296" default="48" value="120"');
    expect(after).not.toContain('value="74"');
  });

  it("preserves all other content byte-for-byte", async () => {
    const before = await readFile(samplePath, "utf-8");
    await setParam(samplePath, "Tracking", "4", "5");
    const after = await readFile(samplePath, "utf-8");

    const beforeWithoutTarget = before.replace(
      /<parameter name="Tracking"[^/]*\/>/,
      "<TARGET/>",
    );
    const afterWithoutTarget = after.replace(
      /<parameter name="Tracking"[^/]*\/>/,
      "<TARGET/>",
    );
    expect(afterWithoutTarget).toBe(beforeWithoutTarget);
  });

  it("disambiguates by matchIndex when name+id collides", async () => {
    const result0 = await setParam(samplePath, "X", "1", "999", {
      matchIndex: 0,
    });
    expect(result0.oldValue).toBe("1");

    const after0 = await readFile(samplePath, "utf-8");
    const xs = after0.match(/<parameter name="X"[^/]*\/>/g) ?? [];
    expect(xs).toHaveLength(2);
    expect(xs[0]).toContain('value="999"');
    expect(xs[1]).toContain('value="0"');

    const result1 = await setParam(samplePath, "X", "1", "555", {
      matchIndex: 1,
    });
    expect(result1.oldValue).toBe("0");
    const after1 = await readFile(samplePath, "utf-8");
    const xs2 = after1.match(/<parameter name="X"[^/]*\/>/g) ?? [];
    expect(xs2[0]).toContain('value="999"');
    expect(xs2[1]).toContain('value="555"');
  });

  it("supports outputPath for non-destructive mutation", async () => {
    const out = join(tmp, "modified.motn");
    await setParam(samplePath, "Size", "3", "200", { outputPath: out });

    const original = await readFile(samplePath, "utf-8");
    expect(original).toContain('value="74"');

    const modified = await readFile(out, "utf-8");
    expect(modified).toContain('value="200"');
    expect(modified).not.toContain('value="74"');
  });

  it("throws E_OZML_PARAM_NOT_FOUND when no match", async () => {
    await expect(
      setParam(samplePath, "DoesNotExist", "999", "0"),
    ).rejects.toMatchObject({
      code: "E_OZML_PARAM_NOT_FOUND",
    });
  });

  it("throws E_OZML_PARAM_NOT_FOUND when matchIndex is out of range", async () => {
    await expect(
      setParam(samplePath, "Size", "3", "0", { matchIndex: 5 }),
    ).rejects.toMatchObject({
      code: "E_OZML_PARAM_NOT_FOUND",
    });
  });

  it("XML-escapes special characters in the new value", async () => {
    await setParam(samplePath, "Size", "3", 'a&b"<c');
    const after = await readFile(samplePath, "utf-8");
    expect(after).toContain('value="a&amp;b&quot;&lt;c"');
  });
});

describe("cloneTemplate", () => {
  it("copies a template to a new location", async () => {
    const dst = join(tmp, "subdir", "clone.motn");
    const result = await cloneTemplate(samplePath, dst);
    expect(result.bytes).toBeGreaterThan(0);

    const dstContent = await readFile(dst, "utf-8");
    const srcContent = await readFile(samplePath, "utf-8");
    expect(dstContent).toBe(srcContent);
  });
});
