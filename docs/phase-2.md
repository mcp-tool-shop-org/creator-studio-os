# Phase 2 — v1.7.0 build plan

## The thesis

Phase 1 proved csos can drive each app correctly in isolation. Phase 2 proves csos can compose them.

The keystone of Phase 2 is not a tool count. It's **one working end-to-end protocol against a real deliverable**: `protocol.steam_trailer_minimal` against the bundled csos showcase demo. Input is a `project.json`. Output is a rendered `.mp4` at deliverable spec, sitting on disk. Every tool call in between is observable in the ledger. The whole pipeline runs from one `creator-studio-os protocol run` invocation.

**The showcase demo is csos's own promo.** A bundled project at `demo/csos-showcase/` with original assets (color-generator backgrounds, csos-branded text cards, public-domain or self-generated footage). The protocol renders a short promo MP4 for csos itself — usable as the README hero, the GitHub social card, and the public smoke fixture. Zero external IP, fully reproducible by anyone who clones the repo. The demo IS the marketing.

Private dogfood (operator's own products against csos) is the real-world validation Mike runs on his own machine — not a public artifact. csos is the engine, dogfood is the customer; the showcase demo is the product photo.

Until that protocol runs end-to-end against the showcase, the per-app surfaces are scaffolding without a roof. Once it runs, csos crosses the line that no other Apple-Creator-Studio MCP has crossed: it's not an automation library, it's a deliverable engine. Every additional protocol after `steam_trailer_minimal` is an instance of the same pattern.

The per-app expansion in Phase 2 is the dependency tree of that keystone:

- The protocol needs **brand-card composition** — Pixelmator's full sdef (layer authoring + text + blend modes + HDR exports).
- The protocol needs **timeline assembly with anchored B-roll, lower thirds, and transitions** — FCP's anchored / multicam / compound work.
- The protocol needs **customized Motion titles with bound parameters** — already shipped via v1.6's killer chain, plus text editing in 2.2.
- The protocol needs **a render that completes reliably across hardware** — the v1.6 smoke earned this; `csos_app_status` infrastructure makes it generalizable.
- The protocol needs **observability** — ledger entries from every step, replayable, recoverable.
- The protocol needs **a project schema** — `project.json` v2 with brand tokens, scene beats, deliverable matrix.

Keynote's 45-tool leapfrog runs in parallel because it serves the next protocols (`protocol.devlog`, `protocol.report`) and because no other Keynote MCP composes with FCP/Motion/Compressor — that's the moat we keep reinforcing.

## What "special" looks like at the end of Phase 2

```
$ creator-studio-os protocol run steam_trailer_minimal --project csos-showcase
[1/12] Loading project.json … 4 brand tokens, 6 scenes, ambient cue map
[2/12] Composing key art … Pixelmator → 1920×1080 + 2560×1440 + 1024×1024 (HDR)
[3/12] Customizing lower-third title … Motion OZML mutation → "creator-studio-os"
[4/12] Resolving published params … fcp_bind_motion_param → 4 bindings
[5/12] Building FCPXML 1.14 timeline … 6 scenes, 2 anchored generators, 2 lower thirds
[6/12] Validating safety pre-flights … compound ✓ caption ✓ anchor ✓
[7/12] DTD validation … FCPXMLv1_14.dtd ✓
[8/12] Importing into FCP … project visible: "csos showcase"
[9/12] Rendering via Compressor … H.264 1080p 14 Mbps
[10/12] Monitoring encode … 100% (sub-second on M5 Max)
[11/12] Output verified … out/csos-showcase-1080p.mp4 (12.4 MB)
[12/12] Ledger replay manifest written … out/.csos/replay-2026-XX-XX.json

✓ steam_trailer_minimal complete in 9.8s
```

That's the deliverable. Nobody else in the Apple-Creator-Studio MCP space has it. csos becomes a deliverable engine — the showcase demo proves it publicly, operators apply the same engine to their own private projects.

## Phase 2 sub-phases (six PRs)

Phase 2 is six PRs, ordered by dependency. Each ends green (tests + typecheck + smoke) before the next starts. Patch-bump versions per PR; **v1.7.0 lands when the keystone protocol runs end-to-end**, not before.

### 2.0 — Foundation infrastructure (v1.6.2)

**The smoke earned this.** The v1.6.0 real-app smoke surfaced three Compressor integration findings that aren't Compressor-specific — they're the shape of "fire-and-forget app driving." Phase 2.0 generalizes the lessons. Without this foundation, every protocol step inherits the same blindspot.

**Tickets:**

- **2.0.1 — `csos_app_status(app)` unified surface.** Each of the 8 apps implements an `AppStatusProvider` interface returning `{ running, healthy, queueDepth?, inFlightJobs?, lastError?, version }`.
  - Compressor: queue depth + in-flight from `-monitor` no-filter; `version` from `Info.plist` `CFBundleShortVersionString`
  - FCP: front-document name + library path via AppleScript; `version` similarly
  - Motion: process-list + scratch-dir watch for in-flight `.motn` renders
  - Logic: process state + bounce-dir watch
  - Pixelmator: process state + open-document via AppleScript
  - Keynote / Pages / Numbers: process state + front-document name
  
  Tool registers as `csos_app_status` (single tool, `app` param dispatches). App-status fixtures live in `tests/fixtures/app-status/*.json` so future agents adding apps add a fixture, not a special case. Memory entry [`memory/csos-discoverability-gate.md`](file://./memory) is the precedent — convention is the artifact, not the per-app code.

- **2.0.2 — Output-file completion primitive.** Generalize the v1.6 lesson: output-file mtime is more authoritative than monitor frames on sub-second renders. New helper `src/runners/awaitOutput.ts` exporting `awaitOutputFile({ pathStem, dir, timeoutSec, settledMs })` — polls a directory for any file whose stem (extension-stripped) matches `pathStem`, returns when size has been stable for `settledMs`. Use it from Compressor encode, Motion render, future Pixelmator batch, future Keynote movie export. The existing Compressor smoke phases use it inline; refactor to call the helper.

- **2.0.3 — Daemon-state recovery patterns.** Generalize the `killall Compressor` + retry pattern from v1.6 smoke. New helper `src/runners/withDaemonRecovery.ts` exporting `withDaemonRecovery(app, fn)` — wraps any tool call, detects daemon-state error matching the app's known-bad-state regex, runs the recovery (kill-and-wait, signal, etc.), retries once. The per-app recovery profiles live in `src/apps/<app>/recovery.ts`. Add Compressor's profile from existing inline code; Motion's profile (no known state issues yet — empty); FCP's profile (no automation daemon — N/A); etc. Future apps add recovery profiles when their smoke surfaces them.

- **2.0.4 — `creator-studio-os doctor` command.** Matches tool-compass's `doctor` pattern. One-shot dump: csos version, Node version, all 8 app paths + versions + bundle IDs, ollama reachability (if tool-compass detected on PATH or in venv), data dir + schema check, ledger size, recent error counts from ledger. JSON output via `--json`. Useful for support, GitHub issues, debugging. Wired into `src/cli.ts` alongside `verify` and `smoke`.

- **2.0.5 — `creator-studio-os ledger <projectName>` reader CLI.** `--since 1h`, `--tool <name>`, `--errors`, `--tail N`, `--json`. Reads `<dataDir>/projects/<name>/.csos/ledger.jsonl`, formats human-readable. The director can see what happened across a session without grepping JSONL.

**Smoke integration:** new Phase 0 health-check at the front of the harness. If `csos_app_status(<requiredApp>)` returns `healthy: false` for any app a downstream phase depends on, surface the error and skip those phases rather than fail them. Keeps the smoke signal honest.

**Ship criteria for v1.6.2:**
- `csos_app_status` returns valid shape for all 8 apps
- `awaitOutputFile` replaces inline Compressor smoke logic; smoke still 7/7 green
- `withDaemonRecovery` profiles present for all 8 apps (most empty stubs)
- `doctor` command works; outputs valid JSON
- `ledger` command works against the smoke project's existing ledger
- 175+ unit tests, all green

### 2.1 — Pixelmator full sdef (v1.6.3)

The 2026-05-05 swarm read the entire 3,044-line `PixelmatorPro.sdef`. The surface is 4× richer than v1.3's 11 tools. See [`docs/research/2026-05-05-deepswarm/03-pixelmator-depth.md`](./research/2026-05-05-deepswarm/03-pixelmator-depth.md).

**Tickets:**

- **2.1.1 — Layer authoring (~7 tools).** `pixelmator_make_layer({ kind: "image"|"shape"|"text", ...specs })`, `pixelmator_set_layer_properties` (visibility/opacity/blend mode/position/size), `pixelmator_layer_order` (front/back/before/after), `pixelmator_group_layers`, `pixelmator_ungroup`, `pixelmator_set_layer_text` (font/size/color/alignment/kerning/line-height/stroke/shadow), `pixelmator_make_shape` (rectangle/rounded-rectangle/ellipse/line with fill/stroke/opacity/shadow).

- **2.1.2 — Blend modes + layer styles (~3 tools, 27 enum values).** `pixelmator_set_blend_mode({ mode })` accepting all 27 sdef-blessed values from the Late Night Software library. `pixelmator_set_layer_shadow({ color, blur, offset, opacity })`. `pixelmator_set_layer_stroke({ color, width, position })`. Blend-mode enum table in `src/apps/pixelmator/blendModes.ts` so it's reusable.

- **2.1.3 — Effects + color adjustments (~2 dispatch tools, 23 effects + 24 color properties).** `pixelmator_apply_effect({ class, params })` dispatches across 23 effect classes (gaussian/box/disc/motion/zoom/spin/tilt-shift/focus/bump/pinch/circle-splash/hole/light-tunnel/twirl/vortex/pixelate/pointillize/crystallize/checkerboard/stripes/color-fill/image-fill/pattern-fill). `pixelmator_apply_color_adjustment({ type, params })` for the 24 color-adjustment properties incl. custom-LUT in/out.

- **2.1.4 — ML + Shortcuts.app bridge (~2 tools).** `pixelmator_apply_ml({ algorithm: "super_resolution" | "enhance" | "denoise" | "deband" | "match_colors" | "remove_background" | "crop" })` — typed surface for the ML algorithm enum. `pixelmator_run_shortcut({ name, input })` — Shortcuts.app bridge via `shortcuts run` CLI. Picks up Apple Intelligence ML knobs the sdef alone doesn't expose (portrait background removal, image upscale, color match — all 28 Pixelmator Shortcuts actions).

- **2.1.5 — Detect + replace (~3 tools).** `pixelmator_detect({ kind: "face"|"qr"|"barcode" })` returning structured detection result with payload (QR message text, face bounding boxes). `pixelmator_replace_text({ findText, replaceText })`. `pixelmator_replace_layer({ layerName, withImagePath })`. Massive value for game-asset templating.

- **2.1.6 — HDR + advanced exports (~5 export targets).** `pixelmator_export_hdr({ format: "jpeg"|"heic"|"avif"|"png", path, options })` for HDR variants. `pixelmator_export_video({ format: "mp4"|"mov", path, codec })` for the MP4/QuickTime export targets the swarm catalogued. csos becomes the first MCP shipping HDR Pixelmator exports.

- **2.1.7 — Brand-card composer (1 tool, the protocol's first dependency).** `pixelmator_compose_brand_card({ project, headline, subhead, sizes: [w×h][], outputDir })` — reads `project.json`'s brand tokens (logo path, primary/secondary colors, fonts), composes a layered brand card via `make_layer` + `set_layer_text` + `set_blend_mode`, exports each requested size via `export_hdr`. **First protocol primitive.** Other protocols (devlog thumb, social card) will reuse this same pattern in Phase 4.

**Ship criteria for v1.6.3:**
- ~25 new Pixelmator tools registered
- Each new tool has an entry in `tests/fixtures/toolcompass-queries.json`
- Phase 7 smoke still green
- `pixelmator_compose_brand_card` smoke-tested against the showcase brand tokens at `demo/csos-showcase/project.json`
- 200+ unit tests

### 2.2 — Motion text editor + FCP timeline shapes (v1.6.4)

The keystone protocol needs FCP timeline shapes beyond a single spine of asset-clips. And it needs Motion title text customization, not just numeric param mutation.

**Tickets:**

- **2.2.1 — `OzmlTextEditor` (1 tool, 5 validators).** `motion_template_edit_text({ path, newText, opts: { textNodeIndex? } })` implements the four coordinated edits from swarm slice §2 (text content, glyph objects, kerning IDs, styleRun ranges) gated by validators (glyph-count, kerning-sequence, styleRun-contiguity, style-references, ASCII-vs-Unicode). Atomic temp-file + rename. Multi-byte UTF-8 support gated behind `--unsafe-non-ascii` until smoke against a Japanese template confirms codepoint encoding. Smoke-tested against bundled Atmospheric-Lower Third — change "Title Here" to "creator-studio-os", validate clean, render via Compressor.

- **2.2.2 — FCP anchored items + secondary storylines.** Extend `ProjectSpec` with `anchoredItems: [{ parentRef, lane, offset, duration, ...kindSpec }]`. Builder emits `<asset-clip>` / `<title>` / `<video>` / `<audio>` as anchored children of a primary spine item. Pre-flight by `fcp_anchor_safety` (already shipped); tightened to walk anchored children for cross-anchor lane collisions.

- **2.2.3 — FCP multicam (`mc-clip`) + compound (`ref-clip`).** `mcClipSpecs: [{ name, angles: [{ name, format, mediaPath }], primaryAngle }]` — builder emits `<media>` of kind `multicam` plus the `<mc-clip ref=>` reference on the spine. `compoundClipSpecs: [{ name, sequence: ProjectSpec }]` — nested sequence, `<media>` of kind `sequence`, `<ref-clip ref=>` on the spine. Pre-flight by `fcp_validate_compound_safety` (already shipped, tightened for nested specs to check Mike-killer conditions like ref-clip-of-ref-clip and same-media propagation).

- **2.2.4 — FCP captions authoring.** `<caption>` elements with `role` attribute (mandatory — `fcp_caption_lint` already enforces). Time ranges, language, text content, formatting tags. Integrates with v1.6's `fcp_caption_lint` so the pre-flight catches role-less captions before DTD validation rather than after silent drop.

**Ship criteria for v1.6.4:**
- `motion_template_edit_text` smoke covered in 2.2.1 above (replace "Title Here" → "creator-studio-os" against bundled Atmospheric-Lower Third)
- FCP anchored / mc-clip / ref-clip / caption all DTD-validate against `FCPXMLv1_14.dtd`
- Pre-flights catch the obvious bad cases (overlapping anchors, undefined mc-angles, caption without role)
- 215+ unit tests

### 2.3 — Keynote 45-tool leapfrog (v1.6.5)

Parallel surface. Closes the [`reichenbach/iwork_mcp`](https://github.com/reichenbach/iwork_mcp) gap and adds 5 cross-app composition tools nobody else has. See [`docs/research/2026-05-05-deepswarm/06-keynote-depth.md`](./research/2026-05-05-deepswarm/06-keynote-depth.md).

**Tickets:**

- **2.3.1 — Slide authoring core (parity wave, ~12 tools).** `keynote_make_slide`, `keynote_set_slide_master`, `keynote_set_slide_layout`, `keynote_reorder_slides`, `keynote_duplicate_slide`, `keynote_skip_slide`, `keynote_apply_theme`, `keynote_set_doc_size`, `keynote_set_kiosk_mode`, plus per-slide background fill / image / opacity.

- **2.3.2 — Text on slides (parity wave, ~6 tools).** `keynote_insert_text` (with the resize-before-text discipline for the >48pt clipping bug), `keynote_set_text_style`, `keynote_set_text_alignment`, `keynote_set_kerning`, `keynote_insert_bullet`, `keynote_set_presenter_notes` (rich text, per-paragraph stylable).

- **2.3.3 — Visual elements (parity wave, ~10 tools).** `keynote_insert_image` (with VoiceOver `description`), `keynote_set_image_mask`, `keynote_make_shape` (with the `object text:` quirk handled centrally), `keynote_set_shape_fill`, `keynote_make_table`, `keynote_set_table_cell`, `keynote_make_chart` (creation only — styling impossible per sdef, document the ceiling clearly), `keynote_make_image_slides` (Apple-bundled bulk-image-deck compound), `keynote_set_transition` (43 named effects + transition properties record), `keynote_set_build` (per-element build in/out/action).

- **2.3.4 — sdef-depth wave (~8 tools beyond reichenbach).** Tools that exploit sdef facts reichenbach misses: `keynote_export_pdf_advanced` (password, handouts, image quality), `keynote_export_movie_advanced` (codec ladder h264/HEVC/ProRes/ProRes422/4444), `keynote_get_chart_data` (read-back), `keynote_set_voiceover_description`, etc.

- **2.3.5 — Cross-app composition wave (5 tools, csos's moat).** `keynote_to_storyboard_fcp({ document, fcpProjectName })` — read every slide title, emit FCPXML gap timeline with title overlays per slide, ready for FCP import. **Phase 2's first cross-app primitive.** `keynote_to_compressor_gif({ document, slideRange?, outputPath })` — export slides as images, encode as animated GIF via Compressor. `keynote_slide_to_motion_template({ document, slideIndex, templateName })` — slide → Motion title template scaffold. `keynote_plan_magic_move({ documentA, documentB })` — diff two decks for transition planning. `keynote_from_markdown({ markdownPath, theme?, outputPath? })` — md2key-style master mapping (cover / h1 / h2 / quote / bullets / image-only).

**Ship criteria for v1.6.5:**
- 45 new Keynote tools registered (53 total)
- All have intent fixtures in toolcompass-queries.json; Phase 7 smoke green
- `keynote_to_storyboard_fcp` smoke-tested: 3-slide deck → FCPXML → DTD-valid → import succeeds in FCP
- 260+ unit tests

### 2.4 — `protocol.steam_trailer_minimal` — the keystone (v1.7.0)

This is the version bump that earns 1.7.0. Everything before is patch.

**Tickets:**

- **2.4.1 — `project.json` v2 schema.** TypeScript types in `src/projects/types.ts`:
  ```ts
  export type ProjectV2 = {
    schemaVersion: 2;
    name: string;
    slug: string;
    kind: "game" | "devlog" | "podcast" | "report";
    brand: BrandTokens;          // W3C Design Tokens 2025.10
    canon?: { dir: string };     // optional pointer to canon dir
    motif?: { scoreMapPath: string };
    deliverables: Record<string, DeliverableSpec>;
    scenes: SceneBeat[];         // stable IDs as idempotency keys
    footage: FootageManifest;
    audio: AudioManifest;
    roles: { dialogue: string; music: string; effects: string };
  };
  ```
  Schema validation via Zod in `src/projects/schema.ts`. Backward-compat with v1's flat shape — `loadProject(name)` upgrades v1 in memory and warns. Document the showcase demo's `project.json` layout as the canonical example in `docs/reference/project-schema.md`. The schema must be neutral — no game-specific fields. Operators using csos against private projects (games, podcasts, devlogs) drop their own `project.json` into their own data dir; csos doesn't care.

- **2.4.2 — Protocol orchestrator.** `src/protocols/index.ts` exporting `runProtocol({ name, project, opts })`. Dispatches by name. Each protocol is an async generator yielding `ProtocolStep` so progress streams to MCP `notifications/progress`. The orchestrator handles MCP SEP-1686 Tasks (taskId, cancel/list/status), idempotency keys (sha256 of inputs hash + scene-beat IDs), receipts at `out/.csos/receipts/<protocol>-<taskId>.json`, replay manifest at `out/.csos/replay-<taskId>.json`. Failure recovery uses 2.0.2's output-file primitive and 2.0.3's daemon-recovery wrap. Per-step retry policy declared in the protocol implementation, not the orchestrator.

- **2.4.3 — `protocol.steam_trailer_minimal` implementation.** Generic — reads any v2 `project.json`, no hard-coded names or paths. The bundled `demo/csos-showcase/` is the smoke fixture, not a special-case. The 12-step pipeline from the thesis section. Each step is a tool call from existing csos surface (no new tools needed beyond what 2.0–2.3 already added). Step-by-step in `src/protocols/steam-trailer-minimal.ts`. Total LOC: under 500. The pipeline is the spec — readable top-to-bottom, no clever indirection.

- **2.4.3a — `demo/csos-showcase/` bundled project.** Self-referential: the showcase demo's content is csos itself. Brand tokens use the csos logo + colors. Scene beats highlight v1.6 features (OZML mutation, FCP round-trip diff, killer chain). Footage is original — color generators, gradient backgrounds, csos-branded text cards rendered through Pixelmator. **No external IP, no copyrighted assets, no game references.** Output MP4 is publishable as csos's own README hero / GitHub social card. The demo is the marketing.

- **2.4.4 — Smoke Phase 8 — protocol regression.** New `src/smoke/phases/p8-protocol-steam-trailer.ts`. Spawns `protocol.steam_trailer_minimal` against a fixture project (the showcase reduced to 2 scenes for smoke-time tractability). Asserts: 12 steps complete, MOV exists at deliverable spec, ledger has ≥12 entries, replay manifest written. Phase 8 becomes the integration gate for every protocol added in Phase 4.

- **2.4.5 — `creator-studio-os protocol` CLI subcommand.** `creator-studio-os protocol list`, `protocol describe <name>`, `protocol run <name> --project <name> [--task-id <id>] [--resume]`. Mirrors the MCP tool surface for terminal use. Useful for the director.

**Ship criteria for v1.7.0:**
- `protocol.steam_trailer_minimal` runs end-to-end against `demo/csos-showcase/` in <30s on M5 Max
- Output MP4 is publishable as csos's README hero / GitHub social card (zero IP encumbrance)
- Phase 8 smoke green; Phase 7 still green; all real-app phases green
- Replay manifest is valid; `protocol run --resume` re-runs from a checkpoint without redoing completed steps
- 290+ unit tests
- Memory entry for csos updated to "Phase 2 keystone shipped — first end-to-end protocol working against `demo/csos-showcase/` showcase demo, generic schema operators apply to private projects"

### 2.5 — Frontier add-ons (v1.7.1)

Now that the keystone runs, each frontier add-on is a force-multiplier that costs little and pays large.

**Tickets:**

- **2.5.1 — Apple Intelligence wrappers.** macOS 26's SpeechAnalyzer (beats Whisper by 55% per the swarm's findings) gets `csos_transcribe({ audioPath, language? })`. Image Playground developer API (if shipped) gets `csos_generate_image({ prompt, style })`. Writing Tools gets `csos_rewrite_text({ text, style })`. All optional — gated by macOS version detection in `csos_app_status`. Where available, they immediately enrich `protocol.devlog` and `protocol.podcast_episode` (those land in Phase 4).

- **2.5.2 — Reverse-pipeline starter.** `csos_extract_brand_from_image({ imagePath })` — Pixelmator-driven analysis returning dominant colors (top-5 with percentages) + detected fonts (via `pixelmator_detect` + OCR if available) + suggested logo crop. Produces a brand-tokens fragment ready to paste into `project.json`. The first reverse tool in csos's surface; seeds the larger `csos_reverse_engineer(videoPath)` tool that frontier slice §13 specced.

- **2.5.3 — Director's notebook.** `creator-studio-os notebook <projectName>` reads the ledger, groups by tool, summarizes durations/errors, formats a human-readable session log: "Cut v3 trailer — 02:14 changed scene 4 motif from `dread.tense` to `dread.peak`, re-rendered key art at 2x scale." Useful for handoff between sessions; pairs with the ledger CLI from 2.0.5.

**Ship criteria for v1.7.1:**
- AI wrappers gated and graceful when macOS version doesn't expose the underlying API
- `csos_extract_brand_from_image` produces valid brand-tokens fragment for at least 3 fixture images
- `notebook` command produces readable output for the smoke project's ledger

## What Phase 2 does NOT do

- **No npm publish.** Held until Phase 3+ delivers more protocols. Director's call.
- **No Logic depth work.** Logic stays at v1.3 thin surface; Phase 3 is where the around-Logic 13 tools land.
- **No Numbers Python sidecar.** Phase 3.
- **No Pages mail merge.** Phase 3.
- **No Motion media swap.** Phase 3 (depends on 2.2.1's text editor first proving the OZML coordinated-edit pattern).
- **No additional cross-app protocols.** Just the one keystone. `protocol.devlog`, `protocol.social_short`, `protocol.podcast_episode`, `protocol.report`, `protocol.batch_letter` all land in Phase 4 once the orchestrator is proven.
- **No FCP parser depth or OTIO bridge.** Phase 3.

## Operating constraints carried forward

- Every new tool follows [`docs/reference/tool-descriptions.md`](./reference/tool-descriptions.md) conventions.
- Every new tool gets an intent fixture in `tests/fixtures/toolcompass-queries.json`.
- Smoke phases 1–7 stay green for every PR; Phase 8 added in 2.4.
- Patch-bump per PR. v1.7.0 is the keystone bump.
- npm publish stays HELD.
- AppleScript strings → `escapeAppleScriptString`; FCPXML attrs → `escapeXmlAttr`.
- No UI scripting as default; opt-in flags only.
- Errors are `CreatorStudioError {code, message, hint}`; no raw stacks.
- Web-search before deferring on any integration unknown.
- `gh repo list mcp-tool-shop-org --limit 100` before naming any "new" tool concept.

## Why this ordering

Foundation infra first (2.0) because every later sub-phase calls into `csos_app_status`, `awaitOutputFile`, `withDaemonRecovery`. Pixelmator + Motion text + FCP shapes (2.1, 2.2) before the protocol (2.4) because they're the protocol's dependency tree. Keynote (2.3) parallel because its surface is independent of the keystone. Frontier add-ons (2.5) after the keystone because they enrich a working pipeline rather than build one.

The keystone is at 2.4 — last to land but first in priority. **Every preceding ticket is justified by what the protocol needs.** If a ticket spec drifts away from what the protocol actually consumes, push back on the ticket, not the protocol. The protocol is the spec.

---

**Last updated:** 2026-05-05. Source: synthesis of 2026-05-05 deep research swarm + v1.6.0/v1.6.1 smoke findings + the make-it-special directive. Ready for a fresh build session.
