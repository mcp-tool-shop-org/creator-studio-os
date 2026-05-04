import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isMotionRunning, openMotion, openMotionTemplate } from "./app.js";
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

export function registerMotionTools(server: McpServer) {
  server.tool(
    "motion_app_open",
    "Open Motion. Motion has no AppleScript dictionary; this is a file-open handoff.",
    {},
    async () => {
      try {
        await openMotion();
        return ok({ opened: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "motion_app_running",
    "Check whether Motion is running",
    {},
    async () => {
      try {
        return ok({ running: await isMotionRunning() });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "motion_open",
    "Open a Motion (.motn) template or project. Motion launches and opens it; further automation is up to the user (Motion exposes no AppleScript surface).",
    { path: z.string().describe("Absolute path to a .motn file") },
    async ({ path }) => {
      try {
        await openMotionTemplate(path);
        return ok({ opened: path });
      } catch (e) {
        return err(e);
      }
    },
  );
}
