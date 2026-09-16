import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptPath = fileURLToPath(new URL("../scripts/check-canonical-name.mjs", import.meta.url));
const oldSlug = ["awesome-github", "issues-job-boards"].join("-");
const oldTitle = ["Awesome GitHub", "Issues Job Boards"].join(" ");

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function check(cwd) {
  return spawnSync(process.execPath, [scriptPath], { cwd, encoding: "utf8" });
}

async function repository(t) {
  const root = await mkdtemp(path.join(tmpdir(), "canonical-name-"));
  const main = path.join(root, "main");
  const worktree = path.join(root, "worktree");
  await mkdir(main);
  git(main, "init", "-q");
  git(main, "config", "user.email", "test@example.com");
  git(main, "config", "user.name", "Test User");
  await writeFile(path.join(main, "seed.txt"), "canonical\n");
  git(main, "add", "seed.txt");
  git(main, "commit", "-qm", "seed");
  git(main, "worktree", "add", "-q", "-b", "test-worktree", worktree);
  t.after(() => rm(root, { recursive: true, force: true }));
  return worktree;
}

test("accepts historical records and binary files in a git worktree", async (t) => {
  const worktree = await repository(t);
  await mkdir(path.join(worktree, "docs/superpowers/specs"), { recursive: true });
  await mkdir(path.join(worktree, "docs/superpowers/plans"), { recursive: true });
  await writeFile(path.join(worktree, "docs/superpowers/specs/history.md"), `${oldSlug}\n`);
  await writeFile(path.join(worktree, "docs/superpowers/plans/history.md"), `${oldTitle}\n`);
  await writeFile(path.join(worktree, "asset.bin"), Buffer.from([0, ...Buffer.from(oldSlug)]));
  git(worktree, "add", ".");

  const result = check(worktree);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /canonical name check passed/iu);
});

test("reports every old canonical-name term in tracked text files", async (t) => {
  const worktree = await repository(t);
  await writeFile(path.join(worktree, "README.md"), `${oldSlug}\n${oldTitle}\n`);
  git(worktree, "add", "README.md");

  const result = check(worktree);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /README\.md/u);
  assert.match(result.stderr, new RegExp(oldSlug, "u"));
  assert.match(result.stderr, new RegExp(oldTitle, "u"));
});

test("does not scan untracked files", async (t) => {
  const worktree = await repository(t);
  await writeFile(path.join(worktree, "scratch.txt"), `${oldSlug}\n`);

  const result = check(worktree);

  assert.equal(result.status, 0, result.stderr);
});

test("package verification includes the canonical-name check", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts["lint:name"], "node scripts/check-canonical-name.mjs");
  assert.equal(packageJson.scripts.verify, "npm test && npm run lint:name && npm run lint:awesome");
});
