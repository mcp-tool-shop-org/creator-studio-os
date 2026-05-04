# FCPXML

## Bundled DTDs (FCP 12.2, observed 2026-05-04)

Inside `/Applications/Final Cut Pro Creator Studio.app/Contents/Frameworks/Interchange.framework/Versions/A/Resources/`:

```
FCPXMLv1_0.dtd   FCPXMLv1_5.dtd   FCPXMLv1_10.dtd
FCPXMLv1_1.dtd   FCPXMLv1_6.dtd   FCPXMLv1_11.dtd
FCPXMLv1_2.dtd   FCPXMLv1_7.dtd   FCPXMLv1_12.dtd
FCPXMLv1_3.dtd   FCPXMLv1_8.dtd   FCPXMLv1_13.dtd
FCPXMLv1_4.dtd   FCPXMLv1_9.dtd   FCPXMLv1_14.dtd
```

We default to **1.14**. 1.13 also valid. FCP reads older versions for backward compat.

## What changed 1.13 → 1.14

Diff is small. Only `smart-collection` / `match-text` / `match-analysis-type` changed:

- `smart-collection` content model gains `match-analysis-type`
- `match-text` rule attribute adds `isRelatedTo`
- `match-text` scope attribute adds `transcript`, `visual`, `all-text`
- New `match-analysis-type` element

The structural elements we use (`format`, `asset`, `library`, `event`, `project`, `sequence`, `spine`, `asset-clip`, `marker`, `chapter-marker`) are **identical** between 1.13 and 1.14.

## Time format

`time` attributes are rational seconds: `numerator/denominator s` — 64-bit numerator, 32-bit denominator. Whole seconds may be expressed as `Ns` (e.g. `5s`).

Standard frame durations:

| Frame rate | Frame duration |
|------------|----------------|
| 23.98 | `1001/24000s` |
| 24 | `100/2400s` |
| 25 | `100/2500s` |
| 29.97 | `1001/30000s` |
| 30 | `100/3000s` |
| 50 | `100/5000s` |
| 59.94 | `1001/60000s` |
| 60 | `100/6000s` |

Our builder rounds incoming seconds to the nearest frame, then emits `${frames * num}/${den}s`. This matches FCP's output behavior on re-export.

## Known round-trip gotchas

- **Magnetic Mask data does NOT round-trip** through FCPXML 1.13 (and likely 1.14 — unverified). Export a project containing a Magnetic Mask, re-import — mask is lost. Source: fcp.cafe news 2024-11-13. Implication: if you're authoring FCPXML for content that will pass through FCP's mask tools, the mask is one-way.
- **Effect references** require the effect to exist in FCP's installed library. Authoring novel effects via FCPXML is not supported — you reference an existing effect's UID. This is why `title` spine items are hard: every title is "really" an effect reference, and titles are bundled differently across FCP versions.
- **Asset URLs** must resolve when FCP imports. If the path is wrong, FCP marks the clip "media offline" but still creates the project structure — useful for testing the structure without real media.

## Key DTD entities

- `%time` — rational time (CDATA)
- `%event_item` — `clip | audition | mc-clip | ref-clip | sync-clip | asset-clip | %collection_item | project`
- `%clip_item` — clips, gaps, transitions, titles
- `%marker_item` — `marker | chapter-marker | rating | keyword | analysis-marker | caption`
- `%anchor_item` — items that can be anchored to a primary clip (B-roll, overlays)

Read the actual DTD in the app bundle when in doubt — Apple's online docs are not the source of truth.

## Authoring vs. reading

We currently **author** FCPXML — write XML, hand to FCP. Reading FCPXML that FCP has exported is a future direction (parsing for round-trip / verification / extraction). The DTD validates either direction; the parser doesn't exist yet.

Last reviewed: 2026-05-04 against FCP 12.2.
