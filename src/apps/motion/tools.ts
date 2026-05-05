import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isMotionRunning, openMotion, openMotionTemplate } from "./app.js";
import {
  inspectTemplate,
  setParam,
  cloneTemplate,
} from "./ozml.js";
import { validateTemplate } from "./validate.js";
import { renderViaCompressor } from "./render.js";
import { publishToFcp } from "./publish.js";
import { editText } from "./textEdit.js";
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

  server.tool(
    "motion_render_via_compressor",
    "Render a Motion .motn template headlessly via Compressor (-jobpath). This is the first programmatic Motion render path in any MCP — no UI scripting required. Returns jobId+batchId for piping into compressor_monitor_stream.",
    {
      motnPath: z.string().describe("Absolute path to a .motn file"),
      settingPath: z.string().describe("Absolute path to a .compressorsetting file"),
      locationPath: z.string().describe("Absolute path for the rendered output file"),
      batchName: z.string().optional(),
    },
    async (args) => {
      try {
        const result = await renderViaCompressor({
          motnPath: args.motnPath,
          settingPath: args.settingPath,
          locationPath: args.locationPath,
          batchName: args.batchName,
        });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "motion_publish_to_fcp",
    "Add or remove the 'Publish To FCP' marker on a Motion template parameter. publish=true exposes the parameter in FCP's inspector; publish=false hides it. Pairs with fcp_bind_motion_param to close the killer chain.",
    {
      path: z.string().describe("Absolute path to the .motn file (will be modified in-place unless outputPath given)"),
      paramName: z.string().describe("Parameter name attribute, e.g. 'Headline'"),
      paramId: z.number().int().describe("Parameter id attribute (integer)"),
      publish: z.boolean().describe("true = add the Publish To FCP marker; false = remove it"),
      matchIndex: z.number().int().nonnegative().optional().describe("If multiple params share name+id, select the Nth (0-based)"),
      outputPath: z.string().optional().describe("Write output here instead of overwriting the source"),
    },
    async (args) => {
      try {
        const result = await publishToFcp({
          path: args.path,
          paramName: args.paramName,
          paramId: args.paramId,
          publish: args.publish,
          matchIndex: args.matchIndex,
          outputPath: args.outputPath,
        });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "motion_template_edit_text",
    "Edit the visible text content of a Motion title template (.motn / .moti). Performs four coordinated atomic edits: replaces CDATA, rebuilds <object> glyph list (one per Unicode codepoint, newlines included), stretches the last <styleRun> to the new length, and verifies all <style> references exist. Five validators run before any write. Use before motion_template_validate to confirm structural integrity. Never call on bundled Apple templates — clone first via motion_template_clone.",
    {
      path: z.string().describe("Absolute path to the .motn or .moti file to edit"),
      newText: z.string().describe("The replacement text string. Newlines (\\n) count as glyphs. Non-ASCII blocked by default — pass allowNonAscii=true to override."),
      textNodeIndex: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("Which <text> element to edit when a template has multiple title nodes (0-based, default 0)"),
      outputPath: z
        .string()
        .optional()
        .describe("Write the modified file here instead of overwriting the source"),
      allowNonAscii: z
        .boolean()
        .optional()
        .describe("Allow non-ASCII characters. Default false — codepoint encoding for non-ASCII is empirically unverified in OZML until smoke against a Japanese template confirms it."),
    },
    async (args) => {
      try {
        const result = await editText(args.path, args.newText, {
          textNodeIndex: args.textNodeIndex,
          outputPath: args.outputPath,
          allowNonAscii: args.allowNonAscii,
        });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );
}
