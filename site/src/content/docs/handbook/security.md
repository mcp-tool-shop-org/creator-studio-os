---
title: Security
description: Threat model, permissions, what Creator Studio OS does and doesn't touch.
sidebar:
  order: 5
---

## What the server does

- Spawns `osascript` targeting apps by **bundle ID** (never by file name)
- Writes files only inside `CREATOR_STUDIO_DATA_DIR`
- Invokes the Compressor CLI (`Compressor -batchFilePath`) for headless encodes
- Invokes `ffmpeg` for composite operations (overlay, concat)
- Invokes `xmllint` against the bundled FCPXML DTD for validation

## What the server does NOT do

- **No network calls.** No telemetry, no analytics, no remote validation. DTD validation reads the bundled DTD from the FCP app bundle. There is no phone-home on install, on run, or on error.
- **No credentials, tokens, or user data persisted.** The server holds no state between invocations beyond what the MCP protocol requires.
- **No writes outside the data directory.** The server never touches FCP library internals, system files, or any path outside `CREATOR_STUDIO_DATA_DIR`.

## macOS Automation permission

macOS gates AppleScript access at the OS level. The first time the server targets an app, macOS prompts:

> **"creator-studio-os" wants to control "Final Cut Pro". Allowing control will provide access to documents and data in "Final Cut Pro", and to perform actions within that app.**

Grant or deny in **System Settings → Privacy & Security → Automation**. Denying any app makes that app's tools unavailable — the server returns a structured error rather than crashing.

## Injection mitigations

**AppleScript injection** — all user-provided strings pass through `escapeAppleScriptString` before osascript interpolation. The escaping is tested and documented in `SECURITY.md`.

**XML injection** — all FCPXML attribute strings pass through `escapeXmlAttr` in `src/fcpxml/builder.ts`.

**Path traversal** — all project paths are resolved through `src/projects/resolve.ts`, which anchors to `CREATOR_STUDIO_DATA_DIR` and rejects `..` traversal.

## Known moderate vulnerabilities

`npm audit --audit-level=high` exits 0 (no high/critical findings). Three moderate vulnerabilities exist upstream:

```
@modelcontextprotocol/sdk → express-rate-limit → ip-address
```

The XSS is in HTML-emitting methods of `ip-address` that creator-studio-os never calls. Fixing requires downgrading the MCP SDK to a breaking version. Tracked upstream; dependabot will surface when the SDK ships a fix.

## Reporting

Report security issues to **security@mcp-tool-shop.dev**. Expected response: 48 hours acknowledgement, 7-day remediation target for confirmed vulnerabilities.

Full details: [SECURITY.md](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/SECURITY.md) · [docs/threat-model.md](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md)
