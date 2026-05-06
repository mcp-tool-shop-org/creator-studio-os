/**
 * csos_app_status — MCP tool registration.
 *
 * Single tool, `app` param dispatches to the right provider.
 * Returns AppStatus shape for the requested app.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAppStatus, getAllAppStatus, type AppName } from "./status.js";
import { CreatorStudioError } from "../errors.js";

function ok<T>(value: T) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}
function err(e: unknown) {
  if (e instanceof CreatorStudioError) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: JSON.stringify(e.toJSON(), null, 2) }],
    };
  }
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ code: "E_INTERNAL", message: e instanceof Error ? e.message : String(e) }, null, 2) }],
  };
}

const APP_NAMES: [AppName, ...AppName[]] = [
  "fcp", "compressor", "motion", "logic",
  "pixelmator", "keynote", "pages", "numbers",
];

export function registerStatusTool(server: McpServer) {
  server.tool(
    "csos_app_status",
    "Check whether a Creator Studio app (Final Cut Pro, Compressor, Motion, Logic, Pixelmator, Keynote, Pages, or Numbers) is running and healthy. Returns process state, version, front-document name, and — for Compressor — current encode queue depth (number of jobs queued or active). Pass app=\"all\" to query all 8 apps at once.",
    {
      app: z
        .enum([...APP_NAMES, "all"] as [AppName | "all", ...(AppName | "all")[]])
        .describe(
          "Which app to probe: fcp | compressor | motion | logic | pixelmator | keynote | pages | numbers | all",
        ),
    },
    async ({ app }) => {
      try {
        if (app === "all") {
          const statuses = await getAllAppStatus();
          return ok(statuses);
        }
        const status = await getAppStatus(app as AppName);
        return ok(status);
      } catch (e) {
        return err(e);
      }
    },
  );
}
