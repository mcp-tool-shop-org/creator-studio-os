# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.1] — 2026-05-05

### Added

- **Smoke Phase 7 — tool-compass discoverability regression** (`src/smoke/phases/p7-toolcompass-discoverability.ts`): syncs csos's 78 tool descriptions into a tool-compass HNSW index and runs 12 representative intent queries. Each query must return its target tool in the top-3 results with score > 0.4. Catches description drift that breaks semantic retrieval. Dry-run mode for CI.
- **`tests/fixtures/toolcompass-queries.json`** — 12 query→target fixture pairs used by Phase 7 and open for inspection.
- **`docs/reference/tool-descriptions.md`** — verb-first / wrapper-lead / partial-step description conventions. Phase 7 enforces these; any drift that breaks retrieval fails the smoke.
- **README "Recommended setup with tool-compass"** section — `compass_config.json` snippet, install, and rationale.

### Changed

- **`compressor_encode_project`** description leads with "Convenience wrapper around compressor_encode" (was buried at end) to prevent semantic collision with `compressor_encode` in retrieval.
- **`fcp_fcpxml_build`** description now leads with timeline vocabulary: "Author a Final Cut Pro timeline (clips, titles, transitions, audio)". Pre-flight detail moved to the `skipPreflight` arg description.
- **`pixelmator_resize`** description now ends with "Doesn't write to disk — pair with pixelmator_export for output" to route export queries correctly.
- **`CLAUDE.md`** — new "Before editing any tool description string" section cites `docs/reference/tool-descriptions.md`.

### Internal

- 169 unit tests (was 168) — Phase 7 dry-run harness test added.
- Smoke harness extended from 6 to 7 phases in `src/smoke/index.ts`.

## [1.6.0] — 2026-05-05

### Added (19 new tools — Phase 1 automation chain complete)

**Compressor monitoring + settings intelligence (Tickets 1.3+1.4)**

- **`compressor_monitor_stream`** — stream live job progress from `Compressor -monitor -format json` as MCP `notifications/progress` events. First programmatic Compressor progress feed in any MCP.
- **`compressor_status`** — one-shot status query for a specific job/batch.
- **`compressor_pause`** / **`compressor_resume`** / **`compressor_kill`** — job lifecycle control.
- **`compressor_wait_for`** — block until a job reaches a terminal state (completed/failed/cancelled).
- **`compressor_settings_inspect`** — parse a `.compressorsetting` file and return video codec, container, resolution, frame rate, bitrate, and audio codec metadata. Uses `fast-xml-parser`.
- **`compressor_settings_resolve`** — resolve a human-readable preset display name to its file path.
- **`compressor_codec_availability`** — static table of codec availability by macOS arch + Compressor major version (e.g., ProRes RAW available arm64 10.4.4+; H.264 always available).
- Enhanced **`compressor_settings_list`** with optional `withAvailability` flag.

**Motion OZML deep tooling (Tickets 1.5–1.7)**

- **`motion_template_validate`** — validate a `.motn` / `.moti` against **31 OZML structural invariants** (factory id/uuid uniqueness, scenenode factory refs, global id uniqueness, parameter id collisions, keyframe value+curve conflicts, keypoint monotonicity, glyph count, kerning sequence, styleRun contiguity, dead style refs, clip id uniqueness, creationDuration formula, timing.out bounds, Publish To FCP marker placement). Returns `ok`, `violations[]`, `warnings[]`.
- **`motion_render_via_compressor`** — render a `.motn` headlessly via `Compressor -jobpath`. First programmatic Motion render path in any MCP — no UI scripting required. Returns `jobId`+`batchId` for piping into `compressor_monitor_stream`.
- **`motion_publish_to_fcp`** — add or remove the `"Publish To FCP"` marker on an OZML parameter. `publish=true` exposes the parameter in FCP's inspector; `publish=false` hides it. This is the OZML-side lever that makes the FCP↔Motion chain programmable.

**FCP automation chain (Tickets 1.8–1.11)**

