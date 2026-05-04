export { loadConfig, fallbackDataDir } from "./config.js";
export {
  CreatorStudioError,
  isCreatorStudioError,
  type ErrorCode,
} from "./errors.js";
export { buildProjectFcpxml } from "./fcpxml/builder.js";
export { validateFcpxmlAgainstDtd } from "./fcpxml/validate.js";
export {
  ProjectSpecSchema,
  AssetSpecSchema,
  FormatSpecSchema,
  type ProjectSpec,
  type AssetSpec,
  type FormatSpec,
  type SpineItem,
  type FrameRate,
} from "./fcpxml/types.js";
export { ProjectMetaSchema, type ProjectMeta } from "./projects/schema.js";
export {
  resolveProject,
  createProject,
  listProjects,
  type ResolvedProject,
} from "./projects/resolve.js";
export { verify, formatVerify } from "./verify.js";
