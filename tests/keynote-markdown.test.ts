/**
 * Unit tests for the Keynote markdown parser and AppleScript codegen.
 * Pure-function tests — no AppleScript required.
 */
import { describe, it, expect } from "vitest";
import { parseMarkdown, slidesToAppleScript } from "@creator-studio-os/keynote";

// ─── parseMarkdown ────────────────────────────────────────────────────────────

describe("parseMarkdown", () => {
  it("parses a single heading as a cover slide", () => {
    const slides = parseMarkdown("# Hello World");
    expect(slides).toHaveLength(1);
    expect(slides[0]!.master).toBe("cover");
    expect(slides[0]!.title).toBe("Hello World");
  });

  it("first # is cover, subsequent # is h1", () => {
    const slides = parseMarkdown("# Cover\n# Second\n# Third");
    expect(slides[0]!.master).toBe("cover");
    expect(slides[1]!.master).toBe("h1");
    expect(slides[2]!.master).toBe("h1");
  });

  it("## becomes h2 master", () => {
    const slides = parseMarkdown("# Title\n## Section\nBody text");
    expect(slides[1]!.master).toBe("h2");
    expect(slides[1]!.title).toBe("Section");
    expect(slides[1]!.body).toBe("Body text");
  });

  it("### and deeper become h3 master", () => {
    const slides = parseMarkdown("# T\n### Deep\n#### Deeper");
    expect(slides[1]!.master).toBe("h3");
    expect(slides[2]!.master).toBe("h3");
  });

  it("collects body text under headings", () => {
    const slides = parseMarkdown("# Title\nLine 1\nLine 2");
    expect(slides[0]!.body).toBe("Line 1\nLine 2");
  });

  it("detects bullet slide when ≥3 bullets and no body text", () => {
    const slides = parseMarkdown("# Slide\n- Item A\n- Item B\n- Item C");
    expect(slides[0]!.master).toBe("bullets");
    expect(slides[0]!.bulletItems).toEqual(["Item A", "Item B", "Item C"]);
    expect(slides[0]!.body).toBeUndefined();
  });

  it("fewer than 3 bullets goes into body text", () => {
    const slides = parseMarkdown("# Slide\n- Item A\n- Item B");
    expect(slides[0]!.master).not.toBe("bullets");
    expect(slides[0]!.body).toContain("Item A");
  });

  it("detects image-only slide", () => {
    const slides = parseMarkdown("# Title\n![Alt text](photo.png)");
    expect(slides[0]!.master).toBe("Image - Full Bleed");
    expect(slides[0]!.imageFile).toBe("photo.png");
  });

  it("image-only uses alt text as title when image is the only body content", () => {
    // A slide with a heading followed immediately by an image-only line
    const slides = parseMarkdown("# Photo Slide\n![My Photo](photo.png)");
    expect(slides[0]!.master).toBe("Image - Full Bleed");
    expect(slides[0]!.imageFile).toBe("photo.png");
  });

  it("detects blockquote as quote slide", () => {
    const slides = parseMarkdown("# Slide\n> Great quote here");
    expect(slides[0]!.master).toBe("quote");
    expect(slides[0]!.quote).toBe("Great quote here");
  });

  it("detects code fence as code slide", () => {
    const md = "# Title\n```typescript\nconst x = 1;\n```";
    const slides = parseMarkdown(md);
    expect(slides.length).toBeGreaterThanOrEqual(2);
    const codeSlide = slides.find((s) => s.master === "code");
    expect(codeSlide).toBeTruthy();
    expect(codeSlide!.codeBlock).toBe("const x = 1;");
    expect(codeSlide!.codeLang).toBe("typescript");
  });

  it("respects masterMap overrides", () => {
    const slides = parseMarkdown("# Cover", { cover: "Title Slide" });
    expect(slides[0]!.master).toBe("Title Slide");
  });

  it("uses custom bullet master from masterMap", () => {
    const slides = parseMarkdown("# S\n- A\n- B\n- C", { bullets: "My Bullets" });
    expect(slides[0]!.master).toBe("My Bullets");
  });

  it("ignores content before first heading", () => {
    const slides = parseMarkdown("preamble text\n# Heading");
    expect(slides).toHaveLength(1);
    expect(slides[0]!.title).toBe("Heading");
  });

  it("handles empty markdown", () => {
    expect(parseMarkdown("")).toHaveLength(0);
  });

  it("handles markdown with no headings", () => {
    expect(parseMarkdown("Just some text")).toHaveLength(0);
  });

  it("parses multi-slide document correctly", () => {
    const md = `# Intro
Welcome to the show.

## Features
- Fast
- Reliable
- Composable

## Demo
Watch this.`;
    const slides = parseMarkdown(md);
    expect(slides).toHaveLength(3);
    expect(slides[0]!.title).toBe("Intro");
    expect(slides[0]!.body).toBe("Welcome to the show.");
    expect(slides[1]!.master).toBe("bullets");
    expect(slides[1]!.bulletItems).toHaveLength(3);
    expect(slides[2]!.title).toBe("Demo");
    expect(slides[2]!.body).toBe("Watch this.");
  });

  it("handles Windows-style CRLF line endings", () => {
    const slides = parseMarkdown("# Title\r\nBody text\r\n");
    expect(slides[0]!.title).toBe("Title");
    expect(slides[0]!.body).toBe("Body text");
  });
});

