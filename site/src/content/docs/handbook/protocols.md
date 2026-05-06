---
title: Protocols
description: Cross-app composition protocols — brand-deck-minimal walkthrough, step-by-step.
sidebar:
  order: 7
---

## What are protocols?

Protocols are idempotent, multi-step pipelines that orchestrate tools across multiple apps in a fixed sequence. Each step produces output that the next step consumes. A **replay manifest** is written at the end so you can inspect what ran and resume from a checkpoint.

```bash
creator-studio-os protocol list
creator-studio-os protocol describe brand-deck-minimal
```

## brand-deck-minimal

The flagship protocol: 13 steps from a `project.json` spec to a ProRes MOV.

```bash
creator-studio-os protocol run brand-deck-minimal \
  --project demo/csos-showcase/project.json
```

### What you need

- A `project.json` file with at least one scene (see [Usage → project.json format](./usage/#projectjson-format))
- Pixelmator Pro, Motion, Compressor, and Final Cut Pro installed
- A Motion lower-third template (the demo uses the bundled `Atmospheric-Lower Third`)

### The 13 steps

```
1  validate-project       Assert ProjectV2 schema + scene count
2  compose-brand-cards    Pixelmator Pro: hue-rotated identity cards per scene
3  render-scene-clips     Motion: clone template → patch title/subhead → Compressor ProRes 4444 render
4  edit-motion-title      Set project-level Motion template title
5  resolve-fcp-params     Compute timeline geometry (frame rate, duration, asset refs)
6  build-fcpxml           Write FCPXML 1.14 to out/fcp/
7  safety-preflight       Assert brand card files exist before import
8  dtd-validate           xmllint against bundled FCP DTD
9  fcp-import             Open .fcpxml in Final Cut Pro
10 compressor-encode      ffmpeg overlay (brand card + ProRes 4444 alpha clip) → Compressor final encode
11 monitor-encode         Poll encode until done
12 verify-output          Assert MOV exists and has bytes
13 write-replay-manifest  Finalise manifest with completedAt
```

### Step 2 — compose-brand-cards

`pixelmator_compose_brand_card` creates one brand card PNG per scene. Cards are hue-rotated relative to the project's `brand.primaryColor`, so a 6-scene deck produces 6 visually distinct but harmonically related backgrounds. Text content is the "Creator Studio OS" wordmark at a fixed position.

### Step 3 — render-scene-clips

For each scene:

1. `motion_template_clone` — clones the `.motn` template to a temp path
2. `motion_template_set_param` — patches the title and subhead text via OZML edit (`patchSiblingText` for Apple Compositions sibling layout)
3. `motion_render_via_compressor` — dispatches a headless ProRes 4444 render via Compressor

After Compressor signals "completed", a `ffprobe` readiness poll (10 × 500ms) confirms the moov atom is fully flushed before the clip path is used downstream. This prevents a race condition where Compressor's "completed" signal arrives before QuickTime finishes writing the container.

### Step 10 — compressor-encode

For each scene, `ffmpeg` composites the brand card PNG over the ProRes 4444 alpha clip:

```bash
ffmpeg -loop 1 -i brand-card.png \
       -i lower-third.mov \
       -filter_complex "overlay=0:0" \
       -t <scene_duration> \
       scene-composited.mov
```

The composited clips are then concatenated and handed to Compressor for the final ProRes encode.

### Text clipping note

The Atmospheric lower-third template has fixed render bounds. Titles longer than approximately 14 characters may clip against the curve graphic. Keep scene titles short — 10–12 characters is safe. The `subhead` field has slightly more room (~20 characters). A ledger warning for this is planned for v1.8.x.

### Replay manifest

After step 13, a `replay-manifest.json` is written to `out/`:

```json
{
  "protocol": "brand-deck-minimal",
  "project": "my-project",
  "startedAt": "2026-05-05T12:00:00Z",
  "completedAt": "2026-05-05T12:04:23Z",
  "steps": [
    { "step": "validate-project", "status": "completed" },
    ...
  ],
  "outputs": {
    "finalMov": "out/my-project-final.mov"
  }
}
```

Re-running the protocol from the start is safe — steps that already produced output are detected and skipped (idempotent).

## Adding a protocol

Protocols live in [`@creator-studio-os/protocols`](https://www.npmjs.com/package/@creator-studio-os/protocols) (`packages/protocols/src/`). Each protocol is a TypeScript module that exports a `ProtocolDefinition` with a name, description, and ordered step array. Steps receive the project context and tool registry, and return structured results that the next step can consume.

See `packages/protocols/src/brand-deck-minimal.ts` for the reference implementation.
