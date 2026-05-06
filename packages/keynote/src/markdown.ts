/**
 * Lightweight Keynote-flavored markdown parser.
 *
 * Converts a markdown document into SlideUnit[] consumed by
 * keynote_from_markdown. Intentionally minimal — no external deps.
 *
 * Master naming convention (all overridable via masterMap):
 *   cover      → first # heading (title card)
 *   h1         → subsequent # headings
 *   h2         → ## headings
 *   h3         → ### and deeper
 *   quote      → > blockquote paragraph
 *   bullets    → unordered list with ≥3 items + no other body text
 *   imageOnly  → image-only paragraph (standalone ![]() line)
 *   code       → ``` fenced code block
 */

export interface MasterMap {
  cover?: string;
  h1?: string;
  h2?: string;
  h3?: string;
  quote?: string;
  bullets?: string;
  imageOnly?: string;
  code?: string;
}

const DEFAULT_MASTERS: Required<MasterMap> = {
  cover: "cover",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  quote: "quote",
  bullets: "bullets",
  imageOnly: "Image - Full Bleed",
  code: "code",
};

export interface SlideUnit {
  /** Keynote slide master / layout name */
  master: string;
  /** Slide title (maps to default title item) */
  title: string;
  /** Free-form body text (maps to default body item) */
  body?: string;
  /** Bullet list items (kind === "bullets") */
  bulletItems?: string[];
  /** Code block source (kind === "code") */
  codeBlock?: string;
  /** Code fence language hint */
  codeLang?: string;
  /** Image file path (kind === "imageOnly") */
  imageFile?: string;
  /** Pull-quote text (kind === "quote") */
  quote?: string;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

export function parseMarkdown(md: string, masterMap: MasterMap = {}): SlideUnit[] {
  const masters = { ...DEFAULT_MASTERS, ...masterMap };
  const lines = md.split(/\r?\n/);
  const slides: SlideUnit[] = [];
  let isFirstHeading = true;

  // Mutable accumulator for the current slide
  let current: Partial<SlideUnit> | null = null;
  let bodyLines: string[] = [];
  let bulletItems: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "";

  function flushCurrent() {
    if (!current) return;

    const unit = { ...current } as SlideUnit;
    if (!unit.title) unit.title = "";

    // Decide body vs bullets
    if (bulletItems.length >= 3 && bodyLines.length === 0 && !unit.imageFile) {
      unit.master = masters.bullets;
      unit.bulletItems = [...bulletItems];
    } else if (bodyLines.length > 0) {
      // Inline the bullet items as "• item" if mixed
      const allBody = [
        ...bulletItems.map((b) => `• ${b}`),
        ...bodyLines,
      ];
      unit.body = allBody.join("\n").trim();
    } else if (bulletItems.length > 0 && bulletItems.length < 3) {
      unit.body = bulletItems.map((b) => `• ${b}`).join("\n");
    }

    slides.push(unit);
    current = null;
    bodyLines = [];
    bulletItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Code fence ─────────────────────────────────────────────────────────
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCode = false;
        flushCurrent();
        current = {
          master: masters.code,
          title: codeLang ? `Code — ${codeLang}` : "Code",
          codeBlock: codeLines.join("\n"),
          codeLang: codeLang || undefined,
        };
        flushCurrent();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // ── Heading ─────────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushCurrent();
      const depth = headingMatch[1].length;
      const title = headingMatch[2].trim();
      let master: string;
      if (isFirstHeading) {
        master = masters.cover;
        isFirstHeading = false;
      } else if (depth === 1) {
        master = masters.h1;
      } else if (depth === 2) {
        master = masters.h2;
      } else {
        master = masters.h3;
      }
      current = { master, title };
      continue;
    }

    // No current slide yet — skip content before first heading
    if (!current) continue;

    // ── Blockquote ──────────────────────────────────────────────────────────
    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      const text = quoteMatch[1].trim();
      if (bodyLines.length === 0 && bulletItems.length === 0 && !current.quote) {
        current.master = masters.quote;
        current.quote = text;
      } else if (text) {
        bodyLines.push(`"${text}"`);
      }
      continue;
    }

