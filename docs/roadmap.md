# Roadmap

This is the cross-app overview. Per-app depth lives in [`roadmap-fcp.md`](./roadmap-fcp.md), [`roadmap-compressor.md`](./roadmap-compressor.md), [`roadmap-pixelmator.md`](./roadmap-pixelmator.md), [`roadmap-logic.md`](./roadmap-logic.md), [`roadmap-motion.md`](./roadmap-motion.md), [`roadmap-iwork.md`](./roadmap-iwork.md). Research synthesis: [`research/2026-05-05-deepswarm/00-INDEX.md`](./research/2026-05-05-deepswarm/00-INDEX.md).

## Shipped

- **v1.0 (2026-05-04)** — FCP authoring (FCPXML 1.14 build / validate / write / import; read-only AppleScript; project schema)
- **v1.1 (2026-05-04)** — Compressor encoding (CLI form, settings discovery, single + project encode)
- **v1.2 (2026-05-04)** — FCP authoring breadth (titles, transitions, audio levels, roles, library location)
- **v1.3 (2026-05-04)** — Pixelmator Pro (11 tools) + Logic Pro (3 thin tools)
- **v1.4 (2026-05-04)** — Motion (3) + Keynote (8) + Pages (5) + Numbers (5) — all 8 apps wired
- **v1.5 (2026-05-04)** — Motion OZML 4.0 parameter mutation (novel — first MCP globally)

**Current state:** 8 apps wired, 59 tools, 39 tests, CI green Node 20+22. **npm publish HELD** until product is complete.

## Phase 1 — v1.6 — Cross-cutting infrastructure + cheap swarm-surfaced wins

**The cheapest, highest-leverage work surfaced by the 2026-05-05 research swarm.** Each unlocks downstream work. Build plan: [`docs/phase-1.md`](./phase-1.md).

- **Compressor**: `compressor_monitor_stream` (MCP `notifications/progress` over `Compressor -monitor -format json`); `compressor_settings_inspect`; `compressor_codec_availability`; pause/resume/kill; `wait_for`.
- **Motion**: `motion_render_via_compressor` (first headless Motion render path globally — `compressor -jobpath <.motn>` accepts Motion files directly); `motion_template_validate` (31 OZML invariants); `motion_publish_to_fcp` (toggles the `Publish To FCP` marker — the FCP↔Motion binding lever).
- **FCP**: `fcp_round_trip_diff` (flagship — author → import → re-export → typed diff; catches 12 known silent transformations); `fcp_effects_catalog` (first JIT capability resource); `fcp_validate_compound_safety`; `fcp_caption_lint`; `fcp_anchor_safety`; `fcp_bind_motion_param` (cross-app glue paired with `motion_publish_to_fcp`); `targetVersion: "1.13" | "1.14"` builder field.
- **Cross-cutting**: ledger v1 (`projects/<name>/.csos/ledger.jsonl` append per tool call); unified `runApp(app, op, params)` runner with osascript auto-batching (kills 400ms startup tax across iWork bulk ops).

## Phase 2 — v1.7 — Pixelmator full sdef + Keynote leapfrog + app-status infrastructure

