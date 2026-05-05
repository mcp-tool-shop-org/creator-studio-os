# 08 — Cross-app composition protocols + project.json schema

> Research agent 8/9 of the 2026-05-05 creator-studio-os deep swarm.
> Slice: the architectural keystone — `project.json` schema, the v2.0 protocols (`devlog`, `steam_trailer`, `social_short`, `podcast_episode`, `report`, `batch_letter`), shared protocol primitives, MCP composition pattern, brand tokens, observability, idempotency, failure modes, prior art.
>
> The strategic moat is **cross-app composition**. None of the surveyed competitors tie iWork to FCP/Logic/Motion/Compressor in one surface (see `2026-05-04-swarm.md`). That asymmetry is the entire reason this layer exists.

---

## 0. Frame: what a "protocol" actually is

A **protocol** is a deterministic, resumable orchestration that:

1. Reads a **single source of truth** (`project.json`) for what to build, who it's for, and how it should look/sound.
2. Composes **per-app tools already shipped in csos** (`fcp_*`, `compressor_*`, `pixelmator_*`, `motion_*`, `keynote_*`, `pages_*`, `numbers_*`) plus **shared primitives** (`csos_brand_*`, `csos_score_map_*`, etc.) into a typed pipeline.
3. Produces **named deliverables** at known paths under `<project>/out/<deliverable-kind>/`.
4. Survives **interruption** — re-running picks up where it left off because each step gates on file-hash + output-existence.
5. Reports **structured progress** to the MCP client through a task surface (SEP-1686-shaped) so a Claude/agent caller can poll, cancel, and inspect partial state.

Mike's framing matters here: csos's first proof is the **the showcase deliverable Steam trailer**. That single deliverable touches Pixelmator (key art + thumbnails), Motion (animated lower-third), Motif (cue map → music role stems), FCP (FCPXML spine assembly), and Compressor (1080p H.264 master + 4K HEVC + 9:16 social variant). Six apps, one button. That's the product.

---

## 1. `project.json` schema (TypeScript / Zod)

The current schema (`src/projects/schema.ts`) is a 39-line stub with only `name`, `kind`, `target`, `brand.tokens`, `canon.refs`, `notes`. **Insufficient for protocols.** Here is the full v2.0 schema. It extends — does not break — the v1 fields.

