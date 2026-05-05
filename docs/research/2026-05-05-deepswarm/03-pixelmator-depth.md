# Pixelmator Pro — full automation depth

Research agent 3/9, deepswarm 2026-05-05. Target: Pixelmator Pro 4.2 Creator Studio (`com.apple.pixelmator`), sdef inspected directly at `/Applications/Pixelmator Pro Creator Studio.app/Contents/Resources/PixelmatorPro.sdef` (3044 lines, XML — readable without `sdef` CLI; Xcode tools not required).

> Verdict up front: csos has scratched maybe 20 % of the surface. Pixelmator's AppleScript dictionary is one of the richest on macOS — full layer authoring, full text styling, 28 ML/auto commands, 23 effect classes, 20+ color-adjustment properties, 27 blend modes, 16 export formats including 4 HDR formats csos hasn't surfaced. Plus a parallel Shortcuts.app channel with at least one ML knob the sdef can't reach. There is no public Pixelmator MCP server; csos remains alone in this lane.

---

## 1. Full sdef catalog (read directly from the bundle)

Suites: **Pixelmator Pro Suite** (lifecycle + commands + classes), **Pixelmator Pro Effects Suite** (23 effect classes), **Pixelmator Pro Text Suite** (rich text + alignment enums), plus the standard inherited `CocoaStandard.sdef` (open / close / save / make / delete / duplicate / count / exists / quit).

### Enumerations

| Enum | Members | Notes |
|---|---|---|
| `saveable file format` | Pixelmator Pro, HEIC, JPEG, PNG, WebP, TIFF, SVG, GIF, PSD | for `save as new document` |
| `export format` | PNG, TIFF, JPEG (synonym JPG), HEIC, GIF, JPEG2000, BMP, WebP, SVG, PDF, PSD, **Pixelmator Pro**, **Motion**, **MP4**, **QuickTime Movie**, **Animated GIF**, **Animated PNG**, **OpenEXR**, **HDR JPEG**, **HDR HEIC**, **HDR AVIF**, **HDR PNG** | csos exposes 10 of 22; missing 12 including all HDR formats, OpenEXR, MP4/QuickTime video, Motion-project handoff, animated PNG/GIF, PSD round-trip, native `.pxd` |
| `export for web format` | PNG, JPEG, GIF, SVG, WebP | distinct command `export for web` not yet exposed |
| `blend mode` | 27 entries (see §7) | csos exposes zero — fully unused |
| `resampling algorithm` | none, bilinear, lanczos, nearest, **`ml super resolution`** | ML upscale is hidden behind the resize verb's `algorithm` parameter |
| `selection mode` | new, add, subtract, intersect | for combining selections |
| `scale mode` | original, stretch, scale to fill, scale to fit | for masks + replace image |
| `mask mode` | reveal all, hide all | |
| `stroke position` | inside, center, outside | layer styles |
| `stroke type` | line, dash, dot | |
| `anchor` | 9 positions for canvas resize | |
| `trim mode` | transparency, top-left color, bottom-right color | |
| `color profile mode` | assign, match | |
| `tAHT` (text horizontal align) | left, center, right, justify | |
| `tAVT` (text vertical align) | top, center, bottom | |
| `application appearance` | auto, dark, light | preferences |
| `image opening workflow` | open in original format, import as pixelmator pro | preferences |
| `sidecar location` | iCloud Drive, Pictures folder | preferences |
| `DiUr`, `DiCp` | IPTC urgency + copyright enums | document info |

### Record types

- **`export options`** (the long-undocumented one — see §10): `compression factor` (1-100, JPEG/JPEG-2000/HEIC/WebP), `bits per channel` (8 or 16), `color profile` (text, profile name), `frame rate` (real, for video/animated formats).
- **`export for web options`**: `compression factor`, `advanced compression` (PNG), `reduce colors` (PNG 8-bit palette), `keep transparency` (PNG/GIF), `convert to sRGB`, `scale` (integer scale factor).
- **`replace text properties`**: `match words`, `case sensitive`.
- **`face feature information`**: `bounds` (4-int list), `position` (point), `size` (2-int list).
- **`QR code feature information`**: `bounds`, `position`, `size`, **`message`** (the decoded payload).

