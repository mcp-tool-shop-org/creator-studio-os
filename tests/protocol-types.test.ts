/**
 * Tests for ProjectV2 schema and protocol utilities.
 * Pure-function tests — no external app calls required.
 */
import { describe, it, expect } from "vitest";
import { ProjectV2Schema } from "../src/projects/types.js";

// ---------------------------------------------------------------------------
// ProjectV2Schema
// ---------------------------------------------------------------------------

describe("ProjectV2Schema", () => {
  const minimal = {
    schemaVersion: 2 as const,
    name: "Test Project",
    slug: "test-project",
    deliverables: {
      main: { format: "mov", resolution: "1920x1080", codec: "H.264", frameRate: "29.97" },
    },
    scenes: [{ id: "s1", title: "Scene 1", durationSeconds: 5 }],
  };

  it("parses minimal valid v2 project", () => {
    const result = ProjectV2Schema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(2);
      expect(result.data.slug).toBe("test-project");
      expect(result.data.scenes).toHaveLength(1);
    }
  });

  it("applies brand defaults", () => {
    const result = ProjectV2Schema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand.primaryColor).toBe("#1a1a2e");
      expect(result.data.brand.secondaryColor).toBe("#e0e0e0");
    }
  });

  it("applies deliverable defaults", () => {
    const result = ProjectV2Schema.safeParse({
      ...minimal,
      deliverables: { main: {} },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliverables["main"]!.format).toBe("mov");
      expect(result.data.deliverables["main"]!.frameRate).toBe("29.97");
    }
  });

  it("rejects schemaVersion: 1", () => {
    const result = ProjectV2Schema.safeParse({ ...minimal, schemaVersion: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug (uppercase)", () => {
    const result = ProjectV2Schema.safeParse({ ...minimal, slug: "TestProject" });
    expect(result.success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    const result = ProjectV2Schema.safeParse({ ...minimal, slug: "test project" });
    expect(result.success).toBe(false);
  });

  it("accepts slug with hyphens and digits", () => {
    const result = ProjectV2Schema.safeParse({ ...minimal, slug: "csos-2024-v2" });
    expect(result.success).toBe(true);
  });

  it("rejects empty scenes array", () => {
    const result = ProjectV2Schema.safeParse({ ...minimal, scenes: [] });
    expect(result.success).toBe(false);
  });

  it("rejects zero durationSeconds", () => {
    const result = ProjectV2Schema.safeParse({
      ...minimal,
      scenes: [{ id: "s1", title: "S1", durationSeconds: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple scenes with notes", () => {
    const result = ProjectV2Schema.safeParse({
      ...minimal,
      scenes: [
        { id: "s1", title: "Opening", durationSeconds: 5, notes: "Wide shot" },
        { id: "s2", title: "Middle", durationSeconds: 8 },
        { id: "s3", title: "End", durationSeconds: 3, notes: "Fade out" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scenes[0]!.notes).toBe("Wide shot");
      expect(result.data.scenes[1]!.notes).toBeUndefined();
    }
  });

  it("accepts optional motionTemplatePath and motionTitleText", () => {
    const result = ProjectV2Schema.safeParse({
      ...minimal,
      motionTemplatePath: "/path/to/template.motn",
      motionTitleText: "My Title",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.motionTemplatePath).toBe("/path/to/template.motn");
      expect(result.data.motionTitleText).toBe("My Title");
    }
  });

  it("accepts multiple deliverables", () => {
    const result = ProjectV2Schema.safeParse({
      ...minimal,
      deliverables: {
        main: { format: "mov", resolution: "1920x1080", codec: "ProRes 422", frameRate: "29.97" },
        social: { format: "mp4", resolution: "1080x1080", codec: "H.264", frameRate: "30" },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data.deliverables)).toHaveLength(2);
    }
  });

  it("accepts scoreMap with clips", () => {
    const result = ProjectV2Schema.safeParse({
      ...minimal,
      scoreMap: {
        scenes: [
          {
            id: "s1",
            clips: [{ id: "clip-01", file: "audio/theme.aif", startTime: 0, durationSeconds: 5 }],
          },
        ],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scoreMap?.scenes).toHaveLength(1);
      expect(result.data.scoreMap?.scenes[0]!.clips[0]!.file).toBe("audio/theme.aif");
    }
  });

  it("parses the demo project.json successfully", async () => {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const demoPath = join(here, "..", "demo", "csos-showcase", "project.json");
    const raw = await readFile(demoPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = ProjectV2Schema.safeParse(parsed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scenes).toHaveLength(6);
      expect(result.data.slug).toBe("csos-showcase");
      expect(result.data.scoreMap?.scenes).toHaveLength(6);
    }
  });
});