    // ── Image-only line ──────────────────────────────────────────────────────
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imageMatch) {
      const alt = imageMatch[1].trim();
      const src = imageMatch[2].trim();
      if (bodyLines.length === 0 && bulletItems.length === 0 && !current.imageFile && !current.body) {
        current.master = masters.imageOnly;
        current.imageFile = src;
        if (!current.title && alt) current.title = alt;
      } else {
        bodyLines.push(line);
      }
      continue;
    }

    // ── Bullet list item ────────────────────────────────────────────────────
    const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      bulletItems.push(bulletMatch[1].trim());
      continue;
    }

    // ── Empty line ──────────────────────────────────────────────────────────
    if (line.trim() === "") {
      // Empty lines are separators but don't flush slides
      continue;
    }

    // ── Regular body text ───────────────────────────────────────────────────
    // If we had bullets followed by prose, fold bullets into body
    if (bulletItems.length > 0) {
      bodyLines.push(...bulletItems.map((b) => `• ${b}`));
      bulletItems = [];
    }
    bodyLines.push(line);
  }

  // Close open code fence gracefully
  if (inCode && codeLines.length > 0) {
    flushCurrent();
    current = {
      master: masters.code,
      title: codeLang ? `Code — ${codeLang}` : "Code",
      codeBlock: codeLines.join("\n"),
      codeLang: codeLang || undefined,
    };
  }

  flushCurrent();
  return slides;
}

// ─── AppleScript codegen ─────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Generate one AppleScript block that creates all slides in one osascript
 * call (~400ms startup saved vs. per-slide calls).
 *
 * Does NOT create the document itself — caller must open or create it first.
 *
 * Quirks baked in:
 *   - geometry set BEFORE object text (>48pt clipping bug)
 *   - `object text` not `text` (iWork shape API)
 *   - `tell document → tell slide` nesting (bare `tell slide` silently fails)
 */
export function slidesToAppleScript(
  slides: SlideUnit[],
  docName: string,
  imageDir = "",
): string {
  const d = esc(docName);
  const lines: string[] = [
    `tell application id "com.apple.Keynote"`,
    `  tell document "${d}"`,
  ];

  for (const slide of slides) {
    const m = esc(slide.master);
    const t = esc(slide.title);

    lines.push(`    -- === ${t} ===`);
    lines.push(
      `    set ns to make new slide at end with properties ¬`,
      `      {base layout: slide layout "${m}" of document theme}`,
    );

    if (slide.title) {
      lines.push(`    try`);
      lines.push(`      set object text of default title item of ns to "${t}"`);
      lines.push(`    end try`);
    }

    // Body / bullets / code / quote
    const bodyText =
      slide.body ??
      (slide.bulletItems ? slide.bulletItems.map((b) => `• ${b}`).join("\n") : undefined) ??
      slide.codeBlock ??
      (slide.quote ? `"${esc(slide.quote)}"` : undefined);

    if (bodyText) {
      const b = esc(bodyText);
      lines.push(`    try`);
      // Resize before text — geometry first
      lines.push(`      set width of default body item of ns to 900`);
      lines.push(`      set height of default body item of ns to 600`);
      lines.push(`      set object text of default body item of ns to "${b}"`);
      lines.push(`    end try`);
    }

    // Image insertion
    if (slide.imageFile) {
      const imgPath =
        slide.imageFile.startsWith("/") || slide.imageFile.startsWith("~")
          ? slide.imageFile
          : imageDir
          ? `${imageDir}/${slide.imageFile}`
          : slide.imageFile;
      const img = esc(imgPath);
      lines.push(`    try`);
      lines.push(
        `      make new image at end of ns with properties ¬`,
        `        {file: POSIX file "${img}", position: {0, 0}, width: 1920, height: 1080}`,
      );
      lines.push(`    end try`);
    }
  }

  lines.push(`  end tell`);
  lines.push(`end tell`);
  return lines.join("\n");
}
