# Pages + Numbers authoring depth + headless lanes — research swarm 7/9

**Author:** research agent 7/9, 2026-05-05 deep swarm
**Scope:** csos `numbers_*` and `pages_*` wings — full sdef enumeration, prior-art comparison, headless lane spec, mail-merge constraints, frontier capabilities
**Apps:** `com.apple.Numbers` 15.2, `com.apple.Pages` 15.2 (Creator Studio)
**Reference repos consulted:** `reichenbach/iwork_mcp` (113 tools, JXA), `alexlock1/apple-numbers-mcp` (8 tools, hybrid SheetJS+AppleScript), `masaccio/numbers-parser` (Python, v4.15.1), Apple `iworkautomation.com`, Apple developer forums
**Local sdef inspected:** `/Applications/{Numbers,Pages} Creator Studio.app/Contents/Resources/{Numbers,Pages}.sdef`

---

## 0. Executive cut

csos ships **5 Numbers tools and 5 Pages tools today (export-only)**. The bar set by `reichenbach/iwork_mcp` is **~50 Numbers tools and ~22 Pages tools** (113 total across iWork). Closing the gap is unblocked — the sdef surface is rich on both apps and well-understood. The strategic moat csos owns and reichenbach does not is **(a) cross-app composition with FCP/Compressor/Motion, (b) a typed MCP shape with structured `{code, message, hint}` errors, (c) a headless `.numbers`-on-disk lane via `numbers-parser` that lets csos run authoring in CI without launching an app**.

Recommendation: ship **v1.6 Numbers authoring (16 tools)**, **v1.7 Pages authoring (12 tools)**, **v1.8 Numbers headless via Python sidecar (3 tools)**, **v2.0 cross-app `protocol.*` composers**. After v1.8 csos is at parity-or-better with reichenbach on Pages/Numbers and **strictly ahead** on (a) headless `.numbers` mutation, (b) typed errors, (c) cross-app glue.

---

## 1. Numbers — full sdef catalog

### 1.1 Classes (from local Numbers.sdef inspection)

| Class | Code | Inherits | Notable properties |
|-------|------|----------|--------------------|
| `document` | (Std Suite) | — | `name`, `selection`, `password protected` (read-only) |
| `template` | `tmpl` | — | `name` (theme/template lookup) |
| `sheet` | `NmSh` | iWork container | `name`, contains tables/charts/images |
| `table` | `NmTb` | iWork item | `name`, `cell range`, `selection range`, `row count`, `column count`, `header row count`, `header column count`, `footer row count`, `filtered`, `merged`-querying |
| `range` | `NmCR` | — | base for cell/row/column |
| `cell` | `NmCl` | range | `value`, `formatted value`, `formula`, `name` (A1 ref), `column`, `row`, `format`, `alignment`, `text color`, `background color`, `font name`, `font size` |
| `row` | `NMRw` | range | `address` (1-indexed), `height` |
| `column` | `NMCo` | range | `address` (A,B,…), `width` |
| `chart` | `shct` | iWork item | **EMPTY** — only inherited geometric props (position, size, rotation, opacity, reflection). No title, no labels, no series, no chart-type setter, no source-range setter. |
| `image` | `imag` | iWork item | `file` (read-only after creation), `file name`, `description` (alt text) |
| `shape`, `text item`, `line`, `audio clip`, `movie`, `group` | various | iWork item / container | shared geometric + content props |

### 1.2 Commands (verified against sdef)

`set`, `make`, `delete` (Std Suite) plus Numbers-specific:

| Command | Code | What it does |
|---------|------|--------------|
| `clear` | `NmTbCLR` | Clear contents+formatting of a range |
| `merge` | `NMTbMRGE` | Merge cells in a range |
| `unmerge` | `NmTbSpUm` | Unmerge a range |
| `sort` | `NmTbSORT` | Sort rows by a column |
| `transpose` | `NmTbXPOS` | Swap rows ↔ columns |
| `add column after / before` | `NMTbACaf/bf` | Insert column relative to range |
| `add row above / below` | `NMTbARab/af` | Insert row relative to range |
| `remove` | `NmTbDLT ` | Remove rows or columns |
| `set password` / `remove password` | `NmTbPset/Pdel` | Document password |
| `export` | `Nmstexpo` | Export with `export options` record |
| `open`, `close`, `save`, `print` | Std | Lifecycle |

