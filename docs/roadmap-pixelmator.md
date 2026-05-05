# Pixelmator Pro roadmap

Plan for the `pixelmator_*` wing. Pixelmator has the richest AppleScript surface among the Creator Studio apps after FCP — almost every menu action is scriptable.

> Surface = `PixelmatorPro.sdef` AppleScript dictionary. Bundle ID `com.apple.pixelmator` (post-acquisition Apple namespace).

## v1.3 — shipped 2026-05-04

- 11 tools covering document lifecycle, export (10 formats), resize, crop, rotate, flip, project-level batch export
- Smoke-proven end-to-end against Pixelmator Pro 4.2 (Creator Studio): open 2560x1440 PNG → resize to 1920x1080 → export as WebP
- Caught + documented the **extension-stripping quirk** (Pixelmator names a document by stem, not by filename)

## Roadmap-altering finding from 2026-05-05 deep research swarm

The 2026-05-05 swarm read the **full 3,044-line `PixelmatorPro.sdef`** directly from the bundle. The surface is **4× richer** than v1.3's 11 tools surface. See [`docs/research/2026-05-05-deepswarm/03-pixelmator-depth.md`](./research/2026-05-05-deepswarm/03-pixelmator-depth.md) for the full sdef catalog.

**Catalogued surface:**
- **22 export formats** including 4 HDR variants csos hasn't surfaced (HDR JPEG / HEIC / AVIF / PNG, OpenEXR, MP4/QuickTime video, animated PNG/GIF, Motion-project handoff)
- **27 Apple-blessed blend modes** (csos uses zero)
- **23 Effect classes** (gaussian / box / disc / motion / zoom / spin / tilt-shift / focus / bump / pinch / circle-splash / hole / light-tunnel / twirl / vortex / pixelate / pointillize / crystallize / checkerboard / stripes / color-fill / image-fill / pattern-fill)
- **24 color-adjustment properties** including custom-LUT in/out
- **sdef-native `replace`, `replace image`, `detect face`, `detect QR code`** (with decoded message payload)
- **28 Pixelmator Shortcuts actions** — partially Shortcuts.app-only (portrait background removal, image upscale, color match)

The `export options` record is mostly readable from the sdef directly — only 4 properties; the truly hidden bits live in `export for web options` and Shortcuts.app actions. **Roadmap shape:** v1.4 expands from "layer authoring + text" to **full sdef coverage** (~25+ new tools).

## Priority adds (folded into v1.4+)