- **`fcp_effects_catalog`** — walk `~/Movies/Motion Templates.localized/`, `/Library/Application Support/Motion/Templates.localized/`, and the FCP-bundled `MotionEffect.fxp` path. Parses each `.moti`/`.motn` for display name, published parameter names, and param count. Cache at `<dataDir>/.csos/effects-catalog.json`. Supports `kind` filter, name lookup (`E_EFFECT_NOT_FOUND`), and `refresh=true`.
- **`fcp_safety_compound`** — detect primary-spine clip overlaps that trigger implicit compound clip insertion by FCP.
- **`fcp_safety_captions`** — lint caption/subtitle role assignments for the `"Role.Subrole"` format FCP requires; flags missing subroles and incorrect iTT/SRT pattern.
- **`fcp_safety_anchors`** — detect title (connected-clip) anchor collisions: two titles on the same lane with overlapping time ranges.
- **`fcp_bind_motion_param`** — read published parameters from a `.moti`/`.motn`; optionally build a `MotionParamBinding` `{ name, key, value }` for `TitleSpec.params`. Verifies the parameter has the Publish To FCP marker.
- **`fcp_round_trip_diff`** — compare two FCPXML files (before/after FCP import) and return a structured diff of 16 change kinds: clip-offset-changed, clip-duration-changed, clip-role-changed, clip-volume-changed, title-text/param/lane-changed, clip/title/transition-inserted/deleted, asset-replaced, format-changed. Sub-frame tolerance (1ms) filters FCP's rational→decimal rounding noise.
- **`fcp_round_trip_capture`** — extract FCPXML from inside a `.fcpbundle` library package by recursively finding `object.fcpxml` or `.fcpxml` files (both modern directory-format and legacy single-file). No FCP instance required.

### Changed

- **`fcp_fcpxml_build`** now runs safety pre-flights by default. New `allowUnsafe` and `skipPreflight` params suppress/skip checks. Preflight result included in output.
- **`fcp_fcpxml_build_write_import`** accepts `allowUnsafe` for the same pre-flight control.
- **`TitleSpec`** gains optional `params: MotionParamBinding[]` — drives `<param name="..." key="..." value="..."/>` children in the emitted `<title>` element.

### Internal

- **Ledger** (`src/ledger/index.ts`) — append-only JSONL operation audit trail, O_APPEND atomic writes, `withLedger()` helper. Path: `<dataDir>/projects/<name>/.csos/ledger.jsonl`.
- **`runApp`** (`src/runners/runApp.ts`) — unified facade over osascript/open. `BatchRunner` accumulates script fragments and flushes as a single `osascript` call, eliminating the ~400ms per-call startup tax. Dry-run mode enables unit tests without live apps.
- **`fast-xml-parser`** dependency already added in v1.5.0 context; now used by Compressor settings inspector and FCPXML round-trip parser.
- New error codes: `E_OZML_VALIDATION_FAILED`, `E_OZML_PUBLISH_MARKER_MISSING`, `E_FCPXML_ROUNDTRIP_FAILED`, `E_FCPXML_PARSE_FAILED`, `E_EFFECT_NOT_FOUND`, `E_COMPOUND_UNSAFE`, `E_CAPTION_ROLE_MISSING`, `E_ANCHOR_COLLISION`, `E_COMPRESSOR_MONITOR_FAILED`, `E_LEDGER_WRITE_FAILED`.

### Tool count: 78 (was 59)

| App | Tools | Surface |
|-----|-------|---------|
| Final Cut Pro | 24 | FCPXML author + AppleScript read + safety + diff + capture |
| Compressor | 15 | CLI encode + monitor stream + settings intelligence |
| Motion | 6 | File handoff + OZML inspect/mutate/validate/render/publish |
| Pixelmator Pro | 11 | AppleScript: open/close/export/resize/crop/rotate/flip/batch |
| Logic Pro | 3 | File handoff |
| Keynote | 8 | AppleScript: open/close/export PDF/images/movie/PPTX |
| Pages | 5 | AppleScript: open/close/export 5 formats |
| Numbers | 5 | AppleScript: open/close/export PDF/Excel/CSV |
| **Total** | **77** | |

### Coverage

157 tests across 18 test files.

## [1.5.0] — 2026-05-04

### Added (Motion OZML mutation — novel capability)

Motion's `.motn` file format is documented by Apple as **OZML 4.0**. The 2026-05-04 research swarm flagged that **no public open-source `.motn` parser/generator exists on GitHub** — programmatic parameter mutation is a genuinely novel MCP capability with zero prior art.

