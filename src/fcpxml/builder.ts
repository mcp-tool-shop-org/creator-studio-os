import { pathToFileURL } from "node:url";
import { CreatorStudioError } from "../errors.js";
import {
  ProjectSpecSchema,
  type ProjectSpec,
  type TitleSpec,
  type TransitionSpec,
} from "./types.js";
import { frameDurationAttr, secondsToTime } from "./time.js";
import { runSafetyPreflights } from "../apps/fcp/safety.js";

function escapeXmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function srcToFileUrl(src: string): string {
  if (
    src.startsWith("file://") ||
    src.startsWith("http://") ||
    src.startsWith("https://")
  ) {
    return src;
  }
  return pathToFileURL(src).toString();
}

export interface BuildResult {
  xml: string;
  spec: ProjectSpec;
  preflight?: ReturnType<typeof runSafetyPreflights>;
}

export function buildProjectFcpxml(
  input: unknown,
  opts?: { allowUnsafe?: boolean; skipPreflight?: boolean },
): BuildResult {
  const parsed = ProjectSpecSchema.safeParse(input);
  if (!parsed.success) {
    throw new CreatorStudioError(
      "E_FCPXML_INVALID",
      `Project spec failed schema validation: ${parsed.error.message}`,
      "Inspect the spec — likely a missing field, wrong frameRate, or non-positive duration.",
    );
  }
  const spec = parsed.data;

  const preflight = opts?.skipPreflight
    ? undefined
    : runSafetyPreflights(spec, { allowUnsafe: opts?.allowUnsafe });

  const rate = spec.format.frameRate;

  const titles = spec.spine.filter(
    (s): s is TitleSpec => s.kind === "title",
  );
  const transitions = spec.spine.filter(
    (s): s is TransitionSpec => s.kind === "transition",
  );

  const sequenceEnd =
    spec.spine.length === 0
      ? 1
      : Math.max(
          1,
          ...spec.spine
            .filter((s) => s.kind === "asset-clip" || s.kind === "title")
            .map((s) => s.offsetSeconds + s.durationSeconds),
        );

  const sequenceDuration = secondsToTime(sequenceEnd, rate);

  const titleEffects = new Map<string, { id: string; name: string; uid: string }>();
  let nextEffectId = 100;
  for (const t of titles) {
    if (!titleEffects.has(t.effectUid)) {
      titleEffects.set(t.effectUid, {
        id: `r${nextEffectId++}`,
        name: t.effectName,
        uid: t.effectUid,
      });
    }
  }

  const formatXml = `    <format id="${escapeXmlAttr(spec.format.id)}" name="${escapeXmlAttr(spec.format.name)}" frameDuration="${frameDurationAttr(rate)}" width="${spec.format.resolution.width}" height="${spec.format.resolution.height}" colorSpace="${escapeXmlAttr(spec.format.colorSpace)}"/>`;

  const effectsXml = Array.from(titleEffects.values())
    .map(
      (e) =>
        `    <effect id="${escapeXmlAttr(e.id)}" name="${escapeXmlAttr(e.name)}" uid="${escapeXmlAttr(e.uid)}"/>`,
    )
    .join("\n");

  const assetsXml = spec.assets
    .map((a) => {
      const dur = secondsToTime(a.durationSeconds, rate);
      const url = escapeXmlAttr(srcToFileUrl(a.src));
      return `    <asset id="${escapeXmlAttr(a.id)}" name="${escapeXmlAttr(a.name)}" start="0s" duration="${dur}" hasVideo="${a.hasVideo ? "1" : "0"}" hasAudio="${a.hasAudio ? "1" : "0"}" format="${escapeXmlAttr(a.format)}" videoSources="${a.hasVideo ? "1" : "0"}" audioSources="${a.hasAudio ? "1" : "0"}" audioChannels="2" audioRate="48000">
      <media-rep kind="original-media" src="${url}"/>
    </asset>`;
    })
    .join("\n");

  const spineMarkersFor = (offsetSec: number, durSec: number) => {
    return spec.markers
      .filter(
        (m) =>
          m.startSeconds >= offsetSec &&
          m.startSeconds < offsetSec + durSec,
      )
      .map((m) => {
        const tag = m.isChapter ? "chapter-marker" : "marker";
        const localStart = secondsToTime(m.startSeconds - offsetSec, rate);
        const localDur = secondsToTime(m.durationSeconds, rate);
        const note = m.note ? ` note="${escapeXmlAttr(m.note)}"` : "";
        return `        <${tag} start="${localStart}" duration="${localDur}" value="${escapeXmlAttr(m.value)}"${note}/>`;
      })
      .join("\n");
  };

  const renderTitleBody = (
    t: TitleSpec,
    offsetAbs: number,
    indent: string,
  ) => {
    const effect = titleEffects.get(t.effectUid)!;
    const offset = secondsToTime(offsetAbs, rate);
    const dur = secondsToTime(t.durationSeconds, rate);
    const lane = t.lane !== 0 ? ` lane="${t.lane}"` : "";
    const styleId = `ts-${escapeXmlAttr(t.name).replace(/[^a-zA-Z0-9-]/g, "")}-${t.offsetSeconds}`;
    const paramsXml = (t.params ?? [])
      .map(
        (p) =>
          `${indent}  <param name="${escapeXmlAttr(p.name)}" key="${escapeXmlAttr(p.key)}" value="${escapeXmlAttr(p.value)}"/>`,
      )
      .join("\n");
    const paramBlock = paramsXml ? `\n${paramsXml}` : "";
    return `${indent}<title ref="${escapeXmlAttr(effect.id)}" name="${escapeXmlAttr(t.name)}" offset="${offset}" duration="${dur}"${lane} start="0s">${paramBlock}
${indent}  <text>
${indent}    <text-style ref="${escapeXmlAttr(styleId)}">${escapeXmlText(t.text)}</text-style>
${indent}  </text>
${indent}  <text-style-def id="${escapeXmlAttr(styleId)}">
${indent}    <text-style font="${escapeXmlAttr(t.textStyle.font)}" fontSize="${t.textStyle.fontSize}" fontColor="${escapeXmlAttr(t.textStyle.fontColor)}" alignment="${escapeXmlAttr(t.textStyle.alignment)}"${t.textStyle.bold ? ' bold="1"' : ""}${t.textStyle.italic ? ' italic="1"' : ""}/>
${indent}  </text-style-def>
${indent}</title>`;
  };

  const findAnchoredTitlesFor = (clipOff: number, clipDur: number): TitleSpec[] => {
    return titles.filter(
      (t) =>
        t.lane !== 0 &&
        t.offsetSeconds >= clipOff &&
        t.offsetSeconds < clipOff + clipDur,
    );
  };

  const renderClip = (
    c: Extract<(typeof spec.spine)[number], { kind: "asset-clip" }>,
  ) => {
    const offset = secondsToTime(c.offsetSeconds, rate);
    const dur = secondsToTime(c.durationSeconds, rate);
    const start = secondsToTime(c.startSeconds, rate);
    const markers = spineMarkersFor(c.offsetSeconds, c.durationSeconds);
    const enabled = c.enabled ? "" : ` enabled="0"`;
    const videoRole = c.videoRole
      ? ` videoRole="${escapeXmlAttr(c.videoRole)}"`
      : "";
    const audioRole = c.audioRole
      ? ` audioRole="${escapeXmlAttr(c.audioRole)}"`
      : "";

    const anchored = findAnchoredTitlesFor(c.offsetSeconds, c.durationSeconds);
    const titlesXml = anchored
      .map((t) => renderTitleBody(t, t.offsetSeconds - c.offsetSeconds, "        "))
      .join("\n");

    const innerParts: string[] = [];
    if (c.volumeDb !== 0) {
      innerParts.push(`        <adjust-volume amount="${c.volumeDb}dB"/>`);
    }
    if (titlesXml) innerParts.push(titlesXml);
    if (markers) innerParts.push(markers);
    const inner =
      innerParts.length > 0 ? `\n${innerParts.join("\n")}\n      ` : "";

    return `      <asset-clip ref="${escapeXmlAttr(c.ref)}" name="${escapeXmlAttr(c.name)}" offset="${offset}" duration="${dur}" start="${start}"${enabled}${videoRole}${audioRole}>${inner}</asset-clip>`;
  };

  const renderTransition = (t: TransitionSpec) => {
    const offset = secondsToTime(t.offsetSeconds, rate);
    const dur = secondsToTime(t.durationSeconds, rate);
    return `      <transition name="${escapeXmlAttr(t.name)}" offset="${offset}" duration="${dur}"/>`;
  };

  const anchoredTitleOffsets = new Set<number>();
  for (const item of spec.spine) {
    if (item.kind === "asset-clip") {
      for (const t of findAnchoredTitlesFor(
        item.offsetSeconds,
        item.durationSeconds,
      )) {
        anchoredTitleOffsets.add(t.offsetSeconds);
      }
    }
  }

  const spineItems = spec.spine
    .filter((item) => {
      if (item.kind !== "title") return true;
      if (item.lane === 0) return true;
      return !anchoredTitleOffsets.has(item.offsetSeconds);
    })
    .map((item) => {
      if (item.kind === "asset-clip") return renderClip(item);
      if (item.kind === "title")
        return renderTitleBody(item, item.offsetSeconds, "      ");
      if (item.kind === "transition") return renderTransition(item);
      throw new CreatorStudioError(
        "E_FCPXML_INVALID",
        `Unknown spine item kind: ${(item as { kind: string }).kind}`,
      );
    });

  const spineXml = spineItems.join("\n");

  const resourcesXml = [formatXml, effectsXml, assetsXml]
    .filter((s) => s.length > 0)
    .join("\n");

  const libraryAttr = spec.libraryLocation
    ? ` location="${escapeXmlAttr(srcToFileUrl(spec.libraryLocation))}"`
    : "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="${spec.fcpxmlVersion}">
  <resources>
${resourcesXml}
  </resources>
  <library${libraryAttr}>
    <event name="${escapeXmlAttr(spec.eventName)}">
      <project name="${escapeXmlAttr(spec.projectName)}">
        <sequence format="${escapeXmlAttr(spec.format.id)}" duration="${sequenceDuration}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
${spineXml}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;

  return { xml, spec, preflight };
}
