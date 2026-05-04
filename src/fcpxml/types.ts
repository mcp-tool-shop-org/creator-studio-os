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

export const ClipSpecSchema = z.object({
  kind: z.literal("asset-clip"),
  name: z.string(),
  ref: z.string(),
  offsetSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  startSeconds: z.number().nonnegative().default(0),
  enabled: z.boolean().default(true),
});

export const TitleSpecSchema = z.object({
  kind: z.literal("title"),
  name: z.string().default("Title"),
  text: z.string(),
  offsetSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  lane: z.number().int().default(1),
});

export const SpineItemSchema = z.discriminatedUnion("kind", [
  ClipSpecSchema,
  TitleSpecSchema,
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
  eventName: z.string().default("Creator Studio OS"),
  projectName: z.string(),
  assets: z.array(AssetSpecSchema).default([]),
  spine: z.array(SpineItemSchema).default([]),
  markers: z.array(MarkerSpecSchema).default([]),
});
export type ProjectSpec = z.infer<typeof ProjectSpecSchema>;
