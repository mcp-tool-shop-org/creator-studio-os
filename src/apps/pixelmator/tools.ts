import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { join, isAbsolute, basename, parse } from "node:path";
import { readdir, mkdir, access } from "node:fs/promises";
import { resolveProject } from "../../projects/resolve.js";
import {
  openDocument,
  closeDocument,
  exportDocument,
  resizeDocument,
  cropDocument,
  rotateDocument,
  flipDocument,
  EXPORT_FORMAT_LIST,
} from "./document.js";
import { isPixelmatorRunning, openPixelmator } from "./app.js";
import { CreatorStudioError } from "../../errors.js";
import { BLEND_MODES } from "./blendModes.js";
import {
  makeLayer,
  makeShape,
  setLayerProperties,
  setLayerOrder,
  groupLayers,
  ungroupLayer,
  setLayerText,
} from "./layers.js";
import { setBlendMode, setLayerShadow, setLayerStroke } from "./styles.js";
import { EFFECT_CLASSES, applyEffect, COLOR_ADJUSTMENT_PROPS, applyColorAdjustments } from "./effects.js";
import { ML_ALGORITHMS, applyMl, runShortcut } from "./ml.js";
import { detectInDocument, replaceText, replaceLayerImage } from "./detect.js";
import {
  HDR_FORMATS, exportHdr,
  VIDEO_FORMATS, exportVideo,
  ANIMATED_FORMATS, exportAnimated,
  WEB_FORMATS, exportForWeb,
} from "./document.js";
import { composeBrandCard } from "./brandCard.js";

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

const FormatSchema = z.enum(EXPORT_FORMAT_LIST);

const FORMAT_EXTENSION: Record<string, string> = {
  PNG: "png",
  JPEG: "jpg",
  TIFF: "tif",
  HEIC: "heic",
  GIF: "gif",
  JPEG2000: "jp2",
  BMP: "bmp",
  WebP: "webp",
  SVG: "svg",
  PDF: "pdf",
};

const IMAGE_INPUT_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".heic", ".heif",
  ".gif", ".bmp", ".webp", ".psd", ".pxd",
]);

