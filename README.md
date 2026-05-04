# creator-studio-os

MCP control plane for Apple Creator Studio apps.

`creator-studio-os` is a Model Context Protocol server that drives **Final Cut Pro** (and, in later versions, Compressor, Logic Pro, Motion, Pixelmator Pro, Keynote, Pages, Numbers) from Claude or any MCP client. It reads from a canonical project directory of footage / audio / images / brand / refs, builds **FCPXML 1.14** documents programmatically, validates them against the DTD bundled with Final Cut Pro, and hands them to FCP for import.

> Status: **v1.0.0 — FCP authoring (write via FCPXML, read via AppleScript).** macOS only. See [Roadmap](#roadmap) for the plan beyond v1.0.

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

## Tools (v1.0.0)

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

### Project spec

```ts
{
  fcpxmlVersion: "1.14",
  format: {
    id: "r1",
    name: "FFVideoFormat1080p2997",
    frameRate: "29.97",                 // 23.98 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60
    resolution: { width: 1920, height: 1080 },
    colorSpace: "1-1-1 (Rec. 709)"
  },
  eventName: "Grounded Trailer",
  projectName: "Cut 01",
  assets: [
    {
      id: "a1",
      name: "Establishing — Freeport",
      src: "/Volumes/T9-Shared/AI/creator-studio/projects/grounded-trailer/footage/freeport-wide.mov",
      durationSeconds: 8.2,
      hasVideo: true,
      hasAudio: true,
      format: "r1"
    }
  ],
  spine: [
    { kind: "asset-clip", ref: "a1", name: "Establishing", offsetSeconds: 0, durationSeconds: 5 }
  ],
  markers: [
    { startSeconds: 2.5, durationSeconds: 1, value: "Beat: contact" }
  ]
}
```

The full Zod schema lives in [`src/fcpxml/types.ts`](./src/fcpxml/types.ts).

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

- **v1.1** — Compressor (`compressor_*`) tools, title spine items, transitions, audio levels
- **v1.2** — Logic Pro project authoring (Scripter + project XML), Pixelmator Pro batch ops
- **v1.3** — Motion `.motn` template parameterization, Keynote slide → still export
- **v2.0** — Cross-app composition protocols (e.g. `protocol.devlog`, `protocol.steam_trailer`)

See [`docs/roadmap.md`](./docs/roadmap.md) for detail.

## License

MIT — see [LICENSE](./LICENSE).
