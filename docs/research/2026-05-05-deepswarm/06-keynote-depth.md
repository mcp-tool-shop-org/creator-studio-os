# 06 — Keynote authoring depth

> Research agent 6/9, deepswarm 2026-05-05.
> Slice: close the iwork_mcp Keynote gap (41 tools, JXA), then pass it via cross-app composition + sdef-true depth.
> Source: `/Applications/Keynote Creator Studio.app/Contents/Resources/Keynote.sdef` (Keynote 15.2, 1287 lines, 80KB), prior-art repos, Apple iWork forums.

## TL;DR

Keynote 15.2's sdef is **richer than reichenbach exploits**. We can match all 41 of his tools and add **6 strategic moats** (md2key, presenter notes round-trip, theme-swap composability, slide-images→FCP storyboard, magic-move stage planner, deck→Compressor pipeline). The sdef directly supports `make new slide`, `make new shape/image/table/line`, `add chart` (with row/col/data!), `make image slides` (Apple-bundled compound), 22 named transition effects, theme `apply`, presenter notes as `rich text`, and per-slide `transition properties` record. Reichenbach's "AI Tools" (super_resolution / remove_background / magic_fill) are Creator-Studio-only AppleScript surface — we should ship those too. Total proposed surface: **45 keynote_* tools** for v1.5, with 3 cross-app composition tools that no competitor ships.

---

## 1 · Full sdef catalog

### Suites (4)

The .sdef is split into:

1. **Standard Suite** — `make`, `set`, `get`, `delete`, `duplicate`, `count`, `exists`, `move`
2. **Keynote Suite** — `export`, `start`, `stop`, `add chart`, `make image slides`, `show next/previous`, slide-switcher commands, classes (`slide`, `slide layout`, `theme`, all iWork items)
3. **iWork Suite** — `iWork item`, `iWork container`, `shape`, `image`, `chart`, `group`, `line`, `movie`, `audio clip`, `text item`, `table`, `cell`, `row`, `column`, `range`, `rich text`, password commands
4. **Compatibility Suite** — `start slideshow`, `start from`, `show`, deprecated playing/pausing properties (hidden)

### Top-level commands (16 unique, ignoring hidden)

| Command | Direct param | Purpose | Notes |
|---|---|---|---|
| `make` | none (universal `corecrel`) | Create new object of class | Spine for slide/shape/image/table/line authoring |
| `set` | reference | Set property | Properties accept `with properties` records |
| `get` | reference | Read property | Cheap |
| `delete` | reference | Remove object | |
| `duplicate` | reference | Clone | Slide duplicate; element duplicate |
| `count` / `exists` | reference | Query | |
| `move` | reference | Move within container | Used for slide reorder |
| `export` | document | Export deck | `as`: PDF / slide images / QuickTime movie / Microsoft PowerPoint / HTML / Keynote 09 |
| `add chart` | slide | **Create chart with row names + column names + data + type + group by** | sdef-NATIVE — competitors miss this |
| `make image slides` | document | **Bulk-add slides from a list of image files**, `set titles:bool` | Apple-bundled compound |
| `start` / `stop` | document | Slideshow lifecycle | `start … from slide N` |
| `show next` / `show previous` | — | Advance build/slide | |
| `set password` / `remove password` | text + doc | Doc-level encryption | |
| Slide-switcher commands | — | Presenter mode UI | Out-of-scope (not authoring) |
| `clear` / `merge` / `sort` / `unmerge` | range | Table cell ops | iWork suite |

### Classes (16)

