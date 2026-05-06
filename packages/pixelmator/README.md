<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/pixelmator

> Pixelmator Pro tools for Creator Studio OS — layer editing, ML effects, brand card composition, and multi-format export

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Part of the [Creator Studio OS](../../README.md) MCP control plane for Apple Creator Studio apps.

---

## Install

```bash
npm install @creator-studio-os/pixelmator
```

Requires Pixelmator Pro (Creator Studio or standalone) and macOS 13+.

## What this package does

`@creator-studio-os/pixelmator` drives Pixelmator Pro via its AppleScript surface — the richest ML-augmented image editing API available on macOS. 33 tools spanning the full document lifecycle, layer stack manipulation, ML algorithms, color adjustments, effects, and a multi-size brand card compositor.

## Tools (33)

### App and document lifecycle

| Tool | Description |
|------|-------------|
| `pixelmator_app_open` | Activate Pixelmator Pro |
| `pixelmator_app_running` | Check whether Pixelmator Pro is running |
| `pixelmator_open` | Open a document; returns the document name (used by all other tools) |
| `pixelmator_close` | Close a document (no save) |
| `pixelmator_export` | Export to PNG, JPEG, TIFF, PSD, WebP, HEIC, AVIF |
| `pixelmator_export_hdr` | Export as HDR JPEG, HDR HEIC, HDR AVIF, or HDR PNG |
| `pixelmator_export_video` | Export video layers to MP4 or QuickTime |
| `pixelmator_export_animated` | Export as Animated GIF or Animated PNG |
| `pixelmator_export_for_web` | Web-optimized PNG, JPEG, WebP, GIF, or SVG |
| `pixelmator_batch_export_project_images` | Batch-export all images in a project's `images/` dir |
| `pixelmator_batch_export_project_images_dryrun` | Dry-run: list what batch export would process |

### Document transforms

| Tool | Description |
|------|-------------|
| `pixelmator_resize` | Change document dimensions and/or resolution |
| `pixelmator_crop` | Crop to bounds `{x, y, width, height}` |
| `pixelmator_rotate` | Rotate 180, right (90 CW), or left (90 CCW) |
| `pixelmator_flip` | Flip horizontally or vertically |

### Layer stack

| Tool | Description |
|------|-------------|
| `pixelmator_make_layer` | Add an image, text, or shape layer |
| `pixelmator_set_layer_properties` | Change visibility, opacity, blend mode, position, or size |
| `pixelmator_layer_order` | Reorder a layer (front/back/before/after) |
| `pixelmator_group_layers` | Move layers into a new group |
| `pixelmator_ungroup` | Ungroup a group layer |
| `pixelmator_set_layer_text` | Edit text content and styling on a text layer |
| `pixelmator_make_shape` | Create a filled rectangle, ellipse, rounded-rectangle, or line |
| `pixelmator_set_blend_mode` | Set compositing blend mode (all 28 Pixelmator Pro modes) |
| `pixelmator_set_layer_shadow` | Add or edit a drop shadow |
| `pixelmator_set_layer_stroke` | Add or edit an outline stroke |

### Effects and color adjustments

| Tool | Description |
|------|-------------|
| `pixelmator_apply_effect` | Apply any of 23 non-destructive effect classes |
| `pixelmator_apply_color_adjustment` | Set any of 24 color-adjustment properties (incl. LUT path, vignette) |

### ML

| Tool | Description |
|------|-------------|
| `pixelmator_apply_ml` | Run super_resolution, enhance, denoise, deband, match_colors, remove_background, select_subject, or auto-adjust |
| `pixelmator_run_shortcut` | Run a Pixelmator Shortcuts action by name via `shortcuts run` |

### Detection and replace

| Tool | Description |
|------|-------------|
| `pixelmator_detect` | Detect faces or QR codes (bounding boxes; QR includes decoded payload) |
| `pixelmator_replace_text` | Find and replace text across all text layers |
| `pixelmator_replace_layer` | Replace an image layer's pixel content from a new file |

### Brand card compositor

| Tool | Description |
|------|-------------|
| `pixelmator_compose_brand_card` | Open a `.pxd` template, replace `{{HEADLINE}}` / `{{SUBHEAD}}` / `{{LOGO}}` tokens, and export at multiple sizes |

## Example

Generate brand cards at three sizes from a template:

```json
// Tool: pixelmator_compose_brand_card
{
  "templatePath": "/projects/csos-showcase/brand/card-template.pxd",
  "brand": {
    "headline": "Creator Studio OS",
    "subhead": "Eight apps. One pipeline.",
    "logoPath": "/projects/csos-showcase/brand/csos-logo.png"
  },
  "sizes": [
    { "width": 1920, "height": 1080, "label": "16x9" },
    { "width": 1080, "height": 1080, "label": "square" },
    { "width": 1080, "height": 1920, "label": "story" }
  ],
  "outputDir": "/projects/csos-showcase/out/brand-cards"
}
```

Apply ML super-resolution and re-export:

```json
// Tool: pixelmator_apply_ml
{
  "documentName": "hero.pxd",
  "algorithm": "super_resolution"
}

// Tool: pixelmator_export
{
  "documentName": "hero.pxd",
  "outputPath": "/projects/csos-showcase/out/hero-4k.png",
  "format": "PNG"
}
```

## Recovery profile

```typescript
import { recovery } from "@creator-studio-os/pixelmator";
// recovery.app === "pixelmator"
```

## macOS requirement

`@creator-studio-os/pixelmator` is macOS-only (`"os": ["darwin"]`). ML tools require Pixelmator Pro from the Creator Studio subscription or the Mac App Store.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [Security](../../SECURITY.md)
