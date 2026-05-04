# iWork roadmap (Keynote / Pages / Numbers)

Plan for the `keynote_*`, `pages_*`, and `numbers_*` wings. All three apps share a near-identical AppleScript shape (open / close / export with format) and a shared helper module at `src/apps/iwork/shared.ts`.

> Surface = `*.sdef` AppleScript dictionaries (full coverage in all three apps). Bundle IDs `com.apple.Keynote`, `com.apple.Pages`, `com.apple.Numbers`. v15.2 in Creator Studio.

## v1.4 — shipped 2026-05-04 (lifecycle + export)

- **Keynote (8):** app_open, app_running, open, close, export_pdf, export_pptx, export_movie, export_images
- **Pages (5):** app_open, app_running, open, close, export (PDF / Word / RTF / unformatted text / EPUB)
- **Numbers (5):** app_open, app_running, open, close, export (PDF / Excel / CSV)

Smoke-proven against real apps: each app `make new document` → export to PDF in ~0.7-0.8s.

## Where we sit vs the field (per 2026-05-04 research swarm)

- [`reichenbach/iwork_mcp`](https://github.com/reichenbach/iwork_mcp) ships **41 Keynote tools + 113 across iWork** including slide authoring, theme swap, batch 2D table writes, formulas, charts. **The bar.** v0.8.6 (2026-02-15), JXA-based.
- [`ByAxe/keynote-mcp`](https://github.com/ByAxe/keynote-mcp) ships ~30 Keynote tools incl. Unsplash integration.
- [`alexlock1/apple-numbers-mcp`](https://github.com/alexlock1/apple-numbers-mcp) — 8 narrow Numbers tools.
- No dedicated Pages MCP server exists — only skill-form prior art.

We're behind on Keynote authoring + Numbers data manipulation. The strategic moat is cross-app composition (iWork ↔ FCP / Compressor / Motion) which none of the competitors offer.

## v1.5 — Keynote authoring (highest priority, closes the iwork_mcp gap)

Pattern: md2key-style master mapping (`cover` / `h1` / `h2` / ...) is the high-leverage entry. Drop a markdown doc, get a Keynote deck.

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

## v1.6 — Numbers data manipulation (matches reichenbach baseline)

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

## v1.8 — Numbers headless lane (no app launch)

[`numbers-parser`](https://pypi.org/project/numbers-parser/) is a pure-Python read/write of `.numbers` files **without launching Numbers**. Tested through Numbers Creator Studio 15.1. Wins on speed + headless CI.

- `numbers_file_read(path)` — protobuf parse, return tables / cells / values
- `numbers_file_write_cells(path, sheetName, tableName, cellUpdates)` — direct file mutation
- `numbers_file_create_from_json(path, schema)` — generate a `.numbers` from JSON spec, no Numbers.app

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

Last reviewed: 2026-05-04 against Keynote / Pages / Numbers 15.2 (Creator Studio).
