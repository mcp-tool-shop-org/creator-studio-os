import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { CreatorStudioError } from "@creator-studio-os/core";

export interface ValidateResult {
  valid: boolean;
  output: string;
  validatorPath: string;
}

async function which(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const p = spawn("which", [cmd], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("close", (code) => resolve(code === 0 ? out.trim() : null));
    p.on("error", () => resolve(null));
  });
}

export async function validateFcpxmlAgainstDtd(
  xml: string,
  dtdPath: string,
): Promise<ValidateResult> {
  try {
    await access(dtdPath);
  } catch {
    throw new CreatorStudioError(
      "E_FCP_DTD_MISSING",
      `FCPXML DTD not found at ${dtdPath}`,
      "Install Final Cut Pro (Creator Studio), or override with CREATOR_STUDIO_FCP_DTD.",
    );
  }

  const xmllint = await which("xmllint");
  if (!xmllint) {
    return {
      valid: true,
      output: "xmllint not installed; skipped DTD validation",
      validatorPath: "",
    };
  }

  const dir = await mkdtemp(join(tmpdir(), "csos-validate-"));
  const dtdName = basename(dtdPath);
  const localDtd = join(dir, dtdName);
  const xmlFile = join(dir, "doc.fcpxml");

  try {
    await writeFile(localDtd, await (await import("node:fs/promises")).readFile(dtdPath));
    const inlined = xml.replace(
      /<!DOCTYPE fcpxml>/,
      `<!DOCTYPE fcpxml SYSTEM "${dtdName}">`,
    );
    await writeFile(xmlFile, inlined);

    return await new Promise<ValidateResult>((resolve) => {
      const p = spawn(xmllint, ["--noout", "--valid", xmlFile], {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: dir,
      });
      let stderr = "";
      p.stderr.on("data", (d) => (stderr += d.toString()));
      p.on("close", (code) => {
        resolve({
          valid: code === 0,
          output: stderr.trim() || "ok",
          validatorPath: xmllint,
        });
      });
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export { dirname };
