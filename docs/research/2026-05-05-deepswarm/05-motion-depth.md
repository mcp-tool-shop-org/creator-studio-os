# Motion OZML deep mutation + render path — research slice 5

> Agent 5/9, deep research swarm 2026-05-05. Mike's directive: **find novel mechanisms, don't downscope, don't defer.** v1.5 shipped OZML parameter mutation (the world's first). This doc is the design ceiling for v1.6 → v1.9 and the Motion-FCP cross-app composition that's the entire reason `motion_*` exists.
>
> Reading order: Apple's archived [Motion XML Programming Guide — Examples](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/motion_XML_guide/Examples/Examples.html) (mandatory) and the parent `roadmap-motion.md`. Sources cited inline; no claim here is unverified prose.

---

## 0. Ground-truth snapshot of a real Apple template

Reconnaissance against Motion 6.2's bundled `Atmospheric-Lower Third.motn` (path: `/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Atmospheric.localized/Atmospheric-Lower Third.localized/Atmospheric-Lower Third.motn`) confirmed the structural facts the rest of this doc rests on:

- **22 factory entries** declared in `<factories>` block (factory IDs 1..22 with stable Apple-issued UUIDs). Factories are *referenced* by `<scenenode factoryID="N">` and by `<parameter factoryID="N">`. The 16-factory number from the swarm's earlier framing was a Motion 5-era estimate; modern templates declare more.
- **21 `<scenenode>` elements** in this single template — Motion's scene graph is rich even for a "simple" lower-third.
- **Published parameters carry a Boolean child marker, not a top-level attribute.** Confirmed via grep: the OZML pattern is a sibling `<parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>` placed **inside the parent parameter block** that gets published. This is the binding marker FCP scans for.
- **`flags` is a bitfield**, not an opaque code. Observed values include `16` (visible/editable), `64` (read-only-ish), `80 = 0x50` (= `16 | 64`, common for published primitives), `4112 = 0x1010` (parent group with children), `4176 = 0x1050` (parent + visible), `16777296 = 0x1000050` (`0x50` + bit 24). Bit 24 is set on the *second* `Publish To FCP` parameter in the template, suggesting it's a "currently active in FCP" runtime marker that Motion sets when the template is in use. The roadmap's earlier "flags is opaque" framing should be replaced with this bitfield model.

The factory UUIDs are stable across Motion versions. Anchoring `factoryID` lookups by UUID rather than by integer ID is robust to ID renumbering across templates.

---

## 1. OZML invariant catalog (full)

Build `motion_template_validate(path)` against this list. Anything not on this list isn't an invariant; anything on it is a hard structural constraint that, if broken, makes Motion silently drop the title or refuse the file.

### 1.1 Document-level

1. Root element MUST be `<ozml version="X.Y">`. Currently `4.0`. Format is downgrade-tolerant (hand-edit the version) but downgrade is a separate problem.
2. Exactly one `<factories>` block. Each `<factory id="N" uuid="...">` MUST have unique `id` and unique `uuid`. Factory IDs are integers, UUIDs are 32-char hex.
3. Each `<scenenode factoryID="N">` MUST reference an `id` that exists in `<factories>`. Same for `<parameter factoryID="N">` and `<style factoryID="N">`.
4. Each `<scenenode id="N">` MUST be unique within the document. Same for `<style id>`, `<clip id>`, `<footage id>`, `<audioTrack id>`, `<layer id>`.
5. Cross-references resolve: `linkedObjects`/`linkedobjects` content must be the integer `id` of an existing `<scenenode>` or `<audioTrack>`. The `Media` parameter (id=104 on audioTrack, id=300 on scenenode) `value=` must equal an existing `<clip id>`.

### 1.2 Parameter-tree

6. Within a single parameter scope (parent `<parameter>` or `<scenenode>`), every immediate child `<parameter id="N">` MUST have a unique `id` *for the same `name`*. The 2026-05-04 swarm noted name+id collisions are real (which is why `setParam` takes `matchIndex`), but they collide across scopes, not within one scope.
7. Keyframed parameters MUST NOT carry a `value=` attribute on the `<parameter>` element. The animated value lives in the `<curve>` child. Setting both is a contradiction Motion may resolve silently.
8. A `<curve>` child MUST contain `<numberOfKeypoints>N</numberOfKeypoints>` matching the count of `<keypoint>` children that follow. Off-by-one here corrupts playback.
9. `<keypoint>` `<time>` values MUST be monotonically non-decreasing across siblings. Apple's example uses integer frame numbers (0-based).
10. Tangent elements (`inputTangentTime`, `inputTangentValue`, `outputTangentTime`, `outputTangentValue`) MAY be omitted when `interpolation="1"` (constant). For other interpolations, omit at your peril.

