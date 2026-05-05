import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderViaCompressor } from "../src/apps/motion/render.js";
import { CreatorStudioError } from "../src/errors.js";

let tmp: string;
let origBin: string | undefined;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-render-test-"));
  origBin = process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
});

afterEach(async () => {
  if (origBin === undefined) delete process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
  else process.env.CREATOR_STUDIO_COMPRESSOR_BIN = origBin;
  await rm(tmp, { recursive: true, force: true });
});

describe("renderViaCompressor", () => {
  it("throws E_OZML_FILE_MISSING when .motn does not exist", async () => {
    const fakeBin = join(tmp, "Compressor");
    await writeFile(fakeBin, "#!/bin/sh\nexit 0", "utf-8");
    await chmod(fakeBin, 0o755);
    process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;

    await expect(
      renderViaCompressor({
        motnPath: join(tmp, "missing.motn"),
        settingPath: join(tmp, "setting.compressorsetting"),
        locationPath: join(tmp, "out.mov"),
      }),
    ).rejects.toMatchObject({ code: "E_OZML_FILE_MISSING" } satisfies Partial<CreatorStudioError>);
  });

  it("passes -jobpath to Compressor with the .motn path", async () => {
    const logFile = join(tmp, "args.txt");
    const fakeBin = join(tmp, "Compressor");
    await writeFile(
      fakeBin,
      `#!/bin/sh\necho "$@" > "${logFile}"\necho "<jobID A1B2C3D4-0000-0000-0000-111111111111/>"\necho "<batchID A1B2C3D4-0000-0000-0000-222222222222/>"`,
      "utf-8",
    );
    await chmod(fakeBin, 0o755);
    process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;

    const motnPath = join(tmp, "my-title.motn");
    const settingPath = join(tmp, "hd.compressorsetting");
    const locationPath = join(tmp, "out.mov");
    await writeFile(motnPath, "<ozml/>", "utf-8");
    await writeFile(settingPath, "<setting/>", "utf-8");

    const result = await renderViaCompressor({ motnPath, settingPath, locationPath });

    const { readFile } = await import("node:fs/promises");
    const logged = (await readFile(logFile, "utf-8")).trim();
    expect(logged).toContain("-jobpath");
    expect(logged).toContain("my-title.motn");
    expect(logged).toContain("-settingpath");
    expect(logged).toContain("-locationpath");
    expect(result.motnPath).toBe(motnPath);
    expect(result.jobId).toBeTruthy();
  });
});
