import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../../config.js";
import {
  activateApp,
  closeDocumentInApp,
  exportDocumentInApp,
  isAppRunning,
  openDocumentInApp,
} from "../iwork/shared.js";
import { runAppleScript, escapeAppleScriptString } from "../../runners/applescript.js";
import { buildProjectFcpxml } from "../../fcpxml/builder.js";
import { CreatorStudioError } from "../../errors.js";
import { encodeJob } from "../compressor/cli.js";
import { openWithApp } from "../../runners/openApp.js";
import { parseMarkdown, slidesToAppleScript } from "./markdown.js";
import type { MasterMap } from "./markdown.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok<T>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function err(e: unknown) {
  if (e instanceof CreatorStudioError) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { code: e.code, message: e.message, hint: e.hint },
            null,
            2,
          ),
        },
      ],
    };
  }
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            code: "E_INTERNAL",
            message: e instanceof Error ? e.message : String(e),
          },
          null,
          2,
        ),
      },
    ],
  };
}

const e = escapeAppleScriptString;

// ─── Schema constants ─────────────────────────────────────────────────────────

const ImageFormatSchema = z.enum(["PNG", "JPEG", "TIFF"]).default("PNG");

/**
 * All 43 Keynote transition effects from the sdef.
 * Used as unquoted AppleScript enumerators.
 */
const TransitionEffectSchema = z.enum([
  "no transition effect",
  "magic move",
  "shimmer",
  "sparkle",
  "swing",
  "object cube",
  "object flip",
  "object pop",
  "object push",
  "object revolve",
  "object zoom",
  "perspective",
  "clothesline",
  "confetti",
  "dissolve",
  "drop",
  "droplet",
  "fade through color",
  "grid",
  "iris",
  "move in",
  "push",
  "reveal",
  "switch",
  "wipe",
  "blinds",
  "color planes",
  "cube",
  "doorway",
  "fall",
  "flip",
  "flop",
  "mosaic",
  "page flip",
  "pivot",
  "reflection",
  "revolving door",
  "scale",
  "swap",
  "swoosh",
  "twirl",
  "twist",
  "fade and move",
]);

/**
 * Chart types from the Keynote sdef (legacy chart type enumerators).
 */
const ChartTypeSchema = z.enum([
  "pie_2d",
  "pie_3d",
  "vertical_bar_2d",
  "vertical_bar_3d",
  "stacked_vertical_bar_2d",
  "stacked_vertical_bar_3d",
  "horizontal_bar_2d",
  "horizontal_bar_3d",
  "stacked_horizontal_bar_2d",
  "stacked_horizontal_bar_3d",
  "line_2d",
  "line_3d",
  "area_2d",
  "area_3d",
  "stacked_area_2d",
  "stacked_area_3d",
  "scatterplot_2d",
  "mixed_2d",
  "two_axis_2d",
]);

const MovieFormatSchema = z.enum([
  "format360p",
  "format540p",
  "format720p",
  "format1080p",
  "format2160p",
  "native size",
]).default("format1080p");

const MovieCodecSchema = z.enum([
  "h264",
  "AppleProRes422",
  "AppleProRes4444",
  "AppleProRes422LT",
  "AppleProRes422HQ",
  "AppleProRes422Proxy",
  "HEVC",
]).default("h264");

const MovieFramerateSchema = z.enum([
  "FPS12",
  "FPS2398",
  "FPS24",
  "FPS25",
  "FPS2997",
  "FPS30",
  "FPS50",
  "FPS5994",
  "FPS60",
]).default("FPS2997");

// ─── Tool registration ────────────────────────────────────────────────────────

