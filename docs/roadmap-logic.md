# Logic Pro roadmap

Plan for the `logic_*` wing. **Limited by Apple's automation surface** — not by our ambition.

> Surface = `open` to launch + open `.logicx` files. **Zero AppleScript dictionary** in the bundle. Until Apple ships an sdef or a CLI, external automation can't drive Logic.

## v1.3 — shipped 2026-05-04

- `logic_app_open` / `logic_app_running` (System Events)
- `logic_open` — `.logicx` project file-open handoff via `open -b com.apple.mobilelogic`
- `docs/reference/logic-automation.md` documenting the empty surface

## When this becomes worth expanding

We unlock new milestones on any of these external events:

1. **Apple ships a Logic AppleScript dictionary.** Mirror the FCP / Pixelmator architecture. Track / region / plugin / automation manipulation all become real.
2. **Apple ships a `logic` CLI** (similar to Compressor). Rendering, batch bouncing, tempo extraction.
3. **A community-reverse-engineered `.logicx` schema reaches stability.** High risk — Apple changes the format silently. Only worth it if there's a stable maintainer.
4. **A Logic Scripter MIDI plugin exposes external comms** — currently in-Logic only, but a future version could bridge.

Until one of those, v1.3 is the ceiling for `logic_*`.

## Roadmap-confirming findings from 2026-05-05 deep research swarm

The 2026-05-05 swarm verified Logic 12.2 still exposes zero programmatic surface in 2026 — no sdef, no CLI, no public schema. **The around-Logic position holds.** See [`docs/research/2026-05-05-deepswarm/04-logic-depth.md`](./research/2026-05-05-deepswarm/04-logic-depth.md) for full plist key catalog.

**Confirmed parseable `.logicx` plist surface** (verified via `plutil` against sample plists):
- `ProjectInformation.plist` — `BundleVersion`, `HasProjectFolder`, `LastSavedFrom`, `VariantNames`, `projectAssetFlags`. Shallow.
- `MetaData.plist` (per-Alternative) — file inventory: Audio / Sampler / IR / Video / Ultrabeat / Unused arrays.
- `DisplayState.plist` — screensets + panel state.
- **`Alternatives/NNN/WindowImage.jpg`** — per-Alternative cover thumbnail. **Real JPEG no competitor exposes.**

**Confirmed unsafe / off-limits:** Tempo, time-signature, markers, tracks, plugins all live in `ProjectData` — binary, undocumented, EULA-adjacent. Don't parse.

**MCP transport confirmed:** `resources/subscribe` + `notifications/resources/updated` is the right transport for `logic_watch_bounces`. Watcher: `chokidar` (uses native fsevents on macOS).

**MIDI library decision:** `easymidi` over `node-midi` over `RtMidi`. Virtual port creation works; install needs node-gyp but prebuilt arm64 binaries usually available.

**Keystroke-route rejection confirmed:** `koltyj/logic-pro-mcp` and `che-logic-pro-mcp` are locale-fragile, AX-permission-thrash, version-coupled. csos doesn't ship that.

## Concrete next adds (priority order — 13 tools across v1.5/v1.6)

The valuable adds are **around** Logic, not **into** it.

1. **`logic_project_inspect(path)`** — read-only `.logicx` plist parsing. ~80% of "what's in this session" answers from the shallow plists; ignore `ProjectData` entirely.
2. **`logic_watch_bounces({ dir })`** — MCP `resources/subscribe`-shaped tool. `chokidar` on the bounce-output directory; emit `notifications/resources/updated` when a bounce lands so downstream Compressor / FCP automation kicks in. **The Motif-cue-auditioning loop Mike actually does.**
3. **`logic_sidecar_write(path, data)`** + **`logic_sidecar_read(path)`** — sibling `.json` next to a `.logicx` (cue name, scene tag, motif family, take notes). Pairs with Motif's score-map.
4. **`logic_iac_send`** — thin CoreMIDI/IAC wrapper for transport (MMC) and notes/CC via `easymidi`. Scoped tightly — we don't pretend it's "control."
5. **`logic_alternative_thumbnail(path, alternativeIndex?)`** — extract `WindowImage.jpg` per Alternative. Unique to csos.
6. **9 novel csos-only adds** — Motif-loop bounce iterator, take-audition LLM critique, IAC passive listener, etc. See slice §6.

## What we do NOT plan to ship

- Direct `.logicx` package mutation. Apple changes the format silently across point releases; reverse-engineered code rots fast.
- UI scripting of Logic's GUI. Fragile across versions, version-coupled to specific menu paths.
- A wrapper around Scripter's JS engine. Scripter is in-Logic only; there's no external host for it.

## Cross-app role (v2.0+)

Even with the thin surface, Logic plays in cross-app protocols:

- **`protocol.podcast_episode`** — Logic is the human's tool to mix the master. After Logic exports the master file (manual step), `compressor_*` handles the encode and `pixelmator_*` makes the cover art.
- **`protocol.devlog` / `protocol.steam_trailer`** — Same pattern: Logic writes / mixes the score, `compressor_*` encodes the deliverables, `fcp_*` places it in the timeline. Logic isn't automated; the surrounding apps are.

So the "Logic wing" stays useful at the orchestration layer (`logic_open` to bring up a project for human work) even when its programmatic depth is zero.

## ffmpeg fallback

For programmatic audio operations Logic can't do from outside (concatenation, level normalization, simple filtering, format conversion), `ffmpeg` is the right tool. Document this as the answer for "I need to manipulate audio without a human in the loop." Logic is for human-driven music + sound design.

## Watch list

Re-check these on every macOS / Logic release:

- `find "/Applications/Logic Pro Creator Studio.app" -name "*.sdef"` — does an sdef appear?
- `ls /usr/local/bin/logic` and similar — does a CLI appear?
- Apple's developer docs for Logic Pro — any new automation guide?

Last reviewed: 2026-05-05 against Logic Pro 12.2 (Creator Studio) — deep research swarm.
