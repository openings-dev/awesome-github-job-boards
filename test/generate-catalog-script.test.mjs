import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptPath = fileURLToPath(new URL("../scripts/generate-catalog.mjs", import.meta.url));

function source(generatedAt, repository) {
  return {
    generatedAt,
    repositories: [{
      repository,
      url: `https://github.com/${repository}`,
      country: "Global",
      countryCode: "GLOBAL",
      region: "Global",
      locale: "en",
      scope: "global",
    }],
  };
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value));
}

function runGenerator(cwd, { argument, environmentPath } = {}) {
  const { OPENINGS_CATALOG_PATH: _catalogPath, ...environment } = process.env;
  if (environmentPath !== undefined) environment.OPENINGS_CATALOG_PATH = environmentPath;
  const result = spawnSync(process.execPath, [scriptPath, ...(argument ? [argument] : [])], {
    cwd,
    encoding: "utf8",
    env: environment,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

async function workspace(t) {
  const root = await mkdtemp(path.join(tmpdir(), "catalog-generator-"));
  const project = path.join(root, "project");
  await mkdir(project);
  t.after(async () => {
    await import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true }));
  });
  return { root, project };
}

test("prefers argv over environment and default while creating _data", async (t) => {
  const { root, project } = await workspace(t);
  const argumentPath = path.join(root, "argument.json");
  const environmentPath = path.join(root, "environment.json");
  const defaultPath = path.join(root, "data-pipeline/src/modules/catalog/repositories.json");
  await Promise.all([
    writeJson(argumentPath, source("2026-09-01", "argument/jobs")),
    writeJson(environmentPath, source("2026-09-02", "environment/jobs")),
    writeJson(defaultPath, source("2026-09-03", "default/jobs")),
  ]);

  assert.equal(runGenerator(project, { argument: argumentPath, environmentPath }), "Catalog data updated.");
  const output = JSON.parse(await readFile(path.join(project, "_data/catalog.json"), "utf8"));
  assert.equal(output.repositories[0].repository, "argument/jobs");
});

test("prefers OPENINGS_CATALOG_PATH over the default", async (t) => {
  const { root, project } = await workspace(t);
  const environmentPath = path.join(root, "environment.json");
  const defaultPath = path.join(root, "data-pipeline/src/modules/catalog/repositories.json");
  await Promise.all([
    writeJson(environmentPath, source("2026-09-02", "environment/jobs")),
    writeJson(defaultPath, source("2026-09-03", "default/jobs")),
  ]);

  assert.equal(runGenerator(project, { environmentPath }), "Catalog data updated.");
  const output = JSON.parse(await readFile(path.join(project, "_data/catalog.json"), "utf8"));
  assert.equal(output.repositories[0].repository, "environment/jobs");
});

test("uses the default catalog path", async (t) => {
  const { root, project } = await workspace(t);
  const defaultPath = path.join(root, "data-pipeline/src/modules/catalog/repositories.json");
  await writeJson(defaultPath, source("2026-09-03", "default/jobs"));

  assert.equal(runGenerator(project), "Catalog data updated.");
  const output = JSON.parse(await readFile(path.join(project, "_data/catalog.json"), "utf8"));
  assert.equal(output.repositories[0].repository, "default/jobs");
});

test("writes only when catalog content changes and reports exact status", async (t) => {
  const { root, project } = await workspace(t);
  const inputPath = path.join(root, "catalog.json");
  const outputPath = path.join(project, "_data/catalog.json");
  await writeJson(inputPath, source("2026-09-01", "example/jobs"));

  assert.equal(runGenerator(project, { argument: inputPath }), "Catalog data updated.");
  const fixedTime = new Date("2000-01-01T00:00:00Z");
  await utimes(outputPath, fixedTime, fixedTime);
  const unchangedMtime = (await stat(outputPath)).mtimeMs;

  assert.equal(runGenerator(project, { argument: inputPath }), "Catalog data is already current.");
  assert.equal((await stat(outputPath)).mtimeMs, unchangedMtime);

  await writeJson(inputPath, source("2026-09-02", "example/jobs"));
  assert.equal(runGenerator(project, { argument: inputPath }), "Catalog data updated.");
  assert.notEqual((await stat(outputPath)).mtimeMs, unchangedMtime);
  assert.match(await readFile(outputPath, "utf8"), /"generatedAt": "2026-09-02"/u);
});
