# 02 — Compressor depth

**Agent:** 02/9 deep-research swarm
**Date:** 2026-05-05
**Repo:** creator-studio-os
**Compressor target:** 5.2 ("Compressor Creator Studio.app")
**Status:** Ground truth pulled from the local Compressor 5.2 bundle on the M5 Max — most prior assumptions in `roadmap-compressor.md` and `compressor-cli.md` are incomplete or wrong. The headline finding rewrites the roadmap.

---

## TL;DR — the headline finding rewrites the roadmap

**`Compressor -help` exposes a much larger CLI than Apple documents on `support.apple.com`.** The publicly-documented surface is six flags (`-jobpath / -settingpath / -locationpath / -batchname / -computergroup / -priority`). The actual surface, dumped from `strings(1)` on the binary and confirmed by running the binary directly, is **38+ flags**, including:

- **`-monitor [-format legacy|xml|json]`** — live batch/job state with `percentComplete`, `timeRemainingSeconds`, `status`, fully structured. **Progress is NOT out of scope.** The current roadmap line "Real-time encoding progress percentage … is a v2+ research project" is wrong — Apple ships first-class JSON status output today.
- **`-kill / -pause / -resume`** — full job/batch lifecycle control by jobID/batchID.
- **`-jobid / -batchid / -query / -timeout / -once`** — designed exactly for status-poll loops.
- **`-info <xml> / -jobaction <xml>`** — XML-structured job submission and post-submit job actions (the undocumented escape hatch into the full job model).
- **`-instances <number>`** — runs additional Compressor instances. The roadmap claim "Compressor serializes CLI submissions through one queue" is wrong on Apple Silicon multi-instance machines.
- **`-checkstream <url>`** — analyze a stream without encoding (codec inspection).
- **`-findletterbox <url>`** — analyze a stream for letterbox crop. Standalone analyzer.
- **`-annotations <path>` / `-chapters <path>` / `-scc <url>`** — metadata/captioning attach points at submit time.
- **`-resetBackgroundProcessing [cancelJobs] / -repairCompressor`** — supported recovery actions, no UI required.
- **`-relabelaudiotracks / -relabelcolorspace / -renametrackswithlayouts`** — file-modification mode (jobpath + locationpath only, mutates source) for track/colorspace metadata edits without re-encode. Niche but novel.
- **`-sharing / -requiresPassword / -noPassword / -networkInterface / -portRange / -serverCertificate`** — full distributed-processing config from CLI. v1.5 is doable today.

Source for those: `strings "/Applications/Compressor Creator Studio.app/Contents/MacOS/Compressor"` and `Compressor -help`. No web docs surface them — they're the binary's own help text.

This means **most of the v1.2/v1.3/v1.4 roadmap collapses into v1.2** as a pure-CLI implementation, with no need to reverse-engineer state files or poll output sizes.

---

## 1. `.compressorsetting` plist schema — extracted from the bundle

`.compressorsetting` is **not a property list**. It's a custom XML document with `<setting>` as the root element. `plutil -convert xml1` fails with `Property List error: Encountered unknown tag setting`. Use a real XML parser, not plistlib.

