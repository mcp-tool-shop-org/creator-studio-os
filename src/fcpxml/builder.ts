import { pathToFileURL } from "node:url";
import { CreatorStudioError } from "../errors.js";
import {
  ProjectSpecSchema,
  type ProjectSpec,
  type TitleSpec,
  type TransitionSpec,
  type CaptionSpec,
  type RefClipSpec,
  type MulticamClipSpec,
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
            .filter(
              (s) =>
                s.kind === "asset-clip" ||
                s.kind === "title" ||
                s.kind === "caption" ||
                s.kind === "ref-clip" ||
                s.kind === "mc-clip",
            )
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

  type PrimaryClipSpec = Extract<(typeof spec.spine)[number], { kind: "asset-clip" }>;

  const findAnchoredTitlesFor = (clipOff: number, clipDur: number): TitleSpec[] => {
    return titles.filter(
      (t) =>
        t.lane !== 0 &&
        t.offsetSeconds >= clipOff &&
        t.offsetSeconds < clipOff + clipDur,
    );
  };

  // Anchored asset-clips: lane != 0, time overlaps with the primary clip they attach to
  const findAnchoredClipsFor = (clipOff: number, clipDur: number): PrimaryClipSpec[] => {
    return spec.spine
      .filter(
        (s): s is PrimaryClipSpec =>
          s.kind === "asset-clip" &&
          (s.lane ?? 0) !== 0 &&
          s.offsetSeconds >= clipOff &&
          s.offsetSeconds < clipOff + clipDur,
      );
  };

  const renderClip = (c: PrimaryClipSpec) => {
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

    const anchoredTitles = findAnchoredTitlesFor(c.offsetSeconds, c.durationSeconds);
    const titlesXml = anchoredTitles
      .map((t) => renderTitleBody(t, t.offsetSeconds - c.offsetSeconds, "        "))
      .join("\n");

    // Anchored asset-clips (B-roll overlay at non-zero lane)
    const anchoredClips = findAnchoredClipsFor(c.offsetSeconds, c.durationSeconds);
    const anchoredClipsXml = anchoredClips
      .map((ac) => {
        const acOffset = secondsToTime(ac.offsetSeconds - c.offsetSeconds, rate);
        const acDur = secondsToTime(ac.durationSeconds, rate);
        const acStart = secondsToTime(ac.startSeconds, rate);
        const acLane = ` lane="${ac.lane}"`;
        const acVideoRole = ac.videoRole
          ? ` videoRole="${escapeXmlAttr(ac.videoRole)}"`
          : "";
        const acAudioRole = ac.audioRole
          ? ` audioRole="${escapeXmlAttr(ac.audioRole)}"`
          : "";
        return `        <asset-clip ref="${escapeXmlAttr(ac.ref)}" name="${escapeXmlAttr(ac.name)}" offset="${acOffset}" duration="${acDur}" start="${acStart}"${acLane}${acVideoRole}${acAudioRole}/>`;
      })
      .join("\n");

    const innerParts: string[] = [];
    if (c.volumeDb !== 0) {
      innerParts.push(`        <adjust-volume amount="${c.volumeDb}dB"/>`);
    }
    if (titlesXml) innerParts.push(titlesXml);
    if (anchoredClipsXml) innerParts.push(anchoredClipsXml);
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

  const renderCaption = (c: CaptionSpec) => {
    const offset = secondsToTime(c.offsetSeconds, rate);
    const dur = secondsToTime(c.durationSeconds, rate);
    const lane = c.lane !== 0 ? ` lane="${c.lane}"` : "";
    return `      <caption name="${escapeXmlAttr(c.name)}" offset="${offset}" duration="${dur}"${lane} role="${escapeXmlAttr(c.role)}">
        <text>${escapeXmlText(c.text)}</text>
      </caption>`;
  };

  const renderRefClip = (r: RefClipSpec) => {
    const offset = secondsToTime(r.offsetSeconds, rate);
    const dur = secondsToTime(r.durationSeconds, rate);
    const lane = r.lane !== 0 ? ` lane="${r.lane}"` : "";
    return `      <ref-clip ref="${escapeXmlAttr(r.mediaId)}" name="${escapeXmlAttr(r.name)}" offset="${offset}" duration="${dur}"${lane}/>`;
  };

  const renderMcClip = (m: MulticamClipSpec) => {
    const offset = secondsToTime(m.offsetSeconds, rate);
    const dur = secondsToTime(m.durationSeconds, rate);
    const lane = m.lane !== 0 ? ` lane="${m.lane}"` : "";
    const srcEnable = m.sources.length > 0 ? "" : ' srcEnable="all"';
    const sourcesXml = m.sources
      .map(
        (s) =>
          `        <mc-source angleID="${escapeXmlAttr(s.angleId)}" srcEnable="${s.srcEnable}"/>`,
      )
      .join("\n");
    const inner = sourcesXml ? `\n${sourcesXml}\n      ` : "";
    return `      <mc-clip ref="${escapeXmlAttr(m.mediaId)}" name="${escapeXmlAttr(m.name)}" offset="${offset}" duration="${dur}"${lane}${srcEnable}>${inner}</mc-clip>`;
  };

  // Collect which title offsets are anchored (i.e., children of a primary clip)
  const anchoredTitleOffsets = new Set<number>();
  for (const item of spec.spine) {
    if (item.kind === "asset-clip" && (item.lane ?? 0) === 0) {
      for (const t of findAnchoredTitlesFor(
        item.offsetSeconds,
        item.durationSeconds,
      )) {
        anchoredTitleOffsets.add(t.offsetSeconds);
      }
    }
  }

  // Collect which anchored-clip offsets are already rendered as children of primary clips
  const anchoredClipOffsets = new Set<number>();
  for (const item of spec.spine) {
    if (item.kind === "asset-clip" && (item.lane ?? 0) === 0) {
      for (const ac of findAnchoredClipsFor(item.offsetSeconds, item.durationSeconds)) {
        anchoredClipOffsets.add(ac.offsetSeconds);
      }
    }
  }

  const spineItems = spec.spine
    .filter((item) => {
      // Skip anchored titles (rendered as children of their parent clip)
      if (item.kind === "title" && item.lane !== 0) {
        return !anchoredTitleOffsets.has(item.offsetSeconds);
      }
      // Skip anchored asset-clips (rendered as children of their parent clip)
      if (item.kind === "asset-clip" && (item.lane ?? 0) !== 0) {
        return !anchoredClipOffsets.has(item.offsetSeconds);
      }
      return true;
    })
    .map((item) => {
      if (item.kind === "asset-clip") return renderClip(item);
      if (item.kind === "title")
        return renderTitleBody(item, item.offsetSeconds, "      ");
      if (item.kind === "transition") return renderTransition(item);
      if (item.kind === "caption") return renderCaption(item);
      if (item.kind === "ref-clip") return renderRefClip(item);
      if (item.kind === "mc-clip") return renderMcClip(item);
      throw new CreatorStudioError(
        "E_FCPXML_INVALID",
        `Unknown spine item kind: ${(item as { kind: string }).kind}`,
      );
    });

  const spineXml = spineItems.join("\n");

  // ── Compound media resources ─────────────────────────────────────────────
  const compoundMediaXml = (spec.compoundMedia ?? [])
    .map((cm) => {
      const innerClips = cm.clips
        .map((c) => {
          const cOff = secondsToTime(c.offsetSeconds, rate);
          const cDur = secondsToTime(c.durationSeconds, rate);
          const cStart = secondsToTime(c.startSeconds, rate);
          return `        <asset-clip ref="${escapeXmlAttr(c.ref)}" name="${escapeXmlAttr(c.name)}" offset="${cOff}" duration="${cDur}" start="${cStart}"/>`;
        })
        .join("\n");
      const sequenceDur = cm.clips.length > 0
        ? secondsToTime(
            Math.max(...cm.clips.map((c) => c.offsetSeconds + c.durationSeconds)),
            rate,
          )
        : "0s";
      return `    <media id="${escapeXmlAttr(cm.id)}" name="${escapeXmlAttr(cm.name)}">
      <sequence format="${escapeXmlAttr(spec.format.id)}" duration="${sequenceDur}" tcStart="0s" tcFormat="NDF">
        <spine>
${innerClips}
        </spine>
      </sequence>
    </media>`;
    })
    .join("\n");

  // ── Multicam media resources ─────────────────────────────────────────────
  const multicamMediaXml = (spec.multicamMedia ?? [])
    .map((mm) => {
      const anglesXml = mm.angles
        .map((angle) => {
          const angleClips = angle.clips
            .map((c) => {
              const cOff = secondsToTime(c.offsetSeconds, rate);
              const cDur = secondsToTime(c.durationSeconds, rate);
              const cStart = secondsToTime(c.startSeconds, rate);
              return `          <asset-clip ref="${escapeXmlAttr(c.ref)}" name="${escapeXmlAttr(c.name)}" offset="${cOff}" duration="${cDur}" start="${cStart}"/>`;
            })
            .join("\n");
          return `        <mc-angle name="${escapeXmlAttr(angle.name)}" angleID="${escapeXmlAttr(angle.angleId)}">
${angleClips}
        </mc-angle>`;
        })
        .join("\n");
      return `    <media id="${escapeXmlAttr(mm.id)}" name="${escapeXmlAttr(mm.name)}">
      <multicam format="${escapeXmlAttr(spec.format.id)}" tcStart="0s" tcFormat="NDF" renderColorSpace="${escapeXmlAttr(spec.format.colorSpace)}">
${anglesXml}
      </multicam>
    </media>`;
    })
    .join("\n");

  const resourcesXml = [formatXml, effectsXml, assetsXml, compoundMediaXml, multicamMediaXml]
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
