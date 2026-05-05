# Phase 1 — v1.6 build plan

**Target:** v1.6.0 release. **Net add:** ~17 tools + cross-cutting ledger + unified runner. **Status:** ready to build.

This is the cheapest, highest-leverage slice surfaced by the [2026-05-05 deep research swarm](./research/2026-05-05-deepswarm/00-INDEX.md). Each ticket below has been pre-research'd; no further design discovery should be needed before coding starts. **No publish at end of phase 1** — publish gate is "all 8 apps sufficiently fleshed out" per director's standing rule.

## Why these tickets, in this order

The swarm surfaced findings that **rewrite three existing roadmap milestones** rather than just adding to them:

1. **Compressor live progress is not deferred — Apple ships `-monitor -format json` today** with `percentComplete` / `timeRemainingSeconds` / `status` as first-class fields. Cluster-storage polling (the prior plan) is debris. Build the streaming monitor first.
2. **Motion has a headless render path** — `compressor -jobpath <.motn>` accepts Motion files directly. First in any MCP. Single-tool wrapper.
3. **Motion↔FCP title binding has a discoverable lever** — the `<parameter name="Publish To FCP" id="350" flags="80"/>` marker. Closes the killer chain when paired with v1.5 mutation.

These three findings drive the ordering: ship the cheap CLI wrappers first, the validators they unlock, and the cross-app glue that wires them together. Cross-cutting infrastructure (ledger, unified runner) ships alongside because every later phase depends on it.

## Phase 1 tickets

Each ticket is sized so a single Claude session can complete it (design → implement → tests → smoke). **Each ticket ends green** (`npm test` + `npm run typecheck` + `creator-studio-os verify`) before the next starts. Tickets are ordered for dependency, not preference.

### Ticket 1.1 — Cross-cutting: error codes + ledger v1

**Why first:** every later ticket either appends to the ledger or adds an error code; do this once.

**Deliverables:**
- New error codes added to [`src/errors.ts`](../src/errors.ts):
  ```
  E_OZML_VALIDATION_FAILED, E_OZML_PUBLISH_MARKER_MISSING,
  E_FCPXML_ROUNDTRIP_FAILED, E_FCPXML_PARSE_FAILED,
  E_EFFECT_NOT_FOUND, E_COMPOUND_UNSAFE, E_CAPTION_ROLE_MISSING, E_ANCHOR_COLLISION,
  E_COMPRESSOR_MONITOR_FAILED, E_LEDGER_WRITE_FAILED
  ```
- `src/ledger/index.ts` — append-only JSONL writer at `<dataDir>/projects/<name>/.csos/ledger.jsonl`. Schema: `{ ts: ISO, tool: string, projectName?: string, args: unknown, result?: unknown, error?: { code, message, hint }, durationMs: number }`.
- Unit tests in `tests/ledger.test.ts` — append, concurrent-append safety (use `O_APPEND`), JSON parseability, no-project-context fallback path (`<dataDir>/.csos/ledger.jsonl`).
- Wire ledger into the existing tool-registration shape: small wrapper helper that times the call, captures result/error, appends.
- **No tool surface change.** The ledger is internal; it observes the existing tools so it's already useful in v1.6 even before phase-2 protocols read it back.

### Ticket 1.2 — Cross-cutting: unified `runApp()` runner with osascript auto-batching

**Why:** kills the 400ms osascript startup tax across every iWork tool that follows in phase 2/3. Refactor in v1.6 once, benefit forever.

**Deliverables:**
- New `src/runners/runApp.ts` exposing `runApp(app, op, params)` over osascript / `open -b` / Compressor CLI / `shortcuts run`. Internally dispatches by app + op kind.
- **Auto-batching:** consecutive osascript calls within the same tool invocation accumulate and run as one compiled script. Pattern: `runApp.batch(...)` opens a queue, `.run()` flushes. The current `runAppleScript` stays as the primitive; `runApp` is the higher-level facade.
- Migrate the existing `runners/applescript.ts` and `runners/openApp.ts` callers in `src/apps/*/tools.ts` to `runApp` — one app at a time so PRs stay reviewable.
- Tests in `tests/runApp.test.ts` — error mapping (osascript exit → `E_OSASCRIPT_FAILED`), batching round-trip, dry-run mode, transcript logging hook.
- Transcript hook calls into ledger.

