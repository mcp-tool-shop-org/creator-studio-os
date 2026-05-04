import { readFile, writeFile, copyFile, access, mkdir } from "node:fs/promises";
import { dirname, basename } from "node:path";
import { CreatorStudioError } from "../../errors.js";

export interface OzmlParameter {
  name: string;
  id: string;
  flags?: string;
  defaultValue?: string;
  value?: string;
  hasChildren: boolean;
  rawAttrs: string;
}

export interface OzmlInspect {
  path: string;
  ozmlVersion: string;
  byteSize: number;
  parameterCount: number;
  parameters: OzmlParameter[];
  factories: { id: string; uuid: string; description: string }[];
}

const PARAMETER_OPEN_RE =
  /<parameter\b([^>]*?)(\/>|>(?=\s*<parameter)|>(?=\s*<\/parameter))/g;
const PARAMETER_ANY_RE = /<parameter\b([^>]*?)(\/?)>/g;
const ATTR_RE = /(\w+)="([^"]*)"/g;

function parseAttrs(attrString: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(attrString)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

function parseFactories(xml: string): OzmlInspect["factories"] {
  const re =
    /<factory\s+id="([^"]+)"\s+uuid="([^"]+)"[^>]*>\s*<description>([^<]+)<\/description>/g;
  const out: OzmlInspect["factories"] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push({ id: m[1], uuid: m[2], description: m[3] });
  }
  return out;
}

export async function inspectTemplate(path: string): Promise<OzmlInspect> {
  await ensureFileExists(path);
  const xml = await readFile(path, "utf-8");
  const sizeMatch = xml.match(/<ozml\s+version="([^"]+)"/);
  if (!sizeMatch) {
    throw new CreatorStudioError(
      "E_OZML_INVALID",
      `Not an OZML file: ${path}`,
      "Expected <ozml version=\"...\"> root element. Is the file a valid Motion .motn or .moti?",
    );
  }
  const ozmlVersion = sizeMatch[1];
  const byteSize = Buffer.byteLength(xml, "utf-8");

  const parameters: OzmlParameter[] = [];
  PARAMETER_ANY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PARAMETER_ANY_RE.exec(xml)) !== null) {
    const attrs = parseAttrs(m[1]);
    if (!attrs.name || !attrs.id) continue;
    const selfClosing = m[2] === "/";
    parameters.push({
      name: attrs.name,
      id: attrs.id,
      flags: attrs.flags,
      defaultValue: attrs.default,
      value: attrs.value,
      hasChildren: !selfClosing,
      rawAttrs: m[1].trim(),
    });
  }

  return {
    path,
    ozmlVersion,
    byteSize,
    parameterCount: parameters.length,
    parameters,
    factories: parseFactories(xml),
  };
}

export interface SetParamOptions {
  outputPath?: string;
  matchIndex?: number;
}

export interface SetParamResult {
  inputPath: string;
  outputPath: string;
  parameter: { name: string; id: string };
  oldValue: string | undefined;
  newValue: string;
  matchedAt: number;
}

export async function setParam(
  path: string,
  name: string,
  id: string,
  newValue: string,
  opts: SetParamOptions = {},
): Promise<SetParamResult> {
  await ensureFileExists(path);
  const xml = await readFile(path, "utf-8");
  const matches: { start: number; end: number; attrs: string }[] = [];

  PARAMETER_ANY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PARAMETER_ANY_RE.exec(xml)) !== null) {
    const attrs = parseAttrs(m[1]);
    if (attrs.name === name && attrs.id === id) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        attrs: m[1],
      });
    }
  }

  if (matches.length === 0) {
    throw new CreatorStudioError(
      "E_OZML_PARAM_NOT_FOUND",
      `No <parameter name="${name}" id="${id}"> found in ${path}`,
      "Use motion_template_inspect to list all parameters and find the right name/id pair.",
    );
  }

  const idx = opts.matchIndex ?? 0;
  if (idx < 0 || idx >= matches.length) {
    throw new CreatorStudioError(
      "E_OZML_PARAM_NOT_FOUND",
      `matchIndex ${idx} out of range — found ${matches.length} parameters with name="${name}" id="${id}"`,
      `Pass matchIndex 0..${matches.length - 1} to disambiguate.`,
    );
  }

  const target = matches[idx];
  const oldAttrs = parseAttrs(target.attrs);
  const oldValue = oldAttrs.value;

  const newAttrs = rewriteValueAttr(target.attrs, newValue);
  const before = xml.slice(0, target.start);
  const after = xml.slice(target.end);
  const tail = xml.charAt(target.end - 2) === "/" ? "/>" : ">";
  const head = `<parameter${newAttrs}${tail}`;
  const newXml = before + head + after;

  const outputPath = opts.outputPath ?? path;
  if (outputPath !== path) {
    await mkdir(dirname(outputPath), { recursive: true });
  }
  await writeFile(outputPath, newXml, "utf-8");

  return {
    inputPath: path,
    outputPath,
    parameter: { name, id },
    oldValue,
    newValue,
    matchedAt: idx,
  };
}

function rewriteValueAttr(attrString: string, newValue: string): string {
  const escaped = newValue
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
  if (/\bvalue="[^"]*"/.test(attrString)) {
    return attrString.replace(/\bvalue="[^"]*"/, `value="${escaped}"`);
  }
  return `${attrString.trimEnd()} value="${escaped}"`;
}

export async function cloneTemplate(
  src: string,
  dst: string,
): Promise<{ src: string; dst: string; bytes: number }> {
  await ensureFileExists(src);
  await mkdir(dirname(dst), { recursive: true });
  await copyFile(src, dst);
  const xml = await readFile(dst, "utf-8");
  return { src, dst, bytes: Buffer.byteLength(xml, "utf-8") };
}

async function ensureFileExists(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new CreatorStudioError(
      "E_OZML_FILE_MISSING",
      `Motion template file not found: ${path}`,
    );
  }
}
