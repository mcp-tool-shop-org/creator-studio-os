# 04 — Logic Pro depth: safe automation surface

**Slice:** Logic Pro `logic_*` tools, around-Logic operator's workbench
**Date:** 2026-05-05
**Repo:** mcp-tool-shop-org/creator-studio-os
**Logic version baseline:** Logic Pro 12.2 (Creator Studio bundle), bundle ID `com.apple.mobilelogic`
**Position:** csos rejects the keystroke-MCP route taken by koltyj/logic-pro-mcp and PsychQuant/che-logic-pro-mcp. We ship "around Logic" — observability, breadcrumbs, bounce watching, MIDI bridges — never UI scripting.

---

## TL;DR

Logic Pro exposes **zero programmatic surface** to external automation in 2026: no AppleScript dictionary (verified — no `.sdef` anywhere in the bundle), no CLI, no public `.logicx` schema, no inbound API. Apple's reasoning is consistent across forums for ~15 years: real-time audio thread + project-graph mutation safety. Don't expect this to change.

What we **can** safely ship around Logic:

1. `logic_project_inspect` — read-only XML plist parsing of a `.logicx` package. Bounded surface (variants, file inventory, last-saved version, cover thumbnail) but it's honest.
2. `logic_watch_bounces` — fsevents on a configured bounce-output dir, exposed as an MCP **subscribable resource**. The MCP spec supports this (`resources/subscribe` + `notifications/resources/updated`).
3. `logic_sidecar_write` / `logic_sidecar_read` — sibling `.json` next to a `.logicx` carrying cue name, scene tag, motif family, take notes. Pairs with Motif's score-map.
4. `logic_iac_send` — thin CoreMIDI wrapper for transport (MMC) and notes/CC over the IAC bus. Scoped tightly so we don't pretend it's "control."
5. `logic_take_compare` — diff two bounced takes via `ffprobe` + LUFS measurement. Operator's workbench, not Logic-internal.

What's hardest-yet-most-honest: the tempo, time signature, marker map, and region structure all live in `ProjectData` (binary, undocumented, version-volatile, EULA-adjacent). We deliberately do not parse it. ffmpeg/ffprobe + sidecar JSON cover the cases where someone needs that data.

---

## 1. `.logicx` package — what's actually parseable

A `.logicx` is a bundle. Confirmed top-level structure:

```
MyProject.logicx/
├─ Alternatives/
│  └─ 000/
│     ├─ DisplayState.plist           # binary plist — UI state
│     ├─ DisplayStateArchive/         # snapshots
│     ├─ MetaData.plist               # binary plist — file inventory
│     ├─ ProjectData                  # ★ binary, opaque, do not touch
│     ├─ Autosave/                    # autosaves of ProjectData
│     ├─ Undo Data.nosync/            # undo journal (excluded from sync)
│     └─ WindowImage.jpg              # cover thumbnail (real JPEG!)
├─ Media/                             # imported audio
└─ Resources/
   └─ ProjectInformation.plist        # binary plist — variant/version metadata
```

