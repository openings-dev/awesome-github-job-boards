import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const forbiddenTerms = [
  ["awesome-github", "issues-job-boards"].join("-"),
  ["Awesome GitHub", "Issues Job Boards"].join(" "),
];
const historicalDirectories = ["docs/superpowers/specs/", "docs/superpowers/plans/"];

function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: process.cwd(),
    encoding: "buffer",
    maxBuffer: 100 * 1024 * 1024,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

function isHistorical(file) {
  return historicalDirectories.some((directory) => file.startsWith(directory));
}

function decodeText(buffer) {
  if (buffer.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

const matches = [];
for (const file of trackedFiles()) {
  if (isHistorical(file)) continue;
  const text = decodeText(await readFile(file));
  if (text === null) continue;
  for (const term of forbiddenTerms) {
    if (text.includes(term)) matches.push({ file, term });
  }
}

if (matches.length > 0) {
  process.stderr.write("Found references to the previous project name:\n");
  for (const { file, term } of matches) process.stderr.write(`${file}: ${term}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Canonical name check passed.\n");
}
