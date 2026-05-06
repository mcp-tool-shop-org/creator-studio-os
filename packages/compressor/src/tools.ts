import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveProject } from "@creator-studio-os/core";
import { listCompressorSettings } from "./settings.js";
import { listCompressorLocations } from "./locations.js";
import { encodeJob } from "./cli.js";
import { isCompressorRunning, openCompressor } from "./app.js";
import { monitorStream, statusOnce, jobAction, waitFor } from "./monitor.js";
import { inspectSetting, resolveSettingByName, getCodecAvailability } from "./inspect.js";
import { CreatorStudioError } from "@creator-studio-os/core";
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
    "List available Compressor encode settings (.compressorsetting). Returns user + system; pass includeBundled=true to also list Apple's bundled presets. Each entry includes availability: ok | codec-removed | arch-incompatible.",
    {
      includeBundled: z.boolean().default(false),
      withAvailability: z.boolean().default(false).describe("If true, inspect each setting to annotate availability (slower)"),
    },
    async ({ includeBundled, withAvailability }) => {
      try {
        const settings = await listCompressorSettings({ includeBundled });
        if (!withAvailability) return ok({ settings });
        const avail = await getCodecAvailability();
        const annotated = await Promise.all(
          settings.map(async (s) => {
            try {
              const inspected = await inspectSetting({ path: s.path, resolveNames: false });
              return { ...s, availability: inspected.availability };
            } catch {
              return { ...s, availability: "ok" as const };
            }
          }),
        );
        return ok({ settings: annotated, codecAvailability: avail });
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
    "Convenience wrapper around compressor_encode for csos project-scoped workflows. Resolves project paths and writes output to the project's out/ directory. For encoding an arbitrary file, use compressor_encode directly.",
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

  // -------------------------------------------------------------------------
  // Ticket 1.3 — Compressor monitor stream
  // -------------------------------------------------------------------------

  server.tool(
    "compressor_status",
    "One-shot status check for a Compressor job or batch. Returns a StatusFrame with percentComplete, status, timeRemainingSeconds, etc.",
    {
      jobId: z.string().optional(),
      batchId: z.string().optional(),
    },
    async (args) => {
      try {
        const frame = await statusOnce({ jobId: args.jobId, batchId: args.batchId });
        return ok(frame);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_monitor_stream",
    "Stream Compressor encode progress via -monitor -format json. Emits periodic StatusFrames. Returns the final frame when the job reaches a terminal state.",
    {
      jobId: z.string().optional(),
      batchId: z.string().optional(),
      intervalSec: z.number().default(5).describe("Poll interval in seconds"),
      timeoutSec: z.number().default(3600).describe("Hard timeout in seconds"),
    },
    async (args, extra) => {
      try {
        const progressToken = extra._meta?.progressToken;
        let lastFrame = null;
        let frameCount = 0;
        for await (const frame of monitorStream({
          jobId: args.jobId,
          batchId: args.batchId,
          intervalSec: args.intervalSec,
          timeoutSec: args.timeoutSec,
        })) {
          lastFrame = frame;
          frameCount++;
          if (progressToken !== undefined) {
            await extra.sendNotification({
              method: "notifications/progress",
              params: {
                progressToken,
                progress: frame.percentComplete,
                total: 100,
                message: `${frame.percentComplete}% — ${frame.status} (${frame.timeRemainingSeconds}s remaining)`,
              },
            });
          }
        }
        return ok({ lastFrame, frameCount });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_pause",
    "Pause a Compressor job or batch",
    { jobId: z.string().optional(), batchId: z.string().optional() },
    async (args) => {
      try {
        await jobAction("pause", { jobId: args.jobId, batchId: args.batchId });
        return ok({ paused: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_resume",
    "Resume a paused Compressor job or batch",
    { jobId: z.string().optional(), batchId: z.string().optional() },
    async (args) => {
      try {
        await jobAction("resume", { jobId: args.jobId, batchId: args.batchId });
        return ok({ resumed: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_kill",
    "Cancel (kill) a Compressor job or batch",
    { jobId: z.string().optional(), batchId: z.string().optional() },
    async (args) => {
      try {
        await jobAction("kill", { jobId: args.jobId, batchId: args.batchId });
        return ok({ killed: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_wait_for",
    "Poll until a Compressor job or batch reaches the target status (completed/failed/cancelled). Returns the final StatusFrame.",
    {
      jobId: z.string().optional(),
      batchId: z.string().optional(),
      untilStatus: z.enum(["completed", "failed", "cancelled"]).default("completed"),
      timeoutSec: z.number().default(3600),
    },
    async (args) => {
      try {
        const frame = await waitFor({
          jobId: args.jobId,
          batchId: args.batchId,
          untilStatus: args.untilStatus,
          timeoutSec: args.timeoutSec,
        });
        return ok(frame);
      } catch (e) {
        return err(e);
      }
    },
  );

  // -------------------------------------------------------------------------
  // Ticket 1.4 — Settings inspect + codec availability
  // -------------------------------------------------------------------------

  server.tool(
    "compressor_settings_inspect",
    "Parse a .compressorsetting file and return structured codec, bitrate, dimensions, color metadata. Optionally decode the HEVC encoder-properties CDATA blob.",
    {
      path: z.string().describe("Absolute path to a .compressorsetting file"),
      locale: z.string().optional().describe("Locale for name resolution (default: system locale, fallback 'en')"),
      resolveNames: z.boolean().default(true).describe("Resolve nameKey/descriptionKey to human-readable names"),
      decodeEncoderProperties: z.boolean().default(false).describe("Decode the base64-bplist HEVC encoder-properties blob to extract Profile/Level"),
    },
    async (args) => {
      try {
        const result = await inspectSetting({
          path: args.path,
          locale: args.locale,
          resolveNames: args.resolveNames,
          decodeEncoderProperties: args.decodeEncoderProperties,
        });
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_settings_resolve",
    "Reverse-lookup a .compressorsetting path by its display name. Searches user + system + bundled settings.",
    {
      displayName: z.string().describe("Human-readable setting name (e.g. 'Apple Devices HD (Best Quality)')"),
    },
    async (args) => {
      try {
        const path = await resolveSettingByName(args.displayName);
        return ok({ path });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "compressor_codec_availability",
    "Return which codecs are available on this host (arch + Compressor version) and which have been removed. Useful before picking a preset.",
    {},
    async () => {
      try {
        return ok(await getCodecAvailability());
      } catch (e) {
        return err(e);
      }
    },
  );
}
