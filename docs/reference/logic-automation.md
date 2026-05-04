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

Last reviewed: 2026-05-04 against Logic Pro 12.2 (Creator Studio).
