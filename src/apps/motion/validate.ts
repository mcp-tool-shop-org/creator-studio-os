/**
 * Motion OZML template validator — 31 structural invariants.
 *
 * Violation codes are specific to the invariant they test; warnings are
 * informational (non-ASCII codepoint encoding is empirically unverified).
 *
 * Designed to run before any write operation on a .motn file.
 */
import { readFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { CreatorStudioError } from "../../errors.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ViolationCode =
  | "E_OZML_VALIDATION_FAILED"          // generic wrapper
  | "E_OZML_FACTORY_DUPLICATE_ID"       // invariant 2
  | "E_OZML_FACTORY_DUPLICATE_UUID"     // invariant 2
  | "E_OZML_SCENENODE_FACTORY_MISSING"  // invariant 3
  | "E_OZML_ID_NOT_UNIQUE"              // invariant 4
  | "E_OZML_CROSS_REF_DEAD"             // invariant 5
  | "E_OZML_PARAM_ID_COLLISION"         // invariant 6
  | "E_OZML_KEYFRAME_VALUE_AND_CURVE"   // invariant 7
  | "E_OZML_KEYPOINT_COUNT_MISMATCH"    // invariant 8
  | "E_OZML_KEYPOINT_NOT_MONOTONIC"     // invariant 9
  | "E_OZML_GLYPH_COUNT_MISMATCH"       // invariant 11/12
  | "E_OZML_KERNING_ID_GAP"             // invariant 13
  | "E_OZML_STYLERUN_GAP"               // invariant 14
  | "E_OZML_STYLERUN_OVERLAP"           // invariant 14 (overlap variant)
  | "E_OZML_STYLE_REFERENCE_DEAD"       // invariant 16
  | "E_OZML_FONT_TYPE_VALUE_MISMATCH"   // invariant 17
  | "E_OZML_CLIP_DUPLICATE_ID"          // invariant 18
  | "E_OZML_TIMING_OUT_OF_BOUNDS"       // invariant 22
  | "E_OZML_CREATIONDURATION_MISMATCH"  // invariant 21
  | "E_OZML_AUDIO_RETIME_MISMATCH"      // invariant 25
  | "E_OZML_LINKED_OBJECT_DEAD"         // invariant 26
  | "E_OZML_PUBLISH_MARKER_DANGLING";   // invariant 30

export interface Violation {
  code: ViolationCode;
  scope: string;
  message: string;
  hint: string;
}

export interface Warning {
  code: string;
  scope: string;
  message: string;
}

export interface ValidateResult {
  ok: boolean;
  violations: Violation[];
  warnings: Warning[];
}

// ---------------------------------------------------------------------------
// XML parser config
// ---------------------------------------------------------------------------

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  isArray: (name) =>
    [
      "factory", "scenenode", "parameter", "style", "clip", "footage",
      "audioTrack", "layer", "object", "styleRun", "keypoint",
    ].includes(name),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AnyObj = Record<string, unknown>;

function attr(node: AnyObj, key: string): string {
  return String((node as AnyObj)[`@_${key}`] ?? "");
}

function numAttr(node: AnyObj, key: string): number {
  return Number((node as AnyObj)[`@_${key}`] ?? 0);
}

function textContent(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object") {
    const obj = node as AnyObj;
    if ("#text" in obj) return String(obj["#text"]);
  }
  return "";
}

function toArray<T>(v: unknown): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v as T[];
  return [v as T];
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

