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

function githubUrl(value) {
  const rawUrl = text(value, "repository URL");
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid GitHub URL: ${rawUrl}`);
  }
  if (url.protocol !== "https:" || url.host !== "github.com" || url.username || url.password) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return url.toString();
}

function optionalDescription(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("Invalid description");
  return value.trim() || undefined;
}

function regionRank(region) {
  return REGION_ORDER.indexOf(region);
}

function compareCountries(left, right) {
  if (left === "Global") return right === "Global" ? 0 : -1;
  if (right === "Global") return 1;
  return left.localeCompare(right, "en");
}

export function parseCatalog(value) {
  const source = record(value, "catalog");
  const generatedAt = text(source.generatedAt, "catalog date");
  const parsedDate = new Date(`${generatedAt}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(generatedAt) ||
      Number.isNaN(parsedDate.valueOf()) ||
      parsedDate.toISOString().slice(0, 10) !== generatedAt) {
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
    const repositoryParts = repository.split("/");
    const fallbackOwner = repositoryParts.length === 2 ? repositoryParts[0] : undefined;
    const fallbackName = repositoryParts.length === 2 ? repositoryParts[1] : undefined;
    const region = text(item.region, "region");
    if (!REGION_ORDER.includes(region)) throw new Error(`Invalid region: ${region}`);
    const scope = text(item.scope, "scope");
    if (!["global", "national", "regional", "city"].includes(scope)) throw new Error(`Invalid scope: ${scope}`);
    const description = optionalDescription(item.description);
    const normalized = {
      repository,
      owner: text(item.owner ?? fallbackOwner, "repository owner"),
      name: text(item.name ?? fallbackName, "repository name"),
      url: githubUrl(item.url),
      ...(description ? { description: text(description, "description") } : {}),
      country: text(item.country, "country"),
      countryCode: text(item.countryCode, "country code"),
      region,
      locale: text(item.locale, "locale"),
      scope,
    };
    return normalized;
  });
  repositories.sort((left, right) =>
    regionRank(left.region) - regionRank(right.region) ||
    left.region.localeCompare(right.region, "en") ||
    compareCountries(left.country, right.country) ||
    left.repository.localeCompare(right.repository, "en", { sensitivity: "base" }));
  return { generatedAt, repositories };
}

export function serializeCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}
