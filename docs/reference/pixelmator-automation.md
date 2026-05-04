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

Opens via standard `open` command (inherits CocoaStandard suite). After opening, the document name is the filename without the path. AppleScript references the document by name:

```applescript
tell application id "com.apple.pixelmator"
  open POSIX file "/Users/x/photo.jpg"
  -- now: document "photo.jpg" is open
  tell document "photo.jpg" to export to ...
  close document "photo.jpg"
end
```

Note the implicit lifecycle: open creates a document; tell-block addresses it by filename; close finalizes.

## Bundle ID rename

Stock Pixelmator Pro app file is `Pixelmator Pro.app` with bundle ID `com.pixelmatorteam.pixelmator-pro`. The Creator Studio bundle renames the file to `Pixelmator Pro Creator Studio.app` AND changes the bundle ID to `com.apple.pixelmator` (post-Apple-acquisition namespace). Confirm via:

```bash
mdls -name kMDItemCFBundleIdentifier "/Applications/Pixelmator Pro Creator Studio.app"
```

The sdef inside the bundle still uses the `com.pixelmatorteam.pixelmator-pro.*` access-group identifiers — internal Pixelmator naming Apple hasn't rewritten. It works fine.

Last reviewed: 2026-05-04 against Pixelmator Pro 4.2 (Creator Studio).
