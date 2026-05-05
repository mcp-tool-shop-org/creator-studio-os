# iWork roadmap (Keynote / Pages / Numbers)

Plan for the `keynote_*`, `pages_*`, and `numbers_*` wings. All three apps share a near-identical AppleScript shape (open / close / export with format) and a shared helper module at `src/apps/iwork/shared.ts`.

> Surface = `*.sdef` AppleScript dictionaries (full coverage in all three apps). Bundle IDs `com.apple.Keynote`, `com.apple.Pages`, `com.apple.Numbers`. v15.2 in Creator Studio.

## v1.4 — shipped 2026-05-04 (lifecycle + export)

- **Keynote (8):** app_open, app_running, open, close, export_pdf, export_pptx, export_movie, export_images
- **Pages (5):** app_open, app_running, open, close, export (PDF / Word / RTF / unformatted text / EPUB)
- **Numbers (5):** app_open, app_running, open, close, export (PDF / Excel / CSV)

Smoke-proven against real apps: each app `make new document` → export to PDF in ~0.7-0.8s.

## Roadmap-altering findings from 2026-05-05 deep research swarm

The 2026-05-05 swarm dumped the full Keynote 15.2 sdef (1,287 lines), Numbers 15.2 sdef, and Pages 15.2 sdef. Findings:

**Keynote sdef is RICHER than [reichenbach/iwork_mcp](https://github.com/reichenbach/iwork_mcp) exploits.** reichenbach misses sdef-native facts:
- `add chart` accepts row names + column names + data + type + group-by directly (he creates blank charts and walks them)
- `make image slides` is an Apple-bundled bulk-image-deck compound
- 43 named transition effects (not the 22 he documents)
- Full `transition properties` record (effect + delay + duration + automatic)
- Advanced PDF export (password, handouts, image quality)
- Movie codec ladder (h264/HEVC/ProRes/ProRes422/4444)
- 1024×768 vs 1920×1080 doc size, kiosk-mode (auto play/loop/restart), VoiceOver `description` on images, presenter notes as `rich text` (per-paragraph stylable)

**Chart class is empty on Numbers AND Pages** — `add chart` works, but **chart styling is genuinely impossible via AppleScript** (no titles/labels/colors). UI-scripting only. Document the ceiling honestly.

**Headless `.numbers` lane:** [`numbers-parser`](https://pypi.org/project/numbers-parser/) (pure-Python, snappy-protobuf) is the only path. **No pure-JS alternative exists.** Ship a Python sidecar (subprocess + JSON bridge, ~150ms cold start vs osascript's 400ms).

See [`docs/research/2026-05-05-deepswarm/06-keynote-depth.md`](./research/2026-05-05-deepswarm/06-keynote-depth.md) and [`07-pages-numbers-depth.md`](./research/2026-05-05-deepswarm/07-pages-numbers-depth.md) for full sdef catalogues.

## Competitive landscape (refreshed 2026-05-05)

- [`reichenbach/iwork_mcp`](https://github.com/reichenbach/iwork_mcp) — 41 Keynote tools + 113 across iWork. The bar. v0.8.6 (2026-02-15), JXA-based.
- [`ByAxe/keynote-mcp`](https://github.com/ByAxe/keynote-mcp) — ~30 Keynote tools incl. Unsplash integration.
- [`alexlock1/apple-numbers-mcp`](https://github.com/alexlock1/apple-numbers-mcp) — 8 narrow Numbers tools.
- No dedicated Pages MCP server exists — only skill-form prior art.

**Strategic shift:** csos targets **45 Keynote tools** in v1.5 (28 parity + 8 sdef-depth + 5 cross-app composition). Net **leapfrog**, not parity. Cross-app composition (iWork ↔ FCP / Compressor / Motion) is the moat — `keynote_to_storyboard_fcp`, `keynote_to_compressor_gif`, `keynote_slide_to_motion_template`, `keynote_plan_magic_move`, `keynote_from_markdown` are all uniquely csos.

## v1.5 — Keynote leapfrog — 45 tools (28 parity + 8 sdef-depth + 5 cross-app)

Pattern: md2key-style master mapping (`cover` / `h1` / `h2` / ...) is the high-leverage entry. Drop a markdown doc, get a Keynote deck. **Cross-app composition tools (`keynote_to_*`) are the strategic moat — no Keynote MCP competitor ships these.**

- `keynote_make_slide(documentName, masterName?, after?)` — returns slide id; foundational for everything below
- `keynote_set_slide_master(documentName, slideIndex, masterName)` — apply master to existing slide (theme-swap composability)
- `keynote_insert_text(documentName, slideIndex, body, options)` — explicit hierarchy + resize-before-text discipline baked in (font >48pt clipping bug)
- `keynote_insert_image(documentName, slideIndex, path, position, size)`
- `keynote_insert_shape(documentName, slideIndex, shapeKind, position, size, fillText?)` — shape text uses `object text:` not `text:`
- `keynote_apply_theme(documentName, themeName)` — theme swapping on existing docs IS supported despite sparse Apple docs
- `keynote_from_markdown(markdownPath, themeName?, outputPath?)` — md2key-style master mapping; pairs with `keynote_export_pdf`
- `keynote_reorder_slides(documentName, fromIndex, toIndex)`
- `keynote_duplicate_slide(documentName, slideIndex)`
- `keynote_skip_slide(documentName, slideIndex, skip)`

Defer: charts (sdef incomplete), audio clips (Motif handles audio elsewhere), presenter mode control (not authoring).

## v1.6 — Numbers data manipulation — 16 tools

Charts: creation works, **styling is impossible via AppleScript**. Document the ceiling. Pair with v1.8 Python sidecar for headless bulk data injection.

- `numbers_write_table(documentName, sheetIndex, tableIndex, data2D)` — 2D bulk write, sdef-supported, the highest-leverage tool. osascript startup is ~400ms so bulk-write is mandatory for batch work.
- `numbers_set_formula(documentName, sheetIndex, tableIndex, cellRef, formula)` — formulas are write-only (you can write `"=SUM(B2:B10)"` but reading it back returns the computed value, not the formula text). Track formulas in caller state.
- `numbers_read_table(documentName, sheetIndex, tableIndex)` — return 2D array of `value` and `formattedValue` per cell
- `numbers_add_chart(documentName, sheetIndex, chartType, sourceRange)` — accept the styling ceiling; sdef supports creation but not titles / labels / colors. Document the limitation.
- `numbers_create_sheet_with_table(documentName, sheetName, rows, cols, headers?)` — compound op (the iwork_mcp pattern; saves ~10 osascript hops on a from-scratch sheet)
- `numbers_sort_table(documentName, sheetIndex, tableIndex, columnIndex, direction)`
- `numbers_merge_cells(documentName, sheetIndex, tableIndex, range)` / `numbers_unmerge_cells(...)`

Defer: chart styling (UI scripting only), Apple Intelligence "magic fill" (UI dependency, not sdef), conditional formatting.

## v1.7 — Pages authoring + mail merge

- `pages_new_from_markdown(markdownPath, templateName?, outputPath?)` — Pandoc → DOCX → Pages open. Skips the brittle body-text walker entirely; matches Apple's own DOCX import fidelity.
- `pages_set_body_text(documentName, text)` — typed wrapper with `document body` precheck. Errors with `E_PAGE_LAYOUT_NOT_SUPPORTED` for layout-mode docs (no text layer).
- `pages_append_paragraph(documentName, text, styleName?)` — paragraph-traversal rule baked in (`every word of body text where ...` hangs Pages).
- `pages_insert_table_from_json(documentName, json)` — `{rows, cols, data, headerRow}` → `make new table` + per-cell writes.
- `pages_replace_placeholders(documentName, replacements)` — wraps script-tag replacement; explicitly errors when placeholder is inside a table or chart (Pages won't merge those).
- `pages_mail_merge_from_numbers(templateDoc, numbersDoc, outputDir)` — drives the built-in (12.1+) merge. Document the constraints: letters / cards / envelopes only, no labels, no multi-record-per-page, requires Numbers source not CSV.
- `pages_mail_merge_from_csv(templateDoc, csvPath, outputDir)` — composite tool: CSV → ephemeral Numbers doc → invoke `_from_numbers` → cleanup. Obvious-ergonomic win.
- `pages_insert_image(documentName, path, position?, size?)` — start with `make new image`; fall back to pasteboard insertion behind a flag. Surface placement-uncertainty in the result.

Defer: headers/footers (sdef coverage is partial), page-layout text boxes, RTF export refinement.

## v1.8 — Numbers headless lane (Python sidecar)

[`numbers-parser`](https://pypi.org/project/numbers-parser/) is the **only** read/write of `.numbers` files **without launching Numbers** (snappy-protobuf, no pure-JS port exists). Tested through Numbers Creator Studio 15.1.

**Architecture:** Python subprocess + JSON bridge over stdin/stdout. ~150ms cold start vs AppleScript's 400ms; wins on speed and headless CI.

- `numbers_file_read(path)` — protobuf parse, return tables / cells / values
- `numbers_file_write_cells(path, sheetName, tableName, cellUpdates)` — direct file mutation
- `numbers_file_create_from_json(path, schema)` — generate a `.numbers` from JSON spec, no Numbers.app
- `numbers_file_diff(pathA, pathB)` — JSON-patch between two `.numbers` documents (frontier feature, slice §13)

Coexist with the AppleScript path; AppleScript stays canonical for live-doc editing, parser for bulk data injection.

## v2.0 — Cross-app composition

iWork's role in `protocol.*`:

- **`protocol.steam_trailer` / `protocol.devlog`** — Pages writes a press-kit one-pager, Numbers tracks deliverable status, Keynote produces the pitch deck for the Steam page hero card
- **`protocol.report`** — Numbers populates from data → Numbers add_chart → Keynote slide insert → Keynote export_pdf for stakeholder distribution
- **`protocol.batch_letter`** — `pages_mail_merge_from_csv` + `pages_export` to PDF + Compressor `compressorbatch` if PDFs need flattening / encrypting at scale

## Out of scope

- **Charts with custom titles / labels / colors** — Numbers has no chart sdef for styling. UI scripting only. Skip until use case justifies the fragility.
- **Apple Intelligence "magic fill"** — Numbers GUI feature, no sdef path. Wait for Apple to expose.
- **Keynote presenter mode control** — not authoring, not relevant to the agent surface.
- **Pages headers / footers** — sdef coverage is partial; not worth shipping until demand surfaces.

## Testing strategy

- Each new tool needs a real-app smoke test (the v1.4 smoke at `scripts/smoke-iwork.mjs` is the template — `make new document` → tool-under-test → close).
- Maintain the document-name extension-stripping invariant — `iwork/shared.ts` already queries `name of front document` after open, never infers from path.
- Watch for osascript startup cost in batch tests — bundle compound ops, don't loop one-tool-per-call.

Last reviewed: 2026-05-05 against Keynote / Pages / Numbers 15.2 (Creator Studio) — deep research swarm with full sdef reads.
