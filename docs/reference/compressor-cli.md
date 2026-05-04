# Compressor CLI

## TL;DR

Compressor's CLI is **gated by App Store / subscription entitlement validation**. The binary is at `/Applications/Compressor Creator Studio.app/Contents/MacOS/Compressor` and prints `Validating Purchase...` on every CLI launch before doing any work. Slow and brittle for automation. **Deferred to v1.1.**

## What we tried (2026-05-04)

```bash
"/Applications/Compressor Creator Studio.app/Contents/MacOS/Compressor" -h
"/Applications/Compressor Creator Studio.app/Contents/MacOS/Compressor" --help
"/Applications/Compressor Creator Studio.app/Contents/MacOS/Compressor" -help
```

All three returned only `Validating Purchase...` (preceded by a wall of objc class-collision warnings — a known macOS / Compressor quirk that doesn't affect operation).

## What probably works (untested)

The traditional Compressor CLI invocation form, documented for older standalone-Compressor releases:

```bash
Compressor -batchname <name> \
  -jobpath <input-file> \
  -settingpath <compressor-setting-file> \
  -locationpath <output-file>
```

Once entitlement validation completes (likely on first run after each system reboot or sign-in cycle), this form is supposed to queue an encode job. We have not validated this against the Creator Studio bundle.

## v1.1 plan

1. Run the app interactively at least once after each Apple-account sign-in to prime entitlement.
2. Then invoke the CLI form above.
3. Wrap as `compressor.encode` (one job) and `compressor.batch` (queue).

If entitlement validation proves intractable from the CLI, fall back to **`open -b com.apple.CompressorApp <setting>.compressorbatch`** — Compressor opens, sees the batch file, queues the encode in the GUI. Slower, less programmatic, but doesn't fight the validator.

## Alternatives

For pure ProRes / H.264 transcodes that don't need Compressor's filter chain, `ffmpeg` (already installed via Homebrew) does the job in seconds without any entitlement dance. Document that path as a fallback in the v1.1 README.

Last reviewed: 2026-05-04 against Compressor 5.2.
