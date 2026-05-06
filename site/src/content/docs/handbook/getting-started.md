---
title: Getting Started
description: Install Creator Studio OS, verify your setup, and connect it to your MCP client.
sidebar:
  order: 1
---

## Requirements

- **macOS** — AppleScript and Compressor's headless CLI are macOS-only
- **Node.js ≥ 20**
- The Apple apps you want to use (Final Cut Pro, Compressor, Motion, Pixelmator Pro, Logic Pro, Keynote, Pages, or Numbers)

## Install

```bash
npm install -g @mcptoolshop/creator-studio-os
```

Or run without installing via npx:

```bash
npx -y @mcptoolshop/creator-studio-os serve
```

## Verify your setup

```bash
creator-studio-os verify
```

This checks:

- Platform is macOS
- `osascript` is available
- `xmllint` is available (used for FCPXML DTD validation)
- Final Cut Pro is installed
- FCPXML 1.14 DTD is accessible in the FCP app bundle
- Data directory is writable
- FCPXML round-trip through the bundled DTD completes cleanly

If any check fails, the output tells you exactly what's missing and how to fix it.

## MCP client config

Add creator-studio-os to your MCP client (`claude_desktop_config.json` or equivalent):

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

Via npx:

```json
{
  "mcpServers": {
    "creator-studio-os": {
      "command": "npx",
      "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"]
    }
  }
}
```

## macOS Automation permission

The first time the server targets an app via AppleScript, macOS prompts you to grant **Automation permission** in:

> System Settings → Privacy & Security → Automation

This is an OS-level gate — the prompt fires once per app. Read-only AppleScript still requires the grant. After granting, no further prompts appear for that app.

## Data directory

All file output writes to the **data directory** (never to system files or FCP library internals):

- Default: `~/creator-studio/`
- Override: set `CREATOR_STUDIO_DATA_DIR` in your environment

```
creator-studio/
├── projects/
│   └── <name>/
│       ├── project.json     # ProjectV2 spec
│       ├── footage/
│       ├── audio/
│       ├── images/
│       ├── brand/
│       ├── refs/
│       ├── fcp/             # FCPXML output
│       └── out/             # rendered deliverables
└── shared/
    ├── brand/
    └── presets/
```

## Next steps

- [Usage](./usage/) — run your first protocol and explore the CLI
- [Reference](./reference/) — browse all 78 tools
- [Protocols](./protocols/) — deep dive into `brand-deck-minimal`