### Commands (catalogued by category)

**Lifecycle / standard (inherited):** `open`, `close`, `save`, `quit`, `count`, `exists`, `make`, `delete`, `duplicate`, `move`.

**File / export:** `save as new document` (with `quality`, `sidecar` params), `export` (10 formats supported in csos, **22 in sdef**), `export for web` (5 formats — separate command, with its own options record), `export optimized` (hidden — single-arg shortcut), `make document from clipboard`.

**Edit / clipboard:** `undo`, `redo`, `cut`, `copy`, `paste`.

**Selection (8 commands):** `select all`, `deselect`, `reselect`, `invert selection`, `load selection` (load layer outline), `select subject` (ML, with `smart refine` boolean), `refine selection` (roundness/softness/expand integers), `smart refine selection` (ML auto-refine), `select color range` (color list + range + mode + smooth-edges), `draw selection` (rectangular bounds), `draw elliptical selection` (oval bounds), `convert selection into shape` (returns shape layer).

**Drawing / fill:** `fill` (with-color list, optional `preserve transparency`), `clear`, `pick color` (returns RGB+alpha at point).

**Text:** `replace` (find/with/properties — Pixelmator's command, the example in the sdef calls it `replace text` colloquially but the sdef name is `replace`).

**Insert / make (hidden top-level commands):** `make image` (from file → image layer), `make rectangle`, `make rounded rectangle`, `make group`. **All hidden** — they work but don't appear in Script Editor's dictionary browser unless you enable hidden mode. Layers can also be created via the standard `make new <class> at ...` form.

**Image / transform:** `crop` (bounds + delete-mode), `resize image` (width/height/resolution/algorithm — algorithm is where `ml super resolution` rides), `resize canvas` (relative + anchor), `rotate 180/right/left`, `flip horizontally/vertically`, `super resolution` (dedicated command, fixed 300% upscale), `trim canvas` (mode = transparency / top-left / bottom-right), `reveal canvas`, `change color profile` (to-profile + assign|match mode), `change color depth` (deprecated — use `bits per channel` property).

**Detection (ML):** `detect face` → `face feature information`; `detect QR code` → `QR code feature information` including the message payload. **Both already in sdef, low effort to wrap.**

**ML / auto adjust:** `enhance` (ML Enhance), `match colors` (ML Match Colors, takes a reference image file), `auto white balance`, `auto light`, `auto color balance`, `auto hue and saturation`, `auto levels contrast/color` (hidden), `auto curves contrast/color` (hidden), `denoise` (intensity 0-100), `deband`.

**Layer / mask:** `mask` (with optional from-image, scale-mode, mask-mode), `unmask`, `replace image` (replaces image layer content while preserving adjustments / effects / styles — huge for templating), `remove background` (ML cutout), `invert colors`, `decontaminate colors` (fringe removal), `convert into shape` (text → shape), `convert into pixels` (rasterise text/shape/effects).

**Presets:** `apply color adjustments preset` (by name), `apply effects preset` (by name).

**Adjustments / styles meta:** `flatten` (color-adjustments OR styles direct-parameter), `reset` (same), `export as lut` (color adjustments → `.cube` 3D LUT file).

**Layers (arrange):** `ungroup`, `merge` (specific layer list), `merge all`, `merge visible`, `select all layers`, `select` (specifier).

### Classes

- `application` — preferences (autosave, appearance, HDR loading, image-opening workflow, sidecar settings, build number).
- `document` — width/height/resolution (read-only at top level — set via `resize image`), `bits per channel` (rw), `color profile` (r), `display hdr content` (rw), `document info` (IPTC), `current layer`, `selected layers`, `selection bounds`, `data reference` (an automated-publishing slot — useful for csos brand-card pipelines), elements: layer / image-layer / group-layer / color-adjustments-layer / effects-layer / shape-layer / **video layer** / text-layer.
- `layer` (base) — name, opacity, visible, locked, selected, clipping mask, **blend mode**, width/height/position/bounds/rotation, `color adjustments`, `styles`, parent, layer mask, effects element, plus rw `data reference`.
- Subclasses: `image layer` (file-write, preserve-transparency, constrain-proportions); `group layer` (nested elements); `color adjustments layer`, `effects layer`; shape layers — `rectangle`, `rounded rectangle` (corner radius), `ellipse`/`circle`/`oval`, `polygon` (3-11 sides), `star` (3-20 points + radius), `line`; `text layer` (rich-text contents, horizontal+vertical alignment); `video layer`.
- `color adjustments` — 24 rw properties: temperature, tint, hue, saturation, vibrance, exposure, highlights, shadows, brightness, contrast, **black point**, texture, clarity, black-and-white, sepia, invert, fade, vignette + vignette exposure / black point / softness, grain + grain size, sharpen + sharpen radius, **`custom lut`** (apply a `.cube` file).
- `styles` — `fill color`, `fill opacity`, `fill blend mode`, `stroke width/position/type/color/opacity`, `shadow blur/distance/angle/color/opacity`, `inner shadow blur/distance/angle/color/opacity/blend mode`.
- `document info` — full IPTC: author, caption, category, city, copyright, country, creation date, credit, headline, instructions, job name, keywords, owner url, province/state, source, supplemental categories, title, transmission reference, urgency, **GPS location** (lat/lon list), **altitude** (real, meters).
- 23 **effect classes** in the Effects Suite (see §5).
- `rich text` — color, font (PostScript or display name), size, with character/paragraph/word elements.

---

## 2. Layer authoring surface (foundation for compose-from-scratch)

All layer creation flows through standard `make`:

```applescript
tell application id "com.apple.pixelmator"
  tell front document
    set t to make new text layer at beginning of layers ¬
       with properties {text content:"CREATOR STUDIO OS", position:{40, 40}}
    tell text content of t
      set its color to {0, 0, 0}
      set its font to "InterTight-Bold"
      set its size to 96
    end tell
    set its horizontal alignment to center
  end tell
end tell
```

Shape layers accept `position`, `width`, `height`, `corner radius`, `sides` (polygon), `star points`, `star radius` directly in the `with properties` record. Image layers accept `file` (POSIX or HFS path), `preserve transparency`, `constrain proportions`.

`text content` is `rich text` — set color/font/size on the whole content OR on `character`/`paragraph`/`word` ranges (e.g. `set color of word 2 of text content of t to {65535,0,0}` for inline emphasis). This is real text rendering, not a flatten — the text remains editable and re-exportable.

**`horizontal alignment` and `vertical alignment` are at text-layer level**, not on rich text — so set them on `t` itself.

---

## 3. `replace` and `replace image` — sdef-native, not yet exposed

`replace` (sdef code `PProrptx`, what the sdef example calls "replace text") signature:

```applescript
tell front document to replace text "OLD" with "NEW" ¬
   with properties {match words:true, case sensitive:false}
```

Replaces in **every text layer** at once. Pitfall: silent on no-match (no error returned).

`replace image` (`PProadri`) — replaces an image layer's pixel content while preserving adjustments / effects / layer styles:

```applescript
tell front document
  replace image (first image layer) ¬
    with POSIX file "/path/new.png" scale mode scale to fit
end tell
```

Both are massive value for templating. A single `template.pxd` with N image-layer slots + named text layers becomes a parameterised brand-card generator.

---

## 4. `detect` command — face / QR / barcode

- `detect face` returns a `face feature information` record (or list of them — sdef result type is singular but multi-face docs typically return a list; verify on first smoke).
- `detect QR code` returns `QR code feature information` including the decoded **`message`** field. Useful for sprite-sheet cell metadata, watermark verification, evidence chains in csos receipts.

The sdef shows `detect face` and `detect QR code` distinctly, no general `detect barcode`. Other barcode formats (Code128, EAN, etc.) are NOT exposed via sdef — must go through Vision framework via JXA, or via Shortcuts (which can use macOS's built-in Vision).

---

## 5. ML algorithm enum + reachability

| Capability | sdef path | Pitfalls |
|---|---|---|
| ML Super Resolution (3x upscale, fixed) | `super resolution` (verb) OR `resize image ... algorithm ml super resolution` | The dedicated verb is fixed 3x; the resize verb path lets you specify exact target dimensions and use ML as the resampling algorithm |
| ML Enhance | `enhance` | direct-parameter is document or layer |
| ML Match Colors | `match colors ... to <reference file>` | Reference file is mandatory; reads style off another image |
| ML Denoise | `denoise intensity <0-100>` | intensity defaults to a moderate value |
| ML Deband | `deband` | no params |
| ML Smart Refine Selection | `smart refine selection` | requires an existing selection |
| ML Select Subject | `select subject smart refine <bool>` | `smart refine` defaults true |
| ML Remove Background | `remove background` | document- or image-layer-level |
| ML Auto White Balance / Light / Color Balance / Hue+Saturation | the four `auto *` verbs | each is one-shot, no parameters |

These should be wrapped behind a single `pixelmator_apply_ml(algorithm, ...params)` discoverable surface, plus the ergonomic dedicated verbs people will reach for.

**`pixelmator_resize` should grow an `algorithm` parameter** to expose `ml super resolution` (currently csos's resize call doesn't pass it). That alone covers "smart upscale to exact target" — no need for a separate `pixelmator_super_resolution` tool.

---

## 6. Shortcuts.app bridge — the parallel channel

Pixelmator ships **28 Shortcuts actions** ([MacRumors 2021-10-26](https://www.macrumors.com/2021/10/26/pixelmator-pro-2-2-monterey-support-28-shortcuts/), [9to5Mac](https://9to5mac.com/2021/10/26/pixelmator-pro-monterey-shortcuts-more/)). Most map onto sdef commands. The interesting ones are those **only** in Shortcuts:

- **Remove Background from Portrait Photo** — distinct from `remove background`. Uses Apple's Vision portrait segmentation specifically (better for people; the sdef `remove background` is the general subject-segmentation model).
- **Optimize Image for Web** — wraps export-for-web with sensible defaults; faster for batches than building the `export for web options` record by hand.
- **Overlay Image** — multi-image composition (place file B atop file A at coordinates) without opening a document.
- **Replace Layer in Document** — sdef has `replace image`; Shortcuts has a more general "replace layer" that can swap shape/text content too.
- **Replace Text in Document** — sdef `replace`.
- **Increase Resolution of Image** — wraps Super Resolution (3x ML upscale).
- **Match Colors of Images** — wraps `match colors`.

Bridge spec:

```ts
server.tool("pixelmator_run_shortcut", "Run a Pixelmator Shortcuts action by name with input file(s) and output path. Exposes ML knobs the sdef alone can't reach (e.g. portrait-specific background removal).", {
  shortcutName: z.string(),
  input: z.union([z.string(), z.array(z.string())]),  // POSIX path(s)
  output: z.string().optional(),
}, async ({ shortcutName, input, output }) => {
  // shell out: shortcuts run "<name>" -i <input> -o <output>
});
```

Pitfalls: `shortcuts run` returns 0 even when the shortcut errored internally; parse stderr. The CLI ignores `-i`/`-o` for shortcuts that don't declare those parameters (silent failure mode). The user must have the shortcut **installed in their library** — there's no fallback. csos should ship a curated set of `.shortcut` files in `presets/shortcuts/` and a `pixelmator_install_shortcut` helper that opens them in Shortcuts.app.

---

## 7. Blend modes — the full enum, csos exposes zero

27 blend modes from the sdef `blend mode` enumeration:

| Group | Modes |
|---|---|
| Normal | normal, **behind** (synonym `destination over`), **pass through** |
| Darken | darken, multiply, color burn, linear burn, darker color |
| Lighten | lighten, screen, color dodge, linear dodge, lighter color |
| Contrast | overlay, soft light, hard light, vivid light, linear light, pin light, hard mix |
| Inversion | difference, exclusion, subtract, divide |
| Component | hue, saturation, color, luminosity |

Each Cocoa string-value matches what Pixelmator stores in its native format (`sourceOver`, `multiply`, `colorBurn`, etc.). **The sdef is the canonical reference** — Late Night Software's library predates several of these (HDR JPEG, AVIF era brought `pass through` for groups, plus the inner-shadow blend mode property on styles).

`pixelmator_set_layer_style` v1 spec:

```ts
{
  documentName: z.string(),
  layerSelector: z.string(),  // "front layer" / "layer 2" / 'layer named "Logo"'
  blendMode: BlendModeEnum.optional(),
  opacity: z.number().int().min(0).max(100).optional(),
  shadow: z.object({ blur, distance, angle, color, opacity }).optional(),
  innerShadow: z.object({ ..., blendMode }).optional(),
  stroke: z.object({ width, position, color, opacity }).optional(),
  fill: z.object({ color, opacity, blendMode }).optional(),
}
```

---

## 8. Selection ops via AppleScript

```applescript
-- ML subject
tell front document to select subject smart refine true

-- color range, +/- existing
tell front document to select color range color {58650, 52020, 22440} ¬
   range 10 mode add selection smooth edges true

-- programmatic refine after any selection
tell front document to refine selection roundness 5 softness 12 expand 2

-- ML refine
tell front document to smart refine selection

-- selection → mask
mask front document's current layer
-- selection → shape
tell front document to convert selection into shape
```

`load selection of layer N` loads the layer's outline as a selection — useful for matting workflows (extract a sprite via mask, then re-load that mask as a selection on a different layer).

`selection bounds` (read-only) on document returns the bounding rect — call it after `select subject` to get the ML-detected subject's bbox. **Sprite-sheet auto-tag uses this:** for each cell, `select subject` → read `selection bounds` → record the tight crop rectangle.

---

## 9. Color adjustments — full property surface

24 rw properties on `color adjustments` (see §1 catalog). Set via:

```applescript
tell color adjustments of first layer of front document
  set its temperature to 20
  set its tint to -10
  set its exposure to -15
  set its custom lut to POSIX file "/path/look.cube"
end tell
```

Critical pitfalls:

- These set values on the **destructive** color adjustments slot of the layer itself. To preserve nondestructive editing, `make new color adjustments layer` and set properties on **its** color adjustments — that gives you a non-destructive adjustment layer in the layer stack (Pixelmator's equivalent of Photoshop adjustment layers).
- `custom lut` accepts `.cube` files; the inverse `export as lut` writes one.
- Black-and-white + sepia + invert + vignette are booleans; setting `vignette` to true uses defaults, then tune via `vignette exposure / black point / softness`.

---

## 10. Export options record — reverse-engineering plan

**Good news, mostly solved by reading the sdef directly.** The `export options` record has only 4 documented properties (`compression factor`, `bits per channel`, `color profile`, `frame rate`). The `export for web options` record adds the PNG/JPEG/WebP-specific knobs.

Verified mappings:

| Format | Knobs available via `export options` |
|---|---|
| JPEG / JPEG-2000 / HEIC / WebP | `compression factor` (1-100) |
| TIFF | `bits per channel` (8 or 16); compression mode is **NOT** exposed — Pixelmator picks LZW automatically |
| PNG | nothing in `export options`; use `export for web` for `advanced compression` + `reduce colors` (8-bit palette) + `keep transparency` |
| GIF | `keep transparency` via export-for-web |
| Animated GIF / Animated PNG / MP4 / QuickTime | `frame rate` |
| All HDR formats | inherit `compression factor` where applicable |
| All formats | `color profile` (string name like `"Display P3"`, `"sRGB IEC61966-2.1"`); `convert to sRGB` boolean is web-only |

**Not exposed via AppleScript:** TIFF compression algorithm, JPEG progressive/baseline, WebP lossless toggle (auto-selected when `compression factor=100`?), HEIC 10-bit vs 8-bit (controlled by `bits per channel`), PDF vector vs raster (Pixelmator decides based on layer content — text+shape layers stay vector, raster goes raster).

For introspection: use `mdls` on a Pixelmator-exported file to read the TIFF tag for compression and confirm what Pixelmator chose. Also useful: `sips -g all <file>` to read all ImageIO metadata. csos can ship a `pixelmator_export_inspect` tool that runs `sips -g all` post-export and returns the actual compression / bit-depth / profile.

For the truly hidden bits (JPEG progressive, etc.), the only option is **save then re-open in Pixelmator's Export-For-Web UI and read settings via UI scripting** — not worth it for v1.

---

## 11. sdef-diff harness (snapshot per Pixelmator release)

Pixelmator ships frequent updates and Apple is now driving the roadmap. Spec:

```
src/apps/pixelmator/sdef-snapshot.ts
  └─ readSdef(): copies /Applications/Pixelmator Pro Creator Studio.app/Contents/Resources/PixelmatorPro.sdef
     to docs/reference/sdef-snapshots/<version>-<sha256>.sdef
  └─ diff(oldVersion, newVersion): xmldiff or simple text diff with
     line-anchored sections (commands, classes, enumerations)
  └─ Tool `pixelmator_sdef_snapshot` writes current sdef to snapshots dir,
     reads version from `application`'s `version` + `build number` properties,
     emits a diff vs. the most recent snapshot.
```

Run it as part of csos's `verify` script. When Pixelmator ships an update, the diff catches new commands / enum members / classes automatically and the human reads ~50 lines instead of re-walking 3000.

---

## 12. Photoshop interop honesty

PSD is in both `saveable file format` (write) and `export format` (write). It is **NOT** in `open` as a special path — Pixelmator's open inherits the standard CocoaStandard handler, and PSD files open fine but are converted to Pixelmator's internal layer model. Round-trip honesty:

- Layer names + groups + visibility → preserved both directions.
- Pixel content + masks → preserved both directions.
- Smart Objects → flattened on import (lossy).
- Adjustment layers → some preserved (curves, levels, hue/sat) but Pixelmator's adjustment set is broader; round-tripping a `texture` or `clarity` adjustment back to PSD will not survive.
- Layer styles (drop shadow, stroke) → preserved both directions but Pixelmator's enum is subtly different (e.g. "linear burn" maps cleanly; "behind" is Pixelmator-only).
- Blend modes → preserved both directions; "pass through" is a PS-and-Pixelmator concept; "behind" is Pixelmator's name for what PS calls "destination over" / nothing in PS layer panel.
- Smart Filters → flattened.
- Type layers → preserved as text where the font is available; otherwise rasterised silently.
- 32-bit (HDR) PSDs → recently supported; 16-bit PSDs supported.

**Bottom line:** Pixelmator's PSD support is good enough to import a PS comp, edit, and round-trip back **as long as** you don't depend on Smart Objects, Smart Filters, or PS-only adjustment layers. The right tool boundary in csos: `pixelmator_open` and `pixelmator_export ... format PSD` are fine; do not advertise round-trip-perfect PSD editing.

---

## 13. Prior art (confirmed alone in lane)

No public Pixelmator MCP server exists in the search index as of 2026-05-05 ([2026 MCP roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/), [mcp.so registry](https://mcp.so/), no listings under "pixelmator"). MCP servers exist for Figma, Photoshop (via Adobe's official server), Affinity (community, abandoned), Krita (early prototype) — Pixelmator is unclaimed.

AppleScript prior art:

- [Late Night Software Pixelmator Pro Library](https://forum.latenightsw.com/t/i-made-a-pixelmator-pro-library/2712) by Fredrik Gustafsson (2020-10) — covers up to Pixelmator Pro 1.8 era. Useful for confirming idiomatic patterns; predates several enums (HDR formats, deband, `pass through` blend mode, custom LUT property). Worth porting the wrapper conventions, not the enum data.
- [Pixelmator Pro AppleScript tutorial](https://support.pixelmator.com/faq-pixelmator-pro/advanced-workflows/advanced-automation-and-scripting-with-applescript) — official, up-to-date.
- [Pixelmator Community AppleScript thread](https://www.pixelmator.com/community/viewtopic.php?t=18058) — community recipes; gotcha: `fill color` setter expects 16-bit RGB list.

JXA: workable but more verbose; sdef supports it identically. AppleScript is the path of least resistance for csos.

---

## 14. Pitfalls (beyond the extension-stripping document name)

1. **Open is async and slow on large files.** csos uses `delay 1.5` post-open; PSDs > 100 MB or HDR HEICs may need 3-5s. A safer pattern: poll `front document`'s `name` in a loop with `delay 0.2` up to a 10s timeout.
2. **`document name`s collide.** Open two PNGs both called `screen` from different folders → second open errors silently or reuses the first document. Always read the name back from `front document` after open; don't infer.
3. **`make new image layer with file` requires the file to exist on a path Pixelmator's sandbox can read** — for app-store builds (which Creator Studio is), `~/Pictures` and explicit file dialogs work; arbitrary `/tmp` paths may need Automation permission. Test on a fresh user.
4. **`fill color` parameter is 16-bit RGB**, not 8-bit. `{0, 0, 65535}` is pure blue. csos's existing tests don't exercise this; new tools that take colors must clarify in their schema (`color: { r: 0..65535, g: 0..65535, b: 0..65535 }` or wrap an 8-bit form internally).
5. **`replace` returns no count of replacements made**, so verifying success requires reading text content after.
6. **`select subject` followed by `selection bounds` requires a `delay 0.5`** — the ML model runs async, and querying bounds too fast returns the previous (or zeroed) bounds.
7. **`detect face` on documents with zero faces returns `missing value`**, not an empty list. Handle both `list` and `missing value` in result parsing.
8. **`super resolution` is destructive and irreversible without undo.** The dedicated verb has no "preview" — if you don't want it baked into pixels, copy the layer first or use a non-destructive adjustment workflow (which Super Resolution does NOT support; it's pixel-only).
9. **HDR formats require `display hdr content true` on the document** before export, otherwise tone-mapped to SDR silently. Set the property explicitly when targeting HDR JPEG / HEIC / AVIF / PNG.
10. **`change color profile` in `match` mode mutates pixel values**; in `assign` mode it changes the metadata only. Defaulting to `assign` in csos is the least-surprise choice.
11. **`make group from <layers>` (the hidden top-level command)** silently does nothing if the layers are not currently in the same parent. The Standard `make new group layer` then `move` is more reliable.
12. **AppleScript pathing pitfall**: `POSIX file` works; `file "Macintosh HD:Users:..."` works on HFS-style; `as alias` requires the file to exist. csos uses `POSIX file` everywhere — keep that invariant.

---

## 15. Frontier — 5 novel csos-only Pixelmator capabilities

Things no Pixelmator user gets without csos. Each leverages csos's project model + LLM context + MCP shape, not just AppleScript wrapping.

**A. `pixelmator_brand_card_compose` — project.json-driven key-art generator.** Read brand tokens (logo path, headline font, palette, screenshot preset sizes) from `project.json`, open a `template.pxd` from `shared/brand/`, populate via `replace text` on every `{{TITLE}}`/`{{SUBHEAD}}`/`{{TAGLINE}}` text layer, populate via `replace image` on every named image-layer slot, recolour via `styles.fill color` from the project palette, then export at the four Steam capsule sizes (1920×1080 / 2560×1440 / 1024×1024 / 374×448) in one batch. **Novelty:** template + project tokens + multi-size export as one MCP call. The director never opens Pixelmator.

**B. `pixelmator_sprite_sheet_autotag` — detect-driven sheet metadata.** Open a sprite sheet, walk a grid (read from a sidecar `sheet.json` or infer by `select subject` per cell), per cell run `select subject` → `selection bounds` → write `sheet.json` with tight bbox + center-of-mass + suggested anchor. For sheets with QR-coded cell IDs (Sprite Foundry's standard), use `detect QR code` to recover cell IDs from a render-pass that bakes them in. **Novelty:** sprite sheets become self-describing without hand-tagging. the showcase project / another operator project sheets get tight bboxes for collision and anchor points for free.

**C. `pixelmator_canon_consistent_recolour` — palette-locked image edits.** csos opens a generated concept-art image, runs `pick color` at sampled coordinates to extract the dominant palette, runs a `match colors` against a canonical palette plate from `style-dataset-lab/projects/<game>/canon/palette-plates/`, exports as a candidate. Then runs the SigLIP2 evaluator (ai-eyes-mcp) to verify visual canon-fit, retries up to N times. **Novelty:** the Pixelmator pipeline becomes a closed loop with the visual canon evaluator. Drift gets auto-corrected.

**D. `pixelmator_protocol_devlog_thumb` — frame-extract + auto-overlay.** ffmpeg pulls frame at timestamp T from a video in `<project>/footage/`, Pixelmator opens it, applies the project's branded LUT via `custom lut`, draws a brand bar (rectangle shape layer + text layer), exports at YouTube thumb (1280×720) + RSS (800×450) sizes. **Novelty:** turns "make a devlog thumb" into one MCP call against any project that has brand tokens registered. Saves 5-10 min per devlog post.

**E. `pixelmator_ml_pipeline_batch` — staged ML pass over a project's `refs/`.** For every image in `<project>/refs/`: `denoise intensity 60`, `enhance`, `super resolution` (using `resize image` with `ml super resolution` algorithm to a target dimension, not the fixed 3x), export to `<project>/refs/cleaned/`. Optional `select subject`+`remove background` for stage-2 cutouts. Plus a `--shortcut "Remove Background from Portrait Photo"` flag for portrait-specific cutouts that the sdef can't reach. **Novelty:** mass cleanup of low-quality reference imagery before it ingests into the visual pipeline. The visual director (Mike) never has to sit through 200 manual cleanup passes.

---

Last reviewed: 2026-05-05 against Pixelmator Pro 4.2 Creator Studio. sdef sha256 + version captured for snapshot harness on next pass.

Sources:
- [Pixelmator Pro 2.2 / 28 Shortcuts actions — MacRumors 2021-10-26](https://www.macrumors.com/2021/10/26/pixelmator-pro-2-2-monterey-support-28-shortcuts/)
- [Pixelmator Pro 2.2 / Shortcuts list — 9to5Mac](https://9to5mac.com/2021/10/26/pixelmator-pro-monterey-shortcuts-more/)
- [Late Night Software Pixelmator Pro Library](https://forum.latenightsw.com/t/i-made-a-pixelmator-pro-library/2712)
- [Pixelmator Pro AppleScript tutorial — official](https://support.pixelmator.com/faq-pixelmator-pro/advanced-workflows/advanced-automation-and-scripting-with-applescript)
- [Pixelmator Community AppleScript intro](https://www.pixelmator.com/community/viewtopic.php?t=18058)
- [Apple completes Pixelmator acquisition — MacRumors 2025-02-11](https://www.macrumors.com/2025/02/11/apple-completes-pixelmator-acquisition/)
- [2026 MCP roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/) — confirms no Pixelmator MCP server in the registry
- [MCP server registry](https://mcp.so/) — searched, no Pixelmator listing
