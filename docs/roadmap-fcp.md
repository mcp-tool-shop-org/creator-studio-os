# Final Cut Pro roadmap

The big picture for `fcp_*` tooling. Lives separately from the cross-app roadmap because FCP is the deepest surface and has the longest tail.

> Write surface = FCPXML import. Read surface = AppleScript (read-only) + future FCPXML parser. **Anything outside that fence requires UI scripting and is out of scope.**

## v1.0 — shipped 2026-05-04

- FCPXML 1.14 build / validate / write / import
- Read-only AppleScript: libraries, events, projects, sequence metadata
- Project directory schema + scaffolding
- 15 tools, 16 tests, real-FCP write+read round-trip proven

## v1.2 — Authoring breadth (shipped 2026-05-04)

- ✅ **Titles** (`title` spine items) with bundled "Custom" Build In:Out title effect (`.../Titles.localized/Build In:Out.localized/Custom.localized/Custom.moti`) as default. Configurable text styling: font / size / color / alignment / bold / italic. Effect UID overridable per-title.
- ✅ **Transitions** — `<transition name="..." offset="..." duration="..."/>`. Default Apple transitions ("Cross Dissolve", "Cross Blur", "Fade to Color") resolve via name attribute alone.
- ✅ **Audio levels** — `volumeDb` on `asset-clip` specs emits `<adjust-volume amount="-6dB"/>` etc. Zero (default) emits no element.
- ✅ **Roles** — `videoRole` / `audioRole` attributes on `asset-clip` specs.
- ✅ **Library location** — `libraryLocation` on the project spec emits `<library location="file://...">`. FCP creates / opens the named library on disk without the "import to which library?" dialog.

11 builder tests covering each new feature. Real-FCP smoke test verified DTD round-trip + import.

## v1.3 — Adjustments, effects, color

Per-clip transformations:

- **Transform / crop / distortion** intrinsics on every spine item (position, scale, anchor, rotation, crop rect).
- **Opacity** + blend modes.
- **Retiming** (`conform-rate`, `timeMap` for ramps).
- **Filter references** for installed video / audio filters (`filter-video`, `filter-audio` referencing effect UIDs the user has installed). Catalog of common filter UIDs ships in `docs/reference/effect-uids.md` (manually maintained — Apple changes UIDs across FCP versions).
- **Color adjustments** via `adjust-color` (hue / saturation / exposure / temperature / tint / shadows / midtones / highlights). Pre-color-board era; color-board / color-curves / color-wheels / color-hue-curves stay deferred until there's a use case that justifies the schema work.

## v1.4 — Read direction (FCPXML parser)

Currently we only WRITE FCPXML. The reverse is a real product feature:

