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

## Compressor 5.2 silently removed codecs (2026-04-09)

Per [Apple's release notes](https://support.apple.com/en-lamr/102745), 5.2 removed:

- H.264 Blu-ray
- H.264 interlaced
- Dolby Digital
- AVC-Intra-on-Apple-Silicon

Old `.compressorsetting` files referencing these codecs **fail silently** at encode time. A future `compressor_settings_list` enhancement should flag presets whose codec is no longer available on the host's Compressor version.

5.0 (2026-01-28) added Apple Immersive Video / Vision Pro spatial packaging — UI feature, no CLI exposure. There is no Compressor 5.1; the line jumped 5.0 → 5.2.

## Where queued / running batches live (research target)

`~/Library/Application Support/Compressor/Storage/<UUID>/{jobs,shared}/` ([discussions.apple.com 5889264](https://discussions.apple.com/thread/5889264)) is plausibly where `compressor_status` can poll queue state without UI scripting. **Untested.** Investigation: open Compressor, queue a batch, watch this directory for state files.

Compressor logs are XML, written to disk via the Network Encoding Monitor's "save logs" action ([Apple Compressor interface](https://support.apple.com/guide/compressor/compressor-interface-cpsr8747af64/mac)) — likely a better progress source than polling output-file size.

## Watch folders submit partial files (race condition)

Compressor's watch-folder feature submits source files **before the copy completes** for any source larger than ~1 minute of copy time ([macscripter thread](https://www.macscripter.net/t/watch-folder-for-compressor-droplet-problems/45969)). Partial-file submission is the dominant failure mode.

Mitigation: copy to a staging directory, then atomic `mv` into the watch folder. A future `compressor_watch_create` MCP tool should bake this in as a "stable size" pre-flight (poll until file size unchanged for N seconds before submission).

Watch folders also do **not** follow symlinks and do **not** move source files after submission — cleanup is the integrator's problem.

## `.compressorsetting` and `.compressorbatch` plist schemas

Both are property-list XML, but Apple does not document the schemas. To reverse-engineer:

```bash
plutil -convert xml1 -o - "/path/to/preset.compressorsetting"
```

Display name lives in either a `Name` string property or a `NameKey` reference resolved against framework localization tables. `plutil -p` is the path to extracting human-readable preset names — on the roadmap as `compressor_settings_inspect`.

## Encoding without Compressor

For pure ProRes / H.264 transcodes that don't need Compressor's filter chain or color management, **`ffmpeg`** is the right tool. Faster, fully scriptable, no entitlement dance. Document it as a fallback but not the primary `compressor_*` path.

## Status (creator-studio-os v1.1)

- `compressor_app_open` — primes entitlement validation
- `compressor_app_running` — System Events query
- `compressor_settings_list` — enumerates user + system + bundled settings
- `compressor_locations_list` — enumerates user + system locations
- `compressor_encode` — single-job CLI invocation
- `compressor_batch_submit` — `open -b` handoff with a `.compressorbatch` file (deferred — needs `.compressorbatch` schema work)

## `-locationpath` extension replacement (verified 2026-05-05)

When a full file path is passed to `-locationpath`, Compressor uses only the **directory** and **filename stem** — it replaces the extension with the container format dictated by the setting:

- `EFBComputer_HEVC8.compressorsetting` → `.mp4`
- ProRes settings → `.mov`

So `-locationpath /out/black-30s-hevc.mov` writes to `/out/black-30s-hevc.mp4` for HEVC 8-bit. The `.mov` extension is silently ignored.

**Implication for code:** never poll for a specific extension after a Compressor job. Poll by **stem** (`files.find(f => f.startsWith(stem + "."))`). The output extension is determined by the preset, not the caller.

Passing a bare directory path (without a filename) triggers exit 255: "Destination is a directory; Expected complete output file path with file name." — so a full path with ANY extension is required, but Compressor only honours the directory and stem.

## Daemon-state recovery (surfaced by v1.6.0 smoke, 2026-05-05)

Compressor's daemon can land in a state that refuses new submissions with:

```
Submission Error: Error Domain=com.apple.compressor.ErrorDomain Code=1
"Unable to submit to queue. Please restart your computer or verify your
Compressor installation is correct."
```

Apple's message is misleading. The fix is not a reboot — it's a daemon reset:

```bash
killall Compressor   # kills the daemon; it respawns on next CLI call
sleep 2
Compressor -jobpath <input> -settingpath <preset> -locationpath <output>
```

`encodeJob` in `src/apps/compressor/cli.ts` detects this error string and retries once automatically (daemon kill → 2s wait → one retry). If the retry also fails, the original error is surfaced.

**Root cause pattern:** a prior job submission entered a bad state (e.g. the job was submitted but the process died before Compressor could finalize queue registration). The daemon holds the zombie entry and rejects new submissions until it is restarted.

**Prevention:** `drainCompressorQueue()` in `src/apps/compressor/monitor.ts` polls `Compressor -monitor -once` (no filter) and `-kill`s any non-terminal batches before the next submission. The smoke harness calls this between Phase 1 and Phase 2.

**When you see it:** any time two Compressor jobs are submitted in the same session without waiting for the first to fully exit the queue. Common in smoke / batch workflows.

Last reviewed: 2026-05-05 against Compressor 5.2.