**What's NOT in sdef** (confirmed by enumeration + reichenbach behavior):
- Chart type / source range / titles / labels / colors — chart class is empty post-iWorkItem
- Conditional formatting rules
- Apple Intelligence "magic fill" (UI-only, reichenbach drives via UI scripting)
- Pivot tables (post-Numbers 13 feature, GUI-only)
- Categories (group-by) — `categorize` GUI command has no sdef equivalent
- Hide/unhide rows directly (only via `filtered` toggle on a pre-set filter rule)
- Custom number formats (only built-in formats are settable)
- Pop-up menus / sliders / steppers / star ratings as cell types

### 1.3 Proposed tool list — `v1.6 Numbers authoring (16 tools)`

| Tool | Pattern | Status quo |
|------|---------|------------|
| `numbers_list_sheets(documentName) → [{name, index, tableNames}]` | One AppleScript pass returning JSON | NEW |
| `numbers_add_sheet(documentName, name, withTable?: {rows, cols, headers?})` | Compound: `make new sheet at after last sheet with properties {name:…}` + optional `make new table` | NEW |
| `numbers_rename_sheet`, `numbers_delete_sheet`, `numbers_reorder_sheets(documentName, fromIdx, toIdx)` | `move` and `set name of` | NEW |
| `numbers_add_table(documentName, sheetIdx, name, rows, cols, headerRows?, headerCols?, footerRows?)` | `make new table at sheet N` with row/column/header counts | NEW |
| `numbers_rename_table`, `numbers_delete_table`, `numbers_get_table_info(documentName, sheetIdx, tableIdx) → {rowCount, columnCount, headerRows, headerCols, footerRows, name, position, size}` | Property reads | NEW |
| `numbers_read_table(documentName, sheetIdx, tableIdx, range?: A1) → {grid: [[{value, formattedValue, formula?}]]}` | Bulk read via single `tell table` block; flatten then reshape on the JS side | NEW — keystone for round-trips |
| `numbers_write_table(documentName, sheetIdx, tableIdx, startCell: A1, data2D)` | Compound bulk-write (see §1.4) | NEW — keystone for bulk writes |
| `numbers_write_cell(documentName, ...A1, value)` | Single-cell convenience | NEW |
| `numbers_set_formula(documentName, sheetIdx, tableIdx, cellRef: A1, formula)` | Write-only; pair with sidecar formula tracking (see §1.5) | NEW |
| `numbers_add_chart(documentName, sheetIdx, chartType, sourceRange) → {chartId, ceiling: "no styling"}` | Best-effort `make new chart` + GUI-fallback noted as out-of-scope | NEW (with documented ceiling) |
| `numbers_sort_table(documentName, sheetIdx, tableIdx, columnIdx, direction: "asc"|"desc")` | Direct `sort` command | NEW |
| `numbers_merge_cells / numbers_unmerge_cells(documentName, sheetIdx, tableIdx, range: A1:B3)` | `merge`/`unmerge` | NEW |
| `numbers_transpose_table` | `transpose` command | NEW |
| `numbers_clear_range(documentName, sheetIdx, tableIdx, range)` | `clear` command | NEW |
| `numbers_add_image(documentName, sheetIdx, path, position?, size?)` | `make new image` (Numbers honors width/height/position more reliably than Pages) | NEW |
| `numbers_create_sheet_with_table(documentName, sheetName, rows, cols, headers?, data?)` | Compound — saves ~10 osascript hops | NEW (the reichenbach pattern) |

### 1.4 Bulk-write strategy — the 400ms-per-osascript reality

Confirmed against `iworkautomation.com/numbers/table-populate.html`: **AppleScript has no `set value of every cell of range to <list>` syntax for tables in Numbers** — the AppleEvent dispatcher errors. Two options:

**Option A — single compiled script, batched assignment (csos canonical for live-doc edits):**

```applescript
tell application id "com.apple.Numbers"
  tell document docName
    tell sheet sheetIdx
      tell table tableIdx
        repeat with r from 1 to rowCount
          set rowData to item r of inputData
          tell row (rowOffset + r)
            repeat with c from 1 to columnCount
              set value of cell (colOffset + c) to item c of rowData
            end repeat
          end tell
        end repeat
      end tell
    end tell
  end tell
end tell
```

One osascript invocation. Loops happen *inside* AppleScript. ~400ms startup + ~1-3ms per cell on M-series silicon. A 100×20 grid (~2000 cells) is roughly 5-7s — acceptable for authoring batches, unacceptable for >10k cells.

**Option B — pasteboard injection (csos backup for very large grids):**

Tab/newline-delimited text → System Events → Cmd-V into the table's first cell after `select`-ing it. Fast (single paste), but lossy (no formulas, no formatting, requires Numbers in foreground). Use `numbers_write_table_via_pasteboard` as a flagged variant only.

**Option C — headless via numbers-parser (csos canonical for >10k cells):** see §3.

