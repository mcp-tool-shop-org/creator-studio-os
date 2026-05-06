import { access } from "node:fs/promises";
import { CreatorStudioError } from "@creator-studio-os/core";
import { encodeJob } from "@creator-studio-os/compressor";

export interface RenderResult {
  jobId: string;
  batchId?: string;
  motnPath: string;
  settingPath: string;
  locationPath: string;
}

/**
 * Render a Motion template headlessly via Compressor.
 *
 * Compressor accepts .motn files directly via -jobpath; it honors the render
 * quality saved in the template. This is the first programmatic Motion render
 * path in any MCP — no UI scripting required.
 */
export async function renderViaCompressor(opts: {
  motnPath: string;
  settingPath: string;
  locationPath: string;
  batchName?: string;
}): Promise<RenderResult> {
  try {
    await access(opts.motnPath);
  } catch {
    throw new CreatorStudioError(
      "E_OZML_FILE_MISSING",
      `Motion template not found: ${opts.motnPath}`,
      "Ensure the .motn file exists. Use motion_template_clone to copy a bundled template first.",
    );
  }

  const result = await encodeJob({
    jobPath: opts.motnPath,
    settingPath: opts.settingPath,
    locationPath: opts.locationPath,
    batchName: opts.batchName,
  });

  return {
    jobId: result.jobId,
    batchId: result.batchId,
    motnPath: opts.motnPath,
    settingPath: opts.settingPath,
    locationPath: opts.locationPath,
  };
}
