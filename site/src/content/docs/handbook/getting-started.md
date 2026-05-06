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

## Install — full CLI

The umbrella package ships the `creator-studio-os` binary, MCP server, verify command, smoke harness, and the entire 78-tool surface across all 10 packages:

```bash
npm install -g @creator-studio-os/creator-studio-os
```

Or run without installing via npx:

```bash
npx -y @creator-studio-os/creator-studio-os serve
```

## Install — single app

If you only need one app's tools (for example, you're embedding FCPXML authoring inside another tool), pull in only that package:

```bash
npm install @creator-studio-os/fcp           # Final Cut Pro
npm install @creator-studio-os/motion        # Motion
npm install @creator-studio-os/pixelmator    # Pixelmator Pro
npm install @creator-studio-os/compressor    # Compressor
npm install @creator-studio-os/keynote       # Keynote
npm install @creator-studio-os/logic         # Logic Pro
npm install @creator-studio-os/iwork-docs    # Pages + Numbers
npm install @creator-studio-os/protocols     # Cross-app pipelines
```

All 10 packages are published under the [`@creator-studio-os`](https://www.npmjs.com/org/creator-studio-os) npm scope with signed provenance attestations.

See [Packages](./packages/) for the full list with tool counts.

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
      "args": ["-y", "@creator-studio-os/creator-studio-os", "serve"]
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
- [Packages](./packages/) — browse the 10 npm packages
- [Reference](./reference/) — browse all 78 tools
- [Protocols](./protocols/) — deep dive into `brand-deck-minimal`
