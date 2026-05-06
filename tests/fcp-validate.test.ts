import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ─── Mock node:child_process ──────────────────────────────────────────────────
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

// ─── Mock @creator-studio-os/core ─────────────────────────────────────────────
vi.mock("@creator-studio-os/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@creator-studio-os/core")>();
  return {
    ...actual,
    loadConfig: vi.fn(() => ({
      fcpDtdPath: "/tmp/fake.dtd",
      dataDir: "/data",
    })),
  };
});

import { validateFcpxmlAgainstDtd } from "@creator-studio-os/fcp";
import { spawn } from "node:child_process";
import { CreatorStudioError } from "@creator-studio-os/core";

const mockSpawn = vi.mocked(spawn);

let tmp: string;

beforeEach(async () => {
  vi.clearAllMocks();
  tmp = await mkdtemp(join(tmpdir(), "csos-validate-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

/**
 * Build a mock ChildProcess. Callbacks fire lazily via setImmediate when
 * close/error is invoked, allowing all .on() registrations to complete first.
 *
 * Usage: call fire() after constructing to trigger the close event.
 */
function makeProcess(opts: {
  stdoutData?: string;
  stderrData?: string;
  exitCode: number;
  emitError?: boolean;
}) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  const proc = {
    stdout: {
      on: vi.fn((event: string, cb: (data: Buffer) => void) => {
        handlers[`stdout:${event}`] = handlers[`stdout:${event}`] ?? [];
        handlers[`stdout:${event}`].push(cb as (...args: unknown[]) => void);
      }),
    },
    stderr: {
      on: vi.fn((event: string, cb: (data: Buffer) => void) => {
        handlers[`stderr:${event}`] = handlers[`stderr:${event}`] ?? [];
        handlers[`stderr:${event}`].push(cb as (...args: unknown[]) => void);
      }),
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
    }),
  };

  function fire() {
    setImmediate(() => {
      if (opts.emitError) {
        handlers["error"]?.forEach((cb) => cb(new Error("spawn error")));
        return;
      }
      if (opts.stdoutData) {
        handlers["stdout:data"]?.forEach((cb) => cb(Buffer.from(opts.stdoutData!)));
      }
      if (opts.stderrData) {
        handlers["stderr:data"]?.forEach((cb) => cb(Buffer.from(opts.stderrData!)));
      }
      handlers["close"]?.forEach((cb) => cb(opts.exitCode));
    });
  }

  return { proc: proc as unknown as ReturnType<typeof spawn>, fire };
}

describe("validateFcpxmlAgainstDtd", () => {
  it("throws E_FCP_DTD_MISSING when DTD path does not exist", async () => {
    await expect(
      validateFcpxmlAgainstDtd("<fcpxml/>", "/nonexistent/path/test.dtd"),
    ).rejects.toMatchObject({
      code: "E_FCP_DTD_MISSING",
    } satisfies Partial<CreatorStudioError>);
  });

  it("skips validation and returns valid=true when xmllint is not installed", async () => {
    const dtdPath = join(tmp, "FCPXMLv1_14.dtd");
    await writeFile(dtdPath, "<!ELEMENT fcpxml (#PCDATA)>", "utf-8");

    // which("xmllint") → not found (exit code 1, no stdout)
    const { proc, fire } = makeProcess({ exitCode: 1 });
    mockSpawn.mockImplementationOnce(() => { fire(); return proc; });

    const result = await validateFcpxmlAgainstDtd("<fcpxml/>", dtdPath);
    expect(result.valid).toBe(true);
    expect(result.output).toMatch(/xmllint not installed/);
    expect(result.validatorPath).toBe("");
  });

  it("returns valid=true when xmllint exits 0", async () => {
    const dtdPath = join(tmp, "FCPXMLv1_14.dtd");
    await writeFile(dtdPath, "<!ELEMENT fcpxml (#PCDATA)>", "utf-8");

    const which = makeProcess({ stdoutData: "/usr/bin/xmllint", exitCode: 0 });
    const xmllint = makeProcess({ exitCode: 0 });

    mockSpawn.mockReset();
    mockSpawn.mockImplementationOnce(() => { which.fire(); return which.proc; });
    mockSpawn.mockImplementationOnce(() => { xmllint.fire(); return xmllint.proc; });

    const result = await validateFcpxmlAgainstDtd(
      '<?xml version="1.0"?><!DOCTYPE fcpxml><fcpxml/>',
      dtdPath,
    );
    expect(result.valid).toBe(true);
    expect(result.validatorPath).toBe("/usr/bin/xmllint");
  });

  it("returns valid=false when xmllint exits non-zero", async () => {
    const dtdPath = join(tmp, "FCPXMLv1_14.dtd");
    await writeFile(dtdPath, "<!ELEMENT fcpxml (#PCDATA)>", "utf-8");

    const which = makeProcess({ stdoutData: "/usr/bin/xmllint", exitCode: 0 });
    const xmllint = makeProcess({ stderrData: "doc.fcpxml:1: error: bad", exitCode: 1 });

    mockSpawn.mockReset();
    mockSpawn.mockImplementationOnce(() => { which.fire(); return which.proc; });
    mockSpawn.mockImplementationOnce(() => { xmllint.fire(); return xmllint.proc; });

    const result = await validateFcpxmlAgainstDtd("<invalid/>", dtdPath);
    expect(result.valid).toBe(false);
    expect(result.output).toContain("error");
  });

  it("returns 'ok' as output when xmllint produces no stderr output", async () => {
    const dtdPath = join(tmp, "FCPXMLv1_14.dtd");
    await writeFile(dtdPath, "<!ELEMENT fcpxml (#PCDATA)>", "utf-8");

    const which = makeProcess({ stdoutData: "/usr/bin/xmllint", exitCode: 0 });
    const xmllint = makeProcess({ exitCode: 0 }); // no stderr

    mockSpawn.mockReset();
    mockSpawn.mockImplementationOnce(() => { which.fire(); return which.proc; });
    mockSpawn.mockImplementationOnce(() => { xmllint.fire(); return xmllint.proc; });

    const result = await validateFcpxmlAgainstDtd("<fcpxml/>", dtdPath);
    expect(result.output).toBe("ok");
  });

  it("passes --noout --valid flags to xmllint", async () => {
    const dtdPath = join(tmp, "FCPXMLv1_14.dtd");
    await writeFile(dtdPath, "<!ELEMENT fcpxml (#PCDATA)>", "utf-8");

    const which = makeProcess({ stdoutData: "/usr/bin/xmllint", exitCode: 0 });
    const xmllint = makeProcess({ exitCode: 0 });
    let capturedArgs: string[] = [];

    mockSpawn.mockReset();
    mockSpawn.mockImplementationOnce(() => { which.fire(); return which.proc; });
    mockSpawn.mockImplementationOnce((_cmd, args) => {
      capturedArgs = args as string[];
      xmllint.fire();
      return xmllint.proc;
    });

    await validateFcpxmlAgainstDtd('<?xml version="1.0"?><!DOCTYPE fcpxml><fcpxml/>', dtdPath);
    expect(capturedArgs).toContain("--noout");
    expect(capturedArgs).toContain("--valid");
  });
});
