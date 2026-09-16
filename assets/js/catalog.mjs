const STATE_KEYS = ["query", "region", "country", "locale", "scope"];
const FILTER_KEYS = ["region", "country", "locale", "scope"];
const EMPTY_STATE = Object.freeze(Object.fromEntries(STATE_KEYS.map((key) => [key, ""])));

// Stable DOM contract for the catalog page. Task 3 only needs to add these hooks.
const HOOKS = Object.freeze({
  search: "[data-catalog-search], #catalog-search",
  filters: Object.freeze(Object.fromEntries(FILTER_KEYS.map((key) => [
    key,
    `[data-catalog-filter=\"${key}\"], #catalog-${key}`,
  ]))),
  results: "[data-catalog-results], #catalog-results",
  template: "template[data-catalog-card-template], #catalog-card-template",
  count: "[data-catalog-count], #catalog-count",
  empty: "[data-catalog-empty], #catalog-empty",
  error: "[data-catalog-error], #catalog-error",
  clear: "[data-catalog-clear], #catalog-clear",
});

const text = (value) => typeof value === "string" ? value : "";

function normalizedState(state = EMPTY_STATE) {
  return Object.fromEntries(STATE_KEYS.map((key) => [key, text(state?.[key])]));
}

export function filterCatalog(items, state = EMPTY_STATE) {
  if (!Array.isArray(items)) return [];
  const filters = normalizedState(state);
  const query = filters.query.trim().toLocaleLowerCase();

  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    if (FILTER_KEYS.some((key) => filters[key] && item[key] !== filters[key])) return false;
    if (!query) return true;

    return [item.repository, item.owner, item.name, item.description]
      .some((value) => text(value).toLocaleLowerCase().includes(query));
  });
}

export function getFilterOptions(items) {
  const catalog = Array.isArray(items) ? items : [];
  return Object.fromEntries(FILTER_KEYS.map((key) => {
    const values = catalog.map((item) => text(item?.[key])).filter(Boolean);
    return [key, [...new Set(values)].sort((left, right) => left.localeCompare(right))];
  }));
}

export function parseQueryState(value = "") {
  let parameters;
  try {
    parameters = value instanceof URLSearchParams
      ? value
      : new URLSearchParams(typeof value === "string" ? value.replace(/^\?/u, "") : "");
  } catch {
    parameters = new URLSearchParams();
  }
  return Object.fromEntries(STATE_KEYS.map((key) => [key, parameters.get(key) ?? ""]));
}

export function serializeQueryState(state = EMPTY_STATE) {
  const parameters = new URLSearchParams();
  for (const key of STATE_KEYS) {
    const value = text(state?.[key]).trim();
    if (value) parameters.set(key, value);
  }
  return parameters.toString();
}

function setVisible(element, visible) {
  if (element) element.hidden = !visible;
}

function setCardData(fragment, item) {
  if (!fragment?.querySelectorAll) return;
  for (const element of fragment.querySelectorAll("[data-catalog-field]")) {
    const field = element.dataset.catalogField;
    element.textContent = text(item[field]);
    if ((field === "url" || element.dataset.catalogHref === "true") && "href" in element) {
      element.href = text(item.url);
    }
  }
  for (const link of fragment.querySelectorAll("[data-catalog-link]")) link.href = text(item.url);
}

function appendOption(select, value) {
  const option = select.ownerDocument.createElement("option");
  option.value = value;
  option.textContent = value;
  select.append(option);
}

function readControlState(controls) {
  return Object.fromEntries(STATE_KEYS.map((key) => [key, controls[key]?.value ?? ""]));
}

function writeControlState(controls, state) {
  for (const key of STATE_KEYS) if (controls[key]) controls[key].value = text(state[key]);
}

export function initCatalog(root, catalog) {
  if (!root?.querySelector) return null;
  const controls = {
    query: root.querySelector(HOOKS.search),
    ...Object.fromEntries(FILTER_KEYS.map((key) => [key, root.querySelector(HOOKS.filters[key])])),
  };
  const elements = {
    results: root.querySelector(HOOKS.results),
    template: root.querySelector(HOOKS.template),
    count: root.querySelector(HOOKS.count),
    empty: root.querySelector(HOOKS.empty),
    error: root.querySelector(HOOKS.error),
    clear: root.querySelector(HOOKS.clear),
  };
  const repositories = Array.isArray(catalog) ? catalog : catalog?.repositories;
  if (!Array.isArray(repositories)) {
    setVisible(elements.error, true);
    setVisible(elements.empty, false);
    setVisible(elements.results, false);
    return null;
  }
  setVisible(elements.error, false);
  elements.count?.setAttribute?.("aria-live", "polite");

  const options = getFilterOptions(repositories);
  for (const key of FILTER_KEYS) {
    const select = controls[key];
    if (!select?.append || !select.ownerDocument?.createElement) continue;
    for (const value of options[key]) appendOption(select, value);
  }
  const currentSearch = typeof location === "object" ? location.search : "";
  writeControlState(controls, parseQueryState(currentSearch));

  const render = () => {
    const state = readControlState(controls);
    const matches = filterCatalog(repositories, state);
    if (elements.results?.replaceChildren) {
      elements.results.replaceChildren();
      if (elements.template?.content?.cloneNode) {
        for (const item of matches) {
          const card = elements.template.content.cloneNode(true);
          setCardData(card, item);
          elements.results.append(card);
        }
      }
    }
    if (elements.count) elements.count.textContent = String(matches.length);
    setVisible(elements.empty, matches.length === 0);
    setVisible(elements.results, true);
    if (typeof history === "object" && history?.replaceState) {
      const query = serializeQueryState(state);
      const pathname = typeof location === "object" ? location.pathname : "";
      const hash = typeof location === "object" ? location.hash : "";
      history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}${hash}`);
    }
    return matches;
  };

  controls.query?.addEventListener?.("input", render);
  for (const key of FILTER_KEYS) controls[key]?.addEventListener?.("change", render);
  elements.clear?.addEventListener?.("click", () => {
    writeControlState(controls, EMPTY_STATE);
    render();
    controls.query?.focus?.();
  });
  render();
  return { render };
}

function autoInit() {
  const root = document.querySelector("[data-catalog-root]");
  const bootstrap = document.querySelector("script[data-catalog-data][type=\"application/json\"]");
  if (!root || !bootstrap) return;
  try {
    initCatalog(root, JSON.parse(bootstrap.textContent || "null"));
  } catch {
    initCatalog(root, null);
  }
}

if (typeof document !== "undefined") autoInit();
