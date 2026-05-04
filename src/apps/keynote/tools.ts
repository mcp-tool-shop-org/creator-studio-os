import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig } from "../../config.js";
import {
  activateApp,
  closeDocumentInApp,
  exportDocumentInApp,
  isAppRunning,
  openDocumentInApp,
} from "../iwork/shared.js";
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

const ImageFormatSchema = z.enum(["PNG", "JPEG", "TIFF"]).default("PNG");

export function registerKeynoteTools(server: McpServer) {
  const cfg = loadConfig();
  const bid = () => loadConfig().keynoteBundleId;

  server.tool("keynote_app_open", "Activate Keynote", {}, async () => {
    try {
      await activateApp(bid());
      return ok({ opened: true });
    } catch (e) {
      return err(e);
    }
  });

  server.tool(
    "keynote_app_running",
    "Check whether Keynote is running",
    {},
    async () => {
      try {
        return ok({ running: await isAppRunning(bid()) });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "keynote_open",
    "Open a Keynote document. Returns the document name (used by other tools).",
    { path: z.string() },
    async ({ path }) => {
      try {
        return ok(await openDocumentInApp(bid(), path));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "keynote_close",
    "Close a Keynote document",
    { name: z.string(), saving: z.enum(["yes", "no", "ask"]).default("no") },
    async ({ name, saving }) => {
      try {
        await closeDocumentInApp(bid(), name, saving);
        return ok({ closed: name });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "keynote_export_pdf",
    "Export a Keynote slideshow to PDF",
    { documentName: z.string(), outputPath: z.string() },
    async ({ documentName, outputPath }) => {
      try {
        await exportDocumentInApp({
          bundleId: bid(),
          documentName,
          outputPath,
          formatLiteral: "PDF",
        });
        return ok({ exported: outputPath, format: "PDF" });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "keynote_export_images",
    "Export each Keynote slide as an image (PNG / JPEG / TIFF) into a folder",
    {
      documentName: z.string(),
      outputPath: z
        .string()
        .describe("Path to the output folder Keynote will create"),
      imageFormat: ImageFormatSchema,
    },
    async ({ documentName, outputPath, imageFormat }) => {
      try {
        await exportDocumentInApp({
          bundleId: bid(),
          documentName,
          outputPath,
          formatLiteral: "slide images",
          withPropertiesRecord: `{image format:${imageFormat}}`,
        });
        return ok({ exported: outputPath, format: "slide images", imageFormat });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "keynote_export_movie",
    "Export a Keynote slideshow as a QuickTime movie",
    { documentName: z.string(), outputPath: z.string() },
    async ({ documentName, outputPath }) => {
      try {
        await exportDocumentInApp({
          bundleId: bid(),
          documentName,
          outputPath,
          formatLiteral: "QuickTime movie",
        });
        return ok({ exported: outputPath, format: "QuickTime movie" });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "keynote_export_pptx",
    "Export a Keynote slideshow as a Microsoft PowerPoint file",
    { documentName: z.string(), outputPath: z.string() },
    async ({ documentName, outputPath }) => {
      try {
        await exportDocumentInApp({
          bundleId: bid(),
          documentName,
          outputPath,
          formatLiteral: "Microsoft PowerPoint",
        });
        return ok({ exported: outputPath, format: "Microsoft PowerPoint" });
      } catch (e) {
        return err(e);
      }
    },
  );
}
