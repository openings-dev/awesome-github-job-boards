import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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

test("accepts only the two exact historical records and binary files in a git worktree", async (t) => {
  const worktree = await repository(t);
  await mkdir(path.join(worktree, "docs/superpowers/specs"), { recursive: true });
  await mkdir(path.join(worktree, "docs/superpowers/plans"), { recursive: true });
  await writeFile(
    path.join(worktree, "docs/superpowers/specs/2026-09-16-awesome-github-job-boards-design.md"),
    `${oldSlug}\n`,
  );
  await writeFile(
    path.join(worktree, "docs/superpowers/plans/2026-09-16-awesome-github-job-boards.md"),
    `${oldTitle}\n`,
  );
  await writeFile(path.join(worktree, "asset.bin"), Buffer.from([0, ...Buffer.from(oldSlug)]));
  git(worktree, "add", "-f", ".");

  const result = check(worktree);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /canonical name check passed/iu);
});

test("reports old terms in other files under historical directories", async (t) => {
  const worktree = await repository(t);
  await mkdir(path.join(worktree, "docs/superpowers/specs"), { recursive: true });
  await writeFile(path.join(worktree, "docs/superpowers/specs/new-record.md"), `${oldSlug}\n`);
  git(worktree, "add", "-f", ".");
  assert.match(git(worktree, "ls-files"), /docs\/superpowers\/specs\/new-record\.md/u);

  const result = check(worktree);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /docs\/superpowers\/specs\/new-record\.md/u);
  assert.match(result.stderr, new RegExp(oldSlug, "u"));
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

test("reads a clean symlink from the index without following its external target", async (t) => {
  const worktree = await repository(t);
  const external = path.join(path.dirname(worktree), "outside.txt");
  await writeFile(external, `${oldSlug}\n`);
  await symlink(external, path.join(worktree, "external-link"));
  git(worktree, "add", "external-link");

  const result = check(worktree);

  assert.equal(result.status, 0, result.stderr);
});

test("reports an old term stored in a symlink blob", async (t) => {
  const worktree = await repository(t);
  await symlink(oldSlug, path.join(worktree, "bad-link"));
  git(worktree, "add", "bad-link");

  const result = check(worktree);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`bad-link: ${oldSlug}`, "u"));
});

test("does not crash on a clean broken symlink", async (t) => {
  const worktree = await repository(t);
  await symlink("missing-target", path.join(worktree, "broken-link"));
  git(worktree, "add", "broken-link");

  const result = check(worktree);

  assert.equal(result.status, 0, result.stderr);
});

test("ignores gitlink contents instead of opening the nested repository", async (t) => {
  const worktree = await repository(t);
  const nested = path.join(worktree, "dependency");
  await mkdir(nested);
  git(nested, "init", "-q");
  git(nested, "config", "user.email", "test@example.com");
  git(nested, "config", "user.name", "Test User");
  await writeFile(path.join(nested, "README.md"), `${oldTitle}\n`);
  git(nested, "add", "README.md");
  git(nested, "commit", "-qm", "nested");
  git(worktree, "add", "dependency");

  const result = check(worktree);

  assert.equal(result.status, 0, result.stderr);
});

test("package verification includes the canonical-name check", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts["lint:name"], "node scripts/check-canonical-name.mjs");
  assert.equal(packageJson.scripts.verify, "npm test && npm run lint:name && npm run lint:awesome");
});
