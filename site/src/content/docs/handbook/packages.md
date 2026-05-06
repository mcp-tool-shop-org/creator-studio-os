---
title: Packages
description: The 10 published npm packages that make up Creator Studio OS v2.0.0 — what each one ships, how they depend on each other, and when to install each.
sidebar:
  order: 2
---

Creator Studio OS v2.0.0 ships as **10 published packages** under the [`@creator-studio-os`](https://www.npmjs.com/org/creator-studio-os) npm scope. Each package is independently versioned, independently tested (≥75% line + branch coverage), and signed with [npm provenance attestations](https://docs.npmjs.com/generating-provenance-statements).

The decomposition lets you pull in only what you need. The umbrella CLI gives you everything; the leaf packages let you embed a single app's automation surface inside other tooling.

## Dependency graph

```
@creator-studio-os/core                    (shared runtime — depended on by all)
    │
    ├── @creator-studio-os/compressor      (Compressor CLI + monitor)
    ├── @creator-studio-os/fcp             (FCPXML 1.14 + library introspection)
    ├── @creator-studio-os/iwork-docs      (Pages + Numbers shared automation)
    ├── @creator-studio-os/keynote         (Keynote slide composition)
    ├── @creator-studio-os/logic           (Logic Pro lifecycle + bounce)
    ├── @creator-studio-os/motion          (Motion OZML edit + render)
    └── @creator-studio-os/pixelmator      (Pixelmator Pro full sdef)

@creator-studio-os/protocols              (cross-app pipelines — depends on all 8 leaves)

@creator-studio-os/creator-studio-os      (umbrella CLI — depends on protocols)
```

## The 10 packages

### `@creator-studio-os/creator-studio-os` — umbrella CLI

The full command-line product. Ships the `creator-studio-os` binary with `serve`, `verify`, `smoke`, and `protocol run` subcommands.

```bash
npm install -g @creator-studio-os/creator-studio-os
```

Use this when you want the complete product. Most users will install only this.

### `@creator-studio-os/core` — shared runtime

The foundation every other package depends on. AppleScript runners, project schema, ledger, error types, iWork shared automation primitives.

**1 tool** — `csos_app_status` (health check for all 8 apps).

```bash
npm install @creator-studio-os/core
```

### `@creator-studio-os/fcp` — Final Cut Pro

FCPXML 1.14 authoring (assets, clips, titles, transitions, markers, multicam, captions, compound clips), DTD validation via `xmllint`, library/event introspection, round-trip diff.

**22 tools.** Read-only AppleScript surface — all authoring goes through FCPXML import.

```bash
npm install @creator-studio-os/fcp
```

### `@creator-studio-os/compressor` — Compressor

Headless encode via the Compressor CLI, live progress via `-monitor -format json`, preset binding, daemon recovery.

**15 tools.** Pairs with `@creator-studio-os/motion` for headless ProRes rendering.

```bash
npm install @creator-studio-os/compressor
```

### `@creator-studio-os/motion` — Motion

Clone `.motn` templates, patch published parameters via OZML edit (`editText` for glyph-inside-text layout, `patchSiblingText` for Apple Compositions sibling layout), render headlessly via Compressor.

**10 tools.** No prior art for headless Motion automation in any MCP — this package is the unique enabler for the cross-app composite chain.

```bash
npm install @creator-studio-os/motion
```

### `@creator-studio-os/pixelmator` — Pixelmator Pro

Full Pixelmator Pro sdef coverage: layers (create/delete/move/text/fill), effects (ML catalog + apply), brand card composition with hue rotation, blend modes, HDR export, document I/O.

**33 tools** — the largest single-app surface in the family.

```bash
npm install @creator-studio-os/pixelmator
```

### `@creator-studio-os/keynote` — Keynote

Slide composition, theme binding, export to PDF / images / movie / pptx. Markdown-to-slides ingestion.

**56 tools** — the second-largest single-app surface in the family, after Pixelmator's 33.

```bash
npm install @creator-studio-os/keynote
```

### `@creator-studio-os/logic` — Logic Pro

Project lifecycle, file-open handoff for `.logicx` projects, bounce automation. Logic has no AppleScript dictionary; the surface is intentionally narrow.

**3 tools.**

```bash
npm install @creator-studio-os/logic
```

### `@creator-studio-os/iwork-docs` — Pages + Numbers

Shared automation surface for the iWork document apps. Lifecycle, document I/O, table read/write (Numbers), export (PDF / Word / EPUB / Excel / CSV).

**10 tools** (5 Pages + 5 Numbers). Pages and Numbers share most of their osascript automation; merging them here keeps the surface coherent.

```bash
npm install @creator-studio-os/iwork-docs
```

### `@creator-studio-os/protocols` — cross-app pipelines

The orchestration layer. Defines `ProtocolDefinition`, the step runner, the replay-manifest format, and the two reference protocols:

- **`brand-deck-minimal`** — 13-step Pixelmator → Motion → FCPXML → Compressor pipeline
- **`steam-trailer-minimal`** — trailer authoring with Motion lower-thirds

```bash
npm install @creator-studio-os/protocols
```

## Quality bar

Every package ships with:

- **≥75% line coverage and ≥75% branch coverage** — non-negotiable, gated in CI
- **`os: ["darwin"]` constraint** — declared in every `package.json`
- **MIT license** — same license file in every package
- **Signed provenance attestation** — npm publishes via OIDC `--provenance`
- **Per-package CHANGELOG** stub linking to the root canonical changelog
- **README with the same Creator Studio OS logo** at the top

The total v2.0.0 surface: **153 tools** across 8 Apple apps, **1173 unit tests**, **10 npm packages**, **0 high or critical CVEs**.

## Browse on npm

[https://www.npmjs.com/org/creator-studio-os](https://www.npmjs.com/org/creator-studio-os)