### Ticket 1.3 — Compressor: `-monitor` streaming

**Why:** the swarm's headline finding. Turns Compressor into a streaming progress source no other MCP exposes.

**Deliverables:**
- `src/apps/compressor/monitor.ts`:
  ```ts
  export interface StatusFrame {
    jobId: string; batchId: string;
    status: "queued" | "active" | "completed" | "failed" | "cancelled";
    percentComplete: number;          // 0..100
    timeElapsedSeconds: number;
    timeRemainingSeconds: number;
    name: string; submissionTime: string; sentBy: string;
  }
  export async function* monitorStream(opts: {
    jobId?: string; batchId?: string;
    intervalSec?: number; timeoutSec?: number;
  }): AsyncIterable<StatusFrame> { /* Compressor -monitor -format json -query N */ }
  export async function statusOnce(opts): Promise<StatusFrame>;   // -monitor -once
  export async function jobAction(action: "pause"|"resume"|"kill", opts): Promise<void>;
  ```
- Tools registered in `src/apps/compressor/tools.ts`:
  - `compressor_monitor_stream({ jobId?, batchId?, intervalSec=5, timeoutSec=3600 })` — emits over MCP `notifications/progress` per the spec; final response is the last frame.
  - `compressor_status({ jobId?, batchId?, format="json", once=true })` — one-shot.
  - `compressor_pause`, `compressor_resume`, `compressor_kill` — `-jobaction` wrappers.
  - `compressor_wait_for({ jobId?, batchId?, untilStatus, timeoutSec })` — convenience over the stream.
