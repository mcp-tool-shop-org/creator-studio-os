/**
 * FCP timeline shape tests — v1.6.4 additions:
 *  - Caption authoring (<caption> with role validation)
 *  - Anchored asset-clip (lane != 0, B-roll overlay)
 *  - Compound clip (ref-clip + <media><sequence> resource)
 *  - Multicam clip (mc-clip + <media><multicam> resource)
 *  - Safety pre-flights for the new types
 */
import { describe, it, expect } from "vitest";
import { buildProjectFcpxml, validateCompoundSafety, lintCaptions, checkAnchorSafety } from "@creator-studio-os/fcp";

// ---------------------------------------------------------------------------
// Shared base spec
// ---------------------------------------------------------------------------

const BASE_SPEC = {
  projectName: "test",
  assets: [
    { id: "r1", name: "A", src: "/a.mp4", durationSeconds: 10, hasVideo: true, hasAudio: true },
    { id: "r2", name: "B", src: "/b.mp4", durationSeconds: 5, hasVideo: true, hasAudio: false },
  ],
};

// ---------------------------------------------------------------------------
// Caption authoring
// ---------------------------------------------------------------------------

describe("FCP captions", () => {
  it("emits <caption> element with role and text", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        {
          kind: "asset-clip", ref: "r1", name: "Primary",
          offsetSeconds: 0, durationSeconds: 10,
        },
        {
          kind: "caption", name: "Hello Caption", text: "Hello World",
          role: "iTT.iTT-en", offsetSeconds: 1, durationSeconds: 3, lane: 1,
        },
      ],
    }, { skipPreflight: true });

    expect(xml).toContain('<caption name="Hello Caption"');
    expect(xml).toContain('role="iTT.iTT-en"');
    expect(xml).toContain("<text>Hello World</text>");
  });

  it("escapes special characters in caption text", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        { kind: "caption", name: "Cap", text: "<b>&amp;", role: "iTT.iTT-en",
          offsetSeconds: 0, durationSeconds: 1, lane: 1 },
      ],
    }, { skipPreflight: true });
    expect(xml).toContain("&lt;b&gt;&amp;amp;");
  });

  it("includes duration and offset attributes", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        { kind: "caption", name: "Cap", text: "Hi", role: "CEA-608.CC1",
          offsetSeconds: 2, durationSeconds: 4, lane: 1 },
      ],
    }, { skipPreflight: true });
    // duration of 4s at 29.97fps = 120120/30000s approximately
    expect(xml).toContain('<caption name="Cap"');
    expect(xml).toContain('role="CEA-608.CC1"');
  });
});

// ---------------------------------------------------------------------------
// Caption lint (safety preflight)
// ---------------------------------------------------------------------------

describe("lintCaptions — CaptionSpec", () => {
  it("passes for valid iTT role", () => {
    const result = lintCaptions({
      projectName: "t", assets: [],
      spine: [
        { kind: "caption", name: "c", text: "hi", role: "iTT.iTT-en",
          offsetSeconds: 0, durationSeconds: 1, lane: 1 },
      ],
      markers: [], compoundMedia: [], multicamMedia: [],
    } as Parameters<typeof lintCaptions>[0]);
    expect(result.ok).toBe(true);
  });

  it("passes for valid CEA-608 role", () => {
    const result = lintCaptions({
      projectName: "t", assets: [],
      spine: [
        { kind: "caption", name: "c", text: "hi", role: "CEA-608.CC1",
          offsetSeconds: 0, durationSeconds: 1, lane: 1 },
      ],
      markers: [], compoundMedia: [], multicamMedia: [],
    } as Parameters<typeof lintCaptions>[0]);
    expect(result.ok).toBe(true);
  });

  it("rejects caption with bare role (no subrole)", () => {
    const result = lintCaptions({
      projectName: "t", assets: [],
      spine: [
        { kind: "caption", name: "c", text: "hi", role: "iTT",
          offsetSeconds: 0, durationSeconds: 1, lane: 1 },
      ],
      markers: [], compoundMedia: [], multicamMedia: [],
    } as Parameters<typeof lintCaptions>[0]);
    expect(result.ok).toBe(false);
    expect(result.issues[0].reason).toMatch(/missing a subrole/);
  });

  it("rejects caption with unrecognised role prefix", () => {
    const result = lintCaptions({
      projectName: "t", assets: [],
      spine: [
        { kind: "caption", name: "c", text: "hi", role: "VTT.VTT-en",
          offsetSeconds: 0, durationSeconds: 1, lane: 1 },
      ],
      markers: [], compoundMedia: [], multicamMedia: [],
    } as Parameters<typeof lintCaptions>[0]);
    expect(result.ok).toBe(false);
    expect(result.issues[0].reason).toMatch(/unrecognised prefix/);
  });
});

