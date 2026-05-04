# Roadmap

## v1.0 — FCP authoring (shipped)

- FCPXML 1.13 build / validate / write / import
- Read-only AppleScript surface (libraries, events, projects, metadata)
- Project directory schema + scaffolding

## v1.1 — Compressor (shipped 2026-05-04)

- `compressor_*` tools — `app_open`, `app_running`, `settings_list`, `locations_list`, `encode`, `encode_project`
- Verified CLI form: `Compressor -jobpath … -settingpath … -locationpath …`
- Settings discovery from user + system + bundled dirs

## v1.2 — FCP authoring breadth

- Title spine items (require `effect` references — needs a small effect library)
- Transitions on the spine
- Audio levels via `adjust-volume`
- Roles (video role, audio role) for timeline organization
- Explicit library location (`<library location="...">`) so import doesn't need a dialog

See [`docs/roadmap-fcp.md`](./roadmap-fcp.md) for full FCP roadmap.

## v1.3 — Logic Pro + Pixelmator Pro

- Logic Pro: project XML authoring, Scripter MIDI plugin scaffolds, render-to-stem via AppleScript
- Pixelmator Pro: batch image ops (resize, color match, export presets) via Shortcuts URL schemes

## v1.4 — Motion + Keynote/Pages/Numbers

- Motion: parameterized `.motn` template render
- Keynote: slide-deck → FCP storyboard, presentation → still export
- Pages / Numbers: full AppleScript surface for storyboard / shot list authoring

## v2.0 — Cross-app composition protocols

A protocol is a higher-level workflow that composes per-app tools to produce a deliverable:

- `protocol.devlog` — script + footage + Logic stems → FCP cut + Compressor encode → Steam page asset
- `protocol.steam_trailer` — beats list + Motif cue map + footage → FCP cut → Compressor 1080p H.264
- `protocol.social_short` — long cut + crop spec → FCP 9:16 reframe → Compressor preset
- `protocol.podcast_episode` — multitrack → Logic master → Compressor M4A → cover via Pixelmator

Protocols read `project.json` to know what kind of deliverable, then orchestrate per-app tools end-to-end.
