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

function repositoryName(value) {
  const repository = text(value, "repository name");
  const match = repository.match(/^([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)$/u);
  if (!match || match[2] === "." || match[2] === "..") throw new Error(`Invalid repository: ${repository}`);
  return { repository, owner: match[1], name: match[2] };
}

function githubUrl(value, repository) {
  const rawUrl = text(value, "repository URL");
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid GitHub URL: ${rawUrl}`);
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password ||
      url.search || url.hash || ![`/${repository}`, `/${repository}/`].some((path) => path.toLowerCase() === url.pathname.toLowerCase())) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return `https://github.com/${repository}`;
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

function compareCodePoints(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
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
    const { repository, owner, name } = repositoryName(item.repository);
    const duplicateKey = repository.toLowerCase();
    if (seen.has(duplicateKey)) throw new Error(`Duplicate repository: ${repository}`);
    seen.add(duplicateKey);
    if (item.owner !== undefined && text(item.owner, "repository owner") !== owner) {
      throw new Error(`Repository owner does not match repository: ${repository}`);
    }
    if (item.name !== undefined && text(item.name, "repository name") !== name) {
      throw new Error(`Repository name does not match repository: ${repository}`);
    }
    const region = text(item.region, "region");
    if (!REGION_ORDER.includes(region)) throw new Error(`Invalid region: ${region}`);
    const scope = text(item.scope, "scope");
    if (!["global", "national", "regional", "city"].includes(scope)) throw new Error(`Invalid scope: ${scope}`);
    const description = optionalDescription(item.description);
    const countryCode = text(item.countryCode, "country code");
    if (!/^(?:GLOBAL|[A-Z]{2})$/u.test(countryCode)) throw new Error(`Invalid country code: ${countryCode}`);
    const locale = text(item.locale, "locale");
    if (!/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/u.test(locale)) {
      throw new Error(`Invalid locale: ${locale}`);
    }
    const normalized = {
      repository,
      owner,
      name,
      url: githubUrl(item.url, repository),
      ...(description ? { description: text(description, "description") } : {}),
      country: text(item.country, "country"),
      countryCode,
      region,
      locale,
      scope,
    };
    return normalized;
  });
  repositories.sort((left, right) =>
    regionRank(left.region) - regionRank(right.region) ||
    left.region.localeCompare(right.region, "en") ||
    compareCountries(left.country, right.country) ||
    left.repository.localeCompare(right.repository, "en", { sensitivity: "base" }) ||
    compareCodePoints(left.repository, right.repository));
  return { generatedAt, repositories };
}

export function serializeCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}
