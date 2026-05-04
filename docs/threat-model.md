# Threat model

## Assets

1. **User footage / audio / brand assets** in the data directory.
2. **Final Cut Pro libraries** (`.fcpbundle`) — ours or the user's pre-existing ones.
3. **The user's macOS account** — anything `osascript` and `open` can do, this server can do too.

## Adversaries

- **Malicious project specs** — a caller (LLM or human) hands the server a crafted JSON spec.
- **Malicious file paths** — a caller asks the server to `fcp_fcpxml_import` an arbitrary path.
- **Compromised dependencies** — `@modelcontextprotocol/sdk` or `zod`.

## Attack surfaces

### A. AppleScript injection

The server interpolates strings (library / event / project names) into AppleScript snippets sent to `osascript`. Naive interpolation would let a caller break out with a `"` and execute arbitrary AppleScript.

**Mitigation:** all user-provided strings pass through `escapeAppleScriptString` (escapes `\` and `"`). AppleScript snippets are static templates with escaped fillers. We never use `do shell script`.

### B. Path traversal

`fcp_fcpxml_write` accepts a `filename` argument. If a caller passes `../../../etc/foo`, it could write outside the project's `fcp/` directory.

**Mitigation:** the server resolves the target with `join(proj.paths.fcp, filename)` and refuses absolute paths in v1 — relative paths are pinned under `fcp/`. Tightening: a future version will reject `..` segments explicitly.

`fcp_fcpxml_import` accepts an absolute path so the user can hand FCP an FCPXML written elsewhere. **This is by design** — the tool is the trusted-on-macOS user's automation surface, not a sandbox. Clients exposing this server to less-trusted callers should restrict imports at the client layer.

### C. FCPXML injection / parser bugs

A malicious spec could contain unescaped XML payloads that get pasted into the document.

**Mitigation:** all string fields go through `escapeXmlAttr` before interpolation. Numeric fields go through Zod validation (positive duration, valid frame rate, etc.) before reaching the builder.

### D. Resource exhaustion

A spec with thousands of clips would produce a multi-megabyte FCPXML. The DTD validator (`xmllint`) handles large docs but slowly.

**Mitigation:** none in v1 — caller's responsibility. v1.1 may add a max-clip-count limit configurable via env var.

### E. Supply chain

- `@modelcontextprotocol/sdk` — upstream-audited, official Anthropic package.
- `zod` — widely used, audited.
- We publish with `npm publish --provenance` so consumers can verify the publisher.

### F. AppleScript timeouts / hung FCP

A hung Final Cut Pro instance could leave `osascript` waiting indefinitely.

**Mitigation:** all `osascript` invocations have a 30-second default timeout (overridable). Exceeded timeouts kill the child and return `E_OSASCRIPT_FAILED`.

### G. Automation permission misuse

Once the user grants Automation permission to the parent process (terminal / Claude Desktop), any code in that process can drive FCP.

**Mitigation:** this is a macOS-level decision, not ours. We document it clearly in `SECURITY.md` and in the verify output.

## Out of scope

- Defense against the user's MCP client itself being compromised
- Defense against malicious modifications to the Final Cut Pro app bundle
- Sandboxing untrusted FCPXML beyond what FCP itself does on import
