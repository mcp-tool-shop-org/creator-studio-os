---
title: Creator Studio OS Handbook
description: MCP control plane for Apple Creator Studio apps — Final Cut Pro, Compressor, Motion, Pixelmator Pro, Logic Pro, Keynote, Pages, and Numbers.
sidebar:
  order: 0
---

**Creator Studio OS** is an MCP server that lets Claude drive eight Apple Creator Studio apps from a single control plane — Final Cut Pro, Compressor, Motion, Pixelmator Pro, Logic Pro, Keynote, Pages, and Numbers.

It exposes **153 tools** across those apps and wires them into cross-app composition protocols. The flagship pipeline, `brand-deck-minimal`, takes a `project.json` spec and produces a ProRes MOV in 13 steps: Pixelmator brand cards → Motion lower-thirds → FCPXML → FCP import → Compressor encode.

## v2.0.0 — monorepo on npm

As of v2.0.0, Creator Studio OS ships as **10 published packages** under the [`@creator-studio-os`](https://www.npmjs.com/org/creator-studio-os) npm scope. Install the umbrella CLI for the full surface, or pull in only the apps you need:

```bash
# The full CLI — all 8 apps + the protocol runner
npm install -g @creator-studio-os/creator-studio-os

# Or just the FCP authoring layer
npm install @creator-studio-os/fcp
```

Every package: ≥75% line + branch coverage, MIT licensed, signed npm provenance attestation, macOS-only.

## What's in this handbook

| Section | What you'll find |
|---------|-----------------|
| [Getting Started](./getting-started/) | Install, verify your setup, MCP client config |
| [Usage](./usage/) | Run your first protocol, understand the CLI |
| [Packages](./packages/) | The 10 npm packages — what each one ships |
| [Reference](./reference/) | All 78 tools, grouped by app |
| [Architecture](./architecture/) | How the monorepo is structured, data directory layout |
| [Security](./security/) | Threat model, permissions, what the server does and doesn't touch |
| [Protocols](./protocols/) | Cross-app composition protocols: `brand-deck-minimal` walkthrough |

## Quick orientation

- **macOS only.** AppleScript automation and Compressor's CLI are macOS-native.
- **No network calls.** Everything runs on-device. DTD validation reads the bundled DTD from the FCP app bundle.
- **macOS Automation permission** is required the first time each app is targeted. macOS prompts in System Settings → Privacy & Security → Automation.
- **Data directory** defaults to `$HOME/creator-studio/` (override with `CREATOR_STUDIO_DATA_DIR`). All file writes stay inside it.
- **1173 tests** across the 10-package workspace. Per-package coverage floor: ≥75% line / ≥75% branch.

## Why FCPXML?

Final Cut Pro's AppleScript dictionary is **read-only** — you can list libraries and read metadata, but you can't create timelines via AppleScript. The supported authoring path is **FCPXML import**: write a well-formed FCPXML 1.14 document and hand it to FCP. Creator Studio OS is the bridge: Claude authors timelines as JSON specs, the server builds and validates FCPXML, then triggers the FCP import.
