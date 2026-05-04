# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-05-04

### Added (FCP authoring breadth)

- **Title spine items** with bundled "Custom" Build In:Out title effect (`.../Titles.localized/Build In:Out.localized/Custom.localized/Custom.moti`) as default. Configurable via `effectUid` / `effectName` on the title spec. Text styling: font, fontSize, fontColor (RGBA 0..1), alignment, bold, italic.
- **Transitions** on the spine. `kind: "transition"` items emit `<transition name="..." offset="..." duration="..."/>`. "Cross Dissolve", "Cross Blur", "Fade to Color" work via name attribute alone.
- **Per-clip audio levels** via `volumeDb` on `asset-clip` specs. `0` (default) emits no element; non-zero emits `<adjust-volume amount="-6dB"/>` etc.
- **Roles** — `videoRole` and `audioRole` attributes on `asset-clip` specs (e.g. `"Video.global"`, `"Dialogue.dialogue"`, `"Music.music"`, `"Effects.effects"`). Inherited by FCP's role-based audio routing.
- **Explicit library location** — `libraryLocation` on the project spec emits `<library location="file://...">` so FCP imports into / creates the named library on disk without the "import to which library?" dialog.

### Added (docs)

- `docs/reference/effect-uids.md` — UID catalog for built-in titles, with the verified Custom title path and how to discover more.
- `docs/roadmap-compressor.md` — Compressor wing milestones (human-readable preset names, multi-job batches, watch folders, FCP "Send to Compressor" handoff).

### Tests

- 6 new FCPXML builder tests (titles, transitions, adjust-volume on/off, roles, library location). 27 passing total.

### Internal

- Refactored builder spine emission to a per-kind dispatch with `renderClip` / `renderTitle` / `renderTransition`. Effects auto-deduplicated into resources.
- Spec-level `fcpxmlVersion` now honored end-to-end (was previously hardcoded in builder template).

## [1.1.0] — 2026-05-04

### Added

- Compressor wing: 6 new tools.
  - `compressor_app_open` — launch Compressor (idempotent; primes App Store entitlement validation).
  - `compressor_app_running` — System Events query.
  - `compressor_settings_list` — enumerate `.compressorsetting` presets from user + system dirs; `includeBundled=true` adds Apple's bundled presets.
  - `compressor_locations_list` — enumerate `.compressorlocation` files.
  - `compressor_encode` — submit a single encode via the CLI form (`Compressor -jobpath … -settingpath … -locationpath …`).
  - `compressor_encode_project` — convenience wrapper that resolves source / output paths inside a project directory.
- `creator-studio-os verify` now also checks Compressor app + binary presence.
- `docs/reference/compressor-cli.md` updated with the verified CLI form, settings/location paths, and the entitlement-validation behavior.
- `docs/roadmap-fcp.md` — FCP-specific roadmap (titles, transitions, audio levels, roles, library location, anchored clips, multicam, parser, render path, generators).
- 6 new tests; 22 passing total.

### Internal

- Added Compressor binary, bundle ID, and bundled-settings paths to `loadConfig()` (overridable via `CREATOR_STUDIO_COMPRESSOR_PATH`, `CREATOR_STUDIO_COMPRESSOR_BIN`, `CREATOR_STUDIO_COMPRESSOR_BUNDLED_SETTINGS`).
- Added error codes: `E_COMPRESSOR_NOT_FOUND`, `E_COMPRESSOR_FAILED`, `E_JOB_NOT_FOUND`, `E_SETTING_NOT_FOUND`.
- Compressor CLI runner strips the wall of objc class-collision warnings macOS prints on every invocation.

## [1.0.0] — 2026-05-04

### Added

- Initial release of `@mcptoolshop/creator-studio-os`.
- MCP server with 15 tools for Final Cut Pro:
  - Project directory management: `fcp_project_list`, `fcp_project_create`, `fcp_project_info`
  - FCPXML 1.14 authoring: `fcp_fcpxml_build`, `fcp_fcpxml_validate`, `fcp_fcpxml_write`, `fcp_fcpxml_import`, `fcp_fcpxml_build_write_import`
  - Read-only AppleScript: `fcp_library_list`, `fcp_library_events`, `fcp_event_projects`, `fcp_project_metadata`
  - App lifecycle: `fcp_app_open`, `fcp_app_activate`, `fcp_app_running`
- `creator-studio-os verify` preflight CLI (platform, osascript, xmllint, FCP install, DTD, data dir, FCPXML round-trip)
- DTD validation against the FCPXML 1.14 schema bundled inside Final Cut Pro
- Canonical data directory schema at `/Volumes/T9-Shared/AI/creator-studio` (overridable)
- Structured error shape with `code`, `message`, and `hint` fields
- Threat model documented in `SECURITY.md` and `docs/threat-model.md`
