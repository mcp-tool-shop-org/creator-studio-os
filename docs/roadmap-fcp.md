# Final Cut Pro roadmap

The big picture for `fcp_*` tooling. Lives separately from the cross-app roadmap because FCP is the deepest surface and has the longest tail.

> Write surface = FCPXML import. Read surface = AppleScript (read-only) + future FCPXML parser. **Anything outside that fence requires UI scripting and is out of scope.**

## v1.0 — shipped 2026-05-04

- FCPXML 1.14 build / validate / write / import
- Read-only AppleScript: libraries, events, projects, sequence metadata
- Project directory schema + scaffolding
- 15 tools, 16 tests, real-FCP write+read round-trip proven

## v1.1 — Authoring breadth (next)

The smallest set of additions that make FCP useful for real cuts beyond "drop clips on a spine":

- **Titles** (`title` spine items). Requires an effect reference UID. Ship with one bundled "Custom" title effect that FCP recognizes from a stable UID, plus a way to point at user-installed title effects by name.
- **Transitions** between adjacent spine items. `transition` element with offset / duration.
- **Audio levels** via `adjust-volume` on `asset-clip` / `audio` elements.
- **Roles** — `videoRole` and `audioRole` attributes for organizational metadata. Default to `video`/`dialogue`/`music`/`effects`. Lets cuts inherit FCP's role-based audio routing.
- **Library location**. Explicit `<library location="file:///path/to/Lib.fcpbundle">`  so FCP creates / opens the named library at the named path on import, instead of prompting "Import to which library?". Removes the dialog gate from the import flow.

Tests: golden FCPXML fixtures for each new feature, validated against the bundled DTD.

## v1.2 — Anchored items, multicam, compound clips

The shape of "real" timelines:

- **Anchored clips** — B-roll, lower thirds, sound effects attached to a primary spine item. The `%anchor_item` entity from the DTD.
- **Connected storylines** — secondary spines anchored to a primary clip.
- **Multicam clips** (`mc-clip`) — one timeline reference to a multi-angle source.
- **Compound clips** (`ref-clip`) — nest a sequence inside a sequence. Common building block for templated edits.
- **Captions** — basic subtitle / closed-caption authoring via the `caption` element.

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

## v1.6 — Generators and backgrounds

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
