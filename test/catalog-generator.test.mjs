import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCatalog,
  renderCatalog,
  renderReadme,
} from "../src/catalog-generator.mjs";

const catalog = {
  generatedAt: "2026-09-02",
  repositories: [
    { repository: "beta/jobs", url: "https://github.com/beta/jobs", country: "Brazil", region: "South America", locale: "pt-BR", scope: "national" },
    { repository: "gamma/jobs", url: "https://github.com/gamma/jobs", country: "Global", region: "South America", locale: "en", scope: "regional" },
    { repository: "alpha/[roles]", url: "https://github.com/alpha/roles", country: "Global", region: "Global", locale: "en", scope: "global" },
    { repository: "zeta/jobs", url: "https://github.com/zeta/jobs", country: "China", region: "Asia", locale: "zh-CN", scope: "national" },
  ],
};

test("parses, orders, and renders the public catalog deterministically", () => {
  const parsed = parseCatalog(catalog);
  const rendered = renderCatalog(parsed);

  assert.equal(parsed.generatedAt, "2026-09-02");
  assert.equal(parsed.repositories.length, 4);
  assert.deepEqual(
    parsed.repositories.filter(({ region }) => region === "South America").map(({ country }) => country),
    ["Global", "Brazil"],
  );
  assert.ok(rendered.indexOf("### Global") < rendered.indexOf("### Asia"));
  assert.ok(rendered.indexOf("### Asia") < rendered.indexOf("### South America"));
  assert.match(rendered, /alpha\/\\\[roles\\\]/u);
  assert.equal(rendered, renderCatalog(parsed));
});

test("rejects duplicate repositories", () => {
  assert.throws(
    () => parseCatalog({ ...catalog, repositories: [...catalog.repositories, catalog.repositories[0]] }),
    /duplicate repository/iu,
  );
});

test("renders the human introduction around generated content", () => {
  const parsed = parseCatalog(catalog);
  const result = renderReadme("Total: {{TOTAL}}\nUpdated: {{GENERATED_AT}}\n{{CATALOG}}", parsed);

  assert.match(result, /Total: 4/u);
  assert.match(result, /Updated: 2026-09-02/u);
  assert.match(result, /beta\/jobs/u);
});