```ts
// src/projects/schema.ts (v2.0)
import { z } from "zod";

// ── Brand tokens ─────────────────────────────────────────────────────────
// Follows W3C Design Tokens Format Module 2025.10 (stable). Two-level
// shape: { $value, $type } per leaf, groups freely nested. We add a small
// CSOS-specific dialect for video/audio tokens (lower-third, fonts in Motion,
// etc.) since the W3C spec is web-leaning.
export const TokenLeafSchema = z.object({
  $value: z.union([z.string(), z.number(), z.record(z.unknown())]),
  $type: z
    .enum([
      "color",         // "#0E1116" or { space: "srgb", components: [...] }
      "fontFamily",    // "IBM Plex Sans"
      "fontWeight",    // 600
      "dimension",     // "16px" / "1.25em"
      "duration",      // "0.6s"
      "cubicBezier",   // [0.2, 0.8, 0.2, 1]
      "asset",         // { src: "brand/logo-mark.svg", role: "logo-mark" }
      "audioGain",     // -14 (LUFS) — csos extension
      "lowerThird",    // { template: "...", duration: "1.2s" } — csos extension
    ])
    .optional(),
  $description: z.string().optional(),
});

export const BrandTokensSchema: z.ZodType<unknown> = z.lazy(() =>
  z.record(z.union([TokenLeafSchema, BrandTokensSchema])),
);

// ── Canon refs (links to style-dataset-lab + game canon) ─────────────────
export const CanonRefSchema = z.object({
  kind: z.enum(["style-dataset-lab", "game-design", "motif-score", "external"]),
  path: z.string(),                 // absolute or workspace-relative
  pinned: z.string().optional(),    // git SHA / tag for reproducibility
  description: z.string().optional(),
});

// ── Deliverable matrix ───────────────────────────────────────────────────
const AspectSchema = z.enum(["16:9", "9:16", "1:1", "4:5", "21:9"]);
const FrameRateSchema = z.enum(["23.98", "24", "25", "29.97", "30", "50", "59.94", "60"]);

export const DeliverableSpecSchema = z.object({
  kind: z.enum([
    "steam_trailer",
    "social_short",
    "devlog",
    "podcast_episode",
    "report",
    "batch_letter",
    "key_art",
    "thumbnail",
    "lower_third",
  ]),
  aspect: AspectSchema.default("16:9"),
  durationS: z.number().nonnegative().optional(),       // hard cap when known
  frameRate: FrameRateSchema.default("29.97"),
  resolutions: z.array(z.tuple([z.number(), z.number()])).default([]),
  // Compressor preset name(s) to invoke; resolved against settings_list
  compressorPresets: z.array(z.string()).default([]),
  outputPattern: z.string().default("{slug}-{kind}-{variant}.{ext}"),
  // Steam, YouTube, TikTok, etc. Drives muxer choices + audio LUFS targets.
  channel: z
    .enum(["steam", "youtube", "tiktok", "shorts", "reels", "rss", "internal"])
    .optional(),
});

export const DeliverableMatrixSchema = z.record(DeliverableSpecSchema);

// ── Scene / beat list (the timeline of a video deliverable) ──────────────
export const RoleMappingSchema = z.object({
  // FCP role IDs. Default csos roles: dialogue.dialogue, music.music,
  // effects.effects, narration.narration, ambience.ambience.
  dialogue: z.string().default("dialogue.dialogue"),
  music: z.string().default("music.music"),
  effects: z.string().default("effects.effects"),
  narration: z.string().default("narration.narration"),
  ambience: z.string().default("ambience.ambience"),
});

export const MotifBindingSchema = z.object({
  family: z.string(),                        // e.g. "communion-awe"
  cue: z.string().optional(),                // specific cue id from score-map
  intensity: z.enum(["low", "mid", "high"]).default("mid"),
});

export const MotionTitleBindingSchema = z.object({
  template: z.string(),                      // path under <project>/brand/motion/
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export const SceneBeatSchema = z.object({
  id: z.string(),                            // stable identifier — idempotency key
  title: z.string().optional(),
  durationS: z.number().nonnegative(),
  // EXACTLY ONE of these primary visual sources is required at validate time.
  footage: z.string().optional(),            // path under <project>/footage/
  still: z.string().optional(),              // path under <project>/images/
  motion: MotionTitleBindingSchema.optional(), // Motion .motn render
  // Layered audio
  motif: MotifBindingSchema.optional(),
  dialogueClip: z.string().optional(),
  fxClips: z.array(z.string()).default([]),
  // FCP positioning (computed if omitted)
  inSeconds: z.number().nonnegative().optional(),
  // Per-beat captions / lower-third
  caption: z.string().optional(),
  lowerThird: MotionTitleBindingSchema.optional(),
});

// ── Footage & audio manifests ────────────────────────────────────────────
export const FootageEntrySchema = z.object({
  path: z.string(),
  camera: z.string().optional(),
  slate: z.string().optional(),
  take: z.number().int().optional(),
  inS: z.number().nonnegative().optional(),
  outS: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const AudioStemSchema = z.object({
  path: z.string(),
  stem: z.enum(["dialogue", "music", "fx", "narration", "ambience", "stinger"]),
  motifFamily: z.string().optional(),
  motifCue: z.string().optional(),
  loudnessLUFS: z.number().optional(),
});

// ── The full project.json ────────────────────────────────────────────────
export const ProjectMetaSchema = z.object({
  schemaVersion: z.literal(2).default(2),
  // Identity
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  kind: z.enum([
    "game",                                  // the showcase project, another operator project
    "devlog-series",                         // Mike's csos devlog
    "podcast",
    "report",                                // Numbers/Keynote/Pages output
    "marketing",
    "other",
  ]),
  description: z.string().optional(),

  // Brand
  brand: z.object({
    tokens: BrandTokensSchema.default({}),
    // Convenience hot-paths most protocols read directly:
    logo: z
      .object({
        mark: z.string().optional(),         // square mark
        wordmark: z.string().optional(),     // horizontal lockup
        favicon: z.string().optional(),
      })
      .default({}),
    palette: z
      .object({
        primary: z.string().optional(),
        accent: z.string().optional(),
        ink: z.string().optional(),
        paper: z.string().optional(),
      })
      .default({}),
    typography: z
      .object({
        display: z.string().optional(),
        body: z.string().optional(),
        mono: z.string().optional(),
      })
      .default({}),
  }).default({ tokens: {}, logo: {}, palette: {}, typography: {} }),

  // Canon
  canon: z.array(CanonRefSchema).default([]),

  // Roles (FCP timeline organization). Single source of truth.
  roles: RoleMappingSchema.default(RoleMappingSchema.parse({})),

  // Deliverable matrix — keyed by stable deliverable id
  deliverables: DeliverableMatrixSchema.default({}),

  // Optional embedded timeline (small projects). Larger projects keep this
  // in scenes/<deliverable>.json and reference by id.
  scenes: z.record(z.array(SceneBeatSchema)).default({}),

  // Manifests (resolved at protocol-run time; usually generated by scanners)
  manifests: z
    .object({
      footage: z.array(FootageEntrySchema).default([]),
      audio: z.array(AudioStemSchema).default([]),
    })
    .default({ footage: [], audio: [] }),

  // Output naming convention (template variables: {slug} {kind} {variant}
  // {ext} {date} {sceneId})
  outputPattern: z.string().default("{slug}-{kind}-{variant}.{ext}"),

  notes: z.string().optional(),
});

export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;
```

