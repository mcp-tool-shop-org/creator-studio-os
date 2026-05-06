<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

# @creator-studio-os/creator-studio-os

MCP control plane for Apple Creator Studio apps. Drive **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages**, and **Numbers** from Claude or any MCP client.

This package is the **umbrella CLI** — it bundles all 9 `@creator-studio-os/*` packages and exposes them as a single `creator-studio-os serve` command.

## Install

```bash
npm install -g @creator-studio-os/creator-studio-os
```

Or via npx (no install):

```bash
npx @creator-studio-os/creator-studio-os serve
```

## MCP client config

Add to `claude_desktop_config.json` (or equivalent):

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

## What's included

| Package | Tools | What it drives |
|---------|-------|----------------|
| `@creator-studio-os/core` | 1 | Shared runtime, AppleScript runners, project schema |
| `@creator-studio-os/compressor` | 15 | Headless encode, batch jobs, live progress |
| `@creator-studio-os/fcp` | 22 | FCPXML 1.14 authoring, DTD validation, FCP import |
| `@creator-studio-os/iwork-docs` | 10 | Pages + Numbers document lifecycle + export |
| `@creator-studio-os/keynote` | 56 | Full Keynote automation — slides, ML, export, pipeline bridges |
| `@creator-studio-os/logic` | 3 | Logic Pro launch and `.logicx` project open |
| `@creator-studio-os/motion` | 10 | OZML template mutation, headless render |
| `@creator-studio-os/pixelmator` | 33 | Layer editing, ML effects, brand card compositor |
| `@creator-studio-os/protocols` | 3 | Cross-app orchestration pipelines |

**Total: 153 tools across 9 packages.**

## Cross-app pipeline

The flagship use case: `csos_protocol_run` orchestrates all 8 apps in one command —

1. Pixelmator Pro composes brand cards per scene
2. Motion renders lower-third overlays headlessly via Compressor
3. FCPXML 1.14 timeline is built and imported into Final Cut Pro
4. Compressor encodes the final deliverable (ProRes main + H.264 social)

## CLI

```bash
creator-studio-os serve          # start MCP server
creator-studio-os verify         # verify xmllint + DTD round-trip
creator-studio-os smoke          # run 9-phase smoke test against live apps
creator-studio-os smoke --dry-run  # smoke test without live app calls
```

## Using packages individually

Each app package is published separately. Install only what you need:

```bash
npm install @creator-studio-os/fcp       # Final Cut Pro only
npm install @creator-studio-os/keynote   # Keynote only
npm install @creator-studio-os/pixelmator  # Pixelmator Pro only
```

## Security

Runs entirely on-device — no network calls, no telemetry, no credentials stored. Full threat model at [SECURITY.md](SECURITY.md) and [`docs/threat-model.md`](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md).

## macOS requirement

macOS 13+ and Apple Creator Studio subscription (or individual app purchases from the Mac App Store where available). See each package's README for per-app requirements.

---

[Full docs](https://github.com/mcp-tool-shop-org/creator-studio-os) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md)
