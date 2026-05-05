/**
 * OzmlTextEditor — atomically replaces the text content of a Motion title node.
 *
 * Performs four coordinated edits in one atomic write:
 *  1. Replace <text> CDATA (the human-readable string)
 *  2. Rebuild <object> list — one per Unicode code point, newlines included
 *  3. Rebuild <styleRun> ranges — last run absorbs the length delta
 *  4. Verify all <style> id references still exist in the document
 *
 * Runs five validators before writing. Uses atomic temp-file + rename so a
 * half-written .motn never lands on disk.
 *
 * Reference: docs/research/2026-05-05-deepswarm/05-motion-depth.md §2
 */
import { readFile, writeFile, rename, access, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { CreatorStudioError } from "../../errors.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EditTextOpts {
  /** Which <text> element to edit (0-based). Defaults to 0. */
  textNodeIndex?: number;
  /** Write to this path instead of overwriting the source. */
  outputPath?: string;
  /**
   * Allow non-ASCII characters (code points > 127).
   * Default false — OZML codepoint encoding for non-ASCII is empirically
   * unverified (see invariant 12). Gate until smoke against a non-ASCII
   * template confirms encoding is codepoint-not-bytes.
   */
  allowNonAscii?: boolean;
}

export interface EditTextResult {
  inputPath: string;
  outputPath: string;
  textNodeIndex: number;
  oldText: string;
  newText: string;
  glyphCount: number;
  styleRunCount: number;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface TextBlock {
  /** Start index of the entire <text>...</text> span in the XML string */
  start: number;
  /** End index (exclusive) of the span */
  end: number;
  /** The CDATA string found in the existing block */
  cdata: string;
  /** styleRun entries extracted from the existing block */
  styleRuns: StyleRunEntry[];
}

interface StyleRunEntry {
  style: string;
  offset: number;
  length: number;
}

// ---------------------------------------------------------------------------
// Regex helpers
// ---------------------------------------------------------------------------

/**
 * Matches <text>...</text> blocks. Greedy enough for multi-line content,
 * lazy enough not to consume past the closing </text>.
 */
const TEXT_BLOCK_RE = /<text>([\s\S]*?)<\/text>/g;

/** Matches <styleRun> self-closing elements inside a text block. */
const STYLERUN_RE = /<styleRun\s+style="([^"]+)"\s+offset="([^"]+)"\s+length="([^"]+)"\s*\/>/g;

/** Collects all <style id="N"> declarations in the document. */
const STYLE_DECL_RE = /<style\b[^>]*\bid="([^"]+)"/g;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function collectTextBlocks(xml: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  TEXT_BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = TEXT_BLOCK_RE.exec(xml)) !== null) {
    const inner = m[1];

    // Only treat <text> blocks that contain <object> elements as text factory
    // nodes. Others (e.g., bare <text> in other OZML contexts) are ignored.
    if (!inner.includes("<object")) continue;

    // CDATA: everything before the first <object> tag
    const objectIdx = inner.indexOf("<object");
    const rawCdata = objectIdx >= 0 ? inner.slice(0, objectIdx) : inner;
    const cdata = rawCdata.trim();

    // styleRun entries
    const styleRuns: StyleRunEntry[] = [];
    STYLERUN_RE.lastIndex = 0;
    let sr: RegExpExecArray | null;
    while ((sr = STYLERUN_RE.exec(inner)) !== null) {
      styleRuns.push({
        style: sr[1],
        offset: parseInt(sr[2], 10),
        length: parseInt(sr[3], 10),
      });
    }

    blocks.push({
      start: m.index,
      end: m.index + m[0].length,
      cdata,
      styleRuns,
    });
  }
  return blocks;
}