Verified schema (from `BroadbandHDHEVCNameKey.compressorsetting`, Compressor 5.2):

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<setting name="BroadbandHDHEVCNameKey">
  <version>401408</version>
  <description>BroadbandHDHEVCDescKey</description>
  <default-destination></default-destination>
  <nameKey>BroadbandHDHEVCNameKey</nameKey>
  <descriptionKey>BroadbandHDHEVCDescKey</descriptionKey>
  <encoder name="QT">
    <audio-video-encode isEnabled="no"/>
    <file-extension>mov</file-extension>
    <job-can-be-segmented>yes</job-can-be-segmented>
    <duration-change factor="100" new-duration="" source-at-output="no"/>
    <marker-image width="0" height="0"/>
    <encode-cc>yes</encode-cc>
    <encode-chapters>yes</encode-chapters>
    <auto-bit-rate-purpose>10</auto-bit-rate-purpose>
    <include-hidden-metadata>yes</include-hidden-metadata>
    <metadata-options>1</metadata-options>
    <audio-encode name="Audio" isEnabled="yes">
      <auto-channel_layout>yes</auto-channel_layout>
      <audio-format-info>44100.000000 2 16 44100 N 6619138 Y</audio-format-info>
      <codec-type>aac </codec-type>
      <quality>64</quality>
      <audio-encoding-strategy>1</audio-encoding-strategy>
      <audio-encoding-bitrate>128000</audio-encoding-bitrate>
    </audio-encode>
    <video-encode name="QT" isEnabled="yes">
      <bounds width="-100" height="-100" pixelAspect="0"/>
      <crop left="0" top="0" right="0" bottom="0"/>
      <padding left="0" top="0" right="0" bottom="0"/>
      <frame-rate>-100.000000</frame-rate>
      <automatic video-conversion="" color-spec="" width="-1920" height="1080"
                 frame-rate="-100" crop="no" padding="no" center-crop="0"
                 field-dominance="no"/>
      <color-space primaries="2" transfer="2" matrix="2"/>
      <codec-type>hvc1</codec-type>
      <codec-manufacturer>appl</codec-manufacturer>
      <spatial pixelDepth="24" minQuality="768" quality="768"/>
      <temporal keyFrameInterval="0" minQuality="768" quality="768" partial-sync="0"/>
      <data-rate>725000</data-rate>
      <data-rate-limit-size>0</data-rate-limit-size>
      <encoder-properties><![CDATA[YnBsaXN0MDDS...]]></encoder-properties>
      <video-360-metadata-format>0</video-360-metadata-format>
      <encoder-variant>1</encoder-variant>
      <alpha-quality>1</alpha-quality>
    </video-encode>
    <write-clap>yes</write-clap>
    <qt-streaming>0</qt-streaming>
    <qt-audio-passthrough>no</qt-audio-passthrough>
    <qt-video-passthrough>no</qt-video-passthrough>
  </encoder>
  <filter-set/>