- Switch existing `compressor_encode` submission to `-outputformat json` so submission returns structured `jobId` + `batchId` (replaces the regex parse).
- Tests in `tests/compressor-monitor.test.ts` — fixture `-monitor json` output parsed into `StatusFrame[]`; mocked async iterator; timeout firing; pause/resume/kill argv.
- Smoke: live encode of the existing `tests/fixtures/black-5s.mov` against an HEVC preset; assert at least 3 progress frames before terminal state.
- New error codes used: `E_COMPRESSOR_MONITOR_FAILED`.
- **MCP `notifications/progress` integration** — confirm the SDK exposes the progress channel; if it requires a specific tool-handler shape, adopt it. Reference: [MCP spec — server progress notifications](https://modelcontextprotocol.io/).

### Ticket 1.4 — Compressor: `compressor_settings_inspect` + `compressor_codec_availability`

**Why:** unblocks `-settingpath` callers from "guess the right preset" to "ask the LLM to pick by codec/bitrate/dimensions."

**Deliverables:**
- `src/apps/compressor/inspect.ts` — XML-parse `<setting>` root using `fast-xml-parser`. Extract: container, video codec FourCC, codec vendor, frame size, frame rate, bitrate, color tags, audio codec/bitrate/channels. Decode the base64-bplist `encoder-properties` blob via `plutil -convert xml1` for HEVC profile/level/bitDepth.
- NameKey resolution: locate `Localizable.strings` (binary plist) at `…/CompressorKit.framework/Versions/A/Resources/<lang>.lproj/Localizable.strings`, parse via `plutil -p`, dictionary lookup. Locale param defaults to process locale, fallback `"en"`.
- `compressor_settings_inspect({ path, locale?, resolveNames=true, decodeEncoderProperties=false })` returning the structured shape from [slice §1, lines 117-133](./research/2026-05-05-deepswarm/02-compressor-depth.md).
- `compressor_settings_resolve({ displayName })` — reverse lookup.
- `compressor_codec_availability()` — static table keyed off `(uname -m, Compressor CFBundleShortVersionString)`. Returns `{ available, removed: [{ codec, since, reason }], appleSilicon, version }`.
- Enhance `compressor_settings_list` to include `availability: "ok" | "codec-removed" | "arch-incompatible"` per setting.
- Tests in `tests/compressor-settings-inspect.test.ts` — golden-file parse of one bundled `.compressorsetting`; NameKey resolution against a tiny fixture `.strings` file; codec availability table for `(arm64, 5.2)` and `(x86_64, 5.2)`.

### Ticket 1.5 — Motion: `motion_template_validate`

**Why:** load-bearing pre-write check for v1.7 text editor and v1.8 media swap. Ship the validator first; the editors that depend on it ship next.

**Deliverables:**
- `src/apps/motion/validate.ts` implementing the **31 OZML invariants** from [slice §1](./research/2026-05-05-deepswarm/05-motion-depth.md):
  - Document-level (5): root element, factory id/uuid uniqueness, scenenode reference resolution, id uniqueness across scopes, cross-reference targets exist.
  - Parameter-tree (5): id uniqueness within scope, no value+curve simultaneously, keypoint count matches `<numberOfKeypoints>`, keypoint times monotonic, tangent presence per interpolation.
  - Text-factory (7): glyph count per `<text>`, kerning id sequence dense, styleRun contiguous gap-free, styleRun length sums to glyph count, `<style>` references alive, font type/value pairing, codepoint encoding.
  - Media-factory (9): clip id uniqueness, pathURL consistency, dimension/duration matches, creationDuration formula, timing bounds, frame-rate parameter, fixed-width/height, audio retime keypoints, linkedObjects pairing.
  - Scene (3): sceneSettings frame-rate + NTSC, project rate cascade, timeRange/playRange ≥ longest media.
  - Published-parameter (2): `Publish To FCP` marker placement, name-key consistency.
- `motion_template_validate({ path })` → `{ ok, violations: Violation[], warnings: Warning[] }`. Violation codes match `E_OZML_*` family in `errors.ts`.
- Tests in `tests/motion-validate.test.ts` — synthetic OZML fixtures (one per invariant), at least one positive case (Apple's bundled template parses clean).
- Smoke: validate the bundled `Atmospheric-Lower Third.motn` from Motion 6.2; expect zero violations.

### Ticket 1.6 — Motion: `motion_render_via_compressor`

**Why:** first headless Motion render path globally. Single-tool wrapper around Compressor CLI.

**Deliverables:**
- `src/apps/motion/render.ts` exporting `renderViaCompressor({ motnPath, settingPath, locationPath, batchName? })` that invokes the existing Compressor CLI runner with `-jobpath <motnPath>` (Compressor accepts `.motn` files directly).
- `motion_render_via_compressor` registered in `src/apps/motion/tools.ts`. Result returns `{ jobId, batchId }` so the caller can pipe into `compressor_monitor_stream`.
- Tests in `tests/motion-render.test.ts` — argv composition (jobpath/settingpath/locationpath); error mapping when the `.motn` doesn't exist.
- Smoke: clone a bundled `.motn`, mutate one parameter via existing `motion_template_set_param`, render to disk via `compressor -jobpath`. Assert output file exists, non-empty, container matches setting.
- Document at top of `docs/reference/motion-automation.md`: render-path matrix updated; "no headless render exists" line removed.

### Ticket 1.7 — Motion: `motion_publish_to_fcp`

**Why:** closes the OZML×FCPXML killer chain. Pairs with FCP `fcp_bind_motion_param` (Ticket 1.10). Fast follow on Ticket 1.5 since validator catches malformed publish markers.

**Deliverables:**
- `src/apps/motion/publish.ts`:
  ```ts
  export function setPublishMarker(
    ozml: string,                   // raw .motn content
    paramName: string,
    paramId: number,
    publish: boolean,
    opts?: { matchIndex?: number },
  ): string;                        // returns mutated .motn
  ```
  Uses targeted attribute regex (consistent with v1.5 byte-perfect style). When `publish=true` and the marker doesn't exist, insert `<parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>` as a sibling inside the parent block. When `publish=false`, remove the marker.
- `motion_publish_to_fcp({ path, paramName, paramId, publish, matchIndex?, outputPath? })` registered in `tools.ts`.
- Tests in `tests/motion-publish.test.ts` — synthetic fixture, both add and remove paths, idempotency (publishing twice is a no-op), validator passes after mutation.
- Smoke: clone a bundled `.motn`, publish a previously-private parameter, validate, render via Ticket 1.6, import resulting MOV — open in FCP and confirm the parameter appears in the inspector.
- New error code: `E_OZML_PUBLISH_MARKER_MISSING` (when `publish=false` was requested but no marker existed and we were told to fail loud).

### Ticket 1.8 — FCP: `fcp_effects_catalog`

**Why:** first JIT capability resource. Walks the host's installed effects/titles/generators/transitions and emits a catalog. Useful immediately to `fcp_bind_motion_param` (Ticket 1.10) and to LLM context (the model can name an effect by display name, csos resolves to UID).

**Deliverables:**
- `src/apps/fcp/effects.ts`:
  ```ts
  export interface EffectEntry {
    kind: "title" | "generator" | "effect" | "transition";
    name: string;          // localised display name
    uid: string;
    bundleSource: "fcp-bundled" | "motion-templates" | "user-templates";
    path: string;
    publishedParams?: { name: string; key: string }[];   // for titles/generators
  }
  export async function buildEffectsCatalog(): Promise<EffectEntry[]>;
  ```
  Walks: `~/Movies/Motion Templates.localized/{Titles,Generators,Effects,Transitions}.localized/`, `/Library/Application Support/Motion/Templates.localized/`, FCP's bundled-effects path. Reads each `.moti` / `.motn` for `<scenenode>` name and the `Publish To FCP` markers (Ticket 1.7's complement) to surface published params.
- `fcp_effects_catalog({ kind?, refresh? })` returns the catalog, cached on disk at `<dataDir>/.csos/effects-catalog.json`. `refresh=true` rebuilds.
- Tests in `tests/fcp-effects-catalog.test.ts` — fixture template tree, expected entry shape, kind filter.
- Smoke: catalog the live host; assert at least the "Custom" Build In:Out title (already used by v1.2 `fcp_fcpxml_build`) appears with the verified UID.
- New error code: `E_EFFECT_NOT_FOUND` (used by `bind_motion_param` in Ticket 1.10).

### Ticket 1.9 — FCP: `fcp_validate_compound_safety` + `fcp_caption_lint` + `fcp_anchor_safety`

**Why:** three pre-flight tools for known silent-failure cases. Cheap to implement against the existing `ProjectSpec` shape.

**Deliverables:**
- `src/apps/fcp/safety.ts`:
  ```ts
  export interface SafetyViolation { code: ErrorCode; path: string; hint: string }
  export function validateCompoundSafety(spec: ProjectSpec): SafetyViolation[];
  export function lintCaptions(spec: ProjectSpec): SafetyViolation[];
  export function checkAnchorSafety(spec: ProjectSpec): SafetyViolation[];
  ```
  Implements:
  - `validateCompoundSafety` — walk `ref-clip` items; flag any without an explicit format reference, or any sharing media id with another ref-clip (the propagated-edit-on-save trap).
  - `lintCaptions` — flag any `<caption>` spec without a `role` (silent-drop trap).
  - `checkAnchorSafety` — walk anchored items; flag `lane` collisions and same-time overlaps that FCP will re-bucket.
- Tools `fcp_validate_compound_safety`, `fcp_caption_lint`, `fcp_anchor_safety` registered in `src/apps/fcp/tools.ts` — each takes a `ProjectSpec` (or the existing `fcpxml_build` input) and returns `{ ok, violations }`.
- Builder integration: when `fcp_fcpxml_build_write_import` runs, automatically invoke all three pre-flights and fail with `E_COMPOUND_UNSAFE` / `E_CAPTION_ROLE_MISSING` / `E_ANCHOR_COLLISION` if violations exist (override flag `--allow-unsafe` for callers who want a warning instead of an error).
- Tests in `tests/fcp-safety.test.ts` — one positive + one negative fixture per check.
- New error codes used: `E_COMPOUND_UNSAFE`, `E_CAPTION_ROLE_MISSING`, `E_ANCHOR_COLLISION`.

### Ticket 1.10 — FCP: `fcp_bind_motion_param` + `targetVersion` builder field

**Why:** the cross-app glue. Pairs with Ticket 1.7 to close the killer chain. Cheap.

**Deliverables:**
- Extend `ProjectSpec.fcpxmlVersion` to accept `"1.13" | "1.14"` with default `"1.14"`. Plumb through `src/fcpxml/builder.ts`. Tests on both versions in `tests/builder.test.ts`.
- `src/apps/fcp/motion-bind.ts` — given a Motion `.moti`/`.motn` path, parse its published parameters (`<scenenode>` + `Publish To FCP` markers) and return `{ name, key, type, defaultValue }[]`. Read uses the same OZML parser plumbing as Motion's existing `inspect`.
- `fcp_bind_motion_param({ motionTemplatePath, bindings: { name, value }[] })` returns a typed `ParamBinding[]` ready for embedding in a `<title>` or `<generator>` ProjectSpec entry. Locale-safe: emits both `name` and `key` per [pitfall 12](./research/2026-05-05-deepswarm/01-fcp-depth.md).
- Builder honors `ParamBinding[]` on title/generator spine items and emits `<param name="..." key="..." value="..."/>` children.
- Tests in `tests/fcp-motion-bind.test.ts` — fixture `.moti` with two published params, builder output verified against golden FCPXML.
- Smoke: clone bundled "Custom" Build In:Out title, `motion_publish_to_fcp` adds a custom Headline param, `motion_template_set_param` sets default, `fcp_bind_motion_param` binds a per-instance value, build FCPXML, validate against DTD. End-to-end killer chain green.

### Ticket 1.11 — FCP: `fcp_round_trip_diff` (flagship)

**Why:** the integrity layer the rest of the FCP ecosystem missed. Lands last in phase 1 because it depends on a parser; the parser is intentionally minimal here (just enough to support the diff against authored output) and gets the full treatment in v1.8.

**Deliverables:**
- `src/fcpxml/parser.ts` — minimal `parseFcpxml(xmlOrPath): { spec: Partial<ProjectSpec>, extras: ParsedExtras }`. `fast-xml-parser` with `preserveOrder: true`. Forward-compatible: unknown elements surface in `extras` rather than failing.
- `src/fcpxml/diff.ts` — typed diff algorithm:
  ```ts
  export interface RoundTripTransform {
    code: "POSITION_KEYFRAME_DROPPED" | "CAPTION_DROPPED" | "MC_CLIP_FLATTENED" |
          "REF_CLIP_CONFORM_INSERTED" | "AUDITION_REORDERED" | "LANE_REBUCKETED" |
          "MAGNETIC_MASK_LOST" | "ROLE_NORMALIZED" | "EFFECT_UID_DRIFT" | "OTHER";
    path: string;             // JSON-pointer-ish path into the spec
    severity: "data-lossy" | "cosmetic";
    authored: unknown;
    observed: unknown;
    hint: string;
  }
  export function diffRoundTrip(authored: ProjectSpec, observed: Partial<ProjectSpec>): RoundTripTransform[];
  ```
  Detects the 12 known transformations from [slice §5](./research/2026-05-05-deepswarm/01-fcp-depth.md).
- `fcp_round_trip_diff({ authoredSpec, observedFcpxmlPath })` registered in `tools.ts`. The ergonomic loop is: csos authors → user imports in FCP → user File → Export XML → csos parses + diffs.
- For end-to-end testing without manual FCP interaction, ship `fcp_round_trip_capture({ projectName, fcpxmlPath, exportPath })` that uses AppleScript to drive FCP's File → Export XML for the named project (read-only-AppleScript-compatible because it's only invoking a menu via `do menu menu item` — opt-in via `--allow-ui-scripting` flag; default off).
- Tests in `tests/fcp-roundtrip-diff.test.ts` — fixture pairs (authored.spec.json, observed.fcpxml) covering each of the 12 transformations.
- New error code: `E_FCPXML_ROUNDTRIP_FAILED`.

