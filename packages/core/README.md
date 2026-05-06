<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/core

> Shared runtime for Creator Studio OS — AppleScript runners, project schema, ledger, error types, iWork shared automation

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-89%25-brightgreen.svg" alt="Coverage 89%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Part of the [Creator Studio OS](../../README.md) MCP control plane for Apple Creator Studio apps.

---

## Install

```bash
npm install @creator-studio-os/core
```

## What this package does

`@creator-studio-os/core` is the runtime foundation shared by every other `@creator-studio-os/*` package. It provides:

- **AppleScript runners** — `runAppleScript`, `runApp`, `awaitOutput`, `openApp`, `withDaemonRecovery`
- **Project schema** — `ProjectV2` Zod schema, resolver, and typed path map
- **Error system** — `CreatorStudioError` with structured `{ code, message, hint }` shape
- **Config** — `loadConfig()` reads `CREATOR_STUDIO_DATA_DIR` and all app bundle IDs
- **Ledger** — structured encode/project history at `<dataDir>/.csos/ledger.jsonl`
- **iWork shared** — `openDocumentInApp`, `closeDocumentInApp`, `exportDocumentInApp`, `activateApp`, `isAppRunning`

## Tool (1)

| Tool | Description |
|------|-------------|
| `csos_app_status` | Check whether any Creator Studio app is running and healthy. Pass `app="all"` to query all 8 at once. |

## Example

```typescript
import {
  runAppleScript,
  CreatorStudioError,
  loadConfig,
  registerStatusTool,
} from "@creator-studio-os/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerStatusTool(server);

// Escape user input before interpolation — always
const name = escapeAppleScriptString(userInput);
const result = await runAppleScript(`tell app "Keynote" to get name of document "${name}"`);
```

## Error handling

All runtime errors are `CreatorStudioError`:

```typescript
import { CreatorStudioError } from "@creator-studio-os/core";

try {
  await runAppleScript(`...`);
} catch (err) {
  if (err instanceof CreatorStudioError) {
    console.error(err.code);   // "E_OSASCRIPT_FAILED", "E_AUTOMATION_DENIED", …
    console.error(err.hint);   // actionable suggestion
  }
}
```

## macOS requirement

`@creator-studio-os/core` is macOS-only (`"os": ["darwin"]`). AppleScript runners invoke `osascript`; `openApp` uses `open -b <bundleId>`.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [Security](../../SECURITY.md)
