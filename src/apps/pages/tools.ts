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

const PAGES_FORMATS = {
  PDF: "PDF",
  Word: "Microsoft Word",
  RTF: "formatted text",
  Text: "unformatted text",
  EPUB: "EPUB",
} as const;
type PagesFormatKey = keyof typeof PAGES_FORMATS;

const FormatSchema = z.enum(
  Object.keys(PAGES_FORMATS) as [PagesFormatKey, ...PagesFormatKey[]],
);

export function registerPagesTools(server: McpServer) {
  const bid = () => loadConfig().pagesBundleId;

  server.tool("pages_app_open", "Activate Pages", {}, async () => {
    try {
      await activateApp(bid());
      return ok({ opened: true });
    } catch (e) {
      return err(e);
    }
  });

  server.tool(
    "pages_app_running",
    "Check whether Pages is running",
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
    "pages_open",
    "Open a Pages document. Returns the document name.",
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
    "pages_close",
    "Close a Pages document",
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
    "pages_export",
    "Export a Pages document to PDF / Word / RTF / unformatted text / EPUB",
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
          formatLiteral: PAGES_FORMATS[format],
        });
        return ok({ exported: outputPath, format });
      } catch (e) {
        return err(e);
      }
    },
  );
}