// ---------------------------------------------------------------------------
// Anchored asset-clip (B-roll overlay)
// ---------------------------------------------------------------------------

describe("FCP anchored asset-clip", () => {
  it("emits <asset-clip> as child of primary clip when lane != 0", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        { kind: "asset-clip", ref: "r1", name: "Primary",
          offsetSeconds: 0, durationSeconds: 10, lane: 0 },
        { kind: "asset-clip", ref: "r2", name: "B-Roll",
          offsetSeconds: 2, durationSeconds: 4, lane: 1 },
      ],
    });
    // Primary clip should be on the spine
    expect(xml).toContain('<asset-clip ref="r1" name="Primary"');
    // B-Roll should be nested inside Primary (as a child, not a spine-level item)
    // The B-Roll should appear with lane attribute
    expect(xml).toContain('<asset-clip ref="r2" name="B-Roll"');
    expect(xml).toContain('lane="1"');
  });

  it("anchored clip is NOT duplicated at top-level spine", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        { kind: "asset-clip", ref: "r1", name: "Primary",
          offsetSeconds: 0, durationSeconds: 10, lane: 0 },
        { kind: "asset-clip", ref: "r2", name: "B-Roll",
          offsetSeconds: 2, durationSeconds: 4, lane: 1 },
      ],
    });
    // B-Roll should appear exactly once in the spine block
    const brollCount = (xml.match(/name="B-Roll"/g) ?? []).length;
    expect(brollCount).toBe(1);
  });

  it("primary clip with lane=0 stays on spine", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      spine: [
        { kind: "asset-clip", ref: "r1", name: "Primary",
          offsetSeconds: 0, durationSeconds: 10, lane: 0 },
      ],
    });
    expect(xml).toContain('<asset-clip ref="r1" name="Primary"');
    // No lane attribute on primary
    expect(xml).not.toContain('lane="0"');
  });
});

// ---------------------------------------------------------------------------
// Anchor safety — anchored clips
// ---------------------------------------------------------------------------

