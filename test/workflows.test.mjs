import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("catalog update validates and commits only generated catalog data", async () => {
  const workflow = await read(".github/workflows/update-catalog.yml");

  assert.match(workflow, /^\s*- name: Checkout repository\s*\n\s*uses: actions\/checkout@v4$/mu);
  assert.match(workflow, /repository:\s*openings-dev\/data-pipeline/u);
  assert.match(workflow, /path:\s*\.catalog-data/u);
  assert.match(workflow, /uses:\s*actions\/setup-node@v4[\s\S]*?node-version:\s*["']?20["']?/u);
  assert.match(workflow, /run:\s*npm ci(?:\s|$)/u);
  assert.match(workflow, /run:\s*npm test(?:\s|$)/u);
  assert.match(workflow, /run:\s*npm run generate -- \.catalog-data\/src\/modules\/catalog\/repositories\.json/u);
  assert.match(workflow, /git diff --quiet -- _data\/catalog\.json/u);
  assert.match(workflow, /git add _data\/catalog\.json/u);
  assert.match(workflow, /git commit -m ["']data: refresh job board catalog["']/u);
  assert.doesNotMatch(workflow, /README\.md|generate-readme/u);
});

test("validation workflow checks the awesome list and builds the site", async () => {
  const workflow = await read(".github/workflows/validate.yml");

  assert.match(workflow, /^\s*pull_request:\s*$/mu);
  assert.match(workflow, /^\s*push:\s*\n\s*branches:\s*\n\s*- main\s*$/mu);
  assert.match(workflow, /^permissions:\s*\n\s*contents:\s*read\s*$/mu);
  assert.match(workflow, /uses:\s*actions\/checkout@v4/u);
  assert.match(workflow, /uses:\s*actions\/setup-node@v4[\s\S]*?node-version:\s*["']?20["']?[\s\S]*?cache:\s*npm/u);
  assert.match(workflow, /run:\s*npm ci(?:\s|$)/u);
  assert.match(workflow, /run:\s*npm test(?:\s|$)/u);
  assert.match(workflow, /run:\s*npm run lint:awesome(?:\s|$)/u);
  assert.match(workflow, /uses:\s*ruby\/setup-ruby@v1[\s\S]*?bundler-cache:\s*true/u);
  assert.match(workflow, /run:\s*bundle exec jekyll build --strict_front_matter/u);
});