- **Parse an exported `.fcpxml`** into our `ProjectSpec` shape.
- **Round-trip verification** — author → FCP → re-export → parse → diff against authored. Catches silent transformations FCP applies on import.
- **Project extraction** — point a tool at an existing FCP library, get back a structured representation of every project / event / sequence. (Library-on-disk parsing, since AppleScript can't return spine contents.)

This is the foundation for everything in v2+ that needs to know what's already in a project, not just what to write into it.

## v1.5 — Render and share path

FCP exposes no AppleScript `share` command. Three viable paths, in order of cleanliness:

1. **Send-to-Compressor via FCPXML export.** FCP's "Send to Compressor" generates a Compressor batch. Once Compressor wing (`compressor_*`) is solid (v1.1 of the broader project), we can chain FCPXML import → FCP renders/sends to Compressor → Compressor encodes deliverables.
2. **UI scripting** of FCP's File → Share menu. Fragile across FCP versions; only as a last resort, gated behind an explicit `--allow-ui-scripting` opt-in.
3. **`ffmpeg` fallback** for simple deliverables that don't need FCP's color management or filter chain. Documented but not the primary path.

Path #1 is the right answer. This milestone lands once both FCP and Compressor wings are mature.

## Roadmap-altering findings from 2026-05-05 deep research swarm

The 2026-05-05 swarm enumerated **12 silent-transformation pitfalls** FCP applies on import — a checklist for the round-trip diff tool. See [`docs/research/2026-05-05-deepswarm/01-fcp-depth.md`](./research/2026-05-05-deepswarm/01-fcp-depth.md) for full DTD verbatim shapes, parser strategy, and OTIO bridge plan.

**Confirmed pitfalls:**
1. Magnetic Mask data dropped (FCPXML 1.13/1.14, [fcp.cafe news 2024-11-13](https://fcp.cafe/news/20241113/))
2. Position keyframes silently rejecting `interp` / `curve` attributes
3. Captions without a `role` attribute silently dropped
4. `mc-clip` flattened to N compounds on third-party round-trip
5. `ref-clip` with format mismatch → silent `conform-rate` insertion
6. `audition` with non-canonical pick order → first-child normalised
7. Two ref-clips sharing one media id → propagated edit on save
8. Lane collisions silently re-bucketed
9. Stills (PNG/JPEG) can crash FCP on import — convert to short MOV
10. Effect UID drift across FCP versions (same display name, different UID)
11. `adjust-color` element ordering inside `%intrinsic-params;` is DTD-enforced — out-of-order = xmllint validation fail
12. Locale-dependent param `name` on Motion-published parameters — always emit `key` alongside `name`

**Confirmed format facts:** No FCPXML 1.15 yet (FCP 12.0–12.2 ships 1.14). `.fcpbundle` internals are volatile DeepSkyLite Core Data — ship a list-only tool via FCP-mediated XML export, never a writer. `.fcpxmld` (bundle directory with `info.fcpxml`) is tractable.

## Priority adds from the swarm (folded into v1.6+)

- **`fcp_round_trip_diff`** (flagship novel tool) — author → import → re-export → typed diff. **No other FCP MCP, no Pipeline Neo, no OTIO adapter does this.** Detects the 12 transformations as a regression suite. Promoted to v1.6.
- **`fcp_effects_catalog`** — bundle-walk `~/Movies/Motion Templates.localized/`, `/Library/Application Support/Motion/Templates.localized/`, FCP bundled effects → JSON catalog of every Title / Generator / Effect / Transition installed with display name + UID + bundle source. The first JIT capability resource (host-aware). Promoted to v1.6.
- **`fcp_validate_compound_safety`** — pre-flight on `ref-clip` / `media>sequence` shapes. Promoted to v1.6.
- **`fcp_caption_lint`** — pre-flight to validate every `<caption>` has a recognised `role`.
- **`fcp_anchor_safety`** — pre-flight on lane collisions and same-time anchored overlaps.
- **`fcp_bind_motion_param`** — given a Motion `.moti` path, list its published params; bind values into a `<title>` / `<generator>` spec. **Pairs with v1.5 OZML mutation + v1.6 motion_publish_to_fcp** — the killer chain.
- **`fcp_audit_roles`** — walk parsed spine, report role coverage / orphans / collisions. One-day work. High signal for Logic-stem wiring.
- **`targetVersion: "1.13" | "1.14"`** field on the builder — small diff, near-zero cost. OTIO + Pipeline Neo + Resolve consumers commonly want 1.13.
- **OTIO bridge in native TS** — port `otio-fcpx-xml-lite-adapter` (~1500 LoC Python) to TypeScript. csos becomes the cleanest agent-driven path from FCP → OTIO → Resolve / Premiere / AAF. Zero Python dependency.

## v1.6 — Round-trip diff + JIT effects catalog + safety pre-flights (Phase 1 of build)

The cheapest swarm-surfaced wins. Each unlocks downstream work.

- `fcp_round_trip_diff` — flagship.
- `fcp_effects_catalog` — first JIT capability resource.
- `fcp_validate_compound_safety` — pre-flight pre-compound-authoring.
- `fcp_caption_lint`, `fcp_anchor_safety` — silent-failure catchers.
- `fcp_bind_motion_param` — cross-app composition glue (pairs with `motion_publish_to_fcp` in same release).
- Builder gains `targetVersion` field.

## v1.7 — Anchored items, multicam, compound clips

The shape of "real" timelines. v1.6's `fcp_validate_compound_safety` is the pre-flight gate; this release does the authoring.

- **Anchored clips** — B-roll, lower thirds, sound effects attached to a primary spine item. The `%anchor_item` entity from the DTD.
- **Connected storylines** — secondary spines anchored to a primary clip.
- **Multicam clips** (`mc-clip`) — one timeline reference to a multi-angle source.
- **Compound clips** (`ref-clip`) — nest a sequence inside a sequence. Common building block for templated edits.
- **Captions** — basic subtitle / closed-caption authoring via the `caption` element. Pre-flighted by v1.6 `fcp_caption_lint`.

## v1.8 — Parser + OTIO bridge

The read direction. Pairs with v1.6's `fcp_round_trip_diff` (which depends on a parser) and unlocks v2.0 protocols that need to know what's already in a project.

- `fcp_parse_fcpxml` — `.fcpxml` (and `.fcpxmld`'s `info.fcpxml`) → `ProjectSpec` + `ParsedExtras`. `fast-xml-parser` with `preserveOrder: true`. Forward-compatible: surface unknown elements, never fail.
- `fcp_export_otio` / `fcp_import_otio` — native TS port of `otio-fcpx-xml-lite-adapter`. Zero Python dependency.
- `fcp_extract_library` — `.fcpbundle` listing via FCP-mediated XML export (NOT raw flexolibrary parse).
- `fcp_audit_roles` — role coverage / orphans / collisions on a parsed spine.
- `fcp_feature_soup` — golden fixture exercising every shipped element. Regression on every csos release; doubles as a public FCP-version probe.

## v1.9 — Generators and backgrounds

- `generator` references (color generators, gradient backgrounds, looping backgrounds for vertical / square aspects)
- Default backgrounds for letterboxed / pillarboxed exports

## v2.0 — Cross-app composition

Moves into the broader project's v2.0 — see `docs/roadmap.md`. FCP is one component of `protocol.steam_trailer`, `protocol.devlog`, etc.

## Out of scope (probably forever)

- **Direct timeline mutation via AppleScript** — FCP's dictionary is read-only. Apple has not signaled this changing.
- **GUI automation as a default** — UI scripting is fragile and version-coupled. Only behind explicit opt-in flags.
- **Library file format internals** — `.fcpbundle` is a Core Data store; we don't touch it directly. Everything goes through FCP via FCPXML.
- **Magnetic Mask round-trip** — Apple confirmed (2024-11) that mask data is not preserved in FCPXML 1.13. Likely 1.14 too. Wait for Apple to fix it.

## Testing strategy as features land

- Unit tests on the FCPXML builder for every new element type (golden-file comparison).
- DTD validation in tests for every new fixture.
- Manual smoke test: import each fixture into a real FCP, verify the import succeeds and the structure matches.
- Regression: a single end-to-end "feature soup" project that exercises every shipped element type, validated and imported on every release.
