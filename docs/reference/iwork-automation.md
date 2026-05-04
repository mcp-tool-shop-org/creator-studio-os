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

## Per-app gotchas (worth knowing before you author)

### Keynote

- **`make new slide`** is the spine for slide authoring. Variants: `at the beginning of slides`, `at after slide N`. Returns a slide reference for chaining.
- **Theme swapping on existing documents IS supported** despite [`iworkautomation.com/keynote/theme.html`](https://iworkautomation.com/keynote/theme.html) only documenting theme discovery. Confirmed via competing MCP servers.
- **Shape text uses `object text:` key**, not `text:` — distinct from Pages.
- **Default shapes spawn very small** — set width/height in the same `with properties` record or they're invisible.
- **Font >48pt clipping bug**: create text box, *resize first*, then set text. Reverse order clips.
- **`password` export property silently no-ops on PNG/JPEG** — only valid for PDF.
- **`tell the slide`** silently fails. Must nest: `tell document N → tell slide N → make new shape`.

### Pages

- **`body text` is a property, not a class.** Page-layout documents have no default text flow; writes silently fail. Always gate on the `document body` boolean before writing.
- **`every word of body text where ...` hangs Pages.** Always traverse `every paragraph` first.
- **Insertion-point coercion** is the #1 forum complaint ("Can't make insertion point into type location reference"). Wrap text references in parentheses.
- **Mail merge (12.1+)** requires a Numbers spreadsheet, not CSV. Letters / cards / envelopes only — **no labels, no multi-record-per-page** ([TidBITS](https://tidbits.com/2022/06/30/apple-brings-mail-merge-back-to-pages/)). For CSV input, route through an ephemeral Numbers doc.
- **Image insertion is the universal weak point.** `make new image with properties {file:, position:, width:, height:}` works on some versions; others require pasteboard insertion with unpredictable placement ([developer.apple.com forums](https://developer.apple.com/forums/thread/103309), [macscripter](https://www.macscripter.net/t/inserting-an-image-into-a-pages-document/76947)). [SpillwaveSolutions](https://github.com/SpillwaveSolutions/automating-mac-apps-plugin) confirms: "Pages testing showed limited success — only basic text could be added, images could be pasted but placement could not be predicted."
- **Page-layout vs word-processing** — page-layout has no text layer; `body text` paths must short-circuit. All writes go through text boxes/tables.

### Numbers

- **Formulas are write-only.** Setting `value` of a cell to `"=SUM(B2:B10)"` works; reading `value` back returns the *computed result*, not the formula text ([discussions.apple.com](https://discussions.apple.com/thread/250480317)). Track formulas in your own state — don't round-trip through Numbers.
- **`value` vs `formatted value`**: `value` is the typed primitive (number / text / date / bool); `formatted value` is the displayed string with currency, separators, etc. Don't conflate.
- **No chart sdef.** Confirmed in [discussions.apple.com 3290589](https://discussions.apple.com/thread/3290589) — chart creation via sdef is technically possible but **chart titles, labels, and colors are not exposed**. Styling requires GUI scripting (System Events) — fragile.
- **Excel round-trip degrades silently.** Numbers-specific functions (DURATION, RAWVALUE, regex flavor in TEXTBETWEEN) don't survive. Charts round-trip as static images. Document our `numbers_export` to Excel as "lossy but live" — recommend [`numbers-parser`](https://pypi.org/project/numbers-parser/) + openpyxl for fidelity-critical reports.
- **`password` export property** is supported on PDF and Excel exports but not CSV.

### Cross-app

- **osascript startup is ~400ms**, so compound tools matter for batch work in iWork. `iwork_mcp` bundles compound ops (`numbers_create_sheet_with_table`, etc.) — worth porting that pattern when we close the gap.
- **iCloud Drive sync** can race AppleScript saves. Force local paths or pause sync during batch jobs.
- **Keynote 09 / Pages 09 / Numbers 09 sdefs are incompatible** with the modern dictionaries. Modern scripts assume iWork 5+ suites. Check `version` of app before dispatch if you support legacy.

## Competing MCP servers

| Server | Scope | Position |
|--------|-------|----------|
| [reichenbach/iwork_mcp](https://github.com/reichenbach/iwork_mcp) | 113 tools across Keynote (41), Pages, Numbers — full slide authoring, theme swap, batch 2D table writes, formulas, charts (creation only), Apple Intelligence "magic fill" via UI | **The bar.** v0.8.6 (2026-02-15), JXA-based. We're behind — closing the gap is high priority. |
| [ByAxe/keynote-mcp](https://github.com/ByAxe/keynote-mcp) | ~30 Keynote tools incl. Unsplash integration, build-in animations via UI scripting | Recent, ~17 commits |
| [alexlock1/apple-numbers-mcp](https://github.com/alexlock1/apple-numbers-mcp) | 8 tools, narrow row-as-record style | Useful as a "dataframe over Numbers" reference |
| Pages skill / plugin only | No full MCP server exists for Pages yet | We're first with a typed MCP shape |

Last reviewed: 2026-05-04 against Keynote / Pages / Numbers 15.2 (Creator Studio).
