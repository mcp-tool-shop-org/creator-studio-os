import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateTemplate } from "@creator-studio-os/motion";
import { CreatorStudioError } from "@creator-studio-os/core";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-validate-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helper: write a temp .motn and validate it
// ---------------------------------------------------------------------------

async function validate(xml: string) {
  const path = join(tmp, `test-${Date.now()}.motn`);
  await writeFile(path, xml, "utf-8");
  return validateTemplate(path);
}

// ---------------------------------------------------------------------------
// Minimal valid OZML template (positive case)
// ---------------------------------------------------------------------------

const VALID_OZML = `<?xml version="1.0" encoding="UTF-8"?>
<ozml version="4.0">
  <factories>
    <factory id="1" uuid="AABBCCDDEEFF00112233445566778899">
      <description>Style</description>
    </factory>
    <factory id="2" uuid="00112233445566778899AABBCCDDEEFF">
      <description>Text</description>
    </factory>
  </factories>
  <sceneSettings>
    <frameRate>30</frameRate>
    <NTSC>0</NTSC>
  </sceneSettings>
  <scenenode id="100" factoryID="2">
    <parameter id="101" name="Size" flags="16" value="72"/>
  </scenenode>
  <style id="200" factoryID="1"/>
</ozml>`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateTemplate — positive case", () => {
  it("returns ok=true for a valid minimal OZML fixture", async () => {
    const result = await validate(VALID_OZML);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe("validateTemplate — file errors", () => {
  it("throws E_OZML_FILE_MISSING for missing path", async () => {
    await expect(
      validateTemplate(join(tmp, "no-such.motn")),
    ).rejects.toMatchObject({ code: "E_OZML_FILE_MISSING" } satisfies Partial<CreatorStudioError>);
  });

  it("throws E_OZML_INVALID for non-OZML XML", async () => {
    const path = join(tmp, "bad.motn");
    await writeFile(path, "<root><child/></root>", "utf-8");
    await expect(validateTemplate(path)).rejects.toMatchObject({ code: "E_OZML_INVALID" });
  });
});

describe("Invariant 2 — factory id + uuid uniqueness", () => {
  it("flags duplicate factory id", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="AA00000000000000000000000000000A"><description>A</description></factory>
        <factory id="1" uuid="BB00000000000000000000000000000B"><description>B</description></factory>
      </factories>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_FACTORY_DUPLICATE_ID")).toBe(true);
  });

  it("flags duplicate factory uuid", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="SAMESAMESESAMESAMESAMESAMESAMESAM"><description>A</description></factory>
        <factory id="2" uuid="SAMESAMESESAMESAMESAMESAMESAMESAM"><description>B</description></factory>
      </factories>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_FACTORY_DUPLICATE_UUID")).toBe(true);
  });
});

describe("Invariant 3 — scenenode factoryID must exist", () => {
  it("flags scenenode referencing non-existent factory", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="AA000000000000000000000000000001"><description>A</description></factory>
      </factories>
      <scenenode id="10" factoryID="99"/>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_SCENENODE_FACTORY_MISSING")).toBe(true);
  });
});

describe("Invariant 4 — global id uniqueness", () => {
  it("flags duplicate ids across scenenodes", async () => {
    const xml = `<ozml version="4.0">
      <factories/>
      <scenenode id="42" factoryID="1"/>
      <scenenode id="42" factoryID="1"/>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_ID_NOT_UNIQUE")).toBe(true);
  });
});

describe("Invariant 7 — no value AND curve simultaneously", () => {
  it("flags parameter with both value= and <curve>", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="AA000000000000000000000000000001"><description>A</description></factory>
      </factories>
      <scenenode id="10" factoryID="1">
        <parameter id="101" name="Size" value="72">
          <curve>
            <numberOfKeypoints>1</numberOfKeypoints>
            <keypoint><time>0</time><value>72</value></keypoint>
          </curve>
        </parameter>
      </scenenode>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_KEYFRAME_VALUE_AND_CURVE")).toBe(true);
  });
});

describe("Invariant 8 — keypoint count matches numberOfKeypoints", () => {
  it("flags mismatch between declared and actual keypoint count", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="AA000000000000000000000000000001"><description>A</description></factory>
      </factories>
      <scenenode id="10" factoryID="1">
        <parameter id="101" name="Size">
          <curve>
            <numberOfKeypoints>3</numberOfKeypoints>
            <keypoint><time>0</time><value>72</value></keypoint>
          </curve>
        </parameter>
      </scenenode>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_KEYPOINT_COUNT_MISMATCH")).toBe(true);
  });
});

describe("Invariant 9 — keypoint times monotonic", () => {
  it("flags non-monotonic keypoints", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="AA000000000000000000000000000001"><description>A</description></factory>
      </factories>
      <scenenode id="10" factoryID="1">
        <parameter id="101" name="Size">
          <curve>
            <numberOfKeypoints>2</numberOfKeypoints>
            <keypoint><time>10</time><value>72</value></keypoint>
            <keypoint><time>5</time><value>100</value></keypoint>
          </curve>
        </parameter>
      </scenenode>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_KEYPOINT_NOT_MONOTONIC")).toBe(true);
  });
});

describe("Invariant 11/12 — glyph count vs object count", () => {
  it("flags mismatch between text glyphs and object elements", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="AA000000000000000000000000000001"><description>Text</description></factory>
      </factories>
      <scenenode id="10" factoryID="1">
        <text>Hi<object><parameter name="Kerning" id="1" flags="16" value="0"/></object></text>
      </scenenode>
    </ozml>`;
    // "Hi" = 2 glyphs but only 1 <object>
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_GLYPH_COUNT_MISMATCH")).toBe(true);
  });
});

