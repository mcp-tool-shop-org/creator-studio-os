<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/keynote

> Keynote tools for Creator Studio OS — 56 tools for slide deck automation, markdown import, storyboard-to-FCPXML, and multi-format export

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
npm install @creator-studio-os/keynote
```

Requires Keynote (Creator Studio or standalone) and macOS 13+.

## What this package does

The deepest AppleScript surface of any Apple app — Keynote exposes a rich sdef dictionary for creating, editing, and exporting slide decks. `@creator-studio-os/keynote` wraps the full surface: 56 tools covering slide lifecycle, text, tables, charts, images, transitions, ML effects, export, and two pipeline bridges (Markdown import + FCPXML storyboard export).

## Tools (56)

### App lifecycle

| Tool | Description |
|------|-------------|
| `keynote_app_open` | Activate Keynote |
| `keynote_app_running` | Check whether Keynote is running |

### Document lifecycle

| Tool | Description |
|------|-------------|
| `keynote_open` | Open a `.key` file; returns its name (used by all other tools) |
| `keynote_close` | Close a document (with optional save) |
| `keynote_save` | Save a document, optionally to a different path |
| `keynote_list_presentations` | List all open documents |
| `keynote_create_presentation` | Create a new blank presentation |
| `keynote_set_doc_size` | Set slide dimensions (e.g. 1920×1080 for 16:9) |
| `keynote_set_kiosk_mode` | Configure auto-play, auto-loop, and idle timeout for kiosk displays |

### Themes and masters

| Tool | Description |
|------|-------------|
| `keynote_list_themes` | List all available themes |
| `keynote_apply_theme` | Apply a theme to a document |
| `keynote_list_masters` | List slide master layouts in the current theme |
| `keynote_set_slide_master` | Set the master layout for a slide |

### Slide management

| Tool | Description |
|------|-------------|
| `keynote_list_slides` | List all slides with index, title, and skip status |
| `keynote_get_slide` | Read title, body, notes, and transition for a slide |
| `keynote_make_slide` | Add a new slide |
| `keynote_delete_slide` | Delete a slide |
| `keynote_duplicate_slide` | Duplicate a slide |
| `keynote_reorder_slide` | Move a slide to a different position |
| `keynote_skip_slide` | Mark a slide as skipped or unskip it |

### Text and content

| Tool | Description |
|------|-------------|
| `keynote_set_title` | Set the title text on a slide |
| `keynote_set_body` | Set the body text on a slide |
| `keynote_set_text_style` | Style text (font, size, color) on any slide item |
| `keynote_get_presenter_notes` | Read presenter notes from a slide |
| `keynote_set_presenter_notes` | Set presenter notes on a slide |
| `keynote_extract_all_notes` | Extract presenter notes and titles from every slide |

### Transitions

| Tool | Description |
|------|-------------|
| `keynote_set_transition` | Set a slide transition (all 43 sdef effects + timing) |
| `keynote_plan_magic_move` | Prepare two slides for a Magic Move transition |

### Items: images, shapes, lines, tables, charts

| Tool | Description |
|------|-------------|
| `keynote_list_items` | List all iWork items on a slide |
| `keynote_position_item` | Reposition and/or resize a slide item |
| `keynote_format_item` | Set opacity, rotation, and reflection on a slide item |
| `keynote_get_item_info` | Read position, size, opacity, and rotation of an item |
| `keynote_insert_image` | Insert an image from a file path |
| `keynote_set_voiceover_description` | Set the VoiceOver accessibility description on a slide image |
| `keynote_insert_shape` | Insert a rectangle shape |
| `keynote_insert_line` | Insert a line element |
| `keynote_insert_table` | Insert a table |
| `keynote_read_table` | Read cell values as a 2D array |
| `keynote_write_table` | Write cell values from a 2D array |
| `keynote_make_chart` | Add a chart with row names, column names, and data |
| `keynote_make_image_slides` | Bulk-add one slide per image from a file list |

### ML effects (Creator Studio only)

| Tool | Description |
|------|-------------|
| `keynote_clean_up_slide` | Clean up a slide using Keynote's built-in layout optimization |
| `keynote_super_resolution` | Apply ML super-resolution upscaling to a slide image |
| `keynote_remove_background` | Remove the background from a slide image using ML |

### Slideshow

| Tool | Description |
|------|-------------|
| `keynote_start` | Start presenting, optionally from a specific slide |
| `keynote_stop` | Stop the active slideshow |

### Export

| Tool | Description |
|------|-------------|
| `keynote_export_pdf` | Export to PDF |
| `keynote_export_pdf_advanced` | Export to PDF with handout layout, notes, passwords, and image quality options |
| `keynote_export_images` | Export each slide as PNG / JPEG / TIFF |
| `keynote_export_movie` | Export as a QuickTime movie |
| `keynote_export_movie_advanced` | Export as movie with codec (H.264, HEVC, full ProRes ladder), resolution, and framerate |
| `keynote_export_pptx` | Export as Microsoft PowerPoint |
| `keynote_export_html` | Export as a static HTML site |

### Pipeline bridges

| Tool | Description |
|------|-------------|
| `keynote_from_markdown` | Build a presentation from a Markdown document (headings → slides) |
| `keynote_to_storyboard_fcp` | Convert a Keynote deck to an FCP storyboard FCPXML |
| `keynote_to_compressor_gif` | Export a slideshow as animated GIF via Compressor |

## Example

Build a presentation from Markdown and export to PPTX:

```json
// Tool: keynote_from_markdown
{
  "markdownPath": "/projects/brief.md",
  "masterMap": {
    "h1": "Title",
    "h2": "Section Header",
    "bullets": "Bullets"
  }
}

// Tool: keynote_export_pptx
{
  "documentName": "brief.key",
  "outputPath": "/projects/brief.pptx"
}
```

Export slides as a ProRes movie:

```json
// Tool: keynote_export_movie_advanced
{
  "documentName": "csos-showcase.key",
  "outputPath": "/projects/csos-showcase/out/slideshow.mov",
  "codec": "ProRes 4444",
  "width": 1920,
  "height": 1080,
  "frameRate": "29.97"
}
```

## Recovery profile

```typescript
import { recovery } from "@creator-studio-os/keynote";
// recovery.app === "keynote"
```

## macOS requirement

`@creator-studio-os/keynote` is macOS-only (`"os": ["darwin"]`). ML tools require Keynote from the Creator Studio subscription. Standard tools work with the free standalone Keynote from the Mac App Store.

---

[Main README](../../README.md) · [Changelog](../../CHANGELOG.md) · [Security](../../SECURITY.md)
