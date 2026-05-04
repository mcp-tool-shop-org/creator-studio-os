# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-04

### Added

- Initial release of `@mcptoolshop/creator-studio-os`.
- MCP server with 15 tools for Final Cut Pro:
  - Project directory management: `fcp_project_list`, `fcp_project_create`, `fcp_project_info`
  - FCPXML 1.13 authoring: `fcp_fcpxml_build`, `fcp_fcpxml_validate`, `fcp_fcpxml_write`, `fcp_fcpxml_import`, `fcp_fcpxml_build_write_import`
  - Read-only AppleScript: `fcp_library_list`, `fcp_library_events`, `fcp_event_projects`, `fcp_project_metadata`
  - App lifecycle: `fcp_app_open`, `fcp_app_activate`, `fcp_app_running`
- `creator-studio-os verify` preflight CLI (platform, osascript, xmllint, FCP install, DTD, data dir, FCPXML round-trip)
- DTD validation against the FCPXML 1.13 schema bundled inside Final Cut Pro
- Canonical data directory schema at `/Volumes/T9-Shared/AI/creator-studio` (overridable)
- Structured error shape with `code`, `message`, and `hint` fields
- Threat model documented in `SECURITY.md` and `docs/threat-model.md`
