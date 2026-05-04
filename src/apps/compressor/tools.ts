import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveProject } from "../../projects/resolve.js";
import { listCompressorSettings } from "./settings.js";
import { listCompressorLocations } from "./locations.js";
import { encodeJob } from "./cli.js";
import { isCompressorRunning, openCompressor } from "./app.js";
import { CreatorStudioError } from "../../errors.js";
import { join, isAbsolute } from "node:path";

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

export function registerCompressorTools(server: McpServer) {
  server.tool(
    "compressor_app_open",
    "Open Compressor (idempotent). First run after install or sign-in primes purchase entitlement validation.",
    {},
    async () => {
      try {
        await openCompressor();
        return ok({ opened: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_app_running",
    "Check whether Compressor is currently running",
    {},
    async () => {
      try {
        return ok({ running: await isCompressorRunning() });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_settings_list",
    "List available Compressor encode settings (.compressorsetting). Returns user + system; pass includeBundled=true to also list Apple's bundled presets.",
    {
      includeBundled: z.boolean().default(false),
    },
    async ({ includeBundled }) => {
      try {
        return ok({
          settings: await listCompressorSettings({ includeBundled }),
        });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_locations_list",
    "List available Compressor locations (.compressorlocation files) from user + system dirs",
    {},
    async () => {
      try {
        return ok({ locations: await listCompressorLocations() });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_encode",
    "Submit a single encode job to Compressor's queue via CLI. Returns when Compressor has accepted the job (the actual encode runs asynchronously).",
    {
      jobPath: z.string().describe("Absolute path to source media"),
      settingPath: z
        .string()
        .describe("Absolute path to a .compressorsetting file"),
      locationPath: z
        .string()
        .describe("Absolute path to the desired output file"),
      batchName: z.string().optional(),
      computerGroup: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    },
    async (args) => {
      try {
        const result = await encodeJob({
          jobPath: args.jobPath,
          settingPath: args.settingPath,
          locationPath: args.locationPath,
          batchName: args.batchName,
          computerGroup: args.computerGroup,
          priority: args.priority,
        });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_encode_project",
    "Resolve a project, encode a file from its out/ or footage/ tree using a named setting, write to out/. Convenience wrapper around compressor_encode.",
    {
      project: z.string(),
      sourceFilename: z
        .string()
        .describe(
          "Filename inside the project (relative path within the project root, or absolute path)",
        ),
      settingPath: z
        .string()
        .describe("Absolute path to a .compressorsetting file"),
      outputFilename: z
        .string()
        .describe(
          "Filename to write inside projects/<project>/out/ (or absolute path)",
        ),
      batchName: z.string().optional(),
    },
    async (args) => {
      try {
        const proj = await resolveProject(args.project);
        const source = isAbsolute(args.sourceFilename)
          ? args.sourceFilename
          : join(proj.root, args.sourceFilename);
        const output = isAbsolute(args.outputFilename)
          ? args.outputFilename
          : join(proj.paths.out, args.outputFilename);
        const result = await encodeJob({
          jobPath: source,
          settingPath: args.settingPath,
          locationPath: output,
          batchName: args.batchName ?? `${args.project} — ${args.outputFilename}`,
        });
        return ok({ ...result, source, output });
      } catch (e) {
        return err(e);
      }
    },
  );
}
