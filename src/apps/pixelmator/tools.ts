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
