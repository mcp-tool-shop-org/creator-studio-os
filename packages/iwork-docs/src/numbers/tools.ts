import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig } from "@creator-studio-os/core";
import {
  activateApp,
  closeDocumentInApp,
  exportDocumentInApp,
  isAppRunning,
  openDocumentInApp,
} from "@creator-studio-os/core";
import { CreatorStudioError } from "@creator-studio-os/core";

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

const NUMBERS_FORMATS = {
  PDF: "PDF",
  Excel: "Microsoft Excel",
  CSV: "CSV",
} as const;
type NumbersFormatKey = keyof typeof NUMBERS_FORMATS;

const FormatSchema = z.enum(
  Object.keys(NUMBERS_FORMATS) as [NumbersFormatKey, ...NumbersFormatKey[]],
);

export function registerNumbersTools(server: McpServer) {
  const bid = () => loadConfig().numbersBundleId;

  server.tool("numbers_app_open", "Activate Numbers", {}, async () => {
    try {
      await activateApp(bid());
      return ok({ opened: true });
    } catch (e) {
      return err(e);
    }
  });

  server.tool(
    "numbers_app_running",
    "Check whether Numbers is running",
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
    "numbers_open",
    "Open a Numbers document. Returns the document name.",
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
    "numbers_close",
    "Close a Numbers document",
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
    "numbers_export",
    "Export a Numbers document to PDF / Microsoft Excel / CSV",
    {
      documentName: z.string(),
      outputPath: z.string(),
      format: FormatSchema,
    },
    async ({ documentName, outputPath, format }) => {
      try {
        await exportDocumentInApp({
          bundleId: bid(),
          documentName,
          outputPath,
          formatLiteral: NUMBERS_FORMATS[format],
        });
        return ok({ exported: outputPath, format });
      } catch (e) {
        return err(e);
      }
    },
  );
}
