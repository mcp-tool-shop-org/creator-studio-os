# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.12] — 2026-05-06

### Changed (npm publish prep)
- **Package rename:** `@mcptoolshop/creator-studio-os` → `@creator-studio-os/creator-studio-os`. Per `CLAUDE.md` publish-target rule. The `@creator-studio-os` scope is the canonical npm home for this product.
- **First public npm publish.** Triggered by GitHub Release v1.7.12 → `npm publish --access public --provenance` via `.github/workflows/publish.yml`.

### Translations on disk (5 of 7)
- ja, zh, es, fr, pt-BR present and verified non-degenerate (15-17KB each, full content)
- **hi (Hindi) and it (Italian) deferred to v1.7.13** — polyglot-mcp run completed only 5 of 7 languages; re-run picks up the cache and fills in the remaining two.

---

## [1.7.11] — 2026-05-06

### Added (Full Treatment — Phases 0, 4 partial)
- **Phase 0 (Shipcheck):** `SHIP_GATE.md` + `SCORECARD.md` from `npx @mcptoolshop/shipcheck init`. 28/35 items checked, 7 SKIP'd with justification, all hard gates A-D pass.
- **Phase 4 (Coverage):** `@vitest/coverage-v8` with lcov/json reporters, coverage CI step, Codecov upload via `codecov-action@v4`.
- **Phase 4 (Dependabot):** `.github/dependabot.yml` — monthly npm dependency updates, grouped, max 3 PRs (per `.claude/rules/github-actions.md`).
- **Phase 4 (CI scanning):** `npm audit` step added to ci.yml for supply-chain scanning.
- **Phase 3 plan:** `docs/phase-3.md` — v1.8.x build plan covering Logic depth (13 tools), Numbers data + Python sidecar (16 tools), Pages mail merge (12 tools), Motion media swap (4 tools), FCP parser + OTIO bridge (8 tools).

### Changed
- **README:** updated to v1.7.10 product reality (all 8 apps live, cross-app composite protocol, tool count, brand-deck-minimal walkthrough, threat model). Logo + badges centered. Handbook badge points to landing page that ships in next bump.
- **SECURITY.md:** added Supported Versions table and 48h/7-day response timeline.
- **`docs/roadmap.md`:** rewritten with Phase 3 / 4 / 5 / 6 / 7 strategic frame, total surface projection, out-of-scope reaffirmation.
- Version bump: 1.7.10 → 1.7.11 (treatment patch — partial).

### Deferred to next bump (Full Treatment Phases 1, 2, 3, 5, 6, 7)
- README translations (Mike runs `polyglot-mcp` locally per `translation-workflow.md`)
- Starlight handbook site (`npx @mcptoolshop/site-theme handbook --accent blue`)
- Landing page deploy at `https://mcp-tool-shop-org.github.io/creator-studio-os/`
- GitHub repo metadata (homepage URL — depends on landing page deploy; topics not yet set)
- Repo-knowledge DB entry (`scan` + thesis + architecture + relationships)
- Post-deploy verification (Pagefind, codecov badge real data, ja translation degenerate-output check)

---

## [1.7.10] — 2026-05-06

### Fixed
- Shortened motion scene content to fit Atmospheric-Lower Third fixed text bounds: title `"Motion Templates"` (16 chars, clipped) → `"OZML Edits"` (10 chars); subhead `"OZML mutation, no GUI"` (21 chars, clipped) → `"No GUI required"` (15 chars). Pure `demo/csos-showcase/project.json` edit.

---

## [1.7.9] — 2026-05-06

### Changed
- Brand card now carries constant `"Creator Studio OS"` identity (size 108, centered upper-half) instead of per-scene `scene.title`. The Motion lower-third at bottom-left is the sole carrier of per-scene content (title + subhead). Per-scene hue rotation still differentiates background colors.
- Downloaded brand logo (`demo/csos-showcase/brand/csos-logo.png`, 929 KB) from `mcp-tool-shop-org/brand`. Logo is `rgb24` (no alpha) — not composited this version; deferred until a transparent version exists.

---

## [1.7.8] — 2026-05-05

### Added
- `compressor-encode` Path 1: ffmpeg overlay composites each ProRes 4444 scene clip (transparent alpha canvas) over its brand card PNG per scene, then concat — brand card is now the visible background behind the Motion lower-third
- `subhead` field added to `SceneSchema` (`src/projects/types.ts`); patches `textNodeIndex=1` in Motion templates, clearing the `"Description"` placeholder
- `compressorProRes4444SettingPath` added to `Config` (points to `StompUI.framework` `proRes4444Name.compressorsetting`, separate from the `CompressorKit` settings directory that `compressorBundledSettingsDir` covers)
- `E_COMPRESSOR_FLUSH_TIMEOUT` error code

