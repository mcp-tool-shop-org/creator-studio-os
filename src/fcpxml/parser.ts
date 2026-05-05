/**
 * Minimal FCPXML parser — extracts just enough structure to drive round-trip diffing.
 * Not a full FCPXML spec implementation; targets the subset our builder produces.
 */
import { XMLParser } from "fast-xml-parser";
import { CreatorStudioError } from "../errors.js";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ParsedParam {
  name: string;
  key: string;
  value: string;
}

export interface ParsedTitle {
  kind: "title";
  name: string;
  ref: string;
  offsetSeconds: number;
  durationSeconds: number;
  lane: number;
  text: string;
  params: ParsedParam[];
}

export interface ParsedClip {
  kind: "clip";
  name: string;
  ref: string;
  offsetSeconds: number;
  durationSeconds: number;
  startSeconds: number;
  videoRole?: string;
  audioRole?: string;
  volumeDb?: number;
  connectedTitles: ParsedTitle[];
}

export interface ParsedTransition {
  kind: "transition";
  name: string;
  offsetSeconds: number;
  durationSeconds: number;
}

export type ParsedSpineItem = ParsedClip | ParsedTitle | ParsedTransition;

export interface ParsedFormat {
  id: string;
  name: string;
  frameDuration: string;
  width: number;
  height: number;
  colorSpace: string;
}

export interface ParsedAsset {
  id: string;
  name: string;
  src: string;
  durationSeconds: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface ParsedEffect {
  id: string;
  name: string;
  uid: string;
}

export interface ParsedTimeline {
  version: string;
  eventName: string;
  projectName: string;
  format: ParsedFormat;
  assets: ParsedAsset[];
  effects: ParsedEffect[];
  spine: ParsedSpineItem[];
}

// ─── Time parsing ──────────────────────────────────────────────────────────────

export function parseFcpTime(t: string): number {
  if (!t || t === "0s") return 0;
  const rational = t.match(/^(\d+)\/(\d+)s$/);
  if (rational) return parseInt(rational[1]) / parseInt(rational[2]);
  const decimal = t.match(/^([\d.]+)s$/);
  if (decimal) return parseFloat(decimal[1]);
  return 0;
}

// ─── XMLParser setup ──────────────────────────────────────────────────────────

const ARRAY_ELEMENTS = new Set([
  "format", "effect", "asset", "asset-clip", "title", "transition",
  "param", "marker", "chapter-marker", "text-style", "text-style-def",
  "adjust-volume",
]);

function makeParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    parseTagValue: true,
    textNodeName: "#text",
    isArray: (name) => ARRAY_ELEMENTS.has(name),
  });
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

function attr(node: Record<string, string>, key: string): string {
  return node[`@_${key}`] ?? "";
}

function parseParams(node: Record<string, unknown>): ParsedParam[] {
  const raw = (node["param"] ?? []) as Record<string, string>[];
  return raw.map((p) => ({
    name: attr(p, "name"),
    key: attr(p, "key"),
    value: attr(p, "value"),
  }));
}

function extractTextFromTitle(node: Record<string, unknown>): string {
  const textBlock = (node["text"] as Record<string, unknown> | undefined) ?? {};
  const styles = (textBlock["text-style"] ?? []) as (Record<string, unknown>)[];
  if (styles.length === 0) return "";
  const first = styles[0];
  return String(first["#text"] ?? "");
}

function parseTitleNode(node: Record<string, unknown>, baseOffset = 0): ParsedTitle {
  const n = node as Record<string, string>;
  return {
    kind: "title",
    name: attr(n, "name"),
    ref: attr(n, "ref"),
    offsetSeconds: parseFcpTime(attr(n, "offset")) + baseOffset,
    durationSeconds: parseFcpTime(attr(n, "duration")),
    lane: parseInt(attr(n, "lane") || "0") || 0,
    text: extractTextFromTitle(node),
    params: parseParams(node),
  };
}

