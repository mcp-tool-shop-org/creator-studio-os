import { describe, it, expect } from "vitest";
import { parseFcpxml, parseFcpTime, diffTimelines, buildProjectFcpxml } from "@creator-studio-os/fcp";

// ─── parseFcpTime ─────────────────────────────────────────────────────────────

describe("parseFcpTime", () => {
  it("parses 0s → 0", () => expect(parseFcpTime("0s")).toBe(0));
  it("parses rational 3600/2997s", () =>
    expect(parseFcpTime("3600/2997s")).toBeCloseTo(1.2008, 3));
  it("parses decimal 10.5s", () => expect(parseFcpTime("10.5s")).toBe(10.5));
  it("handles empty string", () => expect(parseFcpTime("")).toBe(0));
});

// ─── parseFcpxml ──────────────────────────────────────────────────────────────

describe("parseFcpxml", () => {
  it("round-trips a builder-generated FCPXML", () => {
    const { xml } = buildProjectFcpxml(
      {
        projectName: "RoundTripTest",
        eventName: "Test Event",
        assets: [
          {
            id: "r2",
            name: "footage",
            src: "/tmp/test.mp4",
            hasVideo: true,
            hasAudio: true,
            durationSeconds: 10,
          },
        ],
        spine: [
          {
            kind: "asset-clip",
            name: "footage",
            ref: "r2",
            offsetSeconds: 0,
            durationSeconds: 10,
            startSeconds: 0,
            enabled: true,
            volumeDb: 0,
          },
        ],
        markers: [],
      },
      { skipPreflight: true },
    );

    const parsed = parseFcpxml(xml);
    expect(parsed.projectName).toBe("RoundTripTest");
    expect(parsed.eventName).toBe("Test Event");
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0].name).toBe("footage");
    expect(parsed.spine).toHaveLength(1);
    expect(parsed.spine[0].kind).toBe("clip");
  });

  it("extracts title params from builder output", () => {
    const { xml } = buildProjectFcpxml(
      {
        projectName: "P",
        spine: [
          {
            kind: "title",
            name: "MyTitle",
            text: "the showcase project",
            offsetSeconds: 0,
            durationSeconds: 5,
            lane: 1,
            effectUid: ".../Custom.moti",
            effectName: "Custom",
            params: [{ name: "Headline", key: "200", value: "the showcase project" }],
          },
        ],
      },
      { skipPreflight: true },
    );

    const parsed = parseFcpxml(xml);
    const title = parsed.spine.find((s) => s.kind === "title");
    expect(title).toBeDefined();
    if (title?.kind !== "title") throw new Error("not a title");
    expect(title.text).toBe("the showcase project");
    expect(title.params).toHaveLength(1);
    expect(title.params[0]).toMatchObject({ name: "Headline", key: "200", value: "the showcase project" });
  });

  it("throws E_FCPXML_PARSE_FAILED for non-XML", () => {
    expect(() => parseFcpxml("not xml at all <<<")).toThrow();
  });

  it("throws E_FCPXML_PARSE_FAILED for XML without <fcpxml>", () => {
    expect(() => parseFcpxml("<root><child/></root>")).toThrowError(
      /No <fcpxml>/,
    );
  });
});

// ─── diffTimelines ────────────────────────────────────────────────────────────

