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

## Roadmap-altering finding from 2026-05-05 deep research swarm

`Compressor -help` against the local 5.2 bundle exposed **38+ undocumented flags**, including a first-class structured-output channel that rewrites this roadmap:

- **`-monitor [-format legacy|xml|json]`** — live batch/job state with `percentComplete`, `timeRemainingSeconds`, `status`, `batchID`, `jobID`. **Live progress is NOT out of scope — Apple ships it today.** The previous "out of scope" line below is removed.
- **`-info <xml>`** — submit ad-hoc XML job descriptions on the CLI. Strong tell that the `.compressorbatch` schema and the `-monitor` schema share noun identity.
- **`-kill / -pause / -resume / -jobaction`** — process control on submitted jobs.
- **`-instances`** — concurrency control across CLI calls.
- **`-checkstream`, `-findletterbox`** — analytical pre-flight without encoding.

Cluster-storage file watching (`~/Library/Application Support/Compressor/Storage/<UUID>/`) is **debris, not signal** — those `.qmaster.plist` files are stale-state when batches stall. Demoted to diagnostic-only.

`.compressorsetting` is **not a plist** (`plutil -convert xml1` fails). It's a custom XML rooted at `<setting>` with a known schema (codec FourCCs, bitrate, frame size, color tags, base64-bplist `encoder-properties` blob). NameKey resolves against `Localizable.strings` (binary plist) in `CompressorKit.framework/Resources/<lang>.lproj/`.

**Result:** v1.2 + v1.4 + v1.5 from the prior plan collapse into v1.2-v1.3 below. See [`docs/research/2026-05-05-deepswarm/02-compressor-depth.md`](./research/2026-05-05-deepswarm/02-compressor-depth.md) for the full schema reverse-engineering plan and ranked status mechanisms.

## v1.2 — Live monitoring + settings inspection (Phase 1 of build)

**The `-monitor` channel is the headline.** Stream first-class progress over MCP `notifications/progress`.

- **`compressor_monitor_stream({ jobId?, batchId?, intervalSec, timeoutSec })`** — invokes `Compressor -monitor -format json -query <intervalSec>`, parses each frame, emits `StatusFrame` over MCP. **Novel:** turns Compressor into a streaming progress source no other MCP exposes.
- **`compressor_status({ jobId?, batchId?, format: "json"|"xml", once: true })`** — one-shot wrapper over `-monitor -once`.
- **`compressor_pause / resume / kill({ jobId?, batchId? })`** — `-jobaction` wrappers.
- **`compressor_wait_for({ jobId?, batchId?, untilStatus, timeoutSec })`** — convenience that wraps `monitor_stream` and resolves on terminal status.
- **`compressor_settings_inspect(path, opts)`** — XML-parse `<setting>` root → `{ container, video: { codec, bitrate, w, h, color, profile, level, bitDepth }, audio: { codec, bitrate, channels }, displayName, description }`. NameKey resolution against `Localizable.strings` per locale.
- **`compressor_settings_resolve(displayName)`** — reverse lookup: "Apple Devices HD" → absolute path.
- **`compressor_codec_availability()`** — returns `{ available, removed: [{ codec, since, reason }], appleSilicon, version }` keyed off `(arch × Compressor version)`. Then enhances `compressor_settings_list` with `availability: "ok" | "codec-removed" | "arch-incompatible"` so the LLM never picks a preset that will silently fail.
- **Switch `compressor_encode` submission to `-outputformat json`** — structured submission response, no stdout regex.

`compressor_wait_for_output` (output-file size stability poll) demoted to **fallback only** for cases without a job/batch ID.

## v1.3 — Batch authoring + watch folders + cluster

Single release; the schema reverse-engineering work for `.compressorbatch` is reusable across all three.

**Reverse-engineering plan:** generate a 5-batch corpus in the GUI (single-job, multi-output deliverables matrix, annotations+chapters+SCC, custom location with naming tokens, computer-group routed). 5-way `xmllint --format` diff → schema skeleton. Cross-correlate with the live `-monitor xml` schema. Validate by round-trip submit. Document NameKey usage.

- **`compressor_batch_inspect(path)`** — parse → structured tree.
- **`compressor_batch_build(spec)`** — JSON spec → `.compressorbatch`. Golden-file-tested per shape in the corpus.
- **`compressor_batch_submit(path)`** — `open -b com.apple.CompressorApp <path>`.
- **`compressor_batch_encode(spec)`** — build → submit → monitor (replaces `wait_for_output`).
- **`compressor_locations_inspect(path)`**, **`compressor_location_build({ folder, filenameFormat, postActions })`**, **`compressor_location_tokens()`** — token catalog for filename-format strings.
- **`compressor_watch_create({ source, settingPath, locationPath })`** — author Compressor's watch-folder definition file. **In-process stable-size pre-flight** (poll size unchanged for N seconds before submission) sidesteps Apple's broken built-in watch-folder partial-file bug.
- **`compressor_groups_list()`** — `-computergroup` enumeration. Cluster-aware as soon as Mike has a second Mac; not blocked behind a v1.5 wall.

## v2.0 — Cross-app composition

Rolls into the broader project's v2.0. Compressor is the "render any deliverable" wing of every protocol:

- `protocol.steam_trailer`: FCP cuts → Compressor renders 1080p H.264 master + 4K HEVC + thumbnail still
- `protocol.devlog`: same pattern, lower bitrate, 9:16 social variants
- `protocol.podcast_episode`: Logic master → Compressor M4A + WAV archive
- `protocol.social_short`: FCP 9:16 reframe → Compressor preset matrix (TikTok, Reels, Shorts)

## Out of scope (probably forever)

- **Custom codecs / filters** — Compressor doesn't expose a plugin API for new codecs from CLI. Use ffmpeg if you need something Compressor doesn't have.
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

Last updated: 2026-05-05 against Compressor 5.2 (deep research swarm).