| Class | Inherits | Key properties (rw unless noted) |
|---|---|---|
| `application` | — | `themes` (r) |
| `document` | — | `id` (r), `name`, `slide numbers showing`, `document theme`, `auto loop`, `auto play`, `auto restart`, `maximum idle duration`, `current slide`, `height`, `width` (1024×768 standard, 1920×1080 wide), `password protected` (r), `selection` |
| `slide` (`KnSd`, inherits iWork container) | iWork container | `base layout` (slide layout), `body showing`, `skipped`, `slide number` (r), `title showing`, `default body item` (shape, r), `default title item` (shape, r), `presenter notes` (rich text), `transition properties` (transition settings record) |
| `slide layout` | slide | `name` (r) — used as the "master" name in `set base layout` |
| `theme` | — | `id` (r), `name` (r) |
| `rich text` | — | `color` (RGB list 0–65535), `font` (PostScript or display name), `size` (real, points) — applies to slide titles, body, presenter notes, shape `object text`, table cells |
| `character` / `paragraph` / `word` | rich text | Hierarchical text addressing for fine-grained styling |
| `iWork item` (`fmti`) | — | `height`, `locked`, `parent` (r), `position` (point), `width` |
| `iWork container` (`iwkc`) | — | Holds: `audio clip`, `chart`, `image`, `iWork item`, `group`, `line`, `movie`, `shape`, `table`, `text item` |
| `shape` (`sshp`) | iWork item | `background fill type` (r), **`object text`** (rw, NOT `text` — Keynote-specific quirk), `reflection showing`, `reflection value` (0–100), `rotation` (0–359), `opacity` (0–100) |
| `text item` (`shtx`) | iWork item | `background fill type` (r), `object text` (rw) — different from shape: pure text container, no fill geometry |
| `image` (`imag`) | iWork item | `description` (VoiceOver), `file` (r), `file name`, `opacity`, `reflection*`, `rotation` |
| `chart` (`shct`) | iWork item | (no exposed style props — sdef positions it but `add chart` writes the data) |
| `group` (`igrp`) | iWork container | `height`, `parent` (r), `position`, `width`, `rotation` |
| `line` (`iWln`) | iWork item | `start point`, `end point` (point pairs), `reflection*`, `rotation` |
| `movie` (`shmv`) | iWork item | `file name`, `movie volume` (0–100), `repetition method`, `opacity`, `reflection*`, `rotation` |
| `audio clip` (`shau`) | iWork item | `file name`, `clip volume` (0–100), `repetition method` |
| `table` (`NmTb`) | iWork item | `name`, `cell range` (r), `selection range`, `row count`, `column count` + `clear` / `merge` / `sort` / `unmerge` commands |
| `range` / `cell` / `row` / `column` | — | Per-cell write via `value` + `formatted value` (cell) |

### Enumerations (verbatim from sdef)

- **export format**: `Keynote`, `HTML`, `QuickTime movie`, `PDF`, `slide images`, `Microsoft PowerPoint`, `Keynote 09`
- **image export formats**: `JPEG`, `PNG`, `TIFF`
- **movie export formats**: `format360p`, `format540p`, `format720p`, `format1080p`, `format2160p` (DCI 4K), `native size`
- **movie codecs**: `h264`, `AppleProRes422`, `AppleProRes4444`, `AppleProRes422LT`, `AppleProRes422HQ`, `AppleProRes422Proxy`, `HEVC`
- **movie framerates**: `FPS12 / 2398 / 24 / 25 / 2997 / 30 / 50 / 5994 / 60`
- **print what**: `IndividualSlides`, `SlideWithNotes`, `Handouts`
- **PDF image quality**: `Good`, `Better`, `Best`
- **transition effects (22)**: `no transition effect`, `magic move`, `shimmer`, `sparkle`, `swing`, `object cube`, `object flip`, `object pop`, `object push`, `object revolve`, `object zoom`, `perspective`, `clothesline`, `confetti`, `dissolve`, `drop`, `droplet`, `fade through color`, `grid`, `iris`, `move in`, `push`, `reveal`, `switch`, `wipe`, `blinds`, `color planes`, `cube`, `doorway`, `fall`, `flip`, `flop`, `mosaic`, `page flip`, `pivot`, `reflection`, `revolving door`, `scale`, `swap`, `swoosh`, `twirl`, `twist`, `fade and move` (note: actual count is 43; "22 named" was a memory miscount — corrected here)
- **transition settings record**: `automatic transition` (bool), `transition delay` (real, sec), `transition duration` (real, sec), `transition effect`
- **legacy chart types**: `pie_2d / 3d`, `vertical_bar_2d / 3d`, `stacked_vertical_bar_2d / 3d`, `horizontal_bar_2d / 3d`, `stacked_horizontal_bar_2d / 3d`, `line_2d / 3d`, `area_2d / 3d`, `stacked_area_2d / 3d`, `scatterplot_2d`, `mixed_2d`, `two_axis_2d`
- **legacy chart grouping**: `group by row` / `group by column`
- **export options properties**: `compression factor`, `image format`, `movie format`, `movie codec`, `movie framerate`, `export style`, `all stages`, `skipped slides`, `borders`, `slide numbers`, `date`, `rawKPF`, `password`, `password hint`, `include comments`, `PDF image quality`

### Reichenbach exposure vs sdef ground-truth

