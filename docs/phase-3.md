# Phase 3 — v1.8.x build plan

## The thesis

Phase 1 built cross-cutting infrastructure. Phase 2 shipped the keystone protocol against the bundled showcase. Phase 3 closes the per-app surface so every Apple Creator Studio app csos drives has at least 14 tools of non-trivial depth — coverage parity across the eight-app surface.

Five apps are at thin or partial coverage today. Logic, Numbers, Pages have file-handoff or export-only surfaces. Motion is at parameter + text mutation but not media swap. FCP authoring is rich but the parser + OTIO bridge is missing. Phase 3 closes those gaps so Phase 4's protocol family has the full app surface to compose against.

**No new protocols in Phase 3.** Depth, not breadth. Build plan is mechanical surface expansion ordered by dependency: protocols can't reach into apps that don't have the tools yet.

## Phase 3 sub-phases (five PRs, one per app)

Each sub-phase is one PR. Patch-bump per PR (v1.7.10 → v1.7.11 → v1.7.12 → ...). v1.8.0 lands when all five sub-phases are green and Phase 3 keystone (cross-app coverage parity) is met.

### 3.0 — Logic Pro depth (v1.7.11)

The around-Logic 13 tools the deep-research swarm specced. Logic 12.2 still exposes zero programmatic surface, so every tool is observability or sidecar — never impersonates Logic's UI. See [`docs/research/2026-05-05-deepswarm/04-logic-depth.md`](./research/2026-05-05-deepswarm/04-logic-depth.md).

**Tools (13):**

- **`logic_project_inspect(path)`** — read-only `.logicx` plist parsing. `ProjectInformation.plist` (BundleVersion, HasProjectFolder, LastSavedFrom, VariantNames, projectAssetFlags), `MetaData.plist` per-Alternative (Audio / Sampler / IR / Video / Ultrabeat / Unused arrays), `DisplayState.plist` (screensets + panel state). Skip `ProjectData` (binary, undocumented, EULA-adjacent).
- **`logic_alternative_thumbnail(path, alternativeIndex?)`** — extract `Alternatives/NNN/WindowImage.jpg` per Alternative cover. JPEG passthrough. Unique to csos — no competitor exposes this.
- **`logic_watch_bounces({ dir })`** — MCP `resources/subscribe` shape. `chokidar` (uses native fsevents on macOS) on the bounce-output directory. Emits `notifications/resources/updated` when a bounce file lands. The Motif-cue-auditioning loop the operator actually does.
- **`logic_sidecar_write(path, data)`** + **`logic_sidecar_read(path)`** — sibling `.json` next to a `.logicx` (cue name, scene tag, motif family, take notes, take rating). Pairs with Motif's score-map; gives human-driven Logic sessions structured breadcrumbs the rest of csos can read.
- **`logic_iac_send({ event })`** — CoreMIDI virtual port + IAC bus via `easymidi`. Send MMC transport (start/stop/locate), notes, CC. Scoped tightly — csos doesn't pretend it's "control."
- **9 novel csos-only adds** — Motif-loop bounce iterator, take-audition LLM critique, IAC passive listener, sidecar-Git-history, plus four more catalogued in slice 4 §6.

