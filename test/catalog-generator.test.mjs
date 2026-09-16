import assert from "node:assert/strict";
import test from "node:test";
import { parseCatalog, serializeCatalog } from "../src/catalog-generator.mjs";

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

test("uses a code-point tiebreaker for locale-equivalent repository names", () => {
  const item = (repository) => ({
    repository,
    url: `https://github.com/${repository}`,
    country: "Global",
    countryCode: "GLOBAL",
    region: "Global",
    locale: "en",
    scope: "global",
  });
  const accentedFirst = parseCatalog(catalog([item("é/jobs"), item("e/jobs")]));
  const plainFirst = parseCatalog(catalog([item("e/jobs"), item("é/jobs")]));

  assert.deepEqual(accentedFirst.repositories.map(({ repository }) => repository), ["e/jobs", "é/jobs"]);
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
]) {
  test(`rejects non-GitHub HTTPS URL ${url}`, () => {
    assert.throws(() => parseCatalog(catalog([{ ...repository, url }])), /invalid github url/iu);
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
