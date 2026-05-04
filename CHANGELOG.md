# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