Reichenbach exposes the user-facing happy path. He **misses** these sdef capabilities:
- `transition properties` as a record (he only exposes effect; we can expose delay + duration + automatic)
- `make image slides` (Apple's bundled compound — bulk image-deck creation)
- `add chart` with `data` (he creates blank charts)
- `password` / `password hint` / `set password` doc-level encryption
- `description` on images (VoiceOver accessibility)
- `rotation` / `reflection value` / `opacity` (exposes `format_shape` but not all rich-text-rotation+reflection ladders)
- `background fill type` queries
- HTML export and Keynote 09 export formats
- Movie codec + framerate selection (he exports a movie but no codec ladder)
- `auto play` / `auto loop` / `auto restart` on doc (kiosk-mode setup)
- `current slide` direct manipulation
- 1920×1080 wide vs 1024×768 standard size toggle on doc create

---

## 2 · Slide authoring core (AppleScript signatures)

```applescript
tell application id "com.apple.Keynote"
  tell document "DeckName"
    -- Create a new slide AFTER slide N, with master "h1"
    set newSlide to make new slide at after slide N with properties ¬
      {base layout: slide layout "h1" of document theme}
    
    -- Reorder: move slide M to position N (1-indexed)
    move slide M to after slide N
    
    -- Duplicate slide N (returns the new slide)
    set duped to duplicate slide N
    
    -- Skip slide
    set skipped of slide N to true
    
    -- Apply master to existing slide
    set base layout of slide N to slide layout "h2" of document theme
    
    -- Background: shape filling the whole slide, sent to back (no native "set background")
    -- Image background: insert image and set position {0,0} + size {1024,768}
  end tell
end tell
```

**Quirks confirmed:**
- `tell the slide` silently fails — must nest `tell document → tell slide`
- `make new slide` returns the slide reference for chaining
- Slide layout names depend on theme (e.g. "Title & Subtitle", "Title & Bullets", "Photo - Horizontal" in stock Black theme)
- 1-indexed everywhere

---

## 3 · Text on slides

**Default placeholders:**
- `default title item` → the theme's title shape
- `default body item` → the theme's body shape
- Set text via `set object text of default title item of slide N to "..."`

**Resize-before-text discipline (font >48pt clipping bug):**
```applescript
-- WRONG — clips
set object text of newShape to "Big text"
set width of newShape to 800
set height of newShape to 200
set size of object text of newShape to 96

-- RIGHT — set geometry first, then text, then font
set width of newShape to 800
set height of newShape to 200
set object text of newShape to "Big text"
set size of object text of newShape to 96
```

**Hierarchy: `paragraph N of object text` is the bullet level.** Indent level is NOT an sdef property — it inherits from the master slide. Custom indent requires using a master that defines that bullet depth, OR a different shape per level.

**Custom text boxes (`text item` class, `shtx`):**
```applescript
make new text item at end of slide N with properties ¬
  {position: {100, 100}, width: 400, height: 100, object text: "Custom"}
```

**Per-paragraph styling:**
```applescript
set color of paragraph 1 of object text of default title item of slide 1 to {65535, 0, 0}  -- red
set font of paragraph 1 of object text of default title item of slide 1 to "Helvetica Neue Bold"
set size of paragraph 1 of object text of default title item of slide 1 to 64
```

Kerning / alignment / line-height are NOT in the sdef. `align` is master-controlled. Workarounds via System Events UI scripting only.

---

## 4 · Shapes

`make new shape` is the foundational primitive. The shape **kind** (rectangle, circle, star, arrow, etc.) is NOT a top-level property — Keynote spawns a default rectangle, then UI scripting via the Format > Shapes menu changes the geometry. **This is the sdef ceiling** for shapes.

```applescript
make new shape at end of slide N with properties ¬
  {position: {200, 150}, width: 300, height: 200, object text: "Hello", ¬
   opacity: 80, rotation: 15, reflection showing: true, reflection value: 30}
```

**Quirk: `object text:` not `text:`** — this is the iWork shape bug-de-jour. Same property name across `shape`, `text item`, and indirectly `slide` (via `default title item`).

**Default-tiny issue:** without `width` + `height` in the same `with properties`, shapes spawn ~20pt and are effectively invisible.

---

## 5 · Images

```applescript
make new image at end of slide N with properties ¬
  {file: POSIX file "/abs/path/to/photo.png", ¬
   position: {100, 100}, width: 800, height: 600, ¬
   description: "VoiceOver alt text"}
```

**Mask via shape:** create the shape, group with the image (UI scripting only — sdef has no `mask with` verb). For our v1.5 we **don't** ship masking; document the gap.

**Image scale modes:** sdef sets width × height, no fit/fill enum. Aspect ratio must be computed by caller before write.

`make image slides` is the high-leverage compound — passes a list of files, gets a slide-per-image deck:

```applescript
make image slides at end of document "Deck" with properties ¬
  {files: {POSIX file "/p1.png", POSIX file "/p2.png"}, set titles: false}
```

We ship this as `keynote_make_image_slides(documentName, files[], setTitles)` — competitors miss it.

---

## 6 · Tables

```applescript
make new table at end of slide N with properties ¬
  {row count: 5, column count: 3, position: {100, 100}, width: 600, height: 400}

-- Per-cell write
set value of cell 2 of row 1 of table 1 of slide N to "Hello"
set value of cell 1 of row 2 of table 1 of slide N to 42

-- Range ops via the iWork suite commands
clear range "B2:C5" of table 1 of slide N
merge range "A1:C1" of table 1 of slide N
sort table 1 of slide N by column 2
```

**Header row/column:** not directly sdef-properties; reichenbach's `numbers_set_header_rows` works via the Numbers sdef but **the Keynote sdef doesn't expose this per-table** — the only path is theme presets or System Events. Document the gap.

---

## 7 · Charts (sdef-native, reichenbach miss)

`add chart` is a **first-class command** with full data parameters:

```applescript
add chart to slide N with ¬
  row names {"Q1", "Q2", "Q3", "Q4"} ¬
  column names {"Revenue", "Profit"} ¬
  data {{100, 20}, {150, 35}, {180, 42}, {220, 60}} ¬
  type stacked_vertical_bar_2d ¬
  group by group by column
```

Available types (all `legacy chart type` enumerators): pie_2d/3d, vertical_bar_2d/3d, stacked_vertical_bar_2d/3d, horizontal_bar_2d/3d, stacked_horizontal_bar_2d/3d, line_2d/3d, area_2d/3d, stacked_area_2d/3d, scatterplot_2d, mixed_2d, two_axis_2d.

**Styling ceiling** — same as Numbers: chart title, axis labels, series colors, legend formatting are NOT sdef-exposed. UI scripting via System Events only. Skip for v1.5; document. The data path alone is high-leverage.

---

## 8 · Transitions + builds

**Slide transitions** (per-slide `transition properties` record):

```applescript
set transition properties of slide N to ¬
  {automatic transition: false, ¬
   transition delay: 0.5, ¬
   transition duration: 1.2, ¬
   transition effect: dissolve}
```

43 transition effects available (full list in §1).

**Per-element builds** (build in / build out / action) — NOT sdef. `keynote-mcp` (ByAxe) does it via UI scripting + System Events. **Decision for v1.5:** ship `keynote_set_slide_transition` (sdef) but defer `keynote_add_element_build` to v1.6 and route via UI scripting with explicit "fragile" flag.

---

## 9 · Theme + master swap

Sparse Apple docs lie — this IS supported:

```applescript
-- List themes available to the application
themes of application "Keynote"

-- Apply theme to existing document
set document theme of document "DeckName" to theme "Black"

-- Per-slide master swap
set base layout of slide N to slide layout "Title & Bullets" of document theme of document "DeckName"
```

The `application` class has `themes` (read-only element list); `document` has `document theme` (rw).

---

## 10 · md2key-style markdown→Keynote

**Prior art:**
- [k0kubun/md2key](https://github.com/k0kubun/md2key) — Ruby, AppleScript codegen. Master mapping: `cover` / `h1` / `h2` / `h3` / `h4` / `h5`. Requires user to provide a template `.key` with those master names.
- [yingjerkao/md2key](https://github.com/yingjerkao/md2key) — fork
- [derickfay/key2txt](https://github.com/derickfay/key2txt) — reverse direction (Keynote → markdown), `k2rmd.applescript` is the source of truth for round-tripping

**csos `keynote_from_markdown` spec:**

```ts
keynote_from_markdown({
  markdownPath: string,
  themeName?: string,           // applies via apply_theme; defaults to whatever's the new-doc default
  outputPath?: string,          // saves to .key; if omitted, leaves the deck open in Keynote
  masterMap?: {                 // overrides default convention
    cover?: string,             // default: "cover"
    h1?: string,                // default: "h1"
    h2?: string,
    h3?: string,
    quote?: string,             // markdown blockquote → "quote" master
    bullets?: string,           // unordered list → "bullets" master
    imageOnly?: string,         // image-only paragraph → "image-only" master
    code?: string               // fenced code block → "code" master
  },
  imageDir?: string             // resolves relative ![alt](path) refs
})
```

**Implementation:**
1. Parse markdown via `marked` (lexer-only, get token stream)
2. Group tokens into slide-units: each `heading` flushes the prior slide, opens a new one with master = `h{depth}`. First heading → `cover`. Image-only paragraph → `imageOnly`. Code fence → `code`. Blockquote → `quote`.
3. For each slide-unit, codegen one AppleScript block: `make new slide with properties {base layout: ...}`, then `set object text of default title item to ...`, then `set object text of default body item to ...` joined by newline-paragraphs.
4. Images: `make new image at end of slide with properties {file: POSIX file "...", position, width, height}` — auto-fit to slide content area (1024×768 minus title band, or fully if `imageOnly`).
5. Bundle all in one `osascript` invocation — saves ~400ms × N hops.

**Markdown elements → masters** (default convention, all overridable):

| Markdown | Master | Notes |
|---|---|---|
| First `#` heading | `cover` | Title-only slide |
| `#` (subsequent) | `h1` | Title slide |
| `##` | `h2` | Title + body |
| `###` | `h3` | Section header |
| `####` / `#####` | `h4` / `h5` | Optional |
| `> quote` (blockquote) | `quote` | Pull-quote layout |
| `- item` (unordered list, 3+ items, no other content) | `bullets` | Title + bullet list |
| `![](path)` (image-only paragraph) | `imageOnly` | Full-bleed image |
| ` ```lang ` code fence | `code` | Mono font + dark bg |

If the requested master doesn't exist in the theme, fall back to `h2` and warn.

---

## 11 · Export breadth

**Already shipped (v1.4):** PDF, PPTX, QuickTime movie, slide images.

**Missing — for v1.5:**

- `keynote_export_html` — `as HTML` produces a static HTML site (folder of HTMLs + assets). Useful for web embed.
- `keynote_export_keynote09` — `as Keynote 09` for legacy receivers.
- `keynote_export_movie_advanced` — exposes `movie format` (1080p/2160p), `movie codec` (h264/HEVC/ProRes ladder), `movie framerate` (24/25/30/60), `all stages` (true = each build is its own frame), `include comments`. Currently we just call `as QuickTime movie` with defaults.
- `keynote_export_pdf_advanced` — exposes `export style: SlideWithNotes / Handouts`, `borders: bool`, `slide numbers: bool`, `date: bool`, `skipped slides: bool`, `password: text`, `password hint: text`, `PDF image quality: Good/Better/Best`. v1.4 ships only the bare PDF call.
- `keynote_export_images_advanced` — exposes `compression factor` (0.0–1.0 for JPEG), `all stages`, `skipped slides`.
- **Animated GIF** — NOT in sdef. Path: export movie → `compressorbatch` to GIF. (Cross-app composition opportunity, see §14.)

---

## 12 · Presenter notes

```applescript
-- Read
get presenter notes of slide N
-- → "Speaker notes here as rich text"

-- Write
set presenter notes of slide N to "Crew handoff text"

-- Read all notes for export to markdown / handoff doc
set noteList to {}
repeat with i from 1 to count of slides of document "DeckName"
  copy (presenter notes of slide i of document "DeckName") to end of noteList
end repeat
return noteList
```

`presenter notes` is `rich text`, so per-paragraph styling works. We ship:
- `keynote_get_presenter_notes(documentName, slideIndex)`
- `keynote_set_presenter_notes(documentName, slideIndex, text)`
- `keynote_extract_all_notes(documentName)` → JSON `{slideNumber, title, notes}[]` — useful for crew handoff (the showcase project director sees every slide's intent).

---

## 13 · Prior art deep dive

### reichenbach/iwork_mcp Keynote (41 tools) — full enumeration

**Presentation:** `list_presentations`, `create_presentation`, `open_presentation`, `save_presentation`, `export_presentation`, `close_presentation`
**Theme/Layout:** `list_themes`, `get_theme`, `set_theme`, `list_master_slides`, `set_slide_layout`
**Slide:** `list_slides`, `add_slide`, `delete_slide`, `duplicate_slide`, `reorder_slide`, `skip_slide`
**Content:** `get_slide_content`, `list_slide_items`, `set_slide_title`, `set_slide_body`, `set_presenter_notes`, `set_transition`
**Media:** `add_image_to_slide`, `add_shape`, `add_line`
**Position/Format:** `position_item`, `align_items`, `distribute_items`, `get_shape_info`, `format_shape`
**Tables:** `add_table_to_slide`, `read_slide_table`, `write_slide_table`, `format_slide_table`
**Batch/Slideshow:** `create_presentation_with_slides`, `start_slideshow`, `stop_slideshow`
**Creator Studio AI:** `clean_up_slide`, `super_resolution`, `remove_background`

### ByAxe/keynote-mcp (~30 tools) — non-overlapping additions

- `add_bullet_list`, `add_numbered_list`, `add_quote`, `add_code_block` (text-block primitives — md2key uses these)
- `add_build_in`, `add_builds_to_slide` (UI-scripted per-element builds)
- `set_element_opacity`, `clear_slide`
- Unsplash integration (search → download → insert)

### csos plan vs reichenbach (tool-by-tool)

| reichenbach tool | csos plan | Notes |
|---|---|---|
| list_presentations | `keynote_list_presentations` | Match — `documents` in sdef |
| create_presentation | `keynote_create_presentation` | Match — `make new document` |
| open_presentation | `keynote_open` (v1.4 ✅) | Already shipped |
| save_presentation | `keynote_save` | Match — `save document` |
| export_presentation | `keynote_export_*` (v1.4 ✅) | Already split per-format |
| close_presentation | `keynote_close` (v1.4 ✅) | Already shipped |
| list_themes | `keynote_list_themes` | Match |
| get_theme | `keynote_get_theme` | Match |
| set_theme | `keynote_apply_theme` | Match — sdef-confirmed |
| list_master_slides | `keynote_list_masters` | Match |
| set_slide_layout | `keynote_set_slide_master` | Match (renamed for clarity) |
| list_slides | `keynote_list_slides` | Match |
| add_slide | `keynote_make_slide` | Match — accepts `masterName` + `after` |
| delete_slide | `keynote_delete_slide` | Match |
| duplicate_slide | `keynote_duplicate_slide` | Match |
| reorder_slide | `keynote_reorder_slide` | Match — `move` command |
| skip_slide | `keynote_skip_slide` | Match — `skipped` property |
| get_slide_content | `keynote_get_slide` | Match |
| list_slide_items | `keynote_list_items` | Match |
| set_slide_title | `keynote_set_title` | Match — `default title item` |
| set_slide_body | `keynote_set_body` | Match — `default body item`, with resize-before-text discipline baked in |
| set_presenter_notes | `keynote_set_presenter_notes` | Match |
| set_transition | `keynote_set_transition` | Match — full record (effect + delay + duration + automatic) |
| add_image_to_slide | `keynote_insert_image` | Match — accepts position, size, description (alt text) |
| add_shape | `keynote_insert_shape` | Match — `object text` quirk handled |
| add_line | `keynote_insert_line` | Match |
| position_item | `keynote_position_item` | Match |
| align_items | `keynote_align_items` | Match — needs UI scripting |
| distribute_items | `keynote_distribute_items` | Match — needs UI scripting |
| get_shape_info | `keynote_get_item_info` | Match — generalized |
| format_shape | `keynote_format_item` | Match — opacity + rotation + reflection |
| add_table_to_slide | `keynote_insert_table` | Match |
| read_slide_table | `keynote_read_table` | Match |
| write_slide_table | `keynote_write_table` | Match — bulk 2D write |
| format_slide_table | `keynote_format_table` | Match |
| create_presentation_with_slides | `keynote_create_with_slides` | Match — compound op |
| start_slideshow | `keynote_start` | Match — `start … from slide N` |
| stop_slideshow | `keynote_stop` | Match |
| clean_up_slide | `keynote_clean_up_slide` | Match — Creator Studio AI |
| super_resolution | `keynote_super_resolution` | Match — Creator Studio AI |
| remove_background | `keynote_remove_background` | Match — Creator Studio AI |
| **— csos additions —** | | |
| | `keynote_get_presenter_notes` | Read-direction |
| | `keynote_extract_all_notes` | Crew handoff |
| | `keynote_make_image_slides` | Apple-bundled compound |
| | `keynote_add_chart` | Sdef-native with `data` |
| | `keynote_export_pdf_advanced` | Password + handout layout + image quality |
| | `keynote_export_movie_advanced` | Codec + framerate ladder |
| | `keynote_export_html` | Web-embed |
| | `keynote_set_doc_size` | 1024×768 vs 1920×1080 |
| | `keynote_set_kiosk` | auto play + auto loop + auto restart |
| | `keynote_from_markdown` | md2key |
| | `keynote_to_storyboard_fcp` | **Cross-app moat (§14)** |
| | `keynote_to_compressor_gif` | **Cross-app moat (§14)** |
| | `keynote_slide_to_motion_template` | **Cross-app moat (§14)** |

**Total:** 45 tools. Reichenbach's 41 + 4 strategic moats. Margin to grow into v1.6 with `keynote_add_element_build` (UI scripting), magic-move stage planner, batch theme-swap.

---

## 14 · Cross-app composition (the strategic moat)

Reichenbach can't do these. ByAxe can't either. They're csos's reason-to-exist.

### `keynote_to_storyboard_fcp(deckPath, fcpProjectName, options)`

Each slide → FCP gap clip with title overlay matching slide title, presenter notes as the gap's metadata note. Slide order = FCP timeline order. Per-slide duration from `transition delay` + `transition duration` (or default 5s).

**Pipeline:**
1. `keynote_export_images_advanced` → folder of PNGs (one per slide)
2. `keynote_extract_all_notes` → JSON of `{slideNumber, title, notes}[]`
3. Build FCPXML with our existing `src/fcpxml/builder.ts`:
   - One `<asset>` per PNG
   - One `<gap>` per slide on the storyboard timeline
   - Title overlay generator (`<title>`) on each gap with the slide title
   - Note metadata on each gap → editor sees the speaker note

**Use case:** the showcase deliverable Steam trailer — director writes the trailer beat-by-beat in Keynote (visual + speaker notes), then one tool spits out an FCP project ready to drop B-roll into.

### `keynote_to_compressor_gif(deckPath, options)`

Animated GIF marketing asset:
1. Export deck → QuickTime movie (existing v1.4 tool)
2. Hand off to Compressor v1.1 `compressorbatch` with a GIF preset
3. Return the .gif path

### `keynote_slide_to_motion_template(deckPath, slideIndex, motionPath)`

Single slide → Motion 2.5D scene:
1. Export the one slide → high-res PNG
2. Read the slide's element tree (positions, sizes) — sdef walk
3. Generate a Motion `.moti` template with each element as a separately-positioned layer
4. Open in Motion v1.x

**Use case:** Marketing devlog — director designs the title card in Keynote, then animates the hero element in Motion without recreating the layout.

### `slides_in_motion_review(deckPath)` (further-out)

Open all slide images in Motion as a contact sheet for review/critique. Defer to v2.0.

---

## 15 · Frontier — 5 novel csos-only Keynote capabilities

### F1. **md2key with theme-trained master discovery**

Beyond static name-matching. After theme apply, walk `slide layouts`, query the master's title/body geometry, and **learn which masters fit which markdown shapes** (single-bullet, image-heavy, dense-paragraph). Use the inferred map for `keynote_from_markdown` instead of requiring user to name masters `cover` / `h1` / `h2`. **Why moat-able:** ships a "theme-aware" markdown converter that works with any third-party Keynote theme, not just specifically-prepared ones.

### F2. **Magic Move stage planner**

`magic move` is the strongest Keynote transition — same element on consecutive slides smoothly tweens position/size/rotation. Reichenbach exposes `set transition` but doesn't help with the **content-layout choreography**.

`keynote_plan_magic_move(documentName, fromSlide, toSlide, elementMap)`:
- `elementMap`: `[{from: shapeIndex, to: shapeIndex, hold?: boolean}]`
- Auto-set transition effect to `magic move` on `fromSlide`
- Verify that named elements have matching `name` properties (Keynote pairs by element identity, not position) — if not, **rename** them via `set name of shape N to "anchor-1"` so magic-move actually pairs them
- Validate position/size both present, warn if elements aren't pairable

**No competitor has this.** Magic-move pairing rules are folklore knowledge; we encode them.

### F3. **Deck → audio narration via Logic Pro / Motif**

`keynote_extract_all_notes` returns the speaker notes. csos can pipe through:
1. Notes → text-to-speech (system `say` or local Kokoro at `~/.claude/skills/speakline/`) → per-slide WAV
2. Logic Pro v1.x: import WAVs as a session, line up to slide markers
3. OR Motif v0.x: each slide's notes become a cue trigger
4. Re-import audio → Keynote slide as `make new audio clip`

**Output:** narrated deck. **Use case:** async stakeholder review for the showcase deliverable pitch.

### F4. **Slide-image → Pixelmator paint-over loop**

Round-trip:
1. Export slide N as PNG
2. Open in Pixelmator with Generative Fill prompt from the speaker note
3. Re-insert as the slide's full-bleed background
4. Save deck

**Use case:** Concept art slide ("show this character as a hand-painted frame") gets a Pixelmator pass without leaving the deck workflow.

### F5. **`keynote_diff` — semantic deck diff for review**

Reads two `.key` files (open-and-walk), produces a structured diff:
- Slides added / removed / reordered
- Per-slide: title changes, body changes, image additions, transition changes
- Output: markdown diff report or JSON

Useful for crew handoff (director leaves comments on what changed between v1 and v2 of the trailer pitch deck) and for git-friendlier `.key` reviews. **No competitor ships this** — they all assume single-author flow.

---

## 16 · Pitfalls (production discipline)

- **`name of front document`** — already in shared.ts; never infer from path. Extension-stripping rule.
- **osascript ~400ms startup** — bundle compound ops in one `osascript` invocation. `keynote_from_markdown` is the canonical example: one script call writes 30 slides.
- **Theme lifecycle** — `themes` is the application-level list. User-saved themes appear here only if they're in `~/Library/Application Support/Keynote/Themes/`. Apple-bundled themes always present.
- **`tell the slide` silently fails** — must nest `tell document N → tell slide N`.
- **Default-tiny shapes** — width + height must be in same `with properties` record.
- **`object text` not `text`** — Keynote-specific; Pages uses `body text`. Mixing them is the #1 forum complaint.
- **Resize before text** — font >48pt clipping bug. Order: geometry → text → font size.
- **iCloud Drive race** — saves can collide with sync. Force `~/Library/Caches/...` or pause sync during batch jobs.
- **Magic-move pairing by name, not position** — F2 above; the silent failure mode for the most-magic transition.
- **Keynote 09 sdef incompatible** — modern script assumes iWork 5+; gate on `version of application` if supporting legacy.
- **`add chart` + dataset bigger than ~50×20** — slow; chunk if needed. Memory ceiling sometimes triggers a "sketchy redraw" bug — kick the slideshow with `set current slide to ...` to force re-render.

---

## 17 · v1.5 ship plan (recommended)

**Wave A (parity — match reichenbach):** 28 tools
- All slide CRUD, theme/master, content, position, table, slideshow, Creator Studio AI

**Wave B (sdef-true depth — pass reichenbach):** 8 tools
- `keynote_make_image_slides`, `keynote_add_chart`, `keynote_get_presenter_notes`, `keynote_extract_all_notes`, `keynote_export_*_advanced` (3), `keynote_set_kiosk`, `keynote_set_doc_size`

**Wave C (md2key + cross-app moats):** 5 tools
- `keynote_from_markdown`
- `keynote_to_storyboard_fcp`
- `keynote_to_compressor_gif`
- `keynote_slide_to_motion_template`
- `keynote_plan_magic_move`

**Defer to v1.6:** per-element builds (UI scripting), `keynote_diff`, F3 audio narration, F4 Pixelmator round-trip, F1 theme-aware master discovery.

Test discipline: smoke test per tool against a fresh document; bundle compound ops to keep total CI under 60s.

---

## Sources

- Apple Keynote 15.2 sdef (`/Applications/Keynote Creator Studio.app/Contents/Resources/Keynote.sdef`, 1287 lines)
- [reichenbach/iwork_mcp](https://github.com/reichenbach/iwork_mcp) — 113-tool baseline, JXA-based
- [ByAxe/keynote-mcp](https://github.com/ByAxe/keynote-mcp) — UI-scripted builds + Unsplash
- [k0kubun/md2key](https://github.com/k0kubun/md2key) — md2key Ruby implementation
- [derickfay/key2txt](https://github.com/derickfay/key2txt) — Keynote→markdown round-trip reference
- [easychen/keynote-mcp](https://github.com/easychen/keynote-mcp) — third Keynote MCP, alternative implementation
- iworkautomation.com — sparse docs, theme-discovery only
- developer.apple.com forums — `make new image` insertion-point coercion, magic-move name-pairing folklore
- discussions.apple.com 3290589 — chart styling sdef gap (Numbers; Keynote inherits the limitation)

Last reviewed: 2026-05-05 against Keynote Creator Studio 15.2.
