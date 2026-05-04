import { pathToFileURL } from "node:url";
import { CreatorStudioError } from "../errors.js";
import { ProjectSpecSchema, type ProjectSpec } from "./types.js";
import { frameDurationAttr, secondsToTime } from "./time.js";

function escapeXmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function srcToFileUrl(src: string): string {
  if (src.startsWith("file://") || src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  return pathToFileURL(src).toString();
}

export interface BuildResult {
  xml: string;
  spec: ProjectSpec;
}

export function buildProjectFcpxml(input: unknown): BuildResult {
  const parsed = ProjectSpecSchema.safeParse(input);
  if (!parsed.success) {
    throw new CreatorStudioError(
      "E_FCPXML_INVALID",
      `Project spec failed schema validation: ${parsed.error.message}`,
      "Inspect the spec — likely a missing field, wrong frameRate, or non-positive duration.",
    );
  }
  const spec = parsed.data;
  const rate = spec.format.frameRate;

  const titleSpine = spec.spine.find((s) => s.kind === "title");
  if (titleSpine) {
    throw new CreatorStudioError(
      "E_FCPXML_INVALID",
      "Title spine items are not supported in v1.0.0",
      "Cut the title item or wait for v1.1 (titles require an effect reference).",
    );
  }

  const totalDurationSeconds =
    spec.spine.length === 0
      ? 1
      : Math.max(
          ...spec.spine
            .filter((s) => s.kind === "asset-clip")
            .map((s) => s.offsetSeconds + s.durationSeconds),
        );

  const sequenceDuration = secondsToTime(totalDurationSeconds, rate);

  const formatXml = `    <format id="${escapeXmlAttr(spec.format.id)}" name="${escapeXmlAttr(spec.format.name)}" frameDuration="${frameDurationAttr(rate)}" width="${spec.format.resolution.width}" height="${spec.format.resolution.height}" colorSpace="${escapeXmlAttr(spec.format.colorSpace)}"/>`;

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

  const spineXml = spec.spine
    .filter((s) => s.kind === "asset-clip")
    .map((c) => {
      const offset = secondsToTime(c.offsetSeconds, rate);
      const dur = secondsToTime(c.durationSeconds, rate);
      const start = secondsToTime(c.startSeconds, rate);
      const markers = spineMarkersFor(c.offsetSeconds, c.durationSeconds);
      const enabled = c.enabled ? "" : ` enabled="0"`;
      const inner = markers ? `\n${markers}\n      ` : "";
      return `      <asset-clip ref="${escapeXmlAttr(c.ref)}" name="${escapeXmlAttr(c.name)}" offset="${offset}" duration="${dur}" start="${start}"${enabled}>${inner}</asset-clip>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.13">
  <resources>
${formatXml}${assetsXml ? "\n" + assetsXml : ""}
  </resources>
  <library>
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

  return { xml, spec };
}
