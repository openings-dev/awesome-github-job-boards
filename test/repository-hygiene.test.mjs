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

test("keeps the website and duplicate catalog implementation out of the repository", async () => {
  for (const path of [
    "_config.yml",
    "_data/",
    "_includes/",
    "_layouts/",
    "assets/",
    "index.html",
    "scripts/",
    "src/",
    ".github/workflows/update-catalog.yml",
    "test/catalog-generator.test.mjs",
    "test/catalog-ui.test.mjs",
    "test/generate-catalog-script.test.mjs",
    "test/site-structure.test.mjs",
    "test/theme.test.mjs",
    "test/workflows.test.mjs",
  ]) {
    assert.equal(await exists(path), false, `expected ${path} to be absent`);
  }

  const ignore = await read(".gitignore");
  for (const path of ["docs/superpowers/", "node_modules/"]) {
    assert.match(ignore, new RegExp(`^${path.replaceAll("/", "\\/")}$`, "mu"));
  }
});

test("public guidance delegates the complete catalog to openings.dev communities", async () => {
  const officialCatalog = "https://openings.dev/communities/";
  for (const path of ["README.md", "CONTRIBUTING.md", "SUBMISSIONS.md", ".github/PULL_REQUEST_TEMPLATE.md", ".github/ISSUE_TEMPLATE/add-job-board.yml", ".github/ISSUE_TEMPLATE/config.yml"]) {
    assert.match(await read(path), new RegExp(officialCatalog.replaceAll("/", "\\/"), "u"), `${path} must link to the official catalog`);
  }
});

test("validation uses only Node checks for the Awesome repository", async () => {
  const workflow = await read(".github/workflows/validate.yml");
  assert.doesNotMatch(workflow, /ruby\/setup-ruby|bundle exec|bundler-cache/iu);
  assert.match(workflow, /npm run lint:awesome/u);
  assert.doesNotMatch(workflow, /npm run lint:name/u);
  assert.doesNotMatch(workflow, /jekyll|pages/iu);
});