## Phase 1 ship criteria

All of these green before a v1.6.0 tag:

1. `npm test` — every new test green; no flakes.
2. `npm run typecheck` — clean.
3. `creator-studio-os verify` — all v1.5 checks still pass; no new regression in the 15 install/DTD/round-trip checks.
4. **Smoke matrix on the build host:**
   - One Compressor encode produces ≥ 3 progress frames over `monitor_stream` and reaches `completed`.
   - One `.motn` mutated via `motion_template_set_param` validates clean and renders headlessly via `motion_render_via_compressor`.
   - One published parameter added via `motion_publish_to_fcp` survives validate + appears in `fcp_effects_catalog`'s output.
   - One end-to-end killer chain: clone Custom title → publish param → set default → bind via `fcp_bind_motion_param` → build FCPXML → DTD-valid → import succeeds in FCP.
   - One `fcp_round_trip_diff` against a fixture pair produces typed transforms for at least 3 of the 12 known cases.
5. Ledger contains entries for every smoke run, parseable as JSONL, with timing.
6. `CHANGELOG.md` v1.6.0 section drafted (no publish — held).

## Out of scope for phase 1

These are intentionally deferred — they belong in phase 2/3, not phase 1:

- Pixelmator full sdef expansion (phase 2 / v1.7)
- Keynote 45-tool leapfrog (phase 2 / v1.7)
- `OzmlTextEditor` and `OzmlMediaSwap` (phase 2/3 — depend on `motion_template_validate` from Ticket 1.5)
- Logic 13 around-Logic tools (phase 3 / v1.8)
- Numbers Python sidecar (phase 3 / v1.8)
- FCP parser depth + OTIO bridge (phase 3 / v1.8 — only the minimal parser ships in Ticket 1.11)
- Cross-app `protocol.*` orchestration (phase 4 / v2.0)