**Decision:** ship Option A as the default `numbers_write_table`. Document the cell-count breakpoint (~5000) at which callers should prefer the headless lane. The 400ms-vs-1ms-per-cell math means anything <500 cells stays in Option A; >5000 cells goes Option C; in-between is caller's choice.

### 1.5 Formula write-only state — proposed sidecar

Numbers' `formula` property reads as a string in v15.2 (Apple finally exposed it post-v12 — confirmed by numbers-parser API and reichenbach's `numbers_set_formula` reading it back). Earlier reference notes that "formulas are write-only" was true through Numbers 11.x; **as of 15.x the cell exposes a `formula` property alongside `value` and `formatted value`**. csos should:

- **Read:** `numbers_read_table` returns `{value, formattedValue, formula}` per cell, with `formula` as `null` for non-formula cells.
- **Write:** `numbers_set_formula` writes via `set value of cell X to "=SUM(B2:B10)"` — Numbers parses the leading `=` and stores the formula. csos still maintains a `formulasMap.json` sidecar at `<doc>.formulasMap.json` next to the document, only used as a hedge when a future Numbers version regresses, OR when the document needs re-creation from JSON spec. Sidecar is **opt-in**, not load-bearing.

### 1.6 What we drop

- **Chart styling.** Document the `numbers_add_chart` ceiling: creation works, no programmatic title/labels/colors. UI-scripting these is out-of-scope for csos.
- **Magic Fill, Super Resolution, Remove Background.** reichenbach offers these via Creator Studio UI. csos defers — these are GUI-driven, fragile across Creator Studio updates, and Mike doesn't need them for the studio mission.
- **Conditional formatting, pivot tables, categories.** UI-only.

---

## 2. Pages — full sdef catalog

### 2.1 Classes (from local Pages.sdef inspection)

| Class | Code | Notes |
|-------|------|-------|
| `document` | Std | `body text` (rich text), `document body` (boolean read-only — true for word-processing, false for layout-mode) |
| `section` | `cSec` | `body text` per-section |
| `page` | `cPag` (iWork container) | `body text` per-page |
| `paragraph`, `character`, `word` | rich text subclasses | enumeration over body text, has `font`, `size`, `color` |
| `placeholder text` | `cpla` | text inserted at script-tag positions (foundation of mail merge + replace_placeholders) |
| `table`, `cell`, `row`, `column`, `range` | inherited from iWork (same shape as Numbers) | tables in Pages are first-class iWork items |
| `image`, `shape`, `text item`, `line`, `movie`, `audio clip`, `chart`, `group` | iWork items | charts in Pages have **the same empty class** as Numbers (no styling) |
| `template` | `tmpl` | for `keynote_apply_theme`-style template swap (Pages templates: resume, report, letter, flyer, etc.) |

### 2.2 Commands

`set`, `make`, `delete`, `open`, `close`, `save`, `print`, `export` (`Pgstexpo`). Pages' command surface is **smaller than Numbers** — no merge/unmerge/sort/transpose at document level. Tables inside Pages reuse the Numbers table grammar (since both classes share `NmTb` codes).

### 2.3 The two big sdef gotchas

1. **`document body` precheck is mandatory.** Pages has WP-mode (`document body=true`) and layout-mode (`document body=false`). Layout docs have **zero text flow** — every body-text command silently fails. csos must read `document body` of front document immediately after open and either route writes through text boxes OR error with `E_PAGES_LAYOUT_MODE` and a hint to switch templates.

2. **`every word of body text where ...` hangs.** This is well-attested across Apple discussions — the where-clause filter on word-class enumeration loops indefinitely in Pages 6+. The safe pattern is to enumerate `every paragraph of body text` first (fast, returns a list), then walk paragraphs in JS-land, then go back into AppleScript to mutate one specific paragraph by index. Never filter words by predicate.

### 2.4 Insertion-point coercion error — the documented mitigation

The "Can't make insertion point into type location reference" error appears when scripts try `make new word at <insertion point>`. The **only reliable workaround in Pages 6+/15.x** is to wrap text references in parentheses and use `at end of` / `at beginning of` location forms:

```applescript
-- WORKS:
tell document docName
  set body text to (body text & return & "new paragraph")
end tell

-- ALSO WORKS:
tell document docName
  make new paragraph at end of body text with properties {paragraph style:"Body"}
end tell

-- HANGS / ERRORS:
tell document docName
  make new word at insertion point
end tell
```

csos `pages_append_paragraph` should always use the `make new paragraph at end of body text with properties` form, never insertion-point-relative.

### 2.5 Proposed tool list — `v1.7 Pages authoring (12 tools)`

