# Phase 2 — v1.7 build plan

**Target:** v1.7.0 release. **Status:** design phase. Build plan TBD — start with `csos_app_status` infrastructure (see below), then Pixelmator + Keynote breadth.

---

## Infrastructure ticket — `csos_app_status(app)` unified status surface

**Priority:** ship before Pixelmator/Keynote work. Every multi-phase workflow needs this.

**Why this exists:** the v1.6.0 smoke matrix surfaced a fire-and-forget blindspot. Phase 1 submitted a Compressor job; Phase 2 submitted a second without knowing the first was still live in the daemon. Compressor refused with "Unable to submit to queue" — an opaque daemon-state error that `encodeJob` now handles with a detect-and-retry, but the deeper fix is having a status surface that lets the orchestrator verify app health before submitting.

**Shape:**

```typescript
export interface AppStatus {
  running: boolean;
  healthy: boolean;
  queueDepth: number;
  inFlightJobs: string[];   // job/batch IDs or document names
  lastError?: string;
}

export async function getAppStatus(app: "compressor" | "fcp" | "motion" | "logic"): Promise<AppStatus>
```

**Per-app implementation:**

| App | `running` | `healthy` | `queueDepth` / `inFlightJobs` | `lastError` |
|-----|-----------|-----------|-------------------------------|-------------|
| Compressor | `pgrep Compressor` | exit 0 on `-monitor -once` | non-terminal batch count from `-monitor -once` | last `Submission Error` string |
| FCP | System Events `running` check | library open (front document exists) | 1 if a project is open + unsaved, else 0 | last AppleScript error |
| Motion | `pgrep Motion` | process alive | count of in-flight `.motn` renders (via scratch dir watch) | last render error |
| Logic | `pgrep Logic Pro` | project open | 1 if bounce in progress (bounce-dir watch), else 0 | last bounce error |

**MCP tool exposure:** `csos_app_status` — single tool, `app` param. Returns `AppStatus` JSON.

**Smoke harness integration:** add a Phase 0 health-check before any Compressor phases. If `healthy: false`, surface the error and skip Phases 1 + 2 rather than failing them.

---

## Pixelmator full sdef

Full coverage of the Pixelmator Pro sdef — 22 export formats (HDR JPEG/HEIC/AVIF/PNG, OpenEXR, MP4, animated PNG/GIF), 27 blend modes, 23 effect classes, 24 color-adjustment properties. Sdef-native `replace` / `replace image` / `detect face` / `detect QR code`. Plus `pixelmator_run_shortcut` (Shortcuts.app bridge) and `pixelmator_apply_ml`.

Reference: [`docs/roadmap-pixelmator.md`](./roadmap-pixelmator.md)

---

## Keynote leapfrog (45 tools)

28 reichenbach parity + 8 sdef-depth + 5 cross-app composition tools uniquely csos:
- `keynote_to_storyboard_fcp`
- `keynote_to_compressor_gif`
- `keynote_slide_to_motion_template`
- `keynote_plan_magic_move`
- `keynote_from_markdown`

Reference: [`docs/roadmap-iwork.md`](./roadmap-iwork.md)

---

## Motion — OzmlTextEditor

Text replacement: four coordinated edits + five validators. Replaces literal text in `.motn` files without round-tripping through the Motion UI.

Reference: [`docs/roadmap-motion.md`](./roadmap-motion.md)

---

## FCP breadth (gated by v1.6 pre-flights)

Anchored items, multicam, compound clips, captions authoring.

Reference: [`docs/roadmap-fcp.md`](./roadmap-fcp.md)