**Migration:** v1 projects are valid v2 projects (every new field has a default). `resolveProject` reads the `schemaVersion` and runs an in-memory migration if missing.

**Why this shape:**

- **Single source of truth.** `project.json` is the only file a protocol reads. No global config, no hidden state.
- **W3C-aligned design tokens.** Stable since 2025.10; tooling exists (Style Dictionary, Token Studio). We add `audioGain` and `lowerThird` as csos-specific `$type`s — the spec explicitly permits this.
- **Roles centralized.** FCP roles are notoriously easy to fragment ("dialogue.Mix" vs "dialogue.mix"). One mapping, applied everywhere.
- **Scenes are addressable.** Each `SceneBeatSchema.id` is the **idempotency key** for that beat's renders.
- **Deliverable matrix is data.** New deliverable kinds = new entries, not new code.

---

## 2. `protocol.steam_trailer` — full pipeline (the keystone proof)

Walk-through for the **the showcase deliverable** trailer. Read the spec → land 1080p H.264 + 4K HEVC + 9:16 social variant.

```text
INPUT:
  project = "csos-showcase"
  spec    = projects/csos-showcase/project.json
            .deliverables["steam-trailer"]    (+ scenes["steam-trailer"])

STEP 0 — Pre-flight (sync, no I/O cost)
  1. csos_protocol_validate(project, "steam_trailer")
       → resolves project.json, runs DeliverableSpecSchema +
         SceneBeatSchema, errors with hint if anything missing.
  2. csos_brand_load(project)
       → returns flattened token map + resolved logo paths.
  3. csos_score_map_load(project)
       → reads canon[*].kind === "motif-score"; loads JSON cue index.
  4. csos_idempotency_plan(project, "steam_trailer")
       → walks the planned outputs, hashes inputs per beat, returns
         { steps: [{id, status: "fresh" | "stale" | "missing"}] }.
         Fresh steps are skipped.

STEP 1 — Key art (Pixelmator)  [skipped if fresh]
  pixelmator_open(brand-template)
  pixelmator_replace_text("{HEADLINE}", brand.headline)
  pixelmator_replace_text("{SUB}", project.description)
  pixelmator_layer_set_color("accent", brand.palette.accent)
  pixelmator_export({format: "png", size: [1920,1080], path: out/key-art-1080.png,
                     properties: { advanced compression: true }})
  pixelmator_export({format: "png", size: [2560,1440], ...})
  pixelmator_export({format: "png", size: [1024,1024], ...})  // square for Steam

STEP 2 — Lower-third title (Motion via OZML)  [skipped if fresh]
  motion_template_clone(template: "lower-third-base.motn",
                        target: out/.tmp/lower-third-showcase.motn)
  motion_template_set_param(file, "Title", "CREATOR STUDIO OS")
  motion_template_set_param(file, "Tagline", "RUSTED HOPE")
  motion_template_set_param(file, "Brand Color", brand.palette.accent)
  // Motion is now FCP-importable as a generator effect by ref.

STEP 3 — Per-scene preroll (footage normalization)
  for beat in scenes["steam-trailer"]:
    if beat.footage:
      // resolve, probe (ffprobe via shell), record duration/codec
      // we DO NOT transcode here; FCP handles native via FCPXML
    if beat.still:
      verify exists, dims, dpi
    if beat.motion:
      motion_template_clone + motion_template_set_param (params from beat)

STEP 4 — Score map binding (Motif → audio role stems)
  // For each beat with .motif, locate the score-map cue and copy/symlink
  // the rendered stem into audio/music/<beatId>-<cue>.wav. Loudness check.
  for beat in scenes["steam-trailer"]:
    if beat.motif:
      cue = score_map.lookup(beat.motif.family, beat.motif.cue)
      ensure cue.renderedStem exists
      assert |loudnessLUFS - target| < 1.0  // -14 LUFS for streaming

STEP 5 — FCPXML build (the spine)
  fcp_fcpxml_build({
    projectName: "the showcase deliverable — Steam Trailer",
    durationS: spec.durationS,
    frameRate: spec.frameRate,
    aspect: spec.aspect,
    roles: project.roles,                      // dialogue/music/effects/...
    spine: [...beats],                         // each beat → asset-clip / video / gap
    titles: [...lowerThirdRefs],               // anchored to spine clips
    audioRoles: {
      music: <stem refs from STEP 4>,
      dialogue: <dialogueClip refs>,
      effects: <fxClips refs>,
    },
  })
  // builder writes fcp/steam-trailer.fcpxml

STEP 6 — Validate
  fcp_fcpxml_validate(fcp/steam-trailer.fcpxml)
       → DTD-validate against bundled FCP 1.14 DTD (xmllint)
       → if 1.13-fallback flag set, also validate against 1.13.

STEP 7 — Import
  fcp_fcpxml_import(fcp/steam-trailer.fcpxml,
                    library: brand.fcp.library)
  // Bundle ID launch, no UI scripting.

STEP 8 — Render (HUMAN GATE on first run — see §13)
  // FCP cannot be programmatically render-triggered without UI scripting.
  // Default mode: surface a pause with a "render to <path>" instruction.
  // Power-user mode: csos_human_render_wait(timeoutMin: 30) polls
  // out/.fcp-render-watch/ for a sentinel file.
  // OR: bypass FCP render by using fcp_fcpxml_to_compressor_jobs (see §11).

STEP 9 — Compressor encode
  compressor_encode_project({
    project, deliverable: "steam-trailer",
    jobs: [
      { source: out/.render/master.mov,
        setting: spec.compressorPresets[0],            // "1080p H.264"
        location: out/steam-trailer/{slug}-1080p.mp4 },
      { source: out/.render/master.mov,
        setting: spec.compressorPresets[1],            // "4K HEVC"
        location: out/steam-trailer/{slug}-4k.mp4 },
      { source: out/.render/master.mov,
        setting: spec.compressorPresets[2],            // "9:16 reframe"
        location: out/steam-trailer/{slug}-vertical.mp4 },
    ],
  })

STEP 10 — Receipt
  csos_receipt_write(project, "steam_trailer", {
    inputsHash, outputs: [...paths], stepDurations, completedAt,
  })
  // out/.receipts/steam_trailer-<hash>.json — gates next run's idempotency.
```

