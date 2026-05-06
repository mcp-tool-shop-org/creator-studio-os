<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCP control plane for Apple Creator Studio apps. Drive **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages**, and **Numbers** from Claude or any MCP client — compose video deliverables from a JSON spec, render Motion lower-thirds headlessly, encode via Compressor, and generate brand assets in one cross-app pipeline.

> **v1.7.10** — 78 tools across all 8 Apple Creator Studio apps. Cross-app composite protocol live: Pixelmator brand cards + Motion ProRes 4444 lower-thirds + Compressor final encode. 9/9 smoke phases green. macOS only.

---

## Why this exists

Final Cut Pro's AppleScript dictionary is **read-only** — you can list libraries and read metadata, but you cannot create timelines via AppleScript. The supported authoring path is **FCPXML import**: write a well-formed FCPXML 1.14 document, hand it to FCP, and FCP creates the project.

`creator-studio-os` is the bridge: Claude authors timelines as JSON specs, the server builds + validates FCPXML, triggers the FCP import, renders Motion lower-third templates headlessly via Compressor, and orchestrates Pixelmator Pro for brand assets — all in a single cross-app pipeline.

## Security

`creator-studio-os` runs entirely on-device. It:

- Spawns `osascript` targeting apps by bundle ID (never by file name)
- Writes only inside `CREATOR_STUDIO_DATA_DIR` — no system files, no FCP library internals
- Makes **no network calls** — no telemetry, no analytics, no remote validation
- Persists **no credentials, tokens, or user data**
- Escapes all user-provided strings before AppleScript interpolation (`escapeAppleScriptString`)

Full threat model: [`docs/threat-model.md`](./docs/threat-model.md) · [`SECURITY.md`](./SECURITY.md)

## Install

```bash
npm install -g @mcptoolshop/creator-studio-os
```

MCP client config (`claude_desktop_config.json` or equivalent):

```json
{
  "mcpServers": {
    "creator-studio-os": {
      "command": "creator-studio-os",
      "args": ["serve"]
    }
  }
}
```

Or via npx:

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## Verify your setup

```bash
creator-studio-os verify
```

Checks platform, `osascript`, `xmllint`, Final Cut Pro install, FCPXML 1.14 DTD, data directory, and runs an FCPXML round-trip through the bundled DTD.

## Data directory

Default: `/Volumes/T9-Shared/AI/creator-studio` (override with `CREATOR_STUDIO_DATA_DIR`).

```
creator-studio/
├── projects/
│   └── <name>/
│       ├── project.json     # ProjectV2 spec (scenes, deliverables, brand, scoreMap)
│       ├── footage/         # raw video
│       ├── audio/           # stems, voiceover, music
│       ├── images/          # stills, thumbnails, key art
│       ├── brand/           # logos, type, color tokens
│       ├── refs/            # mood, scripts, canon excerpts
│       ├── fcp/             # FCPXML output
│       └── out/             # rendered deliverables
└── shared/
    ├── brand/               # studio-wide assets
    └── presets/             # Compressor settings
```

## Cross-app protocol: `brand-deck-minimal`

The flagship pipeline — 13 steps from a `project.json` spec to a ProRes MOV:

```bash
creator-studio-os protocol run brand-deck-minimal --project demo/csos-showcase/project.json
```

```
1  validate-project       — assert ProjectV2 schema + scene count
2  compose-brand-cards    — Pixelmator Pro: hue-rotated identity cards per scene
3  render-scene-clips     — Motion: clone template → patch title/subhead → Compressor ProRes 4444 render
4  edit-motion-title      — set project-level Motion template title
5  resolve-fcp-params     — compute timeline geometry
6  build-fcpxml           — write FCPXML 1.14 to out/fcp/
7  safety-preflight       — assert brand card files exist
8  dtd-validate           — xmllint against bundled FCP DTD
9  fcp-import             — open .fcpxml in Final Cut Pro
10 compressor-encode      — ffmpeg overlay (brand card + ProRes 4444 alpha clip) → Compressor final encode
11 monitor-encode         — poll encode until done
12 verify-output          — assert MOV exists and has bytes
13 write-replay-manifest  — finalise manifest with completedAt
```

