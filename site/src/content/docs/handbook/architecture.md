---
title: Architecture
description: How Creator Studio OS is structured — npm workspace layout, app layers, FCPXML authoring, and the cross-app composite chain.
sidebar:
  order: 5
---

## Overview

Creator Studio OS is a Node.js MCP server distributed as a 10-package npm workspace. The umbrella CLI receives tool calls from your MCP client (Claude, or any MCP-compatible client), dispatches them to the appropriate per-app package, and returns structured results.

```
MCP Client (Claude)
    │
    ▼
@creator-studio-os/creator-studio-os         (umbrella CLI)
    │
    ├── @creator-studio-os/protocols         (cross-app pipelines)
    │   └── depends on all 8 leaves below
    │
    ├── @creator-studio-os/fcp               (FCPXML authoring + library introspection)
    ├── @creator-studio-os/compressor        (headless encode)
    ├── @creator-studio-os/motion            (OZML edit + render)
    ├── @creator-studio-os/pixelmator        (full sdef automation)
    ├── @creator-studio-os/keynote           (slide composition)
    ├── @creator-studio-os/logic             (project lifecycle)
    ├── @creator-studio-os/iwork-docs        (Pages + Numbers shared)
    │
    └── @creator-studio-os/core              (shared runtime — base of dependency tree)
```

## Workspace layout

```
creator-studio-os/
├── apps/
│   └── creator-studio-os/         # umbrella CLI package
├── packages/
│   ├── core/                      # shared runtime — AppleScript, schema, errors, ledger
│   ├── compressor/                # Compressor CLI + monitor
│   ├── fcp/                       # FCPXML 1.14 builder + DTD validator
│   ├── iwork-docs/                # Pages + Numbers shared automation
│   ├── keynote/                   # Keynote osascript surface
│   ├── logic/                     # Logic Pro lifecycle
│   ├── motion/                    # Motion OZML mutation + render
│   ├── pixelmator/                # Pixelmator Pro full sdef
│   └── protocols/                 # cross-app pipelines
├── docs/                          # roadmaps, reference, threat model
├── site/                          # this handbook (Astro Starlight)
└── tests/                         # cross-package integration + smoke
```

Each `packages/<name>/` is an independently-versioned, independently-published npm package with its own `src/`, `tests/`, `tsconfig.json`, and `package.json`. The root `package.json` is private (`"private": true`) and exists only to hold the workspace declaration.

## App layers

Each `packages/<app>/src/` follows a consistent shape:

- **`tools.ts`** — MCP tool registration entry points (the surface area that ships)
- **`app.ts`** — process lifecycle helpers (open / running / activate)
- **`recovery.ts`** — daemon recovery hooks
- Per-feature modules — for example `packages/motion/src/textEdit.ts` (OZML), `packages/pixelmator/src/brandCard.ts` (composition)

Per-app specifics:

- **FCP** — FCPXML authoring + DTD validation + osascript for library/event inspection
- **Compressor** — CLI wrapper (`Compressor -batchFilePath`) + batch XML builder + poll/monitor
- **Motion** — OZML file mutation (patchSiblingText, editText) + Compressor render dispatch
- **Pixelmator Pro** — osascript automation for layer editing, export, brand card composition
- **Logic Pro** — lifecycle + file-open handoff (no AppleScript dictionary)
- **Keynote / Pages / Numbers** — osascript export automation

## FCPXML authoring

FCP's AppleScript dictionary is **read-only**. Timeline authoring uses FCPXML import:

1. Claude provides a JSON timeline spec
2. `fcp_fcpxml_build` constructs FCPXML 1.14 (assets, clips, titles, transitions, markers)
3. `fcp_fcpxml_validate` checks against the bundled DTD via `xmllint`
4. `fcp_fcpxml_import` hands the file to FCP via `open` + osascript

The bundled DTD lives inside the FCP app bundle at a known path. No network fetch needed.

## Motion OZML mutation

Motion `.motn` files are OZML (XML). Published parameters are accessible as `<parameter>` elements with sibling `<object value="CP">` nodes. Two edit strategies:

- **`editText`** — for glyph-inside-text layout (the parameter's text content directly)
- **`patchSiblingText`** — for Apple Compositions sibling layout (patches the sibling text node adjacent to the parameter)

`motion_render_via_compressor` dispatches a headless render job to Compressor after patching the template.

## Cross-app composite chain

The `brand-deck-minimal` protocol chains five apps:

```
Pixelmator Pro → brand card PNGs (hue-rotated per scene)
Motion + Compressor → ProRes 4444 lower-third clips (OZML patch → render)
ffmpeg → overlay composite (brand card bg + ProRes 4444 alpha)
Compressor → final ProRes MOV encode
Final Cut Pro → FCPXML import (full timeline)
```

The moov-atom readiness poll (`ffprobe` ×10, 500ms interval) ensures Compressor's output file is fully flushed before the composite step reads it. Compressor signals "completed" before the QuickTime moov atom is written to disk.

## Data directory schema

```
$CREATOR_STUDIO_DATA_DIR/           # default: ~/creator-studio/
├── projects/
│   └── <name>/
│       ├── project.json            # ProjectV2 spec
│       ├── footage/                # raw video
│       ├── audio/                  # stems, voiceover, music
│       ├── images/                 # stills, thumbnails, key art
│       ├── brand/                  # logos, type, color tokens
│       ├── refs/                   # mood, scripts, canon excerpts
│       ├── fcp/                    # FCPXML output
│       └── out/                    # rendered deliverables
└── shared/
    ├── brand/                      # studio-wide assets
    └── presets/                    # Compressor settings
```

`@creator-studio-os/core` enforces the schema and resolves all paths from a project name. The data directory is the only filesystem region the runtime ever writes to.

## Error shape

All errors use `CreatorStudioError { code, message, hint, cause?, retryable? }`. Error codes are an exhaustive union exported from `@creator-studio-os/core`. No raw stack traces are ever returned to the MCP client.

## Security design

- Apps are always referenced by **bundle ID** (never file name) in osascript and `open`
- All user-provided strings go through `escapeAppleScriptString` before osascript interpolation
- All FCPXML attribute strings go through `escapeXmlAttr`
- No network calls in the runtime
- All file writes stay inside `CREATOR_STUDIO_DATA_DIR`

Full threat model: [Security](./security/)