</setting>
```

**Extractable surface for `compressor_settings_inspect`:**

| Field | XPath | Type | Notes |
|---|---|---|---|
| Internal name | `/setting/@name` | string | Filename-safe identifier |
| Display name | `/setting/nameKey` → resolve via `Localizable.strings` | string | Bundle key, NOT literal text |
| Description | `/setting/descriptionKey` → resolve | string | Same |
| Container | `/setting/encoder/file-extension` | string | `mov`, `m4v`, `mp4`, etc. |
| Video codec | `/setting/encoder/video-encode/codec-type` | FourCC | `hvc1`, `avc1`, `apch` (ProRes 422 HQ), `apco` (Proxy), etc. |
| Codec vendor | `/setting/encoder/video-encode/codec-manufacturer` | FourCC | `appl` |
| Frame size | `/setting/encoder/video-encode/automatic/@width` `/@height` | int (negative = auto-calc cap) | `-1920 -1080` means "up to 1920×1080" |
| Frame rate | `/setting/encoder/video-encode/frame-rate` | float (`-100` = match source) | |
| Bitrate (kbps×1000) | `/setting/encoder/video-encode/data-rate` | int | `725000` = 725 kbps. Zero means VBR/codec-default. |
| Color | `/setting/encoder/video-encode/color-space/@primaries|@transfer|@matrix` | int (CMVideoCodecType color tags) | `2 2 2` = Rec.709/HD |
| Audio codec | `/setting/encoder/audio-encode/codec-type` | FourCC | `aac ` (trailing space), `lpcm`, `ac-3` |
| Audio bitrate | `/setting/encoder/audio-encode/audio-encoding-bitrate` | int (bps) | |
| Audio channels | `/setting/encoder/audio-encode/audio-format-info` | space-delimited | `samplerate channels bitdepth ...` |
| Encoder-properties blob | `/setting/encoder/video-encode/encoder-properties` | CDATA → base64 → binary plist | Inner blob is `bplist00` containing `Profile`/`Level` (e.g. `HEVC_Main_AutoLevel`, `8-Bit Color`). Decode with `plutil -convert xml1`. |
| Bundle dependencies | `*.plist` siblings (`AVCIntra.plist`, `Audio.plist`, `Blu-ray.plist`, `DVD.plist`) | plist | Codec capability descriptors, NOT user presets. Skip in `_list`. |

**NameKey resolution:** `Localizable.strings` lives at `…/CompressorKit.framework/.../Resources/<lang>.lproj/Localizable.strings` as a **binary plist** (confirmed: `file` reports `Apple binary property list`). Read with `plutil -p`. The bundle ships en/de/es/fr/ja/ko/zh_CN.lproj. Resolution is a flat dictionary lookup keyed on the `nameKey`/`descriptionKey` value.

### Proposed tool: `compressor_settings_inspect`

```ts
{
  path: string,                  // absolute .compressorsetting path
  locale?: string,               // default: process locale, fallback "en"
  resolveNames?: boolean,        // default: true — resolve nameKey/descriptionKey
  decodeEncoderProperties?: boolean // default: false — extract HEVC profile/level from CDATA
}
→ {
  internalName, displayName, description,
  container, video: { codec, codecVendor, width, height, frameRate, bitrate, colorPrimaries, colorTransfer, colorMatrix, profile?, level?, bitDepth? },
  audio: { codec, bitrate, sampleRate, channels, bitDepth },
  filters: [...],               // /setting/filter-set
  raw: <full parsed XML tree>   // escape hatch
}
```

### Proposed tool: `compressor_settings_resolve(displayName)`

Reverse the lookup. Build an in-memory map keyed on the resolved `nameKey` value, return the path. Caches across calls (preset trees rarely change between sessions).

---

## 2. `.compressorbatch` schema — reverse-engineering plan

Apple ships no docs and no DTD/XSD inside the bundle (`find … -name "*.dtd" -o -name "*.xsd"` returned nothing). String evidence in the binary:

- `compressorBatchTemplateFile`
- `compressorTemplate`
- `compressorbatchfile`

These are bundle-internal type identifiers, not schema names. The actual root element name is determinable only by saving a real batch from the GUI and inspecting it.

**Reverse-engineering plan (executable, ordered):**

1. **Generate baseline corpus.** Hand-create batches in the GUI covering: (a) single job + single output, (b) single job + 3 outputs (deliverables matrix — H.264 master + HEVC 4K + audio-only), (c) batch with annotations + chapters + SCC captions, (d) batch with custom location and naming tokens, (e) batch routed to a Computer Group. Save each as `.compressorbatch`. Five files, ~5 min.
2. **Diff structurally.** `xmllint --format` each, then a 5-way diff. Stable elements = schema skeleton. Variable subtrees = job-specific payload.
3. **Cross-correlate** with the live `-monitor -format xml` schema (we already have `<batches><batch><batchID/><jobs><jobID/></jobs></batch></batches>` and `<batchStatus>` / `<jobStatus>` from `strings`). The submit-side and monitor-side schemas almost certainly share noun identity.
4. **Validate by round-trip.** Build a batch programmatically, submit via `open -b com.apple.CompressorApp <file>`, confirm the GUI accepts it without warnings, confirm `-monitor` reports the expected job count.
5. **Document NameKey usage.** Verify if batches reference settings by absolute path, by display name, by NameKey, or by URI. Hypothesis from CLI design: by absolute path (matches `-settingpath`).

**Strong guesses to test (from binary strings):**

```xml
<batches>
  <batch batchID="<UUID>">
    <name>...</name>
    <submissionTime>...</submissionTime>
    <sentBy>...</sentBy>
    <jobs>
      <job jobID="<UUID>">
        <name>...</name>
        <jobType>...</jobType>
        <priority>low|medium|high</priority>
        <jobpath>file:///…</jobpath>
        <outputs>
          <output>
            <settingpath>file:///…/Foo.compressorsetting</settingpath>
            <locationpath>file:///…/MyOutput.m4v</locationpath>
          </output>
        </outputs>
        <annotations>...</annotations>
        <chapters>...</chapters>
        <scc>...</scc>
      </job>
    </jobs>
  </batch>
