<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/compressor

> Compressor tools for Creator Studio OS — headless encode, batch jobs, live progress streaming, and daemon recovery

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage 95%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Part of the [Creator Studio OS](../../README.md) MCP control plane for Apple Creator Studio apps.

---

## Install

```bash
npm install @creator-studio-os/compressor
```

Requires Compressor (part of Apple Creator Studio) and macOS 13+.

## What this package does

Drives Apple Compressor via its CLI (`-jobpath`, `-monitor`) — no GUI scripting required. Submit encode jobs, stream live progress, inspect `.compressorsetting` files, and recover from daemon hangs.

## Tools (15)

| Tool | Description |
|------|-------------|
| `compressor_app_open` | Open Compressor (idempotent; primes purchase entitlement on first run) |
| `compressor_app_running` | Check whether Compressor is currently running |
| `compressor_encode` | Submit a single encode job to Compressor's queue via CLI |
| `compressor_encode_project` | Encode-job wrapper for csos project-scoped workflows |
| `compressor_status` | One-shot status check for a job or batch (percentComplete, timeRemaining, …) |
| `compressor_monitor_stream` | Stream encode progress via `-monitor -format json`; emits periodic StatusFrames |
| `compressor_pause` | Pause a job or batch |
| `compressor_resume` | Resume a paused job or batch |
| `compressor_kill` | Cancel a job or batch |
| `compressor_wait_for` | Poll until a job reaches a terminal state (completed/failed/cancelled) |
| `compressor_settings_list` | List available encode settings with availability flags |
| `compressor_settings_inspect` | Parse a `.compressorsetting` file — codec, bitrate, dimensions, HDR metadata |
| `compressor_settings_resolve` | Reverse-lookup a `.compressorsetting` path by display name |
| `compressor_locations_list` | List available Compressor output locations |
| `compressor_codec_availability` | Report which codecs are available on this host |

## Example

```typescript
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerCompressorTools(server);
```

Submit an encode job and stream progress:

```json
// Tool: compressor_encode
{
  "inputPath": "/projects/csos-showcase/out/timeline.mov",
  "settingName": "Apple ProRes 422",
  "outputPath": "/projects/csos-showcase/out/final.mov"
}

// Tool: compressor_monitor_stream
{ "jobId": "<returned jobId>" }
```

## Recovery

```typescript
import { recovery } from "@creator-studio-os/compressor";

// recovery.app === "compressor"
// recovery.recover() restarts the Compressor daemon if it hangs
```

The `recovery` profile integrates with `withDaemonRecovery` from `@creator-studio-os/core` for automatic restart on daemon failure.

## macOS requirement

`@creator-studio-os/compressor` is macOS-only (`"os": ["darwin"]` in `package.json`). The Compressor CLI path is resolved at runtime from the installed app bundle.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [Security](../../SECURITY.md)
