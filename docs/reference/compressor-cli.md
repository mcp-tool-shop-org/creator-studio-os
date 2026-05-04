# Compressor CLI

## TL;DR

Compressor has **no AppleScript dictionary** (no `.sdef` in the bundle). Automation surface is purely:

1. The `Compressor` binary at `/Applications/Compressor Creator Studio.app/Contents/MacOS/Compressor`
2. `.compressorbatch` / `.compressorTemplate` files handed to the app via `open -b com.apple.CompressorApp`
3. The plain CLI invocation form (below)

First CLI run after install (or after sign-out) prints `Validating Purchase...` and a wall of objc class-collision warnings. The objc warnings are harmless macOS noise; the validation is real and must complete before encoding starts. Mitigation: run `compressor_app_open` once at session start to prime entitlement.

## Verified CLI form (Apple docs, 2026-05-04)

```bash
Compressor [-computergroup <name>] \
           [-batchname <name>] \
           [-priority <low|medium|high>] \
           -jobpath <input-file> \
           -settingpath <compressor-setting-file> \
           -locationpath <output-file>
```

The three flags marked with `-` (no brackets in source) are **required**:

- **`-jobpath`** — URL or absolute path to the source media file
- **`-settingpath`** — absolute path to a `.compressorsetting` file (the encode preset)
- **`-locationpath`** — absolute path to the output file (Compressor writes here)

Optional:

- **`-batchname`** — display name for the batch in Compressor's queue UI
- **`-computergroup`** — name of a Compressor distributed-processing group; defaults to "This Computer"
- **`-priority`** — `low | medium | high`

Source: [Apple Support — Job command syntax in Compressor](https://support.apple.com/guide/compressor/syntax-cpsr9be73312/mac).

## Where `.compressorsetting` files live

| Source | Path | Notes |
|--------|------|-------|
| Apple bundled | `/Applications/Compressor Creator Studio.app/Contents/PlugIns/Compressor/CompressorKit.bundle/Contents/Frameworks/Compressor.framework/Versions/A/Frameworks/CompressorKit.framework/Versions/A/Resources/Settings/*.compressorsetting` | Many Apple presets (HEVC, ProRes, Vision Pro, broadcast). Filenames are technical (`EFBComputer_HEVC10.compressorsetting`); GUI names differ. |
| User custom | `~/Library/Application Support/Compressor/Settings/` | Created once Compressor has been launched with a user account. **Not present until first launch.** |
| System | `/Library/Application Support/Compressor/Settings/` | Optional admin-installed presets. |

For automation:

- **User-facing settings** lookup: enumerate user + system dirs.
- **Apple bundled** settings: enumerable, but addressable by full path. Whether the CLI accepts these paths or only respects user-installed copies is **untested as of 2026-05-04**.

## Where `.compressorlocation` files live

Same pattern: `~/Library/Application Support/Compressor/Locations/` for user, system path mirror, plus bundled defaults inside the framework.

A "location" defines output naming + folder. Without one, the CLI requires `-locationpath` to a fully-resolved output file path.

## Document types Compressor accepts

From the app's `Info.plist`:

- `.compressorbatch` — full batch description (multiple jobs, multiple settings)
- `.compressorTemplate` — batch template
- `.motn` — Motion project (passes through to Motion for render)
- `.264`, `.dv`, `.aiff`, `.mov`, etc. — input media

Handing a `.compressorbatch` to `open -b com.apple.CompressorApp` queues the batch in the GUI. Reasonable fallback when the CLI form is finicky.

## Encoding without Compressor

For pure ProRes / H.264 transcodes that don't need Compressor's filter chain or color management, **`ffmpeg`** is the right tool. Faster, fully scriptable, no entitlement dance. Document it as a fallback but not the primary `compressor_*` path.

## Status (creator-studio-os v1.1)

- `compressor_app_open` — primes entitlement validation
- `compressor_app_running` — System Events query
- `compressor_settings_list` — enumerates user + system + bundled settings
- `compressor_locations_list` — enumerates user + system locations
- `compressor_encode` — single-job CLI invocation
- `compressor_batch_submit` — `open -b` handoff with a `.compressorbatch` file (deferred — needs `.compressorbatch` schema work)

Last reviewed: 2026-05-04 against Compressor 5.2.