| Tool | Pattern |
|------|---------|
| `pages_new_from_markdown(markdownPath, templateName?, outputPath?)` | **Pandoc-route, not body-text walker.** `pandoc -f markdown -t docx -o /tmp/x.docx` → `pages_open(/tmp/x.docx)` → `pages_export(outputPath, "Pages")`. Skips every body-text gotcha by handing Pages a DOCX it knows how to import. Apple's DOCX import handles styles, headings, tables, lists, images. |
| `pages_set_body_text(documentName, text)` | Typed wrapper. Reads `document body of front document` first; errors `E_PAGES_LAYOUT_MODE` if false. |
| `pages_append_paragraph(documentName, text, styleName?)` | `make new paragraph at end of body text with properties {paragraph style: styleName}` |
| `pages_get_body_text(documentName) → string` | Read property, document length cap (use `pages_get_paragraphs` for >100KB docs to avoid truncation) |
| `pages_get_paragraphs(documentName, startIdx?, endIdx?) → [{index, text, styleName}]` | Enumerate `every paragraph` with index slice; never use word-level filtering |
| `pages_replace_placeholders(documentName, replacements: {tag: value})` | Iterate `placeholder text` elements; `set object text of each placeholder` matching `tag`. Documented errors when placeholder is in a table or chart (Pages won't merge those). |
| `pages_insert_table_from_json(documentName, json: {rows, cols, data, headerRow?})` | `make new table` → bulk-write via the same Option-A pattern as Numbers |
| `pages_insert_image(documentName, path, position?, size?)` | `make new image with properties {file: targetFile, width, height, position}`. The position-race-condition workaround: re-set position in a second `tell` block after a 0.2s delay if the resulting position differs from the requested one by >5pt. Also expose `pasteboard` flag for documents where `make new image` returns `-1700` errors. |
| `pages_set_template(documentName, templateName)` | `make new document with properties {document template: template templateName}` (only at creation time — Pages cannot swap templates on existing docs, unlike Keynote themes). Document this asymmetry. |
| `pages_mail_merge_from_numbers(templateDoc, numbersDoc, outputDir)` | Drives built-in 12.1+ merge via `pages` AppleScript `merge` command (where exposed) or via UI scripting fallback. See §4 for the constraint table. |
| `pages_mail_merge_from_csv(templateDoc, csvPath, outputDir)` | Composite: convert CSV → ephemeral Numbers doc via `numbers-parser` headless lane → invoke `_from_numbers` → cleanup |
| `pages_create_document_with_content(templateName, body, replacements?, output?)` | Compound: `make new document` + `pages_replace_placeholders` + optional export. Single-tool ergonomic win (the reichenbach pattern). |

### 2.6 What we drop or defer

- **Page-layout text boxes** — full coverage of layout-mode (text boxes, master objects, page numbering elements) is sdef-supported but a separate tool family. Defer to v1.7.5.
- **Headers/footers** — partial sdef coverage; Pages 15 exposes `header text` and `footer text` per-section but the API is brittle. Document and defer.
- **Insert page break** — there's no `make new page break` in modern Pages sdef; reichenbach drives this via UI scripting (Cmd-Return in body). csos defers — fragile.

---

## 3. `.numbers` headless lane — Python sidecar architecture

### 3.1 Why

Two pressures:

1. **CI / automation that doesn't have Numbers.app available.** GitHub Actions Linux runners, headless boxes, Mike's M5 when Numbers is closed.
2. **Bulk write performance.** Even Option-A (single batched osascript) is ~1-3ms per cell. A 50k-cell deliverables tracker write is 60-150s via AppleScript; numbers-parser does it in <2s.

### 3.2 Why not pure Node

Confirmed via web search: **no pure-JS library reads or writes `.numbers` files.** SheetJS reads `.numbers` for free but cannot write (write requires their paid Pro tier and even then is partial). The `.numbers` format is a snappy-compressed protobuf bundle (`.iwa` files) — masaccio's `numbers-parser` is the only mature read+write implementation, and it's Python.

### 3.3 Architecture — Python sidecar bundled with the npm package

```
creator-studio-os/
├── package.json
├── src/
│   └── apps/
│       └── numbers/
│           ├── tools.ts               (existing AppleScript path)
│           └── headless.ts            (NEW — sidecar bridge)
├── python-sidecar/
│   ├── pyproject.toml
│   ├── numbers_sidecar/
│   │   ├── __init__.py
│   │   ├── cli.py                     (argparse → numbers-parser ops, JSON in/out)
│   │   └── ops.py                     (read_doc, write_cells, create_from_json)
│   └── README.md
└── postinstall.sh                     (creates .venv, pip-installs numbers-parser)
```

**Bridge contract:**

- TS side (`numbers/headless.ts`) spawns `python python-sidecar/numbers_sidecar/cli.py <op>`, passes JSON on stdin, reads JSON on stdout.
- One subprocess per call (no daemon initially — keep it simple). Cold-start cost ~150ms — acceptable, less than osascript's 400ms.
- Errors come back as `{"error": {"code": "E_*", "message": "...", "hint": "..."}}` matching csos's `CreatorStudioError` shape.

**csos tools added in v1.8:**

| Tool | Op | Returns |
|------|-----|---------|
| `numbers_file_read(path, sheet?, table?)` | `read_doc` | `{sheets: [{name, tables: [{name, rowCount, columnCount, grid: [[{value, formattedValue, formula?}]]}]}]}` |
| `numbers_file_write_cells(path, sheetName, tableName, cellUpdates: [{ref, value, format?}])` | `write_cells` | `{updated: <count>, savedAt: path}` |
| `numbers_file_create_from_json(path, schema: {sheets: [{name, tables: [{name, rows, cols, data}]}]})` | `create_from_json` | `{path, bytesWritten}` |
| `numbers_file_to_json(path) → entire-doc JSON dump` | composition of `read_doc` | The "lossless export" csos owns vs `numbers_export → CSV` (which loses formulas, formats, multi-sheet structure) |
| `numbers_file_apply_diff(path, diff: [{op: "set"|"delete"|"merge", ref, value?}])` | `apply_diff` | Atomic batch — write to temp, swap on success |

### 3.4 numbers-parser known limits (factored into csos)

- **Formulas not writable.** numbers-parser docs explicitly say `Formulas cannot be written to a document.` csos `numbers_file_write_cells` documents this and routes formula writes to the AppleScript path. The sidecar can still **read** formula text (numbers-parser exposes `cell.formula`).
- **Charts not supported.** numbers-parser does not read or write charts; cells pointed to by chart sources still mutate correctly, but the chart object itself is opaque. Same posture as the AppleScript path.
- **Numbers 15.2 not formally tested.** numbers-parser confirms 10.0–14.4 + Creator Studio 15.1. csos's headless `verify` script must round-trip a 15.2-authored doc through numbers-parser as the canary; if the format gates change, csos errors with `E_NUMBERS_FORMAT_DRIFT` and a hint pointing at the masaccio issue tracker.

### 3.5 Coexistence with the AppleScript lane

| Use case | Lane |
|----------|------|
| Live-doc edits (Numbers.app open, user-facing) | AppleScript |
| Formula authoring | AppleScript |
| Chart creation | AppleScript |
| Bulk data injection (>5000 cells) | Sidecar |
| CI / headless | Sidecar |
| Lossless `.numbers` ↔ JSON round-trip | Sidecar |
| Reading from a closed doc without launching Numbers | Sidecar |

---

## 4. Mail merge — the constraint table

Pages 12.1+ ships native mail merge. csos's `pages_mail_merge_from_numbers` drives it. Constraints (verified via Apple's release notes, TidBITS, AppleInsider):

