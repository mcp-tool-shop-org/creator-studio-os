# Tool description conventions

Date: 2026-05-05  
Version scope: v1.6.1+

Tool descriptions are the ground truth that semantic retrieval systems (tool-compass, embedding-based routers) use to match user intent to the right tool. A weak description causes misroutes; a strong one makes the correct tool rank first.

## Rules

### 1. Verb-first, intent-language

Lead with what the *user* wants to accomplish, not with what the implementation does internally.

| Weak | Strong |
|------|--------|
| "Calls Compressor CLI with -jobpath flag" | "Submit a single encode job to Compressor's queue" |
| "Parses .compressorsetting XML plist" | "Parse a .compressorsetting file and return structured codec, bitrate, dimensions, color metadata" |
| "Runs osascript to resize document" | "Change the dimensions of an open Pixelmator document" |

### 2. Lead with the wrapper declaration

When a tool is a convenience wrapper around another, say so in the *first clause*, not at the end.

```
Convenience wrapper around <primary_tool> for <context>.
<What it resolves/provides>. For <general-purpose use>, use <primary_tool> directly.
```

Example — `compressor_encode_project`:
> "Convenience wrapper around compressor_encode for csos project-scoped workflows. Resolves project paths and writes output to the project's out/ directory. For encoding an arbitrary file, use compressor_encode directly."

Without the wrapper declaration up front, embedding models can't distinguish the wrapper from the primary; both tools end up competing for the same queries.

### 3. Name the partial-step; point to the completion tool

When a tool does only part of an operation (returns data in memory, writes to a variable, outputs a string), explicitly say what it *doesn't* do and name the tool that completes it.

Pattern:
> "… Doesn't write to disk — pair with `<completion_tool>` for output."

Examples:
- `fcp_fcpxml_build`: "Returns the XML string without writing it."
- `pixelmator_resize`: "Doesn't write to disk — pair with `pixelmator_export` for output."
- `motion_render_via_compressor`: "Returns `jobId`+`batchId` for piping into `compressor_monitor_stream`."

### 4. Name the high-signal nouns

For tools that operate on specific file types, data structures, or UI surfaces, include the name. Embedding models are trained on real text; proper nouns (FCPXML, `.compressorsetting`, FCP inspector, HNSW, OZML) carry far more semantic weight than generic synonyms.

### 5. One sentence of mechanism is fine; one paragraph is not

One clause of implementation detail helps disambiguation (e.g. "via `Compressor -monitor -format json`" distinguishes from polling). A full paragraph of mechanism drowns the intent signal.

---

## Regression protection

Phase 7 of the smoke harness (`src/smoke/phases/p7-toolcompass-discoverability.ts`) runs 12 query→target pairs against a live tool-compass index. Any description change that drops a target tool out of the top-3 with score > 0.4 will fail the smoke.

Query fixtures: `tests/fixtures/toolcompass-queries.json`

Run the discoverability check:
```bash
npm run smoke -- --dry-run   # verifies harness shape
npm run smoke                 # runs all 7 phases including real tool-compass index
```

If a query fails, the diagnostic output shows:
```
FAIL query="..." expected=<tool> top3=[tool_a (0.712), tool_b (0.681), tool_c (0.534)]
```

Fix the description of the expected tool following the rules above, rebuild (`npm run build`), and re-run `tool-compass sync --force` before re-running the smoke.
