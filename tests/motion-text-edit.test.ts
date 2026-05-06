/**
 * OzmlTextEditor unit tests.
 *
 * Uses real temp files so the string-manipulation logic is exercised end-to-end.
 * "Title Here" (10 chars) is the canonical fixture text matching the bundled
 * Atmospheric-Lower Third baseline.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editText, patchSiblingText } from "../src/apps/motion/textEdit.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Minimal OZML file with a single text factory node containing "Title Here".
 * "Title Here" = T(84) i(105) t(116) l(108) e(101) _(32) H(72) e(101) r(114) e(101)
 * = 10 glyphs; styleRun covers all 10.
 */
const makeSampleOzml = (text: string, styleId = "100") => {
  const glyphs = [...text];
  const objects = glyphs
    .map(
      (g, i) =>
        `<object value="${g.codePointAt(0)}">\n` +
        `<parameter name="Kerning" id="${i + 1}" flags="16" value="0"/>\n` +
        `</object>`,
    )
    .join("\n");
  const styleRun =
    glyphs.length > 0
      ? `<styleRun style="${styleId}" offset="0" length="${glyphs.length}"/>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ozxmlscene>
<ozml version="4.0">
<factories>
  <factory id="1" uuid="044beba5ad3211d199f900104b87a480">
    <description>Style</description>
  </factory>
  <factory id="16" uuid="babfc77711111111111100104b87a480">
    <description>Text</description>
  </factory>
</factories>
<style id="${styleId}" factoryID="1">
  <font type="0">Helvetica</font>
</style>
<scenenode name="Title" id="200" factoryID="16">
  <text>${text}
${objects}
${styleRun}
</text>
</scenenode>
</ozml>`;
};

/**
 * Two-text-block fixture for textNodeIndex tests.
 */
