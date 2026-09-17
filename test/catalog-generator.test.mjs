import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseCatalog, serializeCatalog } from "../src/catalog-generator.mjs";

const catalogData = JSON.parse(await readFile(new URL("../_data/catalog.json", import.meta.url), "utf8"));

const repository = {
  repository: " beta/jobs ",
  owner: " beta ",
  name: " jobs ",
  url: "https://github.com/beta/jobs",
  description: " Jobs in Brazil. ",
  country: " Brazil ",
  countryCode: " BR ",
  region: "South America",
  locale: " pt-BR ",
  scope: "national",
  source: "github-search",
  queryHints: ["jobs"],
};

const catalog = (repositories = [repository], generatedAt = "2026-09-02") => ({
  generatedAt,
  searchKeywords: ["jobs"],
  repositories,
});

test("normalizes repositories and preserves only public fields", () => {
  assert.deepEqual(parseCatalog(catalog()), {
    generatedAt: "2026-09-02",
    repositories: [{
      repository: "beta/jobs",
      owner: "beta",
      name: "jobs",
      url: "https://github.com/beta/jobs",
      description: "Jobs in Brazil.",
      country: "Brazil",
      countryCode: "BR",
      region: "South America",
      locale: "pt-BR",
      scope: "national",
    }],
  });
});

test("omits an absent description and safely derives owner and name", () => {
  const { owner: _owner, name: _name, description: _description, ...withoutOptionalFields } = repository;
  const parsed = parseCatalog(catalog([withoutOptionalFields]));

  assert.deepEqual(parsed.repositories[0], {
    repository: "beta/jobs",
    owner: "beta",
    name: "jobs",
    url: "https://github.com/beta/jobs",
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
    locale: "pt-BR",
    scope: "national",
  });
});

test("omits a blank optional description", () => {
  const parsed = parseCatalog(catalog([{ ...repository, description: "   " }]));

  assert.equal("description" in parsed.repositories[0], false);
});

for (const description of [false, 0]) {
  test(`rejects invalid optional description ${description}`, () => {
    assert.throws(
      () => parseCatalog(catalog([{ ...repository, description }])),
      /invalid description/iu,
    );
  });
}

test("orders repositories deterministically by region, country, and repository", () => {
  const item = (repository, country, region) => ({
    repository,
    url: `https://github.com/${repository}`,
    country,
    countryCode: country === "Global" ? "GLOBAL" : "XX",
    region,
    locale: "en",
    scope: country === "Global" ? "global" : "national",
  });
  const parsed = parseCatalog(catalog([
    item("zeta/jobs", "China", "Asia"),
    item("gamma/jobs", "Global", "South America"),
    item("beta/jobs", "Brazil", "South America"),
    item("Alpha/jobs", "Global", "Global"),
  ]));

  assert.deepEqual(parsed.repositories.map(({ repository }) => repository), [
    "Alpha/jobs",
    "zeta/jobs",
    "gamma/jobs",
    "beta/jobs",
  ]);
});

test("serializes repository ordering independently of input order", () => {
  const item = (repository) => ({
    repository,
    url: `https://github.com/${repository}`,
    country: "Global",
    countryCode: "GLOBAL",
    region: "Global",
    locale: "en",
    scope: "global",
  });
  const accentedFirst = parseCatalog(catalog([item("ab/jobs"), item("a-b/jobs")]));
  const plainFirst = parseCatalog(catalog([item("a-b/jobs"), item("ab/jobs")]));

  assert.deepEqual(accentedFirst.repositories.map(({ repository }) => repository), ["a-b/jobs", "ab/jobs"]);
  assert.equal(serializeCatalog(accentedFirst), serializeCatalog(plainFirst));
});

test("serializes formatted JSON with exactly one final newline", () => {
  const parsed = parseCatalog(catalog());
  const serialized = serializeCatalog(parsed);

  assert.equal(serialized, `${JSON.stringify(parsed, null, 2)}\n`);
  assert.doesNotMatch(serialized, /\n\n$/u);
});