This release ships the safe slice — parameter value mutation only. Text replacement and media swap are deferred (they require coordinated updates across glyph-object elements, styleRuns, audio retime curves, and frame-rate cascades; one wrong byte and Motion silently corrupts the file).

3 new tools backed by `src/apps/motion/ozml.ts`:

- **`motion_template_inspect(path, filterName?, limit?)`** — parse a `.motn` / `.moti` and return OZML version, factory list, and the full parameter list (name, id, flags, value, defaultValue, hasChildren). Supports substring filter on parameter name and result limit.
- **`motion_template_set_param(path, name, id, value, options)`** — mutate a single parameter's value attribute in place or to a new path. Preserves all other content **byte-for-byte** (whitespace, comments, structure, ordering). When multiple parameters share the same name+id, `matchIndex` disambiguates. Special characters in the new value are XML-escaped.
- **`motion_template_clone(sourcePath, destinationPath)`** — copy a `.motn` template to a new path before mutating. **Never mutate Apple's bundled originals** in `/Applications/Motion Creator Studio.app/Contents/Resources/`.

### Smoke proof (real Motion template)

Verified end-to-end against Apple's bundled `Snap-Lower Third.motn` (Compositions / Snap / Snap-Lower Third) — 214,592 bytes, OZML 4.0, **16 factories**, **1,983 parameters**:

```
Mutation:    Size (id=3, matchIndex=0): 74 → 120
File delta:  +1 byte (exactly the digit-count difference)
Other Size:  instance preserved (matchIndex disambiguation works)
```

A +1 byte delta on a 214 KB file is the strongest possible proof of byte-level preservation — only the literal characters `74` were rewritten as `120`; everything else is untouched.

### Internal

- New error codes: `E_OZML_INVALID`, `E_OZML_FILE_MISSING`, `E_OZML_PARAM_NOT_FOUND`.
- 11 new tests on a tiny synthetic OZML fixture (39 passing total). Coverage: factory parsing, parameter listing, mutation, byte-preservation, matchIndex disambiguation, outputPath non-destructive variant, XML escaping, error paths.
- Implementation uses targeted attribute regex (not full XML round-trip) to guarantee byte-perfect preservation. The XML round-trip alternative would normalize formatting and risk Motion rejecting the file.

### Updated docs

- `docs/reference/motion-automation.md` — already corrected in the prior commit to credit OZML 4.0 as Apple-documented; this release ships the implementation.

### What's still deferred (per OZML structural risk)

- **Text replacement** — requires updating `<text>`, per-glyph `<object value="ASCII">` elements, per-glyph `<parameter name="Kerning" id="N">` indices, and `<styleRun length="...">` ranges in coordinated lockstep.
- **Media swap** — requires `<pathURL>`, `<relativeURL>`, `<missingWidth>`, `<missingHeight>`, `<missingDuration>`, `<creationDuration>` (= ceil(duration × frameRate)), `<timing>` in/out points, `<parameter name="Frame Rate">`, `<parameter name="Fixed Width">`, `<parameter name="Fixed Height">`, plus matching audio retime curves.

Both are roadmapped; both require OZML structural awareness beyond regex.

## [1.4.0] — 2026-05-04

### Added (Motion)

- 3 `motion_*` tools — Motion has no `.sdef` (verified), so surface is intentionally thin:
  - `motion_app_open`, `motion_app_running`
  - `motion_open` — `.motn` file-open handoff
- `docs/reference/motion-automation.md` documents the empty surface and Motion's role in cross-app composition (human authors templates with published parameters; FCPXML uses them).

### Added (Keynote)

- 8 `keynote_*` tools backed by `Keynote.sdef`:
  - `keynote_app_open`, `keynote_app_running`
  - `keynote_open`, `keynote_close`
  - `keynote_export_pdf`, `keynote_export_pptx`
  - `keynote_export_movie` (QuickTime)
  - `keynote_export_images` — slide images as PNG / JPEG / TIFF (configurable via `imageFormat`)

### Added (Pages)

- 5 `pages_*` tools backed by `Pages.sdef`:
  - `pages_app_open`, `pages_app_running`
  - `pages_open`, `pages_close`
  - `pages_export` — PDF / Microsoft Word / RTF / unformatted text / EPUB

### Added (Numbers)

- 5 `numbers_*` tools backed by `Numbers.sdef`:
  - `numbers_app_open`, `numbers_app_running`
  - `numbers_open`, `numbers_close`
  - `numbers_export` — PDF / Microsoft Excel / CSV

