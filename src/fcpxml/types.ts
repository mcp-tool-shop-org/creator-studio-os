import { z } from "zod";

export const FrameRateSchema = z.enum([
  "23.98",
  "24",
  "25",
  "29.97",
  "30",
  "50",
  "59.94",
  "60",
]);
export type FrameRate = z.infer<typeof FrameRateSchema>;

export const ResolutionSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const FormatSpecSchema = z.object({
  id: z.string().default("r1"),
  name: z.string().default("FFVideoFormat1080p2997"),
  frameRate: FrameRateSchema.default("29.97"),
  resolution: ResolutionSchema.default({ width: 1920, height: 1080 }),
  colorSpace: z.string().default("1-1-1 (Rec. 709)"),
});
export type FormatSpec = z.infer<typeof FormatSpecSchema>;

export const AssetSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  src: z.string(),
  hasVideo: z.boolean().default(true),
  hasAudio: z.boolean().default(true),
  durationSeconds: z.number().nonnegative(),
  format: z.string().default("r1"),
});
export type AssetSpec = z.infer<typeof AssetSpecSchema>;

export const TextStyleSchema = z.object({
  font: z.string().default("Helvetica"),
  fontSize: z.number().int().positive().default(96),
  fontColor: z
    .string()
    .default("1 1 1 1")
    .describe("RGBA in 0..1 floats, space-separated (e.g. '1 0 0 1' for red)"),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
});
export type TextStyle = z.infer<typeof TextStyleSchema>;

const CUSTOM_TITLE_UID =
  ".../Titles.localized/Build In:Out.localized/Custom.localized/Custom.moti";

export const ClipSpecSchema = z.object({
  kind: z.literal("asset-clip"),
  name: z.string(),
  ref: z.string(),
  offsetSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  startSeconds: z.number().nonnegative().default(0),
  enabled: z.boolean().default(true),
  volumeDb: z
    .number()
    .default(0)
    .describe(
      "Audio level adjustment in dB (0 = unchanged, -6 = half loudness, -inf = mute)",
    ),
  videoRole: z.string().optional().describe("e.g. 'Video.global', 'B-roll.broll'"),
  audioRole: z
    .string()
    .optional()
    .describe("e.g. 'Dialogue.dialogue', 'Music.music', 'Effects.effects'"),
});

export const MotionParamBindingSchema = z.object({
  name: z.string().describe("Parameter name (FCPXML <param name=>)"),
  key: z.string().describe("FCPXML parameter key path (from fcp_bind_motion_param or FCP export)"),
  value: z.string().describe("String value to set on the parameter"),
});
export type MotionParamBinding = z.infer<typeof MotionParamBindingSchema>;

export const TitleSpecSchema = z.object({
  kind: z.literal("title"),
  name: z.string().default("Title"),
  text: z.string(),
  offsetSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  lane: z.number().int().default(1).describe("Track lane; 1 = above primary spine"),
  effectUid: z
    .string()
    .default(CUSTOM_TITLE_UID)
    .describe("Effect UID for the title generator (default: Apple Custom title)"),
  effectName: z.string().default("Custom").describe("Display name of the effect"),
  textStyle: TextStyleSchema.default({
    font: "Helvetica",
    fontSize: 96,
    fontColor: "1 1 1 1",
    alignment: "center",
    bold: false,
    italic: false,
  }),
  params: z
    .array(MotionParamBindingSchema)
    .optional()
    .describe("Motion published parameter bindings — drives <param> children in the FCPXML <title>"),
});
export type TitleSpec = z.infer<typeof TitleSpecSchema>;

export const TransitionSpecSchema = z.object({
  kind: z.literal("transition"),
  name: z.string().default("Cross Dissolve"),
  offsetSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive().default(1),
});
export type TransitionSpec = z.infer<typeof TransitionSpecSchema>;

export const SpineItemSchema = z.discriminatedUnion("kind", [
  ClipSpecSchema,
  TitleSpecSchema,
  TransitionSpecSchema,
]);
export type SpineItem = z.infer<typeof SpineItemSchema>;

export const MarkerSpecSchema = z.object({
  startSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive().default(1),
  value: z.string(),
  note: z.string().optional(),
  isChapter: z.boolean().default(false),
});
export type MarkerSpec = z.infer<typeof MarkerSpecSchema>;

export const ProjectSpecSchema = z.object({
  fcpxmlVersion: z.enum(["1.13", "1.14"]).default("1.14"),
  format: FormatSpecSchema.default({
    id: "r1",
    name: "FFVideoFormat1080p2997",
    frameRate: "29.97",
    resolution: { width: 1920, height: 1080 },
    colorSpace: "1-1-1 (Rec. 709)",
  }),
  libraryLocation: z
    .string()
    .optional()
    .describe(
      "Absolute path or file:// URL to a .fcpbundle library. If set, FCP imports into / creates this library, no dialog.",
    ),
  eventName: z.string().default("Creator Studio OS"),
  projectName: z.string(),
  assets: z.array(AssetSpecSchema).default([]),
  spine: z.array(SpineItemSchema).default([]),
  markers: z.array(MarkerSpecSchema).default([]),
});
export type ProjectSpec = z.infer<typeof ProjectSpecSchema>;
