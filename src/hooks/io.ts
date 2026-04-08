/**
 * io.ts — Shared stdin/stdout utilities for hook entry points.
 */

/** Read all of stdin and resolve with the full string. */
export function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
  });
}

/** Write a line to stdout (Claude Code displays this in the conversation). */
export function print(message: string): void {
  process.stdout.write(message + "\n");
}