### Fixed
- Moov-atom race condition: Compressor reports `"completed"` before the QuickTime moov atom is fully flushed. Added 10×500ms `ffprobe` readiness poll after `waitFor` before handing the path to the composite step
- `"Description"` placeholder in Atmospheric lower-third subhead now replaced by `scene.subhead` on all 6 showcase scenes

---

## [1.7.7] — 2026-05-05

### Added
- `patchSiblingText` function in `src/apps/motion/textEdit.ts`: handles Apple Compositions sibling-object OZML layout where `<object>` glyph elements are siblings of `<text>`, not children. All Apple-bundled Motion templates (Atmospheric-Lower Third, etc.) use this layout
- 16 tests for `patchSiblingText` covering sibling replacement, `textNodeIndex` selection, output path, error codes, and `allowNonAscii`

### Fixed
- `E_OZML_PARAM_NOT_FOUND` on all Apple bundled Motion templates: `render-scene-clips` now tries `editText` first, falls back to `patchSiblingText` on `E_OZML_PARAM_NOT_FOUND`

---

## [1.7.6] — 2026-05-05

### Added
- `render-scene-clips` step (step 3 of `brand-deck-minimal`): per-scene Motion lower-third render via Compressor. Clones `.motn` template, patches scene title via OZML edit, submits headless Compressor render, writes `.mov` clip per scene under `out/.csos/scene-clips/`

### Changed
- `compressor-encode` source priority: (1) per-scene Motion clips → concat, (2) Pixelmator PNG slideshow, (3) lavfi fill

---

## [1.7.3] — 2026-05-05

### Fixed
- Pixelmator `compose-brand-cards`: replaced `make new rectangle` (exit -2710, wrong class) with `make new rectangle shape layer`. Fixed silent fallback that produced 35s of identical solid-color frames
- `compose-brand-cards` catch block now only swallows `E_AUTOMATION_DENIED`; all other errors (including AppleScript -2710) propagate so they're never silently papered over

---

## [1.7.2] — 2026-05-05

### Fixed (honest scope + visual correctness)

