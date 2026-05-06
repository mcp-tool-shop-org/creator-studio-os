<!--
Thanks for contributing to Creator Studio OS.
Pre-flight checklist below — please tick everything that applies.
-->

## What

<!-- One-paragraph summary of the change. -->

## Why

<!-- What problem does this solve? Link the issue if there is one. -->

## How

<!-- Implementation notes worth flagging — non-obvious decisions, tricky parts. -->

## Affected packages

<!-- Tick all that apply -->

- [ ] `@creator-studio-os/core`
- [ ] `@creator-studio-os/compressor`
- [ ] `@creator-studio-os/fcp`
- [ ] `@creator-studio-os/iwork-docs`
- [ ] `@creator-studio-os/keynote`
- [ ] `@creator-studio-os/logic`
- [ ] `@creator-studio-os/motion`
- [ ] `@creator-studio-os/pixelmator`
- [ ] `@creator-studio-os/protocols`
- [ ] `@creator-studio-os/creator-studio-os` (umbrella CLI)
- [ ] Workspace root / docs / CI

## Pre-flight

- [ ] `npm test` passes (1173+ tests)
- [ ] `npm run typecheck` clean
- [ ] `npm run build` clean
- [ ] Coverage on touched packages still ≥ 75% line / 75% branch
- [ ] If touching FCPXML / AppleScript / OZML — read `docs/reference/` first
- [ ] If touching tool descriptions — top-3 retrieval still passes (`docs/reference/tool-descriptions.md`)
- [ ] CHANGELOG entry added under Unreleased
- [ ] No raw stack traces — errors use `CreatorStudioError`
- [ ] `escapeAppleScriptString` used on all interpolated AppleScript strings
- [ ] `escapeXmlAttr` used on all FCPXML attribute strings

## Screenshots / output

<!-- For visual or rendered output changes (Pixelmator brand cards, Motion templates,
     Compressor encodes), attach a sample. -->

## Related

<!-- Linked issues, prior PRs, docs. -->
