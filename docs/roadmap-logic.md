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

## Concrete next adds (per 2026-05-04 research swarm)

The swarm confirmed: **don't follow the keystroke-MCP route** that `koltyj/logic-pro-mcp` and `che-logic-pro-mcp` take. Lean into what fits creator-studio-os's "operator's workbench" position. In priority order:

1. **`logic_project_inspect`** — read-only `.logicx` plist parsing. Read `Alternatives/*/Metadata/`, `ProjectInformation`, sample-rate / tempo / length / track count / plugin manifest. **Skip the `ProjectData` binary** (undocumented, version-volatile, EULA-adjacent). ~80% of "what's in this session" answers without reversing anything.
2. **`logic_watch_bounces`** — fsevents on a configured bounce-output directory; emit MCP events when a bounce lands so downstream Compressor / FCP automation chains kick in. This is the Motif-cue-auditioning loop Mike actually does.
3. **`logic_sidecar_write`** — write a sibling `.json` next to a `.logicx` (cue name, scene tag, motif family, take notes). Pairs with Motif's score-map; lets human-driven Logic sessions leave structured breadcrumbs for the rest of csos.
4. **`logic_iac_send`** — thin wrapper over CoreMIDI virtual port + IAC bus to send transport (MMC) and notes / CC. Same surface as [sandst1/mcp-server-midi](https://github.com/sandst1/mcp-server-midi) but scoped tightly so we don't pretend it's "control."

The valuable adds are **around** Logic, not **into** it.

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

Last reviewed: 2026-05-04 against Logic Pro 12.2 (Creator Studio).