Source: [wikibook/logic-pro-x-103](https://github.com/wikibook/logic-pro-x-103) and [wikibook/logic-pro-x-104](https://github.com/wikibook/logic-pro-x-104) sample projects, decoded via `plutil -convert xml1`.

### `Resources/ProjectInformation.plist` — verbatim key catalog

Decoded from `023_ducking_effect.logicx/Resources/ProjectInformation.plist`:

| Key | Type | Example value | Meaning |
|---|---|---|---|
| `BundleVersion` | real | `1` | Schema version of the .logicx bundle layout |
| `HasProjectFolder` | bool | `false` | Whether project saved as folder (Media inside) vs. package |
| `LastSavedFrom` | string | `Logic Pro X 10.2.4 (4369.43)` | Logic version + build that last wrote |
| `VariantNames` | dict<int→string> | `{0: "Ducking_effect"}` | Map alternative index → display name |
| `projectAssetFlags` | integer | `12509` | Bitfield, undocumented |

**That's the whole file.** ProjectInformation.plist is shallow — variant names + version, nothing more.

### `Alternatives/NNN/MetaData.plist` — verbatim key catalog

Decoded from `010_Velocity_edited.logicx/Alternatives/000/MetaData.plist`:

| Key | Type | Example | Meaning |
|---|---|---|---|
| `Version` | int | `3` | MetaData schema version |
| `AudioFiles` | array<string> | `["Audio Files/Guitar 2#09.aif"]` | Project-relative audio refs |
| `PlaybackFiles` | array<string> | `[]` | Global playback files |
| `UltrabeatFiles` | array<string> | `[]` | Drum machine sample refs |
| `SamplerInstrumentsFiles` | array<string> | `["/Library/.../Steinway Piano.exs"]` | EXS/Sampler instrument refs |
| `ImpulsResponsesFiles` | array<string> | `["/Library/.../03.9s Prince Hall One-OST.SDIR"]` | Convolution reverb IRs (typo `Impuls` is Apple's, preserved) |
| `VideoFiles` | array<string> | `[]` | Imported video |
| `UnusedAudioFiles` | array<string> | `["Audio Files/Guitar 1#04.aif"]` | Files in package but not in arrangement |

### `Alternatives/NNN/DisplayState.plist` — partial catalog (UI state)

Decoded from `001_Recording_Preparing.logicx/Alternatives/000/DisplayState.plist`. The full schema is large and undocumented; **safe-to-read** keys:

| Key | Type | Notes |
|---|---|---|
| `displayDataVersion` | int | Schema version |
| `screenVisibleFrames` | array<string> | Window rects per screen, e.g. `"{{0, 51}, {1366, 695}}"` |
| `screensetCurrSlot` | int | Active screenset (1-9) |
| `screensetDictArray` | array<dict> | One entry per screenset |
| `screensetName` | string (in screensetDict) | User-named screenset |
| `inspectorIsVisible`, `libraryIsVisible`, `transportBarIsVisible`, `toolbarIsVisible` | bool | Panel visibility |
| `inspectorWidth`, `libraryWidth`, `listWidth` | real | Panel widths |
| `windowFrame` | string | Main window frame |
| `udataArrange`, `udataScore`, `udataTransport` | data/dict | Editor-specific opaque blobs — read-only, don't interpret |

`DisplayState` is informational only for csos — knowing the user's screenset name is mildly useful for take/cue tagging, but writing it back is out of scope.

### `Alternatives/NNN/WindowImage.jpg` — sleeper feature

Real JPEG. Logic's "session preview" thumbnail. csos can return it as a base64 image attachment in `logic_project_inspect` so an LLM can literally see what the session looks like (waveforms, track count, panel layout). **No competitor MCP exposes this.** Free win.

### What's NOT parseable safely

- `ProjectData` — binary, undocumented format. Holds: tempo map, time-signature changes, key signature, region/MIDI/automation, track manifest, plugin instances, send/aux routing, marker list. **All the genuinely musical data.**
- LoC's [Logic Pro Project Format note](https://www.loc.gov/preservation/digital/formats/fdd/fdd000640.shtml) confirms ProjectData is the canonical authoritative file and is undocumented.
- [logicprohelp thread on internal format](https://www.logicprohelp.com/forums/topic/132829-internal-logic-pro-x-file-format-docs/) — community efforts to reverse it have not produced a maintained schema. Apple changes it across point releases.
- Reversing ProjectData is EULA-adjacent and the maintenance cost rots within ~6 months of a Logic update. **csos does not parse ProjectData. Period.**

### Proposed `logic_project_inspect(path)` — full surface

```typescript
{
  path: string,                       // absolute path to .logicx
  bundleVersion: number,              // from ProjectInformation
  hasProjectFolder: boolean,
  lastSavedFrom: string,              // "Logic Pro 12.2 (5901.X)"
  variants: Array<{                   // alternative index → name
    index: number,
    name: string,
  }>,
  alternatives: Array<{               // one per Alternatives/NNN
    index: number,
    audioFiles: string[],
    samplerInstruments: string[],
    impulseResponses: string[],
    ultrabeatFiles: string[],
    videoFiles: string[],
    unusedAudioFiles: string[],
    displayState: {
      activeScreenset: number,
      screensetNames: string[],       // user-named screensets
      windowFrames: string[],         // for completeness; opaque
    },
    windowImage?: {                   // base64 JPEG if present
      mimeType: 'image/jpeg',
      data: string,
    },
  }>,
  // Honest-disclosure fields
  notExposed: {                       // tells the caller what we couldn't read
    tempo: 'in ProjectData (binary, not parsed)',
    timeSignature: 'in ProjectData (binary, not parsed)',
    keySignature: 'in ProjectData (binary, not parsed)',
    markers: 'in ProjectData (binary, not parsed)',
    trackManifest: 'in ProjectData (binary, not parsed)',
    pluginManifest: 'in ProjectData (binary, not parsed)',
  },
}
```

The `notExposed` field is novel: it's an honest in-band signal so an LLM caller doesn't waste tokens trying to extract data we don't expose. This is the inverse of "lying with absent fields."

---

## 2. fsevents bounce watcher → MCP subscribable resource

**Logic's bounce behavior:** the user picks a destination folder in the bounce dialog; Logic remembers it per-project. Default is `~/Music/Logic/Bounces` or the project's `Bounces/` subfolder. Logic does **not** auto-timestamp bounce filenames ([gearspace](https://gearspace.com/board/apple-logic-pro/991888-logic-audio-export-timestamp.html)) — third-party tools like Bounce Butler exist precisely because users want what Logic won't give them. **Opportunity:** csos can be the open Bounce Butler.

### MCP support for streaming events

The TypeScript SDK exposes resource subscriptions ([typescript-sdk client.md](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md)):

```typescript
// Server side — register as a resource template
server.setRequestHandler(SubscribeRequestSchema, async (req) => { ... });

// Client side — subscribe + handle
await client.subscribeResource({ uri: 'logic-bounces://my-session' });
client.setNotificationHandler('notifications/resources/updated', notif => {
  if (notif.params.uri.startsWith('logic-bounces://')) {
    // re-read resource → get latest bounce list
  }
});
```

The MCP server declares `subscribe: true` in resource capabilities. csos already declares `tools` capability; we add `resources` with `subscribe: true` for the Logic wing.

### Proposed `logic_watch_bounces(dir)` — mechanism

- **Tool form:** `logic_watch_bounces({ dir: string, projectName?: string })` returns a resource URI like `logic-bounces://{sessionId}`.
- **Resource form:** `logic-bounces://{sessionId}` returns JSON of bounces seen so far + watch state.
- **Watcher:** [chokidar](https://www.npmjs.com/package/chokidar) (which uses native [fsevents](https://www.npmjs.com/package/fsevents) on macOS for low-latency recursive watching). Pure JS install, no node-gyp burden — already a transitive dep in many tools, not load-bearing native.
- **Debounce:** Logic writes bounces atomically (rename-into-place for AIFF/WAV; some plugins may write progressively). 500ms debounce on `add` events; 2s "stable size" gate before declaring a bounce complete.
- **Filter:** by extension (`.wav`, `.aif`, `.aiff`, `.m4a`, `.mp3`, `.flac`).
- **Emit:** `notifications/resources/updated` on each settled bounce. Resource read returns:
  ```json
  {
    "watching": "/Users/mike/Music/Logic/Bounces",
    "since": "2026-05-05T14:00:00Z",
    "bounces": [
      {
        "path": "/Users/mike/Music/Logic/Bounces/Cue_03_Reveal.wav",
        "size": 18745024,
        "mtime": "2026-05-05T14:23:11Z",
        "ffprobe": {                      // optional, lazily computed
          "duration": 47.31,
          "sampleRate": 48000,
          "channels": 2,
          "lufs": -14.2
        }
      }
    ]
  }
  ```

### Why this is novel

Neither competitor MCP exposes an MCP-native subscription. They poll. Mike's Motif loop (compose in Logic → bounce → audition in game → iterate) is exactly the loop a subscribable resource collapses from minutes to seconds.

---

## 3. Sidecar JSON convention

Logic doesn't expose a way to attach metadata to a `.logicx` from outside. **A sibling file does the job without touching the package.**

### Schema (proposed)

`MyCue.logicx.json` next to `MyCue.logicx`:

```json
{
  "$schema": "https://creator-studio-os.dev/schemas/logic-sidecar.v1.json",
  "version": 1,
  "cue": {
    "name": "Cue 03 — Reveal",
    "scene": "freeport_dock_first_meeting",
    "motifFamily": "kael_theme",
    "intensity": "rising",
    "lengthBars": 32
  },
  "takes": [
    {
      "id": "take_001",
      "bouncePath": "Bounces/Cue_03_Reveal_v1.wav",
      "rating": 4,
      "notes": "horn entrance too loud, cellos late",
      "ts": "2026-05-05T14:23:11Z"
    }
  ],
  "motif": {
    "scoreMapEntry": "showcase.cue.reveal",
    "macroMapping": "tension_rises_3"
  },
  "tags": ["showcase", "act1", "first-contact"]
}
```

### Tools

- `logic_sidecar_write({ projectPath, data, mode: 'merge'|'replace' })` — atomic write (tmp + rename). `mode: merge` deep-merges with the existing sidecar so `takes[]` accumulates without external coordination.
- `logic_sidecar_read({ projectPath })` — returns parsed JSON or `null`.
- `logic_sidecar_validate({ projectPath })` — runs Ajv against the schema and returns errors with JSON pointers.

### Pairing with Motif

Motif's score-map JSON already has cue families. The sidecar's `motif.scoreMapEntry` is the bridge — a Logic project becomes addressable from Motif by score-map id, and a Motif cue knows where to find its source `.logicx`. **This is a csos-only loop.** Other Logic MCPs have no notion of an external composition score system to pair with.

---

## 4. CoreMIDI / IAC bus

### Library decision: **`easymidi`** wrapping `node-midi` wrapping RtMidi

Surveyed:

| Library | Lang | Activity | Verdict |
|---|---|---|---|
| [`easymidi`](https://www.npmjs.com/package/easymidi) | JS event wrapper over `node-midi` | active | **chosen** — clean event API, virtual ports |
| [`node-midi`](https://github.com/justinlatimer/node-midi) (justinlatimer fork) | C++ binding to RtMidi | active, prebuilt binaries via node-pre-gyp | underlying lib |
| [`Cycling74/node-midi`](https://github.com/Cycling74/node-midi) | C++ binding | maintained (Max/MSP team) | alternate fork, fine |
| `coremidi` (carlos8f) | direct CoreMIDI binding | last published 2015 | **dead** |
| `midivent`, `midi-with-node` | wrappers / examples | n/a | not core deps |

`easymidi` advantages:
- Event-based: `input.on('noteon', ...)`, `output.send('noteon', ...)`.
- Creates virtual ports cleanly: `new easymidi.Output('csos-bridge', true)` exposes `csos-bridge` as a virtual CoreMIDI source. Logic sees it in input port lists.
- Same API for IAC routing — user enables IAC Driver in Audio MIDI Setup once, csos sends to the IAC bus port.

**Install pain (honest):**
- node-midi is a **native module** — node-gyp build on first install. Prebuilt arm64/macOS binaries are usually available via node-pre-gyp; if Node version is too new at install time, you fall through to source build needing Xcode CLT.
- This is the same install pain GlyphStudio has. Acceptable for a desktop-tool MCP.
- Fallback: ship a thin Python helper using `python-rtmidi` if Node's binding is busted on a given user's machine. **Don't do this preemptively** — only if a real user hits it.

### Proposed `logic_iac_send` — scoped tightly

Three sub-tools rather than one fat dispatcher. Names match csos's existing naming convention.

```typescript
// Transport via MMC SysEx
logic_iac_transport({
  port: string,                       // e.g. 'IAC Driver Bus 1'
  command: 'play' | 'stop' | 'rewind' | 'fast_forward' | 'record',
})

// MMC locate to bar/beat or SMPTE timecode
logic_iac_locate({
  port: string,
  position: { bars: number, beats: number, ticks?: number }
        | { hours: number, minutes: number, seconds: number, frames: number },
})

// Notes & CC for testing/triggering
logic_iac_send_note({
  port: string,
  channel: number,                    // 1-16
  note: number,                       // 0-127
  velocity: number,                   // 0-127
  durationMs?: number,                // auto note-off if set
})

logic_iac_send_cc({
  port: string,
  channel: number,
  controller: number,                 // 0-127
  value: number,
})

// List available CoreMIDI ports
logic_iac_list_ports()                // returns { inputs: [], outputs: [] }
```

**Crucial honesty constraint:** Logic must be set up to listen. The user must enable "Listen to MMC Input" in Logic's Synchronization settings, and choose an IAC bus as input. csos can detect failure (via `easymidi` open errors) but can't force Logic to listen. Document this in the tool's `hint` field and in `logic-automation.md`.

This surface is functionally similar to [sandst1/mcp-server-midi](https://github.com/sandst1/mcp-server-midi) but Node-native, scoped to Logic-relevant verbs, and integrated with the rest of csos.

---

## 5. Logic Remote / network MIDI / Bonjour — out of scope, documented

[Apple's Logic Remote setup](https://support.apple.com/guide/logicremote-logicpro-ipad/connect-logic-remote-chsa0054e974/ipados) confirms Bonjour discovery, but the wire protocol is **proprietary, undocumented, and changes between iPad app versions**. As of 2026-05 there's no public Logic Remote protocol implementation. Reverse-engineering risks DMCA exposure for an open-source MCP and Apple has demonstrated they'll silently break it (Logic Remote currently has known issues with MainStage 4 — see [Logic Pro Help thread](https://www.logicprohelp.com/forums/topic/163175-mainstage-4-with-logic-remote/)).

**Posture:** documented in `logic-automation.md` as a deliberate non-goal. If Apple ever publishes the protocol or releases a CLI bridge, revisit.

---

## 6. Scripter MIDI plugin — confirmed in-Logic only

[Apple's Scripter docs](https://support.apple.com/guide/logicpro/use-scripter-lgce728c68f6/mac) and the [musios-app/logic-pro-scripter guide](https://github.com/musios-app/logic-pro-scripter) confirm Scripter runs JavaScriptCore inside Logic with a "more compact and limited environment than browser or Node.js." No XHR, no `fetch`, no sockets, no `require`, no FS access. Scripter cannot host a TCP server or talk to anything outside its plugin instance.

**Possible workaround that we're NOT shipping:** Scripter → MIDI out → IAC bus → external listener. csos could *receive* Scripter-emitted MIDI, but the user would have to author the Scripter script themselves. We document this as a power-user pattern, not a tool. If demand materializes, ship `logic_iac_listen` (a subscribable resource that emits MIDI events from a CoreMIDI input) as the receive-side of `logic_iac_send`.

---

## 7. OSC bridge — narrow, one direction, document

Apple's [OSC Message Paths](https://support.apple.com/guide/logicpro/osc-message-paths-ctlsf67f4bdc/mac) confirms:

- UDP/IPv4 only.
- Logic uses Bonjour to advertise itself; service name = computer name.
- OSC is primarily for **control surfaces** — assigning OSC paths to controller assignments. Inbound to Logic only via the Controller Assignments system. Outbound: track names, transport state escape.
- Not a general automation surface.

External wrappers like [TouchOSC + Logic](https://hexler.net/touchosc/manual/setup-logic) and [Open Stage Control](https://vi-control.net/community/threads/open-stage-control-tutorial-an-alternative-to-lemur-and-touchosc.72643/page-29) all build custom control surfaces — they're not a programmatic API.

**csos posture:** OSC is documented in `logic-automation.md` as an option for users who already have OSC controller assignments configured. We don't ship an OSC bridge tool in v1.5. If demand arrives, add `logic_osc_send(path, value)` later — but it's value-add over MIDI is small and the fragility (computer-name service discovery, user-mapped controller assignments) is high.

**Mainstage as proxy:** the [logicprohelp thread on controlling Mainstage via OSC](https://www.logicprohelp.com/forums/topic/95916-controlling-mainstage-via-osc/) shows it's possible but flaky. Mainstage 4 is reportedly broken with Logic Remote in 2026. Not worth chasing as a Logic backdoor.

---

## 8. `.logicx` write paths Apple supports

Confirmed safe:

- `open -b com.apple.mobilelogic /path/to/Project.logicx` — opens the project. No prompt. Already shipped as `logic_open`.
- `open -b com.apple.mobilelogic` — launches Logic without a project. Already shipped as `logic_app_open`.
- Drag-and-drop import — Logic accepts drops of audio files onto the arrange area; not scriptable from outside.

**Template instantiation:** Logic's New From Template is GUI only. We could `cp -R` a `.logicx` template from a known location and rename — but that's a file-system trick, not Logic automation, and feels brittle (variant names embedded in plists need updating). Defer.

---

## 9. Render-stems via UI scripting — why csos rejects it explicitly

Both [koltyj/logic-pro-mcp](https://github.com/koltyj/logic-pro-mcp) and [PsychQuant/che-logic-pro-mcp](https://github.com/kiki830621/che-logic-pro-mcp) take this route. What they actually do:

- **AppleScript + System Events `keystroke`** to simulate menu navigation (`File → Bounce`, `File → Export`).
- **Accessibility API** (`AXUIElement*`) to read the bounce dialog state.
- **CGEvent posts** for low-level keyboard/mouse simulation.

What breaks (per [koltyj README](https://github.com/koltyj/logic-pro-mcp) and [Apple Developer Forums on CGEvent fragility](https://developer.apple.com/forums/thread/724603)):

- **Locale-dependent menu names** — "Bounce" → "Bouncen" on German Logic. `keystroke "B"` fails when the menu reads "Bouncer Projet" on French Logic.
- **AX permission prompt** every time the binary signature changes. Mike rebuilds csos on every tag — every shipcheck publish would re-prompt every Logic user.
- **Version-coupled menu paths.** Logic 12.2 → 12.3 reorganized Mix menu items in a beta build (per [VI-Control thread](https://vi-control.net/community/threads/logic-pro-scripter-javascript-usage.120920/page-2)); keystroke macros referencing those paths silently no-op'd.
- **CGEvent posting reliability:** the [Apple developer thread on CGEvent](https://developer.apple.com/forums/thread/724603) documents posting failing under TouchID prompt, screen lock, and any focus-stealing system event.
- **No introspection.** koltyj rebuilds project state from Accessibility reads — track names, transport state, mixer values. The state is stale the moment Logic's UI animates.

**What csos would lose** by going this route:

- Every Logic update is a regression risk. Our 80%-CI promise dies.
- Localization burden is unbounded. Logic ships in 10+ languages.
- The threat-model doc (`docs/threat-model.md`) has to grow a section on "external automation can simulate user input" which is a security smell for an MCP.
- The whole position — "operator's workbench around Logic, not into it" — collapses.

The keystroke route is **a 50-tool MCP that does nothing csos's `logic_open` + `logic_iac_send` + `logic_watch_bounces` doesn't already do, and it's fragile**. We don't ship it.

---

## 10. Game-music workflows around Logic (csos-native)

Concrete patterns the operator's-workbench position enables:

### Chapter-aware bounce naming

Combine `logic_watch_bounces` + `logic_sidecar_read` + the the showcase deliverable scene catalog: when a bounce lands in `~/Music/Logic/Bounces/`, csos:

1. Reads the sidecar of the most-recently-saved `.logicx`.
2. Renames the bounce to `{game}/{scene}/{cue}_{take}.wav` per a configured pattern.
3. Updates the sidecar's `takes[]` array.

Tool: `logic_bounce_organize({ project, watchDir, pattern, dryRun })`. Pure file-system work — no Logic involvement past the bounce-write.

### Cue-family validation against Motif

For each `.logicx` with a sidecar `motif.scoreMapEntry`, validate against Motif's `score-map.json`:

- Cue exists in score-map?
- Bar count matches?
- Macro mapping declared?

Tool: `logic_motif_validate({ project, scoreMap })` — returns a list of mismatches the LLM can summarize. Pairs cleanly with the existing Motif CLI.

### Take comparison via `ffprobe`

Two takes of the same cue → `ffprobe` extract `duration`, `sample_rate`, `channels`; compute `LUFS-I`, `LUFS-TP`, peak; diff. Optional spectral diff via `ffmpeg -filter_complex showspectrum`.

Tool: `logic_take_compare({ projectPath, takes: [path1, path2] })` returns a structured diff. Handy for "the second take is 2.3 LU louder, 0.4s longer, peaks +0.8dB higher."

### Bounce → Compressor handoff

When `logic_watch_bounces` settles a bounce, optionally chain to `compressor_encode` (already shipped in csos) with a configured preset. The result: Logic bounce → mastered MP3 / AAC / Opus → drop in Forge Vault, all without human glue. **This is the cross-app composition protocol promised in v2.0.**

Wired as a higher-level orchestration tool: `logic_bounce_to_master({ watchDir, encoderPreset, outDir })`.

---

## 11. Watch-list signals — what to re-check each release

Add to `logic-automation.md`'s "Last reviewed" footer. Run at every macOS minor and Logic minor:

| Signal | Check |
|---|---|
| sdef appears | `find "/Applications/Logic Pro Creator Studio.app" -name "*.sdef" -print` (and `Logic Pro.app` for users on plain edition) |
| CLI appears | `ls /usr/local/bin/logic /Applications/Logic*.app/Contents/MacOS/logic-cli 2>/dev/null` |
| Apple dev docs | search `developer.apple.com` for `logic pro automation`, `logic pro scripting` |
| Scripter network APIs | check Apple's [Scripter docs](https://support.apple.com/guide/logicpro/use-scripter-lgce728c68f6/mac) for new globals; check JavaScriptCore version on the system |
| ProjectInformation.plist schema | `BundleVersion` increment in a sample project |
| Logic Remote protocol | Apple Developer Forums + GitHub `logic-remote` topic |
| OSC paths | diff against [Apple's OSC paths page](https://support.apple.com/guide/logicpro/osc-message-paths-ctlsf67f4bdc/mac) |
| MetaData.plist `Version` field | currently `3`; bump signals schema change |

Last reviewed: 2026-05-05 against Logic Pro 12.2.

---

## 12. Prior art audit — keystroke MCPs

Confirmed in 2026-05:

- **[koltyj/logic-pro-mcp](https://github.com/koltyj/logic-pro-mcp)** — Swift, ~13 stars. "8 dispatcher tools + 7 resources across 5 native macOS channels (CoreMIDI, Accessibility, CGEvent, AppleScript, OSC)." Smart-routing fallback chain. Their own README acknowledges: "UI element paths may change between Logic Pro versions, some deep state (automation curves, region MIDI data) is not exposed via Accessibility, AX element labels may be localized on non-English macOS." That's the disclaimer of a fragile foundation.
- **[PsychQuant/che-logic-pro-mcp](https://github.com/kiki830621/che-logic-pro-mcp)** — Swift, ~5 stars. 50-60+ tools. AppleScript + System Events keyboard simulation + CoreMIDI virtual ports + MMC. Heavy on transport / track mgmt / view / editing tools — every one is a localized menu lookup.

**csos's rejection of this route is correct in 2026-05.** Both servers exist; both are demonstrably fragile by their authors' own admission; neither unlocks anything `logic_open` + `logic_iac_send` + `logic_watch_bounces` doesn't already give us, with none of the fragility.

---

## 13. Frontier — 5 novel csos-only Logic surrounds

These are unique to creator-studio-os because they require either MCP subscriptions, the Motif loop, or csos's cross-app protocols. None can be done by koltyj or che.

### A. Motif-loop bounce iterator

**Pattern:** Motif emits a target macro mapping → csos creates a sidecar with the cue spec → user composes in Logic → bounces → csos auto-organizes + auto-validates against score-map + writes the audio path back into Motif's runtime pack manifest. **Loop closed without leaving Logic except to bounce.** No competitor MCP integrates with an external composition system.

Tools involved: `logic_sidecar_write`, `logic_watch_bounces`, `logic_motif_validate`, plus a new `motif_runtime_pack_attach` (lives in motif).

### B. Take-rating from LLM listening

After a bounce settles, csos runs `ffprobe` and emits the audio path + spectral summary as a resource. An LLM can fetch the audio (via a separate tool), listen via embeddings or whisper transcription (hum-detection / lyric extraction), and write a critique into `takes[].notes`. **Mike auditions cues in seconds without manually writing notes.**

Tool: `logic_take_audition({ takePath, criteria })` — wraps ffprobe + an audio-summary backend.

### C. Cover-art handoff

`WindowImage.jpg` from Alternatives extracted + passed to `pixelmator_*` for color-palette extraction → suggested cover art prompts for the cue in the Forge Vault. **Audio session → cover art bridge no other tool builds.**

Tool: `logic_cover_extract({ projectPath })` returns the JPEG + a palette JSON (k-means via sharp, 5 dominant colors).

### D. Sidecar diff over `.logicx` Git history

For projects under Git (or any VCS): walk recent commits, extract the sidecar at each, build a take-history timeline. Operator can ask "show me the rejected takes from the last 3 days" and csos surfaces them with reasons. **Logic has no version-aware history beyond Autosave; the sidecar makes it Git-native.**

Tool: `logic_sidecar_history({ projectPath, since })`.

### E. IAC-bus passive listener for ear-training / improv capture

Inverse of `logic_iac_send`: a subscribable resource that captures incoming MIDI from a configured CoreMIDI input (Logic emits MIDI via "Send MIDI Clock" or a track's MIDI Out routing). LLM gets streaming bar/beat events, chord summaries, note density. **Live observability of a session in progress without touching Logic.**

Tool: `logic_iac_listen({ port })` — subscribable resource. Ships in v1.6 after `logic_iac_send` is proven.

---

## Summary of proposed v1.5 → v1.6 scope

| Tool | v | Mechanism | Novel? |
|---|---|---|---|
| `logic_app_open` / `logic_app_running` / `logic_open` | 1.3 (shipped) | `open -b` + System Events | n |
| `logic_project_inspect` | 1.5 | XML plist parsing + JPEG attach | partly — `notExposed` field + WindowImage are novel |
| `logic_watch_bounces` | 1.5 | chokidar/fsevents + MCP `resources/subscribe` | **yes** — first Logic MCP using subscribable resources |
| `logic_sidecar_write` / `_read` / `_validate` | 1.5 | sibling JSON + Ajv | **yes** — schema pairs with Motif score-map |
| `logic_iac_transport` / `_locate` / `_send_note` / `_send_cc` / `_list_ports` | 1.5 | easymidi/RtMidi → CoreMIDI virtual port | n (sandst1 has the Python form) — but Node-native + scoped + integrated is novel |
| `logic_bounce_organize` | 1.5 | watch + rename + sidecar update | **yes** |
| `logic_motif_validate` | 1.5 | sidecar + Motif score-map | **yes** — csos-only |
| `logic_take_compare` | 1.5 | ffprobe + LUFS | partly novel (the integration is) |
| `logic_bounce_to_master` | 1.6 | watch + Compressor chain | **yes** — first cross-app csos protocol |
| `logic_cover_extract` | 1.6 | WindowImage.jpg + palette | **yes** |
| `logic_sidecar_history` | 1.6 | sibling JSON + git log | **yes** |
| `logic_take_audition` | 1.6 | ffprobe + LLM critique back into sidecar | **yes** |
| `logic_iac_listen` | 1.6 | easymidi input + subscribable resource | **yes** — inverse of send |

**Lines of evidence the slice is honest:** the surface above does not pretend to drive Logic. Every tool either reads from disk, watches disk, talks MIDI to Logic, or summarizes a file Logic emitted. If Apple ships an sdef tomorrow, none of these become wrong — they become complementary. If Apple silently changes ProjectData tomorrow, none of these break — we deliberately don't parse it.

The keystroke MCPs would all need rewriting. csos wouldn't.

---

## Sources

- [Logic Pro Project Format — Library of Congress FDD](https://www.loc.gov/preservation/digital/formats/fdd/fdd000640.shtml)
- [logicprohelp — Internal Logic Pro X file format docs](https://www.logicprohelp.com/forums/topic/132829-internal-logic-pro-x-file-format-docs/)
- [wikibook/logic-pro-x-103 sample logicx files](https://github.com/wikibook/logic-pro-x-103)
- [wikibook/logic-pro-x-104 sample logicx files](https://github.com/wikibook/logic-pro-x-104)
- [Apple — OSC Message Paths in Logic Pro](https://support.apple.com/guide/logicpro/osc-message-paths-ctlsf67f4bdc/mac)
- [Apple — Use Scripter in Logic Pro](https://support.apple.com/guide/logicpro/use-scripter-lgce728c68f6/mac)
- [Apple — Connect Logic Remote on iPad](https://support.apple.com/guide/logicremote-logicpro-ipad/connect-logic-remote-chsa0054e974/ipados)
- [koltyj/logic-pro-mcp](https://github.com/koltyj/logic-pro-mcp)
- [PsychQuant/che-logic-pro-mcp](https://github.com/kiki830621/che-logic-pro-mcp)
- [sandst1/mcp-server-midi](https://github.com/sandst1/mcp-server-midi)
- [easymidi npm](https://www.npmjs.com/package/easymidi)
- [justinlatimer/node-midi](https://github.com/justinlatimer/node-midi)
- [chokidar npm](https://www.npmjs.com/package/chokidar)
- [fsevents npm](https://www.npmjs.com/package/fsevents)
- [@modelcontextprotocol/sdk client docs](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md)
- [MCP Resources spec](https://modelcontextprotocol.io/specification/2025-03-26/server/resources)
- [MCP for SE — Interactive & Long-Running Tools](https://newsletter.victordibia.com/p/mcp-for-software-engineers-part-2)
- [Apple Developer Forums — CGEvent reliability](https://developer.apple.com/forums/thread/724603)
- [musios-app/logic-pro-scripter guide](https://github.com/musios-app/logic-pro-scripter)
- [hexler — TouchOSC + Logic setup](https://hexler.net/touchosc/manual/setup-logic)
- [VI-Control — Open Stage Control as alternative](https://vi-control.net/community/threads/open-stage-control-tutorial-an-alternative-to-lemur-and-touchosc.72643/page-29)
- [Apple Developer Forums — Logic Pro AppleScript request thread](https://developer.apple.com/forums/thread/115355)
- [logicprohelp — Is there a way to interact with Logic via scripting](https://www.logicprohelp.com/forums/topic/148142-is-there-a-way-to-interact-with-logic-using-scripting/)
- [Gearspace — Logic AppleScript discussion](https://gearspace.com/board/apple-logic-pro/854588-applescript.html)
- [gearspace — Logic audio export with timestamp](https://gearspace.com/board/apple-logic-pro/991888-logic-audio-export-timestamp.html)
- [Apple — Logic Pro 12 release notes](https://support.apple.com/en-us/109503)
