<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/iwork-docs

> Pages and Numbers tools for Creator Studio OS — document and spreadsheet lifecycle, multi-format export (PDF, Word, EPUB, Excel, CSV)

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
npm install @creator-studio-os/iwork-docs
```

Requires Pages and/or Numbers (part of Apple iWork, free from the Mac App Store) and macOS 13+.

## What this package does

Drives Apple Pages and Numbers via AppleScript — open, close, and export documents in multiple formats without touching the GUI.

## Tools (10)

### Pages (5)

| Tool | Description |
|------|-------------|
| `pages_app_open` | Activate Pages |
| `pages_app_running` | Check whether Pages is running |
| `pages_open` | Open a Pages document; returns the document name |
| `pages_close` | Close a Pages document (with optional save) |
| `pages_export` | Export to PDF, Word, RTF, plain text, or EPUB |

### Numbers (5)

| Tool | Description |
|------|-------------|
| `numbers_app_open` | Activate Numbers |
| `numbers_app_running` | Check whether Numbers is running |
| `numbers_open` | Open a Numbers document; returns the document name |
| `numbers_close` | Close a Numbers document (with optional save) |
| `numbers_export` | Export to PDF, Microsoft Excel, or CSV |

## Example

```typescript
import { registerPagesTools, registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerPagesTools(server);
registerNumbersTools(server);
```

Export a Pages document to Word:

```json
// Tool: pages_export
{
  "documentName": "Creative Brief.pages",
  "outputPath": "/projects/brief.docx",
  "format": "Word"
}
```

Export a Numbers spreadsheet to CSV:

```json
// Tool: numbers_export
{
  "documentName": "Production Log.numbers",
  "outputPath": "/projects/log.csv",
  "format": "CSV"
}
```

## Recovery profiles

```typescript
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// pagesRecovery.app   === "pages"
// numbersRecovery.app === "numbers"
```

## macOS requirement

`@creator-studio-os/iwork-docs` is macOS-only (`"os": ["darwin"]`). Pages and Numbers must be installed and granted Accessibility/Automation permission on first run.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [Security](../../SECURITY.md)
