export { loadConfig, fallbackDataDir } from "@creator-studio-os/core";
export {
  CreatorStudioError,
  isCreatorStudioError,
  type ErrorCode,
} from "@creator-studio-os/core";
export { buildProjectFcpxml } from "@creator-studio-os/fcp";
export { validateFcpxmlAgainstDtd } from "@creator-studio-os/fcp";
export {
  ProjectSpecSchema,
  AssetSpecSchema,
  FormatSpecSchema,
  type ProjectSpec,
  type AssetSpec,
  type FormatSpec,
  type SpineItem,
  type FrameRate,
} from "@creator-studio-os/fcp";
export { ProjectMetaSchema, type ProjectMeta } from "@creator-studio-os/core";
export {
  resolveProject,
  createProject,
  listProjects,
  type ResolvedProject,
} from "@creator-studio-os/core";
export { verify, formatVerify } from "./verify.js";
