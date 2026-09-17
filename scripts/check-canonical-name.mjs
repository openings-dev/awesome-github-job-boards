import { spawnSync } from "node:child_process";

const forbiddenTerms = [
  ["awesome-github", "issues-job-boards"].join("-"),
  ["Awesome GitHub", "Issues Job Boards"].join(" "),
];
const historicalFiles = new Set([
  "docs/superpowers/plans/2026-09-16-awesome-github-job-boards.md",
  "docs/superpowers/specs/2026-09-16-awesome-github-job-boards-design.md",
]);

function runGit(arguments_) {
  const result = spawnSync("git", arguments_, {
    cwd: process.cwd(),
    encoding: "buffer",
    maxBuffer: 100 * 1024 * 1024,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function trackedEntries() {
  const output = runGit(["ls-files", "-s", "-z"]);

  return output.toString("utf8").split("\0").filter(Boolean).map((entry) => {
    const tab = entry.indexOf("\t");
    const [mode, object, stage] = entry.slice(0, tab).split(" ");
    return { mode, object, stage, path: entry.slice(tab + 1) };
  });
}

function readBlob(object) {
  return runGit(["cat-file", "blob", object]);
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
for (const { mode, object, stage, path } of trackedEntries()) {
  if (historicalFiles.has(path)) continue;
  // A gitlink identifies another repository commit, not a file blob owned by this repository.
  if (mode === "160000") continue;
  const text = decodeText(readBlob(object));
  if (text === null) continue;
  for (const term of forbiddenTerms) {
    if (text.includes(term)) matches.push({ path, stage, term });
  }
}

if (matches.length > 0) {
  process.stderr.write("Found references to the previous project name:\n");
  for (const { path, stage, term } of matches) {
    const stageLabel = stage === "0" ? "" : ` (index stage ${stage})`;
    process.stderr.write(`${path}${stageLabel}: ${term}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write("Canonical name check passed.\n");
}