describe("Invariant 14 — styleRun contiguity", () => {
  it("flags a gap between styleRuns", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="AA000000000000000000000000000001"><description>Text</description></factory>
      </factories>
      <style id="200" factoryID="1"/>
      <scenenode id="10" factoryID="1">
        <text>Hello
          <object><parameter name="Kerning" id="1" flags="16" value="0"/></object>
          <object><parameter name="Kerning" id="2" flags="16" value="0"/></object>
          <object><parameter name="Kerning" id="3" flags="16" value="0"/></object>
          <object><parameter name="Kerning" id="4" flags="16" value="0"/></object>
          <object><parameter name="Kerning" id="5" flags="16" value="0"/></object>
          <styleRun style="200" offset="0" length="2"/>
          <styleRun style="200" offset="4" length="1"/>
        </text>
      </scenenode>
    </ozml>`;
    // gap between offset=2 end and offset=4 start
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_STYLERUN_GAP")).toBe(true);
  });
});

describe("Invariant 16 — style reference dead", () => {
  it("flags styleRun referencing non-existent style id", async () => {
    const xml = `<ozml version="4.0">
      <factories>
        <factory id="1" uuid="AA000000000000000000000000000001"><description>Text</description></factory>
      </factories>
      <scenenode id="10" factoryID="1">
        <text>Hi
          <object><parameter name="Kerning" id="1" flags="16" value="0"/></object>
          <object><parameter name="Kerning" id="2" flags="16" value="0"/></object>
          <styleRun style="9999" offset="0" length="2"/>
        </text>
      </scenenode>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_STYLE_REFERENCE_DEAD")).toBe(true);
  });
});

describe("Invariant 21 — creationDuration formula", () => {
  it("flags creationDuration off by more than 1 from ceil(duration × frameRate)", async () => {
    const xml = `<ozml version="4.0">
      <factories/>
      <clip name="bg" id="1056">
        <missingDuration>3.0</missingDuration>
        <creationDuration>50</creationDuration>
        <parameter name="Frame Rate" id="107" flags="64" value="30"/>
      </clip>
    </ozml>`;
    // ceil(3.0 × 30) = 90, but creationDuration = 50 — big mismatch
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_CREATIONDURATION_MISMATCH")).toBe(true);
  });

  it("passes when creationDuration matches formula", async () => {
    const xml = `<ozml version="4.0">
      <factories/>
      <clip name="bg" id="1056">
        <missingDuration>3.0</missingDuration>
        <creationDuration>90</creationDuration>
        <timing in="0" out="89" offset="0"/>
        <parameter name="Frame Rate" id="107" flags="64" value="30"/>
      </clip>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.filter((v) => v.code === "E_OZML_CREATIONDURATION_MISMATCH")).toHaveLength(0);
  });
});

describe("Invariant 22 — timing.out = creationDuration - 1", () => {
  it("flags timing out that does not equal creationDuration - 1", async () => {
    const xml = `<ozml version="4.0">
      <factories/>
      <clip name="bg" id="1056">
        <missingDuration>3.0</missingDuration>
        <creationDuration>90</creationDuration>
        <timing in="0" out="100" offset="0"/>
        <parameter name="Frame Rate" id="107" flags="64" value="30"/>
      </clip>
    </ozml>`;
    const r = await validate(xml);
    expect(r.violations.some((v) => v.code === "E_OZML_TIMING_OUT_OF_BOUNDS")).toBe(true);
  });
});

describe("clean validation — no false positives", () => {
  it("passes the valid OZML fixture with zero violations", async () => {
    const result = await validate(VALID_OZML);
    expect(result.violations).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});