- **Pixelmator**: full sdef coverage — 22 export formats (HDR JPEG/HEIC/AVIF/PNG, OpenEXR, MP4, animated PNG/GIF), 27 blend modes, 23 effect classes, 24 color-adjustment properties, sdef-native `replace` / `replace image` / `detect face` / `detect QR code`. Plus `pixelmator_run_shortcut` (Shortcuts.app bridge) and `pixelmator_apply_ml`.
- **Keynote**: 45 tools = 28 reichenbach parity + 8 sdef-depth + 5 cross-app composition. `keynote_to_storyboard_fcp`, `keynote_to_compressor_gif`, `keynote_slide_to_motion_template`, `keynote_plan_magic_move`, `keynote_from_markdown` are uniquely csos.
- **Motion**: `OzmlTextEditor` (text replacement, four coordinated edits + five validators).
- **FCP**: anchored items, multicam, compound clips, captions authoring (gated by v1.6 pre-flights).
- **Infrastructure**: `csos_app_status(app)` unified status surface — surfaced as a gap by the v1.6.0 smoke matrix. Each app implements: Compressor (queue depth + in-flight jobs from `-monitor`), FCP (front-document name + library path via AppleScript), Motion (process-list check + in-flight `.motn`), Logic (process state + bounce-dir watch). Returns `{ running, healthy, queueDepth, inFlightJobs, lastError? }`. Closes the fire-and-forget blindspot: without this, multi-phase workflows can't detect stale daemon state before submitting. See [`docs/phase-2.md`](./phase-2.md) for the full build plan.

## Phase 3 — v1.8 — Logic + Numbers headless + Pages + Motion media swap

- **Logic**: 13 around-Logic tools — `project_inspect`, `watch_bounces` (MCP `resources/subscribe`), `sidecar_write/read`, `iac_send`, `alternative_thumbnail`, plus 9 novel csos-only adds (Motif-loop bounce iterator, take-audition LLM critique, IAC passive listener, etc.).
- **Numbers**: 16 AppleScript tools (bulk write, formulas, charts, sort, merge, sheet ops) + Python sidecar headless lane via `numbers-parser`.
- **Pages**: 12 tools — Pandoc-route markdown, body text discipline, mail merge from Numbers and CSV, table from JSON, replace placeholders.
- **Motion**: `OzmlMediaSwap` (media replacement with frame-rate cascade, audio retime, NTSC handling).
- **FCP**: parser + OTIO bridge (native TS port of `otio-fcpx-xml-lite-adapter`).

## Phase 4 — v2.0 — Cross-app composition protocols

A protocol is a higher-level workflow that composes per-app tools to produce a deliverable, addressed via MCP **SEP-1686 (Tasks)** — long-running orchestration with `taskId`, cancel/list/status, idempotency keys.

**Project schema:** `project.json` v2 — W3C Design Tokens 2025.10 brand tokens + deliverable matrix + scene beats with stable IDs (idempotency keys) + footage/audio manifests + centralized FCP role mapping.

**Six protocols:**
- `protocol.steam_trailer` (the keystone proof for the showcase deliverable)
- `protocol.devlog` (script + footage + Logic stems → FCP cut → Compressor encode)
- `protocol.social_short` (FCP 9:16 reframe → Compressor preset matrix)
- `protocol.podcast_episode` (Logic master → Compressor M4A + WAV → Pixelmator cover)
- `protocol.report` (Numbers → chart → Keynote slide → PDF)
- `protocol.batch_letter` (Pages mail merge → PDF → Compressor flatten/encrypt)

**v2.1+ adds frontier protocols** that nobody else can do because no other MCP owns all 8 apps + canon + Motif: `canon_to_trailer`, `devlog_from_commits`, `character_sheet_to_keynote`, `live_score_session`, `steam_press_kit`.

## Total surface

If the full swarm-proposed plan lands, csos goes from **59 tools today** → **~206 tools + 6 protocols + 5 frontier protocols** across four releases. Multi-quarter build, not a sprint. **No publish until all apps are sufficiently fleshed out** (director's decision).

## Out-of-scope (reaffirmed by the swarm)

- UI scripting as a default. Logic keystroke route stays rejected. FCP UI scripting only behind explicit `--allow-ui-scripting` opt-in.
- `.fcpbundle` flexolibrary parsing. Volatile DeepSkyLite Core Data — touch only via FCPXML round-trip.
- Logic `ProjectData` parsing. Binary, undocumented, EULA-adjacent.
- Private framework calls (`Compressor.framework`, `Interchange.framework`). Park as research-only.
- Marketplace registry build. Open the door (publishing convention) — don't build the building.