const makeTwoBlockOzml = () => {
  const block = (text: string, styleId: string) => {
    const g = [...text];
    const objs = g
      .map(
        (c, i) =>
          `<object value="${c.codePointAt(0)}"><parameter name="Kerning" id="${i + 1}" flags="16" value="0"/></object>`,
      )
      .join("\n");
    return `<text>${text}\n${objs}\n<styleRun style="${styleId}" offset="0" length="${g.length}"/>\n</text>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<ozml version="4.0">
<style id="101" factoryID="1"><font type="0">Helvetica</font></style>
<style id="102" factoryID="1"><font type="0">Arial</font></style>
<scenenode id="301" factoryID="16">
  ${block("Headline", "101")}
</scenenode>
<scenenode id="302" factoryID="16">
  ${block("Subhead", "102")}
</scenenode>
</ozml>`;
};

// ---------------------------------------------------------------------------
// Test state
// ---------------------------------------------------------------------------

let tmp: string;
let motnPath: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-textedit-"));
  motnPath = join(tmp, "sample.motn");
  await writeFile(motnPath, makeSampleOzml("Title Here"), "utf-8");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Core replacement
// ---------------------------------------------------------------------------

describe("editText — basic replacement", () => {
  it("replaces CDATA, rebuilds objects, adjusts styleRun", async () => {
    const result = await editText(motnPath, "creator-studio-os");
    expect(result.oldText).toBe("Title Here");
    expect(result.newText).toBe("creator-studio-os");
    expect(result.glyphCount).toBe(17);
    expect(result.styleRunCount).toBe(1);

    const out = await readFile(motnPath, "utf-8");
    // CDATA present in output
    expect(out).toContain("<text>creator-studio-os\n");
    // Correct glyph count: 17 objects
    const objectCount = (out.match(/<object\s/g) ?? []).length;
    expect(objectCount).toBe(17);
    // styleRun updated to length 17
    expect(out).toContain('length="17"');
    // First and last codepoints correct: c=99, s=115
    expect(out).toContain('<object value="99">'); // 'c'
    expect(out).toContain('<object value="115">'); // last 's'
  });

  it("reports oldText correctly from the original block", async () => {
    const result = await editText(motnPath, "new text");
    expect(result.oldText).toBe("Title Here");
  });

  it("handles shorter replacement (length shrinks)", async () => {
    const result = await editText(motnPath, "Hi");
    expect(result.glyphCount).toBe(2);
    const out = await readFile(motnPath, "utf-8");
    const objectCount = (out.match(/<object\s/g) ?? []).length;
    expect(objectCount).toBe(2);
    expect(out).toContain('length="2"');
    // Old objects gone
    expect(out).not.toContain('length="10"');
  });

  it("handles empty replacement (zero glyphs)", async () => {
    const result = await editText(motnPath, "");
    expect(result.glyphCount).toBe(0);
    expect(result.styleRunCount).toBe(0);
    const out = await readFile(motnPath, "utf-8");
    // No objects
    expect(out).not.toContain("<object");
    // No styleRuns
    expect(out).not.toContain("<styleRun");
  });
});

// ---------------------------------------------------------------------------
// Newlines
// ---------------------------------------------------------------------------

describe("editText — newline handling", () => {
  it("counts newline as a glyph (invariant 15)", async () => {
    // "A\nB" = 3 glyphs: A(65), \n(10), B(66)
    const result = await editText(motnPath, "A\nB");
    expect(result.glyphCount).toBe(3);

    const out = await readFile(motnPath, "utf-8");
    const objectCount = (out.match(/<object\s/g) ?? []).length;
    expect(objectCount).toBe(3);
    // newline codepoint = 10
    expect(out).toContain('<object value="10">');
    expect(out).toContain('length="3"');
  });
});

// ---------------------------------------------------------------------------
// Non-ASCII gate
// ---------------------------------------------------------------------------

describe("editText — non-ASCII gate", () => {
  it("throws E_NON_ASCII for emoji without allowNonAscii", async () => {
    await expect(editText(motnPath, "Hello 🎬")).rejects.toMatchObject({
      code: "E_NON_ASCII",
    });
  });

  it("throws E_NON_ASCII for accented chars without allowNonAscii", async () => {
    await expect(editText(motnPath, "résumé")).rejects.toMatchObject({
      code: "E_NON_ASCII",
    });
  });

  it("succeeds with allowNonAscii=true", async () => {
    const result = await editText(motnPath, "résumé", { allowNonAscii: true });
    expect(result.glyphCount).toBe(6);
  });

  it("pure ASCII passes without flag", async () => {
    const result = await editText(motnPath, "creator-studio-os 123");
    expect(result.glyphCount).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// textNodeIndex
// ---------------------------------------------------------------------------

describe("editText — textNodeIndex", () => {
  it("selects the first text block by default", async () => {
    const twoPath = join(tmp, "two.motn");
    await writeFile(twoPath, makeTwoBlockOzml(), "utf-8");

    const result = await editText(twoPath, "New Headline");
    expect(result.textNodeIndex).toBe(0);
    expect(result.oldText).toBe("Headline");

    const out = await readFile(twoPath, "utf-8");
    expect(out).toContain("New Headline");
    // Second block unchanged
    expect(out).toContain("Subhead");
  });

  it("selects the second text block with textNodeIndex=1", async () => {
    const twoPath = join(tmp, "two.motn");
    await writeFile(twoPath, makeTwoBlockOzml(), "utf-8");

    const result = await editText(twoPath, "New Subhead", { textNodeIndex: 1 });
    expect(result.oldText).toBe("Subhead");

    const out = await readFile(twoPath, "utf-8");
    // First block unchanged
    expect(out).toContain("Headline");
    expect(out).toContain("New Subhead");
  });

  it("throws E_OZML_PARAM_NOT_FOUND for out-of-range index", async () => {
    await expect(
      editText(motnPath, "X", { textNodeIndex: 5 }),
    ).rejects.toMatchObject({ code: "E_OZML_PARAM_NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// outputPath
// ---------------------------------------------------------------------------

describe("editText — outputPath", () => {
  it("writes to outputPath, leaves source unchanged", async () => {
    const outPath = join(tmp, "out", "modified.motn");
    await editText(motnPath, "New Text", { outputPath: outPath });

    // Source unchanged
    const src = await readFile(motnPath, "utf-8");
    expect(src).toContain("Title Here");

    // Destination modified
    const out = await readFile(outPath, "utf-8");
    expect(out).toContain("New Text");
    expect(out).not.toContain("Title Here");
  });

  it("creates intermediate directories", async () => {
    const outPath = join(tmp, "deep", "nested", "dir", "out.motn");
    await editText(motnPath, "Deep", { outputPath: outPath });
    const out = await readFile(outPath, "utf-8");
    expect(out).toContain("Deep");
  });
});

// ---------------------------------------------------------------------------
// Style reference validation
// ---------------------------------------------------------------------------

describe("editText — style reference validation", () => {
  it("throws E_OZML_STYLE_REFERENCE_DEAD when styleRun references missing style", async () => {
    // Build a template with a styleRun referencing a non-existent style
    const badOzml = `<?xml version="1.0" encoding="UTF-8"?>
<ozml version="4.0">
<style id="999" factoryID="1"><font type="0">Helvetica</font></style>
<scenenode id="200" factoryID="16">
  <text>Hello
<object value="72"><parameter name="Kerning" id="1" flags="16" value="0"/></object>
<object value="101"><parameter name="Kerning" id="2" flags="16" value="0"/></object>
<object value="108"><parameter name="Kerning" id="3" flags="16" value="0"/></object>
<object value="108"><parameter name="Kerning" id="4" flags="16" value="0"/></object>
<object value="111"><parameter name="Kerning" id="5" flags="16" value="0"/></object>
<styleRun style="DEAD_STYLE" offset="0" length="5"/>
</text>
</scenenode>
</ozml>`;
    const badPath = join(tmp, "bad.motn");
    await writeFile(badPath, badOzml, "utf-8");

    await expect(editText(badPath, "World")).rejects.toMatchObject({
      code: "E_OZML_STYLE_REFERENCE_DEAD",
    });
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe("editText — error handling", () => {
  it("throws E_OZML_FILE_MISSING for non-existent file", async () => {
    await expect(
      editText(join(tmp, "does-not-exist.motn"), "text"),
    ).rejects.toMatchObject({ code: "E_OZML_FILE_MISSING" });
  });

  it("throws E_OZML_INVALID for non-OZML file", async () => {
    const notOzml = join(tmp, "not.motn");
    await writeFile(notOzml, "<root>not ozml</root>", "utf-8");
    await expect(editText(notOzml, "text")).rejects.toMatchObject({
      code: "E_OZML_INVALID",
    });
  });

  it("throws E_OZML_PARAM_NOT_FOUND when no text factory blocks exist", async () => {
    // Template with parameters but no <text> with <object> children
    const noText = join(tmp, "no-text.motn");
    await writeFile(
      noText,
      `<ozml version="4.0"><scenenode id="1"><parameter name="X" id="1" value="0"/></scenenode></ozml>`,
      "utf-8",
    );
    await expect(editText(noText, "hello")).rejects.toMatchObject({
      code: "E_OZML_PARAM_NOT_FOUND",
    });
  });
});

// ---------------------------------------------------------------------------
// Kerning sequence integrity
// ---------------------------------------------------------------------------

describe("editText — kerning sequence", () => {
  it("produces dense 1-based kerning IDs after replacement", async () => {
    await editText(motnPath, "ABC");
    const out = await readFile(motnPath, "utf-8");

    // Should find id="1", id="2", id="3" — in that order
    const kerningIds: number[] = [];
    const re = /<parameter name="Kerning" id="(\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(out)) !== null) {
      kerningIds.push(parseInt(m[1], 10));
    }
    expect(kerningIds).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// Multi-styleRun template
// ---------------------------------------------------------------------------

describe("editText — multi-styleRun stretch", () => {
  it("stretches last run while keeping earlier runs fixed", async () => {
    // Template: "Hello World" with two styleRuns
    // Run 0: style="101" offset=0 length=5 ("Hello")
    // Run 1: style="102" offset=5 length=6 (" World")
    const text = "Hello World";
    const g = [...text];
    const objs = g
      .map(
        (c, i) =>
          `<object value="${c.codePointAt(0)}"><parameter name="Kerning" id="${i + 1}" flags="16" value="0"/></object>`,
      )
      .join("\n");
    const multiRunOzml = `<?xml version="1.0" encoding="UTF-8"?>
<ozml version="4.0">
<style id="101" factoryID="1"><font type="0">Helvetica</font></style>
<style id="102" factoryID="1"><font type="0">Arial</font></style>
<scenenode id="300" factoryID="16">
  <text>${text}
${objs}
<styleRun style="101" offset="0" length="5"/>
<styleRun style="102" offset="5" length="6"/>
</text>
</scenenode>
</ozml>`;
    const multiPath = join(tmp, "multi.motn");
    await writeFile(multiPath, multiRunOzml, "utf-8");

    // Replace with longer text: "Hello World Extra" (17 chars)
    await editText(multiPath, "Hello World Extra");
    const out = await readFile(multiPath, "utf-8");

    // First run: style="101", offset=0, length=5 — unchanged
    expect(out).toMatch(/styleRun style="101" offset="0" length="5"/);
    // Last run: style="102", offset=5, stretched to 12 (17-5=12)
    expect(out).toMatch(/styleRun style="102" offset="5" length="12"/);
  });
});

// ---------------------------------------------------------------------------
// patchSiblingText — Apple Compositions sibling-object layout
// ---------------------------------------------------------------------------

/**
 * Build a minimal OZML fixture using the sibling-object layout found in all
 * Apple Compositions templates (Atmospheric-Lower Third, etc.).
 *
 * Structure (4-space indent):
 *   <styleRun style="N" offset="0" length="L"/>
 *   <text>TEXT</text>
 *   <object value="CP">
 *       <parameter name="Kerning" id="K" flags="16" value="0"/>
 *   </object> × L
 */
const makeSiblingOzml = (text: string, styleId = "100", indent = "    ") => {
  const glyphs = [...text];
  const innerIndent = indent + "    ";
  const objectLines = glyphs
    .map(
      (g, i) =>
        `${indent}<object value="${g.codePointAt(0)}">\n` +
        `${innerIndent}<parameter name="Kerning" id="${i + 1}" flags="16" value="0"/>\n` +
        `${indent}</object>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ozxmlscene>
<ozml version="4.0">
<style id="${styleId}" factoryID="1">
  <font type="0">Helvetica</font>
</style>
<scenenode name="Title" id="200" factoryID="16">
${indent}<styleRun style="${styleId}" offset="0" length="${glyphs.length}"/>
${indent}<text>${text}</text>
${objectLines}
</scenenode>
</ozml>`;
};

/** Two sibling blocks for textNodeIndex tests. */
const makeTwoBlockSiblingOzml = () => {
  const block = (text: string, styleId: string, indent: string) => {
    const g = [...text];
    const inner = indent + "    ";
    const objs = g
      .map(
        (c, i) =>
          `${indent}<object value="${c.codePointAt(0)}">\n` +
          `${inner}<parameter name="Kerning" id="${i + 1}" flags="16" value="0"/>\n` +
          `${indent}</object>`,
      )
      .join("\n");
    return (
      `${indent}<styleRun style="${styleId}" offset="0" length="${g.length}"/>\n` +
      `${indent}<text>${text}</text>\n` +
      objs
    );
  };
  const ind = "    ";
  return `<?xml version="1.0" encoding="UTF-8"?>
<ozml version="4.0">
<style id="101" factoryID="1"><font type="0">Helvetica</font></style>
<style id="102" factoryID="1"><font type="0">Arial</font></style>
<scenenode id="301" factoryID="16">
${block("Headline", "101", ind)}
</scenenode>
<scenenode id="302" factoryID="16">
${block("Subhead", "102", ind)}
</scenenode>
</ozml>`;
};

let siblingTmp: string;
let siblingPath: string;

beforeEach(async () => {
  siblingTmp = await mkdtemp(join(tmpdir(), "csos-sibling-"));
  siblingPath = join(siblingTmp, "sibling.motn");
  await writeFile(siblingPath, makeSiblingOzml("Name Here"), "utf-8");
});

afterEach(async () => {
  await rm(siblingTmp, { recursive: true, force: true });
});

describe("patchSiblingText — basic replacement", () => {
  it("replaces text, updates styleRun length, rebuilds sibling objects", async () => {
    const result = await patchSiblingText(siblingPath, "Creator Studio");
    expect(result.oldText).toBe("Name Here");
    expect(result.newText).toBe("Creator Studio");
    expect(result.glyphCount).toBe(14);
    expect(result.styleRunCount).toBe(1);

    const out = await readFile(siblingPath, "utf-8");
    expect(out).toContain('<text>Creator Studio</text>');
    expect(out).toContain('length="14"');
    // Old length gone
    expect(out).not.toContain('length="9"');
    // 14 sibling objects
    const objectCount = (out.match(/<object\s/g) ?? []).length;
    expect(objectCount).toBe(14);
    // First codepoint: C = 67
    expect(out).toContain('<object value="67">');
  });

  it("handles shorter replacement", async () => {
    const result = await patchSiblingText(siblingPath, "Hi");
    expect(result.glyphCount).toBe(2);
    const out = await readFile(siblingPath, "utf-8");
    expect(out).toContain('length="2"');
    const objectCount = (out.match(/<object\s/g) ?? []).length;
    expect(objectCount).toBe(2);
  });

  it("produces dense 1-based kerning IDs", async () => {
    await patchSiblingText(siblingPath, "ABC");
    const out = await readFile(siblingPath, "utf-8");
    const ids: number[] = [];
    const re = /<parameter name="Kerning" id="(\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(out)) !== null) ids.push(parseInt(m[1], 10));
    expect(ids).toEqual([1, 2, 3]);
  });

  it("preserves style attribute on styleRun", async () => {
    await patchSiblingText(siblingPath, "Test");
    const out = await readFile(siblingPath, "utf-8");
    expect(out).toContain('style="100"');
  });

  it("reports oldText correctly", async () => {
    const result = await patchSiblingText(siblingPath, "anything");
    expect(result.oldText).toBe("Name Here");
  });
});

describe("patchSiblingText — textNodeIndex", () => {
  it("selects first block by default", async () => {
    const twoPath = join(siblingTmp, "two.motn");
    await writeFile(twoPath, makeTwoBlockSiblingOzml(), "utf-8");

    const result = await patchSiblingText(twoPath, "New Headline");
    expect(result.oldText).toBe("Headline");

    const out = await readFile(twoPath, "utf-8");
    expect(out).toContain("<text>New Headline</text>");
    expect(out).toContain("<text>Subhead</text>"); // second block unchanged
  });

  it("selects second block with textNodeIndex=1", async () => {
    const twoPath = join(siblingTmp, "two.motn");
    await writeFile(twoPath, makeTwoBlockSiblingOzml(), "utf-8");

    const result = await patchSiblingText(twoPath, "New Subhead", { textNodeIndex: 1 });
    expect(result.oldText).toBe("Subhead");

    const out = await readFile(twoPath, "utf-8");
    expect(out).toContain("<text>Headline</text>"); // first block unchanged
    expect(out).toContain("<text>New Subhead</text>");
  });

  it("throws E_OZML_PARAM_NOT_FOUND for out-of-range index", async () => {
    await expect(
      patchSiblingText(siblingPath, "X", { textNodeIndex: 5 }),
    ).rejects.toMatchObject({ code: "E_OZML_PARAM_NOT_FOUND" });
  });
});

describe("patchSiblingText — outputPath", () => {
  it("writes to outputPath, leaves source unchanged", async () => {
    const outPath = join(siblingTmp, "out", "modified.motn");
    await patchSiblingText(siblingPath, "New Text", { outputPath: outPath });

    const src = await readFile(siblingPath, "utf-8");
    expect(src).toContain("Name Here");

    const out = await readFile(outPath, "utf-8");
    expect(out).toContain("New Text");
    expect(out).not.toContain("Name Here");
  });
});

describe("patchSiblingText — error handling", () => {
  it("throws E_OZML_FILE_MISSING for non-existent file", async () => {
    await expect(
      patchSiblingText(join(siblingTmp, "no-such.motn"), "X"),
    ).rejects.toMatchObject({ code: "E_OZML_FILE_MISSING" });
  });

  it("throws E_OZML_INVALID for non-OZML file", async () => {
    const bad = join(siblingTmp, "bad.motn");
    await writeFile(bad, "<root>not ozml</root>", "utf-8");
    await expect(patchSiblingText(bad, "X")).rejects.toMatchObject({
      code: "E_OZML_INVALID",
    });
  });

  it("throws E_OZML_PARAM_NOT_FOUND when file has no sibling blocks", async () => {
    // A file with glyph-inside-text layout (no sibling objects) should fail
    const inside = join(siblingTmp, "inside.motn");
    await writeFile(inside, makeSampleOzml("Hello"), "utf-8");
    await expect(patchSiblingText(inside, "World")).rejects.toMatchObject({
      code: "E_OZML_PARAM_NOT_FOUND",
    });
  });

  it("throws E_NON_ASCII without allowNonAscii flag", async () => {
    await expect(patchSiblingText(siblingPath, "Héllo")).rejects.toMatchObject({
      code: "E_NON_ASCII",
    });
  });

  it("succeeds with allowNonAscii=true", async () => {
    const result = await patchSiblingText(siblingPath, "Héllo", { allowNonAscii: true });
    expect(result.glyphCount).toBe(5);
  });
});
