import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isMotionRunning, openMotion, openMotionTemplate } from "./app.js";
import {
  inspectTemplate,
  setParam,
  cloneTemplate,
} from "./ozml.js";
import { validateTemplate } from "./validate.js";
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

  server.tool(
    "motion_template_inspect",
    "Parse a Motion .motn / .moti template and return its OZML summary: version, file size, factory count, and the full parameter list (name, id, flags, value). Use this to discover what parameters a template exposes before mutating them.",
    {
      path: z.string().describe("Absolute path to a .motn or .moti file"),
      filterName: z
        .string()
        .optional()
        .describe("Optional substring filter on parameter name (case-sensitive)"),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum number of parameters to return"),
    },
    async ({ path, filterName, limit }) => {
      try {
        const result = await inspectTemplate(path);
        let params = result.parameters;
        if (filterName) {
          params = params.filter((p) => p.name.includes(filterName));
        }
        const totalAfterFilter = params.length;
        if (limit !== undefined) {
          params = params.slice(0, limit);
        }
        return ok({
          path: result.path,
          ozmlVersion: result.ozmlVersion,
          byteSize: result.byteSize,
          factoryCount: result.factories.length,
          parameterCount: result.parameterCount,
          filteredParameterCount: totalAfterFilter,
          returnedParameters: params.length,
          parameters: params,
        });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "motion_template_set_param",
    "Mutate a single parameter's value in a Motion template. Preserves all other content byte-for-byte (whitespace, comments, structure). NEVER call this on a bundled Apple template — clone first via motion_template_clone, then mutate the copy.",
    {
      path: z.string().describe("Absolute path to a .motn or .moti file"),
      name: z.string().describe("Parameter name attribute, e.g. 'Size' or 'Rotation'"),
      id: z
        .string()
        .describe("Parameter id attribute (often a number, but stored as a string in OZML)"),
      value: z.string().describe("New value (will be XML-escaped if needed)"),
      outputPath: z
        .string()
        .optional()
        .describe("Where to write the modified file. Default: in-place mutation of `path`."),
      matchIndex: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "If multiple parameters share name+id, choose the Nth match (0-based). Default 0.",
        ),
    },
    async ({ path, name, id, value, outputPath, matchIndex }) => {
      try {
        const result = await setParam(path, name, id, value, {
          outputPath,
          matchIndex,
        });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "motion_template_validate",
    "Validate a Motion .motn template against 31 OZML structural invariants. Returns ok, violations[], and warnings[]. Run before any write to catch structural corruption before it silently drops content in Motion.",
    {
      path: z.string().describe("Absolute path to a .motn or .moti file"),
    },
    async ({ path }) => {
      try {
        const result = await validateTemplate(path);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "motion_template_clone",
    "Copy a Motion .motn / .moti template to a new path. Use before mutating bundled Apple templates so you never touch the originals in /Applications/Motion Creator Studio.app/Contents/Resources/.",
    {
      sourcePath: z.string().describe("Absolute path to source .motn / .moti file"),
      destinationPath: z
        .string()
        .describe("Absolute path for the cloned copy (parent dirs will be created)"),
    },
    async ({ sourcePath, destinationPath }) => {
      try {
        const result = await cloneTemplate(sourcePath, destinationPath);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );
}