</batches>
```

The `-info <xml>` flag is a tell — Apple already accepts ad-hoc XML job descriptions on the CLI. Hypothesis: `-info` payload is a `<job>` subtree of the same schema. **Test pre-v1.3** by sniffing what FCP writes when "Send to Compressor" runs (see §9).

### Proposed tools

- `compressor_batch_inspect(path)` — parse → structured tree (read).
- `compressor_batch_build(spec)` — JSON spec → `.compressorbatch` (write). Output is golden-file-tested for each shape in the v1.3 corpus.
- `compressor_batch_submit(path)` — `open -b com.apple.CompressorApp <path>` (already on roadmap).
- `compressor_batch_encode(spec)` — build → submit → monitor (replaces `_wait_for_output`).

---

## 3. `.compressorlocation` schema

Same XML-with-custom-root pattern as settings (high confidence — shared serialization layer in CompressorKit). Per Apple's "Create custom save locations" doc, the location encodes:

- Output folder path.
- **Filename format string** with naming tokens. Apple's GUI exposes the token set via the "Add element" pop-up. Each token is an internal opaque code (e.g. `${SourceFileName}`, `${PresetName}`, `${Date}`, `${BatchName}`, `${SequenceNumber}`).
- Conditional post-actions (Apple Devices presets can chain: "Add to Music", "Send via Mail").

**Action:** save 3 GUI-built locations (one with each post-action) → `xmllint --format` → catalog tokens by extracting the literal token strings from the filename-format value. Tokens are likely shared with `-batchname` substitution semantics.

### Proposed tools

- `compressor_locations_inspect(path)` — return parsed structure including tokens used.
- `compressor_location_build({ folder, filenameFormat, postActions })` — JSON → `.compressorlocation`.
- `compressor_location_tokens()` — return the token catalog (folder/preset/date/etc.) so the LLM can compose filename formats correctly without guessing.

---

## 4. Status detection — RANKED BY RELIABILITY

The current `roadmap-compressor.md` ranks file-watching the cluster storage dir as the primary mechanism. **That is wrong.** Ranked correctly:

1. **★ Primary: `Compressor -monitor -format json -batchid <UUID>` (or `-jobid`).** First-class structured output. Fields confirmed from binary: `name`, `submissionTime`, `sentBy`, `timeElapsed`, `timeRemaining`, `timeElapsedSeconds` (int), `timeRemainingSeconds` (int), **`percentComplete` (int)**, `resumePercentComplete`, `status`, `jobid`, `batchid`, `jobType`, `priority`. Use with `-query <seconds>` for poll interval, `-timeout <seconds>` for hard cap, `-once` for one-shot.

2. **★ Submission-side capture.** `compressor_encode` already parses `<jobID …/>` and `<batchID …/>` from stdout. **Switch the CLI invocation to add `-outputformat json`** so submission returns structured JSON, then feed those IDs into `_monitor`. That closes the loop today, no extra tools needed beyond a thin `compressor_status(jobId|batchId)` wrapper.

3. **Cluster-storage file watching.** `~/Library/Application Support/Compressor/Storage/<UUID>/{jobs,shared}/` — the `.qmaster.plist` file is **stale-state debris**, not live progress. (creativecow + Apple-discussions evidence: state in this dir is what gets *abandoned* when batches stall, hence the "delete files older than N days" preference. Polling it is reading other people's exhaust.) Demote to "diagnostic-only — surface stuck batches by mtime drift."

4. **Output-file size stability poll** (`compressor_wait_for_output`). Keep as **fallback only** for cases where we don't have a job/batch ID (e.g., batches submitted via `open -b` from a `.compressorbatch` file without parsing the response). Document as last resort.

5. **AppleScript / UI scripting.** Compressor ships **no AppleScript dictionary** (confirmed in `compressor-cli.md`). Off the table.

### Proposed tools (replace the v1.2 status section)

```ts
compressor_status({ jobId?, batchId?, format: "json" | "xml" = "json", once: boolean = true })
  → parsed status object with percentComplete, timeRemainingSeconds, status enum