export function registerPixelmatorTools(server: McpServer) {
  server.tool(
    "pixelmator_app_open",
    "Activate Pixelmator Pro",
    {},
    async () => {
      try {
        await openPixelmator();
        return ok({ opened: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "pixelmator_app_running",
    "Check whether Pixelmator Pro is running",
    {},
    async () => {
      try {
        return ok({ running: await isPixelmatorRunning() });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "pixelmator_open",
    "Open a document in Pixelmator Pro. Returns the document name (used by other tools).",
    { path: z.string() },
    async ({ path }) => {
      try {
        return ok(await openDocument(path));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "pixelmator_close",
    "Close a document in Pixelmator Pro (no save)",
    { name: z.string() },
    async ({ name }) => {
      try {
        await closeDocument(name);
        return ok({ closed: name });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "pixelmator_export",
    "Export an open document to a file in the chosen format",
    {
      documentName: z.string(),
      outputPath: z.string(),
      format: FormatSchema,
    },
    async ({ documentName, outputPath, format }) => {
      try {
        await exportDocument({ documentName, outputPath, format });
        return ok({ exported: outputPath, format });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "pixelmator_resize",
    "Change the dimensions of an open Pixelmator document. Width / height in pixels; resolution in PPI. Doesn't write to disk — pair with pixelmator_export for output.",
    {
      documentName: z.string(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      resolutionPpi: z.number().positive().optional(),
    },
    async ({ documentName, width, height, resolutionPpi }) => {
      try {
        await resizeDocument({
          documentName,
          width,
          height,
          resolutionPpi,
        });
        return ok({ resized: documentName });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "pixelmator_crop",
    "Crop an open document. Bounds: { x, y, width, height } in pixels from top-left.",
    {
      documentName: z.string(),
      bounds: z.object({
        x: z.number().int().nonnegative(),
        y: z.number().int().nonnegative(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
      deleteMode: z.boolean().default(false),
    },
    async ({ documentName, bounds, deleteMode }) => {
      try {
        await cropDocument(documentName, bounds, deleteMode);
        return ok({ cropped: documentName });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "pixelmator_rotate",
    "Rotate an open document by a fixed amount: 180, right (90 CW), or left (90 CCW)",
    {
      documentName: z.string(),
      direction: z.enum(["180", "right", "left"]),
    },
    async ({ documentName, direction }) => {
      try {
        await rotateDocument(documentName, direction);
        return ok({ rotated: documentName, direction });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "pixelmator_flip",
    "Flip an open document horizontally or vertically",
    {
      documentName: z.string(),
      axis: z.enum(["horizontal", "vertical"]),
    },
    async ({ documentName, axis }) => {
      try {
        await flipDocument(documentName, axis);
        return ok({ flipped: documentName, axis });
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── 2.1.6 HDR + advanced exports ─────────────────────────────────────────────

  server.tool(
    "pixelmator_export_hdr",
    "Export an open Pixelmator document to an HDR image file. Supports HDR JPEG, HDR HEIC, HDR AVIF, and HDR PNG. Automatically enables Pixelmator's HDR content display mode before export — without this, Pixelmator silently tone-maps to SDR.",
    {
      documentName: z.string(),
      outputPath: z.string().describe("Absolute POSIX output path"),
      format: z.enum(HDR_FORMATS),
      compressionFactor: z.number().int().min(1).max(100).optional().describe("Quality 1–100 for JPEG/HEIC/AVIF"),
      colorProfile: z.string().optional().describe("Color profile name e.g. \"Display P3\""),
    },
    async ({ documentName, outputPath, format, compressionFactor, colorProfile }) => {
      try {
        await exportHdr({ documentName, outputPath, format, compressionFactor, colorProfile });
        return ok({ exported: outputPath, format });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_export_video",
    "Export an open Pixelmator document containing video layers to MP4 or QuickTime Movie format. Optionally set the output frame rate.",
    {
      documentName: z.string(),
      outputPath: z.string(),
      format: z.enum(VIDEO_FORMATS),
      frameRate: z.number().positive().optional().describe("Output frame rate (frames per second)"),
    },
    async ({ documentName, outputPath, format, frameRate }) => {
      try {
        await exportVideo({ documentName, outputPath, format, frameRate });
        return ok({ exported: outputPath, format });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_export_animated",
    "Export an open Pixelmator document as Animated GIF or Animated PNG. Suitable for short looping sequences. Optionally set the output frame rate.",
    {
      documentName: z.string(),
      outputPath: z.string(),
      format: z.enum(ANIMATED_FORMATS),
      frameRate: z.number().positive().optional().describe("Frame rate in frames per second"),
    },
    async ({ documentName, outputPath, format, frameRate }) => {
      try {
        await exportAnimated({ documentName, outputPath, format, frameRate });
        return ok({ exported: outputPath, format });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_export_for_web",
    "Export an open Pixelmator document using Pixelmator Pro's Export For Web command. Produces a web-optimized PNG, JPEG, WebP, GIF, or SVG with optional quality, scale, and sRGB conversion settings.",
    {
      documentName: z.string(),
      outputPath: z.string(),
      format: z.enum(WEB_FORMATS),
      compressionFactor: z.number().int().min(1).max(100).optional().describe("Quality 1–100 for JPEG/WebP"),
      scale: z.number().int().positive().optional().describe("Integer scale factor (1, 2, 3…)"),
      convertToSRGB: z.boolean().optional(),
      keepTransparency: z.boolean().optional(),
    },
    async ({ documentName, outputPath, format, compressionFactor, scale, convertToSRGB, keepTransparency }) => {
      try {
        await exportForWeb({ documentName, outputPath, format, compressionFactor, scale, convertToSRGB, keepTransparency });
        return ok({ exported: outputPath, format });
      } catch (e) { return err(e); }
    },
  );

  // ── 2.1.7 Brand-card composer ─────────────────────────────────────────────────

  server.tool(
    "pixelmator_compose_brand_card",
    "Compose a layered brand card from brand tokens and export at multiple sizes. Opens a .pxd template, replaces {{HEADLINE}}, {{SUBHEAD}}, {{TAGLINE}} text placeholders and {{LOGO}} image layer with the supplied brand tokens, then exports each requested size as PNG (or HDR PNG). First protocol primitive — used by protocol.steam_trailer_minimal step 2.",
    {
      brand: z.object({
        headline: z.string().optional().describe("Main headline text"),
        subhead: z.string().optional().describe("Sub-headline text"),
        tagline: z.string().optional().describe("Tagline text"),
        logoPath: z.string().optional().describe("Absolute POSIX path to logo image"),
        headlineFont: z.string().optional().describe("PostScript font name for headline layer"),
        primaryColor: z.array(z.number().int().min(0).max(255)).length(3).optional().describe("[r,g,b] primary brand color 0-255"),
      }),
      sizes: z.array(z.object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        label: z.string().optional().describe("Output file suffix label e.g. \"1080p\""),
      })).min(1),
      outputDir: z.string().describe("Absolute POSIX path to output directory"),
      templatePath: z.string().optional().describe("Absolute POSIX path to .pxd template (defaults to shared/brand/card-template.pxd)"),
      stem: z.string().optional().describe("Base filename stem (default: brand-card)"),
      hdr: z.boolean().default(false).describe("Export as HDR PNG instead of standard PNG"),
    },
    async ({ brand, sizes, outputDir, templatePath, stem, hdr }) => {
      try {
        const result = await composeBrandCard({
          brand: {
            ...brand,
            primaryColor: brand.primaryColor as [number, number, number] | undefined,
          },
          sizes, outputDir, templatePath, stem, hdr,
        });
        return ok(result);
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_batch_export_project_images",
    "Open every image in a project's images/ dir, export it to <project>/out/<name>.<ext> in the chosen format, and close. Use for batch format conversion / re-export.",
    {
      project: z.string(),
      format: FormatSchema,
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    },
    async ({ project, format, width, height }) => {
      try {
        const proj = await resolveProject(project);
        const ext = FORMAT_EXTENSION[format];
        await mkdir(proj.paths.out, { recursive: true });
        await access(proj.paths.images);

        const entries = await readdir(proj.paths.images);
        const inputs = entries.filter((e) => {
          if (e.startsWith(".") || e.startsWith("._")) return false;
          const lower = e.toLowerCase();
          return IMAGE_INPUT_EXTS.has(lower.slice(lower.lastIndexOf(".")));
        });

        const results: { input: string; output: string }[] = [];
        for (const file of inputs) {
          const input = join(proj.paths.images, file);
          const stem = parse(file).name;
          const output = join(proj.paths.out, `${stem}.${ext}`);
          const { name } = await openDocument(input);
          if (width !== undefined || height !== undefined) {
            await resizeDocument({ documentName: name, width, height });
          }
          await exportDocument({
            documentName: name,
            outputPath: output,
            format,
          });
          await closeDocument(name);
          results.push({ input, output });
        }

        return ok({ project, format, count: results.length, results });
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── 2.1.1 Layer authoring ────────────────────────────────────────────────────

  server.tool(
    "pixelmator_make_layer",
    "Add a new layer to an open Pixelmator document. kind=\"image\" places a raster image file; kind=\"text\" creates an editable text layer; kind=\"shape\" creates a blank shape layer. Returns the name Pixelmator assigned.",
    {
      documentName: z.string().describe("Name of the open document (without file extension)"),
      kind: z.enum(["image", "text", "shape"]).describe("Layer type to create"),
      name: z.string().optional().describe("Layer name (defaults to Pixelmator's auto-name)"),
      imagePath: z.string().optional().describe("Absolute POSIX path to image file — required when kind=image"),
      textContent: z.string().optional().describe("Initial text content — required when kind=text"),
      font: z.string().optional().describe("PostScript or display font name (e.g. \"InterTight-Bold\")"),
      fontSize: z.number().positive().optional().describe("Font size in points"),
      textColor: z.array(z.number().int().min(0).max(255)).length(3).optional().describe("Text color as [r, g, b] (0–255 each)"),
      position: z.array(z.number().int()).length(2).optional().describe("[x, y] position in pixels from top-left"),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    },
    async ({ documentName, kind, name, imagePath, textContent, font, fontSize, textColor, position, width, height }) => {
      try {
        const result = await makeLayer({
          documentName, kind, name, imagePath, textContent, font, fontSize,
          textColor: textColor as [number, number, number] | undefined,
          position: position as [number, number] | undefined,
          width, height,
        });
        return ok(result);
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_set_layer_properties",
    "Change visibility, opacity, blend mode, position, or size of a named layer in an open Pixelmator document. All properties are optional — only supplied values are changed.",
    {
      documentName: z.string(),
      layerName: z.string().describe("Exact name of the layer to modify"),
      visible: z.boolean().optional(),
      opacity: z.number().int().min(0).max(100).optional().describe("Layer opacity 0–100"),
      blendMode: z.enum(BLEND_MODES).optional().describe("Compositing blend mode"),
      position: z.array(z.number().int()).length(2).optional().describe("[x, y] in pixels from top-left"),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    },
    async ({ documentName, layerName, visible, opacity, blendMode, position, width, height }) => {
      try {
        await setLayerProperties({
          documentName, layerName, visible, opacity, blendMode,
          position: position as [number, number] | undefined,
          width, height,
        });
        return ok({ updated: layerName });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_layer_order",
    "Reorder a layer in the Pixelmator layer stack. action=front/back moves to the absolute top/bottom; action=before/after moves relative to another named layer.",
    {
      documentName: z.string(),
      layerName: z.string().describe("Name of the layer to move"),
      action: z.enum(["front", "back", "before", "after"]),
      relativeTo: z.string().optional().describe("Target layer name — required for before/after"),
    },
    async ({ documentName, layerName, action, relativeTo }) => {
      try {
        await setLayerOrder({ documentName, layerName, action, relativeTo });
        return ok({ reordered: layerName, action });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_group_layers",
    "Move a list of named layers into a new group layer in an open Pixelmator document. Returns the group's name.",
    {
      documentName: z.string(),
      layerNames: z.array(z.string()).min(1).describe("Names of layers to group"),
      groupName: z.string().optional().describe("Name for the new group layer"),
    },
    async ({ documentName, layerNames, groupName }) => {
      try {
        return ok(await groupLayers({ documentName, layerNames, groupName }));
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_ungroup",
    "Ungroup a group layer, moving its children back into the parent layer stack in an open Pixelmator document.",
    {
      documentName: z.string(),
      layerName: z.string().describe("Name of the group layer to ungroup"),
    },
    async ({ documentName, layerName }) => {
      try {
        await ungroupLayer(documentName, layerName);
        return ok({ ungrouped: layerName });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_set_layer_text",
    "Edit text content and styling on a text layer in an open Pixelmator document. All style properties are optional — only supplied values are changed. Horizontal/vertical alignment are set at the layer level; font, size, and color apply to the full text content.",
    {
      documentName: z.string(),
      layerName: z.string().describe("Name of the text layer to edit"),
      textContent: z.string().optional().describe("Replace entire text content"),
      font: z.string().optional().describe("PostScript or display font name"),
      fontSize: z.number().positive().optional().describe("Font size in points"),
      color: z.array(z.number().int().min(0).max(255)).length(3).optional().describe("Text color as [r, g, b] (0–255)"),
      horizontalAlignment: z.enum(["left", "center", "right", "justify"]).optional(),
      verticalAlignment: z.enum(["top", "center", "bottom"]).optional(),
    },
    async ({ documentName, layerName, textContent, font, fontSize, color, horizontalAlignment, verticalAlignment }) => {
      try {
        await setLayerText({
          documentName, layerName, textContent, font, fontSize,
          color: color as [number, number, number] | undefined,
          horizontalAlignment, verticalAlignment,
        });
        return ok({ updated: layerName });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_make_shape",
    "Create a filled shape layer (rectangle, rounded-rectangle, ellipse, or line) in an open Pixelmator document. Fill and stroke colors are 8-bit RGB [r, g, b]. Returns the shape layer name.",
    {
      documentName: z.string(),
      shapeKind: z.enum(["rectangle", "rounded rectangle", "ellipse", "line"]),
      name: z.string().optional().describe("Layer name"),
      position: z.array(z.number().int()).length(2).optional().describe("[x, y] from top-left"),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      cornerRadius: z.number().int().min(0).optional().describe("Corner radius in pixels — rounded rectangle only"),
      fillColor: z.array(z.number().int().min(0).max(255)).length(3).optional().describe("[r, g, b] fill color (0–255)"),
      fillOpacity: z.number().int().min(0).max(100).optional().describe("Fill opacity 0–100"),
      strokeColor: z.array(z.number().int().min(0).max(255)).length(3).optional().describe("[r, g, b] stroke color (0–255)"),
      strokeWidth: z.number().positive().optional().describe("Stroke width in pixels"),
      opacity: z.number().int().min(0).max(100).optional().describe("Layer opacity 0–100"),
    },
    async ({ documentName, shapeKind, name, position, width, height, cornerRadius,
             fillColor, fillOpacity, strokeColor, strokeWidth, opacity }) => {
      try {
        return ok(await makeShape({
          documentName, shapeKind, name,
          position: position as [number, number] | undefined,
          width, height, cornerRadius,
          fillColor: fillColor as [number, number, number] | undefined,
          fillOpacity,
          strokeColor: strokeColor as [number, number, number] | undefined,
          strokeWidth, opacity,
        }));
      } catch (e) { return err(e); }
    },
  );

  // ── 2.1.2 Blend modes + layer styles ────────────────────────────────────────

  server.tool(
    "pixelmator_set_blend_mode",
    "Set the compositing blend mode on a named layer in an open Pixelmator document. Accepts all 28 Pixelmator Pro blend modes (normal, multiply, screen, overlay, …, luminosity).",
    {
      documentName: z.string(),
      layerName: z.string(),
      blendMode: z.enum(BLEND_MODES).describe("Blend mode from Pixelmator Pro's full 28-mode enum"),
    },
    async ({ documentName, layerName, blendMode }) => {
      try {
        await setBlendMode(documentName, layerName, blendMode);
        return ok({ layerName, blendMode });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_set_layer_shadow",
    "Add or edit the drop shadow on a named layer in an open Pixelmator document. Color is 8-bit RGB [r, g, b]. All properties are optional — only supplied values are changed.",
    {
      documentName: z.string(),
      layerName: z.string(),
      color: z.array(z.number().int().min(0).max(255)).length(3).optional().describe("[r, g, b] shadow color (0–255)"),
      blur: z.number().nonnegative().optional().describe("Blur radius in pixels"),
      distance: z.number().nonnegative().optional().describe("Shadow offset distance in pixels"),
      angle: z.number().min(0).max(360).optional().describe("Shadow angle in degrees"),
      opacity: z.number().int().min(0).max(100).optional().describe("Shadow opacity 0–100"),
    },
    async ({ documentName, layerName, color, blur, distance, angle, opacity }) => {
      try {
        await setLayerShadow({
          documentName, layerName,
          color: color as [number, number, number] | undefined,
          blur, distance, angle, opacity,
        });
        return ok({ updated: layerName });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_set_layer_stroke",
    "Add or edit the outline stroke on a named layer in an open Pixelmator document. Color is 8-bit RGB [r, g, b]. Position is inside, center, or outside.",
    {
      documentName: z.string(),
      layerName: z.string(),
      color: z.array(z.number().int().min(0).max(255)).length(3).optional().describe("[r, g, b] stroke color (0–255)"),
      width: z.number().positive().optional().describe("Stroke width in pixels"),
      position: z.enum(["inside", "center", "outside"]).optional(),
      opacity: z.number().int().min(0).max(100).optional().describe("Stroke opacity 0–100"),
    },
    async ({ documentName, layerName, color, width, position, opacity }) => {
      try {
        await setLayerStroke({
          documentName, layerName,
          color: color as [number, number, number] | undefined,
          width, position, opacity,
        });
        return ok({ updated: layerName });
      } catch (e) { return err(e); }
    },
  );

  // ── 2.1.3 Effects + color adjustments ────────────────────────────────────────

  server.tool(
    "pixelmator_apply_effect",
    "Apply a non-destructive effect to a layer in an open Pixelmator document. Dispatches to one of 23 Pixelmator Pro effect classes (gaussian blur, motion blur, pixelate, color fill, etc.). Targets the front layer by default; supply layerName to target a specific layer.",
    {
      documentName: z.string(),
      effectClass: z.enum(EFFECT_CLASSES).describe("Pixelmator Pro effect class name"),
      layerName: z.string().optional().describe("Target layer name (defaults to front layer)"),
      intensity: z.number().nonnegative().optional().describe("Effect intensity / radius (meaning varies by class)"),
      params: z.record(z.union([z.number(), z.string(), z.boolean()])).optional().describe("Additional effect parameters as name→value pairs"),
    },
    async ({ documentName, effectClass, layerName, intensity, params }) => {
      try {
        await applyEffect({ documentName, effectClass, layerName, intensity, params });
        return ok({ applied: effectClass, layerName: layerName ?? "front layer" });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_apply_color_adjustment",
    "Set one or more color-adjustment properties on a layer in an open Pixelmator document. Supports all 24 Pixelmator Pro color adjustment properties including temperature, exposure, saturation, custom LUT path, and vignette. Set nonDestructive=true to add a new adjustment layer instead of modifying the target layer's own adjustments.",
    {
      documentName: z.string(),
      adjustments: z.array(z.object({
        property: z.enum(COLOR_ADJUSTMENT_PROPS).describe("Color adjustment property name"),
        value: z.union([z.number(), z.string(), z.boolean()]).describe("New value (number, file path for custom lut, or boolean)"),
      })).min(1),
      layerName: z.string().optional().describe("Target layer name (defaults to front layer)"),
      nonDestructive: z.boolean().default(false).describe("When true, creates a new adjustment layer on top"),
    },
    async ({ documentName, adjustments, layerName, nonDestructive }) => {
      try {
        await applyColorAdjustments({ documentName, layerName, adjustments, nonDestructive });
        return ok({ adjusted: adjustments.map((a) => a.property) });
      } catch (e) { return err(e); }
    },
  );

  // ── 2.1.4 ML + Shortcuts bridge ──────────────────────────────────────────────

  server.tool(
    "pixelmator_apply_ml",
    "Run a Pixelmator Pro ML algorithm on an open document. Algorithms include: super_resolution (3× upscale or exact dimensions), enhance, denoise, deband, match_colors (reference image required), remove_background, select_subject, and four auto-adjust variants. ML operations may be slow on large files.",
    {
      documentName: z.string(),
      algorithm: z.enum(ML_ALGORITHMS),
      denoiseIntensity: z.number().int().min(0).max(100).optional().describe("Denoise intensity 0–100 (denoise only)"),
      matchColorsReference: z.string().optional().describe("Absolute path to reference image for match_colors"),
      smartRefine: z.boolean().optional().describe("Enable ML smart-refine for select_subject (default true)"),
      targetWidth: z.number().int().positive().optional().describe("Target width for super_resolution via resize (omit for fixed 3×)"),
      targetHeight: z.number().int().positive().optional().describe("Target height for super_resolution via resize"),
    },
    async ({ documentName, algorithm, denoiseIntensity, matchColorsReference, smartRefine, targetWidth, targetHeight }) => {
      try {
        await applyMl({ documentName, algorithm, denoiseIntensity, matchColorsReference, smartRefine, targetWidth, targetHeight });
        return ok({ applied: algorithm, documentName });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_run_shortcut",
    "Run a Pixelmator Shortcuts action by name via the macOS shortcuts CLI. Exposes ML knobs the sdef can't reach — e.g. portrait-specific background removal, Increase Resolution (3× ML upscale), and Optimize Image for Web. The named shortcut must be installed in the user's Shortcuts library.",
    {
      shortcutName: z.string().describe("Name of the Shortcuts action as it appears in the user's library"),
      input: z.union([z.string(), z.array(z.string())]).optional().describe("Input file(s) as absolute POSIX path(s)"),
      output: z.string().optional().describe("Output file POSIX path"),
    },
    async ({ shortcutName, input, output }) => {
      try {
        const result = await runShortcut({ shortcutName, input, output });
        return ok(result);
      } catch (e) { return err(e); }
    },
  );

  // ── 2.1.5 Detect + replace ────────────────────────────────────────────────────

  server.tool(
    "pixelmator_detect",
    "Detect faces or QR codes in an open Pixelmator document using Pixelmator Pro's ML detection commands. Returns bounding boxes for each detected item; QR results also include the decoded message payload.",
    {
      documentName: z.string(),
      kind: z.enum(["face", "qr"]).describe("What to detect: face bounding boxes or QR codes with message payload"),
    },
    async ({ documentName, kind }) => {
      try {
        return ok(await detectInDocument(documentName, kind));
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_replace_text",
    "Find and replace text across all text layers in an open Pixelmator document using Pixelmator Pro's built-in replace command. Returns {replaced: true} if no error was thrown (Pixelmator does not report a match count).",
    {
      documentName: z.string(),
      findText: z.string().describe("Text to find (searches all text layers)"),
      replaceWith: z.string(),
      matchWords: z.boolean().optional().describe("Match whole words only"),
      caseSensitive: z.boolean().optional().default(false),
    },
    async ({ documentName, findText, replaceWith, matchWords, caseSensitive }) => {
      try {
        return ok(await replaceText({ documentName, findText, replaceWith, matchWords, caseSensitive }));
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_replace_layer",
    "Replace the pixel content of an image layer with a new file while preserving all layer adjustments, effects, and styles. Equivalent to Pixelmator Pro's Edit → Replace Image. scaleMode controls how the new image is fitted into the existing layer bounds.",
    {
      documentName: z.string(),
      layerName: z.string().describe("Name of the image layer whose content will be replaced"),
      newImagePath: z.string().describe("Absolute POSIX path to the replacement image file"),
      scaleMode: z.enum(["original", "stretch", "scale to fill", "scale to fit"]).optional().default("scale to fit"),
    },
    async ({ documentName, layerName, newImagePath, scaleMode }) => {
      try {
        await replaceLayerImage({ documentName, layerName, newImagePath, scaleMode });
        return ok({ replaced: layerName, newImage: newImagePath });
      } catch (e) { return err(e); }
    },
  );

  server.tool(
    "pixelmator_batch_export_project_images_dryrun",
    "List what pixelmator_batch_export_project_images would process, without opening Pixelmator",
    {
      project: z.string(),
      format: FormatSchema,
    },
    async ({ project, format }) => {
      try {
        const proj = await resolveProject(project);
        const ext = FORMAT_EXTENSION[format];
        await access(proj.paths.images);
        const entries = await readdir(proj.paths.images);
        const inputs = entries.filter((e) => {
          if (e.startsWith(".") || e.startsWith("._")) return false;
          const lower = e.toLowerCase();
          return IMAGE_INPUT_EXTS.has(lower.slice(lower.lastIndexOf(".")));
        });
        const plan = inputs.map((file) => ({
          input: join(proj.paths.images, file),
          output: join(proj.paths.out, `${parse(file).name}.${ext}`),
        }));
        return ok({ project, format, count: plan.length, plan });
      } catch (e) {
        return err(e);
      }
    },
  );
}