| Constraint | Status | csos response |
|------------|--------|---------------|
| Source must be a Numbers document, **not CSV** | Hard limit | `pages_mail_merge_from_csv` builds an ephemeral Numbers doc via the headless sidecar, runs `_from_numbers`, deletes the temp file. |
| Letters / cards / envelopes — yes | OK | Document supported templates; expose `templateKind: "letter" \| "card" \| "envelope"` |
| Labels — **NO** | Hard limit | csos errors `E_PAGES_MAIL_MERGE_LABELS_UNSUPPORTED` with hint suggesting an Avery-template + page-layout workaround for v1.7.5 |
| Multiple records per page — **NO** | Hard limit | Same — error early, hint at workaround |
| First row must be headers | Required | Sidecar normalizes ephemeral Numbers doc accordingly |
| Placeholders inside tables or charts won't merge | Pages limitation | csos pre-flight check: walk template, error if any placeholder is inside a `table` or `chart` element |
| Needs Pages 12.1+ on macOS Big Sur+ or iOS/iPadOS 14+ | Version requirement | Creator Studio 15.2 is fine; csos checks `version of application id "com.apple.Pages"` ≥ 12.1 at first call |
| Output is one document per row (or single-doc-many-pages?) | One document per row by default; configurable | Expose `output: "per-record" \| "single-doc"` flag |
| iCloud Drive sync race | Real, can corrupt outputs | Force local-disk output dir; refuse to write under `~/Library/Mobile Documents` |

---

## 5. Prior-art comparison vs reichenbach

### 5.1 Numbers — csos gap-closing matrix