describe("checkAnchorSafety — anchored asset-clips", () => {
  it("detects anchored clips on same lane with overlap", () => {
    const result = checkAnchorSafety({
      projectName: "t", assets: [],
      spine: [
        { kind: "asset-clip", ref: "r1", name: "Primary",
          offsetSeconds: 0, durationSeconds: 10, lane: 0 },
        { kind: "asset-clip", ref: "r2", name: "B-Roll-A",
          offsetSeconds: 1, durationSeconds: 5, lane: 1 },
        { kind: "asset-clip", ref: "r2", name: "B-Roll-B",
          offsetSeconds: 4, durationSeconds: 4, lane: 1 }, // overlaps B-Roll-A
      ],
      markers: [], compoundMedia: [], multicamMedia: [],
    } as Parameters<typeof checkAnchorSafety>[0]);
    expect(result.safe).toBe(false);
    expect(result.collisions).toHaveLength(1);
    expect(result.collisions[0].overlapSeconds).toBeGreaterThan(0);
  });

  it("passes when anchored clips on same lane don't overlap", () => {
    const result = checkAnchorSafety({
      projectName: "t", assets: [],
      spine: [
        { kind: "asset-clip", ref: "r1", name: "Primary",
          offsetSeconds: 0, durationSeconds: 10, lane: 0 },
        { kind: "asset-clip", ref: "r2", name: "B-Roll-A",
          offsetSeconds: 1, durationSeconds: 2, lane: 1 },
        { kind: "asset-clip", ref: "r2", name: "B-Roll-B",
          offsetSeconds: 5, durationSeconds: 2, lane: 1 }, // no overlap
      ],
      markers: [], compoundMedia: [], multicamMedia: [],
    } as Parameters<typeof checkAnchorSafety>[0]);
    expect(result.safe).toBe(true);
  });

  it("detects cross-type collision: anchored clip vs title on same lane", () => {
    const result = checkAnchorSafety({
      projectName: "t", assets: [],
      spine: [
        { kind: "asset-clip", ref: "r1", name: "Primary",
          offsetSeconds: 0, durationSeconds: 10, lane: 0 },
        { kind: "asset-clip", ref: "r2", name: "B-Roll",
          offsetSeconds: 1, durationSeconds: 5, lane: 1 },
        { kind: "title", name: "Lower Third", text: "hi",
          offsetSeconds: 3, durationSeconds: 3, lane: 1 }, // overlaps B-Roll on lane 1
      ],
      markers: [], compoundMedia: [], multicamMedia: [],
    } as Parameters<typeof checkAnchorSafety>[0]);
    expect(result.safe).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Compound clip (ref-clip)
// ---------------------------------------------------------------------------

describe("FCP compound clip (ref-clip)", () => {
  it("emits <media><sequence> resource and <ref-clip> spine item", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      compoundMedia: [
        {
          id: "cm1",
          name: "My Compound",
          clips: [
            { kind: "asset-clip", ref: "r1", name: "Inner A",
              offsetSeconds: 0, durationSeconds: 5 },
          ],
        },
      ],
      spine: [
        { kind: "ref-clip", name: "My Compound", mediaId: "cm1",
          offsetSeconds: 0, durationSeconds: 5 },
      ],
    });
    // Resource declaration
    expect(xml).toContain('<media id="cm1" name="My Compound">');
    expect(xml).toContain("<sequence ");
    // Spine reference
    expect(xml).toContain('<ref-clip ref="cm1"');
    expect(xml).toContain('name="My Compound"');
  });

  it("compound media resource contains inner clips", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      compoundMedia: [
        {
          id: "cm1",
          name: "Compound",
          clips: [
            { kind: "asset-clip", ref: "r1", name: "Shot A",
              offsetSeconds: 0, durationSeconds: 3 },
            { kind: "asset-clip", ref: "r2", name: "Shot B",
              offsetSeconds: 3, durationSeconds: 2 },
          ],
        },
      ],
      spine: [
        { kind: "ref-clip", name: "Compound", mediaId: "cm1",
          offsetSeconds: 0, durationSeconds: 5 },
      ],
    });
    expect(xml).toContain('name="Shot A"');
    expect(xml).toContain('name="Shot B"');
  });

  it("ref-clip with lane emits lane attribute", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      compoundMedia: [
        { id: "cm1", name: "C", clips: [] },
      ],
      spine: [
        { kind: "ref-clip", name: "C", mediaId: "cm1",
          offsetSeconds: 0, durationSeconds: 5, lane: 2 },
      ],
    });
    expect(xml).toContain('lane="2"');
  });
});

// ---------------------------------------------------------------------------
// Compound safety — propagation trap
// ---------------------------------------------------------------------------

