import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isLogicRunning, openLogic, openLogicProject } from "./app.js";
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

export function registerLogicTools(server: McpServer) {
  server.tool(
    "logic_app_open",
    "Open Logic Pro. Logic has no AppleScript dictionary; this is a file-open handoff.",
    {},
    async () => {
      try {
        await openLogic();
        return ok({ opened: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "logic_app_running",
    "Check whether Logic Pro is running",
    {},
    async () => {
      try {
        return ok({ running: await isLogicRunning() });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "logic_open",
    "Open a Logic Pro project (.logicx) file. Logic launches and opens it; further automation is up to the user (Logic exposes no AppleScript surface for project authoring).",
    { path: z.string().describe("Absolute path to a .logicx project bundle") },
    async ({ path }) => {
      try {
        await openLogicProject(path);
        return ok({ opened: path });
      } catch (e) {
        return err(e);
      }
    },
  );
}