compressor_pause({ jobId?, batchId? })
compressor_resume({ jobId?, batchId? })
compressor_kill({ jobId?, batchId? })
compressor_monitor_stream({ jobId?, batchId?, intervalSec: int = 5, timeoutSec: int = 3600 })
  → AsyncIterable<StatusFrame>   // for progress UIs / MCP streaming
compressor_wait_for({ jobId?, batchId?, untilStatus: "completed" | "failed" | "cancelled", timeoutSec })
  → final StatusFrame
```

`compressor_monitor_stream` is the novel one — turns Compressor into a streaming progress source over MCP, which no other tool in this space does.

---

## 5. Codec-availability filter

No introspection flag — `Compressor -h` does not enumerate codecs. But the bundle structure tells the truth:

- `…/Settings/AVCIntra.plist`, `Blu-ray.plist`, `DVD.plist`, `MPEG2.plist` are **codec capability descriptors**. Compressor 5.2 keeps the descriptor files but the **encoder backends** are gone for the removed formats. Files-on-disk lie; runtime is the source of truth.
- The honest signal is **architecture × Compressor version**:
  - Apple Silicon + 5.2: AVC-Intra encode disabled. (Per Apple release notes, confirmed.)
  - Any 5.2: H.264 Blu-ray, H.264 interlaced, Dolby Digital removed.
  - 5.0+ (Apple Silicon): MV-HEVC / Apple Immersive enabled.
- Read the architecture from `uname -m` (`arm64` vs `x86_64`).
- Read Compressor version from `/Applications/Compressor Creator Studio.app/Contents/Info.plist` → `CFBundleShortVersionString`.

### Proposed tool: `compressor_codec_availability()`

Returns `{ available: [...], removed: [{ codec, since: "5.2", reason: "Apple removed Dolby Digital encoder" }], appleSilicon: bool, version: "5.2" }`. Static lookup table keyed by `(version, arch)`. Updated when Apple publishes new release notes.

Then **enhance `compressor_settings_list`** with `availability: "ok" | "codec-removed" | "arch-incompatible"` per setting, so the LLM never picks a preset that will silently fail at encode time.

---

## 6. Watch folders

Apple's built-in watch folder (Compressor 4.6+) has the partial-file bug for sources >~1 min copy time. Confirmed AppleScript polling pattern from MacScripter (verified copy of the script in this turn):

```applescript
on adding folder items to thisFolder after receiving theItems
  repeat with f in theItems
    set Was to 0
    set isNow to 1
    repeat while isNow ≠ Was
      set Was to size of (info for f)
      delay 2
      set isNow to size of (info for f)
    end repeat
  end repeat