test("rejects duplicate repositories case-insensitively", () => {
  assert.throws(
    () => parseCatalog(catalog([repository, { ...repository, repository: "BETA/JOBS" }])),
    /duplicate repository/iu,
  );
});

test("accepts the complete checked-in catalog", () => {
  assert.equal(parseCatalog(catalogData).repositories.length, catalogData.repositories.length);
});

for (const repositoryName of ["not/a/repo/path", "owner/", "/name", "owner/name?tab=readme", "owner/name#readme", "-owner/name", "owner-/name", "owner/.", "owner/..", "owner/name extra"]) {
  test(`rejects malformed repository ${repositoryName}`, () => {
    assert.throws(
      () => parseCatalog(catalog([{ ...repository, repository: repositoryName }])),
      /invalid repository/iu,
    );
  });
}

for (const mismatch of [{ owner: "other" }, { name: "other" }]) {
  test(`rejects repository metadata mismatch ${JSON.stringify(mismatch)}`, () => {
    assert.throws(
      () => parseCatalog(catalog([{ ...repository, ...mismatch }])),
      /does not match repository/iu,
    );
  });
}

test("normalizes case-insensitive GitHub URL matching to repository segments", () => {
  const parsed = parseCatalog(catalog([{ ...repository, url: "https://github.com/BETA/JOBS/" }]));
  assert.equal(parsed.repositories[0].url, "https://github.com/beta/jobs");
});

for (const date of ["not-a-date", "2026-02-30", "2026-2-02"]) {
  test(`rejects invalid catalog date ${date}`, () => {
    assert.throws(() => parseCatalog(catalog([repository], date)), /invalid catalog date/iu);
  });
}

for (const url of [
  "not-a-url",
  "http://github.com/beta/jobs",
  "https://gitlab.com/beta/jobs",
  "https://github.com.evil.test/beta/jobs",
  "https://github.com:444/beta/jobs",
  "https://user:password@github.com/beta/jobs",
  "https://github.com/beta/jobs/issues",
  "https://github.com/beta/jobs?tab=readme",
  "https://github.com/beta/jobs#readme",
  "https://github.com/other/jobs",
]) {
  test(`rejects non-GitHub HTTPS URL ${url}`, () => {
    assert.throws(() => parseCatalog(catalog([{ ...repository, url }])), /invalid github url/iu);
  });
}

for (const countryCode of ["br", "BRA", "B", "??", "US-"]) {
  test(`rejects invalid country code ${countryCode}`, () => {
    assert.throws(
      () => parseCatalog(catalog([{ ...repository, countryCode }])),
      /invalid country code/iu,
    );
  });
}

for (const locale of ["???", "EN", "pt-br", "e", "english", "zh-hant-tw", "en_US", "en-US-extra-part"]) {
  test(`rejects invalid locale ${locale}`, () => {
    assert.throws(
      () => parseCatalog(catalog([{ ...repository, locale }])),
      /invalid locale/iu,
    );
  });
}

for (const locale of ["en", "pt-BR", "zh-Hant-TW", "es-419", "sr-Latn"]) {
  test(`accepts basic BCP47 locale ${locale}`, () => {
    assert.equal(parseCatalog(catalog([{ ...repository, locale }])).repositories[0].locale, locale);
  });
}

for (const field of ["repository", "url", "country", "countryCode", "region", "locale", "scope"]) {
  test(`rejects a repository missing required field ${field}`, () => {
    const invalid = { ...repository };
    delete invalid[field];
    assert.throws(() => parseCatalog(catalog([invalid])), /invalid/iu);
  });
}

test("rejects an unknown region", () => {
  assert.throws(
    () => parseCatalog(catalog([{ ...repository, region: "Antarctica" }])),
    /invalid region/iu,
  );
});

test("rejects an unknown scope", () => {
  assert.throws(
    () => parseCatalog(catalog([{ ...repository, scope: "planetary" }])),
    /invalid scope/iu,
  );
});