### Internal

- New `src/apps/iwork/shared.ts` — shared `activateApp` / `openDocumentInApp` / `closeDocumentInApp` / `exportDocumentInApp` helpers used by Keynote / Pages / Numbers (their AppleScript shape is identical except for the bundle ID and format enum).
- Config now exposes `motionAppPath`/`motionBundleId`, `keynoteAppPath`/`keynoteBundleId`, `pagesAppPath`/`pagesBundleId`, `numbersAppPath`/`numbersBundleId` with env overrides.
- New error codes: `E_MOTION_NOT_FOUND`, `E_KEYNOTE_NOT_FOUND`, `E_PAGES_NOT_FOUND`, `E_NUMBERS_NOT_FOUND`.
- `verify` now checks all 8 Creator Studio apps' install paths (15 checks total).

### Docs

- `docs/reference/iwork-automation.md` documents the shared iWork pattern + per-app export format enums.
- `docs/reference/motion-automation.md` documents Motion's empty automation surface.
- `docs/roadmap-pixelmator.md`, `docs/roadmap-logic.md` — separately committed.

### Coverage

All 8 Apple Creator Studio apps now wired:

| App | Tools | Surface |
|-----|-------|---------|
| Final Cut Pro | 15 | FCPXML 1.14 author + AppleScript read |
| Compressor | 6 | CLI encode + discovery |
| Pixelmator Pro | 11 | AppleScript: open / close / export 10 fmts / resize / crop / rotate / flip / batch |
| Logic Pro | 3 | File handoff (no sdef) |
| Motion | 3 | File handoff (no sdef) |
| Keynote | 8 | AppleScript: open / close / export PDF / images / movie / PPTX |
| Pages | 5 | AppleScript: open / close / export 5 formats |
| Numbers | 5 | AppleScript: open / close / export PDF / Excel / CSV |
| **Total** | **56** | |

## [1.3.0] — 2026-05-04

### Added (Pixelmator Pro)

- 11 `pixelmator_*` tools backed by Pixelmator Pro's AppleScript dictionary (`PixelmatorPro.sdef`):
  - `pixelmator_app_open`, `pixelmator_app_running`
  - `pixelmator_open` / `pixelmator_close` document lifecycle
  - `pixelmator_export` — 10 formats: PNG, JPEG, TIFF, HEIC, GIF, JPEG2000, BMP, WebP, SVG, PDF
  - `pixelmator_resize` — width / height / resolution PPI
  - `pixelmator_crop` — bounds rect, optional delete-mode
  - `pixelmator_rotate` — 180 / right / left
  - `pixelmator_flip` — horizontal / vertical
  - `pixelmator_batch_export_project_images` — convert every image in `projects/<name>/images/` to a chosen format, optionally resizing, output to `out/`
  - `pixelmator_batch_export_project_images_dryrun` — preview the batch plan without launching Pixelmator
- Bundle ID `com.apple.pixelmator` (Apple post-acquisition namespace; v4.2 in Creator Studio bundle).

### Added (Logic Pro)

- 3 `logic_*` tools — intentionally thin because Logic has **no AppleScript dictionary**:
  - `logic_app_open`, `logic_app_running`
  - `logic_open` — `.logicx` project file-open handoff via `open -b com.apple.mobilelogic`

### Added (verify + docs)

- `creator-studio-os verify` adds Pixelmator Pro and Logic Pro install checks (11 checks total).
- `docs/reference/pixelmator-automation.md`, `docs/reference/logic-automation.md`.

### Internal

- Config exposes `pixelmatorAppPath`/`pixelmatorBundleId`, `logicAppPath`/`logicBundleId` with env overrides.
- New error codes: `E_PIXELMATOR_NOT_FOUND`, `E_PIXELMATOR_FAILED`, `E_LOGIC_NOT_FOUND`.
- 1 new test (Pixelmator format list); 28 passing total.

## [1.2.0] — 2026-05-04

### Added (FCP authoring breadth)