The pipeline is **eight csos tool calls of orchestration, ~20 of execution**, all already shipped or trivially derivable from current per-app surfaces.

---

## 3. `protocol.devlog`

```text
INPUT:
  scenes from project.json (1-3 minute weekly cadence)
  Logic stems exported once via human (logic_export_stems is read-only)

STEPS:
  1. csos_protocol_validate("devlog")
  2. csos_brand_load
  3. (skip Pixelmator key-art unless deliverable.requiresThumbnail = true)
  4. fcp_fcpxml_build (one role per stem, dialogue.narration role for VO,
                      music.bed role for Logic-rendered bed, effects.fx)
  5. fcp_fcpxml_validate + fcp_fcpxml_import
  6. Human render gate
  7. compressor_encode → 1080p H.264 + Steam page asset (1920×1080 still
                          extracted with ffmpeg from 5s mark — still tool)
  8. csos_receipt_write
```

The point of devlog is **cadence, not novelty**. The protocol stays minimal so weekly authoring is "edit `scenes['devlog-NN'].json`, run protocol."

---

## 4. `protocol.social_short`

```text
INPUT:
  long-cut FCPXML (result of an earlier devlog or trailer)
  cropSpec: { kind: "9:16" | "1:1", focusRegion: "center" | "left" | "right" |
              "follow-track:<subjectId>" }

STEPS:
  1. csos_protocol_validate("social_short")
  2. fcp_fcpxml_reframe(longCutPath, cropSpec)
       → produces fcp/social-short.fcpxml with adjust-transform on each clip
       → no UI scripting; pure FCPXML mutation
  3. fcp_fcpxml_validate + fcp_fcpxml_import (small library, optional)
  4. Human render gate (or fcpxml-to-compressor direct path)
  5. compressor_encode for each presets[]:
       - tiktok: 1080×1920 H.264 9 Mbps
       - reels:  same source, IG-aware metadata
       - shorts: same source, YouTube-specific metadata
  6. csos_receipt_write
```

Footnote: `fcp_fcpxml_reframe` is a v1.2 candidate; not yet shipped. Argued for in `roadmap-fcp.md`.

---

## 5. `protocol.podcast_episode`