**Library decisions:**
- `chokidar` for fsevents (already in csos's tree if not, install)
- `easymidi` over `node-midi` over RtMidi for virtual port (slice 4 §3 confirms)

**Ship criteria:**
- 13 new tools registered
- Each new tool has an entry in `tests/fixtures/toolcompass-queries.json`
- Phase 7 smoke green (descriptions retrievable in top-3 with score > 0.4)
- `logic_watch_bounces` integration test: write a fixture file into a temp dir, assert subscribe callback fires
- Keystroke-route rejection in writing — competitor MCPs (koltyj, che) cited as "locale-fragile, AX-permission-thrash, version-coupled."

### 3.1 — Numbers data manipulation + headless lane (v1.7.12)

Two lanes ship in one PR: AppleScript bulk-write tools + Python sidecar over `numbers-parser`. The AppleScript lane covers live-doc editing (Numbers must be open). The sidecar lane covers headless `.numbers` mutation (Numbers can be closed). See [`docs/research/2026-05-05-deepswarm/07-pages-numbers-depth.md`](./research/2026-05-05-deepswarm/07-pages-numbers-depth.md).

**AppleScript tools (12):**

- `numbers_write_table(doc, sheetIdx, tableIdx, data2D)` — bulk write. Mandatory bulk because osascript startup is ~400ms.
- `numbers_set_formula(doc, sheet, table, cellRef, formula)` — write-only (read returns computed value). State tracking via sidecar.
- `numbers_read_table(doc, sheet, table)` — 2D array of `{value, formattedValue}`.
- `numbers_add_chart(doc, sheet, chartType, sourceRange)` — creation only. Chart styling impossible via AppleScript (sdef chart class is empty). Document the ceiling.
- `numbers_create_sheet_with_table(doc, sheetName, rows, cols, headers?)` — compound op (saves ~10 osascript hops).
- `numbers_sort_table(doc, sheet, table, columnIndex, direction)`.
- `numbers_merge_cells / unmerge_cells(doc, sheet, table, range)`.
- `numbers_add_sheet / remove_sheet / rename_sheet / reorder_sheets`.

**Python sidecar tools (4):**

- `numbers_file_read(path)` — protobuf parse via `numbers-parser`. Returns tables / cells / values without launching Numbers.
- `numbers_file_write_cells(path, sheetName, tableName, cellUpdates)` — direct file mutation.
- `numbers_file_create_from_json(path, schema)` — generate a `.numbers` from JSON spec, no Numbers.app.
- `numbers_file_diff(pathA, pathB)` — JSON-patch between two `.numbers` documents. Frontier feature from slice 7 §13.

**Sidecar architecture:**
- `src/runners/pythonSidecar.ts` — subprocess spawn + JSON bridge over stdin/stdout
- `src/apps/numbers/sidecar/numbers_bridge.py` — Python entry point that loads `numbers-parser`, dispatches by command name, returns JSON
- One process per call (cold start ~150ms), or persistent process pool if perf demands (defer to v1.8.x measurement)
- Verify-script extension: `creator-studio-os verify --check-python` — confirms Python 3 + `numbers-parser` installed

**Ship criteria:**
- 16 new tools registered (12 AppleScript + 4 Python)
- Python sidecar passes a smoke test against a fixture `.numbers` file (read → write → re-read confirms mutation)
- chart-styling-ceiling documented in `docs/reference/numbers-applescript.md`
- Phase 7 smoke green for all 16 new tools

### 3.2 — Pages mail merge + body text discipline (v1.7.13)

Pages doesn't have the JSON-shaped surface that Numbers does, but Pandoc + AppleScript covers most operator workflows. Mail merge is the killer feature for `protocol.batch_letter` in Phase 4. See [`docs/research/2026-05-05-deepswarm/07-pages-numbers-depth.md`](./research/2026-05-05-deepswarm/07-pages-numbers-depth.md).

**Tools (12):**

- `pages_new_from_markdown(mdPath, templateName?, outputPath?)` — Pandoc → DOCX → Pages open. Skips the brittle body-text walker entirely; matches Apple's own DOCX import fidelity.
- `pages_set_body_text(doc, text)` — typed wrapper with `document body` precheck. Errors with `E_PAGE_LAYOUT_NOT_SUPPORTED` for layout-mode docs (no text layer).
- `pages_append_paragraph(doc, text, styleName?)` — paragraph-traversal-rule: `every word of body text where ...` hangs Pages. Document and avoid.
- `pages_insert_table_from_json(doc, json)` — `{rows, cols, data, headerRow}` → `make new table` + per-cell writes.
- `pages_replace_placeholders(doc, replacements)` — script-tag replacement; explicitly errors when placeholder is inside a table or chart (Pages won't merge those).
- `pages_mail_merge_from_numbers(templateDoc, numbersDoc, outputDir)` — built-in (12.1+) merge. Constraints: letters / cards / envelopes only, no labels, no multi-record-per-page, requires Numbers source not CSV.
- `pages_mail_merge_from_csv(templateDoc, csvPath, outputDir)` — composite tool: CSV → ephemeral Numbers doc → invoke `_from_numbers` → cleanup.
- `pages_insert_image(doc, path, position?, size?)` — `make new image`; pasteboard fallback behind a flag. Surface placement-uncertainty in result.
- 4 more covering paragraph styles, footnotes (sdef-supported), find-and-replace, and document protection.

**Pandoc dependency:**
- Document Pandoc as required for the markdown lane. Verify-script extension: `creator-studio-os verify --check-pandoc`.
- If Pandoc absent, `pages_new_from_markdown` returns `E_DEP_PANDOC_MISSING` with hint to `brew install pandoc`.

**Ship criteria:**
- 12 new tools registered
- Mail-merge constraint table in `docs/reference/pages-applescript.md`
- Pandoc dependency surfaces in verify
- Phase 7 smoke green for all 12 new tools

### 3.3 — Motion media swap (v1.7.14)

The OZML coordinated-edit pattern proved out by `OzmlTextEditor` in v1.7 extends to media swap. Higher structural risk because the cascade touches frame-rate, timing, audio retime, and scene-level ranges in lockstep. See [`docs/research/2026-05-05-deepswarm/05-motion-depth.md`](./research/2026-05-05-deepswarm/05-motion-depth.md).

**Tools (4):**

- **`motion_template_swap_media(motnPath, clipId, newMediaPath, opts?)`** — implements the full media-swap cascade per slice 5 §3. Coordinated updates across `<clip name=>`, `<pathURL>file://...`, `<missingWidth/Height/Duration>`, `<creationDuration>` = `ceil(missingDuration × frameRate)`, `<timing in= out= offset=>`, `<parameter name="Frame Rate" id="107">`, `<parameter name="Fixed Width" id="114">` and `<parameter name="Fixed Height" id="115">`, `<audioTrack>` retime curve (second keypoint must reflect new frame count), scene-level `<timeRange>` and `<playRange>` extension if new media exceeds original. Atomic temp-file + rename. Validation gates the write — every invariant from slice 5 §1.4 must pass before the file lands.
- **`motion_template_validate(path)` extensions** — add the 9 media-factory invariants from slice 5 §1.4. Existing validate already covers document / parameter-tree / text-factory / scene / published. Add: clip id uniqueness, pathURL form consistency, dimension/duration matching, creationDuration formula, timing bounds, frame-rate cascade, fixed-dimension agreement, audio retime alignment, linkedObjects pairing.
- **`motion_factory_taxonomy_compile(directory)`** — walk every bundled template under `/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/`, collect UUID→description mappings from `<factory><description>`, build `factory-taxonomy.json` cache. Anchor lookups by UUID, not integer ID (factory IDs are per-template, UUIDs are universal).
- **`motion_template_diff(pathA, pathB)`** — structural diff focused on parameter values. Skip whitespace / formatting. Verifies a mutation landed correctly without eyeballing 1,983 lines.

**ffprobe dependency:**
- `motion_template_swap_media` requires `ffprobe -v quiet -print_format json -show_streams -show_format <file>` to extract new media's duration / dimensions / frame rate.
- Already present in csos's host (used by smoke phases since v1.7.4). Verify-script confirms `ffprobe` in PATH.

**NTSC handling:**
- 30 fps → 29.976 fps cascade per slice 5 §1.5. When new media is NTSC source, multiply standard frame rate by 0.9999 and set `<NTSC>1</NTSC>` in `<sceneSettings>`.

**Ship criteria:**
- 4 new tools registered
- `motion_template_swap_media` smoke-tested against bundled Atmospheric-Lower Third with a swap to a different MP4 — validate clean, render via Compressor, output MOV non-empty, eyeball confirms new media is what's playing
- Frame-rate cascade tested against an NTSC source
- Phase 7 smoke green

### 3.4 — FCP parser + OTIO bridge (v1.7.15)

The read direction. Pairs with v1.6's `fcp_round_trip_diff` (which depends on a parser) and unlocks Phase 4 protocols that need to know what's already in a project. See [`docs/research/2026-05-05-deepswarm/01-fcp-depth.md`](./research/2026-05-05-deepswarm/01-fcp-depth.md).

**Tools (8):**

- `fcp_parse_fcpxml(xmlOrPath)` — `.fcpxml` (and `.fcpxmld`'s `info.fcpxml`) → `ProjectSpec` + `ParsedExtras`. `fast-xml-parser` with `preserveOrder: true`. Forward-compatible: surface unknown elements, never fail.
- `fcp_export_otio(projectSpec)` / `fcp_import_otio(otio)` — native TS port of [`otio-fcpx-xml-lite-adapter`](https://pypi.org/project/otio-fcpx-xml-lite-adapter/) (~1500 LoC Python → TypeScript). Zero Python dependency. csos becomes the cleanest agent-driven path from FCP → OTIO → Resolve / Premiere / AAF.
- `fcp_extract_library(bundlePath)` — `.fcpbundle` listing via FCP-mediated XML export (NOT raw flexolibrary parse — that's volatile DeepSkyLite Core Data per the rules).
- `fcp_audit_roles(spec)` — role coverage / orphans / collisions on a parsed spine. Walk every clip's `videoRole` / `audioRole`, report unused roles + role-less clips + same-named role conflicts.
- `fcp_feature_soup()` — golden fixture exercising every shipped element type. Regression on every csos release; doubles as a public FCP-version probe ("does FCP 12.3 still preserve mc-clip on round-trip? import this, re-export, run the diff").
- `fcp_caption_lint` extension — Magnetic Mask drop case from Apple 2024 advisory (caption with `mask` attribute silently drops the mask data). Today's lint only checks role; extend to mask awareness.
- `fcp_anchor_safety` extension — same pattern, additional case caught by the swarm's enumeration.

**Ship criteria:**
- 8 new tools registered (5 new + 3 extension cases)
- OTIO bridge round-trips a fixture project: csos spec → OTIO → re-imported spec === original (modulo known transformations)
- `fcp_feature_soup` golden fixture covers every shipped element type and DTD-validates clean
- Phase 7 smoke green

## v1.8.0 — Phase 3 keystone bump

After all five sub-phases tag green, v1.7.x → v1.8.0. The bump earns its name because Phase 3's keystone is met: every app has ≥14 tools, every protocol that Phase 4 wants to ship has the surface it needs.

**v1.8.0 ship criteria:**
- All five sub-phases green (v1.7.11 through v1.7.15 tagged)
- 50 new tools across the five apps (Logic 13, Numbers 16, Pages 12, Motion 4, FCP 5)
- Phase 7 smoke covers all 50 new tools (queries in `tests/fixtures/toolcompass-queries.json`)
- Phase 8 smoke (the keystone protocol) still green — no regressions to the v1.7.10 baseline
- Cross-app coverage parity: every app at ≥14 tools (FCP 30, Compressor 15, Pixelmator 33, Logic 16, Motion 14, Keynote 56, Pages 17, Numbers 21)
- Memory updated, roadmap updated, v1.8.0 tag created
- `creator-studio-os verify` green on real apps

## What Phase 3 does NOT do

- **No new protocols.** Phase 4's job. The brand-deck-minimal keystone stays as csos's only protocol through Phase 3.
- **No npm publish.** Held until the Full Treatment lands. Director's gate.
- **No Apple Intelligence wrappers.** Phase 6.
- **No reverse-pipeline tools.** Phase 6.
- **No marketplace registry.** Phase 7+.
- **No multi-machine farm.** Phase 7+.

## Operating constraints carried forward

Every PR follows the rules established in Phase 1 + Phase 2:

- Every new tool follows [`docs/reference/tool-descriptions.md`](./reference/tool-descriptions.md) conventions.
- Every new tool gets an intent fixture in `tests/fixtures/toolcompass-queries.json`.
- Smoke phases 1–8 stay green for every PR.
- AppleScript strings → `escapeAppleScriptString`; FCPXML attrs → `escapeXmlAttr`.
- Errors are `CreatorStudioError {code, message, hint}`; no raw stacks.
- No UI scripting as default; opt-in flags only. Logic keystroke route rejected.
- Web-search before deferring on any integration unknown.
- `gh repo list mcp-tool-shop-org --limit 100` before naming any "new" tool concept (and `git tag -l "v*" | sort -V | tail -5` before claiming a tag landed — both per `feedback_check_publish_stack_before_assuming.md`).
- Never silently swallow errors. Typed catch blocks per `feedback_applescript_reproducer_before_diagnosis.md`.
- Look at images / videos before describing them — `feedback_look_at_images.md`.

## Why this ordering

Logic first because it's the smallest scope and the around-Logic pattern doesn't depend on anything new. Numbers next because the Python sidecar architecture is novel and worth landing before Pages depends on `numbers_create_sheet_with_table` for mail-merge ergonomics. Pages next because mail-merge is the protocol-blocker for `protocol.batch_letter`. Motion media swap depends on the validate extensions and the OZML coordinated-edit pattern proved by `OzmlTextEditor`. FCP parser + OTIO last because the round-trip diff already exists and the parser is foundation for Phase 4 protocols that need to read FCP state.

If any sub-phase reveals a deeper issue (e.g. `numbers-parser` doesn't handle a specific spreadsheet shape we need), pause that sub-phase and resolve before continuing. Don't skip-and-come-back — the orchestrator pattern depends on the surface being complete when Phase 4 reaches into it.

---

**Last updated:** 2026-05-06. Source: synthesis of 2026-05-05 deep research swarm + Phase 1 + Phase 2 ship state. Ready for the v1.7.11 build session.
