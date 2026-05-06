# Ship Gate

> No repo is "done" until every applicable line is checked.
> Copy this into your repo root. Check items off per-release.

**Tags:** `[all]` every repo · `[npm]` `[pypi]` `[vsix]` `[desktop]` `[container]` published artifacts · `[mcp]` MCP servers · `[cli]` CLI tools

**Repo type:** `[all]` `[npm]` `[mcp]` `[cli]`

---

## A. Security Baseline

- [x] `[all]` SECURITY.md exists (report email, supported versions, response timeline) (2026-05-06)
- [x] `[all]` README includes threat model paragraph (data touched, data NOT touched, permissions required) (2026-05-06)
- [x] `[all]` No secrets, tokens, or credentials in source or diagnostics output (2026-05-06)
- [x] `[all]` No telemetry by default — state it explicitly even if obvious (2026-05-06)

### Default safety posture

- [ ] `[cli|mcp|desktop]` SKIP: no destructive operations (delete, kill, format) in tool surface — all file ops write to CREATOR_STUDIO_DATA_DIR; macOS Automation permission is OS-gated. The --allow-* pattern applies to tools with rm/kill operations; csos has none.
- [x] `[cli|mcp|desktop]` File operations constrained to known directories (2026-05-06)
- [x] `[mcp]` Network egress off by default (2026-05-06)
- [x] `[mcp]` Stack traces never exposed — structured error results only (2026-05-06)

## B. Error Handling

- [x] `[all]` Errors follow the Structured Error Shape: `code`, `message`, `hint`, `cause?`, `retryable?` (2026-05-06)
- [x] `[cli]` Exit codes: 0 ok · 1 user error · 2 runtime error · 3 partial success (2026-05-06)
- [x] `[cli]` No raw stack traces without `--debug` (2026-05-06)
- [x] `[mcp]` Tool errors return structured results — server never crashes on bad input (2026-05-06)
- [x] `[mcp]` State/config corruption degrades gracefully (stale data over crash) (2026-05-06)
- [ ] `[desktop]` SKIP: not a desktop app
- [ ] `[vscode]` SKIP: not a VS Code extension

## C. Operator Docs

- [x] `[all]` README is current: what it does, install, usage, supported platforms + runtime versions (2026-05-06)
- [x] `[all]` CHANGELOG.md (Keep a Changelog format) (2026-05-06)
- [x] `[all]` LICENSE file present and repo states support status (2026-05-06)
- [x] `[cli]` `--help` output accurate for all commands and flags (2026-05-06)
- [x] `[cli|mcp|desktop]` Logging levels defined: silent / normal / verbose / debug — secrets redacted at all levels (2026-05-06)
- [x] `[mcp]` All tools documented with description + parameters (2026-05-06)
- [ ] `[complex]` SKIP: not a background daemon with daily ops / alert response modes

## D. Shipping Hygiene

- [x] `[all]` `verify` script exists (test + build + smoke in one command) (2026-05-06)
- [x] `[all]` Version in manifest matches git tag (2026-05-06)
- [x] `[all]` Dependency scanning runs in CI (`npm audit --audit-level=high` in ci.yml) (2026-05-06)
- [x] `[all]` Automated dependency update mechanism exists (dependabot.yml — monthly, grouped, max 3 PRs) (2026-05-06)
- [x] `[npm]` `npm pack --dry-run` includes: dist/, README.md, CHANGELOG.md, LICENSE (2026-05-06)
- [x] `[npm]` `engines.node` set (`>=20.0.0`) (2026-05-06)
- [x] `[npm]` Lockfile committed (package-lock.json) (2026-05-06)
- [ ] `[vsix]` SKIP: not a VS Code extension
- [ ] `[desktop]` SKIP: not a desktop app

## E. Identity (soft gate — does not block ship)

- [x] `[all]` Logo in README header (2026-05-06)
- [ ] `[all]` SKIP: polyglot-mcp run is a manual operator step (Mike runs locally — TranslateGemma 12B via Ollama, zero API cost). README.md is finalized; translated files committed after local run of translate-all.mjs.
- [x] `[org]` Landing page (@mcptoolshop/site-theme) (2026-05-06)
- [x] `[all]` GitHub repo metadata: description, homepage, topics (2026-05-06)

---

## Gate Rules

**Hard gate (A–D):** Must pass before any version is tagged or published.
If a section doesn't apply, mark `SKIP:` with justification — don't leave it unchecked.

**Soft gate (E):** Should be done. Product ships without it, but isn't "whole."

**Known supply-chain note (D3):** `npm audit --audit-level=high` exits 0 (no high/critical). 3 moderate vulns exist upstream in `@modelcontextprotocol/sdk` → `express-rate-limit` → `ip-address` (XSS in HTML-emitting methods). Fix requires downgrading SDK to 1.25.3 — a breaking change. Tracked upstream; dependabot will surface when fixed.