describe("validateCompoundSafety — ref-clip propagation trap", () => {
  it("flags two ref-clips sharing the same mediaId", () => {
    const result = validateCompoundSafety({
      projectName: "t", assets: [],
      compoundMedia: [{ id: "cm1", name: "C", clips: [] }],
      multicamMedia: [],
      spine: [
        { kind: "ref-clip", name: "Clip A", mediaId: "cm1",
          offsetSeconds: 0, durationSeconds: 5 },
        { kind: "ref-clip", name: "Clip B", mediaId: "cm1",
          offsetSeconds: 6, durationSeconds: 5 },
      ],
      markers: [],
    } as Parameters<typeof validateCompoundSafety>[0]);
    expect(result.safe).toBe(false);
    expect(result.propagationWarning).toMatch(/propagate/);
  });

  it("passes when ref-clips have distinct mediaIds", () => {
    const result = validateCompoundSafety({
      projectName: "t", assets: [],
      compoundMedia: [
        { id: "cm1", name: "C1", clips: [] },
        { id: "cm2", name: "C2", clips: [] },
      ],
      multicamMedia: [],
      spine: [
        { kind: "ref-clip", name: "A", mediaId: "cm1",
          offsetSeconds: 0, durationSeconds: 5 },
        { kind: "ref-clip", name: "B", mediaId: "cm2",
          offsetSeconds: 6, durationSeconds: 5 },
      ],
      markers: [],
    } as Parameters<typeof validateCompoundSafety>[0]);
    expect(result.safe).toBe(true);
    expect(result.propagationWarning).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Multicam clip (mc-clip)
// ---------------------------------------------------------------------------

describe("FCP multicam clip (mc-clip)", () => {
  it("emits <media><multicam> resource and <mc-clip> spine item", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      multicamMedia: [
        {
          id: "mc1",
          name: "MC Clip 1",
          angles: [
            { name: "Angle A", angleId: "A1",
              clips: [{ kind: "asset-clip", ref: "r1", name: "Cam A",
                offsetSeconds: 0, durationSeconds: 10 }] },
            { name: "Angle B", angleId: "A2",
              clips: [{ kind: "asset-clip", ref: "r2", name: "Cam B",
                offsetSeconds: 0, durationSeconds: 5 }] },
          ],
        },
      ],
      spine: [
        { kind: "mc-clip", name: "MC Clip 1", mediaId: "mc1",
          offsetSeconds: 0, durationSeconds: 5,
          sources: [
            { angleId: "A1", srcEnable: "video" },
            { angleId: "A2", srcEnable: "audio" },
          ],
        },
      ],
    });
    // Resource
    expect(xml).toContain('<media id="mc1" name="MC Clip 1">');
    expect(xml).toContain("<multicam ");
    expect(xml).toContain('<mc-angle name="Angle A" angleID="A1">');
    expect(xml).toContain('<mc-angle name="Angle B" angleID="A2">');
    // Spine item
    expect(xml).toContain('<mc-clip ref="mc1"');
    expect(xml).toContain('<mc-source angleID="A1" srcEnable="video"/>');
    expect(xml).toContain('<mc-source angleID="A2" srcEnable="audio"/>');
  });

  it("mc-clip with no sources uses srcEnable=all", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      multicamMedia: [
        {
          id: "mc1", name: "MC",
          angles: [
            { name: "A", angleId: "A1",
              clips: [{ kind: "asset-clip", ref: "r1", name: "A",
                offsetSeconds: 0, durationSeconds: 5 }] },
          ],
        },
      ],
      spine: [
        { kind: "mc-clip", name: "MC", mediaId: "mc1",
          offsetSeconds: 0, durationSeconds: 5 },
      ],
    });
    expect(xml).toContain('srcEnable="all"');
  });

  it("angle clips appear inside their mc-angle", () => {
    const { xml } = buildProjectFcpxml({
      ...BASE_SPEC,
      multicamMedia: [
        {
          id: "mc1", name: "MC",
          angles: [
            { name: "Main", angleId: "A1",
              clips: [{ kind: "asset-clip", ref: "r1", name: "Main Cam",
                offsetSeconds: 0, durationSeconds: 10 }] },
          ],
        },
      ],
      spine: [
        { kind: "mc-clip", name: "MC", mediaId: "mc1",
          offsetSeconds: 0, durationSeconds: 5 },
      ],
    });
    expect(xml).toContain('<mc-angle name="Main" angleID="A1">');
    expect(xml).toContain('name="Main Cam"');
  });
});

// ---------------------------------------------------------------------------
// Backward-compat: existing builder tests still pass
// ---------------------------------------------------------------------------

describe("FCP builder — backward compat with new types", () => {
  it("spec with no new fields builds cleanly", () => {
    const { xml } = buildProjectFcpxml({
      projectName: "Basic",
      assets: [
        { id: "r1", name: "Clip", src: "/clip.mp4",
          durationSeconds: 5, hasVideo: true, hasAudio: true },
      ],
      spine: [
        { kind: "asset-clip", ref: "r1", name: "Clip",
          offsetSeconds: 0, durationSeconds: 5 },
      ],
    });
    expect(xml).toContain("<spine>");
    expect(xml).toContain('<asset-clip ref="r1"');
  });

  it("empty compoundMedia and multicamMedia default to empty arrays", () => {
    const { xml } = buildProjectFcpxml({
      projectName: "Minimal",
      spine: [],
    });
    // No <media> elements in resources
    expect(xml).not.toContain("<media ");
  });
});
