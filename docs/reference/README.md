# Reference (institutional knowledge — keep adding)

This directory is a **living record** of what we've learned about Apple Creator Studio apps and how their automation surfaces actually behave. Apple's published docs are thin and partial; the *real* behavior lives in `.sdef` files inside the app bundles, in DTDs bundled with the apps, and in what fails when you try to script the apps.

> **For future Claude (and future Mike):** when you discover something non-obvious about FCP, Compressor, Logic, Motion, Pixelmator, Keynote, Pages, or Numbers — *especially* something that took you fifteen minutes to figure out — **document it here** before moving on. One file per topic, short, factual, dated. Future-you (or future-Claude) will thank you.

## How to add an entry

1. Pick a short slug for the topic (`fcpxml.md`, `applescript-surface.md`, `compressor-cli.md`).
2. Lead with the **non-obvious fact** in the first paragraph.
3. Cite the evidence — file paths inside app bundles, exact AppleScript output, terminal commands you ran.
4. If the fact has a date sensitivity (Apple changed something in FCP 12.3, etc.), note the date and the FCP version you observed it in.
5. Cross-link from the README and from the relevant code if the fact constrains the implementation.

## Current entries

- [`fcpxml.md`](./fcpxml.md) — schema versions, bundled DTDs, known round-trip gotchas
- [`applescript-surface.md`](./applescript-surface.md) — what FCP's `ProEditor.sdef` actually exposes (read-only)
- [`creator-studio-bundle.md`](./creator-studio-bundle.md) — Apple Creator Studio app file naming vs. bundle IDs
- [`automation-permission.md`](./automation-permission.md) — macOS Automation permission grant flow
- [`compressor-cli.md`](./compressor-cli.md) — why Compressor CLI is gated and what to expect

## Anti-pattern

Don't write summaries of what's "in the README" or "in the code." Reference is only valuable when it captures **what you can't read off the source.**
