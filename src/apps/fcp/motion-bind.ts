/**
 * motion-bind — bridge between Motion published parameters and FCPXML <param> elements.
 *
 * FCP exposes Motion template parameters in its Inspector via the "Publish To FCP"
 * marker. When building FCPXML programmatically, those same parameters are driven by
 * <param name="..." key="..." value="..."/> children inside <title>.
 *
 * The `key` attribute is an opaque slash-delimited path that FCP derives from the
 * OZML scenenode tree. We surface the parameter id as `paramId` — the caller should
 * verify the exact key string from a real FCP export for production use.
 */
import { readFile } from "node:fs/promises";
import { CreatorStudioError } from "../../errors.js";

export interface PublishedParamInfo {
  /** Human-readable name from the OZML <parameter name="..."> attribute */
  name: string;
  /** OZML parameter id — serves as the base for the FCPXML key */
  paramId: string;
  flags?: string;
  defaultValue?: string;
  currentValue?: string;
}

export interface MotionParamBinding {
  /** Parameter name (maps to FCPXML <param name="...">) */
  name: string;
  /**
   * FCPXML parameter key path (maps to <param key="...">).
   * FCP uses an opaque slash-delimited path; use paramId as a starting point
   * and verify the exact key from a real FCP FCPXML export.
   */
  key: string;
  /** String value to set */
  value: string;
}

const MARKER_RE = /<parameter\s+name="Publish To FCP"[^>]*\/>/g;
const TAG_RE = /<\/?parameter\b([^>]*)>/g;

function extractPublishedParamInfos(xml: string): PublishedParamInfo[] {
  const results: PublishedParamInfo[] = [];
  // Stack-based walk identical to effects.ts extractPublishedParams but richer output
  const stack: { name: string; id: string; flags?: string; defaultValue?: string; value?: string }[] = [];
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = TAG_RE.exec(xml)) !== null) {
    const fullTag = m[0];
    const attrs = m[1];

    if (fullTag.startsWith("</")) {
      stack.pop();
    } else if (attrs.trimEnd().endsWith("/")) {
      const nameMatch = attrs.match(/name="([^"]+)"/);
      if (nameMatch?.[1] === "Publish To FCP" && stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (parent.name && parent.id) {
          results.push({
            name: parent.name,
            paramId: parent.id,
            flags: parent.flags,
            defaultValue: parent.defaultValue,
            currentValue: parent.value,
          });
        }
      }
    } else {
      const attrMap: Record<string, string> = {};
      const attrRe = /(\w+)="([^"]*)"/g;
      let am: RegExpExecArray | null;
      while ((am = attrRe.exec(attrs)) !== null) {
        attrMap[am[1]] = am[2];
      }
      stack.push({
        name: attrMap.name ?? "",
        id: attrMap.id ?? "",
        flags: attrMap.flags,
        defaultValue: attrMap.default,
        value: attrMap.value,
      });
    }
  }

  return results;
}

/**
 * Read a .moti/.motn file and return all parameters that have the
 * "Publish To FCP" marker — i.e., the parameters FCP exposes in its Inspector.
 */
export async function readPublishedParams(motnPath: string): Promise<PublishedParamInfo[]> {
  let xml: string;
  try {
    xml = await readFile(motnPath, "utf-8");
  } catch {
    throw new CreatorStudioError("E_OZML_FILE_MISSING", `Motion template not found: ${motnPath}`);
  }

  if (!xml.includes("<ozml")) {
    throw new CreatorStudioError(
      "E_OZML_INVALID",
      `Not a valid OZML file: ${motnPath}`,
      "File must begin with an <ozml> root element.",
    );
  }

  return extractPublishedParamInfos(xml);
}

/**
 * Build a MotionParamBinding for one named parameter from a .moti/.motn file.
 * Throws E_OZML_PARAM_NOT_FOUND if the parameter is not published.
 */
export async function buildParamBinding(opts: {
  motnPath: string;
  paramName: string;
  value: string;
}): Promise<MotionParamBinding & { paramId: string }> {
  const published = await readPublishedParams(opts.motnPath);
  const found = published.find((p) => p.name === opts.paramName);
  if (!found) {
    throw new CreatorStudioError(
      "E_OZML_PARAM_NOT_FOUND",
      `Parameter "${opts.paramName}" is not published in ${opts.motnPath}`,
      `Published params: ${published.map((p) => p.name).join(", ") || "(none)"}. Use motion_publish_to_fcp to add the Publish To FCP marker first.`,
    );
  }

  return {
    name: found.name,
    key: found.paramId,
    value: opts.value,
    paramId: found.paramId,
  };
}
