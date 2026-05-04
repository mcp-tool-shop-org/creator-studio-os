# Effect UIDs

FCPXML references built-in titles, transitions, and filters via stable UID strings. The UIDs are path-like and start with `.../` (the templates-root prefix); FCP resolves them against its installed effect library on import.

Apple does not publish a canonical list. The UIDs below have been verified by inspecting `/Applications/Final Cut Pro Creator Studio.app/Contents/PlugIns/MediaProviders/MotionEffect.fxp/Contents/Resources/` on FCP 12.2.

## Titles

| Display name | UID |
|--------------|-----|
| Custom (Build In:Out) | `.../Titles.localized/Build In:Out.localized/Custom.localized/Custom.moti` |

The "Custom" Build In:Out title is FCP's most basic editable title generator and ships with every FCP install. It accepts a `<text>` element with arbitrary content, plus a `<text-style-def>` for font, size, color, and alignment. It is the default title effect when a `TitleSpec` is added to the spine without specifying `effectUid`.

To find more title UIDs:

```bash
find "/Applications/Final Cut Pro Creator Studio.app/Contents/PlugIns/MediaProviders/MotionEffect.fxp/Contents/Resources" \
  -name "*.moti" -path "*Titles.localized*"
```

The path returned, with the FCP-install prefix replaced by `.../`, is the UID. Example:

```
/Applications/Final Cut Pro Creator Studio.app/Contents/PlugIns/.../Templates.localized/Titles.localized/Lower Thirds.localized/Formal.localized/Formal.moti
```

becomes:

```
.../Titles.localized/Lower Thirds.localized/Formal.localized/Formal.moti
```

## Transitions

The `<transition>` element typically does NOT need an effect reference — Apple's default transitions are addressable by `name` attribute alone:

| name | Effect |
|------|--------|
| `Cross Dissolve` | Default video dissolve |
| `Cross Blur` | Blur cross |
| `Fade to Color` | Fade to a configurable color |

An empty `<transition name="Cross Dissolve" duration="2s"/>` produces a working cross-dissolve. For non-default transitions, embed a `<filter-video ref="effect-id"/>` referencing an effect resource.

## Filters

Filter UIDs vary heavily across FCP versions and Apple frequently renames or moves them. **Do not hardcode filter UIDs**; instead, add them to this catalog as you confirm them per-version, and treat each entry as 12.2-specific until verified elsewhere.

## How to add to this catalog

When you confirm a UID works in a real FCP import:

1. Run `find` against the templates dir (above) to confirm the source path.
2. Add a row to the relevant section with display name + UID.
3. Note the FCP version you verified against.
4. If the UID stops working in a later FCP version, mark the row deprecated rather than deleting — it helps future-Claude understand the version drift.

Last reviewed: 2026-05-04 against FCP 12.2.
