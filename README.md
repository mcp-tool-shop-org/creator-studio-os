<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="500">
</p>

# creator-studio-os

MCP control plane for Apple Creator Studio apps.

`creator-studio-os` is a Model Context Protocol server that drives **Final Cut Pro** (and, in later versions, Compressor, Logic Pro, Motion, Pixelmator Pro, Keynote, Pages, Numbers) from Claude or any MCP client. It reads from a canonical project directory of footage / audio / images / brand / refs, builds **FCPXML 1.14** documents programmatically, validates them against the DTD bundled with Final Cut Pro, and hands them to FCP for import.

> Status: **v1.6.1 — All 8 Apple Creator Studio apps wired. 7-phase smoke harness + tool-compass discoverability regression.** FCP authoring + Compressor encoding + Pixelmator image ops + Logic / Motion file handoff + Keynote / Pages / Numbers export. macOS only. See [Roadmap](#roadmap).

---

## Why this exists

Final Cut Pro's AppleScript dictionary is **read-only** (you can list libraries / events / projects and read sequence metadata, but you cannot create or modify timelines via AppleScript). The supported authoring path is **FCPXML import**: write a well-formed FCPXML 1.14 document (or 1.13 — both bundled), hand it to FCP, FCP creates the project for you.

`creator-studio-os` is the bridge: it lets Claude author timelines as JSON specs, builds + validates FCPXML, and triggers the import — so the model can compose cuts, drop in footage, and place markers without touching FCP's UI.

## Install

```bash
npm install -g @mcptoolshop/creator-studio-os
```

Then in your MCP client (`claude_desktop_config.json` or equivalent):

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

Or via the published binary directly:

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## Verify your setup

```bash
creator-studio-os verify
```

Checks platform, `osascript`, `xmllint`, Final Cut Pro install, FCPXML 1.14 DTD, data directory, and runs an FCPXML round-trip through the bundled DTD.

A first run also creates the data directory layout if it's missing.

## Data directory

By default: `/Volumes/T9-Shared/AI/creator-studio` (override with `CREATOR_STUDIO_DATA_DIR`).

```
creator-studio/
├── projects/
│   └── <name>/
│       ├── project.json     # name, kind, target deliverable, brand refs, canon refs
│       ├── footage/         # raw video
│       ├── audio/           # stems, voiceover, music
│       ├── images/          # stills, thumbnails, key art
│       ├── brand/           # logos, type, color tokens
│       ├── refs/            # mood, scripts, canon excerpts
│       ├── fcp/             # FCPXML output, .fcpbundle libraries
│       └── out/             # rendered deliverables
└── shared/
    ├── brand/               # studio-wide assets
    └── presets/             # FCP destinations, title templates
```

`project.json` is the contract — every tool that touches a project reads it first.

## Tools

### Final Cut Pro (v1.0.0 + v1.2.0 authoring breadth)

| Tool | Purpose |
|------|---------|
| `fcp_project_list` | List projects in the data directory |
| `fcp_project_create` | Create a project directory + `project.json` |
| `fcp_project_info` | Read project metadata + resolved paths |
| `fcp_fcpxml_build` | Build FCPXML 1.14 from a JSON spec (no I/O) |
| `fcp_fcpxml_validate` | Validate FCPXML against the bundled DTD (uses `xmllint`) |
| `fcp_fcpxml_write` | Write FCPXML to `projects/<name>/fcp/` |
| `fcp_fcpxml_import` | Open an FCPXML file in Final Cut Pro |
| `fcp_fcpxml_build_write_import` | End-to-end: build → validate → write → import |
| `fcp_library_list` | List libraries open in FCP (read-only AppleScript) |
| `fcp_library_events` | List events in a library |
| `fcp_event_projects` | List projects in an event |
| `fcp_project_metadata` | Read sequence duration, frame rate, timecode format |
| `fcp_app_open` | Activate Final Cut Pro |
| `fcp_app_activate` | Bring FCP to the front |
| `fcp_app_running` | Is FCP running |

### Compressor (v1.1.0)

Compressor has no AppleScript dictionary; the surface is the CLI plus `.compressorbatch` files. First CLI invocation after install triggers App Store entitlement validation (the `Validating Purchase...` line), so the recommended startup sequence is `compressor_app_open` once per session, then submit jobs.

| Tool | Purpose |
|------|---------|
| `compressor_app_open` | Launch Compressor (primes entitlement) |
| `compressor_app_running` | Is Compressor running |
| `compressor_settings_list` | Enumerate `.compressorsetting` presets (user + system; pass `includeBundled=true` for Apple's bundled presets) |
| `compressor_locations_list` | Enumerate `.compressorlocation` files |
| `compressor_encode` | Submit a single encode (CLI form: jobpath + settingpath + locationpath) |
| `compressor_encode_project` | Same as `compressor_encode` but resolves source / output relative to a project's directory |

See [`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md) for the verified CLI form and where settings live.

### Pixelmator Pro (v1.3.0)

| Tool | Purpose |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | Lifecycle |
| `pixelmator_open` / `pixelmator_close` | Open / close a document |
| `pixelmator_export` | Export to PNG / JPEG / TIFF / HEIC / GIF / JPEG2000 / BMP / WebP / SVG / PDF |
| `pixelmator_resize` | Resize image (width / height / resolution PPI) |
| `pixelmator_crop` | Crop to bounds rect |
| `pixelmator_rotate` | Rotate 180 / right / left |
| `pixelmator_flip` | Flip horizontal / vertical |
| `pixelmator_batch_export_project_images` | Convert every image in `projects/<name>/images/` to a target format, optionally resizing |
| `pixelmator_batch_export_project_images_dryrun` | Preview the batch plan without launching Pixelmator |

See [`docs/reference/pixelmator-automation.md`](./docs/reference/pixelmator-automation.md).

### Logic Pro (v1.3.0)

Logic has **no AppleScript dictionary**. Surface is intentionally thin: lifecycle + file-open handoff for `.logicx` projects. See [`docs/reference/logic-automation.md`](./docs/reference/logic-automation.md).

| Tool | Purpose |
|------|---------|
| `logic_app_open` / `logic_app_running` | Lifecycle |
| `logic_open` | Open a `.logicx` project (Logic launches and opens it) |

### Motion (v1.4.0)

Motion has **no AppleScript dictionary** (same posture as Logic). Surface is thin: lifecycle + `.motn` open. The real value is "human builds Motion title templates with published parameters; FCPXML authors use of those templates." See [`docs/reference/motion-automation.md`](./docs/reference/motion-automation.md).

| Tool | Purpose |
|------|---------|
| `motion_app_open` / `motion_app_running` | Lifecycle |
| `motion_open` | Open a `.motn` template / project |

### Keynote / Pages / Numbers (v1.4.0)

All three iWork apps share a near-identical AppleScript shape (open / close / export). Document-name extension-stripping quirk applies (same as Pixelmator). See [`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md) for full export-format catalog.

**Keynote (8 tools):** `keynote_app_open`, `keynote_app_running`, `keynote_open`, `keynote_close`, `keynote_export_pdf`, `keynote_export_images` (PNG / JPEG / TIFF), `keynote_export_movie` (QuickTime), `keynote_export_pptx`.

**Pages (5 tools):** `pages_app_open`, `pages_app_running`, `pages_open`, `pages_close`, `pages_export` (PDF / Word / RTF / unformatted text / EPUB).

**Numbers (5 tools):** `numbers_app_open`, `numbers_app_running`, `numbers_open`, `numbers_close`, `numbers_export` (PDF / Excel / CSV).

### Project spec

`v1.2.0` adds title spine items, transitions, per-clip audio levels, video/audio roles, and an explicit library location:

```ts
{
  fcpxmlVersion: "1.14",
  libraryLocation: "/path/to/Library.fcpbundle",   // optional — skips FCP's "import to which library?" dialog
  format: {
    id: "r1",
    name: "FFVideoFormat1080p2997",
    frameRate: "29.97",                 // 23.98 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60
    resolution: { width: 1920, height: 1080 },
    colorSpace: "1-1-1 (Rec. 709)"
  },
  eventName: "Showcase Trailer",
  projectName: "Cut 01",
  assets: [
    {
      id: "a1",
      name: "Establishing — Wide Shot",
      src: "/Volumes/T9-Shared/AI/creator-studio/projects/showcase/footage/establishing-wide.mov",
      durationSeconds: 8.2,
      hasVideo: true,
      hasAudio: true,
      format: "r1"
    }
  ],
  spine: [
    {
      kind: "asset-clip", ref: "a1", name: "Establishing",
      offsetSeconds: 0, durationSeconds: 5,
      volumeDb: -3,                       // optional audio level adjustment
      videoRole: "Video.global",          // optional
      audioRole: "Music.music"            // optional
    },
    {
      kind: "title", name: "Opening", text: "Hello, world",
      offsetSeconds: 0, durationSeconds: 3, lane: 1,
      textStyle: { font: "Helvetica", fontSize: 96, fontColor: "1 1 1 1", alignment: "center", bold: true, italic: false }
    },
    { kind: "transition", name: "Cross Dissolve", offsetSeconds: 5, durationSeconds: 1 }
  ],
  markers: [
    { startSeconds: 2.5, durationSeconds: 1, value: "Beat: contact" }
  ]
}
```

See [`docs/reference/effect-uids.md`](./docs/reference/effect-uids.md) for the title effect UID catalog.

The full Zod schema lives in [`src/fcpxml/types.ts`](./src/fcpxml/types.ts).

## Recommended setup with tool-compass

[tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) is a semantic HNSW gateway that lets an LLM find the right tool from natural-language intent rather than scanning all 78 tools on every call. Recommended for any workflow that spans multiple apps.

**Install:**
```bash
pip install tool-compass           # or: pip install -e venv/
```

**Config** (`compass_config.json`):
```json
{
  "backends": {
    "csos": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/creator-studio-os/dist/cli.js", "serve"]
    }
  },
  "embedding_model": "nomic-embed-text",
  "default_top_k": 3,
  "min_confidence": 0.0
}
```

**First run:**
```bash
tool-compass sync --force          # builds the HNSW index
tool-compass search "render a Motion template headlessly to a video file"
# → motion_render_via_compressor (score 0.82)
```

The smoke harness validates 12 representative queries in Phase 7. Any description change that drops a target out of top-3 with score > 0.4 fails the smoke. See [`docs/reference/tool-descriptions.md`](./docs/reference/tool-descriptions.md) for the description conventions that keep retrieval accurate.

---

## Permissions

The first time the server uses AppleScript against FCP, macOS prompts to grant **Automation permission**: `System Settings → Privacy & Security → Automation → enable Final Cut Pro for the parent process` (your terminal, Claude Desktop, or whatever launched the MCP server). Read-only AppleScript still requires this grant.

## CI / verify

| Check | What |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), threat model in [docs/threat-model.md](./docs/threat-model.md), no secrets, no telemetry, no network |
| **B. Errors** | Structured error shape (`{ code, message, hint }`), CLI exit codes, no raw stacks |
| **C. Docs** | This README, [`CHANGELOG.md`](./CHANGELOG.md), [`LICENSE`](./LICENSE), `--help` accurate |
| **D. Hygiene** | `npm test`, `npm run typecheck`, version matches tag, clean packaging via `.npmignore` |
| **E. UX** | `creator-studio-os verify` covers preflight |

CI runs on `ubuntu-latest` (typecheck, build, unit tests). Integration tests against real FCP run via local `npm run verify` — macOS runners are intentionally not in CI for cost reasons.

## Roadmap

- **v1.1** — Compressor wing — **shipped 2026-05-04**
- **v1.2** — FCP authoring breadth (titles, transitions, audio levels, roles, library location) — **shipped 2026-05-04**
- **v1.3** — Pixelmator Pro AppleScript wing + Logic Pro file handoff — **shipped 2026-05-04**
- **v1.4** — Motion file handoff + Keynote / Pages / Numbers export wings — **shipped 2026-05-04**
- **v1.4** — Motion `.motn` template parameterization, Keynote slide → still export
- **v2.0** — Cross-app composition protocols (e.g. `protocol.devlog`, `protocol.steam_trailer`)

App roadmaps: [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md). Cross-app: [`docs/roadmap.md`](./docs/roadmap.md).

## License

MIT — see [LICENSE](./LICENSE).
