# Logic Pro automation

## TL;DR

Logic Pro has **NO `.sdef`** in its bundle (verified via `find` across the entire `Logic Pro Creator Studio.app/`). No AppleScript dictionary, no AppleScript automation. This matches Compressor's posture.

Bundle ID: `com.apple.mobilelogic` (yes — `mobilelogic`, the legacy iOS Logic Pro namespace; v12.2 in Creator Studio bundle).

## What you CAN do

- **`open -b com.apple.mobilelogic /path/to/Project.logicx`** — Logic launches and opens the project. No prompt.
- **System Events `is running` / `activate`** — basic app lifecycle.
- That's it for external automation.

## What you CANNOT do (without UI scripting)

- Create / modify a Logic project programmatically
- Add tracks, regions, plugins, automation
- Trigger render-to-stem or bounce
- Read project metadata (track count, BPM, key, length)
- Switch project state from outside Logic

The internal **Scripter** plugin is JavaScript-based and runs *inside* Logic — not addressable from external automation. Useful for MIDI generation but not for the cross-app composition we care about here.

## Realistic v1.3 scope

`logic_*` ships only:

- `logic_app_open` — launch / activate
- `logic_app_running` — is running check
- `logic_open` — file-open handoff for `.logicx` projects

That's the entire Logic surface until Apple ships an AppleScript dictionary or a CLI. Expand only when something changes upstream.

## What's out of scope (likely forever)

- **Project authoring from JSON** — no public schema for `.logicx`.
- **Track / region / plugin manipulation** — same reason.
- **Bounce / render** — UI scripting only.
- **Audio routing changes** — same.

## Path forward when this changes

If Apple ever ships a Logic sdef, the upgrade path:

1. Drop the new sdef contents into this doc.
2. Mirror the FCP / Pixelmator architecture: AppleScript runner, per-command tools.
3. Bump to v1.5 / v2.0 of the Logic wing.

Until then, Logic is "the tool a human uses to make audio that we encode with Compressor and place in FCP timelines."

## ffmpeg / external alternative

For the narrow cases where we need *some* programmatic audio manipulation (concatenation, level normalization, format conversion), `ffmpeg` is the right tool — not Logic. Logic is for human-driven music + sound design; we hand off rendered stems to FCP via FCPXML and to Compressor for transcoding.

## Logic Pro 12 (Jan 2026) added zero programmatic surface

[Logic Pro 12 release notes](https://support.apple.com/en-us/109503) covers AI Session Synth Player, Chord ID, MIDI automation polish, Scripter improvements. **All user-facing.** No new programmatic surface. The closed-surface posture is unchanged.

## Why `com.apple.mobilelogic`?

Plausible (not confirmed): the bundle ID likely tracks Apple's internal "mobilelogic" engine codename used when Logic Pro for iPad's shared core was unified into Mac Logic. Both apps now run the same engine. Apple has not publicly explained the rename.

## OSC is the only first-party programmatic surface (and it's narrow)

Logic exposes **OSC** for control-surface integration — UDP/IPv4, predefined message paths, mostly one-way for parameters ([Apple OSC paths](https://support.apple.com/guide/logicpro/osc-message-paths-ctlsf67f4bdc/mac)). It is not a general automation surface. Track names and transport state escape via OSC; control *into* Logic is restricted to the assignment system.

External "control" wrappers ([TouchOSC + Logic setup](https://hexler.net/touchosc/manual/setup-logic), [Open Stage Control thread on VI-Control](https://vi-control.net/community/threads/open-stage-control-tutorial-an-alternative-to-lemur-and-touchosc.72643/page-29)) all use OSC to render custom control surfaces, not to programmatically drive Logic from Claude.

## What we CAN read from a `.logicx` package (without reversing the binary)

The plists inside the package are stable and Apple-documented enough to parse safely:

- `Alternatives/*/Metadata/` — per-alternative metadata
- `ProjectInformation` — sample rate, tempo, length, track count, plugin manifest

The `ProjectData` binary holds regions / MIDI / automation and is **undocumented and version-volatile**. Reversing it is EULA-adjacent ([logicprohelp.com thread](https://www.logicprohelp.com/forums/topic/132829-internal-logic-pro-x-file-format-docs/), [LoC format note](https://www.loc.gov/preservation/digital/formats/fdd/fdd000640.shtml)). Don't.

A future `logic_project_inspect` tool that reads only the plists gets ~80% of "what's in this session" answers without touching the binary or reversing anything. On the roadmap.

## Why Apple keeps Logic out of AppleScript

Forum consensus across [Apple Developer Forums](https://developer.apple.com/forums/thread/115355), [logicprohelp](https://www.logicprohelp.com/forums/topic/148142-is-there-a-way-to-interact-with-logic-using-scripting/), and [Gearspace](https://gearspace.com/board/apple-logic-pro/854588-applescript.html): real-time audio thread + project-graph mutation safety. Apple won't expose a surface they can't guarantee won't crash live sessions. **No 2026 signal that this changes.**

## Existing Logic MCP servers — and why we don't follow their lead

- **[koltyj/logic-pro-mcp](https://github.com/koltyj/logic-pro-mcp)** — Swift, ~13⭐, "5 control channels" (CoreMIDI, Accessibility API, CGEvent, AppleScript, OSC). Reconstructs state via Accessibility reads, not Logic introspection.
- **[PsychQuant/che-logic-pro-mcp](https://github.com/kiki830621/che-logic-pro-mcp)** — Swift, ~5⭐, **50-60+ tools** across transport, track mgmt, view, editing, project, MIDI ops, MMC. AppleScript + System Events keyboard simulation + CoreMIDI virtual ports + MMC.

**Both are keystroke macros dressed up.** They don't unlock any surface we don't already have via `logic_open` — they just script the menu bar. Locale-dependent menu names. Accessibility permission prompts. ARM signing quirks. We won't follow this path.

## What we WILL ship for Logic (around it, not into it)

The valuable additions are **around** Logic, not **into** it:

1. **`logic_project_inspect`** (read-only `.logicx` plists) — sample rate, tempo, length, track count, plugin manifest
2. **`logic_watch_bounces`** — fsevents on a configured bounce-output directory; emit MCP events when a bounce lands so downstream Compressor / FCP automation chains kick in
3. **`logic_sidecar_write`** — write a sibling `.json` next to a `.logicx` (cue name, scene tag, motif family, take notes) so human-driven sessions leave structured breadcrumbs
4. **`logic_iac_send`** — thin wrapper over CoreMIDI virtual port + IAC bus to send transport (MMC) and notes/CC

File-handoff remains the right primary position; metadata-sidecar + bounce-watch is the right v1.x expansion.

Last reviewed: 2026-05-04 against Logic Pro 12.2 (Creator Studio).