function parseClipNode(node: Record<string, unknown>): ParsedClip {
  const n = node as Record<string, string>;
  const clipOffset = parseFcpTime(attr(n, "offset"));
  const volumes = (node["adjust-volume"] ?? []) as Record<string, string>[];
  let volumeDb: number | undefined;
  if (volumes.length > 0) {
    const amt = attr(volumes[0], "amount");
    volumeDb = parseFloat(amt.replace("dB", ""));
  }

  const connectedTitles: ParsedTitle[] = ((node["title"] ?? []) as Record<string, unknown>[]).map(
    (t) => parseTitleNode(t, clipOffset),
  );

  return {
    kind: "clip",
    name: attr(n, "name"),
    ref: attr(n, "ref"),
    offsetSeconds: clipOffset,
    durationSeconds: parseFcpTime(attr(n, "duration")),
    startSeconds: parseFcpTime(attr(n, "start")),
    videoRole: attr(n, "videoRole") || undefined,
    audioRole: attr(n, "audioRole") || undefined,
    volumeDb,
    connectedTitles,
  };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseFcpxml(xml: string): ParsedTimeline {
  const parser = makeParser();
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch (e) {
    throw new CreatorStudioError(
      "E_FCPXML_PARSE_FAILED",
      `Failed to parse FCPXML: ${e instanceof Error ? e.message : String(e)}`,
      "Ensure the file is valid XML.",
    );
  }

  const root = doc["fcpxml"] as Record<string, unknown> | undefined;
  if (!root) {
    throw new CreatorStudioError(
      "E_FCPXML_PARSE_FAILED",
      "No <fcpxml> root element found",
      "Expected a valid FCPXML document with a <fcpxml version=...> root.",
    );
  }

  const version = attr(root as Record<string, string>, "version");

  // Resources
  const resources = (root["resources"] ?? {}) as Record<string, unknown>;
  const formatNodes = (resources["format"] ?? []) as Record<string, string>[];
  const assetNodes = (resources["asset"] ?? []) as Record<string, string>[];
  const effectNodes = (resources["effect"] ?? []) as Record<string, string>[];

  const format: ParsedFormat =
    formatNodes.length > 0
      ? {
          id: attr(formatNodes[0], "id"),
          name: attr(formatNodes[0], "name"),
          frameDuration: attr(formatNodes[0], "frameDuration"),
          width: parseInt(attr(formatNodes[0], "width")) || 0,
          height: parseInt(attr(formatNodes[0], "height")) || 0,
          colorSpace: attr(formatNodes[0], "colorSpace"),
        }
      : { id: "", name: "", frameDuration: "", width: 0, height: 0, colorSpace: "" };

  const assets: ParsedAsset[] = assetNodes.map((a) => ({
    id: attr(a, "id"),
    name: attr(a, "name"),
    src: attr(a, "src"),
    durationSeconds: parseFcpTime(attr(a, "duration")),
    hasVideo: attr(a, "hasVideo") === "1",
    hasAudio: attr(a, "hasAudio") === "1",
  }));

  const effects: ParsedEffect[] = effectNodes.map((e) => ({
    id: attr(e, "id"),
    name: attr(e, "name"),
    uid: attr(e, "uid"),
  }));

  // Navigate: library > event > project > sequence > spine
  const library = (root["library"] ?? {}) as Record<string, unknown>;
  const event = (library["event"] ?? {}) as Record<string, unknown>;
  const eventName = attr(event as Record<string, string>, "name");

  const project = (event["project"] ?? {}) as Record<string, unknown>;
  const projectName = attr(project as Record<string, string>, "name");

  const sequence = (project["sequence"] ?? {}) as Record<string, unknown>;
  const spine = (sequence["spine"] ?? {}) as Record<string, unknown>;

  const clips = ((spine["asset-clip"] ?? []) as Record<string, unknown>[]).map(parseClipNode);
  const standaloneTitles = ((spine["title"] ?? []) as Record<string, unknown>[]).map((t) =>
    parseTitleNode(t),
  );
  const transitions = ((spine["transition"] ?? []) as Record<string, string>[]).map((t) => ({
    kind: "transition" as const,
    name: attr(t, "name"),
    offsetSeconds: parseFcpTime(attr(t, "offset")),
    durationSeconds: parseFcpTime(attr(t, "duration")),
  }));

  // Merge all spine items sorted by offset
  const allItems: ParsedSpineItem[] = [...clips, ...standaloneTitles, ...transitions].sort(
    (a, b) => a.offsetSeconds - b.offsetSeconds,
  );

  return { version, eventName, projectName, format, assets, effects, spine: allItems };
}