1. **`pixelmator_run_shortcut`** — bridge to Shortcuts.app via `shortcuts run "<name>"` CLI. Picks up the Apple-only ML knobs the sdef alone doesn't expose.
2. **`pixelmator_apply_ml`** — typed surface for the ML algorithm enum (`ml super resolution`, `ml enhance`, `ml denoise`, `ml match colors`, `ml crop`, `ml remove background`).
3. **`pixelmator_replace_text`** + **`pixelmator_replace_layer`** — sdef-native commands. Massive value for game-asset templating (the showcase project UI mock variants, another operator project chapter cards).
4. **`pixelmator_detect`** — face / QR / barcode detection. Sprite-sheet metadata extraction.
5. **Sdef-diff harness** — scripted `sdef /Applications/Pixelmator\ Pro.app` snapshot per release into `docs/reference/sdef-snapshots/` + diff report on each Pixelmator update.
6. **27 blend modes** from the [Late Night Software library](https://forum.latenightsw.com/t/i-made-a-pixelmator-pro-library/2712). `pixelmator_set_layer_style` = blend modes + shadows / strokes / fills.
7. **HDR exports** (HDR JPEG / HEIC / AVIF / PNG) — csos becomes the first MCP shipping HDR Pixelmator exports.
8. **Effect verbs** — one tool per effect class or a single `pixelmator_apply_effect(class, params)` dispatch. The 23 sdef-native effects.

## v1.4 — Layer authoring + text

Pixelmator is most useful for canon-bound work when it can author from scratch, not just transform existing assets.

- **Layer creation** — `make new image layer`, `make new shape layer`, `make new text layer` via the inherited Standard suite
- **Text layers** with full styling — font, size, color, alignment, kerning, line-height, stroke, shadow. Foundation for marketing graphics, lower-thirds, key-art typography.
- **Shape primitives** — `make rectangle`, `make rounded rectangle` (already in sdef as hidden commands; promote and document)
- **Layer ordering** — `move layer to front/back/before/after`
- **Layer visibility / opacity / blend mode** — programmatic layer mixing
- **Group / ungroup** — `make group`

This unlocks "compose a marketing card from scratch" workflows: load brand colors from `project.json`, place logo, headline, subhead, exported as WebP + PNG.

## v1.5 — Selection, masks, color ops

Beyond the v1.3 transform set:

- **Smart selections** — `select subject`, `smart refine selection`, `select color range`. Apple's ML-backed selection tools are exposed via AppleScript and are the right answer for cutout / matte work.
- **Refine selection** — adjust roundness, softness, size programmatically
- **Layer masks** — apply a selection as a mask
- **Color adjustments** as actions: hue / saturation / lightness / temperature / tint / vibrance / curves. Pixelmator exposes some via AppleScript (need to inspect deeper)
- **`replace text`** — already in the sdef; document and ship for batch templating

## v1.6 — File format options + presets

The `with properties` parameter on `export` accepts an `export options` record but its keys aren't documented in the public sdef. Reverse-engineer:

- **JPEG quality** (0..100)
- **WebP quality + lossless mode**
- **HEIC quality**
- **PNG interlacing**
- **TIFF compression** (none / LZW / ZIP / Deflate)
- **PDF settings** (vector vs raster, color space)
- **Color profile** override

`compressor_settings_inspect`-style introspection: parse a saved `.compressorbatch` or `.pixelmator` preset to extract the structure, then expose corresponding builder API.

## v1.7 — ML / generative ops

Pixelmator ships ML features that are scriptable:

- **Super resolution** (ML upscale) — promotes small assets to higher res
- **ML denoise**
- **ML deband**
- **Object removal** via `select subject` + `clear`

These power batch enhancement of low-res reference images — useful when a game project's `refs/` dir has small concept thumbnails that need cleanup before going into a marketing piece.

## v2.0 — Cross-app composition

Pixelmator's role in cross-app protocols:

- **`protocol.steam_trailer`** — author key-art card with logo + headline → export at 1920x1080 + 2560x1440 + 1024x1024 (Steam capsule sizes)
- **`protocol.devlog`** — generate thumbnail from a video frame: extract first frame via ffmpeg → load in Pixelmator → overlay text + brand → export for YouTube + RSS
- **`protocol.social_short`** — convert 16:9 cover to 9:16 / 1:1 / 4:5 for platform-specific deliverables

Each protocol reads `project.json` (target deliverable + brand tokens + canon refs) and orchestrates Pixelmator + FCP + Compressor end-to-end.

## Out of scope (likely)

- **Photoshop-format-perfect editing** — Pixelmator's PSD support is import/export only. Never going to round-trip with a Photoshop user's session.
- **Vector-only workflows** — Pixelmator does some vector work but isn't a vector editor. SVG export works; serious vector authoring belongs in dedicated tools.
- **Pixelmator's plugin SDK** — public, but writing plugins is out of scope for this MCP server's mandate.

## Testing strategy

- Real-Pixelmator smoke per release: at least one `open → transform → export → close` round trip, confirmed by output file presence + size sanity check.
- Unit tests on AppleScript snippet generation (escapeAppleScriptString coverage, command parameter formatting).
- Format coverage smoke: export the same source to all 10 formats, verify each output exists and is non-empty.

Last reviewed: 2026-05-05 against Pixelmator Pro 4.2 — deep research swarm with full sdef read.
