<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/motion

> Motion tools for Creator Studio OS — OZML template mutation, headless Compressor render, and template catalog

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage 92%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Part of the [Creator Studio OS](../../README.md) MCP control plane for Apple Creator Studio apps.

---

## Install

```bash
npm install @creator-studio-os/motion
```

Requires Motion (Creator Studio) and macOS 13+. Headless render requires Compressor.

## What this package does

Motion exposes **no AppleScript surface**. `@creator-studio-os/motion` works at the file format level — it reads and mutates Motion's OZML template format (`.motn` / `.moti`) directly, without launching Motion:

- **Template inspection** — parse OZML, list all published parameters
- **Parameter mutation** — set any parameter value (text, color, number) atomically
- **Text editing** — replace visible text content including glyph list and style runs
- **Structural validation** — 31 OZML invariants before any write
- **Headless render** — submit a `.motn` template to Compressor via `-jobpath` — no GUI required
- **FCP publish** — toggle the "Publish To FCP" marker on any parameter

> **Important**: Never mutate bundled Apple templates. Always `motion_template_clone` first.

## Tools (10)

| Tool | Description |
|------|-------------|
| `motion_app_open` | Open Motion (file-open handoff only; no AppleScript surface) |
| `motion_app_running` | Check whether Motion is running |
| `motion_open` | Open a `.motn` template or project in Motion |
| `motion_template_inspect` | Parse a template and return its OZML summary and parameter list |
| `motion_template_set_param` | Mutate a single parameter value in a Motion template |
| `motion_template_edit_text` | Edit visible text content (CDATA + glyph list + style runs) |
| `motion_template_validate` | Validate against 31 OZML structural invariants |
| `motion_template_clone` | Copy a template to a new path before mutating |
| `motion_render_via_compressor` | Render a `.motn` template headlessly via Compressor `-jobpath` |
| `motion_publish_to_fcp` | Toggle the "Publish To FCP" marker on a template parameter |

## Example

Clone a bundled template, set a text param, validate, and render headlessly:

```json
// Tool: motion_template_clone
{
  "sourcePath": "/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Atmospheric.localized/Atmospheric-Lower Third.localized/Atmospheric-Lower Third.motn",
  "destPath": "/projects/csos-showcase/motion/lower-third.motn"
}

// Tool: motion_template_edit_text
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "newText": "Creator Studio OS"
}

// Tool: motion_template_validate
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_render_via_compressor
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "outputPath": "/projects/csos-showcase/out/lower-third.mov",
  "settingName": "Apple ProRes 4444"
}
```

## Pairs with `@creator-studio-os/fcp`

```json
// Tool: fcp_bind_motion_param — discover parameters for FCP binding
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_publish_to_fcp — expose a parameter in FCP's inspector
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "publish": true
}
```

## Recovery profile

```typescript
import { recovery } from "@creator-studio-os/motion";
// recovery.app === "motion"
```

## macOS requirement

`@creator-studio-os/motion` is macOS-only (`"os": ["darwin"]`). Template inspection and mutation require no running app. Headless render requires Compressor from the Creator Studio subscription.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [Security](../../SECURITY.md)