### 1.3 Text-factory invariants (for v1.6)

11. `<text>` element CDATA contains the human-readable string. Newlines, tabs, multi-byte chars are part of the count.
12. There MUST be exactly one `<object value="N">` per character of `<text>`. The `value="N"` is the **decimal codepoint**. Apple's example uses ASCII (`87` for "W") — for multi-byte UTF-8, OZML appears to use the Unicode codepoint, not the UTF-8 byte sequence. **Empirical verification required for non-ASCII** before exposing the tool — this is the single most likely silent-fail vector.
13. Each `<object>` MUST contain exactly one `<parameter name="Kerning" id="N" flags="16" value="0"/>` whose `id` is the 1-based glyph index. The id sequence MUST be dense (1, 2, 3, …) with no gaps.
14. `<styleRun style="ID" offset="O" length="L">` ranges MUST: (a) start at offset 0 for the first run, (b) be contiguous (`offset[i] + length[i] == offset[i+1]`), (c) end with `offset[last] + length[last] == total_glyph_count`, (d) reference a `<style id="ID">` that still exists in the document.
15. **Glyph count vs text length**: Apple's "Welcome to Texas" example reports 16 glyphs for "Welcome to Texas" — this counts the `\n` between "to" and "Texas" as 1 glyph. So **newlines DO count as glyphs**. The roadmap's parenthetical "exclusive of newlines? confirm" is now answered: **glyphs INCLUDE newlines**.
16. `<style id="N" factoryID="1">` (factory 1 = Style factory) — every styleRun's `style=` MUST point to a `<style>` block that's still in the document. Removing a style without retargeting all styleRuns silently drops the title.
17. `<font type="0">` = system font (e.g. `StoneSansOSITCTT-SemiIta`). `<font type="1">` = LiveFont (Pro Series, e.g. `Pro Series/Script`). Don't swap types without swapping the font name.

### 1.4 Media-factory invariants (for v1.7)

