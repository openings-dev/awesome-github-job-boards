import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("catalog layout provides accessible landmarks and local assets", async () => {
  const layout = await read("_layouts/catalog.html");

  assert.match(layout, /<!doctype html>/iu);
  assert.match(layout, /<html\s+lang="en"/u);
  assert.match(layout, /<a[^>]+href="#main-content"[^>]*>[^<]*skip/iu);
  for (const landmark of ["header", "nav", "main", "footer"]) {
    assert.match(layout, new RegExp(`<${landmark}\\b`, "u"));
  }
  assert.match(layout, /<main[^>]+id="main-content"/u);
  assert.match(layout, /\{%\s*seo\s*%\}/u);
  assert.match(layout, /['"]\/assets\/css\/catalog\.css['"]\s*\|\s*relative_url/u);
  assert.match(layout, /<script[^>]+type="module"[^>]+src="\{\{\s*['"]\/assets\/js\/catalog\.mjs['"]\s*\|\s*relative_url\s*\}\}"/u);
  assert.doesNotMatch(layout, /on(?:click|input|change)\s*=/iu);
});

test("catalog page exposes the data bootstrap and one primary heading", async () => {
  const page = await read("index.html");

  assert.match(page, /^---[\s\S]*?layout:\s*catalog[\s\S]*?title:\s*Catalog[\s\S]*?---/u);
  assert.equal(page.match(/<h1\b/gu)?.length, 1);
  assert.match(page, /data-catalog-root/u);
  assert.match(page, /<script[^>]+type="application\/json"[^>]+id="catalog-data"[^>]+data-catalog-data/u);
  assert.match(page, /site\.data\.catalog\s*\|\s*jsonify\s*\|\s*replace:\s*['"]<\/['"],\s*['"]<\\\/['"]/u);
  assert.match(page, /https:\/\/openings\.dev/u);
  assert.match(page, /site\.data\.catalog\.generatedAt/u);
  assert.match(page, /<dt>Last updated<\/dt>/u);
});

test("navigation and footer distinguish the source catalog from current vacancies", async () => {
  const layout = await read("_layouts/catalog.html");

  assert.match(layout, /href="https:\/\/github\.com\/\{\{ site\.repository \}\}#readme"[^>]*>[^<]*README/iu);
  assert.match(layout, /href="https:\/\/openings\.dev"[^>]*>[^<]*(?:current jobs|openings\.dev)/iu);
  assert.match(layout, /href="https:\/\/github\.com\/\{\{ site\.repository \}\}\/blob\/main\/CONTRIBUTING\.md"[^>]*>[^<]*Contribut/iu);
  assert.match(layout, /href="https:\/\/github\.com\/\{\{ site\.repository \}\}\/blob\/main\/LICENSE"[^>]*>[^<]*License/iu);
  assert.match(layout, /source catalog/iu);
  assert.match(layout, /current (?:job )?(?:openings|vacancies)/iu);
});

test("escaped catalog JSON cannot terminate its script element and remains parseable", () => {
  const payload = { repositories: [{ description: "</script><script>alert(1)</script>" }] };
  const rendered = JSON.stringify(payload).replaceAll("</", "<\\/");

  assert.doesNotMatch(rendered, /<\/script/iu);
  assert.deepEqual(JSON.parse(rendered), payload);
});

test("filter controls have visible labels and match the catalog module hooks", async () => {
  const filters = await read("_includes/catalog-filters.html");

  assert.match(filters, /<fieldset\b/u);
  assert.match(filters, /<legend\b[^>]*>[^<]+<\/legend>/u);
  for (const id of ["catalog-search", "catalog-region", "catalog-country", "catalog-locale", "catalog-scope"]) {
    assert.match(filters, new RegExp(`<label[^>]+for="${id}"[^>]*>`, "u"));
    assert.match(filters, new RegExp(`<(?:input|select)[^>]+id="${id}"`, "u"));
  }
  for (const filter of ["region", "country", "locale", "scope"]) {
    assert.match(filters, new RegExp(`data-catalog-filter="${filter}"`, "u"));
  }
  assert.match(filters, /data-catalog-search/u);
  assert.match(filters, /data-catalog-clear/u);
});

test("results include live count, semantic card template, and initial states", async () => {
  const results = await read("_includes/catalog-results.html");

  assert.match(results, /data-catalog-summary/u);
  assert.match(results, /id="catalog-count"[^>]+data-catalog-count[^>]+aria-live="polite"/u);
  assert.match(results, /data-catalog-results/u);
  assert.match(results, /<template[^>]+id="catalog-card-template"[^>]+data-catalog-card-template/u);
  assert.match(results, /<article\b/u);
  for (const field of ["repository", "description", "region", "country", "locale", "scope"]) {
    assert.match(results, new RegExp(`data-catalog-field="${field}"`, "u"));
  }
  assert.match(results, /data-catalog-link/u);
  assert.match(results, /data-catalog-empty[^>]+hidden/u);
  assert.match(results, /data-catalog-error[^>]+hidden/u);
  assert.match(results, /data-catalog-empty[\s\S]*data-catalog-clear/u);
  assert.match(results, /data-catalog-empty[\s\S]*CONTRIBUTING\.md/iu);
  assert.match(results, /data-catalog-error[\s\S]*#readme/iu);
  assert.match(results, /data-catalog-error[\s\S]*https:\/\/openings\.dev/iu);
});

test("results render navigable catalog cards before JavaScript initializes", async () => {
  const results = await read("_includes/catalog-results.html");
  const containerStart = results.indexOf("data-catalog-results>");
  const containerEnd = results.indexOf('<div class="catalog-state"', containerStart);
  const container = results.slice(containerStart, containerEnd);

  assert.ok(containerStart >= 0 && containerEnd > containerStart, "expected server-rendered content inside the results container");
  assert.match(container, /\{%\s*for\s+item\s+in\s+site\.data\.catalog\.repositories\s*%\}/u);
  assert.match(container, /\{\{\s*item\.repository\s*\|\s*escape\s*\}\}/u);
  assert.match(container, /href="\{\{\s*item\.url\s*\|\s*escape\s*\}\}"/u);
  assert.match(container, /\{%\s*if\s+item\.description\s*%\}/u);
  assert.match(container, /\{%\s*endfor\s*%\}/u);
});

test("site configuration uses the canonical project metadata without a theme", async () => {
  const config = await read("_config.yml");

  assert.match(config, /^title:\s*["']?Awesome GitHub Job Boards["']?$/mu);
  assert.match(config, /^description:\s*["']?Community-driven technology job boards hosted on GitHub\.["']?$/mu);
  assert.match(config, /^url:\s*["']?https:\/\/openings-dev\.github\.io["']?$/mu);
  assert.match(config, /^baseurl:\s*["']?\/awesome-github-job-boards["']?$/mu);
  assert.match(config, /^repository:\s*["']?openings-dev\/awesome-github-job-boards["']?$/mu);
  assert.match(config, /plugins:\s*\n\s*- jekyll-seo-tag/u);
  assert.match(config, /markdown:\s*["']?kramdown["']?/u);
  assert.match(config, /input:\s*GFM/u);
  for (const path of ["node_modules", "test", "scripts", "src", "docs", "Gemfile", "Gemfile.lock"]) {
    assert.match(config, new RegExp(`\\s- ${path.replace(".", "\\.")}(?:\\s|$)`, "u"));
  }
  assert.doesNotMatch(config, /(?:^|\s)theme:/u);
  assert.doesNotMatch(config, /jekyll-relative-links/u);
  assert.doesNotMatch(config, /defaults:/u);
  assert.doesNotMatch(config, /cayman/iu);
});

test("catalog stylesheet provides responsive layout and accessibility safeguards", async () => {
  const css = await read("assets/css/catalog.css");

  assert.match(css, /:root\s*\{/u);
  assert.match(css, /max-width:\s*1180px/u);
  assert.match(css, /repeat\(auto-fit,\s*minmax\(/u);
  assert.match(css, /repeat\(auto-fill,\s*minmax\(/u);
  assert.match(css, /\.site-header nav,\s*\.site-footer nav\s*\{[^}]*display:\s*flex[^}]*gap:/su);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/su);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
  assert.doesNotMatch(css, /@import/u);
});

test("focus ring token has at least 3:1 contrast against white", async () => {
  const css = await read("assets/css/catalog.css");
  const token = css.match(/--focus-ring:\s*(#[0-9a-f]{6})/iu)?.[1];
  assert.ok(token, "expected a six-digit --focus-ring color token");

  const luminance = (hex) => {
    const channels = hex.slice(1).match(/.{2}/gu).map((value) => Number.parseInt(value, 16) / 255);
    const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const contrast = (luminance("#ffffff") + 0.05) / (luminance(token) + 0.05);
  assert.ok(contrast >= 3, `expected ${token} to have at least 3:1 contrast against white, got ${contrast}`);
});
