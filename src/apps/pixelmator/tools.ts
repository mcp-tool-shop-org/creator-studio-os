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