- **Protocol rename — `brand-deck-minimal`:** The protocol previously named `steam-trailer-minimal` has been renamed to `brand-deck-minimal` to reflect its actual scope: a 12-step ffmpeg title-card slideshow → Compressor pipeline, not a Motion-rendered trailer. `steam-trailer-minimal` is kept in the registry as a legacy alias pointing to the same implementation until v1.7.3 delivers the real Motion-render path. Smoke Phase 8 updated accordingly.
- **Per-scene hue-rotated title cards (step 2 real mode):** Brand cards are now generated by ffmpeg lavfi with a per-scene hue rotation (+25° per scene index from the project's `brand.primaryColor`). Avoids `drawtext` (unavailable without libfreetype) and eliminates the 1-byte Pixelmator stub fallback. Each scene produces a visually distinct solid-color PNG (confirmed: 6 distinct hues across the csos-showcase project). Helpers `hexToHsl()` and `hslToHex()` added as pure TypeScript with no external dependencies.
- **Eyeball gate lesson:** v1.7.1 smoke passed 9/9 but the deliverable was 35 seconds of identical solid-navy frames — the stub fallback silently made all scenes identical. The fix (hue rotation) ensures the visual content is differentiated even without a Pixelmator template. A `movEyeballGate` with pHash frame differentiation is tracked for a future smoke phase.

---

## [1.7.1] — 2026-05-05

### Fixed (smoke green — real-render path working)

- **Phase 8 real-render path:** `runPhase8` now branches on Phase 0 app health — real ProRes encode via Compressor when all four apps are healthy, dry-run fallback otherwise. First confirmed end-to-end render: `csos-showcase-main.mov` (19 MB, 35s ProRes 422).
- **Protocol `projectOutDir` absolute path:** `resolve()` added in `src/protocols/index.ts` so external CLIs (Compressor, ffmpeg) always receive absolute paths, not relative ones.
- **Protocol step 9 real-mode encode:** Fixed three bugs — wrong preset path (`cfg.dataDir/shared/presets/` → `resolveBundledPreset` using bundled `compressorBundledSettingsDir`); wrong `jobPath` (FCPXML → ffmpeg slideshow from brand cards); wrong `locationPath` (`dirname(outputMovPath)` → `outputMovPath`). Added lavfi solid-color fallback when brand cards are stubs (Pixelmator AppleScript pending), `-loglevel error` flag, and 10 MB maxBuffer.
- **Tool descriptions (Phase 7):** `csos_app_status` now surfaces for "Final Cut Pro healthy" and "Compressor queue depth" queries. `keynote_reorder_slide` surfaces for "move slide to different position". `keynote_to_compressor_gif` surfaces for "export slideshow as animated GIF". All 12 Phase 7 queries now pass.
- **`.gitignore`:** Added `out/` and `demo/**/out/` — smoke reports and protocol render outputs are generated at runtime and should not be versioned.

---

## [1.7.0] — 2026-05-05

### Added (Phase 2.4 — Keystone protocol v1.7.0)

**`csos_protocol_run` — MCP SEP-1686 Tasks-compliant cross-app protocol engine:**

- **MCP Tasks integration:** `csos_protocol_run` is registered via `server.experimental.tasks.registerToolTask` with `taskSupport: "required"`. Returns `taskId` immediately; clients poll `tasks/get` for status, `tasks/result` for the final step summary. `InMemoryTaskStore` wired to `McpServer` constructor. Background goroutine runs the protocol and calls `taskStore.storeTaskResult` on completion or failure.
- **`protocol.steam-trailer-minimal` (12-step pipeline):** `validate-project` → `compose-brand-cards` → `edit-motion-title` → `resolve-fcp-params` → `build-fcpxml` → `safety-preflight` → `dtd-validate` → `fcp-import` → `compressor-encode` → `monitor-encode` → `verify-output` → `write-replay-manifest`. Dry-run safe; all external calls are mocked. First true cross-app protocol in csos — all 8 apps coordinated.
- **Idempotency substrate:** sha256(protocolName|slug|sceneIds|deliverables) as idempotency key. Replay manifest at `out/.csos/replay-<taskId>.json` (11 step entries + `completedAt`). `--resume <taskId>` skips steps whose inputHash matches the previous manifest.
- **`csos_protocol_list` / `csos_protocol_describe`:** lightweight synchronous tools for enumerating and describing protocols. No task store required.
- **`src/projects/types.ts` — ProjectV2 schema:** `schemaVersion: 2`, `slug` (kebab-case), `brand` (primaryColor/secondaryColor/fontFamily/logoPath), `deliverables: Record<string, {format, resolution, codec, frameRate}>`, `scenes: [{id, title, durationSeconds, notes?}]`, `motionTemplatePath?`, `motionTitleText?`, `scoreMap?` (Motif-compatible, no Motif package dep).
- **`demo/csos-showcase/project.json`:** 6-scene bundled demo about csos itself — hook → FCP → Motion → Compressor → Pixelmator → keystone. All assets in-repo, scoreMap included.
- **Smoke Phase 8:** `p8-protocol-steam-trailer.ts` — 2-scene fixture dry-run. Gates: 12 steps enumerate, MOV placeholder exists, manifest has 11 entries with valid idempotencyKey, resume run skips all non-final steps.
- **`creator-studio-os protocol` CLI subcommand:** `list`, `describe <name>`, `run <name> --project <path> [--dry-run] [--resume <taskId>]`. Synchronous CLI path (no task store); tick-by-tick step output.
- **Error codes:** `E_PROTOCOL_NOT_FOUND`, `E_PROTOCOL_FAILED`, `E_PROTOCOL_RESUME_FAILED`, `E_PROJECT_V2_INVALID`.

**Tests:** 396 total (36 new — 14 `protocol-types.test.ts` + 22 `protocol-steam-trailer.test.ts`). Smoke: 9/9 phases pass.

---

## [1.6.5] — 2026-05-05

### Added (Phase 2.3 — Keynote 45-tool leapfrog)

**48 new Keynote MCP tools — total Keynote surface raised from 8 to 56:**

- **2.3.1 Document management (3 tools):** `keynote_list_presentations`, `keynote_create_presentation` (with optional theme + dimensions), `keynote_save`.
- **2.3.2 Theme & master (4 tools):** `keynote_list_themes`, `keynote_apply_theme`, `keynote_list_masters`, `keynote_set_slide_master`.
- **2.3.3 Slide CRUD (7 tools):** `keynote_list_slides`, `keynote_make_slide`, `keynote_delete_slide`, `keynote_duplicate_slide`, `keynote_reorder_slide`, `keynote_skip_slide`, `keynote_get_slide`.
- **2.3.4 Content (6 tools):** `keynote_set_title`, `keynote_set_body` (resize-before-text discipline for >48pt clipping bug), `keynote_set_text_style`, `keynote_get_presenter_notes`, `keynote_set_presenter_notes`, `keynote_extract_all_notes` (crew handoff — all slides at once).
- **2.3.5 Transitions (1 tool):** `keynote_set_transition` — all 43 sdef-defined effects plus full transition properties record (effect, duration, delay, automatic).
- **2.3.6 Visual elements (10 tools):** `keynote_insert_image` (with VoiceOver description), `keynote_set_voiceover_description`, `keynote_insert_shape` (with `object text` iWork quirk handled), `keynote_insert_line`, `keynote_insert_table`, `keynote_read_table`, `keynote_write_table`, `keynote_make_chart` (sdef-native `add chart` with full data — competitors miss this), `keynote_make_image_slides` (Apple-bundled bulk-image-deck compound), `keynote_list_items`.
- **2.3.7 Item ops (3 tools):** `keynote_position_item`, `keynote_format_item` (opacity/rotation/reflection), `keynote_get_item_info`.
- **2.3.8 Slideshow (2 tools):** `keynote_start`, `keynote_stop`.
- **2.3.9 Creator Studio AI (3 tools):** `keynote_clean_up_slide`, `keynote_super_resolution`, `keynote_remove_background`.
- **2.3.10 sdef-depth exports (3 tools beyond existing):** `keynote_export_pdf_advanced` (handout layout / slide numbers / image quality / password), `keynote_export_movie_advanced` (full codec ladder: h264/HEVC/ProRes/ProRes422/4444 + 9 framerates), `keynote_export_html`. Updated `keynote_export_images` with `allStages` + `compressionFactor`.
- **2.3.11 Doc config (2 tools):** `keynote_set_doc_size` (1920×1080 vs 1024×768 toggle), `keynote_set_kiosk_mode` (autoPlay/autoLoop/autoRestart/idleTimeout).
- **2.3.12 Cross-app composition (4 tools — first cross-app primitives in csos):**
  - `keynote_from_markdown` — md2key-style markdown→Keynote via inline parser (cover/h1/h2/h3/quote/bullets/imageOnly/code master mapping, `masterMap` override, single-osascript batched write — saves ~400ms × N round-trips).
  - `keynote_to_storyboard_fcp` — export slide PNGs + extract notes → build FCPXML gap timeline with one asset-clip per slide, slide titles as clip names — ready to import into FCP as a starting edit. **Phase 2's first cross-app primitive.**
  - `keynote_to_compressor_gif` — export deck → QuickTime movie → Compressor GIF encode. Cross-app pipeline: Keynote → Compressor.
  - `keynote_plan_magic_move` — sets magic move transition and renames elements by shared name to enable Keynote's element-identity pairing (pairing by name, not position, is folklore — now encoded).

**New markdown parser module:** `src/apps/keynote/markdown.ts` — lightweight sdf-free parser for `keynote_from_markdown`. Pure TypeScript, no dependencies. Slide-type detection: heading depth → master, ≥3 bullets → bullets master, standalone `![]()` → imageOnly, `> blockquote` → quote, ` ``` ` code fence → code.

### Internal

- 360 unit tests (was 317) — 2 new test files: `keynote-markdown.test.ts` (29 tests), `keynote-storyboard.test.ts` (14 tests).
- 49 new tool-compass intent fixtures.
- Total: **150 MCP tools** (was 102 — +48 Keynote tools).

## [1.6.4] — 2026-05-05

### Added (Phase 2.2 — Motion text editor + FCP timeline shapes)

**1 new Motion tool + 4 FCP timeline shape extensions:**

- **2.2.1 `motion_template_edit_text` (1 tool):** `OzmlTextEditor` — replaces the visible text in a Motion title template (.motn/.moti) with four coordinated atomic edits: CDATA replacement, `<object>` glyph list rebuild (one per Unicode codepoint, newlines included per invariant 15), `<styleRun>` last-run stretch, plus five validators (glyph-count, kerning-sequence, styleRun-contiguity, style-references, ASCII-vs-Unicode gate). Atomic temp-file + rename — a half-written .motn never lands on disk. `textNodeIndex` selects the nth text block in multi-title templates. Non-ASCII gated by `allowNonAscii` until smoke against a Japanese template confirms codepoint encoding. Protocol step 3 of `steam_trailer_minimal`.

- **2.2.2 FCP anchored asset-clips:** `ClipSpec` gains a `lane` field (default 0). `lane != 0` emits the clip as a child of the primary spine clip whose time range contains it — standard FCPXML connected-clip pattern for B-roll overlays. `checkAnchorSafety` tightened to detect cross-type lane collisions (title vs. anchored clip on same lane).

- **2.2.3 FCP compound clips (`ref-clip`):** New `RefClipSpec` (kind: `ref-clip`) + `CompoundMediaSpec` array on `ProjectSpec`. Builder emits `<media><sequence>` in `<resources>` + `<ref-clip ref="...">` in the spine. `validateCompoundSafety` tightened: detects two ref-clips sharing the same `mediaId` (the propagation-on-save trap documented in the FCP research).

- **2.2.4 FCP multicam clips (`mc-clip`):** New `MulticamClipSpec` (kind: `mc-clip`) + `MulticamMediaSpec` array. Builder emits `<media><multicam>` with per-angle `<mc-angle>` elements + `<mc-clip>` in the spine with `<mc-source>` angle assignments. Round-trip cliff documented: mc-clip is flattened to N compounds by Resolve/Premiere.

- **2.2.4b FCP captions (`<caption>`):** New `CaptionSpec` (kind: `caption`) with mandatory `role` attribute. Builder emits `<caption role="..." ...>`. `lintCaptions` tightened: CaptionSpec items checked at builder time for valid `Role.Subrole` format AND recognised FCP prefix (`iTT.`, `CEA-608.`, `SRT.`) — catching silent-drop before DTD validation.

**New error codes:** `E_OZML_GLYPH_COUNT_MISMATCH`, `E_OZML_KERNING_ID_GAP`, `E_OZML_STYLERUN_GAP`, `E_OZML_STYLE_REFERENCE_DEAD`, `E_NON_ASCII`, `E_REF_CLIP_PROPAGATION`, `E_MULTICAM_ANGLE_MISSING`, `E_CAPTION_ROLE_INVALID`.

### Internal

- 317 unit tests (was 274) — 2 new test files: `motion-text-edit.test.ts` (20 tests), `fcpxml-shapes.test.ts` (23 tests).
- 6 new tool-compass intent fixtures.
- Total: **102 MCP tools** (was 101).

## [1.6.3] — 2026-05-05

### Added (Phase 2.1 — Pixelmator full sdef)

**22 new Pixelmator Pro MCP tools (+1 smoke Phase 0 health pre-flight):**

- **2.1.1 Layer authoring (7 tools):** `pixelmator_make_layer` (image/text/shape), `pixelmator_set_layer_properties` (visibility/opacity/blend mode/position/size), `pixelmator_layer_order` (front/back/before/after), `pixelmator_group_layers`, `pixelmator_ungroup`, `pixelmator_set_layer_text` (font/size/color/alignment), `pixelmator_make_shape` (rectangle/rounded-rectangle/ellipse/line with fill+stroke).
- **2.1.2 Blend modes + layer styles (3 tools):** `pixelmator_set_blend_mode` (all 28 sdef blend modes), `pixelmator_set_layer_shadow`, `pixelmator_set_layer_stroke`.
- **2.1.3 Effects + color adjustments (2 tools):** `pixelmator_apply_effect` (23 Pixelmator Pro effect classes), `pixelmator_apply_color_adjustment` (24 color-adjustment properties including custom LUT; non-destructive mode supported).
- **2.1.4 ML + Shortcuts bridge (2 tools):** `pixelmator_apply_ml` (11 algorithms: super_resolution with exact-dimension resize, enhance, denoise, deband, match_colors, remove_background, select_subject, 4× auto-adjust), `pixelmator_run_shortcut` (Shortcuts.app bridge — reaches ML knobs the sdef can't, e.g. portrait background removal).
- **2.1.5 Detect + replace (3 tools):** `pixelmator_detect` (face bounding boxes + QR decoded message payload), `pixelmator_replace_text` (sdf `replace` across all text layers), `pixelmator_replace_layer` (swap image layer content while preserving adjustments/effects/styles).
- **2.1.6 HDR + advanced exports (5 tools):** `pixelmator_export_hdr` (HDR JPEG/HEIC/AVIF/PNG — auto-enables `display hdr content`), `pixelmator_export_video` (MP4/QuickTime Movie), `pixelmator_export_animated` (Animated GIF/PNG), `pixelmator_export_for_web` (web-optimized PNG/JPEG/WebP/GIF/SVG with scale+sRGB options). Also exports PSD (via existing `pixelmator_export`).
- **2.1.7 Brand-card composer (1 tool):** `pixelmator_compose_brand_card` — reads brand tokens (logo, headline, subhead, tagline), opens a `.pxd` template, replaces `{{HEADLINE}}`/`{{SUBHEAD}}`/`{{TAGLINE}}`/`{{LOGO}}` slots, exports at each requested size (PNG or HDR PNG). First protocol primitive for `protocol.steam_trailer_minimal` step 2.

**Supporting modules:** `src/apps/pixelmator/{blendModes,layers,styles,effects,ml,detect,brandCard}.ts`

**Smoke harness:** Phase 0 health pre-flight (`src/smoke/phases/p0-app-health.ts`) — runs `csos_app_status` for required apps before real-app phases; phases that depend on an unhealthy app surface as `skip` (not `fail`), keeping the smoke signal honest.

### Internal

- 274 unit tests (was 205) — 6 new test files: `pixelmator-layers`, `pixelmator-effects-ml-detect`, `pixelmator-hdr-exports`, `pixelmator-brand-card`, `smoke.test.ts` gained Phase 0 tests.
- 23 tool-compass intent fixtures added to `tests/fixtures/toolcompass-queries.json` (21 Pixelmator + 2 app-status from v1.6.2).
- Total: **101 MCP tools** (was 79).

## [1.6.2] — 2026-05-05

### Added (Phase 2.0 — Foundation infrastructure)

- **`csos_app_status`** — unified app health tool. Single MCP tool with `app` param dispatching to all 8 Creator Studio apps. Returns `{ running, healthy, version, frontDocument, queueDepth, inFlightJobs, lastError }`. Compressor probes the queue via `-monitor` (2.5s timeout); FCP/Pixelmator/iWork query front-document via AppleScript; Motion/Logic check process existence. `app: "all"` queries all 8 in parallel. Dry-run mode loads fixtures from `tests/fixtures/app-status/`. (`src/apps/status.ts`, `src/apps/status-tool.ts`)
- **`src/runners/awaitOutput.ts`** — generalized output-file completion primitive. `awaitOutputFile({ pathStem, dir, timeoutSec, settledMs })` polls a directory for any file whose stem matches, returns when size is stable. Replaces identical inline loops in smoke Phase 1 and Phase 2. Stability check prevents returning partially-written files.
- **`src/runners/withDaemonRecovery.ts`** — generalized daemon-state recovery wrapper. `withDaemonRecovery(profile, fn)` catches errors matching a `RecoveryProfile.badStatePattern`, runs `recover()`, retries `fn()` once. One retry; non-matching errors pass through immediately.
- **Per-app recovery profiles** (`src/apps/<app>/recovery.ts`). Compressor: "Unable to submit to queue" → `killall Compressor` + 2s wait, extracted from the inline v1.6 retry. Motion/FCP/Logic/Pixelmator/Keynote/Pages/Numbers: typed stubs (no known bad states yet).
- **`creator-studio-os doctor`** — one-shot diagnostic dump. Reports version, Node, all 8 app versions + running state, tool-compass path + reachability, data dir stats. `--json` for machine-readable output.
- **`creator-studio-os ledger <project>`** — ledger reader CLI. `--since 1h/30m/2d`, `--tool <name>`, `--errors`, `--tail N`, `--json`. Reads `.csos/ledger.jsonl` and formats a human-readable session log.
- **`tests/fixtures/app-status/`** — 8 fixture files (one per app), used by dry-run mode and unit tests.
- **`src/ledger/reader.ts`** — `readLedger()` + `parseSince()` + `formatLedger()`.

### Changed

- **`src/apps/compressor/cli.ts`** — `encodeJob` refactored to use `withDaemonRecovery(compressorRecovery, fn)` instead of inline recursive retry. Public API unchanged (`_retried` parameter removed — was an implementation detail).
- **`src/smoke/phases/p1-compressor-monitor.ts`** — inline output-file poll replaced with `awaitOutputFile`.
- **`src/smoke/phases/p2-motion-render.ts`** — inline output-file poll replaced with `awaitOutputFile`.
- **`src/server.ts`** — `registerStatusTool()` added; version bumped to 1.6.1.

### Internal

- 205 unit tests (was 169) — added `app-status`, `await-output`, `daemon-recovery`, `ledger-reader` test files.
- 23 test files total.

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