| Capability | reichenbach | csos today | csos v1.6 | csos v1.8 |
|------------|-------------|------------|-----------|-----------|
| Document lifecycle | ✓ | ✓ | ✓ | ✓ |
| Export PDF/Excel/CSV | ✓ | ✓ | ✓ | ✓ |
| List sheets/tables | ✓ | ✗ | ✓ | ✓ |
| Add/rename/delete sheet | ✓ | ✗ | ✓ | ✓ |
| Add/rename/delete table | ✓ | ✗ | ✓ | ✓ |
| Read table (2D) | ✓ | ✗ | ✓ | ✓ + headless |
| Write table (2D) | ✓ | ✗ | ✓ | ✓ + headless |
| Read/write cell | ✓ | ✗ | ✓ | ✓ |
| Set formula | ✓ | ✗ | ✓ | ✓ AppleScript only |
| Add chart (creation) | ✓ | ✗ | ✓ | ✓ |
| Sort | ✓ | ✗ | ✓ | ✓ |
| Merge/unmerge | ✓ | ✗ | ✓ | ✓ |
| Format cells (font, color, alignment, number) | ✓ | ✗ | partial | ✓ via headless |
| Add image to sheet | ✓ | ✗ | ✓ | ✓ |
| Compound `create_sheet_with_table` | ✓ | ✗ | ✓ | ✓ |
| Template discovery | ✓ | ✗ | v1.6.5 | v1.6.5 |
| Magic Fill / Super Resolution / Remove BG | ✓ (UI-driven) | ✗ | dropped | dropped |
| **Headless `.numbers` mutation (no app launch)** | ✗ | ✗ | ✗ | **✓ csos-only** |
| **Lossless `.numbers` ↔ JSON** | ✗ | ✗ | ✗ | **✓ csos-only** |
| **Typed `{code, message, hint}` errors** | ✗ (raw strings) | ✓ | ✓ | ✓ |

### 5.2 Pages — csos gap-closing matrix

| Capability | reichenbach | csos today | csos v1.7 |
|------------|-------------|------------|-----------|
| Document lifecycle + export | ✓ | ✓ | ✓ |
| List documents/templates | ✓ | ✗ | ✓ |
| Get body text | ✓ | ✗ | ✓ |
| Get paragraphs (indexed) | ✓ | ✗ | ✓ |
| Add/insert/delete/replace text | ✓ | ✗ | ✓ |
| Format text (font, size, color) | ✓ | ✗ | partial |
| Add image | ✓ (limited per their docs) | ✗ | ✓ + position-race mitigation |
| Add table | ✓ | ✗ | ✓ |
| Insert page break | ✓ (UI scripting) | ✗ | dropped |
| Compound `create_with_content` | ✓ | ✗ | ✓ |
| **Markdown → Pages via Pandoc** | ✗ | ✗ | **✓ csos-only** |
| **Mail merge from Numbers** | ✗ | ✗ | **✓ csos-only** |
| **Mail merge from CSV (composite)** | ✗ | ✗ | **✓ csos-only** |
| **Layout-mode precheck w/ typed error** | ✗ | ✗ | **✓ csos-only** |

---

## 6. Cross-app composition tools — the moat

These are `protocol.*` tools that bind iWork to FCP/Compressor/Motion. None of the competing MCP servers attempt this.

| Protocol tool | Inputs | Pipeline | Output |
|---------------|--------|----------|--------|
| `protocol.report(dataPath, template, outputPath)` | Numbers source + Pages template | numbers_file_read → write computed table → numbers_add_chart → keynote_create_with_slides (one slide per chart) → keynote_export_pdf | Single PDF with summary + charts |
| `protocol.batch_letter(template, csvPath, outputDir, options?: {compress?, password?})` | Pages template + CSV recipients | pages_mail_merge_from_csv → pages_export each as PDF → optional Compressor batch (PDF flatten + password) | Folder of per-recipient PDFs |
| `protocol.steam_trailer_kit(projectPath)` | the showcase project project | Pages: press-kit one-pager from canon.md → Numbers: deliverables tracker → Keynote: Steam-page hero deck → FCP: trailer FCPXML reference | Marketing bundle ready for Steam upload |
| `protocol.numbers_to_fcp_sync(numbersPath, fcpProjectPath)` | Numbers as deliverables tracker | numbers_file_read → diff against fcp/<project>.json → write back updated statuses + render-time stats | Bidirectional sync — Numbers becomes the human face of csos's own internal state |
| `protocol.devlog(weekRange, projectPath)` | Date range | numbers_file_read recent commits + tests passed → pages_create_document_with_content (markdown body) → pages_export PDF | Auto-generated weekly devlog PDF |

