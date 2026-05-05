# 09 — Frontier capabilities

> Speculative slice of the 2026-05-05 deep swarm. Sister docs (01-08) cover per-app fill and cross-app protocols. This doc asks the question those slices don't: **what can csos uniquely do that nobody else has done — across all 8 apps and beyond?**
>
> Director's frame: csos is Mike's *operator's workbench*. He uses it daily — trailer cuts, devlogs, podcasts, scoring loops, asset pipelines. Frontier work has to land on his desk as **leverage**, not infrastructure.

This doc evaluates 15 frontier directions, ranks them, and proposes a v1.6 → v2.0 sequencing. It also names a **pattern catalog** — novel mechanisms csos has invented or is uniquely positioned to invent. OZML byte-perfect mutation (shipped v1.5) is the seed of that catalog; this doc proposes six more.

---

## Summary verdict (read this first)

**Top 5 to pursue, v1.6 → v2.0 sequencing:**

1. **JIT capability discovery + MCP resources** (#1 + #10) — the host's installed effects, themes, presets, settings become live MCP `resource://` URIs. *This is the move that makes csos self-introspective per host. No one else has done it for media apps.*
2. **Operator transcript / ledger + replay** (#8 + #4) — every protocol run captures a deterministic manifest in `.csos/ledger.jsonl`. `csos_replay(snapshot)` rehydrates a run. Doubles as A/B fork source and fine-tuning corpus.
3. **Live progress streams via MCP `notifications/progress`** (#3) — long-running encodes and renders surface progress through the spec-blessed `progressToken` mechanism. Required for honest UX on Compressor + future Send-to-Compressor chains.
4. **`runApp(app, op, params)` unified runner** (#7) — abstract the transport zoo (osascript / `open -b` / Compressor CLI / `shortcuts run` / OZML / FCPXML import). Built-in: error mapping, perf instrumentation, transcript, dry-run, **auto-batching** of consecutive osascript calls (≈400ms startup cost is the killer).
5. **Determinism harness** (#5) — per-app round-trip framework, not per-app tests. Author → app → re-export → diff. Catches Apple's silent transformations (compound multiplication, OZML drift, role serialization, FCPXML version downgrades) systematically rather than by craft.

**Top 3 speculative-but-maybe-magical (v1.7-v2.1, post-protocols):**

6. **Reverse-pipeline: `csos_reverse_engineer(videoPath)`** (#13) — finished video → reusable `project.json`. SpeechAnalyzer (macOS 26 Tahoe) for dialogue, FFmpeg scene-detect for cuts, color sampling for grade. Templated trailers from references.
7. **Cross-app codec / format compatibility matrix** (#6) — auto-generated programmatically. Knowing what FCP silently does to Apple ProRes 4444 XQ → ProRes 422 HQ on import is operator-level magic.
8. **Apple Intelligence / SpeechAnalyzer / Image Playground hooks** (#15) — macOS 26's SpeechAnalyzer beats Whisper by 55%, runs on-device, and is callable from Shortcuts. Image Playground has a developer API. csos can wrap both and expose them as MCP tools without bundling models.

**Cut (low leverage, high cost, or wrong frame):**

- **#2 Behavior-tree / DSL intent compiler** — solved by MCP itself. Tools *are* the DSL surface; protocols are the macros. Re-inventing here is normie mode.
- **#9 Private-framework spelunking** — read-only research is fine, but not a feature. Mike's note covers it. Park as a doc, not a tool.
- **#11 Multi-machine farm via Compressor cluster** — real, but constrained: Mike's M5 Max + 5080 PC is heterogeneous (Compressor is macOS-only). Cluster coordination is its own product. Defer to v3.0 when there's a second Mac in the pipeline.
- **#12 Marketplace registry** — premature; ship a few protocols first, see if community appears. Open the door (publish convention) without building the building.
- **#14 Director's notebook** — *subsumed* by #8 ledger; don't ship it as a separate thing.

---

## Pattern catalog — novel mechanisms csos has invented or owns

The seed entry is **OZML byte-perfect mutation** (v1.5): targeted attribute-regex over a documented-but-fragile XML format, never a round-trip parser, file delta = exact digit-count difference. This is a *pattern*, not a one-off — it generalizes.

Six more patterns this doc proposes csos will own:

1. **JIT host introspection** (§1) — the MCP server's resource manifest is *built from the host's disk* on first run, not from package metadata. The schema is yours; the data is the host's.
2. **Append-only operator ledger as replay source AND training corpus** (§8 + §4) — every tool call written to JSONL with input hashes, output hashes, durations. Replayable on the same host (deterministic) AND a high-quality dataset for a smaller model fine-tuned on Mike's actual workflow.
3. **MCP-native progress for app-bound long-runners** (§3) — Compressor encodes, Send-to-Compressor chains, batch Pixelmator ops. Progress tokens flow through the *MCP* notification channel rather than custom log polling. Spec-aligned, not bolted-on.
4. **Compound-osascript auto-batching** (§7) — multiple consecutive AppleScript calls collapse into one `osascript -e ...` invocation. The 400ms startup tax becomes a one-time cost across a protocol run instead of per-tool. (Reichenbach hand-bundles compound ops; csos can do it automatically at the runner layer.)
5. **Determinism harness as a framework, not a test** (§5) — `csos_determinism_check(app, fixture)` is itself an MCP tool. Anyone running csos can verify their host's apps still round-trip. Catches Apple's release-time silent breakage.
6. **Reverse-pipeline templating** (§13) — the only public artifact in this space (`Beat2Cut`, `Scene Detector`) does cuts. csos extracts cuts + dialogue + color + deliverable and returns a *re-runnable* `project.json`. The output is operator-grade, not metadata-grade.

---

## Per-direction evaluation

### 1. JIT capability discovery as MCP resources

**The move:** on first run, csos scans the host for installed assets and exposes them as live MCP resources:

| Resource URI | Source on disk | Cache TTL |
|---|---|---|
| `resource://csos/effects/fcp` | FCP's bundled `Effects.localized/` + `~/Movies/Motion Templates.localized/Effects.localized/` + `/Library/Application Support/ProApps/Effects/` | 24h |
| `resource://csos/titles/fcp` | `Build In:Out.localized/Custom.localized/Custom.moti` and siblings | 24h |
| `resource://csos/transitions/fcp` | bundled + user transitions dirs | 24h |
| `resource://csos/settings/compressor` | user + system + bundled `.compressorsetting` | 1h |
| `resource://csos/locations/compressor` | `.compressorlocation` files | 1h |
| `resource://csos/themes/keynote` | Keynote's bundled themes via sdef enum | 24h |
| `resource://csos/shortcuts/pixelmator` | `shortcuts list` filtered to Pixelmator actions | 24h |
| `resource://csos/templates/motion` | `~/Movies/Motion Templates.localized/` enumerated | 24h |
| `resource://csos/projects` | `$CREATOR_STUDIO_DATA_DIR/projects/` | live |

**Feasibility: high.** Compressor settings discovery already exists (v1.1). Effect enumeration is filesystem walking + light XML parse for `.moti` headers. Themes via `keynote_app_open` + sdef `themes` collection. Shortcut enum via `shortcuts list`.

**Novelty: very high.** None of the competing FCP MCP servers do this. They ship hardcoded UID lists or punt to "the user knows what they want." JIT discovery means **csos's tool surface fits the host** rather than the README's screenshot of someone else's host.

**Spec sketch:**

```ts
// src/discovery/scan.ts
export interface DiscoveryEntry {
  kind: "effect" | "title" | "transition" | "setting" | "theme" | "template" | "shortcut";
  app: "fcp" | "compressor" | "keynote" | "pixelmator" | "motion";
  name: string;          // human-readable
  uid?: string;          // FCP effectUid, Motion factory id, etc.
  path: string;          // disk path
  sha256: string;        // for cache invalidation
  metadata: Record<string, unknown>; // version, parameter list, etc.
}

// src/mcp/resources.ts — exposed via MCP resources/list
server.setResourceHandler({
  list: async () => {
    const cache = await loadDiscoveryCache(config.dataDir);
    return cache.entries.map(toResourceDescriptor);
  },
  read: async (uri) => readResourceFromCache(uri),
});
```

**Cache invalidation:** sha256 of the source dir's mtime tree. Refresh on `csos_rescan` MCP tool (manual) and on resource read if cache > TTL. `notifications/resources/list_changed` fires when the catalog mutates.

**Pairs with:** §3 (notifications), §5 (determinism — the catalog itself is a determinism input).

**Risk:** plug-in scan time. FCP's effects tree on a heavy host is hundreds of `.motn` / `.moef` bundles. Mitigation: lazy reads — `list` returns lightweight descriptors; `read(uri)` parses on demand.

---

### 2. AI-assisted operator intent DSL — **CUT**

**The move:** `intent.cut_trailer(beats, score, footage)` compiles to per-app tool sequences. Behavior-tree thinking borrowed from robotics / game AI.

**Why cut:** MCP itself is the DSL. The "intent" layer above tools is *protocols* (already on the v2.0 roadmap). The "intent" layer above protocols is the LLM. Inserting another DSL between LLM and MCP is what normie tooling does to feel sophisticated.

The interesting paper here ([Gandhi 2023](https://arxiv.org/pdf/2306.03460), [IJCAI 2024 BTGen](https://www.ijcai.org/proceedings/2024/0755.pdf)) is about robotics behavior trees, not media pipelines. Don't import it.

**Recovery if Mike disagrees:** the DSL Mike actually wants is `project.json` — declarative, structured, hand-editable. Make `project.json` richer (beats, motif refs, reframe targets) before building a parallel intent system.

---

### 3. Live progress streams via MCP notifications

**The move:** csos uses MCP's spec-blessed `notifications/progress` for long-runners. Compressor encode, Send-to-Compressor chain, batch Pixelmator export, future render farm.

**Spec reference:** [MCP Progress utility](https://modelcontextprotocol.io/specification/draft/basic/utilities/progress). Caller passes `_meta.progressToken` in the request; server emits `notifications/progress` updates with `progress` (numeric), `total` (optional), and `message` (human-readable string). Spec is final draft as of 2026; widely supported in Claude Code and Cursor.

**Feasibility: high.** Compressor exposes batch progress via `~/Library/Application Support/Compressor/Storage/<UUID>/{jobs,shared}/` (per the 2026-05-04 swarm). Network Encoding Monitor saves XML logs; same data is in the storage tree. Poll every 1s, emit progress notification. AppleScript `tell application "Compressor"` exposes batch state via `progress` properties on `current batch` for some versions.

**Spec sketch:**

```ts
// in compressor_encode tool
const progressToken = request.params._meta?.progressToken;
const batchUuid = await submitBatch(jobPath, settingPath, locationPath);

if (progressToken) {
  const interval = setInterval(async () => {
    const state = await readClusterStorageState(batchUuid);
    server.notify("notifications/progress", {
      progressToken,
      progress: state.percentComplete,
      total: 100,
      message: `Encoding: ${state.currentJob} (${state.fps} fps)`,
    });
    if (state.terminal) clearInterval(interval);
  }, 1000);
}
```

**Novelty: medium.** The mechanism is spec-standard. The novelty is *applying it to media-app long-runners* — which no other media MCP server does. dreliq9/fcp-mcp claims live control but is UI-scripting; Compressor MCPs don't exist; Logic MCPs are keystroke-driven (no progress to surface).

**Pairs with:** §1 (resources), §4 (replay — progress events become replay timestamps).

---

### 4. Snapshot + replay

**The move:** every protocol run captures a manifest:

```jsonc
{
  "snapshotId": "01J...ulid",
  "protocol": "steam_trailer",
  "host": { "machine": "mac-m5max", "os": "macOS 26.1", "csos": "1.6.0" },
  "input": { "projectJsonHash": "sha256:...", "footageHashes": {...} },
  "calls": [
    { "tool": "fcp_fcpxml_build", "argsHash": "sha256:...", "outputHash": "sha256:...", "durationMs": 142 },
    { "tool": "compressor_encode_project", "argsHash": "sha256:...", "outputHash": "sha256:...", "durationMs": 184231 }
  ],
  "outputs": [{ "path": "out/trailer-v3.mp4", "sha256": "...", "bytes": 28_341_002 }]
}
```

`csos_replay(snapshotId)` rehydrates: re-builds the FCPXML, re-runs Compressor with the same setting, diffs outputs by hash.

**Feasibility: high.** Pure plumbing — the runner already has every input/output that needs to be hashed. Storage in `$DATA_DIR/snapshots/<ulid>.json`.

**Determinism honesty:** Compressor encodes are not bit-identical across runs (timestamps in container metadata). Replay should hash the *frame-decoded* output, not the container — `ffmpeg -f md5 -` per stream. FCPXML *is* deterministic if we make builder output stable (which we already do).

**Use cases:**
- A/B trailer variants (`csos_replay snapshot-A --override 'beats[3].cue=dread.peak'`)
- Regression after FCP / Compressor / macOS updates (re-run yesterday's snapshot, confirm output matches)
- Training data export (filter snapshots → JSONL → fine-tune)

**Novelty: very high.** No media tool ships replayable runs. AVID and Resolve have project versioning; that's not the same. The closest cousin is Bazel's remote cache — and that's the right reference: *content-addressed, hash-verified, replayable build outputs.*

**Spec sketch:** `src/snapshot/{capture,replay}.ts`. Capture is a runner middleware (wrap every tool call, hash before/after). Replay is a tool that takes a snapshot id, walks `calls[]`, and re-issues each. Diff at the end.

**Pairs with:** §8 (ledger is the unstructured stream; snapshot is the structured slice).

---

### 5. Determinism harness

**The move:** per-app round-trip framework, not per-app tests. `csos_determinism_check(app, fixture?)` runs:

| App | Round-trip |
|---|---|
| FCP | Build FCPXML → import to FCP → re-export → diff |
| Compressor | Encode preset X → re-decode → frame hash matches expected |
| Motion | OZML mutate → re-inspect → confirm parameter set |
| Pixelmator | Export PNG → re-open → re-export → bytes match |
| Keynote | Author slide → export PDF → re-open → text matches |

**Why this is a frontier capability and not just "more tests":**

- Apple ships silent transformations on every release (Compressor 5.2 removed codecs silently per the 2026-05-04 swarm; FCP loses Magnetic Mask on round-trip; Numbers Excel export drops formulas).
- A determinism *harness* is something an operator runs *on their host, today*, to know whether their workflow still works after `softwareupdate -i -a`.
- This is the operator equivalent of `verify` — but for behavior, not just installation.

**Feasibility: medium-high.** FCP round-trip exists in `verify` already (xmllint DTD validation). Extending to behavior round-trip is bounded: requires UI-scripted re-export from FCP for the FCP case (one allowed exception, gated behind opt-in). Compressor and Motion round-trip is fully scriptable.

**Novelty: high.** No media tool does this. Filmmaker forums catch silent regressions weeks late. csos can detect them before the operator's first failed render.

**Spec sketch:** `src/determinism/{fcp,compressor,motion,pixelmator,keynote}.ts` — each exports `roundTrip(fixture): Promise<RoundTripReport>`. Top-level tool dispatches.

**Pairs with:** §1 (catalog of installed effects becomes a determinism input — "did Cross Dissolve survive the macOS update?"), §4 (snapshots are the inputs to round-trip checks).

---

### 6. Cross-app codec / format compatibility matrix

**The move:** programmatically build a matrix:

```
Source (codec, container, color, fps, bit-depth)
  → FCP import: stored as (codec', container', color', fps', bit-depth')
    → Compressor "Send to Compressor" handoff: (codec'', container'', ...)
      → Compressor preset X output: (codec''', ...)
        → arrives at Steam delivery: H.264 4:2:0 8-bit 30fps
```

Auto-generated by encoding a known reference at every entry point and probing with `ffprobe -show_streams -show_format`.

**Feasibility: medium.** The reference fixture is small (a 1s clip per codec). The probe loop is bounded. The *interesting* output is the matrix itself: which fields are preserved, which are silently transformed, where information is lost.

**Novelty: high.** This is operator-knowledge-as-data. Forum posts have it; nobody's compiled it. No media MCP server even attempts.

**Spec sketch:** `src/compat/matrix.ts` — driven by `tests/fixtures/codec-references/`. Output: `out/compat-matrix-<host>-<date>.md` (and a JSON sibling). Cron-able weekly.

**Cut potential:** this is high-leverage only if it ships *and* is published as a public artifact. If it stays internal, it's just a one-time investigation. Recommend publishing as a generated page in the csos handbook (Astro Starlight).

**Pairs with:** §5 (the matrix is a determinism corpus).

---

### 7. Unified `runApp(app, op, params)` runner

**The move:** csos has six transports today (osascript, `open -b`, Compressor CLI, FCPXML import via `open`, OZML regex, AppleScript `do shell script`). Unify under one runner with:

- **Error mapping** — every transport's failure modes get surfaced as `CreatorStudioError { code, message, hint }`.
- **Performance instrumentation** — durationMs per call, recorded to ledger.
- **Transcript logging** — every call appended to `.csos/transcript.jsonl` (which is also the §8 ledger).
- **Dry-run** — return the script that *would* be executed without executing it.
- **Auto-batching of consecutive osascript calls** — the 400ms startup is the killer for any iWork compound op. Detect adjacent osascript calls in the runner and merge them into one `osascript -e` invocation.

**Feasibility: high.** This is a refactor, not new capability. The current ad-hoc helpers (`runAppleScript`, `runCompressor`) become call-sites of `runApp`.

**Auto-batching is the magic.** Reichenbach's `iwork_mcp` ships hand-coded compound ops (`numbers_create_sheet_with_table`) for exactly this reason. csos can do it *generically* by recognizing a sequence of `numbers_*` AppleScript calls in a single tool-call burst and merging the scripts at the runner layer. This is a **compiler optimization** for MCP tool sequences.

**Novelty: medium-high.** The unified runner is conventional plumbing. The *batching* is novel — no MCP server I've found does cross-tool script fusion.

**Spec sketch:**

```ts
// src/runner/runApp.ts
export async function runApp<T>(opts: {
  app: AppId;
  transport: "osascript" | "open" | "cli" | "ozml" | "shortcut";
  script?: string;       // for osascript / shortcut
  args?: string[];       // for cli
  parser?: (raw: string) => T;
  dryRun?: boolean;
}): Promise<RunResult<T>>;

// src/runner/batcher.ts
export class OsaScriptBatcher {
  // Buffers consecutive osascript calls within N ms,
  // merges into one invocation, splits the result
}
```

**Pairs with:** §3 (progress notifications flow through the runner), §4 (snapshot middleware lives at the runner layer), §8 (ledger).

---

### 8. Operator transcript / ledger

**The move:** every csos action writes one JSONL line to `projects/<name>/.csos/ledger.jsonl`:

```jsonc
{"ts":"2026-05-05T12:34:56Z","tool":"compressor_encode","args":{...},"outputHash":"sha256:...","durationMs":184231,"snapshotId":"01J..."}
```

The ledger is the **append-only stream** of operator actions. The §4 snapshot is a *structured slice* of it.

**Three uses:**
1. **Replay source** (§4 snapshots are filtered ledger ranges).
2. **Audit trail** — what did Mike actually do on this trailer? When did the cue map change? `csos_ledger_query --project trailer-v3 --since 2026-05-04`.
3. **Training data** — six months of ledger × outputs is a high-quality fine-tuning corpus for a smaller model (Hermes-3 8B?) trained on Mike's actual workflow. Eventually: a *Mike-shaped* assistant inside csos that pre-suggests the next tool call based on the partial trajectory.

**Feasibility: very high.** Ledger is a JSONL append. Implementation is one runner middleware (per §7).

**Novelty: high.** Local-first append-only operator log is rare in media tooling (DAWs have undo histories; nobody serializes them as JSONL for export). The *training corpus* angle is novel: it's the natural follow-on to the rig-bridge / role-os pattern of "your tools generate your training data."

**Spec sketch:** `src/ledger/append.ts` (one writer), `src/ledger/query.ts` (filter / paginate), `src/ledger/export.ts` (JSONL → fine-tune-ready prompts).

**Pairs with:** §4 (snapshot), §7 (runner is the writer).

---

### 9. Apple Pro Apps SDK / private-framework spelunking — **PARK AS DOC**

**The move:** survey what private API surface lives in:
- `Compressor.framework`
- `Interchange.framework`
- FCP's frameworks (`/Applications/Final Cut Pro Creator Studio.app/Contents/Frameworks/`)
- Motion's frameworks
- Logic's `mobilelogic` frameworks

**Why park:** csos is hard-constrained to public-API-only (per CLAUDE.md threat model). Calling private API ships a binary that breaks on the next macOS minor and triggers Gatekeeper / hardened runtime issues.

**But:** *knowing what's there* informs the ceiling. If `Interchange.framework` exposes a public-but-undocumented Mach service, we can target the documented IPC. If FCP's `/Applications/Final Cut Pro Creator Studio.app/Contents/Frameworks/Pasteboard.framework` (hypothetical) handles role serialization, we can mimic the format.

**Recommendation:** ship as `docs/research/private-frameworks-survey.md` — class-dump output, header inspection notes, no binary. Update on every FCP/Motion/Compressor major.

**Tools for the survey:**
- `class-dump` (works on x86_64 frameworks; Apple Silicon needs `class-dump-fork`)
- `nm -gU framework.framework/framework | c++filt`
- `otool -L app.app/Contents/MacOS/app` for linkage
- `dyld_info -dependents` for resolved frameworks

**Cut from feature scope.** Keep as research artifact.

---

### 10. MCP-native UX innovation (resources + prompts + sampling) — **PURSUE**

This is the unification of §1 (resources), §3 (notifications), and the unexplored MCP primitives.

**Resources (§1 covered):** live host catalog.

**Prompts:** csos exposes parameterized prompt templates clients can invoke.

```
prompt://csos/cut-trailer  → fills with project context, footage manifest, cue map
prompt://csos/devlog       → fills with last week's commits, scene-mapper updates, asset deltas
prompt://csos/podcast      → fills with chapter markers, transcript timecodes, sponsor reads
```

The prompt template is *the LLM's instruction*; csos doesn't run the LLM. But because csos owns project state, it can fill the prompt with high-fidelity context *the LLM couldn't reconstruct from the user's chat alone*.

**Sampling (the dark horse):** MCP supports `sampling/createMessage` — a server-initiated request for the *client's* LLM to generate. csos could use this for:
- "Given this trailer's beats and footage manifest, suggest 5 alternate motif-pack-friendly cue mappings" (server asks client, returns suggestions to user via MCP tool).
- "Given Logic's ProjectInformation plist tempo + key, suggest 3 production directions" (sampling, not local inference).

This is **the LLM as a sub-tool inside csos**. Not a separate model, not a fine-tune — the user's existing client LLM, called via spec-blessed MCP sampling.

**Notifications (§3 covered):** progress, list_changed, resource_updated.

**Feasibility: high for resources/prompts, medium for sampling** (sampling client support is uneven — Claude Code yes, Cursor partial, others spotty per [PulseMCP capability gap](https://www.pulsemcp.com/posts/mcp-client-capabilities-gap)).

**Novelty: very high.** Most MCP servers ship tools-only. The csos surface as resources + prompts + tools + notifications + sampling is a much fuller use of the protocol. This is the move that says csos is a *real* MCP server, not a CLI in trench coat.

**Spec sketch:** `src/mcp/{resources,prompts,sampling}.ts` — each exposes a registry. Update v1.0 server init to declare full capability set.

---

### 11. Multi-machine farm via Compressor cluster — **DEFER (v3.0+)**

**The move:** Mike's M5 Max + a hypothetical second Mac form a Compressor cluster. csos manages cluster state, dispatches batches, tracks progress across nodes.

**Feasibility: medium, with constraints.**
- Compressor clusters are macOS-only (per [Apple Qmaster docs](https://help.apple.com/qmaster/mac/4.0/en/appleqmaster/usermanual/chapter_1_section_1.html)). The 5080 PC is not a cluster node.
- "This Computer Plus" model needs Compressor installed on every node.
- Shared storage works on Xsan or any SMB volume — T9 itself is an SMB share between Mac and 5080, so the storage half is solved.
- Cluster controller orchestrates; csos becomes a cluster-controller wrapper.

**Novelty: medium.** The cluster mechanism is Apple's. csos's contribution is *managing it from MCP* — no MCP server does this — and exposing cluster state as a `resource://csos/cluster` URI.

**Why defer:** Mike's pipeline today is 1 Mac + 1 PC. The cluster value lights up at 2+ Macs. The M5 Max alone encodes faster than most operators ever need.

**Recommendation:** ship a *single-node* `compressor_encode` with progress (§3). Add cluster-controller integration in v3.0 if a second Mac enters the pipeline.

---

### 12. Marketplace / community sharing — **OPEN DOOR ONLY**

**The move:** `npm install @csos-community/<pack>` — protocol packs, brand-card templates, OZML mutations, beat-detection presets.

**Feasibility: very high** (it's npm).

**Novelty: low.** Everyone does this.

**Recommendation:** ship the *publishing convention* (a `csos-pack` package shape: `package.json` keyword `csos-pack`, `protocol/` dir, `manifest.json` schema) as a doc in the csos handbook. Don't build a registry. Don't build a discovery UI. Just publish the convention so anyone can ship a pack and any csos can `import` it. **Open the door, don't build the building.**

---

### 13. Reverse-pipeline: `csos_reverse_engineer(videoPath)` — **PURSUE (post-protocols)**

**The move:** finished video in, reusable `project.json` template out.

```
input:  /path/to/reference-trailer.mp4
output: projects/inferred-trailer/project.json   (beats, cuts, motif structure, color, deliverable)
        projects/inferred-trailer/notes.md       (what was inferred, what was guessed)
```

**Components:**
- **Cut detection** — `ffmpeg -filter:v "select='gt(scene,0.4)',showinfo"` produces frame-accurate cut points. Output: spine timing.
- **Dialogue** — macOS 26 Tahoe's [SpeechAnalyzer / SpeechTranscriber](https://daringfireball.net/linked/2025/06/19/apples-new-foundation-model-speech-apis-outpace-whisper-for-transcription) (55% faster than Whisper, on-device). Output: dialogue track + timestamps.
- **Motif structure** — beat detection (`librosa` via Python sidecar, or `aubio` CLI) on the audio bed. Output: cue map sketch.
- **Color grade** — sample frames at cut points, compute LUT via `ffmpeg -filter_complex curves=...` regression. Output: color profile reference.
- **Deliverable spec** — `ffprobe -show_streams -show_format` on the source. Output: codec / container / fps / bit-depth / color space.

**Feasibility: high.** Every component has open-source primitives. The novelty is *composing them into a `project.json`*.

**Novelty: high.** [Beat2Cut](https://beat2cut.com/) does cuts. [Scene Detector](http://www.scene-detector.com/) does cuts. Nobody composes cuts + dialogue + motif + grade + deliverable into a re-runnable project spec.

**Spec sketch:** `src/reverse/{cuts,dialogue,motif,grade,deliverable}.ts`. Top-level tool: `csos_reverse_engineer(videoPath, options)`. Sidecar Python for librosa is acceptable (hard constraint says no network; doesn't say no local deps).

**Pairs with:** Mike's reference-driven workflow. He watches a trailer, says "do that for the showcase deliverable," csos extracts the structure, fills with operator footage + Motif cues.

---

### 14. Director's notebook — **SUBSUMED BY §8**

The notebook (`csos_notebook(project)` reads back human-readable session log) is a *view* over the §8 ledger. Don't ship it as a separate feature — ship it as a `csos_ledger_query --format notebook` flag.

The interesting bit *is* the prose generation. csos can use MCP §10 sampling to ask the client LLM to render ledger entries as prose: "Cut v3 trailer — 02:14 changed scene 4 motif from `dread.tense` to `dread.peak`, re-rendered key art at 2x scale." This is sampling-as-formatter, which is a clean use of the primitive.

**Recommendation:** roll into §8 + §10. Don't list as a separate v1.x.

---

### 15. Apple Intelligence / on-device ML hooks — **PURSUE**

**The move:** wrap Apple's on-device ML services as csos tools without bundling models.

| Apple service | macOS version | csos tool |
|---|---|---|
| **SpeechAnalyzer / SpeechTranscriber** (transcribe) | 26+ (Tahoe) | `csos_transcribe(audioPath)` |
| **Image Playground API** (generate image) | 15.2+ Sequoia | `csos_image_playground(prompt, style)` |
| **Writing Tools** (summarize, proofread) | 15+ | `csos_summarize(text)` |
| **Pixelmator ML actions via Shortcuts** | (any) | already prototyped (§ swarm 2026-05-04) |

**Implementation paths:**
- SpeechAnalyzer: Swift CLI sidecar `csos-speech` shipping `SpeechAnalyzer.framework` calls. ~200 lines Swift. Or a Shortcut bridge: `shortcuts run "Transcribe Audio" --input-path foo.wav --output-path foo.txt`.
- Image Playground: [developer API](https://developer.apple.com/documentation/imageplayground) is `ImageCreator` — Swift sidecar.
- Writing Tools: Shortcuts bridge.
- Pixelmator ML: `pixelmator_run_shortcut` (already roadmapped).

**Feasibility: medium.** Swift sidecars add a build step, but there's no other way to reach SpeechAnalyzer from Node. Bundle as `.app` helpers in `dist/helpers/`.

**Novelty: very high.** No media MCP server wraps Apple Intelligence. Doing so positions csos at the intersection of (a) media app automation and (b) on-device ML — both of which are in Apple's strategic spotlight.

**Frame check:** does this match Mike's mission? **Yes.** SpeechAnalyzer for transcribing voice notes / footage sound. Image Playground for marketing graphics (already on the make-image lane). Writing Tools to summarize ledger entries (§14). All of these slot into the studio.

**Pairs with:** §13 (transcription is the dialogue input), §10 (Image Playground integrates with the Sampling pattern — server can ask client LLM to *prompt* Image Playground based on context).

---

## Sequencing — v1.6 → v2.0

| Version | Slice | Includes |
|---|---|---|
| **v1.6** | Foundation: runner + ledger + resources | §7 unified runner, §8 ledger (writer + JSONL), §1 JIT discovery (resources side), MCP capability declaration update (§10 partial) |
| **v1.7** | Observability: progress + replay | §3 progress notifications (Compressor first), §4 snapshot capture/replay, §5 determinism harness (FCP + Motion first) |
| **v1.8** | Apple Intelligence integration | §15 — SpeechAnalyzer sidecar, Image Playground, Writing Tools shortcut bridges |
| **v1.9** | Determinism breadth + auto-batching | §5 covers all 8 apps, §7 osascript auto-batching at runner |
| **v2.0** | Cross-app protocols (existing roadmap) + reverse pipeline | Existing v2.0 protocol pack + §13 `csos_reverse_engineer` |
| **v2.1+** | Compatibility matrix, sampling-driven UX, prompt templates | §6 codec matrix, §10 sampling, §10 prompt registry |
| **v3.0** | Cluster / farm | §11 if a second Mac enters the pipeline |

---

## What this looks like to Mike (workbench framing)

Mike opens his client (Claude Code), names a project, and:

1. csos's resource list shows him **his host's** effects, themes, settings — not a generic catalog.
2. He runs a protocol (`steam_trailer`); progress streams in real-time as Compressor encodes.
3. Every action lands in `.csos/ledger.jsonl`. He can ask "what did I do yesterday on a project?" and get a notebook view.
4. After macOS 26.2 lands, he runs `csos_determinism_check` — finds out FCP silently changed Cross Dissolve UID — fixes once.
5. He points csos at a reference trailer; csos hands back a `project.json` template with cuts, dialogue, beats, color, deliverable. He swaps the footage manifest, re-runs.
6. SpeechAnalyzer transcribes his voice memo. Image Playground generates the title card prompt. Writing Tools summarizes his ledger into a devlog post.
7. A protocol pack from `@csos-community/derek-lieu-trailer-style` ships a beats + cue + reframe profile he can apply to any project.
8. A failed run replays from snapshot to confirm the failure was Apple's fault, not his.

That's the workbench. Each line above is one of §1-§15. **Each one is novel** in the media MCP space.

---

## Sources

- [MCP Progress utility](https://modelcontextprotocol.io/specification/draft/basic/utilities/progress) — progress_token, notifications/progress
- [MCP list_changed discussion #76](https://github.com/orgs/modelcontextprotocol/discussions/76) — dynamic catalog updates
- [PulseMCP client capability gap](https://www.pulsemcp.com/posts/mcp-client-capabilities-gap) — which clients support which MCP primitives
- [Apple Qmaster Distributed Processing](https://help.apple.com/qmaster/mac/4.0/en/appleqmaster/usermanual/chapter_1_section_1.html) — Compressor cluster mechanism
- [General Information About Clusters](https://help.apple.com/compressor/mac/4.0/en/compressor/usermanual/chapter_29_section_7.html)
- [Apple Image Playground API](https://developer.apple.com/documentation/imageplayground) — developer-callable on-device image gen
- [SpeechAnalyzer on Daring Fireball](https://daringfireball.net/linked/2025/06/19/apples-new-foundation-model-speech-apis-outpace-whisper-for-transcription) — 55% faster than Whisper
- [Apple Intelligence developer page](https://developer.apple.com/apple-intelligence/) — on-device ML primitives surface
- [Pixelmator Pro Shortcuts actions](https://www.pixelmator.com/tutorials/automation-magic-with-shortcuts-and-pixelmator-pro/) — 28 actions including ML lane
- [otio-fcpx-xml-lite-adapter](https://pypi.org/project/otio-fcpx-xml-lite-adapter/) — reverse FCPXML reading prior art
- [Beat2Cut](https://beat2cut.com/), [Scene Detector](http://www.scene-detector.com/) — closest reverse-pipeline prior art (cut-only)
- [Editly](https://github.com/mifi/editly) — declarative video DSL prior art (CLI shape, not MCP)
- [Speakeasy: Dynamic tool discovery in MCP](https://www.speakeasy.com/mcp/tool-design/dynamic-tool-discovery)
- [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)
- [FxFactory: Bringing Native Plug-Ins to FCP](https://fxfactory.com/developer/bringing-native-plugins-to-finalcutpro/) — plugin path reference for §1

Last reviewed: 2026-05-05.