end adding folder items to
```

Two-sample equality is the floor — production should require N consecutive equal samples (3+) to defeat slow networks. Lacks timeout in the MacScripter version; we add one.

**Where Compressor stores watch-folder definitions:** not yet located. Hypothesis: `~/Library/Application Support/Compressor/<WatchFolders or similar>` with the same XML-with-custom-root pattern. Action: turn on a watch folder in the GUI and `fs_usage`-trace where Compressor writes. (Untested as of this report.)

### Proposed tool: `compressor_watch_create`

```ts
{
  inputFolder: string,
  settings: string[],            // .compressorsetting paths or display names
  location: string,              // .compressorlocation path
  stableSizeChecks: int = 3,
  stableIntervalSec: int = 2,
  maxStableWaitSec: int = 7200,  // 2 hours hard cap
  postCopyAction?: "delete" | "move" | "leave"  // mitigates Apple's "no cleanup" gap
}
```

**Novel mechanism:** instead of writing a Compressor watch-folder definition file (whose format we don't yet know), implement the watch in-process via `chokidar` + stable-size loop + `compressor_encode` per file. Skips the partial-file bug entirely by never engaging Compressor's own watch folder. Document Apple's native watch folder as "broken — use ours."

---

## 7. Distributed processing — surface from CLI alone

Roadmap defers this to v1.5. The binary disagrees:

```
-sharing on|off
-requiresPassword [password]
-noPassword
-instances <number>
-networkInterface <bsdname> | all
-portRange <startNumber> <count>
-serverCertificate <name> | default
-computergroup <name>
```

Computer groups themselves are configured in **Compressor → Settings → Shared Computers** UI; storage location is inside Compressor's prefs (likely `~/Library/Preferences/com.apple.compressor.plist` or a sibling — needs verification). For our purposes:

- **`compressor_sharing_enable / disable`** — wraps `-sharing on|off`. One-call.
- **`compressor_instances_set(n)`** — wraps `-instances`. Apple Silicon multi-instance encode = real parallelism on one machine, contradicts the roadmap's "Compressor serializes through one queue" assumption.
- **`compressor_groups_list`** — read prefs plist, surface groups.
- **`compressor_encode({ ..., computerGroup })`** — already wired in v1.1. Just needs `_groups_list` to feed it.

**v1.5 is doable in v1.3** with a pure-CLI implementation. The cluster setup remains a one-time GUI step.

---

## 8. `Compressor.framework` — risk vs YAGNI

Lives at `…/PlugIns/Compressor/CompressorKit.bundle/Contents/Frameworks/Compressor.framework`. Apple has not stabilized a public API.

**Recommendation: do not link.** With `-monitor json`, `-info xml`, and `-jobaction xml` all available, every reasonable use case is reachable through the documented (-help) CLI surface. Reverse-engineering Compressor.framework risks:

- Apple removing/renaming it between Compressor versions (already happened — 5.0 added MV-HEVC frameworks, 5.2 removed AVC-Intra paths).
- Mac App Store entitlement validation noise — the binary already prints `Validating Purchase…` on every fresh CLI invocation; a private-framework link would amplify this.
- **Not redistributable.** csos publishes to npm — we cannot ship a wrapper that loads private frameworks via `node-gyp`/`napi` without tripping macOS Hardened Runtime + Gatekeeper on the consumer's machine.

Document as a "do not touch" lane, with a one-paragraph rationale in `docs/reference/compressor-cli.md`.

---

## 9. FCP "Send to Compressor" handoff

Apple docs confirm "Send to Compressor" creates a **new batch with one or more jobs**, but they don't show the wire format. The FCP source (closed) writes a transient batch and hands it to Compressor via inter-app messaging.

**Action plan:**

1. Run "Send to Compressor" from FCP with `fs_usage -f filesys -e Compressor` and `lsof -p <pid>` running. Capture the temp file FCP writes.
2. Hypothesis: it writes a `.compressorbatch` file to a temp dir, then `open -b com.apple.CompressorApp <path>`. If true, FCP's batch shape is the v1.3 ground truth — we don't have to reverse anything from saved-in-Compressor batches; we get FCP's version for free.
3. Alternative hypothesis: it uses a private XPC service (`com.apple.compressor.transcoder.xpc`) and the batch never lives on disk. Detect this if `fs_usage` shows no batch file but `xpc_connection` traffic appears.

The FCPXML side: FCP's v1.14 share schema (read in csos already) has `<media-rep src="...">` references. If "Send to Compressor" writes FCPXML, it's writing the timeline; if it writes `.compressorbatch`, it's already-rendered media references. Likely the latter — the encode happens in Compressor against a flattened intermediate, not against the timeline.

### Proposed tool: `csos_render_and_share(project, presets[])`

The v1.5 "render and share" promise from `roadmap-fcp.md`:

1. Author FCPXML (existing csos FCP writer).
2. Trigger FCP open + render, OR build a `.compressorbatch` directly that points at the project's media-rep paths.
3. Hand off to Compressor via the v1.3 batch-build infrastructure.
4. Stream `compressor_monitor_stream` results back to the LLM.

This is the bridge that makes "FCP → Compressor → deliverables" a single MCP call. Novel.

---

## 10. Live percentage — already there

Re-investigated as requested. **It's already live, via `Compressor -monitor -format json`.** See §4. The roadmap's "out of scope" line should be removed.

---

## 11. ffmpeg fallback policy — `compressor_or_ffmpeg(spec)`

Decision routine:

```
if spec.codec in {"appleProRes422HQ","appleProRes4444","hvc1MV","hvc1DolbyVision"}:
  -> compressor (Apple color pipeline / MV-HEVC / Dolby Vision metadata)
