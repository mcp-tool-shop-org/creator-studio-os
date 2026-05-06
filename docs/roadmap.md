# Roadmap

This is the cross-app overview. Per-app depth lives in [`roadmap-fcp.md`](./roadmap-fcp.md), [`roadmap-compressor.md`](./roadmap-compressor.md), [`roadmap-pixelmator.md`](./roadmap-pixelmator.md), [`roadmap-logic.md`](./roadmap-logic.md), [`roadmap-motion.md`](./roadmap-motion.md), [`roadmap-iwork.md`](./roadmap-iwork.md). Per-phase build plans: [`phase-1.md`](./phase-1.md) (v1.6 — shipped), [`phase-2.md`](./phase-2.md) (v1.7 — shipped), [`phase-3.md`](./phase-3.md) (v1.8 — next). Research synthesis: [`research/2026-05-05-deepswarm/00-INDEX.md`](./research/2026-05-05-deepswarm/00-INDEX.md).

## Shipped

- **v1.0 → v1.5** (2026-05-04) — All 8 apps wired, Motion OZML 4.0 parameter mutation
- **v1.6.x** (Phase 1 — 2026-05-05) — Cross-cutting infrastructure + cheap swarm-surfaced wins. Compressor monitor stream, Motion render-via-compressor, FCP round-trip diff, FCP effects catalog, Motion-FCP killer chain, ledger v1, unified `runApp` runner, tool-compass discoverability gate.
- **v1.7.x** (Phase 2 — 2026-05-05/06) — Pixelmator full sdef (33 tools), Keynote 45-tool leapfrog (56 total), Motion text editor + sibling-layout patch (`patchSiblingText`), FCP anchored items / multicam / compound clips / captions, app-status infrastructure, **`protocol.brand-deck-minimal` keystone** running end-to-end against the bundled showcase demo with real-app smoke green and visible Motion lower-third overlays composited on Pixelmator brand cards.

**Current state:** v1.7.10 — 78 MCP tools, 410 tests, 9/9 real-app smoke green including `movEyeballGate`. The killer chain is real: brand cards (Pixelmator) + per-scene Motion lower-thirds (OZML mutation + headless Compressor render) + composited final encode. csos's first shippable visual deliverable lives at `demo/csos-showcase/out/csos-showcase-main.mov`.

**npm publish:** HELD. Director's gate. The Full Treatment is the path that moves it.

## Phase 3 — v1.8.x — Per-app depth completion

Phase 1 and Phase 2 left five apps at thin or partial coverage. Phase 3 closes the per-app surface so every app csos drives has non-trivial depth, not just file-handoff. No new protocols — depth, not breadth. Build plan: [`phase-3.md`](./phase-3.md).

