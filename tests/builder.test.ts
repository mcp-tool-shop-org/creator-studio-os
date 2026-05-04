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

  it("emits a title with effect resource and text-style-def", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "E",
      projectName: "P",
      spine: [
        {
          kind: "title",
          name: "Opening",
          text: "Hello, world",
          offsetSeconds: 0,
          durationSeconds: 3,
        },
      ],
    });
    expect(xml).toContain("<effect ");
    expect(xml).toContain("Custom.moti");
    expect(xml).toContain("<title ");
    expect(xml).toContain("Hello, world");
    expect(xml).toContain("<text-style-def ");
    expect(xml).toContain("<text-style ");
  });

  it("emits a transition with name + duration", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "E",
      projectName: "P",
      spine: [
        {
          kind: "transition",
          name: "Cross Dissolve",
          offsetSeconds: 5,
          durationSeconds: 2,
        },
      ],
    });
    expect(xml).toMatch(/<transition\b[^>]*name="Cross Dissolve"/);
    expect(xml).toMatch(/duration="\d+\/30000s"/);
  });

  it("emits adjust-volume when volumeDb is non-zero", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "E",
      projectName: "P",
      assets: [
        { id: "a1", name: "A", src: "/tmp/a.mov", durationSeconds: 5 },
      ],
      spine: [
        {
          kind: "asset-clip",
          ref: "a1",
          name: "A",
          offsetSeconds: 0,
          durationSeconds: 5,
          volumeDb: -6,
        },
      ],
    });
    expect(xml).toContain('<adjust-volume amount="-6dB"/>');
  });

  it("omits adjust-volume when volumeDb is 0", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "E",
      projectName: "P",
      assets: [
        { id: "a1", name: "A", src: "/tmp/a.mov", durationSeconds: 5 },
      ],
      spine: [
        {
          kind: "asset-clip",
          ref: "a1",
          name: "A",
          offsetSeconds: 0,
          durationSeconds: 5,
        },
      ],
    });
    expect(xml).not.toContain("adjust-volume");
  });

  it("emits videoRole + audioRole on asset-clip when set", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "E",
      projectName: "P",
      assets: [
        { id: "a1", name: "A", src: "/tmp/a.mov", durationSeconds: 5 },
      ],
      spine: [
        {
          kind: "asset-clip",
          ref: "a1",
          name: "A",
          offsetSeconds: 0,
          durationSeconds: 5,
          videoRole: "B-roll.broll",
          audioRole: "Dialogue.dialogue",
        },
      ],
    });
    expect(xml).toContain('videoRole="B-roll.broll"');
    expect(xml).toContain('audioRole="Dialogue.dialogue"');
  });

  it("emits library location attribute when libraryLocation is set", () => {
    const { xml } = buildProjectFcpxml({
      eventName: "E",
      projectName: "P",
      libraryLocation: "/Users/test/Movies/Demo.fcpbundle",
    });
    expect(xml).toMatch(
      /<library location="file:\/\/\/Users\/test\/Movies\/Demo\.fcpbundle"/,
    );
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