export function registerKeynoteTools(server: McpServer) {
  const bid = () => loadConfig().keynoteBundleId;

  // ── App lifecycle ─────────────────────────────────────────────────────────

  server.tool(
    "keynote_app_open",
    "Activate Keynote (bring it to the foreground). Does not open a document.",
    {},
    async () => {
      try {
        await activateApp(bid());
        return ok({ opened: true });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_app_running",
    "Check whether Keynote is currently running. Returns {running: boolean}.",
    {},
    async () => {
      try {
        return ok({ running: await isAppRunning(bid()) });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Document management ───────────────────────────────────────────────────

  server.tool(
    "keynote_open",
    "Open a Keynote document (.key file) and return its name. The name is used by all other Keynote tools.",
    { path: z.string().describe("Absolute path to a .key file") },
    async ({ path }) => {
      try {
        return ok(await openDocumentInApp(bid(), path));
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_close",
    "Close a Keynote document. Set saving to 'yes' to save before close.",
    {
      name: z.string().describe("Document name as returned by keynote_open"),
      saving: z.enum(["yes", "no", "ask"]).default("no"),
    },
    async ({ name, saving }) => {
      try {
        await closeDocumentInApp(bid(), name, saving);
        return ok({ closed: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_list_presentations",
    "List all currently open Keynote documents. Returns [{name, modified}].",
    {},
    async () => {
      try {
        const script = `
tell application id "${bid()}"
  set result to {}
  repeat with d in documents
    set end of result to (name of d)
  end repeat
  return result
end tell`;
        const raw = await runAppleScript(script);
        const names = raw.trim() ? raw.trim().split(", ") : [];
        return ok({ documents: names });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_create_presentation",
    "Create a new blank Keynote presentation and return its name.",
    {
      themeName: z.string().optional().describe("Theme name to apply (e.g. 'White', 'Black', 'Gradient')"),
      width: z.number().int().positive().optional().describe("Slide width in points (default 1920 for 16:9)"),
      height: z.number().int().positive().optional().describe("Slide height in points (default 1080)"),
    },
    async ({ themeName, width, height }) => {
      try {
        let propsRecord = "";
        if (width && height) {
          propsRecord = ` with properties {width: ${width}, height: ${height}}`;
        }
        const makeScript = `
tell application id "${bid()}"
  set newDoc to make new document${propsRecord}
  return name of newDoc
end tell`;
        const docName = (await runAppleScript(makeScript, { timeoutMs: 15_000 })).trim();

        if (themeName) {
          const t = e(themeName);
          const themeScript = `
tell application id "${bid()}"
  set document theme of document "${e(docName)}" to theme "${t}"
end tell`;
          await runAppleScript(themeScript);
        }
        return ok({ name: docName, created: true });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_save",
    "Save a Keynote document. Optionally save to a different path.",
    {
      name: z.string().describe("Document name as returned by keynote_open"),
      outputPath: z.string().optional().describe("Save to this path (save-as). Omit to save in place."),
    },
    async ({ name, outputPath }) => {
      try {
        const d = e(name);
        const script = outputPath
          ? `tell application id "${bid()}" to save document "${d}" in POSIX file "${e(outputPath)}"`
          : `tell application id "${bid()}" to save document "${d}"`;
        await runAppleScript(script);
        return ok({ saved: name, path: outputPath ?? "in place" });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Theme & master ────────────────────────────────────────────────────────

  server.tool(
    "keynote_list_themes",
    "List all Keynote themes available to the application. Returns [{name}].",
    {},
    async () => {
      try {
        const script = `
tell application id "${bid()}"
  set themeNames to {}
  repeat with t in themes
    set end of themeNames to (name of t)
  end repeat
  return themeNames
end tell`;
        const raw = await runAppleScript(script);
        const names = raw.trim() ? raw.trim().split(", ") : [];
        return ok({ themes: names.map((n) => ({ name: n })) });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_apply_theme",
    "Apply a Keynote theme to an open document. All existing slides keep their layout; masters from the new theme are available.",
    {
      name: z.string().describe("Document name"),
      themeName: z.string().describe("Theme name (e.g. 'White', 'Black', 'Gradient', 'Slate')"),
    },
    async ({ name, themeName }) => {
      try {
        const script = `
tell application id "${bid()}"
  set document theme of document "${e(name)}" to theme "${e(themeName)}"
end tell`;
        await runAppleScript(script);
        return ok({ applied: themeName, to: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_list_masters",
    "List all slide master layouts (slide layouts) in a document's current theme.",
    { name: z.string().describe("Document name") },
    async ({ name }) => {
      try {
        const script = `
tell application id "${bid()}"
  set layoutNames to {}
  repeat with sl in slide layouts of document theme of document "${e(name)}"
    set end of layoutNames to (name of sl)
  end repeat
  return layoutNames
end tell`;
        const raw = await runAppleScript(script);
        const names = raw.trim() ? raw.trim().split(", ") : [];
        return ok({ masters: names.map((n) => ({ name: n })) });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_set_slide_master",
    "Set the master layout (slide layout) of an existing slide.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      masterName: z.string().describe("Master layout name from keynote_list_masters"),
    },
    async ({ name, slideIndex, masterName }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    set base layout of slide ${slideIndex} to slide layout "${e(masterName)}" of document theme
  end tell
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, masterName, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Slide CRUD ────────────────────────────────────────────────────────────

  server.tool(
    "keynote_list_slides",
    "List all slides in a Keynote document with index, title, and skip status.",
    { name: z.string().describe("Document name") },
    async ({ name }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    set slideList to {}
    repeat with i from 1 to count of slides
      set s to slide i
      set titleText to ""
      try
        set titleText to object text of default title item of s
      end try
      set end of slideList to {slideNumber: i, title: titleText, skipped: skipped of s}
    end repeat
    return slideList
  end tell
end tell`;
        const raw = await runAppleScript(script);
        // Parse AppleScript record list
        return ok({ slides: parseAppleScriptSlideList(raw) });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_make_slide",
    "Add a new slide to a Keynote document. Returns the new slide index.",
    {
      name: z.string().describe("Document name"),
      masterName: z.string().optional().describe("Master layout name (e.g. 'Title & Bullets'). Uses theme default if omitted."),
      afterSlide: z.number().int().min(1).optional().describe("Insert after this 1-indexed slide. Appends to end if omitted."),
    },
    async ({ name, masterName, afterSlide }) => {
      try {
        const positionClause = afterSlide
          ? `at after slide ${afterSlide} of document "${e(name)}"`
          : `at end of document "${e(name)}"`;

        const masterClause = masterName
          ? ` with properties {base layout: slide layout "${e(masterName)}" of document theme of document "${e(name)}"}`
          : "";

        const script = `
tell application id "${bid()}"
  set newSlide to make new slide ${positionClause}${masterClause}
  return slide number of newSlide
end tell`;
        const raw = await runAppleScript(script, { timeoutMs: 10_000 });
        return ok({ slideIndex: parseInt(raw.trim(), 10) || null, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_delete_slide",
    "Delete a slide from a Keynote document.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number to delete"),
    },
    async ({ name, slideIndex }) => {
      try {
        const script = `tell application id "${bid()}" to delete slide ${slideIndex} of document "${e(name)}"`;
        await runAppleScript(script);
        return ok({ deleted: slideIndex, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_duplicate_slide",
    "Duplicate a slide in a Keynote document. Returns the new slide's index.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number to duplicate"),
    },
    async ({ name, slideIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  set duped to duplicate slide ${slideIndex} of document "${e(name)}"
  return slide number of duped
end tell`;
        const raw = await runAppleScript(script);
        return ok({ original: slideIndex, duplicate: parseInt(raw.trim(), 10) || null });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_reorder_slide",
    "Move (reorder) a Keynote slide to a different position in the presentation. Specify the slide to move by index and the target position. To reposition or resize items within a slide, use keynote_position_item instead.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number to move"),
      afterSlide: z.number().int().min(0).describe("Move after this slide number (0 = move to beginning)"),
    },
    async ({ name, slideIndex, afterSlide }) => {
      try {
        const positionClause = afterSlide === 0
          ? `before slide 1 of document "${e(name)}"`
          : `after slide ${afterSlide} of document "${e(name)}"`;
        const script = `tell application id "${bid()}" to move slide ${slideIndex} of document "${e(name)}" to ${positionClause}`;
        await runAppleScript(script);
        return ok({ moved: slideIndex, afterSlide, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_skip_slide",
    "Mark a slide as skipped (hidden during slideshow) or unskip it.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      skipped: z.boolean().default(true).describe("true to skip, false to unskip"),
    },
    async ({ name, slideIndex, skipped }) => {
      try {
        const script = `
tell application id "${bid()}"
  set skipped of slide ${slideIndex} of document "${e(name)}" to ${skipped}
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, skipped, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_get_slide",
    "Read a slide's metadata: title, body, presenter notes, transition, and skip status.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
    },
    async ({ name, slideIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    tell slide ${slideIndex}
      set titleText to ""
      set bodyText to ""
      set notesText to ""
      try
        set titleText to object text of default title item
      end try
      try
        set bodyText to object text of default body item
      end try
      try
        set notesText to presenter notes as string
      end try
      set tp to transition properties
      return "title=" & titleText & "|||body=" & bodyText & "|||notes=" & notesText & "|||effect=" & (transition effect of tp as string) & "|||duration=" & (transition duration of tp as string) & "|||skipped=" & (skipped as string)
    end tell
  end tell
end tell`;
        const raw = await runAppleScript(script);
        return ok(parseSlideInfo(raw));
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_list_items",
    "List all iWork items on a slide (shapes, images, text boxes, tables, charts, lines).",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
    },
    async ({ name, slideIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    tell slide ${slideIndex}
      set itemList to {}
      repeat with i from 1 to count of iWork items
        set itm to iWork item i
        set itmClass to class of itm as string
        set pos to position of itm
        set end of itemList to (itmClass & ":" & (item 1 of pos as string) & "," & (item 2 of pos as string) & ":" & (width of itm as string) & "x" & (height of itm as string))
      end repeat
      return itemList
    end tell
  end tell
end tell`;
        const raw = await runAppleScript(script);
        const items = raw.trim() ? raw.trim().split(", ").map(parseItemEntry) : [];
        return ok({ slideIndex, items });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Content — title, body, presenter notes ────────────────────────────────

  server.tool(
    "keynote_set_title",
    "Set the title text on a Keynote slide using the default title item.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      title: z.string().describe("Title text to set"),
    },
    async ({ name, slideIndex, title }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    set object text of default title item of slide ${slideIndex} to "${e(title)}"
  end tell
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, title, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_set_body",
    "Set the body text on a Keynote slide using the default body item. Applies resize-before-text discipline to avoid >48pt font clipping.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      body: z.string().describe("Body text. Use newlines for paragraphs / bullet levels."),
      fontSize: z.number().positive().optional().describe("Font size in points. Applied after geometry is set."),
    },
    async ({ name, slideIndex, body, fontSize }) => {
      try {
        // Resize-before-text discipline: set geometry first, then text, then font
        let script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    tell slide ${slideIndex}
      set width of default body item to 900
      set height of default body item to 600
      set object text of default body item to "${e(body)}"`;
        if (fontSize) {
          script += `
      set size of object text of default body item to ${fontSize}`;
        }
        script += `
    end tell
  end tell
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, body, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_set_text_style",
    "Style the text of a slide item (title, body, or text box). Supports font, size, and color.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      itemKind: z.enum(["title", "body"]).describe("Which item to style"),
      font: z.string().optional().describe("PostScript or display font name (e.g. 'HelveticaNeue-Bold')"),
      fontSize: z.number().positive().optional().describe("Font size in points"),
      colorR: z.number().int().min(0).max(65535).optional().describe("Red channel 0-65535"),
      colorG: z.number().int().min(0).max(65535).optional().describe("Green channel 0-65535"),
      colorB: z.number().int().min(0).max(65535).optional().describe("Blue channel 0-65535"),
      paragraphIndex: z.number().int().min(1).optional().describe("Style only this paragraph (1-indexed). Omit to style all text."),
    },
    async ({ name, slideIndex, itemKind, font, fontSize, colorR, colorG, colorB, paragraphIndex }) => {
      try {
        const itemRef = itemKind === "title"
          ? "default title item"
          : "default body item";
        const textRef = paragraphIndex
          ? `paragraph ${paragraphIndex} of object text of ${itemRef}`
          : `object text of ${itemRef}`;

        const statements: string[] = [];
        if (font) statements.push(`      set font of ${textRef} of slide ${slideIndex} to "${e(font)}"`);
        if (fontSize) statements.push(`      set size of ${textRef} of slide ${slideIndex} to ${fontSize}`);
        if (colorR !== undefined && colorG !== undefined && colorB !== undefined) {
          statements.push(`      set color of ${textRef} of slide ${slideIndex} to {${colorR}, ${colorG}, ${colorB}}`);
        }

        if (statements.length === 0) {
          return ok({ noOp: true });
        }

        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
${statements.join("\n")}
  end tell
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, itemKind, styled: true, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_get_presenter_notes",
    "Read the presenter notes from a specific slide.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
    },
    async ({ name, slideIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  return presenter notes of slide ${slideIndex} of document "${e(name)}" as string
end tell`;
        const raw = await runAppleScript(script);
        return ok({ slideIndex, notes: raw.trim() });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_set_presenter_notes",
    "Set the presenter notes on a Keynote slide. Notes are rich text; pass plain text.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      notes: z.string().describe("Presenter notes text to set"),
    },
    async ({ name, slideIndex, notes }) => {
      try {
        const script = `
tell application id "${bid()}"
  set presenter notes of slide ${slideIndex} of document "${e(name)}" to "${e(notes)}"
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, notesLength: notes.length, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_extract_all_notes",
    "Extract presenter notes and titles from every slide. Returns [{slideNumber, title, notes}]. Useful for crew handoff and keynote_to_storyboard_fcp.",
    { name: z.string().describe("Document name") },
    async ({ name }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    set noteData to {}
    repeat with i from 1 to count of slides
      set s to slide i
      set titleText to ""
      set notesText to ""
      try
        set titleText to object text of default title item of s
      end try
      try
        set notesText to presenter notes of s as string
      end try
      set end of noteData to (i as string) & "|||" & titleText & "|||" & notesText
    end repeat
    return noteData
  end tell
end tell`;
        const raw = await runAppleScript(script, { timeoutMs: 60_000 });
        const entries = raw.trim()
          ? raw
              .trim()
              .split(", ")
              .map((entry) => {
                const parts = entry.split("|||");
                return {
                  slideNumber: parseInt(parts[0] ?? "0", 10),
                  title: parts[1]?.trim() ?? "",
                  notes: parts[2]?.trim() ?? "",
                };
              })
          : [];
        return ok({ slides: entries });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Transitions ───────────────────────────────────────────────────────────

  server.tool(
    "keynote_set_transition",
    "Set the slide transition on a Keynote slide. Supports all 43 sdef-defined effects plus timing.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      effect: TransitionEffectSchema.describe("Transition effect name"),
      duration: z.number().min(0).max(10).default(1.0).describe("Transition duration in seconds"),
      delay: z.number().min(0).default(0).describe("Delay before transition starts (seconds)"),
      automatic: z.boolean().default(false).describe("Advance automatically without a click"),
    },
    async ({ name, slideIndex, effect, duration, delay, automatic }) => {
      try {
        const script = `
tell application id "${bid()}"
  set transition properties of slide ${slideIndex} of document "${e(name)}" to ¬
    {automatic transition: ${automatic}, transition delay: ${delay}, transition duration: ${duration}, transition effect: ${effect}}
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, effect, duration, delay, automatic, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Visual elements ───────────────────────────────────────────────────────

  server.tool(
    "keynote_insert_image",
    "Insert an image onto a Keynote slide from a file path.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      filePath: z.string().describe("Absolute path to the image file (PNG, JPEG, etc.)"),
      x: z.number().default(100).describe("X position in points"),
      y: z.number().default(100).describe("Y position in points"),
      width: z.number().positive().optional().describe("Width in points"),
      height: z.number().positive().optional().describe("Height in points"),
      description: z.string().optional().describe("VoiceOver alt text description"),
    },
    async ({ name, slideIndex, filePath, x, y, width, height, description }) => {
      try {
        const props: string[] = [
          `file: POSIX file "${e(filePath)}"`,
          `position: {${x}, ${y}}`,
        ];
        if (width) props.push(`width: ${width}`);
        if (height) props.push(`height: ${height}`);
        if (description) props.push(`description: "${e(description)}"`);

        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    make new image at end of slide ${slideIndex} with properties ¬
      {${props.join(", ")}}
  end tell
end tell`;
        await runAppleScript(script, { timeoutMs: 15_000 });
        return ok({ inserted: "image", slideIndex, filePath, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_set_voiceover_description",
    "Set the VoiceOver accessibility description on a slide image.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      imageIndex: z.number().int().min(1).default(1).describe("1-indexed image number on the slide"),
      description: z.string().describe("Accessibility description text"),
    },
    async ({ name, slideIndex, imageIndex, description }) => {
      try {
        const script = `
tell application id "${bid()}"
  set description of image ${imageIndex} of slide ${slideIndex} of document "${e(name)}" to "${e(description)}"
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, imageIndex, description, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_insert_shape",
    "Insert a rectangle shape onto a Keynote slide. Shapes default to rectangle geometry; use `object text` for text inside.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      text: z.string().optional().describe("Text inside the shape (uses 'object text' — the iWork shape API, not 'text')"),
      x: z.number().default(200).describe("X position in points"),
      y: z.number().default(200).describe("Y position in points"),
      width: z.number().positive().default(300).describe("Width in points"),
      height: z.number().positive().default(200).describe("Height in points"),
      opacity: z.number().min(0).max(100).default(100).describe("Opacity 0-100"),
      rotation: z.number().min(0).max(359).default(0).describe("Rotation in degrees 0-359"),
      reflectionShowing: z.boolean().default(false).describe("Show reflection"),
      reflectionValue: z.number().min(0).max(100).default(0).describe("Reflection intensity 0-100"),
    },
    async ({ name, slideIndex, text, x, y, width, height, opacity, rotation, reflectionShowing, reflectionValue }) => {
      try {
        // Must include width + height in the SAME with properties record (default-tiny bug)
        const props: string[] = [
          `position: {${x}, ${y}}`,
          `width: ${width}`,
          `height: ${height}`,
          `opacity: ${opacity}`,
          `rotation: ${rotation}`,
          `reflection showing: ${reflectionShowing}`,
          `reflection value: ${reflectionValue}`,
        ];
        if (text) props.push(`object text: "${e(text)}"`);

        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    make new shape at end of slide ${slideIndex} with properties ¬
      {${props.join(", ")}}
  end tell
end tell`;
        await runAppleScript(script, { timeoutMs: 10_000 });
        return ok({ inserted: "shape", slideIndex, width, height, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_insert_line",
    "Insert a line element onto a Keynote slide.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      x1: z.number().describe("Start X in points"),
      y1: z.number().describe("Start Y in points"),
      x2: z.number().describe("End X in points"),
      y2: z.number().describe("End Y in points"),
      rotation: z.number().min(0).max(359).default(0).describe("Rotation in degrees"),
    },
    async ({ name, slideIndex, x1, y1, x2, y2, rotation }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    make new line at end of slide ${slideIndex} with properties ¬
      {start point: {${x1}, ${y1}}, end point: {${x2}, ${y2}}, rotation: ${rotation}}
  end tell
end tell`;
        await runAppleScript(script, { timeoutMs: 10_000 });
        return ok({ inserted: "line", slideIndex, start: [x1, y1], end: [x2, y2], document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_insert_table",
    "Insert a table onto a Keynote slide.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      rows: z.number().int().min(1).max(50).default(3).describe("Number of rows"),
      columns: z.number().int().min(1).max(20).default(3).describe("Number of columns"),
      x: z.number().default(100).describe("X position in points"),
      y: z.number().default(200).describe("Y position in points"),
      width: z.number().positive().default(600).describe("Table width in points"),
      height: z.number().positive().default(300).describe("Table height in points"),
    },
    async ({ name, slideIndex, rows, columns, x, y, width, height }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    make new table at end of slide ${slideIndex} with properties ¬
      {row count: ${rows}, column count: ${columns}, position: {${x}, ${y}}, width: ${width}, height: ${height}}
  end tell
end tell`;
        await runAppleScript(script, { timeoutMs: 15_000 });
        return ok({ inserted: "table", slideIndex, rows, columns, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_read_table",
    "Read cell values from a table on a Keynote slide. Returns a 2D array of values.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      tableIndex: z.number().int().min(1).default(1).describe("1-indexed table number on the slide"),
    },
    async ({ name, slideIndex, tableIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    tell table ${tableIndex} of slide ${slideIndex}
      set rowCount to row count
      set colCount to column count
      set cellData to {}
      repeat with r from 1 to rowCount
        set rowData to {}
        repeat with c from 1 to colCount
          set cellVal to ""
          try
            set cellVal to formatted value of cell c of row r
          end try
          set end of rowData to cellVal
        end repeat
        set end of cellData to rowData
      end repeat
      return cellData
    end tell
  end tell
end tell`;
        const raw = await runAppleScript(script, { timeoutMs: 30_000 });
        return ok({ slideIndex, tableIndex, rawData: raw });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_write_table",
    "Write cell values to a table on a Keynote slide. Accepts a 2D array of values.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      tableIndex: z.number().int().min(1).default(1).describe("1-indexed table number on the slide"),
      data: z.array(z.array(z.union([z.string(), z.number()]))).describe("2D array of cell values — rows × columns"),
    },
    async ({ name, slideIndex, tableIndex, data }) => {
      try {
        // Build per-cell set statements
        const statements: string[] = [];
        for (let r = 0; r < data.length; r++) {
          const row = data[r];
          if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            const val = row[c];
            if (val === undefined || val === null) continue;
            const asString = typeof val === "string" ? `"${e(val)}"` : String(val);
            statements.push(`      set value of cell ${c + 1} of row ${r + 1} of table ${tableIndex} of slide ${slideIndex} to ${asString}`);
          }
        }

        if (statements.length === 0) return ok({ noOp: true });

        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
${statements.join("\n")}
  end tell
end tell`;
        await runAppleScript(script, { timeoutMs: 60_000 });
        return ok({ slideIndex, tableIndex, cellsWritten: statements.length, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_make_chart",
    "Add a chart to a Keynote slide with row names, column names, and data. Chart styling is not sdef-exposed; data alone is authoritative.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      rowNames: z.array(z.string()).describe("Row labels (e.g. ['Q1','Q2','Q3','Q4'])"),
      columnNames: z.array(z.string()).describe("Column labels (e.g. ['Revenue','Profit'])"),
      data: z.array(z.array(z.number())).describe("2D data array matching rows × columns"),
      chartType: ChartTypeSchema.default("vertical_bar_2d"),
      groupBy: z.enum(["group by row", "group by column"]).default("group by column"),
    },
    async ({ name, slideIndex, rowNames, columnNames, data, chartType, groupBy }) => {
      try {
        const rowNamesStr = rowNames.map((n) => `"${e(n)}"`).join(", ");
        const colNamesStr = columnNames.map((n) => `"${e(n)}"`).join(", ");
        const dataStr = data.map((row) => `{${row.join(", ")}}`).join(", ");
        const script = `
tell application id "${bid()}"
  add chart to slide ${slideIndex} of document "${e(name)}" ¬
    with row names {${rowNamesStr}} ¬
    column names {${colNamesStr}} ¬
    data {${dataStr}} ¬
    type ${chartType} ¬
    group by ${groupBy}
end tell`;
        await runAppleScript(script, { timeoutMs: 30_000 });
        return ok({ inserted: "chart", slideIndex, chartType, rowCount: rowNames.length, columnCount: columnNames.length, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_make_image_slides",
    "Bulk-add one slide per image from a list of files. Apple-native sdef compound — faster than individual keynote_make_slide + keynote_insert_image calls.",
    {
      name: z.string().describe("Document name"),
      filePaths: z.array(z.string()).min(1).describe("Absolute paths to image files"),
      setTitles: z.boolean().default(false).describe("Auto-generate slide titles from file names"),
    },
    async ({ name, filePaths, setTitles }) => {
      try {
        const filesList = filePaths.map((p) => `POSIX file "${e(p)}"`).join(", ");
        const script = `
tell application id "${bid()}"
  make image slides at end of document "${e(name)}" with properties ¬
    {files: {${filesList}}, set titles: ${setTitles}}
end tell`;
        await runAppleScript(script, { timeoutMs: 60_000 });
        return ok({ inserted: filePaths.length, document: name, setTitles });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Item positioning & formatting ─────────────────────────────────────────

  server.tool(
    "keynote_position_item",
    "Reposition and/or resize an iWork item on a Keynote slide by its 1-indexed item number.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      itemIndex: z.number().int().min(1).describe("1-indexed iWork item number (see keynote_list_items)"),
      x: z.number().optional().describe("New X position in points"),
      y: z.number().optional().describe("New Y position in points"),
      width: z.number().positive().optional().describe("New width in points"),
      height: z.number().positive().optional().describe("New height in points"),
    },
    async ({ name, slideIndex, itemIndex, x, y, width, height }) => {
      try {
        const statements: string[] = [];
        if (x !== undefined && y !== undefined) {
          statements.push(`      set position of iWork item ${itemIndex} of slide ${slideIndex} to {${x}, ${y}}`);
        } else if (x !== undefined) {
          statements.push(`      set item 1 of position of iWork item ${itemIndex} of slide ${slideIndex} to ${x}`);
        } else if (y !== undefined) {
          statements.push(`      set item 2 of position of iWork item ${itemIndex} of slide ${slideIndex} to ${y}`);
        }
        if (width !== undefined) statements.push(`      set width of iWork item ${itemIndex} of slide ${slideIndex} to ${width}`);
        if (height !== undefined) statements.push(`      set height of iWork item ${itemIndex} of slide ${slideIndex} to ${height}`);

        if (statements.length === 0) return ok({ noOp: true });

        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
${statements.join("\n")}
  end tell
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, itemIndex, repositioned: true, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_format_item",
    "Set visual properties (opacity, rotation, reflection) on a slide item.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      itemIndex: z.number().int().min(1).describe("1-indexed iWork item number"),
      opacity: z.number().min(0).max(100).optional().describe("Opacity 0-100"),
      rotation: z.number().min(0).max(359).optional().describe("Rotation in degrees 0-359"),
      reflectionShowing: z.boolean().optional().describe("Show reflection"),
      reflectionValue: z.number().min(0).max(100).optional().describe("Reflection intensity 0-100"),
      locked: z.boolean().optional().describe("Lock item to prevent editing"),
    },
    async ({ name, slideIndex, itemIndex, opacity, rotation, reflectionShowing, reflectionValue, locked }) => {
      try {
        const statements: string[] = [];
        const ref = `iWork item ${itemIndex} of slide ${slideIndex}`;
        if (opacity !== undefined) statements.push(`      set opacity of ${ref} to ${opacity}`);
        if (rotation !== undefined) statements.push(`      set rotation of ${ref} to ${rotation}`);
        if (reflectionShowing !== undefined) statements.push(`      set reflection showing of ${ref} to ${reflectionShowing}`);
        if (reflectionValue !== undefined) statements.push(`      set reflection value of ${ref} to ${reflectionValue}`);
        if (locked !== undefined) statements.push(`      set locked of ${ref} to ${locked}`);

        if (statements.length === 0) return ok({ noOp: true });

        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
${statements.join("\n")}
  end tell
end tell`;
        await runAppleScript(script);
        return ok({ slideIndex, itemIndex, formatted: true, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_get_item_info",
    "Read position, size, opacity, and rotation of a slide item.",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      itemIndex: z.number().int().min(1).describe("1-indexed iWork item number"),
    },
    async ({ name, slideIndex, itemIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    tell iWork item ${itemIndex} of slide ${slideIndex}
      set pos to position
      return "x=" & (item 1 of pos as string) & "|||y=" & (item 2 of pos as string) & "|||w=" & (width as string) & "|||h=" & (height as string) & "|||opacity=" & (opacity as string) & "|||rotation=" & (rotation as string) & "|||locked=" & (locked as string)
    end tell
  end tell
end tell`;
        const raw = await runAppleScript(script);
        return ok(parseKeyValuePipe(raw));
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Slideshow ─────────────────────────────────────────────────────────────

  server.tool(
    "keynote_start",
    "Start presenting a Keynote slideshow, optionally from a specific slide.",
    {
      name: z.string().describe("Document name"),
      fromSlide: z.number().int().min(1).optional().describe("Start from this slide number (1-indexed). Omit to start from the beginning."),
    },
    async ({ name, fromSlide }) => {
      try {
        const fromClause = fromSlide ? ` from slide ${fromSlide}` : "";
        const script = `tell application id "${bid()}" to start document "${e(name)}"${fromClause}`;
        await runAppleScript(script);
        return ok({ presenting: true, fromSlide: fromSlide ?? 1, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_stop",
    "Stop the active Keynote slideshow.",
    { name: z.string().describe("Document name") },
    async ({ name }) => {
      try {
        const script = `tell application id "${bid()}" to stop document "${e(name)}"`;
        await runAppleScript(script);
        return ok({ stopped: true, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Creator Studio AI ─────────────────────────────────────────────────────

  server.tool(
    "keynote_clean_up_slide",
    "Clean up a slide using Keynote's built-in layout optimization (Creator Studio only).",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
    },
    async ({ name, slideIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    clean up slide ${slideIndex}
  end tell
end tell`;
        await runAppleScript(script, { timeoutMs: 15_000 });
        return ok({ cleanedUp: true, slideIndex, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_super_resolution",
    "Apply ML super-resolution upscaling to an image on a Keynote slide (Creator Studio only).",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      imageIndex: z.number().int().min(1).default(1).describe("1-indexed image number on the slide"),
    },
    async ({ name, slideIndex, imageIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    tell image ${imageIndex} of slide ${slideIndex}
      set ML algorithm to super resolution
      perform ML analysis
    end tell
  end tell
end tell`;
        await runAppleScript(script, { timeoutMs: 60_000 });
        return ok({ applied: "super_resolution", slideIndex, imageIndex, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_remove_background",
    "Remove the background from an image on a Keynote slide using ML (Creator Studio only).",
    {
      name: z.string().describe("Document name"),
      slideIndex: z.number().int().min(1).describe("1-indexed slide number"),
      imageIndex: z.number().int().min(1).default(1).describe("1-indexed image number on the slide"),
    },
    async ({ name, slideIndex, imageIndex }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    tell image ${imageIndex} of slide ${slideIndex}
      set ML algorithm to remove background
      perform ML analysis
    end tell
  end tell
end tell`;
        await runAppleScript(script, { timeoutMs: 60_000 });
        return ok({ applied: "remove_background", slideIndex, imageIndex, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Export (advanced) ─────────────────────────────────────────────────────

  server.tool(
    "keynote_export_pdf",
    "Export a Keynote slideshow to PDF.",
    { documentName: z.string(), outputPath: z.string() },
    async ({ documentName, outputPath }) => {
      try {
        await exportDocumentInApp({ bundleId: bid(), documentName, outputPath, formatLiteral: "PDF" });
        return ok({ exported: outputPath, format: "PDF" });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_export_pdf_advanced",
    "Export a Keynote slideshow to PDF with advanced options: handout layout, slide notes, slide numbers, image quality, and optional password.",
    {
      documentName: z.string(),
      outputPath: z.string(),
      exportStyle: z.enum(["IndividualSlides", "SlideWithNotes", "Handouts"]).default("IndividualSlides"),
      imageQuality: z.enum(["Good", "Better", "Best"]).default("Best"),
      includeSlideNumbers: z.boolean().default(false),
      includeDate: z.boolean().default(false),
      includeSkippedSlides: z.boolean().default(false),
      includeBorders: z.boolean().default(false),
      password: z.string().optional(),
      passwordHint: z.string().optional(),
    },
    async ({ documentName, outputPath, exportStyle, imageQuality, includeSlideNumbers, includeDate, includeSkippedSlides, includeBorders, password, passwordHint }) => {
      try {
        const props: string[] = [
          `export style: ${exportStyle}`,
          `PDF image quality: ${imageQuality}`,
          `slide numbers: ${includeSlideNumbers}`,
          `date: ${includeDate}`,
          `skipped slides: ${includeSkippedSlides}`,
          `borders: ${includeBorders}`,
        ];
        if (password) props.push(`password: "${e(password)}"`);
        if (passwordHint) props.push(`password hint: "${e(passwordHint)}"`);

        await exportDocumentInApp({
          bundleId: bid(),
          documentName,
          outputPath,
          formatLiteral: "PDF",
          withPropertiesRecord: `{${props.join(", ")}}`,
        });
        return ok({ exported: outputPath, format: "PDF", options: { exportStyle, imageQuality } });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_export_images",
    "Export each Keynote slide as an image (PNG / JPEG / TIFF) into a folder.",
    {
      documentName: z.string(),
      outputPath: z.string().describe("Path to the output folder"),
      imageFormat: ImageFormatSchema,
      allStages: z.boolean().default(false).describe("Export each build stage as a separate image"),
      compressionFactor: z.number().min(0).max(1).optional().describe("JPEG compression 0-1 (JPEG only)"),
    },
    async ({ documentName, outputPath, imageFormat, allStages, compressionFactor }) => {
      try {
        const props: string[] = [`image format: ${imageFormat}`, `all stages: ${allStages}`];
        if (compressionFactor !== undefined && imageFormat === "JPEG") {
          props.push(`compression factor: ${compressionFactor}`);
        }
        await exportDocumentInApp({
          bundleId: bid(),
          documentName,
          outputPath,
          formatLiteral: "slide images",
          withPropertiesRecord: `{${props.join(", ")}}`,
        });
        return ok({ exported: outputPath, format: "slide images", imageFormat });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_export_movie",
    "Export a Keynote slideshow as a QuickTime movie.",
    { documentName: z.string(), outputPath: z.string() },
    async ({ documentName, outputPath }) => {
      try {
        await exportDocumentInApp({ bundleId: bid(), documentName, outputPath, formatLiteral: "QuickTime movie" });
        return ok({ exported: outputPath, format: "QuickTime movie" });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_export_movie_advanced",
    "Export a Keynote slideshow as a movie with codec, resolution, and framerate options. Supports H.264, HEVC, and the full ProRes ladder.",
    {
      documentName: z.string(),
      outputPath: z.string(),
      movieFormat: MovieFormatSchema,
      movieCodec: MovieCodecSchema,
      movieFramerate: MovieFramerateSchema,
      allStages: z.boolean().default(false).describe("Export each build stage as a separate frame"),
      includeComments: z.boolean().default(false),
    },
    async ({ documentName, outputPath, movieFormat, movieCodec, movieFramerate, allStages, includeComments }) => {
      try {
        const props = [
          `movie format: ${movieFormat}`,
          `movie codec: ${movieCodec}`,
          `movie framerate: ${movieFramerate}`,
          `all stages: ${allStages}`,
          `include comments: ${includeComments}`,
        ];
        await exportDocumentInApp({
          bundleId: bid(),
          documentName,
          outputPath,
          formatLiteral: "QuickTime movie",
          withPropertiesRecord: `{${props.join(", ")}}`,
        });
        return ok({ exported: outputPath, format: "QuickTime movie", movieFormat, movieCodec, movieFramerate });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_export_pptx",
    "Export a Keynote slideshow as a Microsoft PowerPoint file.",
    { documentName: z.string(), outputPath: z.string() },
    async ({ documentName, outputPath }) => {
      try {
        await exportDocumentInApp({ bundleId: bid(), documentName, outputPath, formatLiteral: "Microsoft PowerPoint" });
        return ok({ exported: outputPath, format: "Microsoft PowerPoint" });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_export_html",
    "Export a Keynote slideshow as a static HTML site (folder of HTML + assets). Suitable for web embed.",
    {
      documentName: z.string(),
      outputPath: z.string().describe("Path to the output folder"),
    },
    async ({ documentName, outputPath }) => {
      try {
        await exportDocumentInApp({ bundleId: bid(), documentName, outputPath, formatLiteral: "HTML" });
        return ok({ exported: outputPath, format: "HTML" });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Document config ───────────────────────────────────────────────────────

  server.tool(
    "keynote_set_doc_size",
    "Set the slide dimensions for a Keynote document (e.g. 1920×1080 for 16:9 widescreen, 1024×768 for standard).",
    {
      name: z.string().describe("Document name"),
      width: z.number().int().positive().describe("Slide width in points"),
      height: z.number().int().positive().describe("Slide height in points"),
    },
    async ({ name, width, height }) => {
      try {
        const script = `
tell application id "${bid()}"
  set width of document "${e(name)}" to ${width}
  set height of document "${e(name)}" to ${height}
end tell`;
        await runAppleScript(script);
        return ok({ width, height, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_set_kiosk_mode",
    "Configure a Keynote document for kiosk / self-running display: auto play, auto loop, auto restart, and idle timeout.",
    {
      name: z.string().describe("Document name"),
      autoPlay: z.boolean().default(true).describe("Advance slides automatically"),
      autoLoop: z.boolean().default(true).describe("Loop back to slide 1 at the end"),
      autoRestart: z.boolean().default(true).describe("Restart from slide 1 after idle"),
      maxIdleDuration: z.number().min(0).default(300).describe("Idle timeout in seconds before restart"),
    },
    async ({ name, autoPlay, autoLoop, autoRestart, maxIdleDuration }) => {
      try {
        const script = `
tell application id "${bid()}"
  tell document "${e(name)}"
    set auto play to ${autoPlay}
    set auto loop to ${autoLoop}
    set auto restart to ${autoRestart}
    set maximum idle duration to ${maxIdleDuration}
  end tell
end tell`;
        await runAppleScript(script);
        return ok({ kiosk: { autoPlay, autoLoop, autoRestart, maxIdleDuration }, document: name });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  // ── Cross-app composition ─────────────────────────────────────────────────

  server.tool(
    "keynote_from_markdown",
    "Build a Keynote presentation from a Markdown document. Each heading becomes a slide. Supports master mapping for cover/h1/h2/h3/quote/bullets/imageOnly/code layouts.",
    {
      markdownText: z.string().describe("Markdown content to parse into slides"),
      documentName: z.string().describe("Name of an already-open Keynote document to populate"),
      imageDir: z.string().optional().describe("Base directory for resolving relative image paths"),
      masterMap: z.object({
        cover: z.string().optional(),
        h1: z.string().optional(),
        h2: z.string().optional(),
        h3: z.string().optional(),
        quote: z.string().optional(),
        bullets: z.string().optional(),
        imageOnly: z.string().optional(),
        code: z.string().optional(),
      }).optional().describe("Override default master names (e.g. {cover: 'Title Slide', h2: 'Content'})"),
    },
    async ({ markdownText, documentName, imageDir, masterMap }) => {
      try {
        const slides = parseMarkdown(markdownText, masterMap as MasterMap);
        if (slides.length === 0) {
          return ok({ slidesCreated: 0, warning: "No slides parsed — ensure markdown has at least one heading." });
        }
        const script = slidesToAppleScript(slides, documentName, imageDir ?? "");
        await runAppleScript(script, { timeoutMs: 120_000 });
        return ok({ slidesCreated: slides.length, document: documentName, masters: slides.map((s) => s.master) });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_to_storyboard_fcp",
    "Convert an open Keynote deck to an FCP storyboard FCPXML. Exports slide images, extracts titles + presenter notes, and builds a gap-clip timeline with title overlays — ready to import into Final Cut Pro as a starting edit.",
    {
      documentName: z.string().describe("Name of the open Keynote document"),
      outputDir: z.string().describe("Directory where slide PNGs and the .fcpxml will be written"),
      fcpProjectName: z.string().describe("Name for the FCP project / event"),
      slideDurationSeconds: z.number().positive().default(5.0).describe("Duration of each gap clip in seconds (default 5s)"),
      frameRate: z.enum(["23.98", "24", "25", "29.97", "30", "50", "59.94", "60"]).default("29.97"),
      resolution: z.object({
        width: z.number().int().positive().default(1920),
        height: z.number().int().positive().default(1080),
      }).optional(),
      importIntoFcp: z.boolean().default(false).describe("Open the generated FCPXML in FCP after building"),
    },
    async ({ documentName, outputDir, fcpProjectName, slideDurationSeconds, frameRate, resolution, importIntoFcp }) => {
      try {
        const cfg = loadConfig();
        const res = resolution ?? { width: 1920, height: 1080 };

        // Step 1: Export slide images
        const imagesDir = join(outputDir, "slides");
        await mkdir(imagesDir, { recursive: true });
        const exportScript = `
tell application id "${bid()}"
  tell document "${e(documentName)}"
    export to (POSIX file "${e(imagesDir)}") as slide images with properties {image format: PNG}
  end tell
end tell`;
        await runAppleScript(exportScript, { timeoutMs: 120_000 });

        // Step 2: Discover exported PNGs (Keynote names them Slide 001.png, Slide 002.png, …)
        const entries = (await readdir(imagesDir))
          .filter((f) => f.toLowerCase().endsWith(".png"))
          .sort();

        // Step 3: Extract slide titles + presenter notes
        const notesScript = `
tell application id "${bid()}"
  tell document "${e(documentName)}"
    set noteData to {}
    repeat with i from 1 to count of slides
      set s to slide i
      set titleText to ""
      set notesText to ""
      try
        set titleText to object text of default title item of s
      end try
      try
        set notesText to presenter notes of s as string
      end try
      set end of noteData to (i as string) & "|||" & titleText & "|||" & notesText
    end repeat
    return noteData
  end tell
end tell`;
        const rawNotes = await runAppleScript(notesScript, { timeoutMs: 60_000 });
        const slideData = (rawNotes.trim() ? rawNotes.trim().split(", ") : []).map((entry) => {
          const parts = entry.split("|||");
          return {
            slideNumber: parseInt(parts[0] ?? "1", 10),
            title: parts[1]?.trim() ?? `Slide ${parts[0]}`,
            notes: parts[2]?.trim() ?? "",
          };
        });

        // Step 4: Build FCPXML
        const formatId = "r1";
        const assets = entries.map((filename, idx) => ({
          id: `a${idx + 1}`,
          name: `slide-${String(idx + 1).padStart(3, "0")}`,
          src: join(imagesDir, filename),
          durationSeconds: slideDurationSeconds,
          startSeconds: 0,
          hasVideo: true,
          hasAudio: false,
          frameRate,
          resolution: res,
        }));

        const spine = entries.map((_, idx) => {
          const sd = slideData[idx];
          const titleText = sd?.title ?? `Slide ${idx + 1}`;
          return {
            kind: "asset-clip",
            name: titleText || `Slide ${idx + 1}`,
            ref: `a${idx + 1}`,
            offsetSeconds: idx * slideDurationSeconds,
            durationSeconds: slideDurationSeconds,
            startSeconds: 0,
            enabled: true,
            volumeDb: 0,
            lane: 0,
          };
        });

        const projectSpec = {
          fcpxmlVersion: "1.14",
          format: {
            id: formatId,
            name: `FFVideoFormat${res.height}p${frameRate.replace(".", "")}`,
            frameRate,
            resolution: res,
            colorSpace: "1-1-1 (Rec. 709)",
          },
          eventName: fcpProjectName,
          projectName: fcpProjectName,
          assets,
          spine,
          markers: [],
        };

        const built = buildProjectFcpxml(projectSpec, { skipPreflight: true });

        // Step 5: Write FCPXML
        const fcpxmlPath = join(outputDir, `${fcpProjectName}.fcpxml`);
        await writeFile(fcpxmlPath, built.xml, "utf-8");

        // Step 6: Optional import into FCP
        if (importIntoFcp) {
          await openWithApp(fcpxmlPath, { appBundleId: cfg.fcpBundleId });
        }

        return ok({
          slidesExported: entries.length,
          fcpxmlPath,
          imagesDir,
          imported: importIntoFcp,
          document: documentName,
        });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_to_compressor_gif",
    "Export a Keynote slideshow as an animated GIF via Compressor. Renders the presentation to a QuickTime movie first, then transcodes to animated GIF using a Compressor preset. For video export (MP4, MOV) without GIF conversion, use keynote_export_movie instead.",
    {
      documentName: z.string().describe("Name of the open Keynote document"),
      outputDir: z.string().describe("Directory for intermediate movie and final GIF"),
      settingPath: z.string().describe("Path to a .compressorsetting file configured for GIF output"),
      movieFormat: MovieFormatSchema.optional(),
    },
    async ({ documentName, outputDir, settingPath, movieFormat }) => {
      try {
        await mkdir(outputDir, { recursive: true });

        // Step 1: Export movie
        const safeDocName = documentName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const moviePath = join(outputDir, `${safeDocName}.mov`);
        const movieProps = movieFormat ? ` with properties {movie format: ${movieFormat}}` : "";
        const exportScript = `
tell application id "${bid()}"
  tell document "${e(documentName)}"
    export to (POSIX file "${e(moviePath)}") as QuickTime movie${movieProps}
  end tell
end tell`;
        await runAppleScript(exportScript, { timeoutMs: 120_000 });

        // Step 2: Encode via Compressor
        const gifPath = join(outputDir, `${safeDocName}.gif`);
        const result = await encodeJob({
          jobPath: moviePath,
          settingPath,
          locationPath: gifPath,
        });

        return ok({ gifPath, moviePath, jobId: result.jobId, batchId: result.batchId, document: documentName });
      } catch (e2) {
        return err(e2);
      }
    },
  );

  server.tool(
    "keynote_plan_magic_move",
    "Prepare two consecutive slides for a Magic Move transition. Sets the transition effect to 'magic move' and ensures that named elements match by name (the pairing criterion) between slides. Elements that share a name between fromSlide and toSlide will tween.",
    {
      name: z.string().describe("Document name"),
      fromSlide: z.number().int().min(1).describe("Source slide index (1-indexed)"),
      toSlide: z.number().int().min(1).describe("Destination slide index (must be fromSlide + 1 for magic move to work)"),
      elementNamePairs: z.array(z.object({
        fromItemIndex: z.number().int().min(1).describe("Item index on fromSlide"),
        toItemIndex: z.number().int().min(1).describe("Item index on toSlide"),
        pairName: z.string().describe("Shared name that Keynote uses to pair the elements"),
      })).optional().describe("Elements to pair by name. Magic Move pairs by element name, not position."),
      transitionDuration: z.number().min(0).max(10).default(1.5),
    },
    async ({ name, fromSlide, toSlide, elementNamePairs, transitionDuration }) => {
      try {
        const statements: string[] = [
          // Set magic move transition on fromSlide
          `  set transition properties of slide ${fromSlide} of document "${e(name)}" to ¬`,
          `    {automatic transition: false, transition delay: 0.0, transition duration: ${transitionDuration}, transition effect: magic move}`,
        ];

        // Rename elements to shared names so Keynote can pair them
        if (elementNamePairs && elementNamePairs.length > 0) {
          for (const pair of elementNamePairs) {
            const pn = e(pair.pairName);
            statements.push(`  -- Pair: ${pair.pairName}`);
            statements.push(`  try`);
            statements.push(`    set name of iWork item ${pair.fromItemIndex} of slide ${fromSlide} of document "${e(name)}" to "${pn}"`);
            statements.push(`  end try`);
            statements.push(`  try`);
            statements.push(`    set name of iWork item ${pair.toItemIndex} of slide ${toSlide} of document "${e(name)}" to "${pn}"`);
            statements.push(`  end try`);
          }
        }

        const script = `tell application id "${bid()}"\n${statements.join("\n")}\nend tell`;
        await runAppleScript(script);

        return ok({
          magicMove: true,
          fromSlide,
          toSlide,
          transitionDuration,
          pairedElements: elementNamePairs?.length ?? 0,
          document: name,
          warning: toSlide !== fromSlide + 1
            ? "Magic Move works best when toSlide is exactly fromSlide + 1. Other slide distances may not animate."
            : undefined,
        });
      } catch (e2) {
        return err(e2);
      }
    },
  );
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

/**
 * Parse AppleScript slide list returned as comma-separated records.
 * Robust against varied AppleScript output formatting.
 */
function parseAppleScriptSlideList(raw: string): Array<{ slideNumber: number; title: string; skipped: boolean }> {
  if (!raw.trim()) return [];
  // AppleScript returns records like: slideNumber:1, title:..., skipped:false
  // Split on record boundaries — approximate split on "slideNumber:"
  const records = raw.split(/(?=slideNumber:)/);
  return records
    .map((r) => {
      const numMatch = r.match(/slideNumber:(\d+)/);
      const titleMatch = r.match(/title:([^,}]*)/);
      const skippedMatch = r.match(/skipped:(true|false)/);
      if (!numMatch) return null;
      return {
        slideNumber: parseInt(numMatch[1], 10),
        title: titleMatch ? titleMatch[1].trim() : "",
        skipped: skippedMatch ? skippedMatch[1] === "true" : false,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Parse key=value|||key=value string from AppleScript.
 */
function parseKeyValuePipe(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  raw.split("|||").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    result[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  });
  return result;
}

/**
 * Parse the slide info string from keynote_get_slide.
 */
function parseSlideInfo(raw: string): Record<string, string> {
  return parseKeyValuePipe(raw);
}

/**
 * Parse "class:x,y:WxH" item entry from keynote_list_items.
 */
function parseItemEntry(entry: string): { class: string; x: number; y: number; width: number; height: number } {
  const parts = entry.split(":");
  const cls = parts[0] ?? "unknown";
  const pos = (parts[1] ?? "0,0").split(",");
  const size = (parts[2] ?? "0x0").split("x");
  return {
    class: cls.trim(),
    x: parseFloat(pos[0] ?? "0"),
    y: parseFloat(pos[1] ?? "0"),
    width: parseFloat(size[0] ?? "0"),
    height: parseFloat(size[1] ?? "0"),
  };
}