- **Logic Pro** (3 tools → 16): `logic_project_inspect` (read-only `.logicx` plist parsing — `ProjectInformation`, `MetaData`, `DisplayState`, `WindowImage.jpg` per-Alternative cover), `logic_watch_bounces` (MCP `resources/subscribe` over chokidar/fsevents), `logic_sidecar_write/read` (`.logicx` JSON sidecar for cue-name / scene-tag / motif-family / take notes), `logic_iac_send` (CoreMIDI virtual port + IAC bus via `easymidi` for MMC transport), `logic_alternative_thumbnail` extract, plus 9 novel csos-only adds (Motif-loop bounce iterator, take-audition LLM critique, IAC passive listener, etc.). Keystroke route stays rejected.
- **Numbers** (5 → 21): 16 AppleScript tools (bulk write, formulas, charts creation, sort/merge/sheet ops, compound `numbers_create_sheet_with_table`) + Python sidecar lane via `numbers-parser` (subprocess + JSON bridge, ~150ms cold start vs osascript's 400ms — only path to true headless `.numbers` data manipulation since no pure-JS alternative exists).
- **Pages** (5 → 17): Pandoc-route `pages_new_from_markdown`, body text discipline (`pages_set_body_text` / `pages_append_paragraph` with paragraph-traversal-rule), `pages_insert_table_from_json`, `pages_replace_placeholders`, `pages_mail_merge_from_numbers` (12.1+ built-in), `pages_mail_merge_from_csv` (composite tool: CSV → ephemeral Numbers doc → invoke from_numbers).
- **Motion** (10 → 14): `OzmlMediaSwap` (frame-rate cascade, audio retime curve, NTSC handling, ffprobe-driven dimension/duration matching, scene timeRange/playRange extension), plus `motion_template_validate` for media-factory invariants, `motion_factory_taxonomy_compile`, `motion_template_diff` for verifying mutations.
- **FCP** (22 → 30): Native TypeScript port of `otio-fcpx-xml-lite-adapter` (zero Python dependency for OTIO bridge), `fcp_export_otio` / `fcp_import_otio`, `fcp_audit_roles` (role coverage / orphans / collisions on parsed spine), `fcp_extract_library` via FCP-mediated XML export, `fcp_feature_soup` golden fixture, `fcp_caption_lint` extensions for the Apple-2024 Magnetic Mask drop case.

**Net add:** ~50 new tools across 5 apps. **Phase 3 keystone:** every app csos drives has at least 14 tools — coverage parity across the surface so Phase 4 protocols can reach into any app without scope-of-surface limiting which protocols ship.

## Phase 4 — v2.0.x — Protocol family

The orchestrator pattern proven by `protocol.brand-deck-minimal` (v1.7.0 surface + v1.7.7 cross-app composite) becomes the substrate for five additional protocols. Each is an instance, not greenfield. Phase 4's keystone is the moment csos transitions from "one deliverable engine" to "deliverable engine family."

- **`protocol.devlog`** — script.md + footage manifest + Logic-rendered stems → FCP cut with anchored B-roll + lower thirds → Compressor encode → YouTube + RSS asset variants. Depends on Phase 3 Logic bounce-watch + FCP anchored authoring.
- **`protocol.social_short`** — long-form FCPXML cut + crop spec → FCP 9:16 reframe → Compressor preset matrix (TikTok / Reels / Shorts). Depends on FCP transform/crop intrinsics.
- **`protocol.podcast_episode`** — Logic master export (manual operator step) → Compressor M4A + WAV archive → Pixelmator cover from project brand tokens. Depends on Phase 3 Logic bounce-watch.
- **`protocol.report`** — Numbers data sheet → chart creation → Keynote slide insert → PDF export. Depends on Phase 3 Numbers bulk-write + Keynote chart authoring (already shipped in v1.6.5).
- **`protocol.batch_letter`** — Pages mail merge from Numbers source → PDF → optional Compressor flatten/encrypt. Depends on Phase 3 Pages mail merge.

**Project schema v3:** extends ProjectV2 with deliverable-kind-specific metadata (`devlog: { episode, scriptPath }`, `podcast: { masterPath, coverSpec }`, `report: { sourceSpec, layoutTemplate }`). Backward-compatible with v2.

**Smoke Phase 8 extends:** each new protocol adds a fixture project + an asserted-deliverable shape. Phase 8 becomes the regression substrate — when an orchestrator change drifts, every protocol's smoke catches it.

## Phase 5 — v2.1.x — Frontier protocols

Protocols that compose canon-bound assets and Motif integration into deliverables that no other MCP family can produce, because no other MCP owns all 8 apps + a shared canon source + a shared score-map. Each requires operator-specific context (canon dir, Motif score-map).

- **`protocol.canon_to_trailer`** — read a canon dir (`/canon/*.md`) + Motif score-map → author a trailer's beat list from canon prose → orchestrate the brand-deck pipeline against it. The first protocol that authors content from upstream operator artifacts.
- **`protocol.devlog_from_commits`** — parse git log of an operator-specified repo for the last N days → Apple Intelligence Writing Tools rewrite into devlog narration → orchestrate `protocol.devlog` against the rewritten script.
- **`protocol.character_sheet_to_keynote`** — read 32-character canon → Numbers roster (stats per character) → Keynote slide per character (portrait from style-dataset-lab approved outputs + canon prose summary) → Pages dossier PDF. Three iWork apps + canon source + one button.
- **`protocol.live_score_session`** — Logic IAC bridge + Motif live cue triggering → bounce watcher → instant session log update. Real-time observability of an operator's scoring session.
- **`protocol.steam_press_kit`** — orchestrate `protocol.steam_trailer` + `protocol.report` (deliverables tracker) + Pages press-kit one-pager + Keynote pitch deck. One operator command produces the entire Steam-page asset bundle.

**Strategic frame:** Phase 5 protocols are why csos exists. Phase 1-4 build the engine; Phase 5 demonstrates what only this engine can do.

## Phase 6 — v2.2.x — Apple Intelligence + reverse pipeline + frontier infrastructure

Frontier add-ons that enrich every protocol that already ships, plus reverse-direction tools that turn finished media back into reusable specs.

- **`csos_transcribe`** via macOS 26 SpeechAnalyzer (beats Whisper by 55% per swarm finding). Optional, gated by macOS version detection.
- **`csos_generate_image`** via Image Playground developer API (if Apple ships it for macOS 26+).
- **`csos_rewrite_text`** via Writing Tools.
- **`csos_extract_brand_from_image`** — Pixelmator-driven analysis returning dominant colors + detected fonts + suggested logo crop. The first reverse tool.
- **`csos_reverse_engineer(videoPath)`** — given a finished video, extract scenes / cuts / motif structure / color grade / deliverable spec. Output: a reusable `project.json` template. ML-assisted via SpeechAnalyzer for dialogue + scene detect + color sampling.
- **Director's notebook** — `creator-studio-os notebook <project>` reads ledger, groups by tool, summarizes durations and errors, formats human-readable session log.

## Phase 7 — v2.3.x — Distribution + sustained product

After protocols are live and the engine works against operator dogfood, the work shifts to sustained product mode.

- **npm publish.** Rename `@mcptoolshop/creator-studio-os` → `@creator-studio-os`, ship under that org. Provenance enabled. The Full Treatment Protocol is the gate that earns this — see [`docs/full-treatment-prompt.md`](./full-treatment-prompt.md) for the canonical sequence.
- **Multi-machine farm.** Compressor `-computergroup` cluster across M5 Max + 5080 PC + future hardware. csos tracks farm state via the existing `csos_app_status` surface extended to remote nodes.
- **Marketplace pattern.** Operators publish `@csos-community/<protocol-pack>` packages following a publishing convention (csos doesn't host a registry — npm is the registry). The convention doc ships in `docs/publishing-protocols.md`.
- **GitHub Releases + auto-update channel.** csos shipped via npm + GitHub Releases. Auto-update channel for users who installed via Releases asset.

## Out-of-scope (reaffirmed)

- UI scripting as a default. Logic keystroke route stays rejected. FCP UI scripting only behind explicit `--allow-ui-scripting` opt-in.
- `.fcpbundle` flexolibrary parsing. Volatile DeepSkyLite Core Data — touch only via FCPXML round-trip.
- Logic `ProjectData` parsing. Binary, undocumented, EULA-adjacent.
- Private-framework calls (`Compressor.framework`, `Interchange.framework`). Park as research-only.
- Image generation inside csos. Generation belongs to `comfy-headless` / `style-dataset-lab` / `sprite-foundry` / `trellis-sprite-pipeline` — already shipped family members. csos consumes their outputs via `project.json` asset paths.
- Marketplace registry build. Open the door (publishing convention) — don't build the building.

## Total surface

Today: 78 tools, 1 protocol. End of Phase 3: ~128 tools, 1 protocol. End of Phase 4: ~128 tools, 6 protocols. End of Phase 5: ~128 tools, 11 protocols + canon-bound integration. End of Phase 6: ~135 tools, 11 protocols + reverse-pipeline + Apple Intelligence enrichment. End of Phase 7: published, multi-machine, sustained.

Multi-quarter build, not a sprint. The Full Treatment Protocol earns the publish gate when v1.7.10's polish meets v1.8.0's depth — director's call on which side of Phase 3 the treatment lands.
