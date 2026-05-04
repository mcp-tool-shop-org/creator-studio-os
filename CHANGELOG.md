# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] — 2026-05-04

### Added (Motion)

- 3 `motion_*` tools — Motion has no `.sdef` (verified), so surface is intentionally thin:
  - `motion_app_open`, `motion_app_running`
  - `motion_open` — `.motn` file-open handoff
- `docs/reference/motion-automation.md` documents the empty surface and Motion's role in cross-app composition (human authors templates with published parameters; FCPXML uses them).

### Added (Keynote)

- 8 `keynote_*` tools backed by `Keynote.sdef`:
  - `keynote_app_open`, `keynote_app_running`
  - `keynote_open`, `keynote_close`
  - `keynote_export_pdf`, `keynote_export_pptx`
  - `keynote_export_movie` (QuickTime)
  - `keynote_export_images` — slide images as PNG / JPEG / TIFF (configurable via `imageFormat`)

### Added (Pages)

- 5 `pages_*` tools backed by `Pages.sdef`:
  - `pages_app_open`, `pages_app_running`
  - `pages_open`, `pages_close`
  - `pages_export` — PDF / Microsoft Word / RTF / unformatted text / EPUB

### Added (Numbers)

- 5 `numbers_*` tools backed by `Numbers.sdef`:
  - `numbers_app_open`, `numbers_app_running`
  - `numbers_open`, `numbers_close`
  - `numbers_export` — PDF / Microsoft Excel / CSV

### Internal

- New `src/apps/iwork/shared.ts` — shared `activateApp` / `openDocumentInApp` / `closeDocumentInApp` / `exportDocumentInApp` helpers used by Keynote / Pages / Numbers (their AppleScript shape is identical except for the bundle ID and format enum).
- Config now exposes `motionAppPath`/`motionBundleId`, `keynoteAppPath`/`keynoteBundleId`, `pagesAppPath`/`pagesBundleId`, `numbersAppPath`/`numbersBundleId` with env overrides.
- New error codes: `E_MOTION_NOT_FOUND`, `E_KEYNOTE_NOT_FOUND`, `E_PAGES_NOT_FOUND`, `E_NUMBERS_NOT_FOUND`.
- `verify` now checks all 8 Creator Studio apps' install paths (15 checks total).

### Docs

- `docs/reference/iwork-automation.md` documents the shared iWork pattern + per-app export format enums.
- `docs/reference/motion-automation.md` documents Motion's empty automation surface.
- `docs/roadmap-pixelmator.md`, `docs/roadmap-logic.md` — separately committed.

### Coverage

All 8 Apple Creator Studio apps now wired:

| App | Tools | Surface |
|-----|-------|---------|
| Final Cut Pro | 15 | FCPXML 1.14 author + AppleScript read |
| Compressor | 6 | CLI encode + discovery |
| Pixelmator Pro | 11 | AppleScript: open / close / export 10 fmts / resize / crop / rotate / flip / batch |
| Logic Pro | 3 | File handoff (no sdef) |
| Motion | 3 | File handoff (no sdef) |
| Keynote | 8 | AppleScript: open / close / export PDF / images / movie / PPTX |
| Pages | 5 | AppleScript: open / close / export 5 formats |
| Numbers | 5 | AppleScript: open / close / export PDF / Excel / CSV |
| **Total** | **56** | |

## [1.3.0] — 2026-05-04

### Added (Pixelmator Pro)

- 11 `pixelmator_*` tools backed by Pixelmator Pro's AppleScript dictionary (`PixelmatorPro.sdef`):
  - `pixelmator_app_open`, `pixelmator_app_running`
  - `pixelmator_open` / `pixelmator_close` document lifecycle
  - `pixelmator_export` — 10 formats: PNG, JPEG, TIFF, HEIC, GIF, JPEG2000, BMP, WebP, SVG, PDF
  - `pixelmator_resize` — width / height / resolution PPI
  - `pixelmator_crop` — bounds rect, optional delete-mode
  - `pixelmator_rotate` — 180 / right / left
  - `pixelmator_flip` — horizontal / vertical
  - `pixelmator_batch_export_project_images` — convert every image in `projects/<name>/images/` to a chosen format, optionally resizing, output to `out/`
  - `pixelmator_batch_export_project_images_dryrun` — preview the batch plan without launching Pixelmator
- Bundle ID `com.apple.pixelmator` (Apple post-acquisition namespace; v4.2 in Creator Studio bundle).

### Added (Logic Pro)

- 3 `logic_*` tools — intentionally thin because Logic has **no AppleScript dictionary**:
  - `logic_app_open`, `logic_app_running`
  - `logic_open` — `.logicx` project file-open handoff via `open -b com.apple.mobilelogic`

### Added (verify + docs)

- `creator-studio-os verify` adds Pixelmator Pro and Logic Pro install checks (11 checks total).
- `docs/reference/pixelmator-automation.md`, `docs/reference/logic-automation.md`.

### Internal

- Config exposes `pixelmatorAppPath`/`pixelmatorBundleId`, `logicAppPath`/`logicBundleId` with env overrides.
- New error codes: `E_PIXELMATOR_NOT_FOUND`, `E_PIXELMATOR_FAILED`, `E_LOGIC_NOT_FOUND`.
- 1 new test (Pixelmator format list); 28 passing total.

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
