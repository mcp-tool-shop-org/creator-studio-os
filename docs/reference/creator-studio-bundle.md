# Apple Creator Studio bundle

## App naming vs. bundle IDs (observed 2026-05-04, FCP 12.2)

The Apple Creator Studio subscription renames each app file to `<App> Creator Studio.app`, but **bundle identifiers and bundle internals are identical to the standalone App Store apps**.

| App file | Bundle ID | Version |
|----------|-----------|---------|
| Final Cut Pro Creator Studio.app | `com.apple.FinalCutApp` | 12.2 |
| Compressor Creator Studio.app | `com.apple.CompressorApp` | 5.2 |
| Motion Creator Studio.app | `com.apple.motionappApp` | 6.2 |
| Logic Pro Creator Studio.app | `com.apple.mobilelogic` | 12.2 |
| MainStage Creator Studio.app | (not measured) | (not measured) |
| Pixelmator Pro Creator Studio.app | (not measured) | (not measured) |
| Keynote Creator Studio.app | (not measured) | (not measured) |
| Pages Creator Studio.app | (not measured) | (not measured) |
| Numbers Creator Studio.app | (not measured) | (not measured) |

## Implications for automation

- **Always reference apps by bundle ID, not by file name.** `tell application id "com.apple.FinalCutApp"` works for both Creator Studio and standalone installs.
- `open -b <bundle-id> path/to/file.ext` is locale-and-rename-independent.
- The app paths (`/Applications/Final Cut Pro Creator Studio.app`) ARE different — anything that needs a path (DTD validation, sdef inspection) must point at the renamed bundle.

## Subscription validation

Compressor's CLI invocation prints `Validating Purchase...` before doing work — slow and brittle from automation. Other apps haven't been observed to do this from the CLI/AppleScript surface. See [`compressor-cli.md`](./compressor-cli.md).

## How to get current version + bundle ID for any app

```bash
mdls -name kMDItemCFBundleIdentifier -name kMDItemVersion "/Applications/<App> Creator Studio.app"
```

Last reviewed: 2026-05-04.