## Suggested PR sequencing

The 11 tickets are dependency-ordered. PR-by-PR:

1. PR #1 — Ticket 1.1 (errors + ledger). Foundational.
2. PR #2 — Ticket 1.2 (`runApp` runner + osascript batching). Foundational refactor.
3. PR #3 — Tickets 1.3 + 1.4 (Compressor monitor + inspect). Same area, ship together.
4. PR #4 — Ticket 1.5 (Motion validate). Solo because everything Motion-related downstream depends on it.
5. PR #5 — Tickets 1.6 + 1.7 (Motion render + publish). Same area, share setup.
6. PR #6 — Ticket 1.8 (FCP effects catalog).
7. PR #7 — Ticket 1.9 (FCP safety pre-flights).
8. PR #8 — Ticket 1.10 (FCP motion bind + targetVersion). Pairs with Ticket 1.7 to close the killer chain.
9. PR #9 — Ticket 1.11 (FCP round-trip diff). Flagship; lands last because it integrates the most.
10. PR #10 — release: bump version, update CHANGELOG, tag v1.6.0. **No npm publish.**

Each PR ends green and ships a chunk of working tools, so the build is incremental, not a giant flag-day.

---

**Last updated:** 2026-05-05. Source: [`research/2026-05-05-deepswarm/00-INDEX.md`](./research/2026-05-05-deepswarm/00-INDEX.md) and the nine slice docs. Ready to start building.
