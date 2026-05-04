# iWork automation (Keynote / Pages / Numbers)

## TL;DR

All three iWork apps ship a **rich, near-identical AppleScript surface** with `Keynote.sdef`, `Pages.sdef`, and `Numbers.sdef` inside their respective bundles. The export command shape is the same: `tell document "name" to export to <file> as <format> with properties <opts>`.

Bundle IDs (Apple capitalized namespace, post-rename):

| App | Bundle ID | Version (Creator Studio) |
|-----|-----------|--------------------------|
| Keynote | `com.apple.Keynote` | 15.2 |
| Pages | `com.apple.Pages` | 15.2 |
| Numbers | `com.apple.Numbers` | 15.2 |

Sdef paths:

```
/Applications/Keynote Creator Studio.app/Contents/Resources/Keynote.sdef
/Applications/Pages Creator Studio.app/Contents/Resources/Pages.sdef
/Applications/Numbers Creator Studio.app/Contents/Resources/Numbers.sdef
```

## Export format enums

### Keynote

| AppleScript literal | Output |
|---------------------|--------|
| `PDF` | PDF document |
| `slide images` | folder of slide images (PNG / JPEG / TIFF; pass via `with properties {image format:PNG}`) |
| `QuickTime movie` | self-contained .mov |
| `Microsoft PowerPoint` | .pptx |
| `HTML` | static HTML site |
| `Keynote 09` | legacy .key bundle |

### Pages

| AppleScript literal | Output |
|---------------------|--------|
| `PDF` | PDF document |
| `Microsoft Word` | .docx |
| `formatted text` | RTF |
| `unformatted text` | plain UTF-8 text |
| `EPUB` | EPUB ebook |
| `Pages 09` | legacy .pages |

### Numbers

| AppleScript literal | Output |
|---------------------|--------|
| `PDF` | PDF document |
| `Microsoft Excel` | .xlsx |
| `CSV` | comma-separated values |
| `Numbers 09` | legacy .numbers |

## Document-name quirk

Same as Pixelmator: opening `presentation.key` produces a document named `presentation` (extension stripped). Always query `name of front document` after opening, not the path basename. Our `iwork/shared.ts` helper does this automatically.

## Export options properties

The `with properties` parameter accepts an `export options` record. The keys differ per app and per format. Examples we've used:

- Keynote `slide images`: `{image format:PNG}` (or JPEG / TIFF)
- Numbers Excel export supports `exclude summary worksheet:true`
- Pages PDF supports `image quality:Best` (`Good` / `Better` / `Best`)
- Most formats support `password:"..."` to encrypt output

Keys are case-sensitive AppleScript identifiers. Inspect the per-app sdef when you need a specific option:

```bash
grep -A 5 'record-type name="export options"' /Applications/Keynote\ Creator\ Studio.app/Contents/Resources/Keynote.sdef
```

## Cross-app pattern

The shared lifecycle pattern across iWork:

```applescript
tell application id "<bundle-id>"
  activate
  open POSIX file "/path/to/doc"
  delay 1.5
  set docName to name of front document
  tell document docName to export to (POSIX file "/path/out.pdf") as PDF
  close document docName saving no
end tell
```

Implemented once in `src/apps/iwork/shared.ts`; each per-app tools.ts wires it to the right bundle ID and format enum.

Last reviewed: 2026-05-04 against Keynote / Pages / Numbers 15.2 (Creator Studio).