The `project.json` format: [`src/projects/types.ts`](./src/projects/types.ts) · demo: [`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## Tools

### Final Cut Pro (22 tools)

| Tool | Purpose |
|------|---------|
| `fcp_project_list` | List projects in the data directory |
| `fcp_project_create` | Create a project directory + `project.json` |
| `fcp_project_info` | Read project metadata + resolved paths |
| `fcp_fcpxml_build` | Build FCPXML 1.14 from a JSON spec |
| `fcp_fcpxml_validate` | Validate FCPXML against the bundled DTD |
| `fcp_fcpxml_write` | Write FCPXML to `projects/<name>/fcp/` |
| `fcp_fcpxml_import` | Open an FCPXML file in Final Cut Pro |
| `fcp_fcpxml_build_write_import` | End-to-end: build → validate → write → import |
| `fcp_library_list` | List libraries open in FCP |
| `fcp_library_events` | List events in a library |
| `fcp_event_projects` | List projects in an event |
| `fcp_project_metadata` | Read sequence duration, frame rate, timecode format |
| `fcp_app_open` / `fcp_app_running` / `fcp_app_activate` | Lifecycle |
| `fcp_round_trip_diff` | Compare two FCPXML files, emit structured diff |
| `fcp_fcpxml_add_title` | Add a Titles effect clip to a spine |
| `fcp_fcpxml_add_transition` | Add a transition between clips |
| `fcp_fcpxml_add_marker` | Add a chapter/to-do/completion marker |
| `fcp_safety_preflight` | Check all FCPXML source files exist before import |
| `fcp_multicam_build` | Build a multicam clip from angle specs |
| `fcp_caption_build` | Build a caption track from a transcript |
| `fcp_compound_clip_build` | Build a compound clip from nested spine specs |

### Compressor (15 tools)

Compressor has no AppleScript dictionary — surface is the CLI plus `.compressorbatch` files. First invocation per session triggers App Store entitlement validation (expected).

| Tool | Purpose |
|------|---------|
| `compressor_app_open` / `compressor_app_running` | Lifecycle |
| `compressor_settings_list` | Enumerate `.compressorsetting` presets |
| `compressor_locations_list` | Enumerate `.compressorlocation` files |
| `compressor_encode` | Submit a single encode job |
| `compressor_encode_project` | Encode relative to a project's directory |
| `compressor_monitor_stream` | Stream encode progress frames |
| `compressor_job_status` | Poll a single job's status |
| `compressor_batch_status` | Poll all active batch jobs |
| `compressor_cancel_job` | Cancel an active job |
| `compressor_settings_inspect` | Inspect a `.compressorsetting` file |
| `compressor_batch_build` | Build a `.compressorbatch` XML document |
| `compressor_await_output` | Block until an output file is non-empty |
| `compressor_daemon_recover` | Recover a stuck Compressor daemon |

See [`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md).

### Motion (10 tools)

| Tool | Purpose |
|------|---------|
| `motion_app_open` / `motion_app_running` | Lifecycle |
| `motion_open` | Open a `.motn` template |
| `motion_template_clone` | Clone a `.motn` template to a new path |
| `motion_template_set_param` | Set a published parameter value (OZML edit) |
| `motion_template_get_params` | List all published parameters in a template |
| `motion_template_validate` | Validate OZML structure of a `.motn` file |
| `motion_template_publish_catalog` | List all templates in Motion's publish catalog |
| `motion_publish_to_fcp` | Publish a Motion template to FCP's Title browser |
| `motion_render_via_compressor` | Headlessly render a `.motn` to video via Compressor |

Note: `motion_template_set_param` and `motion_render_via_compressor` have zero prior art in any MCP globally — headless Motion OZML mutation and render are uniquely enabled by csos.