```text
INPUT:
  multitrack: array of audio paths + per-track gain/mute/notes
  cover: brand template + episode-specific {episode, title, guest}

STEPS:
  1. csos_protocol_validate("podcast_episode")
  2. logic_project_open(template: "podcast-master-bus.logicx")
       → human master pass (this is THE manual step)
  3. logic_export_master(out/master.wav)
       (read-only metadata + filesystem watch — no programmatic export)
  4. compressor_encode([
       { setting: "Podcast M4A 128k", out/podcast/{slug}-{ep}.m4a },
       { setting: "Archive WAV 48k 24bit", out/archive/{slug}-{ep}.wav },
     ])
  5. pixelmator_replace_text on cover template + export 3000×3000 RGB
  6. (optional) pages_compose_show_notes(notes, brand) → PDF
  7. csos_receipt_write
```

Logic's closed surface is real (see `roadmap-logic.md`). The protocol routes **around** it rather than fighting it: human masters in Logic, csos handles encode + cover + show notes.

---

## 6. `protocol.report`

The first protocol that doesn't touch FCP/Compressor.

```text
INPUT:
  numbers source: a Numbers doc with named ranges
  keynote template: a Keynote deck with placeholder slides
  outputKind: "pdf" | "deck" | "both"

STEPS:
  1. csos_protocol_validate("report")
  2. numbers_read_ranges(source, [<named-range-list>])
       → returns 2D arrays (already in v1.5 surface)
  3. numbers_chart_export(source, chartId, png, 1920×1080)
       → fills pixmaps under <project>/images/charts/
  4. keynote_replace_text(deck, {KPI_1}, value)  for each placeholder
  5. keynote_replace_image(deck, "chart-slot-1", images/charts/X.png)
  6. keynote_export_pdf or keynote_export_pptx
  7. csos_receipt_write
```

Keynote's reichenbach gap (we're behind in raw tool count) is irrelevant here — this protocol uses 4 well-defined writes, not 41 generic primitives.

---

## 7. `protocol.batch_letter`

```text
INPUT:
  pages template
  numbers data source: rows where each row = one letter
  outputDir + (optional) compressor encryption setting

STEPS:
  1. csos_protocol_validate("batch_letter")
  2. numbers_read_ranges(source, ["roster"])
  3. for each row:
       pages_mail_merge(template, row) → out/.tmp/{slug}-letter-{i}.pages
       pages_export_pdf → out/letters/{slug}-letter-{i}.pdf
  4. (optional) compressor_encode each PDF with PDF/A or encryption setting
       — Compressor handles PDF flatten/encrypt via "PDF" job destinations
  5. csos_receipt_write
```

This is the protocol that proves csos isn't just video — it's **all eight apps as a unified production substrate**.

---

## 8. Shared protocol primitives (`csos_*`)

These are NEW MCP tools. They are app-agnostic and used by every protocol:

| Tool                            | Purpose                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `csos_brand_load`               | Resolves `project.brand.tokens` to a flat map; resolves logo/palette hot paths to abs paths.   |
| `csos_brand_render_card`        | Pixelmator-driven brand card render (logo + headline + sub) → PNG at requested size.           |
| `csos_motion_title_render`      | OZML clone + param mutation, return path to a Motion file ready to bind in FCPXML.             |
| `csos_score_map_load`           | Reads Motif score-map JSON via canon ref; returns cue index keyed by `family.cue`.             |
| `csos_protocol_validate`        | Schema-validates a protocol's spec slice of `project.json` before any I/O.                     |
| `csos_protocol_run`             | Runs a named protocol end-to-end. Returns a task id (SEP-1686-shaped).                         |
| `csos_protocol_status`          | Polls a running protocol task. Returns step-by-step progress.                                  |
| `csos_protocol_cancel`          | Cancels a running protocol. Cooperative — finishes current step then halts.                    |
| `csos_idempotency_plan`         | Dry-run; returns per-step staleness so the caller knows what would actually execute.           |
| `csos_receipt_write`            | Writes `out/.receipts/<protocol>-<inputsHash>.json` for next-run idempotency.                  |
| `csos_receipt_read`             | Reads receipts; lets agents reason about prior runs.                                           |
| `csos_human_render_wait`        | Watches `<project>/out/.fcp-render-watch/` for a sentinel file with timeout.                   |
| `csos_progress_report`          | Aggregates receipts + active task state into one human-readable status dump.                   |

These primitives keep the per-app surfaces clean and push orchestration concerns into the cross-app layer.

---

## 9. MCP composition pattern: per-protocol vs single fat tool

**Decision: per-protocol tools, with a single `protocol_run` meta-tool that delegates.**

Both shapes ship:

```ts
// Per-protocol — the primary surface
server.tool("protocol_steam_trailer_run", ..., handler);
server.tool("protocol_devlog_run", ..., handler);
server.tool("protocol_social_short_run", ..., handler);
server.tool("protocol_podcast_episode_run", ..., handler);
server.tool("protocol_report_run", ..., handler);
server.tool("protocol_batch_letter_run", ..., handler);

// Plus a meta-tool for agents that want dynamic dispatch
server.tool("protocol_run", { name: z.string(), project: z.string(), spec: ... },
            (args) => dispatch(args.name, args.project, args.spec));
```

**Why both:**

- Per-protocol tools have **typed param packs** (Zod schemas per protocol). An LLM caller gets autocomplete on `spec`. This is the high-quality surface.
- `protocol_run` exists for two cases: (1) protocols that don't merit a top-level tool yet, (2) agent-built workflows that compose multiple protocols.

**Why not single fat tool only:**

The 100-server stress study (digitalapplied 2026) found that the difference between top-decile and bottom-decile MCP servers is whether each tool has **its own schema, idempotency, cancellation, and quota tracking**. A single fat tool blurs all four. Per-protocol tools force discipline.

**Long-running orchestration follows MCP SEP-1686 ("Tasks") shape:**

- `protocol_steam_trailer_run` returns immediately with a `taskId`.
- Caller polls `protocol_status({taskId})` for streaming progress.
- `protocol_cancel({taskId})` is cooperative.
- Reconnect: `protocol_status_list()` returns in-flight tasks (per SEP-1686 `tasks/list`).
- **Idempotency key:** SHA-256 of `(project.slug, protocol.name, normalized(spec), inputsHash)`. Re-submitting the same key returns the existing taskId. (Workos pattern, 2026 best practice.)

---

## 10. Schema-aware param packs

Each protocol gets a Zod schema for its `spec` argument. Defaults pulled from `project.json` so the caller can pass `{}` and get a valid spec. Example:

```ts
export const SteamTrailerSpecSchema = z.object({
  deliverableId: z.string().default("steam-trailer"),
  durationS: z.number().nonnegative().optional(),     // overrides project.json
  scenesId: z.string().default("steam-trailer"),       // which scenes[] entry
  variants: z
    .array(z.enum(["1080p-h264", "4k-hevc", "vertical-1080x1920"]))
    .default(["1080p-h264", "4k-hevc", "vertical-1080x1920"]),
  // Compressor presets resolved against compressor_settings_list
  compressorPresets: z
    .object({
      "1080p-h264": z.string().default("YouTube — 1080p HD"),
      "4k-hevc": z.string().default("Apple Devices 4K (HEVC)"),
      "vertical-1080x1920": z.string().default("Vertical Video — 1080×1920"),
    })
    .default({}),
  humanRenderTimeoutMin: z.number().int().positive().default(30),
});
```

Per-protocol schemas live in `src/protocols/<name>/spec.ts`. The auto-suggest layer uses `project.json` to fill optional fields before the LLM ever sees them.

---

## 11. Brand token system spec (chosen convention)

**W3C Design Tokens Format Module 2025.10**, with two csos extensions.

- Reaches first **stable** version Oct 2025 (designtokens.org). Tooling (Style Dictionary 5.x, Token Studio) already supports it.
- Two-level shape: `{ $value, $type }` per leaf, groups freely nested.
- W3C is web-leaning; we add `audioGain` (LUFS) and `lowerThird` (Motion title preset reference) as csos `$type`s — the spec explicitly permits unknown types, so consumers degrade gracefully.

**Why not Tailwind/CSS-vars/Adobe Spectrum:**

- Tailwind tokens are component-styled; csos needs cross-medium tokens (PNG, FCPXML attr, `.motn` parameter).
- CSS-var-style is web-only.
- Spectrum is Adobe-coupled.
- W3C is **vendor-neutral**, **stable since Oct 2025**, and **already speaks to Figma → Style Dictionary → code** flows that game studios use.

**Mapping rules (csos extension):**

- `color.*` → hex string for Pixelmator / Motion `Brand Color` parameter.
- `typography.display.$value` → Motion `Title Font Family`, Pixelmator text-layer font, FCPXML title generator parameter.
- `audioGain.streaming.$value = -14` → Compressor LUFS target.
- `lowerThird.standard.$value = { template: "...", duration: "1.2s" }` → Motion template path resolution.

---

## 12. Status / observability / idempotency

### Status

- Each protocol task writes a JSONL log to `<project>/out/.tasks/<taskId>.jsonl`.
- One line per step start/end/error. Schema: `{ ts, taskId, step, kind: "start"|"end"|"error", durationMs?, error? }`.
- `protocol_status` reads the JSONL tail + the receipt file (if present) and returns a structured summary.
- `fsevents` watcher in csos pushes step transitions as MCP notifications when the client supports them; falls back to polling otherwise.