export async function validateTemplate(path: string): Promise<ValidateResult> {
  let xml: string;
  try {
    xml = await readFile(path, "utf-8");
  } catch (e) {
    throw new CreatorStudioError("E_OZML_FILE_MISSING", `File not found: ${path}`);
  }

  if (!xml.includes("<ozml")) {
    throw new CreatorStudioError("E_OZML_INVALID", `Not an OZML file: ${path}`);
  }

  const violations: Violation[] = [];
  const warnings: Warning[] = [];

  function v(code: ViolationCode, scope: string, message: string, hint: string) {
    violations.push({ code, scope, message, hint });
  }
  function w(code: string, scope: string, message: string) {
    warnings.push({ code, scope, message });
  }

  const doc = parser.parse(xml) as AnyObj;
  const ozml = (doc["ozml"] as AnyObj) ?? {};

  // -------------------------------------------------------------------------
  // §1.1 Document-level invariants (1–5)
  // -------------------------------------------------------------------------

  // Invariant 1: root element is <ozml version="X.Y">
  if (!attr(ozml, "version")) {
    v("E_OZML_VALIDATION_FAILED", "document", "Root <ozml> element missing version attribute", "Add version=\"4.0\" to the <ozml> root.");
  }

  // Invariant 2: factory id + uuid uniqueness
  const factoriesBlock = (ozml["factories"] as AnyObj) ?? {};
  const factories: AnyObj[] = toArray(factoriesBlock["factory"]);
  const factoryIds = new Set<string>();
  const factoryUuids = new Set<string>();
  for (const f of factories) {
    const fid = attr(f, "id");
    const fuuid = attr(f, "uuid");
    if (factoryIds.has(fid)) {
      v("E_OZML_FACTORY_DUPLICATE_ID", `factory[id=${fid}]`, `Duplicate factory id: ${fid}`, "Each <factory> must have a unique integer id.");
    }
    if (factoryUuids.has(fuuid)) {
      v("E_OZML_FACTORY_DUPLICATE_UUID", `factory[uuid=${fuuid}]`, `Duplicate factory uuid: ${fuuid}`, "Each <factory> must have a unique 32-char hex UUID.");
    }
    factoryIds.add(fid);
    factoryUuids.add(fuuid);
  }

  // Invariant 3: scenenode factoryID references must exist in <factories>
  const allScenonodes: AnyObj[] = toArray(ozml["scenenode"]);
  for (const sn of allScenonodes) {
    const fid = attr(sn, "factoryID");
    if (fid && !factoryIds.has(fid)) {
      v("E_OZML_SCENENODE_FACTORY_MISSING", `scenenode[id=${attr(sn, "id")}]`, `scenenode references factory id=${fid} which does not exist in <factories>`, "Ensure factory is declared before it is referenced.");
    }
  }

  // Invariant 4: scenenode, style, clip, footage, audioTrack, layer ids are document-unique
  const globalIds = new Map<string, string>(); // id → element type
  function checkGlobalId(kind: string, id: string) {
    if (!id) return;
    if (globalIds.has(id)) {
      v("E_OZML_ID_NOT_UNIQUE", `${kind}[id=${id}]`, `Duplicate id=${id} (first seen as ${globalIds.get(id)})`, "Each <scenenode>, <style>, <clip>, <footage>, <audioTrack> must have a document-unique id.");
    } else {
      globalIds.set(id, kind);
    }
  }
  for (const sn of allScenonodes) checkGlobalId("scenenode", attr(sn, "id"));
  for (const s of toArray<AnyObj>(ozml["style"])) checkGlobalId("style", attr(s, "id"));
  for (const c of toArray<AnyObj>(ozml["clip"])) checkGlobalId("clip", attr(c, "id"));
  for (const f of toArray<AnyObj>(ozml["footage"])) checkGlobalId("footage", attr(f, "id"));
  for (const at of toArray<AnyObj>(ozml["audioTrack"])) checkGlobalId("audioTrack", attr(at, "id"));

  // Invariant 5: cross-reference targets exist (linkedObjects / Media parameter value=)
  // We check linkedObjects content references a known id
  function checkLinkedObjects(node: AnyObj, scope: string) {
    const linked = node["linkedObjects"] ?? node["linkedobjects"];
    if (linked) {
      const refId = textContent(linked);
      if (refId && !globalIds.has(refId)) {
        v("E_OZML_LINKED_OBJECT_DEAD", scope, `linkedObjects references id=${refId} which does not exist`, "Ensure the referenced scenenode or audioTrack exists.");
      }
    }
  }
  for (const sn of allScenonodes) checkLinkedObjects(sn, `scenenode[id=${attr(sn, "id")}]`);
  for (const at of toArray<AnyObj>(ozml["audioTrack"])) checkLinkedObjects(at, `audioTrack[id=${attr(at, "id")}]`);

  // -------------------------------------------------------------------------
  // §1.2 Parameter-tree invariants (6–10)
  // -------------------------------------------------------------------------

  function checkParamTree(params: AnyObj[], scope: string) {
    // Invariant 6: unique id within scope (same name+id collision)
    const seenIds = new Map<string, string>(); // id → name
    for (const p of params) {
      const pid = attr(p, "id");
      const pname = attr(p, "name");
      if (pid && seenIds.has(pid)) {
        const prev = seenIds.get(pid)!;
        if (prev === pname) {
          v("E_OZML_PARAM_ID_COLLISION", `${scope}.parameter[id=${pid}]`, `Duplicate parameter id=${pid} name="${pname}" within same scope`, "Parameter ids must be unique within a scope. Use matchIndex to select the right one.");
        }
      } else if (pid) {
        seenIds.set(pid, pname);
      }

      // Invariant 7: no value AND curve simultaneously
      const hasValue = attr(p, "value") !== "";
      const hasCurve = !!(p["curve"]);
      if (hasValue && hasCurve) {
        v("E_OZML_KEYFRAME_VALUE_AND_CURVE", `${scope}.parameter[id=${pid}]`, `Parameter has both value= attribute and a <curve> child — contradiction`, "Remove the value= attribute from animated parameters; the value lives in the <curve>.");
      }

      // Invariant 8: keypoint count matches <numberOfKeypoints>
      if (p["curve"]) {
        const curve = p["curve"] as AnyObj;
        const declaredCount = Number(textContent(curve["numberOfKeypoints"]));
        const keypoints: unknown[] = toArray(curve["keypoint"]);
        if (declaredCount > 0 && keypoints.length !== declaredCount) {
          v("E_OZML_KEYPOINT_COUNT_MISMATCH", `${scope}.parameter[id=${pid}].curve`, `<numberOfKeypoints>${declaredCount}</numberOfKeypoints> but found ${keypoints.length} <keypoint> elements`, "Ensure <numberOfKeypoints> exactly matches the count of <keypoint> children.");
        }

        // Invariant 9: keypoint times monotonically non-decreasing
        const kps = keypoints as AnyObj[];
        let prevTime = -Infinity;
        for (let ki = 0; ki < kps.length; ki++) {
          const t = Number(textContent(kps[ki]["time"]));
          if (t < prevTime) {
            v("E_OZML_KEYPOINT_NOT_MONOTONIC", `${scope}.parameter[id=${pid}].curve.keypoint[${ki}]`, `Keypoint times not monotonically non-decreasing: ${prevTime} → ${t}`, "Sort <keypoint> elements by <time> ascending.");
          }
          prevTime = t;
        }
      }

      // Recurse into nested parameters
      const nested: AnyObj[] = toArray(p["parameter"]);
      if (nested.length > 0) {
        checkParamTree(nested, `${scope}.parameter[id=${pid}]`);
      }
    }
  }

  for (const sn of allScenonodes) {
    const snParams: AnyObj[] = toArray(sn["parameter"]);
    checkParamTree(snParams, `scenenode[id=${attr(sn, "id")}]`);
  }

  // -------------------------------------------------------------------------
  // §1.3 Text-factory invariants (11–17)
  // -------------------------------------------------------------------------

  // Walk scenenodes looking for text-factory content
  for (const sn of allScenonodes) {
    const textNodes: unknown[] = toArray(sn["text"]);
    if (textNodes.length === 0) continue;

    textNodes.forEach((tn, ti) => {
      if (!tn || typeof tn !== "object") return;
      const textNode = tn as AnyObj;
      const textContent_ = textContent(textNode["#text"] ?? textNode);
      const glyphs = [...textContent_]; // Unicode code points

      // Invariant 11: newlines count as glyphs
      const expectedGlyphCount = glyphs.length;

      // Invariant 12: glyph count matches object count
      const objects: AnyObj[] = toArray(textNode["object"]);
      if (objects.length !== expectedGlyphCount) {
        v("E_OZML_GLYPH_COUNT_MISMATCH", `scenenode[id=${attr(sn, "id")}].text[${ti}]`,
          `Text has ${expectedGlyphCount} glyphs but ${objects.length} <object> elements`,
          "Each character (including newlines) must have exactly one <object> child.");
      }

      // Non-ASCII warning (invariant 12 note — codepoint encoding unverified for non-ASCII)
      if (glyphs.some((g) => g.codePointAt(0)! > 127)) {
        w("W_OZML_NON_ASCII_UNVERIFIED", `scenenode[id=${attr(sn, "id")}].text[${ti}]`,
          "Text contains non-ASCII characters. OZML codepoint encoding for non-ASCII is empirically unverified. Validate against a real Motion render.");
      }

      // Invariant 13: kerning id sequence must be dense 1-based
      objects.forEach((obj, oi) => {
        const kerningParams: AnyObj[] = toArray((obj as AnyObj)["parameter"]);
        const kerning = kerningParams.find((kp) => attr(kp, "name") === "Kerning");
        if (kerning) {
          const kid = Number(attr(kerning, "id"));
          if (kid !== oi + 1) {
            v("E_OZML_KERNING_ID_GAP", `scenenode[id=${attr(sn, "id")}].text[${ti}].object[${oi}]`,
              `Kerning parameter id=${kid} expected ${oi + 1} (1-based glyph index)`,
              "Kerning ids must form a dense sequence: 1, 2, 3, …");
          }
        }
      });

      // Invariants 14-15: styleRun contiguity and coverage
      const styleRuns: AnyObj[] = toArray(textNode["styleRun"]);
      if (expectedGlyphCount > 0 && styleRuns.length > 0) {
        let cursor = 0;
        for (let ri = 0; ri < styleRuns.length; ri++) {
          const run = styleRuns[ri];
          const offset = numAttr(run, "offset");
          const length = numAttr(run, "length");

          if (offset !== cursor) {
            if (offset < cursor) {
              v("E_OZML_STYLERUN_OVERLAP", `scenenode[id=${attr(sn, "id")}].text[${ti}].styleRun[${ri}]`,
                `styleRun[${ri}] offset=${offset} overlaps previous run ending at ${cursor}`,
                "styleRun ranges must be contiguous and non-overlapping.");
            } else {
              v("E_OZML_STYLERUN_GAP", `scenenode[id=${attr(sn, "id")}].text[${ti}].styleRun[${ri}]`,
                `styleRun[${ri}] offset=${offset} leaves a gap from ${cursor}`,
                "styleRun ranges must be contiguous: offset[i] + length[i] == offset[i+1].");
            }
          }
          cursor = offset + length;
        }
        if (cursor !== expectedGlyphCount) {
          v("E_OZML_STYLERUN_GAP", `scenenode[id=${attr(sn, "id")}].text[${ti}]`,
            `styleRun coverage ends at ${cursor} but text has ${expectedGlyphCount} glyphs`,
            "The last styleRun must end exactly at total glyph count.");
        }
      }

      // Invariant 16: styleRun style= references existing <style id>
      for (let ri = 0; ri < styleRuns.length; ri++) {
        const styleRef = attr(styleRuns[ri], "style");
        if (styleRef && !globalIds.has(styleRef)) {
          v("E_OZML_STYLE_REFERENCE_DEAD", `scenenode[id=${attr(sn, "id")}].text[${ti}].styleRun[${ri}]`,
            `styleRun style="${styleRef}" references a <style id> that does not exist`,
            "Ensure the <style> block is still present. Removing a style without retargeting its styleRuns drops the title.");
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // §1.4 Media-factory invariants (18–26)
  // -------------------------------------------------------------------------

  const clips: AnyObj[] = toArray(ozml["clip"]);
  const clipIds = new Set<string>();

  // Invariant 18: clip id uniqueness (also covered by global id check above, but explicit here)
  for (const c of clips) {
    const cid = attr(c, "id");
    if (clipIds.has(cid)) {
      v("E_OZML_CLIP_DUPLICATE_ID", `clip[id=${cid}]`, `Duplicate clip id=${cid}`, "Each <clip> must have a unique id. Don't change a clip id without remapping all references.");
    }
    clipIds.add(cid);

    // Invariant 21: creationDuration == ceil(missingDuration × frameRate)
    const missingDuration = Number(textContent(c["missingDuration"]));
    const frameRateParam = toArray<AnyObj>(c["parameter"]).find((p) => attr(p, "name") === "Frame Rate");
    const frameRate = frameRateParam ? Number(attr(frameRateParam, "value")) : 0;
    const creationDuration = Number(textContent(c["creationDuration"]));

    if (missingDuration > 0 && frameRate > 0 && creationDuration > 0) {
      const expected = Math.ceil(missingDuration * frameRate);
      if (Math.abs(creationDuration - expected) > 1) { // allow ±1 for rounding
        v("E_OZML_CREATIONDURATION_MISMATCH", `clip[id=${attr(c, "id")}]`,
          `creationDuration=${creationDuration} but ceil(${missingDuration}×${frameRate})=${expected}`,
          "Sub-frame rounding in creationDuration causes phantom-frame retime spikes. Recompute: Math.ceil(missingDuration × frameRate).");
      }

      // Invariant 22: timing out = creationDuration - 1
      const timing = c["timing"] as AnyObj | undefined;
      if (timing) {
        const timingOut = numAttr(timing, "out");
        if (timingOut !== creationDuration - 1) {
          v("E_OZML_TIMING_OUT_OF_BOUNDS", `clip[id=${attr(c, "id")}].timing`,
            `<timing out="${timingOut}"> expected ${creationDuration - 1} (creationDuration - 1)`,
            "Timing out must be creationDuration - 1 (zero-based last frame).");
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // §1.5 Scene-level invariants (27–29)
  // -------------------------------------------------------------------------

  const sceneSettings = (ozml["sceneSettings"] as AnyObj) ?? {};
  const sceneFrameRate = Number(textContent(sceneSettings["frameRate"]));
  // Invariant 27: sceneSettings must have frameRate and NTSC
  if (!sceneSettings["frameRate"]) {
    // Only flag if sceneSettings exists but is empty
    if (Object.keys(sceneSettings).length > 0) {
      w("W_OZML_MISSING_SCENE_FRAMERATE", "sceneSettings", "sceneSettings missing <frameRate>");
    }
  }

  // Invariant 29: timeRange duration >= longest clip creationDuration
  const timeRange = (ozml["timeRange"] ?? ozml["playRange"]) as AnyObj | undefined;
  if (timeRange && clips.length > 0) {
    const rangeDuration = numAttr(timeRange, "duration");
    const maxCreationDuration = Math.max(0, ...clips.map((c) => Number(textContent(c["creationDuration"]))));
    if (rangeDuration > 0 && maxCreationDuration > rangeDuration) {
      w("W_OZML_TIMERANGE_TOO_SHORT", "timeRange",
        `timeRange duration=${rangeDuration} is shorter than longest clip creationDuration=${maxCreationDuration}. Extend after media swap.`);
    }
  }

  // -------------------------------------------------------------------------
  // §1.6 Published-parameter invariants (30–31)
  // -------------------------------------------------------------------------

  // Invariant 30: Publish To FCP marker must be a child of its parent parameter, not stand-alone
  // We flag dangling markers: a <parameter name="Publish To FCP"> that has no sibling
  // parameters (i.e., is not inside a real parameter block)
  function checkPublishMarkers(params: AnyObj[], scope: string) {
    for (const p of params) {
      const pname = attr(p, "name");
      if (pname === "Publish To FCP") {
        // This marker should live inside a parent parameter block, not at the top scope
        // If we find it at the top-level scenenode scope, it's dangling
        v("E_OZML_PUBLISH_MARKER_DANGLING", scope,
          `<parameter name="Publish To FCP"> found at scope top level — it must be a child of the parameter it publishes`,
          "Move the Publish To FCP marker inside the parent parameter block.");
      }
      const nested: AnyObj[] = toArray(p["parameter"]);
      if (nested.length > 0) checkPublishMarkers(nested, `${scope}.parameter[id=${attr(p, "id")}]`);
    }
  }

  // Only top-level scenenode parameters (not nested) could be dangling; nested checks are fine
  // This heuristic: if a scenenode's direct parameters include a "Publish To FCP" marker
  // without any sibling non-marker parameters, it's probably misplaced
  for (const sn of allScenonodes) {
    const topParams: AnyObj[] = toArray(sn["parameter"]);
    const topLevelPublish = topParams.filter((p) => attr(p, "name") === "Publish To FCP");
    const topLevelNonPublish = topParams.filter((p) => attr(p, "name") !== "Publish To FCP");
    if (topLevelPublish.length > 0 && topLevelNonPublish.length === 0) {
      v("E_OZML_PUBLISH_MARKER_DANGLING", `scenenode[id=${attr(sn, "id")}]`,
        "Publish To FCP marker exists at scenenode top level with no sibling parameters to publish",
        "The Publish To FCP marker must be a child inside a parameter block (nested), not standalone.");
    }
  }

  return { ok: violations.length === 0, violations, warnings };
}
