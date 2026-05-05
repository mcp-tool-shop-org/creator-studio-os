import { describe, it, expect } from "vitest";
import {
  validateCompoundSafety,
  lintCaptions,
  checkAnchorSafety,
  runSafetyPreflights,
} from "../src/apps/fcp/safety.js";
import { CreatorStudioError } from "../src/errors.js";
import type { ProjectSpec } from "../src/fcpxml/types.js";

// ─── Minimal spec builder ─────────────────────────────────────────────────────

function baseSpec(overrides: Partial<ProjectSpec> = {}): ProjectSpec {
  return {
    fcpxmlVersion: "1.14",
    format: {
      id: "r1",
      name: "FFVideoFormat1080p2997",
      frameRate: "29.97",
      resolution: { width: 1920, height: 1080 },
      colorSpace: "1-1-1 (Rec. 709)",
    },
    libraryLocation: undefined,
    eventName: "Test",
    projectName: "Test Project",
    assets: [],
    spine: [],
    markers: [],
    ...overrides,
  };
}

// ─── validateCompoundSafety ───────────────────────────────────────────────────

describe("validateCompoundSafety", () => {
  it("passes for non-overlapping clips", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "A", ref: "r1", offsetSeconds: 0, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0 },
        { kind: "asset-clip", name: "B", ref: "r1", offsetSeconds: 5, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0 },
      ],
    });
    const result = validateCompoundSafety(spec);
    expect(result.safe).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("detects overlapping clips", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "A", ref: "r1", offsetSeconds: 0, durationSeconds: 6, startSeconds: 0, enabled: true, volumeDb: 0 },
        { kind: "asset-clip", name: "B", ref: "r1", offsetSeconds: 4, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0 },
      ],
    });
    const result = validateCompoundSafety(spec);
    expect(result.safe).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].clipA).toBe("A");
    expect(result.violations[0].clipB).toBe("B");
    expect(result.violations[0].overlapSeconds).toBeCloseTo(2);
  });

  it("passes when a title is in the spine (titles are not compound-checked)", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "A", ref: "r1", offsetSeconds: 0, durationSeconds: 10, startSeconds: 0, enabled: true, volumeDb: 0 },
        { kind: "title", name: "T", text: "Hello", offsetSeconds: 2, durationSeconds: 3, lane: 1, effectUid: "uid", effectName: "Custom", textStyle: { font: "Helvetica", fontSize: 96, fontColor: "1 1 1 1", alignment: "center", bold: false, italic: false } },
      ],
    });
    const result = validateCompoundSafety(spec);
    expect(result.safe).toBe(true);
  });
});

// ─── lintCaptions ─────────────────────────────────────────────────────────────

describe("lintCaptions", () => {
  it("passes clips with well-formed roles", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "VO", ref: "r1", offsetSeconds: 0, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0, audioRole: "Dialogue.dialogue" },
      ],
    });
    expect(lintCaptions(spec).ok).toBe(true);
  });

  it("flags audioRole missing subrole separator", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "VO", ref: "r1", offsetSeconds: 0, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0, audioRole: "Dialogue" },
      ],
    });
    const result = lintCaptions(spec);
    expect(result.ok).toBe(false);
    expect(result.issues[0].clipName).toBe("VO");
    expect(result.issues[0].reason).toMatch(/missing a subrole/);
  });

  it("flags caption-style role without iTT or SRT format", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "Cap", ref: "r1", offsetSeconds: 0, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0, audioRole: "Caption.eng" },
      ],
    });
    const result = lintCaptions(spec);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.reason.includes("iTT"))).toBe(true);
  });

  it("accepts correct iTT caption role", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "Cap", ref: "r1", offsetSeconds: 0, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0, audioRole: "iTT Role.iTT Subrole" },
      ],
    });
    expect(lintCaptions(spec).ok).toBe(true);
  });

  it("passes spec with no roles set", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "A", ref: "r1", offsetSeconds: 0, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0 },
      ],
    });
    expect(lintCaptions(spec).ok).toBe(true);
  });
});