elif spec.codec in {"avc1Bluray","ac3","avcIntra-on-appleSilicon"}:
  -> ffmpeg (Compressor 5.2 dropped these)
elif spec.preset.startsWith("AppleDevices"):
  -> compressor (App Store / iTunes / Apple TV preset compliance)
elif spec.fcpHandoff:
  -> compressor (FCP only knows how to talk to Compressor)
elif spec.fast or spec.preview or spec.testFixture:
  -> ffmpeg (no entitlement dance, faster)
else:
  -> ffmpeg by default; bias to Compressor only when its features matter
```

Returns a `{ tool: "compressor"|"ffmpeg", reason, equivalentCommand }` shape so the LLM can show its work to the user.

---

## Pitfalls

- **`.compressorsetting` is NOT a plist.** `plutil -convert xml1` fails; current `compressor-cli.md` line "macOS `defaults read` or `plutil -p` works on them" is wrong. Use a real XML parser.
- **`encoder-properties` is a base64 binary plist nested inside CDATA inside the XML.** Two-stage decode: base64 → bplist → strings.
- **Codec FourCCs include trailing spaces** (`"aac "`, observed). Comparisons must be space-aware.
- **NameKey is a localization key, not a display string.** Without `Localizable.strings` resolution, `compressor_settings_list` shows technical filenames like `BroadbandHDHEVCNameKey` — exactly today's UX. The fix is mandatory before v1.2 ships.
- **`Localizable.strings` is binary plist.** `cat` shows garbage; use `plutil -p`.
- **Bundle ID stays stock.** Even though the app file is renamed `Compressor Creator Studio.app`, AppleScript and `open -b` MUST use `com.apple.CompressorApp`. (Already enforced by `creator-studio-bundle.md`.)
- **`Validating Purchase…`** prints on the FIRST CLI invocation per session, not every invocation. Mitigation: `compressor_app_open` once at session start (already on roadmap). Don't strip the "Validating Purchase" line from stderr — its absence on second run is the signal that the entitlement is cached.
- **Apple's watch folder submits partial files.** Build our own; document Apple's as broken.
- **Cluster storage state files are debris**, not progress. Use `-monitor`, not `fs.watch`.
- **App Store entitlement noise** — `objc[…]: Class JE… is implemented in both …` is noise from Compressor's bundled JetEngine + System JetEngine (analytics) collision. Keep `stripObjcNoise` regex.
- **Compressor 5.2 removed codecs silently.** Always check codec availability before submitting old `.compressorsetting` files (§5).

---

## Prior art

There is **no meaningful open-source Compressor automation library**. The "compressor" hits on GitHub are unrelated tools (PDF/image compressors, Monte Carlo PDF compressors, Snappy, etc.). The serious community work is on MacScripter (folder actions / droplets) and Larry Jordan's blog (workflow patterns) — all AppleScript-bound and pre-Compressor-4.6.

**This means csos has a clean greenfield.** No upstream library to vendor or compete with. The v1.2 inspect/resolve + v1.3 batch-build + v1.5-now-v1.3 distributed surface is unique tooling.

---

## Frontier — 5 novel things csos can uniquely do

1. **`compressor_monitor_stream` as MCP streaming response.** Live percent-complete frames flowing back to the LLM through MCP's incremental output channel. No other Compressor wrapper exposes this — Apple's own UI is the only consumer of `-monitor`. csos turns it into an LLM-addressable progress signal so `protocol.steam_trailer` can say "encoding 47% — ETA 6 minutes" mid-stream.

2. **Preset capability vector.** `compressor_settings_inspect` builds a structured `{ codec, container, w×h, bitrate, color, audio }` shape across the entire user+system+bundled tree. The LLM can then answer "give me an HEVC 10-bit Rec.2020 1080p preset under 10 Mbps" without the user knowing preset names. **The ai-loadout/Knowledge Core can index this once and serve it across sessions.**

3. **`compressor_or_ffmpeg(spec)` as a routing primitive.** Most pipelines pick one tool and stick with it. csos can route per-deliverable. A `protocol.steam_trailer` runs the master through Compressor (Apple color pipeline) and the social cuts through ffmpeg (faster) — automatically, with decision rationale logged.

4. **In-process watch folder that sidesteps Apple's broken one.** Use `chokidar` + N-sample stable-size + atomic-rename pattern, then call `compressor_encode` per file. **`compressor_watch_create` is a strict superset of Apple's watch folder** (per-file post-action, per-file timeout, per-file recovery). Worth a dedicated landing-page section if creator-studio-os ever gets one.

5. **Cross-app deliverables matrix from one spec.** `csos_deliverables({ source, matrix: { steam_master: {...}, social_short: {...}, podcast_audio: {...} } })` builds one `.compressorbatch` with N jobs, submits, streams progress, and writes results back into the project's `out/` tree with naming tokens that match the project's brand kit. The matrix is declarative; the orchestration is csos. **No other tool in the macOS creative space composes Compressor + ffmpeg + project-aware paths.** This is the "render any deliverable" wing v2.0 promises, deliverable in v1.3.

---

## Sources

- [Apple Compressor — CLI job command syntax](https://support.apple.com/guide/compressor/syntax-cpsr9be73312/mac)
- [Apple Compressor 5.2 release notes (codec removals)](https://support.apple.com/en-us/102745)
- [Apple Compressor — Watch folder settings/properties](https://support.apple.com/guide/compressor/access-watch-folder-settings-and-properties-cpsrbf936832/mac)
- [Apple Compressor — Custom save locations and naming tokens](https://support.apple.com/guide/compressor/work-with-locations-cpsrfd26d9e3/mac)
- [Apple Compressor — Shared Computers settings](https://support.apple.com/guide/compressor/shared-computers-settings-cpsref5dcb19/mac)
- [Apple Compressor — Distributed processing CLI examples](https://compressor.skydocu.com/en/work-smarter/use-distributed-processing/use-the-command-line/example-compressor-commands/)
- [Apple Compressor — Send to Compressor from FCP](https://support.apple.com/guide/final-cut-pro/share-using-compressor-ver1ff89071/mac)
- [Apple Compressor — Apple Devices presets reference](https://support.apple.com/guide/compressor/apple-devices-cpsr45ce0ac5/mac)
- [Apple discussions — cluster storage state debris](https://discussions.apple.com/thread/5889264)
- [MacScripter — watch folder partial-file bug + AppleScript polling](https://www.macscripter.net/t/watch-folder-for-compressor-droplet-problems/45969)
- [Larry Jordan — Compressor watch folder + droplet automation](https://larryjordan.com/articles/automate-apple-compressor-using-droplets-and-watch-folders/)
- [Discrete Cosine — Compressor annotation plist format (reverse-engineered)](https://www.discretecosine.com/compressor_anno/)
- [creativecow — Compressor 4.1 stalled jobs (cluster storage failure modes)](https://creativecow.net/forums/thread/compressor-41-is-stalled-and-wont-delete-an-active/)
- Local Compressor 5.2 bundle (M5 Max): `/Applications/Compressor Creator Studio.app/Contents/MacOS/Compressor -help` and `strings(1)` extraction.
