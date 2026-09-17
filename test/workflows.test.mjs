import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "yaml";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readYaml = async (path) => parse(await read(path));
const stepNamed = (job, name) => job.steps.find((step) => step.name === name);

test("catalog update validates and commits only generated catalog data", async () => {
  const raw = await read(".github/workflows/update-catalog.yml");
  const workflow = parse(raw);
  const update = workflow.jobs.update;

  assert.deepEqual(Object.keys(workflow.on).sort(), ["schedule", "workflow_dispatch"]);
  assert.deepEqual(workflow.on.workflow_dispatch, null);
  assert.deepEqual(workflow.on.schedule, [{ cron: "30 5 * * *" }]);
  assert.deepEqual(workflow.permissions, { contents: "write" });
  assert.deepEqual(workflow.concurrency, { group: "update-catalog", "cancel-in-progress": false });
  assert.equal(update["runs-on"], "ubuntu-latest");
  assert.equal(stepNamed(update, "Checkout repository").uses, "actions/checkout@v4");
  assert.equal(stepNamed(update, "Checkout public catalog").uses, "actions/checkout@v4");
  assert.deepEqual(stepNamed(update, "Checkout public catalog").with, {
    repository: "openings-dev/data-pipeline",
    ref: "main",
    path: ".catalog-data",
  });
  assert.deepEqual(stepNamed(update, "Setup Node.js").with, { "node-version": "20", cache: "npm" });
  assert.equal(stepNamed(update, "Install dependencies").run, "npm ci");
  assert.equal(stepNamed(update, "Test catalog generator").run, "npm test");
  assert.equal(
    stepNamed(update, "Generate directory").run,
    "npm run generate -- .catalog-data/src/modules/catalog/repositories.json",
  );

  const commit = stepNamed(update, "Commit changed catalog").run;
  assert.match(commit, /git diff --quiet -- _data\/catalog\.json/u);
  assert.match(commit, /git add _data\/catalog\.json/u);
  assert.match(commit, /git commit -m "data: refresh job board catalog"/u);
  assert.doesNotMatch(raw, /git add\s+README\.md|generate-readme/u);
});

test("validation workflow checks the Awesome list with Node tooling", async () => {
  const workflow = await readYaml(".github/workflows/validate.yml");
  const validate = workflow.jobs.validate;

  assert.deepEqual(workflow.on.pull_request, null);
  assert.deepEqual(workflow.on.push, { branches: ["main"] });
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(validate["runs-on"], "ubuntu-latest");
  assert.equal(stepNamed(validate, "Checkout repository").uses, "actions/checkout@v4");
  assert.deepEqual(stepNamed(validate, "Setup Node.js"), {
    name: "Setup Node.js",
    uses: "actions/setup-node@v4",
    with: { "node-version": "20", cache: "npm" },
  });
  assert.equal(stepNamed(validate, "Install Node.js dependencies").run, "npm ci");
  assert.equal(stepNamed(validate, "Run tests").run, "npm test");
  assert.equal(stepNamed(validate, "Lint Awesome list").run, "npm run lint:awesome");
  assert.equal(stepNamed(validate, "Setup Ruby"), undefined);
  assert.equal(stepNamed(validate, "Build site"), undefined);
});

test("issue forms separate curated nominations from the complete catalog", async () => {
  const config = await readYaml(".github/ISSUE_TEMPLATE/config.yml");
  const nomination = await readYaml(".github/ISSUE_TEMPLATE/add-job-board.yml");
  const report = await readYaml(".github/ISSUE_TEMPLATE/report-problem.yml");
  const sourceRequest = "https://github.com/openings-dev/web/issues/new?template=source_repository.yml";

  assert.equal(config.blank_issues_enabled, false);
  assert.ok(config.contact_links.some((link) => link.url === sourceRequest));
  assert.ok(config.contact_links.some((link) => link.url === "https://github.com/openings-dev/awesome-github-job-boards"));
  assert.ok(config.contact_links.some((link) => link.url === "https://openings.dev"));

  assert.match(nomination.name, /Nominate a curated job board/u);
  const guidance = nomination.body.find((item) => item.type === "markdown").attributes.value;
  assert.match(guidance, /curated README/u);
  assert.ok(guidance.includes(sourceRequest));
  assert.doesNotMatch(guidance, /will (?:be )?(?:added|included)|guaranteed inclusion/iu);
  assert.equal(nomination.body.find((item) => item.id === "evidence").validations.required, true);
  assert.equal(nomination.body.find((item) => item.id === "rationale").validations.required, true);

  const surfaces = report.body.find((item) => item.id === "surface").attributes.options;
  assert.deepEqual(surfaces, ["Curated README", "Complete website catalog", "Both"]);
});

test("pull request template distinguishes editorial nominations from catalog work", async () => {
  const template = await read(".github/PULL_REQUEST_TEMPLATE.md");

  assert.match(template, /Curated README nomination/u);
  assert.match(template, /Catalog site, code, documentation, or maintenance/u);
  assert.match(template, /manually curated Awesome GitHub Job Boards list/u);
  assert.match(template, /complete source catalog/u);
  assert.match(template, /evidence of recent, relevant job activity/u);
  assert.match(template, /https:\/\/github\.com\/openings-dev\/web\/issues\/new\?template=source_repository\.yml/u);
});
