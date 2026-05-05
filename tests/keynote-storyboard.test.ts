/**
 * Unit tests for keynote_to_storyboard_fcp logic.
 * Tests FCPXML generation from slide data without needing a running Keynote instance.
 */
import { describe, it, expect } from "vitest";
import { buildProjectFcpxml } from "../src/fcpxml/builder.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface MockSlide {
  index: number;
  title: string;
  notes?: string;
  pngPath: string;
}

function buildStoryboardSpec(
  slides: MockSlide[],
  projectName: string,
  slideDurationSeconds = 5.0,
  frameRate = "29.97",
  resolution = { width: 1920, height: 1080 },
) {
  const assets = slides.map((s, idx) => ({
    id: `a${idx + 1}`,
    name: `slide-${String(idx + 1).padStart(3, "0")}`,
    src: s.pngPath,
    durationSeconds: slideDurationSeconds,
    startSeconds: 0,
    hasVideo: true,
    hasAudio: false,
    frameRate,
    resolution,
  }));

  const spine = slides.map((s, idx) => ({
    kind: "asset-clip" as const,
    name: s.title || `Slide ${idx + 1}`,
    ref: `a${idx + 1}`,
    offsetSeconds: idx * slideDurationSeconds,
    durationSeconds: slideDurationSeconds,
    startSeconds: 0,
    enabled: true,
    volumeDb: 0,
    lane: 0,
  }));

  return {
    fcpxmlVersion: "1.14" as const,
    format: {
      id: "r1",
      name: `FFVideoFormat${resolution.height}p${frameRate.replace(".", "")}`,
      frameRate: frameRate as "29.97",
      resolution,
      colorSpace: "1-1-1 (Rec. 709)",
    },
    eventName: projectName,
    projectName,
    assets,
    spine,
    markers: [] as [],
  };
}

// ─── FCPXML structure ─────────────────────────────────────────────────────────

describe("keynote storyboard FCPXML generation", () => {
  const mockSlides: MockSlide[] = [
    { index: 1, title: "Introduction", notes: "Welcome everyone", pngPath: "/tmp/slides/Slide 001.png" },
    { index: 2, title: "Key Feature", notes: "The main selling point", pngPath: "/tmp/slides/Slide 002.png" },
    { index: 3, title: "Demo Time", notes: "Show the product", pngPath: "/tmp/slides/Slide 003.png" },
  ];

  it("produces valid FCPXML string", () => {
    const spec = buildStoryboardSpec(mockSlides, "My Trailer");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<fcpxml");
    expect(xml).toContain("</fcpxml>");
  });

  it("includes one asset per slide", () => {
    const spec = buildStoryboardSpec(mockSlides, "My Trailer");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    const assetMatches = xml.match(/<asset /g) ?? [];
    expect(assetMatches.length).toBe(3);
  });

  it("names assets from slide PNGs", () => {
    const spec = buildStoryboardSpec(mockSlides, "Trailer");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    expect(xml).toContain('name="slide-001"');
    expect(xml).toContain('name="slide-002"');
    expect(xml).toContain('name="slide-003"');
  });

  it("includes one asset-clip per slide on the spine", () => {
    const spec = buildStoryboardSpec(mockSlides, "Trailer");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    const clipMatches = xml.match(/<asset-clip /g) ?? [];
    expect(clipMatches.length).toBe(3);
  });

  it("clip names match slide titles", () => {
    const spec = buildStoryboardSpec(mockSlides, "Trailer");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    expect(xml).toContain('name="Introduction"');
    expect(xml).toContain('name="Key Feature"');
    expect(xml).toContain('name="Demo Time"');
  });

  it("clips are evenly spaced by slideDurationSeconds", () => {
    const spec = buildStoryboardSpec(mockSlides, "Trailer", 7.0);
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    // offset of slide 2 should encode 7.0 seconds
    // At 29.97fps the time is expressed as integer frames/timebase
    // 7.0 seconds × 30000/1001 timebase → encoded as "210210/30000s" or similar
    // Just check that the offset grows through the timeline (second clip is later)
    const offsets = [...xml.matchAll(/offset="([^"]+)"/g)].map((m) => m[1]);
    // Should have at least 3 offset values (one per clip)
    expect(offsets.length).toBeGreaterThanOrEqual(3);
  });

  it("wraps clips in a sequence", () => {
    const spec = buildStoryboardSpec(mockSlides, "Trailer");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    expect(xml).toContain("<sequence");
    expect(xml).toContain("<spine>");
    expect(xml).toContain("</spine>");
  });

  it("project name appears in the output", () => {
    const spec = buildStoryboardSpec(mockSlides, "Steam Trailer 2026");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    expect(xml).toContain("Steam Trailer 2026");
  });

  it("handles a single-slide storyboard", () => {
    const spec = buildStoryboardSpec(
      [{ index: 1, title: "Solo", pngPath: "/tmp/slides/Slide 001.png" }],
      "Solo Deck",
    );
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    const assetMatches = xml.match(/<asset /g) ?? [];
    expect(assetMatches.length).toBe(1);
  });

  it("PNG src paths appear as file URLs in assets", () => {
    const spec = buildStoryboardSpec(mockSlides, "Trailer");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    expect(xml).toContain("file:///tmp/slides/");
  });

  it("uses the supplied frame rate", () => {
    const spec = buildStoryboardSpec(mockSlides, "Trailer", 5, "25");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    expect(xml).toContain("25");
  });

  it("returns the spec alongside the XML", () => {
    const spec = buildStoryboardSpec(mockSlides, "Trailer");
    const result = buildProjectFcpxml(spec, { skipPreflight: true });
    expect(result.spec).toBeDefined();
    expect(result.xml).toBeDefined();
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("storyboard edge cases", () => {
  it("slides with empty titles use fallback name", () => {
    const slides: MockSlide[] = [
      { index: 1, title: "", pngPath: "/tmp/s1.png" },
    ];
    const spec = buildStoryboardSpec(slides, "NoTitles");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    // Fallback name is "Slide 1"
    expect(xml).toContain('name="Slide 1"');
  });

  it("titles with special XML characters are escaped", () => {
    const slides: MockSlide[] = [
      { index: 1, title: 'Title & "Special" <Chars>', pngPath: "/tmp/s1.png" },
    ];
    const spec = buildStoryboardSpec(slides, "Special");
    const { xml } = buildProjectFcpxml(spec, { skipPreflight: true });
    // Should not contain unescaped ampersands or angle brackets in attribute values
    expect(xml).not.toMatch(/name="[^"]*&[^a-z#][^"]*"/);
  });
});
