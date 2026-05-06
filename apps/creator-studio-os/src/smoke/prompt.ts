import { createInterface } from "node:readline";

/**
 * Pause for human confirmation in --manual mode.
 * Prints context, then waits for y/n.
 * In --ci mode returns true (auto-pass) immediately.
 */
export async function humanConfirm(opts: {
  mode: "manual" | "ci";
  dryRun: boolean;
  title: string;
  lines: string[];
}): Promise<boolean> {
  if (opts.dryRun || opts.mode === "ci") return true;

  console.log(`\n  ► ${opts.title}`);
  for (const line of opts.lines) {
    console.log(`    ${line}`);
  }

  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question("\n  Confirmed? [y/n]: ", (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
