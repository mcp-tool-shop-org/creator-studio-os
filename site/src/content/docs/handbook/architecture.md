---
title: Architecture
description: How Creator Studio OS is structured — tool layers, data directory, FCPXML authoring, and the cross-app composite chain.
sidebar:
  order: 4
---

## Overview

Creator Studio OS is a Node.js MCP server. It receives tool calls from your MCP client (Claude, or any MCP-compatible client), dispatches them to the appropriate app-layer module, and returns structured results.

```
MCP Client (Claude)
    │
    ▼
creator-studio-os MCP server
    ├── src/tools/         # 78 MCP tool definitions
    ├── src/apps/          # Per-app modules (fcp, compressor, motion, ...)
    ├── src/fcpxml/        # FCPXML 1.14 builder + validator
    ├── src/protocols/     # Cross-app protocol runners
    ├── src/projects/      # project.json schema + resolver
    └── src/errors.ts      # Structured error shape
```

## App layers

Each app has its own module in `src/apps/`:

- **FCP** — FCPXML authoring + DTD validation + osascript for library/event inspection
- **Compressor** — CLI wrapper (`Compressor -batchFilePath`) + batch XML builder + poll/monitor
- **Motion** — OZML file mutation (patchSiblingText, editText) + Compressor render dispatch
- **Pixelmator Pro** — osascript automation for layer editing, export, brand card composition
- **Logic Pro** — lifecycle + file-open handoff (no AppleScript dictionary)
- **Keynote / Pages / Numbers** — osascript export automation

## FCPXML authoring

FCP's AppleScript dictionary is read-only. Timeline authoring uses FCPXML import:

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

`src/projects/resolve.ts` enforces the schema and resolves all paths from a project name.

## Error shape

All errors use `CreatorStudioError { code, message, hint, cause?, retryable? }`. Error codes are an exhaustive union in `src/errors.ts`. No raw stack traces are ever returned to the MCP client.

## Security design

- Apps are always referenced by **bundle ID** (never file name) in osascript and `open`
- All user-provided strings go through `escapeAppleScriptString` before osascript interpolation
- All FCPXML attribute strings go through `escapeXmlAttr`
- No network calls in the runtime
- All file writes stay inside `CREATOR_STUDIO_DATA_DIR`

Full threat model: [Security](./security/)
