<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/logic

> Logic Pro tools for Creator Studio OS — lifecycle management and `.logicx` project open handoff

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Part of the [Creator Studio OS](../../README.md) MCP control plane for Apple Creator Studio apps.

---

## Install

```bash
npm install @creator-studio-os/logic
```

Requires Logic Pro (Creator Studio) and macOS 13+.

## What this package does

Logic Pro exposes **no AppleScript surface** — there is no sdef dictionary. `@creator-studio-os/logic` handles what is possible: launching Logic, checking whether it is running, and opening `.logicx` project files via `open -b com.apple.logic10`. Further automation after open is up to the user in the Logic GUI.

## Tools (3)

| Tool | Description |
|------|-------------|
| `logic_app_open` | Open Logic Pro (no-op if already running) |
| `logic_app_running` | Check whether Logic Pro is running |
| `logic_open` | Open a `.logicx` project file — Logic launches and opens it |

## Example

```typescript
import { registerLogicTools } from "@creator-studio-os/logic";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerLogicTools(server);
```

Open a Logic project:

```json
// Tool: logic_open
{ "path": "/projects/csos-showcase/audio/session.logicx" }
```

## Recovery profile

```typescript
import { recovery } from "@creator-studio-os/logic";
// recovery.app === "logic"
// recovery.badStatePattern === null  (no bad-state detection for Logic)
```

## macOS requirement

`@creator-studio-os/logic` is macOS-only (`"os": ["darwin"]`). Logic Pro is required; it ships as part of the Apple Creator Studio subscription.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [Security](../../SECURITY.md)
