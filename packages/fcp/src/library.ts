import { runAppleScript, escapeAppleScriptString } from "@creator-studio-os/core";

const FCP = `application id "com.apple.FinalCutApp"`;

function splitLines(out: string): string[] {
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function listLibraries(): Promise<{ name: string }[]> {
  const script = `tell ${FCP}
  set out to ""
  repeat with lib in libraries
    set out to out & (name of lib) & linefeed
  end repeat
  return out
end tell`;
  const raw = await runAppleScript(script);
  return splitLines(raw).map((name) => ({ name }));
}

export async function listEvents(
  libraryName: string,
): Promise<{ name: string }[]> {
  const lib = escapeAppleScriptString(libraryName);
  const script = `tell ${FCP}
  set out to ""
  repeat with ev in events of library "${lib}"
    set out to out & (name of ev) & linefeed
  end repeat
  return out
end tell`;
  const raw = await runAppleScript(script);
  return splitLines(raw).map((name) => ({ name }));
}

export async function listProjects(
  libraryName: string,
  eventName: string,
): Promise<{ name: string }[]> {
  const lib = escapeAppleScriptString(libraryName);
  const ev = escapeAppleScriptString(eventName);
  const script = `tell ${FCP}
  set out to ""
  repeat with pr in projects of event "${ev}" of library "${lib}"
    set out to out & (name of pr) & linefeed
  end repeat
  return out
end tell`;
  const raw = await runAppleScript(script);
  return splitLines(raw).map((name) => ({ name }));
}

export interface SequenceMetadata {
  projectName: string;
  durationSeconds: number;
  frameDurationSeconds: number;
  timecodeFormat: string;
}

export async function readProjectMetadata(
  libraryName: string,
  eventName: string,
  projectName: string,
): Promise<SequenceMetadata> {
  const lib = escapeAppleScriptString(libraryName);
  const ev = escapeAppleScriptString(eventName);
  const pr = escapeAppleScriptString(projectName);
  const script = `tell ${FCP}
  set seq to sequence of project "${pr}" of event "${ev}" of library "${lib}"
  set d to duration of seq
  set fd to frame duration of seq
  set tcf to timecode format of seq as text
  set dVal to (value of d as real)
  set dScale to (timescale of d as integer)
  set fdVal to (value of fd as real)
  set fdScale to (timescale of fd as integer)
  return (dVal as text) & "|" & (dScale as text) & "|" & (fdVal as text) & "|" & (fdScale as text) & "|" & tcf
end tell`;
  const raw = await runAppleScript(script);
  const [dv, ds, fv, fs, tcf] = raw.split("|").map((s) => s.trim());

  const durationSeconds = Number(dv) / Number(ds);
  const frameDurationSeconds = Number(fv) / Number(fs);

  return {
    projectName,
    durationSeconds,
    frameDurationSeconds,
    timecodeFormat: tcf || "unspecified",
  };
}
