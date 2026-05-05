# Claude — creator-studio-os instructions

## Before changing FCPXML, AppleScript, or app-bundle code

**Read [`docs/reference/`](./docs/reference/) first.** It captures non-obvious facts about FCP's automation surface that aren't in Apple's public docs and aren't visible from the source code:

- [`fcpxml.md`](./docs/reference/fcpxml.md) — schema versions, time format, round-trip gotchas
- [`applescript-surface.md`](./docs/reference/applescript-surface.md) — FCP's AppleScript is read-only; here's exactly what's exposed
- [`creator-studio-bundle.md`](./docs/reference/creator-studio-bundle.md) — bundle IDs vs. renamed app files
- [`automation-permission.md`](./docs/reference/automation-permission.md) — when macOS prompts vs. doesn't
- [`compressor-cli.md`](./docs/reference/compressor-cli.md) — why Compressor is deferred

## Before editing any tool description string

Read [`docs/reference/tool-descriptions.md`](./docs/reference/tool-descriptions.md) first. It defines the verb-first / wrapper-lead / partial-step conventions that keep tool-compass retrieval accurate. Phase 7 of the smoke harness enforces these: a description that drops its target tool out of top-3 (score > 0.4) fails the smoke. Fix the description — don't weaken the gate.

## Document what you learn

When you discover something non-obvious about FCP, Compressor, Logic, Motion, Pixelmator, Keynote, Pages, or Numbers — *especially* something that took you fifteen minutes to figure out — **add or update an entry in `docs/reference/`** before moving on. The file format is intentionally lightweight: lead with the non-obvious fact, cite the evidence (file paths, sdef contents, terminal output), date the observation, note the FCP version. Future-Claude (and future-Mike) will work faster because of it.

The anti-pattern: writing summaries of what's already in the README or the code. Reference is only valuable when it captures **what you can't read off the source.**

## Hard constraints

- **macOS only.** `os: ["darwin"]` in `package.json`. CI uses `npm ci --force` to bypass on Linux runners. Don't remove the constraint.
- **No network calls in the runtime.** DTD validation reads the bundled DTD inside the FCP app. Anything that calls a remote service requires a design discussion first.
- **Always reference apps by bundle ID** in AppleScript and `open` — not by app file name. The Creator Studio bundle renames `*.app` files but keeps stock bundle IDs.
- **AppleScript strings must go through `escapeAppleScriptString`** before interpolation. We've documented the injection mitigation in `SECURITY.md` and `docs/threat-model.md`; don't break it.
- **FCPXML attribute strings must go through `escapeXmlAttr`** in `src/fcpxml/builder.ts`.
- **No raw stack traces in tool errors.** Use `CreatorStudioError` with a structured `{ code, message, hint }` shape. Add new codes to `src/errors.ts` if needed.

## Data directory

Default `/Volumes/T9-Shared/AI/creator-studio/`. Override via `CREATOR_STUDIO_DATA_DIR`. Schema: `projects/<name>/{footage,audio,images,brand,refs,fcp,out}/` plus `shared/{brand,presets}/`. The schema is enforced by `src/projects/resolve.ts`.

## Test discipline

- `npm test` must pass — 16+ tests, all in `tests/`.
- `npm run typecheck` must pass.
- `creator-studio-os verify` must pass on the host that builds it.
- The `verify` command's FCPXML round-trip via `xmllint` against the bundled DTD is the strongest local signal that the builder still produces valid output. Don't ship if it fails.

## Publish discipline

- **HELD until the product is complete.** Mike's call, not yours.
- **Target org when published: `@creator-studio-os` on npm**, NOT `@mcptoolshop`. The package.json currently reads `@mcptoolshop/creator-studio-os` from the initial scaffold — must be renamed before publish.
- Use `npm publish --provenance` (already wired in `.github/workflows/publish.yml`).

## When making decisions

- **Don't downscope** when Mike asks for the ambitious thing. He has LLM-crew leverage and is building the studio one tool at a time.
- **Don't scaffold workflows that don't exist yet.** v1 is FCP. v1.1 is Compressor. v2.0 is cross-app composition protocols. Stick to the roadmap or update it explicitly.
- **Don't add features beyond the task.** A bug fix doesn't need surrounding cleanup.

## Memory

There's a memory entry at `~/.claude/projects/-Volumes-T9-Shared-AI/memory/creator-studio-os.md` with the canonical status, key non-obvious facts, and the publish-target reminder. Read it at session start when working on this repo.

There's also a Claude Code skill at `~/.claude/skills/creator-studio-os/SKILL.md` that primes future sessions when this repo's keywords come up.