### Idempotency (the "don't double-encode" problem)

Three layers:

1. **Inputs hash gate.** Each step computes a SHA-256 over its declared inputs (file contents + relevant `project.json` slice). The receipt records the hash. On re-run, if hash matches and the output exists, skip.
2. **Output existence + mtime gate.** Even without a receipt, if the expected output exists and is newer than every input, skip. This handles the "I copied the project to a new disk" case.
3. **Task-level idempotency key.** As in §9 — re-submitting an in-flight `protocol_run` with the same key returns the existing taskId.

`csos_idempotency_plan` exposes layers 1+2 as a dry-run so the caller can see exactly what would run.

### Cache

`<project>/out/.cache/<protocol>/<step>/<inputsHash>/<output-name>` is the durable cache. Manual eviction = `rm -rf` of any path; protocols never delete cache, only write.

---

## 13. Failure modes & recovery

Every step uses `CreatorStudioError { code, message, hint }` (already enforced). Protocol-level wrapping:

| Failure                            | Recovery pattern                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `E_PIXELMATOR_LAYER_MISSING`       | Skip this beat's still + downgrade deliverable resolution; record warning in receipt.     |
| `E_MOTION_OZML_INVALID`            | Skip lower-third for this beat; FCPXML build proceeds without it; warning surfaced.       |
| `E_FCPXML_DTD_FAIL`                | Hard stop. The spine is wrong and we can't recover. Surface full DTD error + offending node. |
| `E_FCP_IMPORT_TIMEOUT`             | Retry with `--no-recents`; if still fails, hard stop.                                     |
| `E_COMPRESSOR_PRESET_NOT_FOUND`    | Search alternates; if all fail, **fallback to ffmpeg with declared codec params**.        |
| `E_HUMAN_RENDER_TIMEOUT`           | Save state, surface a "resume with: csos_resume <taskId>" message. Task remains in-flight. |
| `E_LOGIC_MASTER_MISSING`           | Pause for human; never auto-skip a podcast master.                                        |
| `E_CACHE_CORRUPT` (hash mismatch)  | Invalidate that step's cache entry, retry once, then propagate.                           |

**Fallback to ffmpeg** is a published policy: if Compressor presets fail or are silently broken (the 5.2 codec-removal issue from the per-app swarm), csos can render via ffmpeg using a declared codec map. The user opts in via `protocol.allowFfmpegFallback: true`. ffmpeg is local-only, no network.

---

## 14. Cross-game reuse + non-game projects

The schema is project-kind-agnostic. Five tested kinds:

- **Game** (the showcase project, another operator project, another operator project) — full canon refs, score-map binding.
- **Devlog-series** — minimal canon, brand-only, one scenes[] entry per episode.
- **Podcast** — no canon, no Motion; brand for cover art.
- **Report** — no FCP/Compressor; only Numbers/Keynote/Pages.
- **Marketing** (csos's own marketing site) — brand + key-art protocol; no scenes.

This is what makes the moat real: **the same csos surface produces a the showcase project Steam trailer, a podcast about csos, and an investor report**. No other MCP can do all three.

---

## 15. Prior art comparison

| System            | Abstraction                  | Fit for csos                                                                                  |
| ----------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| GitHub Actions    | Composite actions, YAML DAG  | Closest spirit. **We borrow:** declarative steps, idempotent caching, structured outputs.     |
| Tekton            | CRDs (Tasks → Pipelines)     | Too K8s-heavy. **We borrow:** the catalog idea — protocol primitives are reusable like Tasks. |
| Argo Workflows    | DAGs as K8s resources        | Too K8s-heavy. **Inspiration only:** task-level retry policies, artifact passing.             |
| n8n / Make.com    | Visual node graph SaaS       | Wrong layer; csos is local-first MCP, not visual. **We borrow:** per-step retry semantics.    |
| MCP SEP-1686      | Tasks API for long ops       | **Direct adoption.** taskId, list/cancel/get/result, idempotency key.                         |
| Workos async-tasks pattern | Idempotency + dedupe | **Direct adoption.** SHA-256 of normalized inputs as idempotency key.                         |

**csos's place in this landscape:** local-first, single-machine, single-user, file-based. Closer to a Makefile-with-types than to Argo. The **abstraction we pick is "typed pipeline of tools that share one project.json"** — same shape as a GitHub composite action, sized for a workstation, expressed through MCP. No daemon, no scheduler, no cluster.

**What we explicitly reject:** YAML pipeline DSLs. csos is TypeScript end-to-end. The pipeline is `await step1(); await step2();` in a TS function with retry/idempotency wrappers.

---

## 16. Frontier — five workflows nobody else can do

These are protocols **only csos can ship** because no competitor ties iWork to FCP/Logic/Motion/Compressor in one MCP surface.

### F1 — `protocol.canon_to_trailer`

Read a game's `style-dataset-lab/projects/<game>/canon/` directory directly. Auto-extract scene beats from the canon's chapter / encounter index. Auto-bind motif cues by canon scene tag. Generate a **first-cut trailer FCPXML purely from canon + score-map** with zero hand-authored scenes[]. Manual edit pass after = weeks of work compressed to a polish session.

**Nobody else can do this** because it requires reading canon (style-dataset-lab integration), score-map (Motif integration), and writing FCPXML 1.14 (csos), wired through one project.json.

### F2 — `protocol.devlog_from_commits`

Walk a repo's git log, extract diffs, render each as a Pages-typeset code-overlay PNG + Pixelmator brand card, sequence them in FCPXML with Motion lower-thirds, drop a Logic-rendered music bed underneath, encode via Compressor. **Generated devlog from `git log` alone.** Caption is the commit message, scene length is normalized commit complexity.

### F3 — `protocol.character_sheet_to_keynote`

the showcase project has 32 NPCs in canon. csos walks `canon/characters/`, generates a Numbers roster (stats), a Keynote slide per character (portrait from style-dataset-lab approved outputs + canon prose summary), and a Pages dossier PDF. **Three iWork apps, one canon source, one button.** This is the kind of workflow Mike's LLM-crew leverage was built for — it'd take a human assistant a week.

### F4 — `protocol.live_score_session`

Open a Logic project. Open a Motion graphics project. Open FCP. As the human edits the FCP timeline, csos watches FCPXML round-trip exports → triggers Motif scene-mapper → renders Logic stems via human master cycle → re-imports stems back into FCP via FCPXML rewrite. **Adaptive scoring loop in real time, locally.** The Motif Phase 2 adaptive proof becomes a csos protocol.

### F5 — `protocol.steam_press_kit`

Steam press kits are Mike's pain point. This protocol generates: 6 brand-correct screenshots (Pixelmator), a 90-second trailer (`steam_trailer`), a 30-second short (`social_short` 16:9 cut), a Pages-typeset fact sheet PDF, a Numbers-driven feature matrix PDF, a Keynote-exported pitch deck PDF, and a logo pack (PNG + SVG). **Every artifact a Steam press kit demands**, single project.json, single command. The closest competitor produces *one* of those.

---

## 17. Ship order (concrete recommendation)

Argued for the v2.0 staging:

1. **v2.0.0** — `project.json` schema v2 + `csos_protocol_validate` + `csos_brand_load` + `csos_idempotency_plan` + `protocol.steam_trailer` (the proof). 4 weeks of LLM-crew work.
2. **v2.1.0** — `protocol.devlog` + `protocol.social_short`. Reuses 80% of v2.0 plumbing.
3. **v2.2.0** — `protocol.podcast_episode` + `protocol.report` + `protocol.batch_letter`. iWork breadth.
4. **v2.3.0** — Frontier protocols F1-F5 (cherry-pick by demand).

Each release ships with: one new test fixture project (e.g. `tests/fixtures/projects/csos-showcase-mini/`) round-trippable via `creator-studio-os verify`. The mini project is the thing future-Claude opens to learn how protocols work.

---

**Bottom line:** the cross-app composition layer is ~6-8 new csos tools (`csos_*` primitives) + per-protocol tools. The schema does most of the design heavy-lift; the protocols become small TypeScript pipelines on top of already-shipped per-app surfaces. The moat is real and defensible — it requires owning all 8 apps + canon integration + Motif integration in one MCP, which is exactly the position csos already holds.

## Sources

- [SEP-1686: Tasks · MCP](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1686)
- [SEP-1391: Long-Running Operations · MCP](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1391)
- [MCP Async Tasks: Building long-running workflows for AI Agents — WorkOS](https://workos.com/blog/mcp-async-tasks-ai-agent-workflows)
- [100 MCP Servers Stress-Tested: Reliability Findings — Digital Applied](https://www.digitalapplied.com/blog/mcp-server-reliability-100-server-stress-test-study)
- [Design Tokens Format Module 2025.10 — W3C Community Group](https://www.designtokens.org/tr/drafts/format/)
- [Design Tokens specification reaches first stable version — W3C](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [Tekton vs Argo Face-off — Wallarm](https://www.wallarm.com/cloud-native-products-101/cloud-native-ci-cd-pipelines-tekton-vs-argo)
- [Proposal: Tekton Workflows — tektoncd/community](https://github.com/tektoncd/community/issues/464)
