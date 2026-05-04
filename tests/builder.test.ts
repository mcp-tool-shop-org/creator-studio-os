import { describe, it, expect } from "vitest";
import { buildProjectFcpxml } from "../src/fcpxml/builder.js";
import { CreatorStudioError } from "../src/errors.js";

describe("buildProjectFcpxml", () => {
  it("builds a minimal valid-shape document with no clips", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "E",
      projectName: "P",
    });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<!DOCTYPE fcpxml>");
    expect(xml).toContain('<fcpxml version="1.14">');
    expect(xml).toContain('<event name="E">');
    expect(xml).toContain('<project name="P">');
    expect(xml).toContain("<spine>");
  });

  it("includes assets and asset-clips referencing them", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "Demo",
      projectName: "Cut01",
      assets: [
        {
          id: "a1",
          name: "Clip A",
          src: "/tmp/clip-a.mov",
          durationSeconds: 5,
          hasVideo: true,
          hasAudio: true,
        },
      ],
      spine: [
        {
          kind: "asset-clip",
          ref: "a1",
          name: "Clip A",
          offsetSeconds: 0,
          durationSeconds: 5,
        },
      ],
    });

    expect(xml).toContain('id="a1"');
    expect(xml).toContain('ref="a1"');
    expect(xml).toContain("file:///tmp/clip-a.mov");
  });

  it("escapes XML-unsafe characters in names", () => {
    const { xml } = buildProjectFcpxml({
      eventName: 'Demo & "X"',
      projectName: "<P>",
    });
    expect(xml).toContain("Demo &amp; &quot;X&quot;");
    expect(xml).toContain("&lt;P&gt;");
  });

  it("rejects spec with invalid frame rate", () => {
    expect(() =>
      buildProjectFcpxml({
        eventName: "E",
        projectName: "P",
        format: {
          id: "r1",
          name: "Bad",
          frameRate: "120" as unknown as "60",
          resolution: { width: 1920, height: 1080 },
          colorSpace: "x",
        },
      }),
    ).toThrow(CreatorStudioError);
  });

  it("rejects title spine items in v1.0.0", () => {
    expect(() =>
      buildProjectFcpxml({
        eventName: "E",
        projectName: "P",
        spine: [
          {
            kind: "title",
            text: "Hi",
            offsetSeconds: 0,
            durationSeconds: 3,
          },
        ],
      }),
    ).toThrow(/Title spine items/);
  });

  it("attaches markers inside the asset-clip whose range contains them", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "E",
      projectName: "P",
      assets: [
        {
          id: "a1",
          name: "A",
          src: "/tmp/a.mov",
          durationSeconds: 10,
        },
      ],
      spine: [
        {
          kind: "asset-clip",
          ref: "a1",
          name: "A",
          offsetSeconds: 0,
          durationSeconds: 10,
        },
      ],
      markers: [
        {
          startSeconds: 3,
          durationSeconds: 1,
          value: "Hit",
          isChapter: true,
        },
      ],
    });
    expect(xml).toContain("<chapter-marker");
    expect(xml).toContain('value="Hit"');
  });
});
