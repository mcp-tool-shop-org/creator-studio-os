# Deep research 01 — FCP depth, FCPXML parser, ecosystem interop

> Slice 1/9 of the 2026-05-05 deep research swarm. Scope: FCP deep authoring, FCPXML read direction, ecosystem interop, novel mechanisms.
> Reviewer should treat the **proposed tools** and **proposed reference additions** as the load-bearing output. Everything else is justification.

## 0. Frame

Today csos writes FCPXML 1.14 from a clean `ProjectSpec` and reads back via read-only AppleScript. That's a one-way arrow. The depth gap is in three places:

1. **Authoring breadth** — anchored items, multicam, compound clips, captions, transforms, color, retiming, filters. Roadmap calls these out for v1.2 / v1.3 but the FCPXML element shapes have rough edges that aren't captured in `docs/reference/`.
2. **Read direction** — a `.fcpxml` parser doesn't exist yet (v1.4 milestone). With a parser, csos can do round-trip verification, project extraction, OTIO export, and silent-transformation diffing — that's the unique high-value lane.
3. **Ecosystem interop** — `otio-fcpx-xml-lite-adapter`, Pipeline Neo, fcpxml-mcp-server (DareDev256) all exist. None of them combine read+write+round-trip-diff+OZML-aware Motion title binding. csos can.

Everything below is in service of those three.

---

## 1. FCPXML constructs that need first-class shapes

### 1.1 The `lane` attribute is not a layer — it's a sign-encoded anchor offset

