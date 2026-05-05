# Deep research swarm — 2026-05-05

Nine parallel research agents went deep on per-app surfaces, cross-app composition, and frontier mechanisms. Each agent had access to web search + WebFetch + local bundle inspection (sdef dump, plist parse, `Compressor -help`, OZML grep). 167 URL citations across the nine docs; several rewrites of the existing roadmaps come straight from live evidence.

**Trigger:** director (Mike) called for a real swarm rather than a defer-and-pick advisor brief — `feedback_advisor_mode_decisive.md`, `feedback_dont_push_smaller_scope.md`, `feedback_stop_normie_mode.md`, `feedback_webfetch_when_stuck.md` all in play. csos is a daily operator workbench, not a one-shot ship.

## The nine slices

| # | Slice | File | Headline finding |
|---|-------|------|------------------|
| 1 | FCP authoring + parser + interop | [`01-fcp-depth.md`](./01-fcp-depth.md) | 12 silent-transformation pitfalls catalogued; `fcp_round_trip_diff` is the flagship novel tool |
| 2 | Compressor depth | [`02-compressor-depth.md`](./02-compressor-depth.md) | **`Compressor -monitor [-format json]` ships live `percentComplete` today.** v1.2 progress was never deferred — Apple already provides it. |
| 3 | Pixelmator depth | [`03-pixelmator-depth.md`](./03-pixelmator-depth.md) | Surface is 4× richer than v1.3's 11 tools — 22 export formats, 27 blend modes, 23 effects, 24 color adjustments, `replace`/`detect` sdef-native |
| 4 | Logic depth | [`04-logic-depth.md`](./04-logic-depth.md) | `.logicx` plist surface confirmed shallow; **MCP `resources/subscribe` is the right transport** for `logic_watch_bounces`; `WindowImage.jpg` cover thumbnail is a unique hook |
| 5 | Motion OZML depth | [`05-motion-depth.md`](./05-motion-depth.md) | **`<parameter name="Publish To FCP" id="350" flags="80"/>` is the binding marker** for OZML→FCP chain. **`compressor -jobpath <.motn>` is a headless Motion render path** (first in any MCP). |
| 6 | Keynote authoring | [`06-keynote-depth.md`](./06-keynote-depth.md) | reichenbach's 41 tools have gaps — `add chart` accepts data+names directly, 43 transitions not 22. csos can leapfrog with 45 tools (parity + depth + cross-app) |
| 7 | Pages + Numbers depth | [`07-pages-numbers-depth.md`](./07-pages-numbers-depth.md) | Chart class is empty on both apps (creation only, no styling). Python sidecar over [`numbers-parser`](https://pypi.org/project/numbers-parser/) for the headless lane — no pure-JS alternative exists |
| 8 | Cross-app protocols + project schema | [`08-cross-app-protocols.md`](./08-cross-app-protocols.md) | **MCP SEP-1686 (Tasks)** is the right transport for long-running protocols; **W3C Design Tokens 2025.10** (now stable) for brand tokens; protocols are TS pipelines not YAML DSLs |
| 9 | Frontier / novel mechanisms | [`09-frontier.md`](./09-frontier.md) | Top 5: JIT capability resources, operator ledger + replay, MCP `notifications/progress`, unified `runApp()` with osascript auto-batching, determinism harness as framework |

## What this rewrites in the existing roadmaps

These are the roadmap deltas that come straight from live evidence, not opinion. Update the per-app roadmaps before the next sprint.

### Compressor — v1.2 collapses, v1.3 advances

[`roadmap-compressor.md`](../../roadmap-compressor.md) currently lists `compressor_status` and `compressor_wait_for_output` as v1.2, deferring live progress to v2+ and treating cluster storage file watching as the primary status mechanism. **All wrong.** Apple ships `Compressor -monitor [-format json|xml]` today with `percentComplete`, `timeRemainingSeconds`, `status` as first-class fields, plus `-kill / -pause / -resume / -info / -jobaction / -instances / -checkstream / -findletterbox`. Cluster-storage polling is debris. The roadmap should:

- Promote `compressor_monitor_stream` (MCP `notifications/progress` + `-monitor json`) into v1.2.
- Collapse v1.4 watch folder + v1.5 distributed processing into v1.3 (CLI exposes both today).
- Keep `.compressorbatch` reverse-engineering at v1.3 (the only real RE work left).

### Motion — render path is no longer hypothetical

[`roadmap-motion.md`](../../roadmap-motion.md) lists "no public render CLI" as a hard out-of-scope. Slice 5 verified `compressor -jobpath path/to/template.motn -settingpath ... -locationpath ...` accepts `.motn` files directly and honors the saved render quality. **Motion has a headless render path through Compressor.** The roadmap should:

- Add `motion_render_via_compressor(template, setting, location)` to v1.6 — earlier than text/media editing because it's a one-line wrapper.
- Promote the FCP↔Motion title binding chain ("the killer chain") to v1.6 first-class. The lever is the `Publish To FCP` parameter marker, programmatically settable via existing v1.5 OZML mutation.

### FCP — 12 silent transformations catalogued

[`roadmap-fcp.md`](../../roadmap-fcp.md) talks about "silent transformations FCP applies on import" as a v1.4 round-trip-verification motivation. Slice 1 enumerated 12 of them, including: position keyframes silently rejecting `interp`/`curve`; captions without `role` silently dropped; mc-clip flattening on third-party round-trip; ref-clip format-mismatch silent `conform-rate` insertion; locale-dependent Motion `param name=` lookups. Roadmap should:

- Promote `fcp_round_trip_diff` to v1.3 (before parser arrives) — author → import → re-export → typed diff. Catches the 12 silent transformations as a regression suite.
- Add `fcp_caption_lint`, `fcp_anchor_safety`, `fcp_validate_compound_safety` as cheap pre-flight checks.
- Add `fcp_effects_catalog` (host-installed effect/title/generator/transition discovery) — this is the JIT capability resource pattern from slice 9, applied first to FCP.

### Pixelmator — surface is 4× richer than what we ship

[`roadmap-pixelmator.md`](../../roadmap-pixelmator.md) v1.4 plans layer authoring + text. Slice 3 read the 3,044-line sdef and confirmed: 22 export formats (4 HDR variants we haven't surfaced), 27 Apple-blessed blend modes, 23 effect classes, 24 color-adjustment properties incl. custom-LUT in/out, sdef-native `replace` / `replace image` / `detect face` / `detect QR code` (with decoded message payload). Roadmap should:

- Expand v1.4 from "layer authoring + text" to "full sdef coverage" — ~25 new tools minimum.
- Promote `pixelmator_run_shortcut` (Shortcuts.app bridge) and `pixelmator_apply_ml` (typed ML algorithm enum) into v1.4.
- Add HDR export tools — csos becomes the first MCP with HDR JPEG/HEIC/AVIF/PNG export.

### iWork — Keynote leapfrog, chart honesty, Python sidecar

[`roadmap-iwork.md`](../../roadmap-iwork.md) v1.5 plans Keynote authoring at parity with reichenbach. Slice 6 confirmed reichenbach's 41 tools have gaps and proposed 45 tools for csos in v1.5 (28 parity + 8 sdef-depth + 5 cross-app). Slice 7 confirmed both Numbers and Pages have empty `chart` classes — chart **styling** is impossible via AppleScript, only creation works; document this honestly. Slice 7 also specced a Python sidecar over `numbers-parser` for headless `.numbers` (no pure-JS alternative; `.numbers` is snappy-protobuf). Roadmap should:

- Bump v1.5 Keynote target from "match reichenbach" to "leapfrog reichenbach + ship 5 cross-app tools no Keynote MCP has."
- Bump v1.6 Numbers target to 16 tools (was vaguer); add the headless lane as v1.8.
- Update the chart ceiling: creation yes, styling no (ever, until Apple fixes the sdef).

### Logic — observability over impersonation

[`roadmap-logic.md`](../../roadmap-logic.md) ceiling-finding holds. Slice 4 confirmed: keystroke-route stays rejected; `.logicx` plist surface is shallow (`ProjectInformation.plist`, `MetaData.plist`, `DisplayState.plist`, plus `WindowImage.jpg` per-Alternative cover thumbnail); MCP `resources/subscribe` is the right transport for `logic_watch_bounces`. Roadmap should:

- Confirm 13 tools across v1.5/v1.6 — 9 of them novel csos-only (Motif-loop bounce iterator, take-audition LLM critique, IAC passive listener).
- Reject the keystroke route in writing — competitors koltyj/che are documented as locale-fragile, AX-permission-thrash, version-coupled. csos doesn't ship that.

### Cross-app — protocols use MCP SEP-1686 (Tasks)

[`roadmap.md`](../../roadmap.md) lists v2.0 protocols. Slice 8 designed the `project.json` v2 schema (W3C Design Tokens 2025.10 + brand + deliverable matrix + scene beats with stable IDs as idempotency keys + footage/audio manifests). Long-running orchestration follows MCP SEP-1686 (Tasks): protocols return a `taskId`, support `cancel`/`list`/`status`, dedupe via SHA-256 idempotency keys. Six protocols walked tool-call by tool-call. Add to the roadmap:

- v2.0 = `protocol.steam_trailer` (the keystone proof for the showcase deliverable)
- v2.1 = `protocol.devlog`, `protocol.social_short`
- v2.2 = `protocol.podcast_episode`, `protocol.report`
- v2.3 = `protocol.batch_letter` + frontier protocols (`canon_to_trailer`, `devlog_from_commits`, `live_score_session`)

### Frontier — five things to seed across v1.6→v2.0

Slice 9's top-5 list folds back into the per-app and cross-app roadmaps as **infrastructure** rather than a separate lane:

1. **JIT capability discovery as MCP resources** — `resource://csos/fcp/effects-catalog`, `resource://csos/keynote/themes`, etc. Each per-app roadmap adds its catalog tool.
2. **Operator ledger + snapshot replay** — every csos action appends to `projects/<name>/.csos/ledger.jsonl`. Replay re-runs deterministically. Belongs in v1.6 as cross-cutting.
3. **MCP `notifications/progress`** — used first by Compressor `-monitor` (above), then by every long-running tool (FCP import, Compressor batch, Logic bounce watch).
4. **Unified `runApp(app, op, params)`** with osascript auto-batching — kills the 400ms startup tax across all iWork bulk ops. Single internal refactor in v1.6.
5. **Determinism harness** — round-trip checks per app, run as `csos verify --determinism`. Catches Apple's silent regressions before they reach a render.

## New per-app totals if all swarm-proposed tools land

| App | v1.5 today | After full swarm rollout | Net add |
|-----|------------|---------------------------|---------|
| FCP | 15 | 27 (adds 12 incl. round-trip diff, effects catalog, caption lint, anchor safety, motion bind) | +12 |
| Compressor | 6 | 14 (adds monitor stream, settings inspect, batch build, watch create, location resolve, etc.) | +8 |
| Pixelmator | 11 | 38 (adds 25+ for full sdef coverage, blend modes, ML, detect, replace, HDR exports, Shortcuts bridge) | +27 |
| Logic | 3 | 16 (adds 13 around-Logic — project_inspect, watch_bounces, sidecar, IAC, take-comparison, etc.) | +13 |
| Motion | 6 | 14 (adds validate, text editor, media swap, list, diff, render-via-compressor, publish-to-fcp marker) | +8 |
| Keynote | 8 | 53 (adds 45 — parity + sdef-depth + cross-app) | +45 |
| Pages | 5 | 17 (adds 12 — markdown, body text, tables, mail merge, replace, image insert) | +12 |
| Numbers | 5 | 21 (adds 16 — bulk write, formulas, charts, sort, merge, sheet ops, Python sidecar headless) | +16 |
| **Cross-app protocols** | 0 | 6 + 5 frontier | +11 |
| **Total tool surface** | **59** | **~206 + 5 frontier protocols** | **+152** |

This is the shape of "all apps sufficiently fleshed out." It's a multi-quarter build, not a sprint.

## Suggested release ordering

The swarm makes the right ordering clearer than my earlier advisor brief did. Each slice has its own "do these first" list; here's the cross-app ordering for the next four releases:

### v1.6 — Compressor monitor + Motion render path + cross-cutting infra

The cheapest wins from the swarm. Each unlocks downstream work.

- **Compressor**: `compressor_monitor_stream` (MCP `notifications/progress` over `-monitor json`); `compressor_settings_inspect`; `compressor_codec_availability`.
- **Motion**: `motion_render_via_compressor`; `motion_template_validate`; `motion_publish_to_fcp` (sets the binding marker).
- **FCP**: `fcp_round_trip_diff`; `fcp_effects_catalog` (the first JIT resource); `fcp_validate_compound_safety`.
- **Cross-cutting**: ledger v1 (`projects/<name>/.csos/ledger.jsonl`); unified `runApp()` runner with osascript auto-batching.

### v1.7 — Pixelmator full sdef + Keynote leapfrog

Two big surface expansions that close the obvious gaps.

- **Pixelmator**: full v1.4-v1.7 from the roadmap, accelerated. Layer + text + shape authoring, blend modes, ML enum, `replace_text`/`replace_layer`/`detect`, HDR exports, Shortcuts bridge.
- **Keynote**: 45-tool wave (parity + sdef-depth + 5 cross-app composition tools). Now ahead of reichenbach in surface AND uniquely capable in cross-app.

### v1.8 — Logic + Numbers headless + Pages + Motion text/media

The remaining per-app fills.

- **Logic**: 13 around-Logic tools (project_inspect, watch_bounces, sidecar, IAC, take comparison).
- **Numbers**: 16 AppleScript tools + Python-sidecar headless lane via `numbers-parser`.
- **Pages**: 12 tools incl. Pandoc-route markdown, body text discipline, mail merge.
- **Motion**: text editor v1.6 + media swap v1.7 from the existing roadmap.

### v2.0 — `protocol.steam_trailer` end-to-end

The keystone proof. Authored against the showcase deliverable with `project.json` v2 schema, MCP SEP-1686 (Tasks) for orchestration, ledger receipts under `out/.receipts/`. v2.1-v2.3 add the rest of the protocol family + frontier protocols.

## What does NOT belong in csos

The swarm reaffirmed every existing rejection and added one:

- **No UI scripting as a default.** Logic keystroke route stays rejected. FCP UI scripting only behind explicit `--allow-ui-scripting` opt-in.
- **No `.fcpbundle` flexolibrary parsing.** It's volatile DeepSkyLite Core Data — touch only via FCPXML round-trip.
- **No `ProjectData` parsing.** Logic's binary, undocumented, EULA-adjacent.
- **No private-framework calls.** Park `Compressor.framework` / `Interchange.framework` spelunking as research-only.
- **No marketplace registry build.** Open the door (publishing convention) but don't build the building.

---

**Last reviewed:** 2026-05-05. Sources: 167 URL citations across the nine slice docs, plus live bundle inspection (sdef dumps, plist decodes, `Compressor -help`, OZML grep on bundled `.motn` templates, MCP spec SEP-1686). All findings documented per-slice; this index is the navigator.