function collectStyleIds(xml: string): Set<string> {
  const ids = new Set<string>();
  STYLE_DECL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STYLE_DECL_RE.exec(xml)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

/**
 * Build the replacement <text>...</text> block.
 *
 * - Exactly one <object value="codepoint"> per glyph (Unicode code points;
 *   newlines count as glyph index per invariant 15).
 * - Kerning id is 1-based, dense, matching glyph index.
 * - Last styleRun is stretched to cover the new glyph count; earlier runs
 *   keep their original offset+length.
 * - Empty text: no objects, no styleRuns.
 */
function buildTextBlock(
  newText: string,
  existingStyleRuns: StyleRunEntry[],
): string {
  const glyphs = [...newText]; // Unicode code points; \n counts as 1
  const n = glyphs.length;

  // Object elements
  const objectLines = glyphs.map((glyph, i) => {
    const cp = glyph.codePointAt(0)!;
    return `<object value="${cp}">\n<parameter name="Kerning" id="${i + 1}" flags="16" value="0"/>\n</object>`;
  });

  // styleRun elements — stretch the last run to cover newGlyphCount
  let styleRunLines: string[] = [];
  if (n > 0 && existingStyleRuns.length > 0) {
    styleRunLines = existingStyleRuns.map((run, i) => {
      if (i === existingStyleRuns.length - 1) {
        const newLen = n - run.offset;
        return `<styleRun style="${run.style}" offset="${run.offset}" length="${newLen}"/>`;
      }
      return `<styleRun style="${run.style}" offset="${run.offset}" length="${run.length}"/>`;
    });
  }

  // Assemble
  const parts: string[] = [newText, ...objectLines, ...styleRunLines];
  return `<text>${parts.join("\n")}\n</text>`;
}

// ---------------------------------------------------------------------------
// Validators (run on planned output; throw CreatorStudioError on failure)
// ---------------------------------------------------------------------------

function validateGlyphCount(glyphs: string[], builtBlock: string): void {
  const built = (builtBlock.match(/<object\s/g) ?? []).length;
  if (built !== glyphs.length) {
    throw new CreatorStudioError(
      "E_OZML_GLYPH_COUNT_MISMATCH",
      `OzmlTextEditor built ${built} <object> elements but text has ${glyphs.length} glyphs`,
      "Internal consistency failure — please report this bug.",
    );
  }
}

function validateKerningSequence(builtBlock: string): void {
  const re = /<parameter name="Kerning" id="(\d+)"/g;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  let expected = 1;
  while ((m = re.exec(builtBlock)) !== null) {
    const actual = parseInt(m[1], 10);
    if (actual !== expected) {
      throw new CreatorStudioError(
        "E_OZML_KERNING_ID_GAP",
        `Kerning id sequence broken: expected ${expected}, found ${actual}`,
        "Kerning ids must be dense 1-based integers: 1, 2, 3, …",
      );
    }
    expected++;
  }
}

function validateStyleRunContiguity(
  runs: StyleRunEntry[],
  glyphCount: number,
): void {
  if (glyphCount === 0 || runs.length === 0) return;
  let cursor = 0;
  for (let i = 0; i < runs.length; i++) {
    if (runs[i].offset !== cursor) {
      throw new CreatorStudioError(
        "E_OZML_STYLERUN_GAP",
        `styleRun[${i}] offset=${runs[i].offset} but expected ${cursor}`,
        "styleRun ranges must be contiguous: offset[i] + length[i] == offset[i+1].",
      );
    }
    cursor = runs[i].offset + runs[i].length;
  }
  if (cursor !== glyphCount) {
    throw new CreatorStudioError(
      "E_OZML_STYLERUN_GAP",
      `styleRun coverage ends at ${cursor} but text has ${glyphCount} glyphs`,
      "The last styleRun must end exactly at total glyph count.",
    );
  }
}

function validateStyleReferences(
  runs: StyleRunEntry[],
  styleIds: Set<string>,
): void {
  for (const run of runs) {
    if (!styleIds.has(run.style)) {
      throw new CreatorStudioError(
        "E_OZML_STYLE_REFERENCE_DEAD",
        `styleRun references style="${run.style}" which does not exist in the document`,
        "Ensure the <style> block is present. Removing a style without retargeting its styleRuns drops the title.",
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function editText(
  path: string,
  newText: string,
  opts: EditTextOpts = {},
): Promise<EditTextResult> {
  // ── Load ──────────────────────────────────────────────────────────────────
  try {
    await access(path);
  } catch {
    throw new CreatorStudioError(
      "E_OZML_FILE_MISSING",
      `Motion template not found: ${path}`,
      "Ensure the path points to a valid .motn or .moti file.",
    );
  }

  const xml = await readFile(path, "utf-8");
  if (!xml.includes("<ozml")) {
    throw new CreatorStudioError("E_OZML_INVALID", `Not an OZML file: ${path}`);
  }

  const textNodeIndex = opts.textNodeIndex ?? 0;
  const allowNonAscii = opts.allowNonAscii ?? false;
  const outputPath = opts.outputPath ?? path;

  // ── Locate text blocks ────────────────────────────────────────────────────
  const blocks = collectTextBlocks(xml);

  if (blocks.length === 0) {
    throw new CreatorStudioError(
      "E_OZML_PARAM_NOT_FOUND",
      `No text-factory <text> elements found in ${path}`,
      "Use motion_template_inspect to verify the template has a title text node.",
    );
  }
  if (textNodeIndex < 0 || textNodeIndex >= blocks.length) {
    throw new CreatorStudioError(
      "E_OZML_PARAM_NOT_FOUND",
      `textNodeIndex ${textNodeIndex} out of range — found ${blocks.length} text block(s)`,
      `Pass textNodeIndex 0..${blocks.length - 1}.`,
    );
  }

  const block = blocks[textNodeIndex];
  const glyphs = [...newText];

  // ── Non-ASCII gate ────────────────────────────────────────────────────────
  if (!allowNonAscii && glyphs.some((g) => (g.codePointAt(0) ?? 0) > 127)) {
    throw new CreatorStudioError(
      "E_NON_ASCII",
      "Text contains non-ASCII characters — codepoint encoding for non-ASCII is empirically unverified in OZML.",
      "Pass allowNonAscii=true to override (may produce corrupt titles for non-ASCII text until smoke confirms encoding).",
    );
  }

  // ── Collect document style IDs for reference validation ──────────────────
  const styleIds = collectStyleIds(xml);

  // ── Validators on existing structure ─────────────────────────────────────
  // Style references must be valid before we build (they come from the document, not our output)
  validateStyleReferences(block.styleRuns, styleIds);

  // ── Compute planned styleRuns ─────────────────────────────────────────────
  const plannedStyleRuns: StyleRunEntry[] =
    block.styleRuns.length > 0 && glyphs.length > 0
      ? block.styleRuns.map((run, i) => {
          if (i === block.styleRuns.length - 1) {
            return { ...run, length: glyphs.length - run.offset };
          }
          return { ...run };
        })
      : [];

  validateStyleRunContiguity(plannedStyleRuns, glyphs.length);

  // ── Build new block ───────────────────────────────────────────────────────
  const newBlock = buildTextBlock(newText, block.styleRuns);

  // ── Post-build self-check validators ─────────────────────────────────────
  validateGlyphCount(glyphs, newBlock);
  validateKerningSequence(newBlock);

  // ── Splice ───────────────────────────────────────────────────────────────
  const newXml = xml.slice(0, block.start) + newBlock + xml.slice(block.end);

  // ── Atomic write ─────────────────────────────────────────────────────────
  if (outputPath !== path) {
    await mkdir(dirname(outputPath), { recursive: true });
  }
  const tmpPath = `${outputPath}.csos-tmp-${Date.now()}`;
  try {
    await writeFile(tmpPath, newXml, "utf-8");
    await rename(tmpPath, outputPath);
  } catch (e) {
    // Clean up temp file on failure (best-effort)
    try {
      const { unlink } = await import("node:fs/promises");
      await unlink(tmpPath);
    } catch { /* ignore */ }
    throw e;
  }

  return {
    inputPath: path,
    outputPath,
    textNodeIndex,
    oldText: block.cdata,
    newText,
    glyphCount: glyphs.length,
    styleRunCount: plannedStyleRuns.length,
  };
}
