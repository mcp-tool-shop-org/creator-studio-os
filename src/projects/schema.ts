import { z } from "zod";

export const ProjectMetaSchema = z.object({
  name: z.string().min(1),
  kind: z
    .enum([
      "trailer",
      "devlog",
      "social",
      "tutorial",
      "ad",
      "podcast",
      "other",
    ])
    .default("other"),
  target: z
    .object({
      deliverable: z.string().optional(),
      durationSeconds: z.number().nonnegative().optional(),
      aspect: z.enum(["16:9", "9:16", "1:1", "4:5"]).default("16:9"),
      frameRate: z
        .enum(["23.98", "24", "25", "29.97", "30", "50", "59.94", "60"])
        .default("29.97"),
    })
    .default({ aspect: "16:9", frameRate: "29.97" }),
  brand: z
    .object({
      tokens: z.string().optional(),
    })
    .optional(),
  canon: z
    .object({
      refs: z.array(z.string()).default([]),
    })
    .optional(),
  notes: z.string().optional(),
});

export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;
