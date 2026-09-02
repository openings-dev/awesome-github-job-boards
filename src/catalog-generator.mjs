const REGION_ORDER = [
  "Global",
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
];

function record(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${name}`);
  return Object.fromEntries(Object.entries(value));
}

function text(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid ${name}`);
  return value.trim();
}

function markdown(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function sentenceCase(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function regionRank(region) {
  const rank = REGION_ORDER.indexOf(region);
  return rank === -1 ? REGION_ORDER.length : rank;
}

function compareCountries(left, right) {
  if (left === "Global") return right === "Global" ? 0 : -1;
  if (right === "Global") return 1;
  return left.localeCompare(right, "en");
}

export function parseCatalog(value) {
  const source = record(value, "catalog");
  const generatedAt = text(source.generatedAt, "catalog date");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(generatedAt) || Number.isNaN(Date.parse(`${generatedAt}T00:00:00Z`))) {
    throw new Error("Invalid catalog date");
  }
  if (!Array.isArray(source.repositories)) throw new Error("Invalid repositories");
  const seen = new Set();
  const repositories = source.repositories.map((value) => {
    const item = record(value, "repository");
    const repository = text(item.repository, "repository name");
    const duplicateKey = repository.toLowerCase();
    if (seen.has(duplicateKey)) throw new Error(`Duplicate repository: ${repository}`);
    seen.add(duplicateKey);
    const url = new URL(text(item.url, "repository URL"));
    if (url.protocol !== "https:" || url.hostname !== "github.com") throw new Error(`Invalid GitHub URL: ${url}`);
    return {
      repository,
      url: url.toString(),
      country: text(item.country, "country"),
      region: text(item.region, "region"),
      locale: text(item.locale, "locale"),
      scope: text(item.scope, "scope"),
    };
  });
  repositories.sort((left, right) =>
    regionRank(left.region) - regionRank(right.region) ||
    left.region.localeCompare(right.region, "en") ||
    compareCountries(left.country, right.country) ||
    left.repository.localeCompare(right.repository, "en", { sensitivity: "base" }));
  return { generatedAt, repositories };
}

export function renderCatalog(catalog) {
  const lines = [];
  let currentRegion = "";
  let currentCountry = "";
  for (const item of catalog.repositories) {
    if (item.region !== currentRegion) {
      currentRegion = item.region;
      currentCountry = "";
      if (lines.length) lines.push("");
      lines.push(`### ${markdown(item.region)}`, "");
    }
    if (item.country !== currentCountry) {
      currentCountry = item.country;
      if (lines.at(-1) !== "") lines.push("");
      lines.push(`#### ${markdown(item.country)}`, "");
    }
    lines.push(`- [${markdown(item.repository)}](${item.url}) - ${markdown(sentenceCase(item.scope))} · ${markdown(item.locale)}.`);
  }
  return `${lines.join("\n").trim()}\n`;
}

export function renderReadme(template, catalog) {
  for (const placeholder of ["{{TOTAL}}", "{{GENERATED_AT}}", "{{CATALOG}}"] ) {
    if (!template.includes(placeholder)) throw new Error(`Missing template placeholder ${placeholder}`);
  }
  return template
    .replaceAll("{{TOTAL}}", String(catalog.repositories.length))
    .replaceAll("{{GENERATED_AT}}", catalog.generatedAt)
    .replace("{{CATALOG}}", renderCatalog(catalog))
    .replace(/\s+$/u, "\n");
}
