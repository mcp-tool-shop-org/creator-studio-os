<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <a href="https://www.npmjs.com/org/creator-studio-os"><img src="https://img.shields.io/badge/npm-%40creator--studio--os-CB3837.svg" alt="npm scope"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCP control plane for Apple Creator Studio apps. Drive **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages**, and **Numbers** from Claude or any MCP client — compose video deliverables from a JSON spec, render Motion lower-thirds headlessly, encode via Compressor, and generate brand assets in one cross-app pipeline.

> **v2.0.1** — 153 tools across all 8 Apple Creator Studio apps, distributed as **10 published npm packages** under [`@creator-studio-os`](https://www.npmjs.com/org/creator-studio-os). 1173 tests, ≥75% line + branch coverage on every package, signed npm provenance attestations. macOS only.

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

## Install — full CLI

The umbrella package ships the `creator-studio-os` binary with `serve`, `verify`, `smoke`, and `protocol run` subcommands across all 153 tools:

```bash
npm install -g @creator-studio-os/creator-studio-os
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
{ "command": "npx", "args": ["-y", "@creator-studio-os/creator-studio-os", "serve"] }
```

## Install — single app

If you only need one app's tools (for example, embedding FCPXML authoring in another tool), pull in just that package:

```bash
npm install @creator-studio-os/fcp           # Final Cut Pro (22 tools)
npm install @creator-studio-os/motion        # Motion (10 tools)
npm install @creator-studio-os/pixelmator    # Pixelmator Pro (33 tools)
npm install @creator-studio-os/compressor    # Compressor (15 tools)
npm install @creator-studio-os/keynote       # Keynote (56 tools)
npm install @creator-studio-os/logic         # Logic Pro (3 tools)
npm install @creator-studio-os/iwork-docs    # Pages + Numbers (10 tools)
npm install @creator-studio-os/protocols     # Cross-app pipelines (3 tools)
```

All 10 packages are published under the [`@creator-studio-os`](https://www.npmjs.com/org/creator-studio-os) npm scope with signed provenance attestations. See the [Packages handbook page](https://mcp-tool-shop-org.github.io/creator-studio-os/handbook/packages/) for the dependency graph + per-package specifics.

## Verify your setup

```bash
creator-studio-os verify
```

Checks platform, `osascript`, `xmllint`, Final Cut Pro install, FCPXML 1.14 DTD, data directory, and runs an FCPXML round-trip through the bundled DTD.

## Data directory

Default: `~/creator-studio/` (override with `CREATOR_STUDIO_DATA_DIR`).

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

The `project.json` schema lives in [`@creator-studio-os/core`](https://www.npmjs.com/package/@creator-studio-os/core). Demo: [`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## Tools (153 across 8 apps)

The full reference is in the [handbook](https://mcp-tool-shop-org.github.io/creator-studio-os/handbook/reference/) and on each package's npm page.

### Final Cut Pro — 22 tools — [`@creator-studio-os/fcp`](https://www.npmjs.com/package/@creator-studio-os/fcp)

FCPXML 1.14 authoring, DTD validation via `xmllint`, library/event introspection, round-trip diff, multicam / caption / compound-clip builders. FCP's AppleScript dictionary is read-only — all authoring goes through FCPXML import.

### Compressor — 15 tools — [`@creator-studio-os/compressor`](https://www.npmjs.com/package/@creator-studio-os/compressor)

Headless encode via the Compressor CLI, live progress via `-monitor -format json`, batch builder, daemon recovery. Compressor has no AppleScript dictionary — surface is the CLI plus `.compressorbatch` files. First invocation per session triggers App Store entitlement validation (expected). See [`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md).

### Motion — 10 tools — [`@creator-studio-os/motion`](https://www.npmjs.com/package/@creator-studio-os/motion)

Clone `.motn` templates, patch published parameters via OZML edit (`editText` for glyph-inside-text layout, `patchSiblingText` for Apple Compositions sibling layout), render headlessly via Compressor.

> `motion_template_set_param` and `motion_render_via_compressor` have **zero prior art in any MCP globally** — headless Motion OZML mutation and render are uniquely enabled by csos.

### Pixelmator Pro — 33 tools — [`@creator-studio-os/pixelmator`](https://www.npmjs.com/package/@creator-studio-os/pixelmator)

Full Pixelmator Pro sdef coverage: layers (create / delete / move / text / fill), ML effects (catalog + apply), brand card composition with hue rotation, blend modes, HDR export, document I/O.

### Keynote — 56 tools — [`@creator-studio-os/keynote`](https://www.npmjs.com/package/@creator-studio-os/keynote)

The largest single-app surface in the family. Slide composition, theme binding, markdown ingestion, storyboard → FCPXML bridge, ML ops, multi-format export (PDF / images / movie / PPTX).

### Logic Pro — 3 tools — [`@creator-studio-os/logic`](https://www.npmjs.com/package/@creator-studio-os/logic)

Logic has no AppleScript dictionary. Surface: lifecycle + file-open handoff for `.logicx` projects.

### Pages + Numbers — 10 tools — [`@creator-studio-os/iwork-docs`](https://www.npmjs.com/package/@creator-studio-os/iwork-docs)

Document automation, table I/O, multi-format export. **Pages (5):** open / close / export PDF / Word / EPUB. **Numbers (5):** open / close / export PDF / Excel / CSV.

### Protocols — 3 tools — [`@creator-studio-os/protocols`](https://www.npmjs.com/package/@creator-studio-os/protocols)

Cross-app orchestration. `csos_protocol_run` (run a pipeline), `csos_protocol_list`, `csos_protocol_describe`. Reference protocols: `brand-deck-minimal`, `steam-trailer-minimal`.

### Infrastructure — 1 tool — [`@creator-studio-os/core`](https://www.npmjs.com/package/@creator-studio-os/core)

`csos_app_status` — health check for all 8 apps (running, version, queue depth). The rest of `core` is shared runtime — AppleScript runners, project schema, ledger, structured errors.

## Recommended setup with tool-compass

[tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) is a semantic HNSW gateway that finds the right tool from natural-language intent — essential when 153 tools span 8 apps.

```bash
pip install tool-compass
```

The smoke harness validates 12 representative queries in Phase 7. Any description change that drops a target out of top-3 with score > 0.4 fails the smoke.

## Permissions

The first time the server uses AppleScript against an app, macOS prompts to grant **Automation permission** in System Settings → Privacy & Security → Automation. Read-only AppleScript still requires this grant.

## Quality bar

| Gate | What |
|------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), [`docs/threat-model.md`](./docs/threat-model.md), no secrets, no telemetry, no network |
| **B. Errors** | `CreatorStudioError { code, message, hint }`, CLI exit codes, no raw stacks |
| **C. Docs** | This README, [`CHANGELOG.md`](./CHANGELOG.md), [`LICENSE`](./LICENSE), `--help` accurate, [handbook](https://mcp-tool-shop-org.github.io/creator-studio-os/) deployed |
| **D. Hygiene** | `npm test` (1173 tests), `npm run typecheck`, `npm audit`, version matches tag, clean packaging |
| **E. Coverage** | **≥75% line + ≥75% branch on every publishable package.** Codecov enforces via per-package flags. |

CI runs on `ubuntu-latest` (typecheck + build + unit tests + audit + per-package coverage upload). Integration tests against real apps run via `npm run smoke:ci` — macOS runners are intentionally not in CI (cost: macOS ≈ 10× Linux per minute).

## Roadmap

- **v2.0** — **shipped 2026-05-06.** Monorepo decomposition into 10 npm packages, 153 tools, 1173 tests, per-package coverage floor, signed provenance.
- **v2.x** — Phase 3 surface: Steam trailer protocol, devlog protocol, social card pipelines, deeper Logic + Numbers automation.
- **v1.8.x** (still in flight as a backport) — `patchSiblingText` text-bounds validation: ledger warning when incoming text may clip fixed Motion template render bounds.

App roadmaps: [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md), [`docs/phase-3.md`](./docs/phase-3.md), [`docs/roadmap.md`](./docs/roadmap.md).

## License

MIT — see [LICENSE](./LICENSE).

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