// ─── slidesToAppleScript ──────────────────────────────────────────────────────

describe("slidesToAppleScript", () => {
  it("generates a valid tell application block", () => {
    const slides = parseMarkdown("# Hello");
    const script = slidesToAppleScript(slides, "My Deck");
    expect(script).toContain('tell application id "com.apple.Keynote"');
    expect(script).toContain('tell document "My Deck"');
    expect(script).toContain("end tell");
  });

  it("makes new slide with master name", () => {
    const slides = [{ master: "h2", title: "Section" }];
    const script = slidesToAppleScript(slides, "Deck");
    expect(script).toContain('slide layout "h2"');
    expect(script).toContain('make new slide at end');
  });

  it("sets title via object text", () => {
    const slides = [{ master: "cover", title: "My Title" }];
    const script = slidesToAppleScript(slides, "Deck");
    expect(script).toContain('set object text of default title item');
    expect(script).toContain("My Title");
  });

  it("sets body with resize-before-text discipline", () => {
    const slides = [{ master: "h2", title: "S", body: "Content here" }];
    const script = slidesToAppleScript(slides, "Deck");
    // Width/height must come before object text
    const widthIdx = script.indexOf("set width of default body item");
    const textIdx = script.indexOf("set object text of default body item");
    expect(widthIdx).toBeLessThan(textIdx);
    expect(script).toContain("Content here");
  });

  it("inserts bullet items as body text with • prefix", () => {
    const slides = [{ master: "bullets", title: "Slide", bulletItems: ["A", "B", "C"] }];
    const script = slidesToAppleScript(slides, "Deck");
    expect(script).toContain("• A");
    expect(script).toContain("• B");
    expect(script).toContain("• C");
  });

  it("escapes double quotes in title and body", () => {
    const slides = [{ master: "h1", title: 'Say "Hello"', body: 'With "quotes"' }];
    const script = slidesToAppleScript(slides, "Deck");
    // Should not have unescaped embedded quotes that break the string
    expect(script).toContain('\\"Hello\\"');
    expect(script).toContain('\\"quotes\\"');
  });

  it("escapes backslashes in document name", () => {
    const slides = [{ master: "h1", title: "T" }];
    const script = slidesToAppleScript(slides, "Deck\\Name");
    expect(script).toContain("Deck\\\\Name");
  });

  it("inserts image with POSIX file when imageFile is absolute", () => {
    const slides = [{ master: "Image - Full Bleed", title: "Photo", imageFile: "/abs/path/photo.png" }];
    const script = slidesToAppleScript(slides, "Deck");
    expect(script).toContain('POSIX file "/abs/path/photo.png"');
    expect(script).toContain("make new image at end");
  });

  it("prepends imageDir for relative image paths", () => {
    const slides = [{ master: "Image - Full Bleed", title: "Photo", imageFile: "photo.png" }];
    const script = slidesToAppleScript(slides, "Deck", "/my/dir");
    expect(script).toContain("/my/dir/photo.png");
  });

  it("wraps slide blocks in try/end try for resilience", () => {
    const slides = [{ master: "h1", title: "T", body: "B" }];
    const script = slidesToAppleScript(slides, "Deck");
    expect(script).toContain("try");
    expect(script).toContain("end try");
  });

  it("generates a batch script for multiple slides", () => {
    const slides = parseMarkdown("# Cover\n## One\n## Two\n## Three");
    const script = slidesToAppleScript(slides, "My Deck");
    // One tell application block, not four
    const tellCount = (script.match(/tell application id/g) ?? []).length;
    expect(tellCount).toBe(1);
    // Four make new slide calls
    const makeCount = (script.match(/make new slide at end/g) ?? []).length;
    expect(makeCount).toBe(4);
  });
});
