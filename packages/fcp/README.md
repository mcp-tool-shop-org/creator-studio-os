<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/fcp

> Final Cut Pro tools for Creator Studio OS — FCPXML 1.14 authoring, DTD validation, FCP import, and AppleScript library inspection

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Part of the [Creator Studio OS](../../README.md) MCP control plane for Apple Creator Studio apps.

---

## Install

```bash
npm install @creator-studio-os/fcp
```

Requires Final Cut Pro (Creator Studio or standalone) and macOS 13+.

## What this package does

Final Cut Pro's AppleScript surface is **read-only** — you can inspect libraries and metadata, but you cannot create timelines via AppleScript. The supported authoring path is FCPXML import.

`@creator-studio-os/fcp` is the bridge: author timelines as JSON specs, build + validate FCPXML 1.14 (or 1.13), write to disk, and trigger FCP import — all in one call.

## Tools (22)

| Tool | Description |
|------|-------------|
| `fcp_project_list` | List projects in the data directory |
| `fcp_project_create` | Create a project directory with standard subdir layout |
| `fcp_project_info` | Read project metadata and resolved paths |
| `fcp_fcpxml_build` | Author a timeline from a JSON spec — clips, titles, transitions, audio |
| `fcp_fcpxml_validate` | Validate FCPXML against the bundled DTD (`xmllint`) |
| `fcp_fcpxml_write` | Write an FCPXML document to a project's `fcp/` directory |
| `fcp_fcpxml_import` | Open an FCPXML file in Final Cut Pro |
| `fcp_fcpxml_build_write_import` | Build, validate, write, and import in one call |
| `fcp_library_list` | List libraries open in Final Cut Pro |
| `fcp_library_events` | List events inside an open library |
| `fcp_event_projects` | List projects inside an event |
| `fcp_project_metadata` | Read sequence metadata (duration, frame rate, timecode format) |
| `fcp_safety_compound` | Check for primary-spine clip overlaps that cause implicit compound clips |
| `fcp_safety_captions` | Lint caption role assignments for FCP's required format |
| `fcp_safety_anchors` | Detect title anchor collisions across lanes |
| `fcp_app_open` | Open Final Cut Pro |
| `fcp_app_activate` | Bring Final Cut Pro to the front |
| `fcp_app_running` | Check whether Final Cut Pro is currently running |
| `fcp_bind_motion_param` | Read published parameters from a Motion template |
| `fcp_effects_catalog` | Walk Motion Templates dirs and return a catalog of all effects |
| `fcp_round_trip_diff` | Compare two FCPXML docs; detect FCP's 12 known round-trip transforms |
| `fcp_round_trip_capture` | Extract FCPXML from inside an FCP library bundle |

## Example

Build and import a timeline in one call:

```json
// Tool: fcp_fcpxml_build_write_import
{
  "projectName": "csos-showcase",
  "spec": {
    "format": { "frameDuration": "1001/30000s", "width": 1920, "height": 1080 },
    "primaryClips": [
      { "asset": "hook.mov", "offset": "0s", "duration": "5s" },
      { "asset": "fcp-demo.mov", "offset": "5s", "duration": "6s" }
    ],
    "titles": [
      { "lane": 1, "offset": "0s", "duration": "3s", "text": "Creator Studio OS" }
    ]
  }
}
```

## FCPXML builder

```typescript
import { buildFCPXML, validateFCPXML } from "@creator-studio-os/fcp";

const xml = buildFCPXML(spec);           // returns FCPXML string
const { valid, output } = validateFCPXML(xml);  // runs xmllint against bundled DTD
```

## macOS requirement

`@creator-studio-os/fcp` is macOS-only (`"os": ["darwin"]`). DTD validation uses `xmllint` from Xcode Command Line Tools. The bundled DTD is `FCPXMLv1_14.dtd` from the Final Cut Pro app bundle.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [FCPXML reference](../../docs/reference/fcpxml.md)
