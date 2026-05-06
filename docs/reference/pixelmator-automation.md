# Pixelmator Pro automation

## TL;DR

Pixelmator Pro has a **rich AppleScript dictionary**. Bundle ID `com.apple.pixelmator` (yes — Apple's namespace, post-acquisition; v4.2 in Creator Studio bundle).

Sdef location: `/Applications/Pixelmator Pro Creator Studio.app/Contents/Resources/PixelmatorPro.sdef`.

## Verified surface (v1.3)

### Export

```applescript
tell document "name" to export to (POSIX file "/path/out.png") as PNG
```

Export format enum:

| Name | UTI |
|------|-----|
| `PNG` | public.png |
| `JPEG` (synonym `JPG`) | public.jpeg |
| `TIFF` | public.tiff |
| `HEIC` | public.heic |
| `GIF` | com.compuserve.gif |
| `JPEG2000` | public.jpeg-2000 |
| `BMP` | com.microsoft.bmp |
| `WebP` | org.webmproject.webp |
| `SVG` | public.svg-image |
| `PDF` | com.adobe.pdf |

`with properties` accepts an `export options` record (compression quality, color profile, etc. — undocumented as of FCP 12.2 SDEF).

### Resize image

```applescript
tell document "name" to resize image width 1920 height 1080 resolution 72
```

All three params optional. Resolution in pixels per inch.

### Crop

```applescript
tell document "name" to crop bounds {x, y, width, height}
```

`delete mode true` deletes cropped pixels (default false hides them).

### Rotation + flip

- `rotate 180`, `rotate right`, `rotate left`
- `flip horizontally`, `flip vertically`

### Selection + color ops

`select all`, `deselect`, `select color range`, `refine selection`, `smart refine selection`, `pick color`, `replace text`, plus full layer manipulation. Out of v1.3 scope; revisit when the use case appears.

## Document lifecycle

Opens via standard `open` command (inherits CocoaStandard suite).

### Document name quirk (Pixelmator strips the extension)

**The document name in Pixelmator is the filename WITHOUT extension.** Verified 2026-05-04 against Pixelmator Pro 4.2: opening `/path/test-pattern.png` produces a document named `test-pattern`, not `test-pattern.png`. Subsequent tell-blocks must address it by the stripped name, or by `front document`.

The robust pattern is to **query the document name from Pixelmator after opening**, instead of inferring from the source path:

```applescript
tell application id "com.apple.pixelmator"
  activate
  open POSIX file "/Users/x/photo.jpg"
  delay 1.5
  return name of front document
end tell
```

The returned name is the canonical handle for `tell document "name" to ...` calls.

```applescript
tell application id "com.apple.pixelmator"
  tell document "photo" to export to ...
  close document "photo" saving no
end
```

Open is async — Pixelmator may take 1+ seconds to register the document. Our runner uses a 1.5s `delay` after open (sometimes needs more for large files; bump if you see "Can't get document" errors).

## Bundle ID rename

Stock Pixelmator Pro app file is `Pixelmator Pro.app` with bundle ID `com.pixelmatorteam.pixelmator-pro`. The Creator Studio bundle renames the file to `Pixelmator Pro Creator Studio.app` AND changes the bundle ID to `com.apple.pixelmator` (post-Apple-acquisition namespace). Confirm via:

```bash
mdls -name kMDItemCFBundleIdentifier "/Applications/Pixelmator Pro Creator Studio.app"
```

The sdef inside the bundle still uses the `com.pixelmatorteam.pixelmator-pro.*` access-group identifiers — internal Pixelmator naming Apple hasn't rewritten. It works fine.

## Text layer and shape layer authoring — pitfalls (Pixelmator Pro 4.2)

**Root cause of v1.7.0–v1.7.3 solid-color-only brand cards, confirmed 2026-05-05.**

### Pitfall 1: rectangle class name (the root bug)

`make new rectangle` errors with -2710 "Can't make class rectangle" — the AppleScript class name is `rectangle shape layer`. The error is non-fatal (silently caught), which masks the failure and produces an empty/fallback document.

```applescript
-- WRONG — error -2710, silently swallowed
make new rectangle at beginning of layers with properties {width:100, height:100}

-- CORRECT
make new rectangle shape layer at beginning of layers with properties ¬
  {name:"bg", position:{0, 0}, width:1920, height:1080}
```

All shape class names follow the `<shape> shape layer` pattern: `rectangle shape layer`, `rounded rectangle shape layer`, `ellipse shape layer`, `polygon shape layer`, `star shape layer`, `line shape layer`.

### Pitfall 2: text styling (correct — `tell text content of layer`)

`text content` IS a `rich text` class (not a plain string). `tell text content of t` works correctly in Pixelmator Pro 4.2 — this is Pixelmator's own canonical sdef example. Verified by round-trip: set size to 96, read back 96.

```applescript
set t to make new text layer at beginning of layers ¬
  with properties {name:"title", text content:"Creator Studio OS"}
tell text content of t
  set its size to 96
  set its color to {57568, 57568, 57568}  -- 16-bit: #E0E0E0 × 257
  set its font to "SF Pro Display"
end tell
set horizontal alignment of t to center   -- alignment is a text-layer property, not rich-text
set position of t to {960, 540}
```

The `horizontal alignment` and `vertical alignment` properties live on the text layer itself, not on rich text — set them on `t`, not inside the `tell text content of t` block.

### Full working example (1920×1080 titled brand card)

```applescript
tell application id "com.apple.pixelmator"
  set newDoc to make new document with properties {width:1920, height:1080, resolution:72}
  tell newDoc
    set bgLayer to make new rectangle shape layer at beginning of layers ¬
      with properties {name:"bg", position:{0, 0}, width:1920, height:1080}
    set fill color of styles of bgLayer to {6939, 6939, 11799}   -- #1B1B2E × 257
    set t to make new text layer at beginning of layers ¬
      with properties {name:"title", text content:"Creator Studio OS"}
    tell text content of t
      set its size to 96
      set its color to {57568, 57568, 57568}   -- #E0E0E0 × 257
    end tell
    set horizontal alignment of t to center
    set position of t to {960, 540}
    export to (POSIX file "/tmp/card.png") as PNG
  end tell
  close newDoc saving no
end tell
```

Produces a PNG with luminance stddev ≈ 11–15 at 320×180 (text visible). Solid-color output = stddev ≈ 0. Run `CSOS_MANUAL=1 npx vitest run tests/pixelmator-text-card.repro.test.ts` to verify in isolation.

---

## Top-level commands easy to miss

Easy to overlook when scanning the dictionary by suite — these are NOT layer methods:

- `detect face` — returns face rectangles for an open document
- `detect QR code` — extracts QR / barcode payloads
- `replace text` — global text replacement across all text layers in a document

## Shortcuts.app — the parallel automation channel

Pixelmator ships **28 Shortcuts.app actions** ([MacRumors 2021-10-26](https://www.macrumors.com/2021/10/26/pixelmator-pro-2-2-monterey-support-28-shortcuts/)) including ML knobs that are **NOT** exposed via sdef:

- `Increase Resolution of Image` (ML upscale)
- `Match Colors of Images` (ML color matching)
- `Optimize Image for Web`
- `Overlay Image`
- `Remove Background from Portrait Photo` (ML cutout)
- `Replace Layer in Document`
- `Replace Text in Document`

A `pixelmator_run_shortcut` bridge (via `shortcuts run "<name>"` CLI) would expose ML capabilities the AppleScript surface alone can't reach. On the roadmap.

## Standalone vs Creator Studio bundle ID

Both **Pixelmator Pro 3.8 standalone** and **Pixelmator Pro 4.2 (Creator Studio)** ship as `com.apple.pixelmator` post-acquisition (Apple completed Pixelmator acquisition [2025-02-11](https://www.macrumors.com/2025/02/11/apple-completes-pixelmator-acquisition/)). Two installs **can coexist** — disambiguate by version string, not by bundle ID.

The sdef internals still use `com.pixelmatorteam.pixelmator-pro.*` access-group identifiers (Pixelmator's pre-acquisition namespace) that Apple hasn't rewritten. Functionally identical.

Last reviewed: 2026-05-04 against Pixelmator Pro 4.2 (Creator Studio).
