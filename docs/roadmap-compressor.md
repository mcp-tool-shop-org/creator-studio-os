# Compressor roadmap

The plan for `compressor_*` tooling. Lives separately from the FCP roadmap because Compressor's surface is different — pure CLI + batch files, no AppleScript at all.

> Surface = `Compressor` binary + `.compressorbatch` files via `open -b`. **Zero AppleScript dictionary** ships with Compressor. Anything not addressable through those two surfaces is out of scope.

## v1.1 — shipped 2026-05-04

- CLI form: `Compressor -jobpath … -settingpath … -locationpath … [-batchname X] [-computergroup X] [-priority X]`
- `.compressorsetting` discovery from user + system + bundled dirs (16 bundled Apple presets visible)
- `.compressorlocation` discovery
- Single-job encode (`compressor_encode`) and project-aware variant (`compressor_encode_project`)
- App lifecycle (`compressor_app_open`, `compressor_app_running`)
- objc warning noise stripped from CLI stderr
- Real `jobID` + `batchID` parsed out of submission output
- 6 tests; smoke-proven end-to-end against Compressor 5.2 (HEVC HD encode of a 5s clip)

## Priority order from 2026-05-04 research swarm

The next concrete adds, in dependency order:

1. **`compressor_settings_inspect`** — `plutil -convert xml1` + parse for `Name` / `NameKey`. Doubles as `.compressorbatch` schema-reverse prep for v1.3.
2. **5.2 codec-availability filter** on `compressor_settings_list` — flag presets the host's Compressor will refuse (Blu-ray H.264, Dolby Digital, AVC-Intra-on-Apple-Silicon — silently removed in 5.2). One-shot static list keyed off Compressor version.
3. **`compressor_status` via cluster storage poll** — `~/Library/Application Support/Compressor/Storage/<UUID>/jobs/` ([discussions.apple.com 5889264](https://discussions.apple.com/thread/5889264)). Pair with `compressor_wait_for_output` as documented fallback.
4. **`compressor_watch_create` (v1.4)** must include "stable size" pre-flight — Compressor's own watch folder submits partial files for sources >~1min copy time ([macscripter](https://www.macscripter.net/t/watch-folder-for-compressor-droplet-problems/45969)). Poll until file size unchanged for N seconds before submitting.
5. **Defer `.compressorbatch` authoring (v1.3) until v1.2 lands** — XML parsing infrastructure for read is reusable for write.
6. **Skip distributed processing (v1.5)** until Mike has a multi-Mac render farm.

## v1.2 — Human-readable preset names + status

**Apple's bundled presets ship with technical filenames** (`BroadbandHDHEVCNameKey.compressorsetting`, `EFBComputer_HEVC10.compressorsetting`). The user-facing display name lives inside the `.compressorsetting` XML as a `Name` property (or via macOS NameKey resolution against a localized strings table inside the framework). Without this, `compressor_settings_list` is functional but unfriendly.

- **Parse `.compressorsetting` XML** to extract the human display name + format + estimated bitrate. Settings are property-list XML; macOS `defaults read` or `plutil -p` works on them.
- **`compressor_settings_resolve(name)`** — find a setting by display name across user/system/bundled, returning the path. Lets callers say "Apple Devices HD" and get the right file.
- **`compressor_settings_inspect(path)`** — dump a structured view of one setting (codec, resolution, bitrate, audio config) for the model to compare presets.

**Status / progress:**

- **`compressor_status`** — list currently-queued / running / completed batches. Compressor exposes batch state via files in `~/Library/Application Support/Compressor/Cluster Storage/` and the AutoSave dir; needs research. Without this, the model has no way to know if an encode is done short of `stat`-ing the output file.
- **`compressor_wait_for_output(path, timeoutSec)`** — poll for the output file to appear and stabilize (size unchanged for N seconds). Pragmatic fallback while we figure out proper status.

## v1.3 — Multi-job batches

Single-job CLI is fine for "encode this one file" but doesn't compose. A real deliverables pipeline encodes one source into multiple outputs (1080p H.264, 4K HEVC, ProRes master, social cut).

- **`.compressorbatch` authoring** — generate the XML schema Compressor uses to describe a batch (multiple jobs, each with its own setting + location). Schema is undocumented by Apple; reverse-engineer from a batch saved in the GUI.
- **`compressor_batch_build(spec)`** — JSON spec → `.compressorbatch` file.
- **`compressor_batch_submit(path)`** — `open -b com.apple.CompressorApp <batch>` handoff. GUI processes the queue.
- **`compressor_batch_encode(spec)`** — convenience: build → submit → wait for outputs.

This unlocks the deliverables matrix that real productions need.

## v1.4 — Watch folders + scheduled encodes

- **Watch folder integration** — Compressor watches a directory; new media triggers a configured setting. We can author the watch-folder definition file and stash it in the project's `fcp/` dir.
- **Scheduled batches** — Compressor's Computer Group + scheduling features for overnight encodes. Lower priority; useful if Mike runs heavy multi-deliverable jobs.

## v1.5 — Distributed processing (deferred — single-machine is enough)

- **`-computergroup`** flag works today but only matters with multiple Compressor cluster nodes. v1.5 catalogs configured groups and exposes them; until Mike has a render farm, this is YAGNI.

## v2.0 — Cross-app composition

Rolls into the broader project's v2.0. Compressor is the "render any deliverable" wing of every protocol:

- `protocol.steam_trailer`: FCP cuts → Compressor renders 1080p H.264 master + 4K HEVC + thumbnail still
- `protocol.devlog`: same pattern, lower bitrate, 9:16 social variants
- `protocol.podcast_episode`: Logic master → Compressor M4A + WAV archive
- `protocol.social_short`: FCP 9:16 reframe → Compressor preset matrix (TikTok, Reels, Shorts)

## Out of scope (probably forever)

- **Custom codecs / filters** — Compressor doesn't expose a plugin API for new codecs from CLI. Use ffmpeg if you need something Compressor doesn't have.
- **Real-time encoding progress percentage** — would require either polling Compressor's plist state files (fragile) or UI scripting (very fragile). Live progress UX is a v2+ research project.
- **Parallel batch execution from CLI** — Compressor serializes CLI submissions through one queue. For true parallelism, fall back to ffmpeg or run multiple Compressor.app instances (unsupported by Apple).
- **Direct framework integration** — `Compressor.framework` exists inside the app bundle but Apple has not stabilized a public API.

## ffmpeg fallback policy

Pure ProRes / H.264 transcodes that don't need Compressor's filter chain or color management belong in ffmpeg. Faster, fully scriptable, no entitlement dance. Documented as the right answer for:

- Test fixtures (the v1.1 smoke uses ffmpeg to generate `black-5s.mov`)
- Quick previews
- Non-color-critical deliverables

Compressor wins when you need:

- Apple's color pipeline (HDR, Dolby Vision, wide gamut)
- Apple Devices presets matched to App Store / iTunes / Apple TV requirements
- Send-to-Compressor handoff from FCP timelines (FCP only knows how to talk to Compressor, not ffmpeg)

## Testing strategy

- Unit: parser tests for `.compressorsetting` plist extraction (v1.2), `.compressorbatch` builder golden files (v1.3).
- Integration: real-encode smoke gates per release. v1.1 baseline is the 5s black HEVC encode that produced 117KB output. Future smokes add a multi-deliverable batch and a watch-folder trigger.
- Compressor must be open + entitled before integration smokes. A `--require-compressor` flag on the smoke runner enforces this.

Last updated: 2026-05-04 against Compressor 5.2.