// ─── checkAnchorSafety ────────────────────────────────────────────────────────

describe("checkAnchorSafety", () => {
  const title = (name: string, offset: number, dur: number, lane = 1) => ({
    kind: "title" as const,
    name,
    text: name,
    offsetSeconds: offset,
    durationSeconds: dur,
    lane,
    effectUid: "uid",
    effectName: "Custom",
    textStyle: { font: "Helvetica", fontSize: 96, fontColor: "1 1 1 1", alignment: "center" as const, bold: false, italic: false },
  });

  it("passes titles on same lane that don't overlap", () => {
    const spec = baseSpec({ spine: [title("A", 0, 3), title("B", 3, 3)] });
    expect(checkAnchorSafety(spec).safe).toBe(true);
  });

  it("detects collision between overlapping titles on same lane", () => {
    const spec = baseSpec({ spine: [title("A", 0, 5), title("B", 3, 5)] });
    const result = checkAnchorSafety(spec);
    expect(result.safe).toBe(false);
    expect(result.collisions[0].titleA).toBe("A");
    expect(result.collisions[0].titleB).toBe("B");
    expect(result.collisions[0].overlapSeconds).toBeCloseTo(2);
  });

  it("passes titles on different lanes even if they overlap in time", () => {
    const spec = baseSpec({ spine: [title("A", 0, 5, 1), title("B", 0, 5, 2)] });
    expect(checkAnchorSafety(spec).safe).toBe(true);
  });
});

// ─── runSafetyPreflights ──────────────────────────────────────────────────────

describe("runSafetyPreflights", () => {
  it("returns allClear=true for a clean spec", () => {
    const result = runSafetyPreflights(baseSpec());
    expect(result.allClear).toBe(true);
    expect(result.compound.safe).toBe(true);
    expect(result.captions.ok).toBe(true);
    expect(result.anchors.safe).toBe(true);
  });

  it("throws E_COMPOUND_UNSAFE by default", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "A", ref: "r1", offsetSeconds: 0, durationSeconds: 6, startSeconds: 0, enabled: true, volumeDb: 0 },
        { kind: "asset-clip", name: "B", ref: "r1", offsetSeconds: 4, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0 },
      ],
    });
    expect(() => runSafetyPreflights(spec)).toThrow(
      expect.objectContaining({ code: "E_COMPOUND_UNSAFE" } satisfies Partial<CreatorStudioError>),
    );
  });

  it("does NOT throw when allowUnsafe=true", () => {
    const spec = baseSpec({
      spine: [
        { kind: "asset-clip", name: "A", ref: "r1", offsetSeconds: 0, durationSeconds: 6, startSeconds: 0, enabled: true, volumeDb: 0 },
        { kind: "asset-clip", name: "B", ref: "r1", offsetSeconds: 4, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0 },
      ],
    });
    const result = runSafetyPreflights(spec, { allowUnsafe: true });
    expect(result.allClear).toBe(false);
    expect(result.compound.safe).toBe(false);
  });

  it("throws E_ANCHOR_COLLISION for overlapping titles", () => {
    const spec = baseSpec({
      spine: [
        { kind: "title", name: "A", text: "A", offsetSeconds: 0, durationSeconds: 5, lane: 1, effectUid: "uid", effectName: "Custom", textStyle: { font: "Helvetica", fontSize: 96, fontColor: "1 1 1 1", alignment: "center", bold: false, italic: false } },
        { kind: "title", name: "B", text: "B", offsetSeconds: 3, durationSeconds: 5, lane: 1, effectUid: "uid", effectName: "Custom", textStyle: { font: "Helvetica", fontSize: 96, fontColor: "1 1 1 1", alignment: "center", bold: false, italic: false } },
      ],
    });
    expect(() => runSafetyPreflights(spec)).toThrow(
      expect.objectContaining({ code: "E_ANCHOR_COLLISION" } satisfies Partial<CreatorStudioError>),
    );
  });
});
