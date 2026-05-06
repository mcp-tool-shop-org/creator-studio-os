---
title: Usage
description: Run your first protocol, explore the CLI, and understand how to use Creator Studio OS tools from Claude.
sidebar:
  order: 2
---

## CLI commands

```bash
creator-studio-os serve        # Start the MCP server (used by your MCP client)
creator-studio-os verify       # Check your setup
creator-studio-os protocol run <name> --project <path>
creator-studio-os protocol list
creator-studio-os protocol describe <name>
creator-studio-os --help
```

## Running a protocol

The flagship pipeline is `brand-deck-minimal` — a 13-step cross-app protocol that takes a `project.json` spec and produces a ProRes MOV:

```bash
creator-studio-os protocol run brand-deck-minimal \
  --project demo/csos-showcase/project.json
```

Output streams step-by-step:

```
✓  1/13  validate-project
✓  2/13  compose-brand-cards
✓  3/13  render-scene-clips
...
✓ 13/13  write-replay-manifest
```

See [Protocols](./protocols/) for the full `brand-deck-minimal` walkthrough.

## Using tools from Claude

With the MCP server running, Claude can call any of the 78 tools directly. Examples:

**Build and import an FCPXML timeline:**
```
Build an FCPXML timeline for my project at creator-studio/projects/my-project/project.json
and import it into Final Cut Pro.
```

**Check app health:**
```
Run csos_app_status to see which apps are open.
```

**Render a Motion template:**
```
Clone the Atmospheric lower-third template to /tmp/my-lower-third.motn,
set the title to "Chapter One", and render it to ProRes 4444.
```

## project.json format

Protocols operate on a `project.json` file in the `ProjectV2` schema:

```json
{
  "name": "my-project",
  "scenes": [
    {
      "id": "intro",
      "title": "Introduction",
      "subhead": "What we cover"
    }
  ],
  "brand": {
    "primaryColor": "#1a1a2e",
    "accentColor": "#e94560"
  },
  "deliverables": {
    "format": "ProRes",
    "resolution": "1920x1080",
    "frameRate": 24
  }
}
```

Full schema: `src/projects/types.ts`. Demo: `demo/csos-showcase/project.json`.

## Logging levels

| Flag | Output |
|------|--------|
| (none) | Normal: step results, errors |
| `--verbose` | Tool calls, timing, intermediate state |
| `--debug` | Full stack traces, raw AppleScript output |
| `--silent` | Errors only |

Secrets are never logged at any level.

## Smoke harness

The 9-phase smoke suite runs integration tests against the real apps:

```bash
npm run smoke:ci
```

Phases: app health → Compressor encode → Motion clone+render → FCP round-trip diff → ledger → tool-compass discoverability (12 semantic queries) → protocol real-render with `movEyeballGate`.

CI runs typecheck + build + unit tests on Linux. The smoke harness runs locally (macOS) because macOS runners cost ~10× Linux per CI minute.
