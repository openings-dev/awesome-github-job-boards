import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const exists = async (path) => access(new URL(path, root)).then(() => true, () => false);
const read = (path) => readFile(new URL(path, root), "utf8");

test("keeps internal planning and redundant Ruby tooling out of the repository", async () => {
  for (const path of [
    "docs/superpowers/",
    ".ruby-version",
    "Gemfile",
    "Gemfile.lock",
    "scripts/check-canonical-name.mjs",
    "test/canonical-name.test.mjs",
  ]) {
    assert.equal(await exists(path), false, `expected ${path} to be absent`);
  }
});

test("keeps only the operational catalog script and ignores private build artifacts", async () => {
  assert.equal(await exists("scripts/generate-catalog.mjs"), true);
  const ignore = await read(".gitignore");
  for (const path of ["docs/superpowers/", "node_modules/", "vendor/", "_site/", ".bundle/"]) {
    assert.match(ignore, new RegExp(`^${path.replaceAll("/", "\\/")}$`, "mu"));
  }
});

test("validation uses Node checks and delegates production rendering to GitHub Pages", async () => {
  const workflow = await read(".github/workflows/validate.yml");
  assert.doesNotMatch(workflow, /ruby\/setup-ruby|bundle exec|bundler-cache/iu);
  assert.match(workflow, /npm run lint:awesome/u);
  assert.doesNotMatch(workflow, /npm run lint:name/u);
});