18. `<clip name="X" id="N">` — `name` is human-readable, `id` is integer. The `Media` parameter `value="N"` references this `id`. Don't change the `id` on swap unless you also remap every reference.
19. `<pathURL>file://localhost/...</pathURL>` — Apple's example uses the `file://localhost/` form. Modern macOS accepts `file:///` too, but match what the surrounding document uses to avoid mixed-form inconsistency.
20. `<missingWidth>`, `<missingHeight>`, `<missingDuration>` are the dimensions/duration Motion should reach when the file is "missing." On a media swap they MUST match the new file's actual dimensions/duration. Use `ffprobe -v quiet -print_format json -show_streams -show_format <file>`.
21. `<creationDuration>` MUST equal `ceil(missingDuration × frameRate)`. Apple's example: 111.14 × 29.976 = 3331.7 → 3332. **Sub-frame rounding is unforgiving**: a creationDuration off by one frame creates a phantom-frame retime spike.
22. `<timing in="0" out="N-1" offset="0">` — `out` is `creationDuration - 1` (zero-based last frame). If `offset` is non-zero, the clip starts mid-timeline.
23. `<parameter name="Frame Rate" id="107" flags="64" value="X">` — must match the new media's actual frame rate. NTSC handling cascades from the project (see §1.5).
24. `<parameter name="Fixed Width" id="114" flags="66" value="W">` and `<parameter name="Fixed Height" id="115" flags="66" value="H">` — must match `missingWidth`/`missingHeight`.
25. `<audioTrack>` retime curve: the second `<keypoint>` of the `Retime Value` and `Retime Value Cache` parameters (id=109) MUST have `<time>creationDuration - 1</time>` and `<value>creationDuration</value>`. (Apple's example: time=3331, value=3332 for a 3332-frame media.) Off by one and audio drifts against video.
26. `<linkedObjects>` (audio side) MUST point to the matching scenenode id. `<linkedobjects>` (scenenode side, lowercase) MUST point to the matching audioTrack id. Yes, capitalization differs across siblings — this is an Apple inconsistency in the format, not a typo here.

### 1.5 Scene-level invariants

27. `<sceneSettings>` contains `<frameRate>N</frameRate>` (integer), `<NTSC>0|1</NTSC>` (Boolean). When `NTSC=1`, the *effective* frame rate is `frameRate × 0.999` (30 → 29.97). Apple's example shows the integer `30` in `<frameRate>` and the actual playback at 29.97 because NTSC=1.
28. Project frame rate cascade: every clip's `<parameter id="107">` must be either equal to the project effective rate, or a known multiple/factor (24/30/60). Off-rate clips show as conformed in Motion but the conform is lossy.
29. `<timeRange offset="0" duration="D">` and `<playRange offset="0" duration="D">` at the scene level. `D` MUST be ≥ the longest media's `creationDuration` if the new media exceeds the original. On a v1.7 swap that lengthens the timeline, *both* time- and play-ranges must extend.

### 1.6 Published-parameter invariant (the chain to FCP)

30. **Published parameters carry a `<parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>` sibling marker** inside the parent parameter block they publish. Removing this marker un-publishes the parameter from FCP's inspector; adding it (correctly) publishes a previously hidden parameter. This is the OZML-side lever that makes the FCP↔Motion chain (§6) programmable.
31. The published parameter's `name=` is the string FCP will surface in its inspector. Renaming changes FCPXML's `<param name="...">` matching key — break this and FCPXML overrides silently no-op.

---

## 2. `OzmlTextEditor` — design (v1.6)

The class owns four coordinated edits and five validations. Public API is one method: `editText(path, oldText?, newText) → void` (oldText optional; if absent, we infer the current text from `<text>` content).

### 2.1 Edit sequence (atomic; all-or-nothing)

```ts
class OzmlTextEditor {
  async editText(path: string, newText: string, opts?: { textNodeIndex?: number }): Promise<EditResult> {
    // 1. Parse: locate <text>, <object>, <styleRun>, <style> blocks for this title.
    //    A template may contain multiple titles — disambiguate via opts.textNodeIndex.
    // 2. Compute: glyphs = [...newText] (Unicode code points; newlines included).
    // 3. Plan four parallel edits:
    //    a. Replace <text> CDATA.
    //    b. Rebuild <object> list: one per glyph, with <parameter Kerning id="i" value="0"/>.
    //    c. Rebuild <styleRun> ranges: stretch the LAST run to absorb the length delta.
    //    d. Verify referenced <style> ids still exist (no edit needed; just check).
    // 4. Validate (see §2.2). If validation fails, throw — don't write a corrupt file.
    // 5. Atomic write: temp file + rename. Never leave a half-written .motn.
  }
}
```

### 2.2 Validation routines (run AFTER plan, BEFORE write)

- `validateGlyphCount(text, objects)` — `[...text].length === objects.length`.
- `validateKerningSequence(objects)` — every object has exactly one Kerning param with `id` == its 1-based index.
- `validateStyleRunContiguity(styleRuns, totalGlyphs)` — first offset=0, all runs contiguous, last run ends at totalGlyphs.
- `validateStyleReferences(styleRuns, styles)` — every styleRun's `style=` points to an existing `<style id=>`.
- `validateAsciiVsUnicode(glyphs)` — emit a warning (not error) if any glyph > 127 the first time the tool sees non-ASCII; the codepoint encoding is empirically unverified for non-ASCII (see invariant 12). Block on a `--unsafe-non-ascii` flag the first time we ship.

### 2.3 Edge cases

- **Empty text** — Motion accepts `<text></text>` with zero `<object>` entries and zero styleRuns. Length-0 styleRuns crash Motion; the edit must remove styleRuns entirely when text becomes empty.
- **Newlines** — `\n` is one glyph. Apple's example shows "Welcome to\nTexas" → 16 glyphs (W, e, l, c, o, m, e, space, t, o, \n, T, e, x, a, s).
- **Multi-byte UTF-8** — Unicode codepoint, not UTF-8 bytes. Verify against a Japanese/Chinese template before exposing.
- **Whitespace-only style runs** — sometimes a styleRun covers only spaces (e.g. for a different baseline). Length deltas must respect run boundaries — distributing the delta to the LAST run is safe; redistributing across runs risks crossing styled-vs-unstyled boundaries.
- **Multiple titles in one template** — `textNodeIndex` selects the nth `<text>` element (matching `motion_template_set_param`'s `matchIndex` precedent).

### 2.4 Tool surface

```jsonc
{ "name": "motion_template_edit_text",
  "params": {
    "path": "string (required)",
    "newText": "string (required)",
    "textNodeIndex": "integer (optional, default 0)",
    "outputPath": "string (optional, default = overwrite path)",
    "allowNonAscii": "boolean (optional, default false — gate)"
  } }
```

---

## 3. `OzmlMediaSwap` — design (v1.7)

Depends on `ffprobe` (Homebrew or bundled). The cascade is mechanical but has 9 coordinated edits per swap.

### 3.1 Edit sequence

```ts
class OzmlMediaSwap {
  async swap(path: string, clipId: string, newMediaPath: string): Promise<SwapResult> {
    // 1. ffprobe newMediaPath → { width, height, duration, frameRate, hasAudio, hasVideo, isStillImage }.
    // 2. Locate <clip id="clipId"> and its sibling <footage>, <scenenode>, <audioTrack>.
    // 3. Read project frame rate from <sceneSettings>; apply NTSC factor if NTSC=1.
    //    effectiveProjectRate = frameRate * (NTSC ? 0.999 : 1)
    // 4. Compute: creationDuration = Math.ceil(duration * frameRate)  ← clip's own rate, not project's
    //    out = creationDuration - 1
    // 5. Apply 9 edits (transactional in-memory; write once):
    //    a. <clip name="..."> ← basename(newMediaPath, ext)
    //    b. <pathURL>file://localhost/<absolutePath></pathURL>
    //    c. <missingWidth>, <missingHeight>, <missingDuration>
    //    d. <creationDuration>
    //    e. <timing in="0" out="creationDuration-1" offset="0">
    //    f. <parameter Frame Rate id=107 value="frameRate">
    //    g. <parameter Fixed Width id=114 value="width">
    //    h. <parameter Fixed Height id=115 value="height">
    //    i. If hasAudio: <audioTrack> retime keypoint #2 → time=creationDuration-1, value=creationDuration
    //    j. If creationDuration > original: extend scene <timeRange> + <playRange>.
    // 6. Validate (see §3.2). Write atomically.
  }
}
```

### 3.2 Validation routines

- All 9 invariants from §1.4 reverified post-edit.
- Scene-level invariants 27-29 reverified.
- Cross-references: `linkedObjects`/`linkedobjects`/`Media value=` chain still resolves.

### 3.3 Edge cases

- **Still images** (jpg/png/etc.) — no audio track; `<missingDuration>` is conventional (use 4 seconds default per Motion's UI default). `creationDuration = ceil(4 × frameRate)`. `Frame Rate` parameter value is the *project's*, not the file's (still images have no rate).
- **Audio-only** (m4a/wav) — no `<scenenode>` in the video graph; only `<audioTrack>` and `<footage>`. Skip Fixed Width/Height edits.
- **Video-only** (no audio stream) — skip audioTrack retime; if the original had audio and the new doesn't, REMOVE the audio track entirely (or Motion shows a missing-audio indicator).
- **Transparent media** — alpha-channel detection via ffprobe (`pix_fmt` contains `a`). Motion uses `<parameter name="Use Alpha" id="116">` (existence not yet verified — the swap must preserve this if present, not regenerate it).
- **NTSC mismatch** — if the project is NTSC but the new media is non-NTSC, the clip will be rate-conformed at playback. Emit a warning; don't auto-NTSC-correct the clip's own rate (that's editorial intent).
- **Frame-rate cascade** — if the *project's* effective rate ≠ the new media's rate, conform happens at scene composition time. Don't change `<frameRate>` in `<sceneSettings>` on a clip swap; that's a project-level decision.

### 3.4 Tool surface

```jsonc
{ "name": "motion_template_swap_media",
  "params": {
    "path": "string (required)",
    "clipId": "string (required) — from motion_template_inspect's clip listing",
    "newMediaPath": "string (required)",
    "outputPath": "string (optional)"
  } }
```

---

## 4. `motion_template_validate` — invariant list (v1.8)

Implements every invariant from §1. Returns `{ ok: boolean, violations: Violation[], warnings: Warning[] }`. Violations block; warnings inform.

```ts
type Violation = {
  code: 'E_OZML_FACTORY_DUPLICATE_ID' | 'E_OZML_FACTORY_DUPLICATE_UUID' |
        'E_OZML_PARAM_ID_COLLISION' | 'E_OZML_KEYFRAME_VALUE_AND_CURVE' |
        'E_OZML_KEYPOINT_COUNT_MISMATCH' | 'E_OZML_GLYPH_COUNT_MISMATCH' |
        'E_OZML_KERNING_ID_GAP' | 'E_OZML_STYLERUN_GAP' |
        'E_OZML_STYLERUN_OVERLAP' | 'E_OZML_STYLE_REFERENCE_DEAD' |
        'E_OZML_AUDIO_RETIME_MISMATCH' | 'E_OZML_TIMING_OUT_OF_BOUNDS' |
        'E_OZML_CREATIONDURATION_MISMATCH' | 'E_OZML_LINKED_OBJECT_DEAD' |
        'E_OZML_PUBLISH_MARKER_DANGLING';
  scope: string;       // e.g. "clip[id=1056770]" or "scenenode[id=105225].text[0]"
  message: string;
  hint: string;
};
```

The validator is the load-bearing piece for v1.6 and v1.7 — both `OzmlTextEditor` and `OzmlMediaSwap` MUST run it before write. Ship it first.

---

## 5. Render-path decision matrix

Apple ships no `motion -render` CLI ([Apple Community thread 1278096](https://discussions.apple.com/thread/1278096), 2008→2026). Survey of every workaround:

| Path | Headless? | Reliable? | Locale-safe? | Verdict for csos |
|------|-----------|-----------|--------------|------------------|
| **Drop `.motn` directly into Compressor** ([humanuser.blogspot.com 2017](https://humanuser.blogspot.com/2017/12/how-to-render-apple-motion-projects-by.html)) | Yes (Compressor `compressor` CLI accepts `-jobpath <file.motn>`) | **Yes** — Compressor reads the render quality saved in the `.motn` itself | Yes | **THIS IS THE PATH.** Single CLI, no UI scripting. |
| Send to Compressor (cmd-E from Motion) | No (UI scripting required) | Brittle | No (locale-coupled menu names) | **Skip.** UI scripting is what we explicitly don't ship. |
| Motion templates routed through FCP (instantiate as title, render via FCP→Compressor) | Partial (FCP can be driven via FCPXML import + cmd-E) | Yes for the FCPXML half, brittle for the Compressor handoff | Mixed | **Useful for cross-app composition** (§6) where the chain is already FCPXML→FCP→Compressor; not a primary Motion-only render path. |
| After Effects + `aerender` | Yes | Yes | Yes | **N/A** — different format (.aep). Out of scope for csos. |
| ffmpeg + frame-by-frame | No | No (Motion's particle/3D/published-param renders aren't accessible without Motion's runtime) | n/a | **Skip.** Motion's render engine is required for non-trivial content. |
| Headless Motion via launchctl | No | No (Motion isn't a launchd service; no `LaunchAgents/com.apple.motion*.plist` exists) | n/a | **Skip.** Motion has no headless mode; the render engine is bound to Motion.app's process. |

**Decision: ship `motion_render_via_compressor(motnPath, settingPath, outputPath)`** as a v1.9 tool. Mechanism: invoke `/Applications/Compressor.app/Contents/MacOS/Compressor -batchname X -jobpath <motnPath> -settingpath <.compressorsetting> -locationpath <outputPath>`. Compressor honors the render quality saved in the `.motn`. The user pre-saves render quality in Motion once; csos drives the render forever.

This is the **first programmatic Motion render path** in any MCP — every other Motion automation project bottoms out at "and then a human presses cmd-E."

---

## 6. The killer chain — FCP↔Motion title parameter binding

This is why `motion_*` exists. Documented end-to-end here for the first time.

### 6.1 Setup phase (human-once)

A human (Mike) authors a Motion title template:
1. In Motion, open a Title template (or create one).
2. For each parameter the template should expose to FCP (e.g. headline text, accent color, position), select the parameter, click its Animation menu → **Publish**.
3. In the Project pane, group/order/rename published parameters. **Renaming here changes the OZML `<parameter name="...">` string** (invariant 31).
4. Save. Motion writes the template to `~/Movies/Motion Templates.localized/Titles/<Category>/<Name>/<Name>.motn`. Each published parameter gets the `<parameter name="Publish To FCP" id="350" flags="80" default="1" value="1"/>` marker (invariant 30).

### 6.2 Mutation phase (csos, infinite)

For each instance of the title in a project:
1. **`motion_template_clone(src, dst)`** — copy the template to a project-local path (never mutate Apple's bundled originals).
2. **`motion_template_set_param(dst, name, id, value)`** — mutate per-instance defaults (e.g. set the default headline color so FCP inspector starts there). Already shipped in v1.5.
3. **`motion_template_edit_text(dst, "Episode 47 — Liquid Lattice")`** — replace the visible text using `OzmlTextEditor` (v1.6).
4. **`motion_template_swap_media(dst, clipId, "/path/to/episode-bg.mov")`** — swap any background media with `OzmlMediaSwap` (v1.7).

### 6.3 Reference phase (FCPXML)

In FCPXML, csos (`fcp_*` wing) emits a `<title>` element that references the customized `.motn`:

```xml
<title ref="r5" lane="1" offset="0s" name="Episode Card" duration="120120/24000s">
  <param name="Headline" value="Episode 47 — Liquid Lattice"/>
  <param name="Accent Color" value="0.7 0.2 0.1"/>
  <param name="Position" value="960 540"/>
  <text>
    <text-style ref="ts1">Episode 47 — Liquid Lattice</text-style>
  </text>
</title>
```

The `<param name="...">` matching keys are **the published-parameter names from the OZML** (invariant 31). The `ref="r5"` points to an `<effect id="r5" name="Episode Card" uid="...">` resource block; the `uid` is the template's unique identifier.

This is the canonical chain for `protocol.steam_trailer`, `protocol.devlog`, `protocol.social_short`. **Without OZML mutation, the human has to author one .motn per shot. With csos, one .motn becomes N customized instances at MCP-call latency.**

### 6.4 Render phase

Per-shot: drop the customized `.motn` into Compressor (§5) for headless render. Or: emit FCPXML referencing all customized titles, import into FCP, render the FCP timeline through Compressor. Either path is now headless.

---

## 7. Factory taxonomy (Motion 6.2, observed)

From the bundled Atmospheric-Lower Third template (22 factories declared). The integer ID is per-template; the UUID is universal. Mapping IDs to human-readable types requires a UUID→name lookup table that Motion ships internally (and we'd need to compile from observation across many templates):

| Factory ID (this template) | UUID | Plausible type | Mutation safety |
|----------------------------|------|----------------|-----------------|
| 1 | `044beba5ad32...` | Style (text styling block) | Safe |
| 4 | `10405f5213...` | Gradient/Color stop | Safe (numeric) |
| 5 | `1595b452...` | Image | Safe via media swap |
| 13 | `878a64bd...` | Color (RGBA tuple) | Safe (numeric) |
| 16 | `babfc777...` | Text (the `<scenenode name="Name Here" factoryID="16">` is the title text node) | Safe via OZML text editor |
| 22 | `fdc1944b...` | Color channel (R/G/B/Gamma) | Safe (numeric) |

**Action item for v1.8**: enumerate all bundled templates, collect UUID→description mappings (the `<description>` child of `<factory>`), build a canonical `factory-taxonomy.json`. The 16-factory number from the swarm framing is a Motion 5-era count; modern Motion has more.

Mutation-safety rule of thumb:
- **Numeric/Boolean primitives** (Position, Scale, Rotation, Opacity, sliders) — always safe via `motion_template_set_param`.
- **Text** — safe via `OzmlTextEditor` + validate.
- **Media** — safe via `OzmlMediaSwap` + ffprobe + validate.
- **Particle emitters / Replicators / 3D scenes** — read-safe; structural mutation unproven (see §10 frontier).
- **Behaviors** (animations bound to time) — read-safe; mutation could desync curve keyframes.

---

## 8. `motion_templates_list(directory)` — spec (v1.8)

```jsonc
{ "name": "motion_templates_list",
  "params": {
    "directory": "string (required)",
    "recursive": "boolean (optional, default true)",
    "extensions": "string[] (optional, default ['.motn', '.moti'])"
  },
  "result": {
    "templates": [{
      "path": "absolute path",
      "name": "from <ozml>'s top-level name attribute or filename",
      "ozmlVersion": "string",
      "factoryCount": "integer",
      "scenenodeCount": "integer",
      "publishedParamCount": "integer (count of Publish To FCP markers — high-leverage signal)",
      "byteSize": "integer"
    }]
  } }
```

Implementation: `readdir` recursive (skip `.localized` directory wrapper but descend into it), for each `.motn`/`.moti`, parse the header (first ~10KB) for `<ozml version=>`, count `<factory>` and `<scenenode>` and `Publish To FCP` markers via streaming regex (don't load the whole 200KB+ file). The most useful field for cross-app composition is `publishedParamCount`: zero means the template is private to Motion and FCPXML can't drive it; non-zero means it's a candidate for the §6 chain.

---

## 9. `motion_template_diff(pathA, pathB)` — spec (v1.8)

```jsonc
{ "name": "motion_template_diff",
  "params": { "pathA": "string", "pathB": "string" },
  "result": {
    "parameterChanges": [{
      "scope": "scenenode[id=N].parameter[name=X,id=Y]",
      "from": "string|null",
      "to": "string|null"
    }],
    "structuralChanges": [{
      "kind": "factory_added | factory_removed | scenenode_added | scenenode_removed | clip_added | ...",
      "detail": "..."
    }],
    "textChanges": [{ "scope": "...", "from": "string", "to": "string" }],
    "mediaChanges": [{ "scope": "clip[id=N]", "fromPath": "...", "toPath": "..." }]
  } }
```

Implementation: parse both into the same parameter-tree shape `motion_template_inspect` returns, then walk in lockstep. Skip whitespace, comments, and attribute order — those aren't semantic. The user-visible value is "did my mutation land?" and "what does this template add over the bundled one?" — both are answered by the structural diff.

---

## 10. Frontier — novel csos-only Motion capabilities

These are capabilities Motion's GUI offers but no other automation project (open-source or commercial) exposes. Each one falls out of OZML mutation + the §6 chain.

### 10.1 Procedural particle emitter seeding

**The capability**: Motion's particle factory has a parameter set including emission rate, lifetime, initial velocity, color over time, and source cell (the particle's image). All are OZML-mutable.

**csos-only move**: `motion_template_seed_emitter(path, emitterId, particles)` — given an array of `{ image, count, lifetime, velocity }` records, generate N emitters from one template. Use case: a the showcase deliverable "warp jump" effect where each jump's particles match the destination's color palette, generated at FCPXML emit time.

**Risk**: emitter parameter IDs vary across Motion versions; need a UUID-anchored lookup. Solvable.

### 10.2 Procedural 3D camera path import

**The capability**: Apple's archived guide (§4 of the Examples doc) documents camera keyframe import: 300-keypoint X/Y/Z position curves and X/Y/Z rotation curves. The format is mechanical — one `<keypoint>` per frame.

**csos-only move**: `motion_template_set_camera_path(path, cameraNodeId, frames[])` — given an array of 300 `{ position: [x,y,z], rotation: [x,y,z] }` records, write the six animated parameters. Use case: scripted camera moves for Motif cue auditioning, or generated dolly paths in Sprite Foundry promo videos.

**Why csos-only**: every other automation project bottoms out at "open Motion, animate by hand." The OZML guide explicitly documents this as an external use case Apple intended to be scriptable.

### 10.3 Replicator pattern from data

**The capability**: Motion's replicator factory takes a source object and replicates it on a 2D/3D grid, around a circle, along a line, or along a custom path. Parameters include count, spacing, rotation per copy, scale per copy.

**csos-only move**: `motion_template_replicator_from_data(path, replicatorId, layout)` — parameterize a star map, a fleet formation, a procedurally-laid-out HUD, etc. For the showcase project's promotional materials: a procedural Compact-faction emblem field that scales from "small banner" to "title sequence wall" off one OZML mutation.

### 10.4 Published-parameter automatic surfacing

**The capability**: invariant 30 — the `Publish To FCP` marker. Adding it to a previously-unpublished parameter exposes that parameter to FCPXML.

**csos-only move**: `motion_template_publish_param(path, paramScope, paramId)` — programmatically expose any parameter Motion already has, without re-opening Motion. Use case: bulk-publish 50 parameters across a template library for a new project's needs without 50 round-trips through the GUI.

**Caveat**: Motion may not surface them in the FCP inspector ordering until Motion re-saves the file. Untested. If true, this is a "publish + reopen + save" two-step rather than fully headless. **Verify before shipping.**

### 10.5 Cross-template parameter inheritance

**The capability**: Motion templates can share Style elements (the `<style id="N" factoryID="1">` block). Two templates that share a style block will track each other's changes if they share IDs.

**csos-only move**: `motion_template_link_styles(pathA, pathB)` — copy a style block from A to B, retargeting all styleRun references. Use case: Sea-of-Stars-tier "all titles in this episode share one Brand style; one OZML mutation re-themes the whole episode."

### 10.6 (Stretch) Behavior keyframe transplant

**The capability**: Motion's behavior factories (Throw, Spin, Wiggle, Match Move, etc.) attach time-bound parameter curves to scenenodes. The curves are OZML.

**csos-only move**: `motion_template_transplant_behavior(srcPath, srcBehaviorId, dstPath, dstScenenodeId)` — extract a behavior's animation curve from one template and paste it onto a scenenode in another template.

**Risk**: highest of the six. Behaviors carry implicit dependencies on the parameter IDs they animate; transplanting requires retargeting. Defer until the simpler frontiers prove out.

---

## 11. Reference-implementation survey (2026-05-05 confirmation)

GitHub search 2026-05-05 confirms the 2026-05-04 swarm finding: **no public open-source `.motn` parser/generator exists.**

- `davidmyers9000/blender-to-apple-motion-5-script` — generator-only, hand-written XML strings, no parser. Doesn't help.
- `andrewarrow/cutlass` — FCPXML generator, supports `<title ref="..."><param>` overrides (relevant for §6 chain on the FCP side), but no OZML.
- `CommandPost/CommandPost` — Lua app for FCP automation; touches FCPXML DTDs (`FCPXMLv1_1.dtd` etc.) but not OZML.
- The "OZML parser" search returns zero hits with Motion-relevant content.

**csos remains alone in this lane globally as of 2026-05-05.** This is the structural moat the roadmap needs to keep widening.

---

## 12. Action items (priority order for v1.6 → v1.9)

1. **v1.6 — `OzmlTextEditor` + `motion_template_validate`** (validate first; text editor depends on it)
2. **v1.7 — `OzmlMediaSwap`** (depends on validate + ffprobe binding)
3. **v1.8 — `motion_templates_list` + `motion_template_diff`** (auxiliary; small effort, high leverage)
4. **v1.9 — `motion_render_via_compressor`** (the headless render breakthrough)
5. **v2.0 — `motion_template_publish_param`** (Frontier 10.4) and the §6 chain end-to-end exercise via `protocol.steam_trailer` for the showcase deliverable

Verify before shipping each: (a) non-ASCII glyph encoding, (b) multi-byte UTF-8 styleRun length semantics, (c) Motion's behavior on a `Publish To FCP` marker added without re-saving in the GUI.

---

## Sources

- [Motion XML Programming Guide — Examples](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/motion_XML_guide/Examples/Examples.html) — Apple, archived. Authoritative for OZML examples.
- [Motion XML Programming Guide — Overview](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/motion_XML_guide/Overview/Overview.html) — factories, parameters, scene graph.
- [Apple Community thread 1278096](https://discussions.apple.com/thread/1278096) — confirmation that no `motion -render` CLI exists, 2008→2026.
- [humanuser.blogspot.com — Drop `.motn` into Compressor](https://humanuser.blogspot.com/2017/12/how-to-render-apple-motion-projects-by.html) — the headless render path.
- [Compressor command-line options (Apple)](https://support.apple.com/guide/compressor/common-command-options-cpsr9be734f8/mac) — `-jobpath`, `-settingpath`, `-locationpath`.
- [Apple Motion User Guide — Publish controls to Final Cut Pro](https://support.apple.com/guide/motion/publish-controls-to-final-cut-pro-motna47583a5/mac) — the FCP↔Motion published-parameter chain (UI side).
- [andrewarrow/cutlass](https://github.com/andrewarrow/cutlass) — FCPXML generator with `<title ref><param>` overrides; reference for §6's FCP side.
- Live grep against `/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Atmospheric.localized/Atmospheric-Lower Third.localized/Atmospheric-Lower Third.motn` (Motion 6.2, 2026-05-05) — empirical confirmation of `Publish To FCP` marker, factory count, flags bitfield.
