/**
 * ProjectV2 schema — v2 project.json for cross-app protocol orchestration.
 *
 * v1 (ProjectMetaSchema in schema.ts) is the legacy flat format used by the
 * per-app tools. v2 adds structured scenes, deliverables, brand tokens, and
 * an optional Motif score-map — all the fields needed for the steam_trailer_minimal
 * protocol and future composition protocols.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export const SceneSchema = z.object({
  id: z.string().min(1).describe("Unique kebab-case identifier, e.g. 'hook' or 'scene-01'"),
  title: z.string().min(1).describe("Human-readable scene title used as clip name in FCPXML"),
  durationSeconds: z.number().positive().describe("Scene duration in seconds"),
  notes: z.string().optional().describe("Director notes; used as presenter notes / scene context"),
});

export type Scene = z.infer<typeof SceneSchema>;

// ---------------------------------------------------------------------------
// Deliverable
// ---------------------------------------------------------------------------

export const DeliverableSchema = z.object({
  format: z.enum(["mov", "mp4", "gif", "hevc"]).default("mov"),
  resolution: z.string().default("1920x1080").describe("WxH string e.g. '1920x1080' or '3840x2160'"),
  codec: z.string().default("H.264").describe("Codec name matching Compressor preset"),
  frameRate: z
    .enum(["23.98", "24", "25", "29.97", "30", "50", "59.94", "60"])
    .default("29.97"),
});

export type Deliverable = z.infer<typeof DeliverableSchema>;

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export const BrandSchema = z.object({
  logoPath: z.string().optional().describe("Absolute path to logo file (PNG/SVG)"),
  primaryColor: z.string().default("#1a1a2e").describe("Hex color string"),
  secondaryColor: z.string().default("#e0e0e0").describe("Hex color string"),
  fontFamily: z.string().optional().describe("Font family name, e.g. 'SF Pro Display'"),
});

export type Brand = z.infer<typeof BrandSchema>;

// ---------------------------------------------------------------------------
// Score-map — lightweight Motif-compatible format, no Motif package dep
// ---------------------------------------------------------------------------

export const ScoreClipSchema = z.object({
  id: z.string(),
  file: z.string().describe("Path relative to project.json dir"),
  startTime: z.number().nonnegative().describe("Start offset within scene in seconds"),
  durationSeconds: z.number().positive(),
});

export const ScoreSceneSchema = z.object({
  id: z.string().describe("Must match a scene.id in scenes[]"),
  clips: z.array(ScoreClipSchema),
});

export const ScoreMapSchema = z.object({
  scenes: z.array(ScoreSceneSchema),
});

export type ScoreMap = z.infer<typeof ScoreMapSchema>;

// ---------------------------------------------------------------------------
// ProjectV2
// ---------------------------------------------------------------------------

export const ProjectV2Schema = z.object({
  schemaVersion: z.literal(2),
  name: z.string().min(1).describe("Display name"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case")
    .describe("URL/file-system-safe identifier"),
  kind: z
    .enum(["trailer", "devlog", "social", "tutorial", "ad", "podcast", "other"])
    .default("other"),
  brand: BrandSchema.default({}),
  deliverables: z
    .record(z.string(), DeliverableSchema)
    .describe("Keyed by deliverable name, e.g. { main: {...}, social: {...} }"),
  scenes: z.array(SceneSchema).min(1).describe("Ordered list of scenes"),
  motionTemplatePath: z
    .string()
    .optional()
    .describe("Absolute path to a .motn template file"),
  motionTitleText: z
    .string()
    .optional()
    .describe("Text to set on the Motion template's title parameter"),
  scoreMap: ScoreMapSchema.optional().describe(
    "Motif-compatible audio cue map — no Motif package required",
  ),
});

export type ProjectV2 = z.infer<typeof ProjectV2Schema>;