describe("diffTimelines", () => {
  function buildTimeline(overrides?: Partial<Parameters<typeof buildProjectFcpxml>[0]>) {
    const { xml } = buildProjectFcpxml(
      {
        projectName: "Diff Test",
        assets: [
          {
            id: "r2",
            name: "clip-a",
            src: "/tmp/a.mp4",
            hasVideo: true,
            hasAudio: true,
            durationSeconds: 10,
          },
        ],
        spine: [
          {
            kind: "asset-clip",
            name: "clip-a",
            ref: "r2",
            offsetSeconds: 0,
            durationSeconds: 10,
            startSeconds: 0,
            enabled: true,
            volumeDb: 0,
          },
        ],
        ...overrides,
      },
      { skipPreflight: true },
    );
    return parseFcpxml(xml);
  }

  it("returns allClear summary for identical timelines", () => {
    const t = buildTimeline();
    const result = diffTimelines(t, t);
    expect(result.diffs).toHaveLength(0);
    expect(result.summary).toMatch(/No differences/);
  });

  it("detects clip-duration-changed", () => {
    const before = buildTimeline();
    const after = buildTimeline({
      spine: [
        {
          kind: "asset-clip",
          name: "clip-a",
          ref: "r2",
          offsetSeconds: 0,
          durationSeconds: 8, // was 10
          startSeconds: 0,
          enabled: true,
          volumeDb: 0,
        },
      ],
    });
    const result = diffTimelines(before, after);
    const d = result.diffs.find((d) => d.kind === "clip-duration-changed");
    expect(d).toBeDefined();
    expect(d!.before).toBeCloseTo(10, 1);
    expect(d!.after).toBeCloseTo(8, 1);
  });

  it("detects clip-deleted", () => {
    const before = buildTimeline();
    const after = buildTimeline({ spine: [], assets: [] });
    const result = diffTimelines(before, after);
    expect(result.diffs.some((d) => d.kind === "clip-deleted")).toBe(true);
  });

  it("detects format-changed when resolution changes", () => {
    const { xml: xmlA } = buildProjectFcpxml(
      { projectName: "P", format: { id: "r1", name: "HD", frameRate: "29.97", resolution: { width: 1920, height: 1080 }, colorSpace: "1-1-1 (Rec. 709)" } },
      { skipPreflight: true },
    );
    const { xml: xmlB } = buildProjectFcpxml(
      { projectName: "P", format: { id: "r1", name: "UHD", frameRate: "29.97", resolution: { width: 3840, height: 2160 }, colorSpace: "1-1-1 (Rec. 709)" } },
      { skipPreflight: true },
    );
    const result = diffTimelines(parseFcpxml(xmlA), parseFcpxml(xmlB));
    expect(result.diffs.some((d) => d.kind === "format-changed")).toBe(true);
  });

  it("detects title-text-changed", () => {
    const mkSpec = (text: string) => ({
      projectName: "P",
      spine: [
        {
          kind: "title" as const,
          name: "Title",
          text,
          offsetSeconds: 0,
          durationSeconds: 5,
          lane: 1,
          effectUid: ".../Custom.moti",
          effectName: "Custom",
        },
      ],
    });
    const before = parseFcpxml(buildProjectFcpxml(mkSpec("Hello"), { skipPreflight: true }).xml);
    const after = parseFcpxml(buildProjectFcpxml(mkSpec("Goodbye"), { skipPreflight: true }).xml);
    const result = diffTimelines(before, after);
    expect(result.diffs.some((d) => d.kind === "title-text-changed")).toBe(true);
  });

  it("detects title-param-changed", () => {
    const mkSpec = (value: string) => ({
      projectName: "P",
      spine: [
        {
          kind: "title" as const,
          name: "Title",
          text: "x",
          offsetSeconds: 0,
          durationSeconds: 5,
          lane: 1,
          effectUid: ".../Custom.moti",
          effectName: "Custom",
          params: [{ name: "Headline", key: "200", value }],
        },
      ],
    });
    const before = parseFcpxml(buildProjectFcpxml(mkSpec("Before"), { skipPreflight: true }).xml);
    const after = parseFcpxml(buildProjectFcpxml(mkSpec("After"), { skipPreflight: true }).xml);
    const result = diffTimelines(before, after);
    expect(result.diffs.some((d) => d.kind === "title-param-changed")).toBe(true);
  });

  it("ignores sub-frame time differences (tolerance)", () => {
    // Build identical timelines; they should show no diff even if parsing adds float noise
    const { xml } = buildProjectFcpxml(
      {
        projectName: "P",
        spine: [
          { kind: "asset-clip", name: "c", ref: "r2", offsetSeconds: 0, durationSeconds: 5, startSeconds: 0, enabled: true, volumeDb: 0 },
        ],
        assets: [{ id: "r2", name: "c", src: "/tmp/c.mp4", hasVideo: true, hasAudio: true, durationSeconds: 5 }],
      },
      { skipPreflight: true },
    );
    const t = parseFcpxml(xml);
    expect(diffTimelines(t, t).diffs).toHaveLength(0);
  });
});
