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

class FakeElement {
  constructor(ownerDocument, { dataset = {}, value = "" } = {}) {
    this.ownerDocument = ownerDocument;
    this.dataset = dataset;
    this.value = value;
    this.textContent = "";
    this.hidden = false;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
  }

  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  dispatch(type) { this.listeners[type]?.({ type, preventDefault() {} }); }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() { this.focused = true; }
}

class FakeFragment {
  constructor(ownerDocument) {
    this.fields = [
      new FakeElement(ownerDocument, { dataset: { catalogField: "repository" } }),
      new FakeElement(ownerDocument, { dataset: { catalogField: "description" } }),
    ];
    this.link = new FakeElement(ownerDocument, { dataset: { catalogLink: "" } });
    this.link.href = "";
  }

  querySelectorAll(selector) {
    if (selector === "[data-catalog-field]") return this.fields;
    if (selector === "[data-catalog-link]") return [this.link];
    return [];
  }
}

function fakeCatalogDom() {
  const ownerDocument = { createElement: () => new FakeElement(ownerDocument) };
  const controls = Object.fromEntries(
    ["query", "region", "country", "locale", "scope"]
      .map((key) => [key, new FakeElement(ownerDocument)]),
  );
  const elements = Object.fromEntries(
    ["results", "count", "empty", "error", "clear"]
      .map((key) => [key, new FakeElement(ownerDocument)]),
  );
  elements.template = {
    content: { cloneNode: () => new FakeFragment(ownerDocument) },
  };
  const root = {
    querySelector(selector) {
      if (selector.includes("catalog-search")) return controls.query;
      for (const key of ["region", "country", "locale", "scope"]) {
        if (selector.includes(`catalog-filter=\"${key}\"`)) return controls[key];
      }
      if (selector.includes("catalog-card-template")) return elements.template;
      for (const key of ["results", "template", "count", "empty", "error", "clear"]) {
        if (selector.includes(`catalog-${key}`)) return elements[key];
      }
      return null;
    },
  };
  return { controls, elements, root };
}

test("initializes and drives the catalog DOM without treating data as HTML", () => {
  const { controls, elements, root } = fakeCatalogDom();
  elements.results.children.push({ serverRenderedFallback: true });
  const hostile = {
    ...items[0],
    repository: "<img src=x onerror=alert(1)>",
    description: "<strong>not markup</strong>",
    url: "https://github.com/acme/jobs",
  };
  const calls = [];
  const oldLocation = globalThis.location;
  const oldHistory = globalThis.history;
  globalThis.location = { search: "?country=Brazil", pathname: "/boards", hash: "#catalog" };
  globalThis.history = { replaceState: (...args) => calls.push(args) };

  try {
    const controller = initCatalog(root, [hostile, items[1], items[2]]);
    assert.equal(typeof controller.render, "function");
    assert.deepEqual(controls.country.children.map(({ value }) => value), ["Brazil", "Canada", "Global"]);
    assert.equal(controls.country.value, "Brazil");
    assert.equal(elements.count.textContent, "1");
    assert.equal(elements.count.attributes["aria-live"], "polite");
    assert.equal(elements.results.children.length, 1);
    assert.equal(elements.results.children.some(({ serverRenderedFallback }) => serverRenderedFallback), false);
    assert.equal(elements.results.children[0].fields[0].textContent, hostile.repository);
    assert.equal(elements.results.children[0].fields[1].textContent, hostile.description);
    assert.equal(elements.results.children[0].link.href, hostile.url);
    assert.equal("innerHTML" in elements.results.children[0].fields[0], false);

    controls.query.value = "canada";
    controls.query.dispatch("input");
    assert.equal(elements.count.textContent, "0");
    assert.equal(elements.empty.hidden, false);
    assert.equal(calls.at(-1)[2], "/boards?query=canada&country=Brazil#catalog");

    controls.country.value = "Canada";
    controls.country.dispatch("change");
    assert.equal(elements.count.textContent, "1");
    assert.equal(elements.empty.hidden, true);
    assert.equal(calls.at(-1)[2], "/boards?query=canada&country=Canada#catalog");

    elements.clear.dispatch("click");
    assert.deepEqual(Object.values(controls).map(({ value }) => value), ["", "", "", "", ""]);
    assert.equal(elements.count.textContent, "3");
    assert.equal(calls.at(-1)[2], "/boards#catalog");
    assert.equal(controls.query.focused, true);
  } finally {
    if (oldLocation === undefined) delete globalThis.location;
    else globalThis.location = oldLocation;
    if (oldHistory === undefined) delete globalThis.history;
    else globalThis.history = oldHistory;
  }
});

test("shows an error state for an invalid catalog", () => {
  const { elements, root } = fakeCatalogDom();
  elements.count.textContent = "187";
  assert.equal(initCatalog(root, { repositories: null }), null);
  assert.equal(elements.error.hidden, false);
  assert.equal(elements.empty.hidden, true);
  assert.equal(elements.results.hidden, true);
  assert.equal(elements.count.textContent, "0");
});
