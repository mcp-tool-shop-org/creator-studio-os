---
title: Reference
description: All 153 Creator Studio OS tools, grouped by app.
sidebar:
  order: 4
---

> Each app group below ships as its own npm package. Browse the family on
> [npm](https://www.npmjs.com/org/creator-studio-os) or see [Packages](../packages/) for tool counts and install commands.

## Final Cut Pro (22 tools) — `@creator-studio-os/fcp`

FCP's AppleScript dictionary is read-only. Timeline authoring goes through FCPXML import.

| Tool | Purpose |
|------|---------|
| `fcp_project_list` | List projects in the data directory |
| `fcp_project_create` | Create a project directory + `project.json` |
| `fcp_project_info` | Read project metadata + resolved paths |
| `fcp_fcpxml_build` | Build FCPXML 1.14 from a JSON spec |
| `fcp_fcpxml_validate` | Validate FCPXML against the bundled DTD |
| `fcp_fcpxml_write` | Write FCPXML to `projects/<name>/fcp/` |
| `fcp_fcpxml_import` | Open an FCPXML file in Final Cut Pro |
| `fcp_fcpxml_build_write_import` | End-to-end: build → validate → write → import |
| `fcp_library_list` | List libraries open in FCP |
| `fcp_library_events` | List events in a library |
| `fcp_event_projects` | List projects in an event |
| `fcp_project_metadata` | Read sequence duration, frame rate, timecode format |
| `fcp_app_open` | Open Final Cut Pro |
| `fcp_app_running` | Check if FCP is running |
| `fcp_app_activate` | Bring FCP to the foreground |
| `fcp_round_trip_diff` | Compare two FCPXML files, emit structured diff |
| `fcp_fcpxml_add_title` | Add a Titles effect clip to a spine |
| `fcp_fcpxml_add_transition` | Add a transition between clips |
| `fcp_fcpxml_add_marker` | Add a chapter/to-do/completion marker |
| `fcp_safety_preflight` | Check all FCPXML source files exist before import |
| `fcp_multicam_build` | Build a multicam clip from angle specs |
| `fcp_caption_build` | Build a caption track from a transcript |
| `fcp_compound_clip_build` | Build a compound clip from nested spine specs |

## Compressor (15 tools) — `@creator-studio-os/compressor`

Compressor has no AppleScript dictionary. The surface is its CLI plus `.compressorbatch` files. First invocation per session triggers App Store entitlement validation (expected delay). See the [`@creator-studio-os/compressor` README on npm](https://www.npmjs.com/package/@creator-studio-os/compressor) for the canonical tool list.

| Tool | Purpose |
|------|---------|
| `compressor_app_open` | Open Compressor |
| `compressor_app_running` | Check if Compressor is running |
| `compressor_settings_list` | Enumerate `.compressorsetting` presets |
| `compressor_locations_list` | Enumerate `.compressorlocation` files |
| `compressor_encode` | Submit a single encode job |
| `compressor_encode_project` | Encode relative to a project's directory |
| `compressor_monitor_stream` | Stream encode progress frames |
| `compressor_job_status` | Poll a single job's status |
| `compressor_batch_status` | Poll all active batch jobs |
| `compressor_cancel_job` | Cancel an active job |
| `compressor_settings_inspect` | Inspect a `.compressorsetting` file |
| `compressor_batch_build` | Build a `.compressorbatch` XML document |
| `compressor_await_output` | Block until an output file is non-empty |
| `compressor_daemon_recover` | Recover a stuck Compressor daemon |

## Motion (10 tools) — `@creator-studio-os/motion`

`motion_template_set_param` and `motion_render_via_compressor` have no prior art in any MCP — headless Motion OZML mutation and render are uniquely enabled by creator-studio-os.

| Tool | Purpose |
|------|---------|
| `motion_app_open` | Open Motion |
| `motion_app_running` | Check if Motion is running |
| `motion_open` | Open a `.motn` template |
| `motion_template_clone` | Clone a `.motn` template to a new path |
| `motion_template_set_param` | Set a published parameter value (OZML edit) |
| `motion_template_get_params` | List all published parameters in a template |
| `motion_template_validate` | Validate OZML structure of a `.motn` file |
| `motion_template_publish_catalog` | List all templates in Motion's publish catalog |
| `motion_publish_to_fcp` | Publish a Motion template to FCP's Title browser |
| `motion_render_via_compressor` | Headlessly render a `.motn` to video via Compressor |

## Pixelmator Pro (33 tools) — `@creator-studio-os/pixelmator`

The Pixelmator surface covers the full sdef. The table below shows the most-used operations — see the [`@creator-studio-os/pixelmator` README on npm](https://www.npmjs.com/package/@creator-studio-os/pixelmator) for the complete 33-tool reference.

| Tool | Purpose |
|------|---------|
| `pixelmator_app_open` | Open Pixelmator Pro |
| `pixelmator_app_running` | Check if Pixelmator Pro is running |
| `pixelmator_open` | Open a document |
| `pixelmator_close` | Close a document |
| `pixelmator_export` | Export to PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG |
| `pixelmator_resize` | Resize a document |
| `pixelmator_crop` | Crop a document |
| `pixelmator_rotate` | Rotate a document |
| `pixelmator_flip` | Flip a document |
| `pixelmator_batch_export_project_images` | Batch convert `projects/<name>/images/` |
| `pixelmator_layer_list` | List layers in a document |
| `pixelmator_layer_create` | Create a new layer |
| `pixelmator_layer_delete` | Delete a layer |
| `pixelmator_layer_set_text` | Set text content on a text layer |
| `pixelmator_layer_set_fill` | Set fill color on a layer |
| `pixelmator_layer_move` | Move a layer to new coordinates |
| `pixelmator_effects_apply` | Apply an ML effect |
| `pixelmator_effects_catalog` | List available ML effects |
| `pixelmator_compose_brand_card` | Compose a hue-rotated brand card with title text |
| `pixelmator_hdr_export` | Export with HDR tone mapping |
| `pixelmator_text_card` | Render a text-only card with font + color control |

## Logic Pro (3 tools) — `@creator-studio-os/logic`

Logic has no AppleScript dictionary. Surface: lifecycle + file-open handoff for `.logicx` projects.

| Tool | Purpose |
|------|---------|
| `logic_app_open` | Open Logic Pro |
| `logic_app_running` | Check if Logic Pro is running |
| `logic_open` | Open a `.logicx` project |

## Keynote (56 tools) — `@creator-studio-os/keynote`

Keynote has the largest single-app surface. The table below shows the lifecycle and export highlights — see the [`@creator-studio-os/keynote` README on npm](https://www.npmjs.com/package/@creator-studio-os/keynote) for the full 56-tool reference.

| Tool | Purpose |
|------|---------|
| `keynote_app_open` / `keynote_app_running` | Lifecycle |
| `keynote_open` / `keynote_close` | Open / close presentations |
| `keynote_export_pdf` | Export as PDF |
| `keynote_export_images` | Export slides as images |
| `keynote_export_movie` | Export as movie |
| `keynote_export_pptx` | Export as PowerPoint |

## Pages (5 tools) — `@creator-studio-os/iwork-docs`

| Tool | Purpose |
|------|---------|
| `pages_app_open` / `pages_app_running` | Lifecycle |
| `pages_open` / `pages_close` | Open / close documents |
| `pages_export_pdf` | Export as PDF |
| `pages_export_word` | Export as Word |
| `pages_export_epub` | Export as EPUB |

## Numbers (5 tools) — `@creator-studio-os/iwork-docs`

| Tool | Purpose |
|------|---------|
| `numbers_app_open` / `numbers_app_running` | Lifecycle |
| `numbers_open` / `numbers_close` | Open / close spreadsheets |
| `numbers_export_pdf` | Export as PDF |
| `numbers_export_excel` | Export as Excel |
| `numbers_export_csv` | Export as CSV |

## Infrastructure (4 tools) — `@creator-studio-os/core` + `@creator-studio-os/protocols`

| Tool | Purpose |
|------|---------|
| `csos_app_status` | Health check for all 8 apps (running, version, queue depth) |
| `csos_protocol_run` | Run a cross-app protocol end-to-end (async, streams steps) |
| `csos_protocol_list` | List all registered protocols |
| `csos_protocol_describe` | Describe a protocol's steps and purpose |

## tool-compass

All 78 tool descriptions are tuned to pass semantic retrieval via [tool-compass](https://github.com/mcp-tool-shop-org/tool-compass), an HNSW semantic gateway. The smoke harness validates 12 representative natural-language queries in Phase 7 — any description change that drops a target out of top-3 (score > 0.4) fails the smoke.

```bash
pip install tool-compass
```
