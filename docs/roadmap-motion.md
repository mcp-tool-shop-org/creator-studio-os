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

## Roadmap-altering findings from 2026-05-05 deep research swarm

Three discoveries reshape this roadmap. See [`docs/research/2026-05-05-deepswarm/05-motion-depth.md`](./research/2026-05-05-deepswarm/05-motion-depth.md) for the full ground-truth grep against Motion 6.2's bundled `Atmospheric-Lower Third.motn`.

1. **Headless Motion render path exists.** `compressor -jobpath <file.motn> -settingpath <preset> -locationpath <out>` accepts `.motn` files directly and honors the render quality saved inside. **First headless Motion render path in any MCP** — every other Motion automation project bottoms out at "and then a human presses cmd-E." Promote `motion_render_via_compressor` to **v1.6**.
2. **Published-parameter marker discovered** (the FCP↔Motion binding lever). `<parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>` is the OZML-side marker FCP scans for. Programmatic publishing of any Motion parameter to FCPXML is now a one-line OZML mutation via the v1.5 mutation engine. Add `motion_publish_to_fcp` to **v1.6**.
3. **Bitfield model for `flags` confirmed.** Observed: `16` visible, `64` semi-readonly, `80=0x50` published primitive, `4112=0x1010` parent-with-children, bit 24 (`0x1000000`) = "currently active in FCP." The "flags is opaque" framing is replaced.

Other confirmed facts: glyph count includes newlines (16 glyphs for "Welcome to\nTexas"); factory IDs are integers, factory UUIDs are universal (anchor lookups by UUID, not ID); 22 factories declared in a "simple" lower-third (the Motion-5-era count of 16 is stale).

## v1.6 — Render path + validate + publish (Phase 1 of build)

Promoted from later versions because the swarm found cheap wins.

- **`motion_render_via_compressor(motnPath, settingPath, outputPath, options?)`** — Compressor CLI wrapper. Compressor reads render quality from the `.motn` itself; the user pre-saves quality once, csos drives renders forever.
- **`motion_template_validate(path)`** — implements all 31 invariants from §1 of the slice doc (document, parameter-tree, text-factory, media-factory, scene, published). Returns `{ ok, violations: Violation[], warnings: Warning[] }`. **Load-bearing for v1.7+**: both `OzmlTextEditor` and `OzmlMediaSwap` MUST run it before write.
- **`motion_publish_to_fcp(path, paramName, paramId, options?)`** — toggle the `Publish To FCP` marker on/off for a parameter, programmatically. Pairs with v1.5's `motion_template_set_param`.
- **`motion_template_clone(src, dst)`** is already shipped. The chain `clone → set_param → publish → validate → render_via_compressor` is the v1.6 closed loop.

## v1.7 — OZML text replacement

Per [Apple's OZML Programming Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/motion_XML_guide/Examples/Examples.html), changing a title's text requires coordinated updates across:

- `<text>` element content
- One `<object value="ASCII">` per character (including spaces and newlines)
- One `<parameter name="Kerning" id="N">` per character, with `id` starting at 1 and incrementing per glyph
- `<styleRun offset="X" length="Y">` ranges — must have **no gaps and no overlaps**, and `offset + length` of each run must equal the next `offset`

When text length changes (e.g. "Texas" → "California"), the styleRun lengths must be updated proportionally **and** the `<style>` elements they reference must still exist. One stale `id` and Motion silently drops the title.

**Implementation pinned by the deep swarm.** `OzmlTextEditor` design at slice §2:
1. Public API: `editText(path, newText, opts?: { textNodeIndex?: number })`.
2. Five validators (`validateGlyphCount`, `validateKerningSequence`, `validateStyleRunContiguity`, `validateStyleReferences`, `validateAsciiVsUnicode`) gate the write.
3. Edit plan distributes length delta to the LAST styleRun (safe; redistributing across runs risks crossing styled-vs-unstyled boundaries).
4. Atomic temp-file + rename — never leave a half-written `.motn`.
5. Multi-byte UTF-8 codepoint encoding empirically unverified; first ship gates non-ASCII behind `--unsafe-non-ascii` until smoke-tested against a Japanese template.
6. `motion_template_validate` (v1.6) is the load-bearing pre-write check.

## v1.8 — OZML media swap

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

`OzmlMediaSwap` requires `ffprobe` for the new media's duration / dimensions / frame rate plus the OZML mutator + validator. Sequencing: v1.6 validate → v1.7 text → v1.8 media (each builds on the last).

## v1.9 — Auxiliary OZML tooling

- `motion_templates_list(directory)` — recursively enumerate `.motn` / `.moti` in a directory; minimal-header parse for name + factory count. Pairs with v1.6's `fcp_effects_catalog` as the JIT capability resource for Motion templates.
- `motion_template_diff(pathA, pathB)` — structural diff focused on parameter values (skip whitespace / formatting). Verifies a mutation landed correctly without eyeballing 1,983 lines.
- `motion_factory_taxonomy_compile(directory)` — walk every bundled template, collect UUID→description mappings from `<factory><description>`, build a canonical `factory-taxonomy.json`. Action item: anchor lookups by UUID, not integer ID.

## v2.0 — Cross-app composition

Motion's role in the `protocol.*` family (broader v2.0):

- `protocol.steam_trailer` — clone Apple's Custom Title or a project-specific `.motn`, set the headline parameter, FCPXML references the customized template via `<title ref="..." />` with `<param>` children matching Motion's published parameters
- `protocol.devlog` — same pattern for thumbnail title cards
- `protocol.social_short` — 9:16 reframe of a Motion title with adjusted Position parameters

The OZML mutation work (v1.5) is the foundation; v2.0 wires it into multi-app sequences.

## Out of scope (probably forever)

- **`motion -render` CLI** — Apple ships none ([Apple Community thread 1278096](https://discussions.apple.com/thread/1278096), 2008→2026). **Not the same as headless render** — `compressor -jobpath <.motn>` IS a headless render path and ships in v1.6.
- **Driving Motion's UI as a primary path** — no sdef means UI scripting is the only option, and it's locale + version coupled. Defer indefinitely.
- **Authoring `.motn` from JSON spec** — different problem space; the format is too rich (22+ factories per modern template, parameter inheritance, scene graph) to round-trip from a flat spec without losing intent. Mutation of existing templates is the right scope.

## Testing strategy

- Unit tests on synthetic OZML fixtures (already shipped in v1.5: 11 tests covering inspect / mutate / clone / matchIndex / outputPath / XML escaping / error paths).
- Real-template smoke per release: clone an Apple-bundled `.motn`, mutate, re-inspect, confirm byte-delta matches expected.
- For v1.7+ text and media: validation-after-mutation is mandatory. `motion_template_validate` ships in v1.6 first; v1.7 + v1.8 depend on it.

Last reviewed: 2026-05-05 against Motion 6.2 (Creator Studio) — deep research swarm.
