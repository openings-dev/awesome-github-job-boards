import assert from "node:assert/strict";
import test from "node:test";
import {
  filterCatalog,
  getFilterOptions,
  initCatalog,
  parseQueryState,
  serializeQueryState,
} from "../assets/js/catalog.mjs";

const items = [
  {
    repository: "acme/Brazil-Jobs",
    owner: "acme",
    name: "Brazil-Jobs",
    description: "Remote roles for developers",
    region: "South America",
    country: "Brazil",
    locale: "pt-BR",
    scope: "national",
  },
  {
    repository: "Beta/global-work",
    owner: "Beta",
    name: "global-work",
    region: "Global",
    country: "Global",
    locale: "en",
    scope: "global",
  },
  {
    repository: "acme/canada-jobs",
    owner: "acme",
    name: "canada-jobs",
    description: "Remote jobs in Canada",
    region: "North America",
    country: "Canada",
    locale: "en-CA",
    scope: "national",
  },
];

test("searches repository, owner, name, and optional description case-insensitively", () => {
  assert.deepEqual(filterCatalog(items, { query: "BRAZIL-JOBS" }), [items[0]]);
  assert.deepEqual(filterCatalog(items, { query: "beta" }), [items[1]]);
  assert.deepEqual(filterCatalog(items, { query: "GLOBAL-WORK" }), [items[1]]);
  assert.deepEqual(filterCatalog(items, { query: "DEVELOPERS" }), [items[0]]);
});

test("combines query and every exact-match filter", () => {
  assert.deepEqual(filterCatalog(items, {
    query: "remote",
    region: "North America",
    country: "Canada",
    locale: "en-CA",
    scope: "national",
  }), [items[2]]);
  assert.deepEqual(filterCatalog(items, { country: "canada" }), []);
});

test("trims query whitespace and treats a whitespace-only query as empty", () => {
  assert.deepEqual(filterCatalog(items, { query: "  remote  " }), [items[0], items[2]]);
  assert.deepEqual(filterCatalog(items, { query: "  \n " }), items);
});

test("returns an empty result when nothing matches without mutating input", () => {
  const snapshot = structuredClone(items);
  assert.deepEqual(filterCatalog(items, { query: "no such board" }), []);
  assert.deepEqual(items, snapshot);
});

test("returns unique locale-aware sorted filter options without mutating input", () => {
  const input = [items[2], items[0], items[1], { ...items[0] }];
  const snapshot = structuredClone(input);
  assert.deepEqual(getFilterOptions(input), {
    region: ["Global", "North America", "South America"],
    country: ["Brazil", "Canada", "Global"],
    locale: ["en", "en-CA", "pt-BR"],
    scope: ["global", "national"],
  });
  assert.deepEqual(input, snapshot);
});

test("parses query state from strings with or without a question mark", () => {
  const expected = {
    query: "remote jobs",
    region: "North America",
    country: "Canada",
    locale: "en-CA",
    scope: "national",
  };
  const encoded = "query=remote+jobs&region=North+America&country=Canada&locale=en-CA&scope=national";
  assert.deepEqual(parseQueryState(`?${encoded}`), expected);
  assert.deepEqual(parseQueryState(encoded), expected);
  assert.deepEqual(parseQueryState(new URLSearchParams(encoded)), expected);
});

test("decodes, encodes, and ignores unknown query keys", () => {
  assert.deepEqual(parseQueryState("?query=C%2B%2B+jobs&unknown=nope"), {
    query: "C++ jobs",
    region: "",
    country: "",
    locale: "",
    scope: "",
  });
  assert.equal(serializeQueryState({ query: "C++ jobs", country: "São Tomé", unknown: "nope" }),
    "query=C%2B%2B+jobs&country=S%C3%A3o+Tom%C3%A9");
});

test("omits empty known values and keeps empty state stable", () => {
  const empty = { query: "", region: "", country: "", locale: "", scope: "" };
  assert.equal(serializeQueryState({ ...empty, query: " ", region: null }), "");
  assert.deepEqual(parseQueryState(""), empty);
  assert.equal(serializeQueryState(parseQueryState("?ignored=value")), "");
});

test("initialization is defensive without a browser DOM", () => {
  assert.equal(initCatalog(null, items), null);
  assert.equal(initCatalog({}, items), null);
  assert.doesNotThrow(() => initCatalog(null, null));
});