From the v1.13 DTD ([andrewarrow/cutlass](https://github.com/andrewarrow/cutlass/blob/main/FCPXMLv1_13.dtd) mirror): `lane="0"` means "contained inside parent" (default; this is the primary spine). Positive `lane` is **above** the primary; negative is **below** (typically audio-only B-roll, picture-in-picture overlays). The lane value is also identity for what FCP shows in the timeline as a connected clip.

Today our builder uses `lane !== 0` as the trigger to nest a `<title>` inside its parent `<asset-clip>` (anchored). That's correct, but only for the title-on-clip case. For an anchored asset-clip (B-roll over A-roll), we need the same logic generalised over `%anchor_item;` — the DTD entity that resolves to `audio | video | clip | title | caption | mc-clip | ref-clip | sync-clip | asset-clip | audition | spine | live-drawing`.

**Gotcha:** lane is integer, but FCP collapses lane assignments at import. Two anchored clips both at `lane="2"` and overlapping in time will be repositioned by FCP and re-emitted at different lanes. Round-trip will mismatch. Document this.

### 1.2 Secondary storyline = a `<spine>` inside another spine

Critical and not in our reference docs: a **secondary storyline** is just a `<spine>` element inside a clip, anchored at a non-zero lane. Same `<spine>` element type, no special wrapper. This is how FCP models "B-roll that has its own internal cuts and transitions, attached to the primary." ref-clip, sync-clip, and clip elements all permit a nested `(spine | (%clip_item;) | caption)*` choice.

### 1.3 `mc-clip` (multicam) — the round-trip cliff

The `mc-clip` element references a `<media>` resource that contains a `<multicam>` element with one or more `<mc-angle>` children. Each `mc-angle` is its own ordered spine of clip items.

```
<media id="r5" name="MC1">
  <multicam format="r1" tcStart="0s" tcFormat="NDF" renderColorSpace="Rec. 709">
    <mc-angle name="A" angleID="A1">
      <asset-clip ref="r2" .../>
    </mc-angle>
    <mc-angle name="B" angleID="A2">
      <asset-clip ref="r3" .../>
    </mc-angle>
  </multicam>
</media>
```

Then in spine: `<mc-clip ref="r5" srcEnable="all" ...><mc-source angleID="A1" srcEnable="audio"/><mc-source angleID="A2" srcEnable="video"/></mc-clip>`.

**Round-trip cliff** ([Blackmagic forum](https://forum.blackmagicdesign.com/viewtopic.php?f=21&t=40534), [Frame.io guide](https://blog.frame.io/2016/10/06/6-ways-to-maximize-multicam-fcpx/)): when FCPXML containing an `mc-clip` is imported into Resolve / Premiere / OTIO, **the multi-angle structure is flattened** to a single track. If FCP exports a project, third-party imports + re-exports, then FCP re-imports — the multicam relationship is dead. Worse, FCP's own re-import sometimes **multiplies the project into N compound clips** — one per angle — instead of preserving the mc-clip. This is the Blackmagic forum thread referenced in the existing roadmap.

### 1.4 `ref-clip` (compound) — the silent-transformation case

`<ref-clip ref="r10" .../>` references a `<media><sequence>` resource. The sequence inside the ref-clip behaves like a compound. **Silent transformations FCP applies on ref-clip import:**

- An empty compound becomes a placeholder clip (no error).
- A compound whose internal sequence format mismatches the parent project's format gets a *transparent* `conform-rate` insertion. This breaks frame-accurate authored timing.
- If two ref-clips reference the same `<media>` id and one is edited inside FCP, FCP propagates the edit to the other on save. So two seemingly independent compounds in the spec become one compound on round-trip.

### 1.5 `audition` — the silent picker

`<audition>` contains the active pick first, then alternates. On re-export, FCP normalises so the active is always the first child. If the spec authors them in any other order, round-trip mismatch.

### 1.6 `caption` — its own DTD branch, not a `text`

`<caption>` is a `%marker_item;` (anchor-item-like) but its body is `(text*, text-style-def*, note?)`. It uses a **`role` attribute** with a hardcoded `iTT.iTT-en` / `iTT.iTT-ja` / `CEA-608.CC1` value. Without a valid role, FCP imports the caption silently and then drops it. This is one of the "FCP imports without warning, then loses content" cases.

### 1.7 Adjustments — `%intrinsic-params;` is a trap entity

The DTD defines `%intrinsic-params; → (conform-rate?, timeMap?, adjust-crop?, adjust-corners?, adjust-conform?, adjust-transform?, adjust-blend?, adjust-stabilization?, adjust-rollingShutter?, adjust-360-transform?, adjust-reorient?, adjust-volume?, adjust-panner?, adjust-loudness?, adjust-noiseReduction?, adjust-humReduction?, adjust-EQ?, adjust-matchEQ?, adjust-matchAudio?, adjust-color?)`. **Order matters** — DTDs enforce sequence, and FCP is strict about it. Our v1.3 work needs the canonical ordering enshrined in `types.ts`.

`adjust-color` accepts: `<adjust-color hue="..." saturation="..." exposure="..." brightness="..." contrast="..." temperature="..." tint="..."/>` plus optional `param` children for keyframe animation. The shadows / midtones / highlights split is **not** flat — it's three nested `<adjust-color-secondary>` children with `range="shadows|mid|highlights"` and a `mask`-style sub-element. Note: this differs from the older Color Board, which used a separate `color-board` element no longer emitted by current FCP.

### 1.8 `timeMap` — keyframe-animated retiming

```
<timeMap>
  <timept time="0s"        value="0s"   interp="linear"/>
  <timept time="2s"        value="4s"   interp="linear"/>
</timeMap>
```

Two timepts = constant ramp; three or more = curve. `interp` can be `linear | smooth2 | smooth | ease | easeIn | easeOut`. `inTime` / `outTime` attributes on timept set hold-frame regions. Per [Apple docs](https://developer.apple.com/documentation/professional_video_applications/fcpxml_reference/story_elements/timemap) (page exists but content blocked from WebFetch), this is the canonical retiming primitive.

### 1.9 `param` — Motion template binding

Title / Generator / Effect parameter overrides bind by `name` **or** `key`:

```
<title ref="r2" ...>
  <param name="Build In Duration" key="9999/100/101/100" value="1s"/>
  <param name="Position">
    <keyframeAnimation>
      <keyframe time="0s"   value="-960 0" interp="linear"/>
      <keyframe time="2s"   value="0 0"    interp="ease"/>
    </keyframeAnimation>
  </param>
  <text>...</text>
</title>
```

The `key` is path-like and version-sensitive across Motion template revisions. The `name` is human-readable and stable across revisions but locale-aware (an Italian Motion template publishes Italian param names). **csos should always emit both** when a binding is known — name for portability, key for precision. The OZML chain (per the prompt) — Motion title customised via OZML, then referenced from FCP with overrides — needs a specific binding that pairs the OZML-generated param `key` with a typed override emitted by csos. See proposed tool `fcp_bind_motion_param` below.

### 1.10 Position keyframes are special

Per multiple sources including FCP.co and Larry Jordan: **position keyframes must NOT include `interp` or `curve` attributes** on the `<keyframe>` element. FCP silently rejects the import (or imports without animation) if they're present. This is a one-line gotcha that breaks the most common animation case.

---

## 2. The FCPXML read direction (parser)

### 2.1 Two parse targets

| Target | Format | Tractability |
|--------|--------|--------------|
| `.fcpxml` | UTF-8 XML, single file | Tractable. Parse with `fast-xml-parser`, validate via bundled DTD via `xmllint`. |
| `.fcpxmld` | Bundle directory containing `info.fcpxml` plus media-rep references and other resources ([Hodgetts](http://www.philiphodgetts.com/2021/11/final-cut-pro-10-6s-xml-package-explained/), [Apple FCPXML Bundle Reference](https://developer.apple.com/documentation/professional_video_applications/fcpxml_reference/fcpxml_bundle_reference)) | Tractable. Just read `info.fcpxml` inside; ignore other resources unless needed for media-rep resolution. |
| `.fcpbundle` | Library package, Core Data store at `<lib>/CurrentVersion.flexolibrary` (DeepSkyLite-backed SQLite) | **Volatile.** Reverse-engineering risk; no Apple docs. Ship a "list-only" tool, never a writer. |

The `.fcpbundle` internals are reachable via DB Browser for SQLite ([fcp.cafe / developers / librarybundle](https://fcp.cafe/developers/librarybundle/)) but the schema is undocumented and changes across FCP versions. csos should NOT parse it directly. If we need project enumeration, use AppleScript + a "save FCPXML" round-trip via the GUI is also off-table. The pragmatic answer: **for any library-level extraction, ask the user to right-click the project in FCP → File → Export XML, and parse the resulting `.fcpxml`.** Document this as an explicit boundary.

### 2.2 Parse strategy

`fast-xml-parser` with `preserveOrder: true` (DTD entities like `%intrinsic-params;` enforce sequence; we cannot lose order). DTD validation via `xmllint --dtdvalid` against the bundled DTD inside the FCP app — already wired in `verify.ts`. Parser outputs a `ProjectSpec`-compatible structure plus a `ParsedExtras` field for elements we don't yet have first-class types for (forward-compatible: don't fail on unknown elements, surface them as `unknown`).

### 2.3 Round-trip verification

The killer feature. Algorithm:

```
spec₀ → buildProjectFcpxml → xml₀
(user) imports xml₀ in FCP, exports xml₁
parseFcpxml(xml₁) → spec₁
diff(spec₀, spec₁) → list of FCP-applied transforms
```

Specifically detects: lane re-bucketing, audition reordering, conform-rate insertion, ref-clip propagation, mc-clip flattening, caption silent-drop, position keyframe loss. Each transform becomes a typed entry in a `RoundTripDiff` structure with `severity` (data-lossy vs cosmetic) and a `hint`.

---

## 3. Ecosystem interop

### 3.1 OpenTimelineIO bridge

`otio-fcpx-xml-lite-adapter` ([PyPI](https://pypi.org/project/otio-fcpx-xml-lite-adapter/)) targets v1.9/v1.13. It's Python and intentionally lite. The non-lite `otio-fcpx-xml-adapter` is more capable but complains about advanced FCPXML 1.10+ constructs.

csos can ship `fcp_export_otio` (one direction) and `fcp_import_otio` (other direction) by spawning Python (`uvx otio-fcpx-xml-lite-adapter`-style) under the hood. Cleaner: re-implement the lite adapter in TypeScript so csos has zero Python dependency. The lite adapter is ~1500 LoC of Python; a TS port is a 1-2 day job and means csos owns the conversion.

### 3.2 Pipeline Neo (Swift, [TheAcharya/pipeline-neo](https://github.com/TheAcharya/pipeline-neo))

Supports v1.5 → v1.14. Handles multicam, compound, secondary storylines, lane assignment, captions, smart collections, animations. Active (v2.5.2 March 2026, 686 tests) but flagged experimental. Swift-only, no Node binding. csos can call out to a Pipeline Neo CLI for cases TS can't handle (e.g. `.fcpxmld` deep parsing) but the Node-only constraint means we should aim to match Pipeline Neo's surface in pure TS rather than depend on it.

### 3.3 fcpxml-mcp-server ([DareDev256](https://github.com/DareDev256/fcpxml-mcp-server))

53 tools, MIT, FCPXML 1.8–1.11 only. Notably missing: anchored clips (!), color grading, audio mixer, generators, real multicam angle switching. Ships strong analysis tools (timeline stats, EDL/CSV export, role-based stem export, beat-sync) and template scaffolds (lower thirds, rough cuts). **csos's right move: don't compete on analysis breadth in v1.x; compete on authoring depth and round-trip integrity.** Specifically, the round-trip diff is something fcpxml-mcp-server cannot do (no parser of authored output → re-parsed output diff).

### 3.4 cutlass ([andrewarrow/cutlass](https://github.com/andrewarrow/cutlass))

Go-based "swiss army knife" with v1.13 DTD bundled. Useful as a sanity check / golden-file source. Not a competitor.

---

## 4. FCPXML 1.15 status

As of 2026-05-05: **no public 1.15.** [FCP release notes](https://support.apple.com/en-us/102825) mention 1.14 as the current with FCP 12.0–12.2. Magnetic Mask round-trip remains broken in 1.13 confirmed; 1.14 inherits the same `%video_filter_item;` shape, so same gap. Apple is unlikely to back-port mask preservation to 1.13/1.14 — wait for 1.15.

**Action:** ship a `targetVersion: "1.13" | "1.14"` builder field NOW. Watch for 1.15 in `effect-uids.md`-style versioned reference; add it when Apple ships.

---

## 5. Pitfalls FCP silently breaks (a checklist for the round-trip diff tool)

1. **Magnetic Mask** — confirmed lost ([fcp.cafe news 2024-11-13](https://fcp.cafe/news/20241113/)).
2. **Position keyframe `interp`/`curve` attributes** — silently rejected.
3. **Caption with no `role` attribute** — silently dropped.
4. **mc-clip on third-party round-trip** — flattened to N compounds.
5. **ref-clip with format mismatch** — silent `conform-rate` insertion.
6. **audition with non-canonical pick order** — first-child normalised.
7. **Two ref-clips sharing one media id** — propagated edit on save.
8. **Lane collisions** — re-bucketed.
9. **Stills (PNG/JPEG)** — fcpxml-mcp-server reports stills can crash FCP on import; convert to short MOV. Worth re-verifying on FCP 12.2.
10. **Effect UID drift across FCP versions** — same display name, different UID. Don't hardcode UIDs in user-facing docs.
11. **`adjust-color` element ordering inside `%intrinsic-params;`** — DTD-enforced; out-of-order = validation fail at xmllint.
12. **Locale-dependent param `name`** — non-English FCP/Motion installs publish localised param names. Always emit `key` alongside `name`.

---

## 6. Proposed tools (the load-bearing output)

| Name | One-line surface | FCPXML constructs touched | Prior art? | Novel? |
|------|------------------|---------------------------|-----------|--------|
| `fcp_validate_compound_safety` | Pre-flight: flag specs that contain compounds that won't survive FCP round-trip | `ref-clip`, `media>sequence` | None | Yes (Blackmagic-thread codified) |
| `fcp_effects_catalog` | Enumerate every Title/Generator/Effect/Transition installed; emit a JSON catalog with display name + UID + bundle-source | bundle-walk, no FCPXML | None at MCP level | Yes |
| `fcp_parse_fcpxml` | Parse a `.fcpxml` (or `info.fcpxml` from `.fcpxmld`) into `ProjectSpec` + `ParsedExtras` | All | OTIO lite (Python) | Yes for TS / MCP |
| `fcp_round_trip_diff` | Author → FCP-import → FCP-export → re-parse → diff against authored | All | None | Yes — flagship feature |
| `fcp_export_otio` | Convert parsed FCPXML to OTIO JSON | All | OTIO lite (Python wrapper) | Yes for TS / MCP |
| `fcp_import_otio` | Convert OTIO JSON to FCPXML | All | OTIO lite | Yes for TS |
| `fcp_audit_roles` | Walk a parsed spine, report role coverage / orphans / collisions | role attrs, `audio-channel-source`, `audio-role-source` | None | Yes |
| `fcp_bind_motion_param` | Given a Motion template `.moti` path, list its published params; bind values into a `<title>` or `<generator>` spec | `<param name= key= value=>` | Pipeline Neo (partial) | Yes — pairs with v1.5 OZML Motion mutations |
| `fcp_feature_soup` | Generate a fixture exercising every shipped element type for regression | All | None | Yes |
| `fcp_extract_library` | Given an `.fcpbundle`, emit a structured listing of events/projects via FCP-mediated XML export (NOT via raw flexolibrary parse) | spawn AppleScript + FCPXML round-trip | None | Yes |
| `fcp_caption_lint` | Pre-flight: validate every `<caption>` has a recognised `role` so FCP won't silently drop | `caption`, `role` | None | Yes |
| `fcp_anchor_safety` | Walk anchored items, flag lane collisions + same-time overlaps that FCP will re-bucket | `lane`, `%anchor_item;` | None | Yes |

The list is intentionally MCP-shaped (each is a callable tool, not a library function). All but `fcp_extract_library` and `fcp_effects_catalog` are pure-data — no AppleScript, no UI scripting, schema-validated input/output.

---

## 7. Proposed `docs/reference/` additions

- **`fcpxml-elements.md`** — first-class ProjectSpec mapping for every element type we author or parse: spine, asset-clip, ref-clip, mc-clip, sync-clip, audition, clip, gap, transition, title, caption, video, audio, generator. Each entry: DTD line, the entity it satisfies (`%clip_item;`, `%anchor_item;`, etc.), our `ProjectSpec` field name, gotchas. Source the DTD verbatim from the bundled file at `/Applications/Final Cut Pro Creator Studio.app/Contents/Frameworks/Interchange.framework/Versions/A/Resources/FCPXMLv1_14.dtd`.
- **`fcpxml-roundtrip-gotchas.md`** — the section-5 checklist, expanded with reproducer fixtures and FCP 12.2 verification dates.
- **`fcpxml-bundle.md`** — `.fcpxml` vs `.fcpxmld` vs `.fcpbundle` formats, what we read vs avoid.
- **`fcpxml-param-binding.md`** — Motion template param binding, name vs key, locale gotchas, OZML pairing pattern.
- **`opentimelineio-bridge.md`** — version coverage of `otio-fcpx-xml-lite-adapter`, what we re-implemented in TS, what falls back to Python spawning.
- **`fcpxml-version-history.md`** — table of 1.0 → 1.14 schema deltas; Magnetic Mask + 1.15 watch.

---

## 8. Frontier — five things csos can uniquely do

1. **`fcp_round_trip_diff`** — no other FCP MCP, no Pipeline Neo, no OTIO adapter does authored→FCP→re-parse→typed-diff. This is the integrity layer the rest of the FCP ecosystem missed. It's also the proof signal for csos's authoring promises ("when we author X you actually get X back").
2. **OZML × FCPXML chain** — csos already mutates Motion templates via OZML (per prompt). Pair OZML's published-param manipulation with `fcp_bind_motion_param` and you have a closed loop where Claude can author a Motion title, customise it, embed it in an FCPXML project, and verify it survives FCP import — all in one tool surface. No Swift library, no Python adapter, no MCP does this.
3. **`fcp_feature_soup` golden fixture** — a single FCPXML that exercises every shipped element. Used as a regression on every csos release AND as a public FCP-version probe ("does FCP 12.3 still preserve mc-clip on round-trip? import this, re-export, run the diff"). Becomes a community resource the FCP dev ecosystem doesn't have.
4. **OTIO bridge with native TS** — porting `otio-fcpx-xml-lite-adapter` to TS removes the Python dependency for the MCP and makes csos the cleanest path from FCP → OTIO → Resolve / Premiere / AAF for any agent-driven workflow.
5. **`fcp_caption_lint` + `fcp_anchor_safety`** — pre-flight tools that catch the silent-drop and silent-rebucket cases before the user even imports. These exist nowhere else and turn FCP from "fails silently and obscurely" into "csos tells you exactly which spine item is going to misbehave and why."

---

## 9. Sources

- [FCPXML v1.13 DTD mirror (andrewarrow/cutlass)](https://github.com/andrewarrow/cutlass/blob/main/FCPXMLv1_13.dtd)
- [Apple legacy FCPXML reference 1.0–1.7](https://developer.apple.com/library/archive/documentation/FinalCutProX/Reference/FinalCutProXXMLFormat/Introduction/Introduction.html)
- [Apple developer — timeMap](https://developer.apple.com/documentation/professional_video_applications/fcpxml_reference/story_elements/timemap)
- [Apple developer — FCPXML Bundle reference](https://developer.apple.com/documentation/professional_video_applications/fcpxml_reference/fcpxml_bundle_reference)
- [fcp.cafe — FCPXML developer overview](https://fcp.cafe/developers/fcpxml/)
- [fcp.cafe — Library bundle internals (DeepSkyLite / flexolibrary)](https://fcp.cafe/developers/librarybundle/)
- [fcp.cafe — News 2024-11-13 (Magnetic Mask round-trip)](https://fcp.cafe/news/20241113/)
- [Hodgetts — FCP 10.6 fcpxmld bundle explanation](http://www.philiphodgetts.com/2021/11/final-cut-pro-10-6s-xml-package-explained/)
- [Blackmagic forum — FCPXML compound multiplication](https://forum.blackmagicdesign.com/viewtopic.php?f=21&t=40534)
- [Pipeline Neo — TheAcharya/pipeline-neo](https://github.com/TheAcharya/pipeline-neo)
- [otio-fcpx-xml-lite-adapter (PyPI)](https://pypi.org/project/otio-fcpx-xml-lite-adapter/)
- [otio-fcpx-xml-adapter (full)](https://github.com/OpenTimelineIO/otio-fcpx-xml-adapter)
- [DareDev256/fcpxml-mcp-server](https://github.com/DareDev256/fcpxml-mcp-server)
- [Apple — Multicam clips](https://support.apple.com/guide/final-cut-pro/create-multicam-clips-ver23c764f1/mac)
- [Apple — Compound clips](https://support.apple.com/guide/final-cut-pro/intro-to-compound-clips-verbbd3496b/mac)
- [Apple — Magnetic Mask user guide](https://support.apple.com/guide/final-cut-pro/add-a-magnetic-mask-to-a-video-effect-verb8cd56d13/mac)
- [Apple — FCP release notes](https://support.apple.com/en-us/102825)
- [Apple — Publish Motion controls to FCP](https://support.apple.com/guide/motion/publish-controls-to-final-cut-pro-motna47583a5/mac)
- [Larry Jordan — FCP X Multicam Cookbook](https://larryjordan.com/articles/final-cut-pro-x-multicam-cookbook/)

Last reviewed: 2026-05-05 against FCP 12.2 (Creator Studio).
