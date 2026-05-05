# Tool-compass discoverability audit — csos v1.6.0

> **Question:** with [`@mcptoolshop/tool-compass`](https://github.com/mcp-tool-shop-org/tool-compass) as the semantic gateway in front of csos's MCP surface, are csos's 78 tool descriptions findable by intent?
>
> **Method:** point a fresh `tool-compass` install at csos's stdio MCP server, sync the index, run 12 representative intent queries, record top-3 hits.
>
> **Result:** 8/12 (67%) target at #1, 11/12 (92%) in top-2, 12/12 (100%) in top-3. **No outright misses.** Descriptions are largely well-shaped for semantic search; three targeted polishes clear the near-misses. **A full description rewrite is NOT a Phase 2 prerequisite.**

## How the audit was run

```bash
# Fresh isolated install (tool-compass v2.2.2)
python3 -m venv venv && source venv/bin/activate
pip install tool-compass

# Config: csos as a stdio backend
cat > compass_config.json <<EOF
{
  "backends": {
    "csos": {
      "type": "stdio",
      "command": "node",
      "args": ["/Volumes/T9-Shared/AI/creator-studio-os/dist/cli.js", "serve"]
    }
  },
  "embedding_model": "nomic-embed-text",
  "default_top_k": 5,
  "min_confidence": 0.0
}
EOF

# Build the HNSW index — 78 tools embedded in 1.35s
TOOL_COMPASS_CONFIG=$PWD/compass_config.json tool-compass sync --force

# Run each query: tool-compass search "<intent>" --top 3 --json
```

Environment: tool-compass 2.2.2 / Python 3.14.4 / nomic-embed-text (768-dim) / Ollama local. All on macOS 26.4.1 arm64.

## Results — 12 intent queries

| # | Intent | Target tool | Top-3 (rank — tool — score) | Hit |
|---|--------|-------------|------------------------------|-----|
| 1 | encode a video file with a Compressor preset | `compressor_encode` | 1 — compressor_encode_project — 0.694 ; 2 — compressor_encode — 0.651 ; 3 — compressor_settings_inspect — 0.649 | ⚠️ #2 |
| 2 | monitor an active encode for live progress | `compressor_monitor_stream` | 1 — compressor_monitor_stream — 0.677 ; 2 — compressor_encode — 0.600 ; 3 — compressor_settings_inspect — 0.588 | ✅ #1 |
| 3 | list available Compressor encoding presets | `compressor_settings_list` | 1 — compressor_settings_list — 0.738 ; 2 — compressor_codec_availability — 0.660 ; 3 — compressor_settings_inspect — 0.615 | ✅ #1 |
| 4 | set a parameter value on a Motion template | `motion_template_set_param` | 1 — motion_template_set_param — 0.675 ; 2 — fcp_bind_motion_param — 0.650 ; 3 — motion_publish_to_fcp — 0.642 | ✅ #1 |
| 5 | render a Motion template headlessly to a video file | `motion_render_via_compressor` | 1 — motion_render_via_compressor — 0.672 ; 2 — motion_template_clone — 0.630 ; 3 — motion_template_inspect — 0.628 | ✅ #1 |
| 6 | publish a Motion parameter so it appears in FCP inspector | `motion_publish_to_fcp` | 1 — motion_publish_to_fcp — 0.761 ; 2 — fcp_bind_motion_param — 0.626 ; 3 — motion_template_inspect — 0.623 | ✅ #1 |
| 7 | validate that a Motion template will not corrupt on import | `motion_template_validate` | 1 — motion_template_validate — 0.699 ; 2 — motion_template_inspect — 0.657 ; 3 — fcp_fcpxml_validate — 0.649 | ✅ #1 |
| 8 | build a Final Cut Pro timeline with clips and titles | `fcp_fcpxml_build` | 1 — fcp_round_trip_diff — 0.626 ; 2 — fcp_project_metadata — 0.611 ; 3 — fcp_fcpxml_build — 0.595 | ⚠️ #3 |
| 9 | import an FCPXML file into Final Cut Pro | `fcp_fcpxml_import` | 1 — fcp_fcpxml_import — 0.707 ; 2 — fcp_fcpxml_build_write_import — 0.695 ; 3 — keynote_export_images — 0.598 | ✅ #1 |
| 10 | find every effect and title installed on this Mac | `fcp_effects_catalog` | 1 — fcp_effects_catalog — 0.698 ; 2 — compressor_app_open — 0.612 ; 3 — motion_template_inspect — 0.585 | ✅ #1 |
| 11 | check whether an FCPXML survived FCP round-trip cleanly | `fcp_round_trip_diff` | 1 — fcp_round_trip_diff — 0.637 ; 2 — fcp_round_trip_capture — 0.623 ; 3 — motion_template_validate — 0.539 | ✅ #1 |
| 12 | resize an image and export to WebP | `pixelmator_resize` | 1 — pixelmator_batch_export_project_images — 0.715 ; 2 — pixelmator_resize — 0.664 ; 3 — pixelmator_batch_export_project_images_dryrun — 0.655 | ⚠️ #2 |

Confidence range across all 36 hits: **0.539 — 0.761**. Within `nomic-embed-text`'s expected band for good matches (typically 0.5–0.8 on retrieval tasks). The proposed regression threshold (`score > 0.4`) leaves margin.

## What worked — pattern-confirming wins

- **Killer-chain tools cluster correctly.** Q4, Q5, Q6, Q11 all return their target #1 with 0.67–0.76 confidence. The deliberate language in those descriptions ("Pairs with `fcp_bind_motion_param` to close the killer chain", "first programmatic Motion render path in any MCP", "11 known FCP round-trip transformation types") gives the embedding strong, distinctive nouns to anchor on. Confirms intent-naming workflows in descriptions pays off.
- **Distinctive verbs win.** Q3 ("list … presets" → `compressor_settings_list` 0.738), Q9 ("import … into FCP" → `fcp_fcpxml_import` 0.707), Q10 ("find every effect" → `fcp_effects_catalog` 0.698). Verb at the start of the description anchors the match.
- **Related-tool clustering is healthy.** Q7's #2 (`motion_template_inspect`) and Q11's #2 (`fcp_round_trip_capture`) are both legitimate adjacent tools — co-locating them in the top-3 is a feature, not a bug. The LLM gets the canonical answer plus its closest siblings.
- **Wrapper/composite tools surface alongside primitives.** Q9 returns `fcp_fcpxml_import` #1 and `fcp_fcpxml_build_write_import` #2 — exposing both the granular tool and the convenience composite is the right behavior.

## What didn't — three targeted polishes

### Q1 — wrapper outranks the primitive

`compressor_encode_project` (0.694) at #1 vs `compressor_encode` (0.651) at #2. Both are valid for "encode a video file"; the wrapper wins because its description repeats both "project" and "encode" and ends with the wrapper note buried at the back: *"Convenience wrapper around compressor_encode."*

**Fix.** Lead the wrapper's description with the wrapper note, not bury it:

```diff
- Resolve a project, encode a file from its out/ or footage/ tree using a named setting, write to out/. Convenience wrapper around compressor_encode.
+ Convenience wrapper around compressor_encode. Resolves a project, encodes a file from its out/ or footage/ tree using a named setting, writes to out/.
```

This signals to retrieval that the wrapper is derivative, letting the primitive surface for unscoped intent.

### Q8 — build buried under diff (real miss)

"build a Final Cut Pro timeline with clips and titles" returns `fcp_round_trip_diff` (0.626) at #1 — diff is "compare", not "build." The build tool's description starts well (*"Build an FCPXML 1.14 document"*) but then pivots to safety pre-flights (*"Runs safety pre-flights (compound-clip overlap, caption roles, anchor collisions) unless skipPreflight=true. Returns the XML string without writing it."*). The pre-flight nouns dilute the build signal.

`fcp_round_trip_diff` wins because its description name-checks every spine noun ("clip offsets, durations, title text/params, roles, transitions, assets, format") — exactly what the intent asks about.

**Fix.** Lead with action verbs and high-signal nouns; move pre-flight detail to argument descriptions:

```diff
- Build an FCPXML 1.14 document (1.13 also supported) from a JSON project spec. Runs safety pre-flights (compound-clip overlap, caption roles, anchor collisions) unless skipPreflight=true. Returns the XML string without writing it.
+ Author a Final Cut Pro timeline (clips, titles, transitions, audio) from a JSON project spec. Emits FCPXML 1.14 (1.13 also supported). Returns the XML string without writing it.
```

The skipPreflight argument's own description explains the safety pre-flight behavior — that's the right home for it.

### Q12 — partial-step tool out-classed by composite

"resize an image and export to WebP" returns `pixelmator_batch_export_project_images` (0.715) at #1 because it covers both halves (resize-AND-export). Plain `pixelmator_resize` (0.664) at #2 only does one half — the user would still need `pixelmator_export` to get a file written. Arguably the composite is the right answer for the compound intent; per the audit target it's a near-miss.

**Fix.** Scope-clarify `pixelmator_resize` so retrieval knows it's a partial step:

```diff
- Resize an open document. Width / height in pixels; resolution in pixels per inch.
+ Change the dimensions of an open Pixelmator document. Width / height in pixels; resolution in PPI. Doesn't write to disk — pair with pixelmator_export for output.
```

The "Pair with X for Y" idiom signals to both retrieval and the LLM that this tool is half a workflow.

## Phase 2 integration ticket

```
csos × tool-compass integration — first PR of Phase 2

A) Three description polishes (15 min total):
- src/apps/compressor/tools.ts → compressor_encode_project: lead description with "Convenience wrapper around compressor_encode."
- src/apps/fcp/tools.ts → fcp_fcpxml_build: rewrite to "Author a Final Cut Pro timeline (clips, titles, transitions, audio) from a JSON project spec. Emits FCPXML 1.14 (1.13 also supported). Returns the XML string without writing it." Pre-flight detail moves to the skipPreflight argument's own description.
- src/apps/pixelmator/tools.ts → pixelmator_resize: append "Doesn't write to disk — pair with pixelmator_export for output."

B) New smoke Phase 7 — discoverability regression (a few hours):
- src/smoke/phases/p7-toolcompass-discoverability.ts
- tests/fixtures/toolcompass-queries.json — the 12 baseline intent → target pairs from this audit, plus space for additions per phase
- Phase spawns tool-compass against a temp config wiring csos as stdio backend, runs sync, runs each query, asserts target in top-3 with score > 0.4
- Fails the smoke if descriptions drift
- Becomes the permanent regression gate; every phase that adds tools extends the fixture (never deletes entries)

C) Tool description convention — docs/reference/tool-descriptions.md (30 min):
- Verb-first ("Author...", "Encode...", "Validate...")
- Intent-language not implementation ("set audio level in dB" not "emit adjust-volume element")
- ~100-200 char tool description; argument-level detail belongs in argument descriptions
- Wrapper / convenience tools start with "Convenience wrapper around X" or "Wrapper around X"
- Partial-step tools end with "Pair with Y for Z" if Y is needed to complete the workflow
- Cite the doc from CLAUDE.md so future build agents follow it before adding new tools

D) README install section — "Recommended setup with tool-compass" (10 min):
- Show compass_config.json with csos as stdio backend (the snippet from this audit)
- One-line: tool-compass sync && tool-compass
- Five lines + screenshot. Free leverage given tool-compass's 15K clones / fortnight.

E) DEFERRED — full audit-and-rewrite of all 78 descriptions. Baseline shows 100% top-3 retrieval, no outright misses. Current quality is good enough. The convention in (C) prevents Phase 2's 25+ new Pixelmator tools from regressing the surface.
```

## Reproducibility

To re-run this audit (or build it into Phase 7's smoke harness):

```bash
# 12 query × 3 results × tool-compass JSON output
TOOL_COMPASS_CONFIG=./compass_config.json
for q in \
  "encode a video file with a Compressor preset" \
  "monitor an active encode for live progress" \
  "list available Compressor encoding presets" \
  "set a parameter value on a Motion template" \
  "render a Motion template headlessly to a video file" \
  "publish a Motion parameter so it appears in FCP inspector" \
  "validate that a Motion template will not corrupt on import" \
  "build a Final Cut Pro timeline with clips and titles" \
  "import an FCPXML file into Final Cut Pro" \
  "find every effect and title installed on this Mac" \
  "check whether an FCPXML survived FCP round-trip cleanly" \
  "resize an image and export to WebP"; do
  echo "=== $q ==="
  tool-compass search "$q" --top 3 --json
done
```

Each `(intent, target_tool)` pair becomes one row in `tests/fixtures/toolcompass-queries.json`. Phase 7 smoke iterates the fixture and asserts target tool is in `results` with `score > 0.4`. As Phase 2 adds Pixelmator tools, Phase 3 adds Logic / Numbers / Pages tools, etc., extend the fixture with new query→target pairs. Never delete entries — they're the regression baseline.

## Strategic implication

The reframe is meaningful. Before this audit, Phase 2 carried implicit pressure that csos's growing tool count (78 → ~206 across all four phases) would create a context-cliff problem for LLM clients. **tool-compass solves that problem already.** csos can grow without bloating any session — `compass(intent)` returns top-3 with summaries (~2K tokens) instead of 78 tool definitions (~38K tokens), per tool-compass's own README math.

Phase 2's pace doesn't need to slow for description rewrites. The convention doc + smoke phase 7 + three polishes are infrastructure work that keeps quality high; the 25-tool Pixelmator wave can land normally on top of them.

---

**Last updated:** 2026-05-05. csos v1.6.0 / tool-compass v2.2.2 / nomic-embed-text 768-dim. Findings inform [`docs/phase-2.md`](../phase-2.md).