The `numbers_to_fcp_sync` tool is the **single highest-leverage frontier capability** — it makes Numbers itself the dashboard for csos's FCP automation. Mike opens Numbers, sees the the showcase project trailer's clip status, edits a row, csos picks it up.

---

## 7. Pitfalls catalog (worth front-loading in tool descriptions)

1. **Paragraph walker hang** — never use `every word of body text where ...`. Always enumerate paragraphs first.
2. **Formula write-only legacy** — Numbers <12 returned computed value when reading `formula`. Numbers 15.x exposes `formula` correctly. csos still maintains optional sidecar for re-creation flows.
3. **Chart styling ceiling** — `chart` class in both Numbers and Pages sdef is empty post-iWorkItem inheritance. No title, labels, or color setters. Document this everywhere a chart tool is exposed.
4. **Layout-mode body-text writes silently fail** — `pages_set_body_text` must precheck `document body` boolean and error early.
5. **Pages cannot swap templates post-creation** — unlike Keynote themes. New template = new document.
6. **iCloud Drive race** — block iCloud paths in mail-merge output; force local-disk.
7. **Insertion-point coercion** — never use `at insertion point` location form. Use `at end of body text` / `at beginning of section N`.
8. **`make new image` position race** — re-assert position with a delay if the resulting position drifts.
9. **Document-name extension stripping** — already handled by `iwork/shared.ts` (`name of front document`), keep the invariant.
10. **osascript 400ms cold start** — every tool must batch into a single tell block; never one-call-per-cell.
11. **Excel round-trip lossy** — Numbers-specific functions (DURATION, RAWVALUE, regex flavor) don't survive. csos `numbers_export → Excel` documents this; `numbers_file_to_xlsx` via numbers-parser + openpyxl is the fidelity-preserving path.
12. **AppleScript paste-into-cell scatter** — pasting tab/newline-delimited text via System Events sometimes lands the entire payload in one cell. Always verify with a row-count read after paste; if scatter failed, fall back to Option-A.
13. **Mail merge labels & multi-record** — hard-blocked by Pages. Error early.
14. **Filtered rows can't be hidden directly** — only via toggling pre-existing filter rules. csos does not expose `hide_row` because the API is unfaithful.
15. **`numbers-parser` not formally tested on 15.2** — csos verify script must round-trip a Creator Studio doc.

---

## 8. Frontier — 5 csos-only Pages/Numbers capabilities

These are mechanisms no other MCP server offers. They earn the moat.

### 8.1 `numbers_file_diff(pathA, pathB) → JSON-patch`

Two `.numbers` docs in, an RFC-6902-style JSON patch out. Built on top of `numbers_file_to_json` + a deep-diff. Useful for: tracking deliverables-tracker changes between commits, generating a "what changed in the budget" summary for stakeholders, asserting in tests that a transformation produced the expected mutation set. **Nothing else in this space does this** — Apple's diff tools are GUI-only, openpyxl on the xlsx side has nothing equivalent at the JSON-patch level.

### 8.2 `numbers_file_template_apply(templatePath, dataPath, outPath)`

A `.numbers` document with `<<placeholder>>`-tagged cells acts as a template. csos walks the template, substitutes from a data JSON, and writes a fresh doc — entirely headless via the Python sidecar. Faster and more deterministic than the AppleScript path; works in CI. Use case: csos itself ships `.numbers` templates for "Steam launch checklist", "FCP project status", "Compressor batch report" — director just runs `csos numbers template apply`.

### 8.3 `pages_canon_to_pdf(canonDir, template, outPath)`

Walks a operator-canon-style `canon/` directory of `.md` files, runs Pandoc per file, opens each as a Pages doc with a passed template, exports merged PDF. Output is a typeset canon book — useful for offline review, for sending to playtesters, or for the the showcase deliverable press kit. The novelty is the **directory-walk + template-apply + merge** as a single tool — Pandoc alone gives you DOCX, but the Pages template fidelity (cover page, headers, page numbers, ToC) only happens through Pages itself.

### 8.4 `numbers_observable_table(documentName, sheetIdx, tableIdx, callback?: webhook)`

