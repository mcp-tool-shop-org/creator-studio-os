<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/protocols

> Cross-app composition protocols for Creator Studio OS — brand-deck-minimal and steam-trailer-minimal orchestration pipelines

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen.svg" alt="Coverage 85%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Part of the [Creator Studio OS](../../README.md) MCP control plane for Apple Creator Studio apps.

---

## Install

```bash
npm install @creator-studio-os/protocols
```

Requires all eight Creator Studio apps and macOS 13+.

## What this package does

`@creator-studio-os/protocols` orchestrates the full cross-app pipeline — Pixelmator brand cards → Motion lower-third renders → FCPXML build → FCP import → Compressor encode — in a single resumable run.

Protocols are **step-by-step generators**: each step is idempotent and the run can be resumed from any completed step using `--resume <taskId>`.

## Tools (3)

| Tool | Description |
|------|-------------|
| `csos_protocol_run` | Run a cross-app protocol end-to-end against a `ProjectV2` project.json. Returns a `taskId` immediately; poll for status and final step summary. Supports `--resume <taskId>` to skip already-completed steps. |
| `csos_protocol_list` | List all registered protocols with names, descriptions, and step counts |
| `csos_protocol_describe` | Describe a single protocol — purpose, step names, and usage notes |

## Protocols

### `brand-deck-minimal` (13 steps)

The flagship cross-app pipeline. Given a `ProjectV2` project.json with scenes defined:

1. Validate inputs and project schema
2. Compose Pixelmator brand cards per scene (`{{HEADLINE}}`, `{{SUBHEAD}}` tokens)
3. *(optional)* Render a Motion lower-third overlay per scene headlessly via Compressor
4. Build FCPXML 1.14 timeline from the scene list
5. Validate FCPXML against the bundled DTD
6. Write FCPXML to `<project>/fcp/`
7. Import into Final Cut Pro
8. Submit main encode job to Compressor
9. Submit social encode job to Compressor
10. Stream encode progress until terminal state
11. Verify output files exist
12. Write ledger entry
13. Return final step summary

### `steam-trailer-minimal`

Alias for `brand-deck-minimal` (v1.7.7+). Identical step sequence.

## Example

```typescript
import { registerProtocolTools } from "@creator-studio-os/protocols";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerProtocolTools(server);
```

Run the full pipeline:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json"
}
// → { "taskId": "task_abc123", "status": "running" }

// Poll for completion:
// Tool: csos_protocol_describe — for step names
// Tool: csos_protocol_run with --resume <taskId> — to resume after interruption
```

## Resumability

Every step records its output to the project ledger. If a run is interrupted (Compressor crash, FCP import stall), resume from the last completed step:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json",
  "resume": "task_abc123"
}
```

## Programmatic usage

```typescript
import { runProtocol, listProtocols, STEP_NAMES } from "@creator-studio-os/protocols";

for await (const step of runProtocol({ protocol: "brand-deck-minimal", projectPath: "..." })) {
  console.log(step.name, step.status);
}
```

## macOS requirement

`@creator-studio-os/protocols` is macOS-only (`"os": ["darwin"]`). All eight Creator Studio apps must be installed and granted automation permission.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [Security](../../SECURITY.md)
