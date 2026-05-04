# Motion roadmap

Plan for the `motion_*` wing. Constrained by Apple's automation surface — Motion ships **no `.sdef`** and no public render CLI — but the file format (OZML 4.0) is documented and was the lever for v1.5.

> Surface = file-handoff via `open -b com.apple.motionappApp` + **OZML XML mutation** for parameter values. Anything that requires running Motion's UI is out of scope.

## v1.3 — shipped 2026-05-04 (file handoff)

- `motion_app_open`, `motion_app_running`, `motion_open` (`.motn` file-open handoff)
- `docs/reference/motion-automation.md` documenting the empty AppleScript surface

## v1.5 — shipped 2026-05-04 (OZML parameter mutation — novel)

The 2026-05-04 research swarm flagged that **no public open-source `.motn` parser/generator exists on GitHub**. We're first.

- `motion_template_inspect(path, filterName?, limit?)` — parse a `.motn` / `.moti`, return OZML version, factory list, and full parameter list (name, id, flags, value, defaultValue, hasChildren)
- `motion_template_set_param(path, name, id, value, options)` — mutate one parameter's value attribute, preserve everything else byte-for-byte; matchIndex disambiguates name+id collisions; XML-escapes special chars
- `motion_template_clone(src, dst)` — copy before mutating, never touch Apple's bundled originals

Implementation: targeted attribute regex (NOT full XML round-trip). Preserves whitespace, comments, ordering, and structural integrity. Smoke-proven on Apple's bundled Snap-Lower Third (214,592 bytes, 1,983 parameters): mutated `Size` (id=3) from `74` → `120`, file delta exactly +1 byte.

## v1.6 — OZML text replacement (deferred — high structural risk)

Per [Apple's OZML Programming Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/motion_XML_guide/Examples/Examples.html), changing a title's text requires coordinated updates across:

- `<text>` element content
- One `<object value="ASCII">` per character (including spaces and newlines)
- One `<parameter name="Kerning" id="N">` per character, with `id` starting at 1 and incrementing per glyph
- `<styleRun offset="X" length="Y">` ranges — must have **no gaps and no overlaps**, and `offset + length` of each run must equal the next `offset`

When text length changes (e.g. "Texas" → "California"), the styleRun lengths must be updated proportionally **and** the `<style>` elements they reference must still exist. One stale `id` and Motion silently drops the title.

Plan when we ship this:
1. Build a high-level `OzmlTextEditor` class that owns the four parallel edits.
2. Validate after every mutation — count glyph objects, verify `id` sequence is dense, verify styleRun ranges are gap-free.
3. Smoke against multiple Apple title templates before exposing the tool.

## v1.7 — OZML media swap (deferred — even higher risk)

Replacing the media a Motion composition references requires coordinated updates across:

- `<clip name="...">` identifier
- `<pathURL>file://...</pathURL>` and `<relativeURL>` (if present)
- `<missingWidth>`, `<missingHeight>`, `<missingDuration>` — must match the new file
- `<creationDuration>` = `ceil(missingDuration × project_frameRate)`
- `<timing in="..." out="..." offset="...">` — in/out points
- `<parameter name="Frame Rate" id="107">` value
- `<parameter name="Fixed Width" id="114">` and `<parameter name="Fixed Height" id="115">` values
- `<audioTrack>` retime curve (second keypoint must reflect new frame count)
- Scene-level `<timeRange>` and `<playRange>` if the new duration exceeds the original

NTSC adjustment: 30 fps → 29.976 fps; multiply standard frame rate by 0.9999; set `<NTSC>1</NTSC>` in `<sceneSettings>`.

`OzmlMediaSwap` will need access to ffprobe (for duration / dimensions / frame rate) plus the OZML mutator. Defer until v1.6 lands.

## v1.8 — Auxiliary OZML tooling

- `motion_templates_list(directory)` — recursively enumerate `.motn` / `.moti` in a directory, return paths + names + factory counts. Useful for browsing `~/Movies/Motion Templates.localized/` programmatically.
- `motion_template_diff(pathA, pathB)` — structural diff of two OZML files, focused on parameter values (skip whitespace / formatting). For verifying a mutation landed correctly without eyeballing 1,983 lines.
- `motion_template_validate(path)` — sanity-check structural invariants (factory IDs unique, parameter IDs unique within scope, styleRun ranges gap-free, glyph count = text length).

## v2.0 — Cross-app composition

Motion's role in the `protocol.*` family (broader v2.0):

- `protocol.steam_trailer` — clone Apple's Custom Title or a project-specific `.motn`, set the headline parameter, FCPXML references the customized template via `<title ref="..." />` with `<param>` children matching Motion's published parameters
- `protocol.devlog` — same pattern for thumbnail title cards
- `protocol.social_short` — 9:16 reframe of a Motion title with adjusted Position parameters

The OZML mutation work (v1.5) is the foundation; v2.0 wires it into multi-app sequences.

## Out of scope (probably forever)

- **Rendering `.motn` to disk programmatically** — no `motion -render` CLI exists ([Apple Community 2008-2026](https://discussions.apple.com/thread/1278096)). The path is `cmd-E` Send to Compressor (UI scripting) or human-mediated. After Effects + `aerender` is the right tool for unattended render.
- **Driving Motion's UI as a primary path** — no sdef means UI scripting is the only option, and it's locale + version coupled. Defer indefinitely.
- **Authoring `.motn` from JSON spec** — different problem space; the format is too rich (16 factory types, parameter inheritance, scene graph) to round-trip from a flat spec without losing intent. Mutation of existing templates is the right scope.

## Testing strategy

- Unit tests on synthetic OZML fixtures (already shipped in v1.5: 11 tests covering inspect / mutate / clone / matchIndex / outputPath / XML escaping / error paths).
- Real-template smoke per release: clone an Apple-bundled `.motn`, mutate, re-inspect, confirm byte-delta matches expected.
- For v1.6+ text and media: validation-after-mutation is mandatory. Build the structural-invariant checker (`motion_template_validate`) as part of v1.6 work; reuse it in v1.7.

Last reviewed: 2026-05-04 against Motion 6.2 (Creator Studio).