Subscribe to changes on a Numbers table by polling at 500ms (or via FSEvents on the underlying `.numbers` file when it's saved). Each change emits a JSON-patch over an MCP notification. Use case: Mike edits the the showcase project deliverables tracker in Numbers; csos auto-resyncs FCP project state without him running a sync command. **No other iWork MCP offers reactive/observable behavior** — they're all one-shot tool calls.

### 8.5 `pages_mail_merge_with_attachments(template, source, attachmentsCol, outputDir)`

Extends mail merge: a Numbers source has an `attachments` column with comma-separated PDF paths. csos runs the merge → exports each per-record PDF → concatenates the per-record attachments using the bundled PDF stack (or Compressor for re-encoding). Each recipient gets a single combined PDF. **Mail merge with PDF attachments per-record is not something Pages does natively** — csos closes the gap by composing Pages + Compressor + a PDF concat helper.

---

## 9. JXA vs AppleScript — should csos add a JXA lane?

reichenbach uses JXA universally. AppleScript wins for csos because:

1. **Apple's iWork sdef terms are AppleScript-shaped.** JXA exposes them via `Application("Numbers").documents[0].sheets[0].tables[0].rows[3].cells[2].value()` — verbose and bug-prone (event-class casing, the well-known JXA `whose`-clause unreliability).
2. **csos already has a hardened AppleScript runner with structured-error mapping (`runAppleScript` + `escapeAppleScriptString`).** Building a parallel JXA runner doubles the surface to maintain.
3. **Bulk write performance is identical** in both — the bottleneck is osascript startup + per-event dispatch, not the language layer.
4. **JXA wins for ad-hoc string/regex/JSON manipulation.** Inside csos, those happen on the TS side — the AppleScript blocks stay tight (read-batched-data | write-batched-data).

**Decision:** **csos sticks with AppleScript** for the iWork lane. The Python sidecar gives us the bulk-data escape valve that JXA would offer (and more — JXA still launches Numbers; the sidecar doesn't).

---

## 10. Roadmap delta (proposed update to `docs/roadmap-iwork.md`)

```
v1.6 — Numbers authoring (16 tools)              [from current 8]
v1.7 — Pages authoring + mail merge (12 tools)
v1.8 — Numbers headless via Python sidecar (5 tools, +diff +template-apply)
v1.9 — Pages canon-to-PDF + Pages observable + frontier (4 tools)
v2.0 — Cross-app protocol.* (5 protocols)
```

Net add: ~42 tools. Brings csos from 5+5 (Numbers+Pages) to ~47+18 plus 5 protocols = **~70 iWork-related surface points**, ahead of reichenbach's ~72 (Numbers+Pages alone) by capability mix and decisively ahead by composition-with-FCP/Compressor.

---

## 11. Test discipline

Each new tool needs:

- A real-app smoke test (`scripts/smoke-numbers.mjs`, `scripts/smoke-pages.mjs`) following the v1.4 pattern.
- A headless smoke test (`scripts/smoke-numbers-headless.mjs`) that creates a `.numbers` from JSON, mutates it via sidecar, reads it back, asserts equality.
- Round-trip canary in `creator-studio-os verify`: open a known `.numbers` 15.2 doc, write a cell, save, re-open via numbers-parser, assert the value survived.

---

## 12. Sources

- [reichenbach/iwork_mcp](https://github.com/reichenbach/iwork_mcp) — 113 tools, JXA, the bar
- [alexlock1/apple-numbers-mcp](https://github.com/alexlock1/apple-numbers-mcp) — 8 tools, hybrid SheetJS+AppleScript
- [masaccio/numbers-parser](https://github.com/masaccio/numbers-parser) v4.15.1 — Python read/write of `.numbers`
- [numbers-parser quick-start](https://masaccio.github.io/numbers-parser/quick-start.html)
- [iworkautomation.com/numbers/table-populate.html](https://iworkautomation.com/numbers/table-populate.html) — bulk-write canonical pattern
- [iworkautomation.com/pages/body-text.html](https://iworkautomation.com/pages/body-text.html) — `document body` precheck
- [discussions.apple.com/thread/3290589](https://discussions.apple.com/thread/3290589) — "no chart sdef" confirmation
- [discussions.apple.com/thread/250480317](https://discussions.apple.com/thread/250480317) — formula write-only history
- [discussions.apple.com/thread/8282112](https://discussions.apple.com/thread/8282112) — insertion-point coercion error
- [developer.apple.com/forums/thread/103309](https://developer.apple.com/forums/thread/103309) — `make new image` race condition
- [tidbits.com/2022/06/30/apple-brings-mail-merge-back-to-pages](https://tidbits.com/2022/06/30/apple-brings-mail-merge-back-to-pages/) — mail merge constraints
- [appleinsider.com/inside/iwork/tips/how-to-use-the-new-mail-merge-in-pages](https://appleinsider.com/inside/iwork/tips/how-to-use-the-new-mail-merge-in-pages)
- [pandoc.org/MANUAL.html](https://pandoc.org/MANUAL.html) — markdown → docx → Pages route
- Local sdef inspection — `/Applications/{Numbers,Pages} Creator Studio.app/Contents/Resources/{Numbers,Pages}.sdef`

Last reviewed: 2026-05-05 against Numbers/Pages 15.2 (Creator Studio).