### Pixelmator Pro (33 tools)

| Tool | Purpose |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | Lifecycle |
| `pixelmator_open` / `pixelmator_close` | Open / close documents |
| `pixelmator_export` | Export to PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG |
| `pixelmator_resize` / `pixelmator_crop` / `pixelmator_rotate` / `pixelmator_flip` | Transform |
| `pixelmator_batch_export_project_images` | Batch convert `projects/<name>/images/` |
| `pixelmator_layer_list` / `pixelmator_layer_create` / `pixelmator_layer_delete` | Layer management |
| `pixelmator_layer_set_text` / `pixelmator_layer_set_fill` / `pixelmator_layer_move` | Layer editing |
| `pixelmator_effects_apply` / `pixelmator_effects_catalog` | ML effects pipeline |
| `pixelmator_compose_brand_card` | Compose a hue-rotated brand card with title text |
| `pixelmator_hdr_export` | Export with HDR tone mapping |
| `pixelmator_text_card` | Render a text-only card with font + color control |

### Logic Pro (3 tools)

Logic has no AppleScript dictionary. Surface: lifecycle + file-open handoff for `.logicx` projects.

| Tool | Purpose |
|------|---------|
| `logic_app_open` / `logic_app_running` | Lifecycle |
| `logic_open` | Open a `.logicx` project |

### Keynote / Pages / Numbers (18 tools combined)

All three share a near-identical AppleScript shape. Full export-format catalog: [`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md).

**Keynote (8 tools):** open, close, export PDF / images / movie / PPTX, lifecycle  
**Pages (5 tools):** open, close, export PDF / Word / RTF / EPUB, lifecycle  
**Numbers (5 tools):** open, close, export PDF / Excel / CSV, lifecycle

### Infrastructure

| Tool | Purpose |
|------|---------|
| `csos_app_status` | Health check for all 8 apps (running, version, queue depth) |
| `csos_protocol_run` | Run a cross-app protocol end-to-end (async, streams steps) |
| `csos_protocol_list` | List all registered protocols |
| `csos_protocol_describe` | Describe a protocol's steps and purpose |

## Recommended setup with tool-compass

[tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) is a semantic HNSW gateway that finds the right tool from natural-language intent — essential when 78 tools span 8 apps.

```bash
pip install tool-compass
```

The smoke harness validates 12 representative queries in Phase 7. Any description change that drops a target out of top-3 with score > 0.4 fails the smoke.

## Permissions

The first time the server uses AppleScript against an app, macOS prompts to grant **Automation permission** in System Settings → Privacy & Security → Automation. Read-only AppleScript still requires this grant.

## CI / verify

| Check | What |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), [`docs/threat-model.md`](./docs/threat-model.md), no secrets, no telemetry, no network |
| **B. Errors** | `CreatorStudioError { code, message, hint }`, CLI exit codes, no raw stacks |
| **C. Docs** | This README, [`CHANGELOG.md`](./CHANGELOG.md), [`LICENSE`](./LICENSE), `--help` accurate |
| **D. Hygiene** | `npm test`, `npm run typecheck`, version matches tag, `npm audit`, clean packaging |

CI runs on `ubuntu-latest` (typecheck + build + unit tests + audit). Integration tests against real apps run via `npm run smoke:ci` — macOS runners are intentionally not in CI (cost: macOS ≈ 10× Linux per minute).

## Roadmap

- **v1.7.x** — cross-app composite protocol (`brand-deck-minimal`): Pixelmator brand cards + Motion lower-thirds + Compressor encode → ProRes MOV — **live at v1.7.10**
- **v1.8.x** — `patchSiblingText` text-bounds validation: ledger warning when incoming text may clip fixed Motion template render bounds
- **v2.0** — Phase 3: expanded protocol surface (Steam trailer, devlog, social card pipelines)

App roadmaps: [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md), [`docs/roadmap.md`](./docs/roadmap.md).

## License

MIT — see [LICENSE](./LICENSE).

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
