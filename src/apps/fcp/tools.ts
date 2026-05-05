import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, mkdir } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import { loadConfig } from "../../config.js";
import { resolveProject, createProject, listProjects as listProjectDirs } from "../../projects/resolve.js";
import { buildProjectFcpxml } from "../../fcpxml/builder.js";
import { validateFcpxmlAgainstDtd } from "../../fcpxml/validate.js";
import {
  listLibraries,
  listEvents,
  listProjects as listFcpProjects,
  readProjectMetadata,
} from "./library.js";
import { openFcp, activateFcp, isFcpRunning } from "./app.js";
import { runApp } from "../../runners/runApp.js";
import { buildEffectsCatalog, findEffect } from "./effects.js";
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

export function registerFcpTools(server: McpServer) {
  server.tool(
    "fcp_project_list",
    "List projects in the data directory's projects/ folder",
    {},
    async () => {
      try {
        return ok({ projects: await listProjectDirs() });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_project_create",
    "Create a new project directory with the standard subdir layout (footage/, audio/, images/, brand/, refs/, fcp/, out/) and a project.json",
    {
      name: z.string().describe("Project name (becomes the directory name)"),
      kind: z
        .enum(["trailer", "devlog", "social", "tutorial", "ad", "podcast", "other"])
        .optional(),
      aspect: z.enum(["16:9", "9:16", "1:1", "4:5"]).optional(),
      frameRate: z
        .enum(["23.98", "24", "25", "29.97", "30", "50", "59.94", "60"])
        .optional(),
      deliverable: z.string().optional(),
      durationSeconds: z.number().nonnegative().optional(),
      notes: z.string().optional(),
    },
    async (args) => {
      try {
        const proj = await createProject(args.name, {
          kind: args.kind,
          target: {
            aspect: args.aspect ?? "16:9",
            frameRate: args.frameRate ?? "29.97",
            deliverable: args.deliverable,
            durationSeconds: args.durationSeconds,
          },
          notes: args.notes,
        });
        return ok({ root: proj.root, meta: proj.meta, paths: proj.paths });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_project_info",
    "Read project metadata and resolved paths from the data directory",
    { name: z.string() },
    async ({ name }) => {
      try {
        const proj = await resolveProject(name);
        return ok({ root: proj.root, meta: proj.meta, paths: proj.paths });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_fcpxml_build",
    "Build an FCPXML 1.14 document (1.13 also supported) from a JSON project spec. Returns the XML string without writing it.",
    {
      spec: z.unknown().describe("ProjectSpec — see schema in repo docs"),
    },
    async ({ spec }) => {
      try {
        const result = buildProjectFcpxml(spec);
        return ok({ xml: result.xml, fcpxmlVersion: "1.13" });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_fcpxml_validate",
    "Validate an FCPXML document against the bundled FCPXMLv1_14.dtd (requires xmllint). Returns valid=true/false and validator output.",
    { xml: z.string() },
    async ({ xml }) => {
      try {
        const cfg = loadConfig();
        const result = await validateFcpxmlAgainstDtd(xml, cfg.fcpDtdPath);
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_fcpxml_write",
    "Write an FCPXML document to a project's fcp/ directory. Returns the absolute path.",
    {
      project: z.string().describe("Project name in the data directory"),
      xml: z.string(),
      filename: z
        .string()
        .default("timeline.fcpxml")
        .describe("Filename to write inside projects/<name>/fcp/"),
    },
    async ({ project, xml, filename }) => {
      try {
        const proj = await resolveProject(project);
        await mkdir(proj.paths.fcp, { recursive: true });
        const out = isAbsolute(filename)
          ? filename
          : join(proj.paths.fcp, filename);
        await writeFile(out, xml, "utf-8");
        return ok({ path: out });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_fcpxml_import",
    "Open an FCPXML file in Final Cut Pro (FCP imports it as a project). Activates FCP.",
    { path: z.string().describe("Absolute path to an .fcpxml file") },
    async ({ path }) => {
      try {
        const cfg = loadConfig();
        await runApp.open(path, { appBundleId: cfg.fcpBundleId });
        return ok({ opened: path });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_fcpxml_build_write_import",
    "Build, validate, write, and import an FCPXML document in one call. The end-to-end happy path.",
    {
      project: z.string(),
      spec: z.unknown(),
      filename: z.string().default("timeline.fcpxml"),
      skipValidate: z.boolean().default(false),
    },
    async ({ project, spec, filename, skipValidate }) => {
      try {
        const cfg = loadConfig();
        const proj = await resolveProject(project);
        const built = buildProjectFcpxml(spec);

        let validation: { valid: boolean; output: string } | null = null;
        if (!skipValidate) {
          const v = await validateFcpxmlAgainstDtd(built.xml, cfg.fcpDtdPath);
          validation = { valid: v.valid, output: v.output };
          if (!v.valid) {
            throw new CreatorStudioError(
              "E_FCPXML_INVALID",
              `FCPXML failed DTD validation: ${v.output}`,
              "Inspect the spec — check time fields, asset refs, format ID consistency.",
            );
          }
        }

        await mkdir(proj.paths.fcp, { recursive: true });
        const out = join(proj.paths.fcp, filename);
        await writeFile(out, built.xml, "utf-8");
        await runApp.open(out, { appBundleId: cfg.fcpBundleId });

        return ok({ path: out, validation, opened: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_library_list",
    "List libraries currently open in Final Cut Pro (read-only AppleScript)",
    {},
    async () => {
      try {
        return ok({ libraries: await listLibraries() });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_library_events",
    "List events inside a library that is open in Final Cut Pro",
    { library: z.string() },
    async ({ library }) => {
      try {
        return ok({ events: await listEvents(library) });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_event_projects",
    "List projects inside an event in a library that is open in Final Cut Pro",
    { library: z.string(), event: z.string() },
    async ({ library, event }) => {
      try {
        return ok({ projects: await listFcpProjects(library, event) });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_project_metadata",
    "Read sequence metadata (duration, frame rate, timecode format) for a project in FCP",
    {
      library: z.string(),
      event: z.string(),
      project: z.string(),
    },
    async ({ library, event, project }) => {
      try {
        return ok(await readProjectMetadata(library, event, project));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_app_open",
    "Open Final Cut Pro (no-op if already running)",
    {},
    async () => {
      try {
        await openFcp();
        return ok({ running: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_app_activate",
    "Bring Final Cut Pro to the front",
    {},
    async () => {
      try {
        await activateFcp();
        return ok({ activated: true });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_app_running",
    "Check whether Final Cut Pro is currently running",
    {},
    async () => {
      try {
        return ok({ running: await isFcpRunning() });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    "fcp_effects_catalog",
    "Walk Motion Templates directories (user, system, FCP-bundled) and return a catalog of all .moti/.motn effects with their kind (title/generator/effect/transition), published parameter names, and param counts. Results are cached at <dataDir>/.csos/effects-catalog.json.",
    {
      kind: z
        .enum(["title", "generator", "effect", "transition"])
        .optional()
        .describe("Filter results to a specific effect kind"),
      refresh: z
        .boolean()
        .optional()
        .describe("Force a full rescan — ignore the cache"),
      name: z
        .string()
        .optional()
        .describe("Return only the entry matching this name (case-insensitive). Throws E_EFFECT_NOT_FOUND if missing."),
    },
    async ({ kind, refresh, name }) => {
      try {
        const catalog = await buildEffectsCatalog({ refresh });
        let entries = catalog.entries;
        if (kind) entries = entries.filter((e) => e.kind === kind);
        if (name) {
          const found = findEffect(name, { ...catalog, entries });
          return ok({ buildTime: catalog.buildTime, count: 1, entries: [found] });
        }
        return ok({ buildTime: catalog.buildTime, count: entries.length, entries });
      } catch (e) {
        return err(e);
      }
    },
  );

}
