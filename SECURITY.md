# Security

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.7.x   | ✅ Current |
| < 1.7   | ❌ End of life |

## Reporting

If you find a vulnerability, please email **64996768+mcp-tool-shop@users.noreply.github.com** or open a private security advisory at https://github.com/mcp-tool-shop-org/creator-studio-os/security/advisories.

**Response timeline:** We acknowledge reports within 48 hours and aim to patch critical issues within 7 days of confirmation.

## Threat model summary

`creator-studio-os` runs locally on macOS. It:

- Spawns `osascript` with AppleScript snippets that target Final Cut Pro by bundle ID (`com.apple.FinalCutApp`)
- Spawns `open` with file paths and an app bundle ID to hand FCPXML to Final Cut Pro
- Reads from and writes to a configurable **data directory** (default `/Volumes/T9-Shared/AI/creator-studio`)
- Reads the bundled FCPXML DTD from the Final Cut Pro app bundle for offline validation
- Optionally invokes `xmllint` (if present) for DTD validation

It does **not**:

- Open network connections (no telemetry, no analytics, no remote validation)
- Modify any system files outside its data directory
- Mutate Final Cut Pro libraries on disk (FCP imports FCPXML via its own UI flow; we don't touch `.fcpbundle` internals)
- Persist credentials, tokens, or user data

## Trust boundaries

| Boundary | Trust | Notes |
|----------|-------|-------|
| MCP client → server | trusted | The MCP transport is stdio; only the parent process can speak to the server. |
| Server → AppleScript | trusted | All scripts are server-authored. User-provided strings (e.g. library names) are escaped before interpolation. |
| Server → file system | scoped | Reads/writes inside `CREATOR_STUDIO_DATA_DIR` and reads from the FCP app bundle. The `fcp_fcpxml_import` tool can open ANY absolute path the caller provides — treat paths from untrusted callers with care. |
| Server → FCP | trusted | macOS Automation permission must be granted by the user the first time. |

## AppleScript injection

User-provided strings (project / event / library names) are passed through `escapeAppleScriptString` before interpolation into AppleScript snippets. This blocks injection via `"` or `\` characters. Strings are never used in `do shell script` contexts.

## File system safety

- The data directory is configurable but must be writable by the user.
- `fcp_fcpxml_write` writes inside `projects/<name>/fcp/` and refuses to traverse outside it via filename validation in the project resolver.
- `fcp_fcpxml_import` accepts any absolute path. If you expose this server to a less-trusted caller, restrict to paths inside the data directory at the client layer.

## Permissions

The server requires:

- Read access to `/Applications/Final Cut Pro Creator Studio.app/` (or wherever FCP is installed)
- Read/write access to the data directory
- macOS Automation permission for the parent process → Final Cut Pro (granted once via System Settings)

It does **not** require Full Disk Access, network access, or admin privileges.

## Supply chain

- Dependencies: `@modelcontextprotocol/sdk`, `zod` — both audited upstream
- npm provenance enabled on publish (`npm publish --provenance`)
- Pinned major versions in `package.json`