- **Title spine items** with bundled "Custom" Build In:Out title effect (`.../Titles.localized/Build In:Out.localized/Custom.localized/Custom.moti`) as default. Configurable via `effectUid` / `effectName` on the title spec. Text styling: font, fontSize, fontColor (RGBA 0..1), alignment, bold, italic.
- **Transitions** on the spine. `kind: "transition"` items emit `<transition name="..." offset="..." duration="..."/>`. "Cross Dissolve", "Cross Blur", "Fade to Color" work via name attribute alone.
- **Per-clip audio levels** via `volumeDb` on `asset-clip` specs. `0` (default) emits no element; non-zero emits `<adjust-volume amount="-6dB"/>` etc.
- **Roles** — `videoRole` and `audioRole` attributes on `asset-clip` specs (e.g. `"Video.global"`, `"Dialogue.dialogue"`, `"Music.music"`, `"Effects.effects"`). Inherited by FCP's role-based audio routing.
- **Explicit library location** — `libraryLocation` on the project spec emits `<library location="file://...">` so FCP imports into / creates the named library on disk without the "import to which library?" dialog.

### Added (docs)

- `docs/reference/effect-uids.md` — UID catalog for built-in titles, with the verified Custom title path and how to discover more.
- `docs/roadmap-compressor.md` — Compressor wing milestones (human-readable preset names, multi-job batches, watch folders, FCP "Send to Compressor" handoff).

### Tests

- 6 new FCPXML builder tests (titles, transitions, adjust-volume on/off, roles, library location). 27 passing total.

### Internal

- Refactored builder spine emission to a per-kind dispatch with `renderClip` / `renderTitle` / `renderTransition`. Effects auto-deduplicated into resources.
- Spec-level `fcpxmlVersion` now honored end-to-end (was previously hardcoded in builder template).

## [1.1.0] — 2026-05-04

### Added

- Compressor wing: 6 new tools.
  - `compressor_app_open` — launch Compressor (idempotent; primes App Store entitlement validation).
  - `compressor_app_running` — System Events query.
  - `compressor_settings_list` — enumerate `.compressorsetting` presets from user + system dirs; `includeBundled=true` adds Apple's bundled presets.
  - `compressor_locations_list` — enumerate `.compressorlocation` files.
  - `compressor_encode` — submit a single encode via the CLI form (`Compressor -jobpath … -settingpath … -locationpath …`).
  - `compressor_encode_project` — convenience wrapper that resolves source / output paths inside a project directory.
- `creator-studio-os verify` now also checks Compressor app + binary presence.
- `docs/reference/compressor-cli.md` updated with the verified CLI form, settings/location paths, and the entitlement-validation behavior.
- `docs/roadmap-fcp.md` — FCP-specific roadmap (titles, transitions, audio levels, roles, library location, anchored clips, multicam, parser, render path, generators).
- 6 new tests; 22 passing total.

### Internal

- Added Compressor binary, bundle ID, and bundled-settings paths to `loadConfig()` (overridable via `CREATOR_STUDIO_COMPRESSOR_PATH`, `CREATOR_STUDIO_COMPRESSOR_BIN`, `CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS`).
- Added error codes: `E_COMPRESSOR_NOT_FOUND`, `E_COMPRESSOR_FAILED`, `E_JOB_NOT_FOUND`, `E_SETTING_NOT_FOUND`.
- Compressor CLI runner strips the wall of objc class-collision warnings macOS prints on every invocation.

## [1.0.0] — 2026-05-04

### Added

- Initial release of `@mcptoolshop/creator-studio-os`.
- MCP server with 15 tools for Final Cut Pro:
  - Project directory management: `fcp_project_list`, `fcp_project_create`, `fcp_project_info`
  - FCPXML 1.14 authoring: `fcp_fcpxml_build`, `fcp_fcpxml_validate`, `fcp_fcpxml_write`, `fcp_fcpxml_import`, `fcp_fcpxml_build_write_import`
  - Read-only AppleScript: `fcp_library_list`, `fcp_library_events`, `fcp_event_projects`, `fcp_project_metadata`
  - App lifecycle: `fcp_app_open`, `fcp_app_activate`, `fcp_app_running`
- `creator-studio-os verify` preflight CLI (platform, osascript, xmllint, FCP install, DTD, data dir, FCPXML round-trip)
- DTD validation against the FCPXML 1.14 schema bundled inside Final Cut Pro
- Canonical data directory schema at `/Volumes/T9-Shared/AI/creator-studio` (overridable)
- Structured error shape with `code`, `message`, and `hint` fields
- Threat model documented in `SECURITY.md` and `docs/threat-model.md`
