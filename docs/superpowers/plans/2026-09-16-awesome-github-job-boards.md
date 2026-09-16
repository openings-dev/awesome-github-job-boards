# Awesome GitHub Job Boards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename and restructure the repository so a manually curated Awesome List coexists with a complete, searchable GitHub Pages catalog.

**Architecture:** The data pipeline is normalized into `_data/catalog.json`, while `README.md` remains a hand-maintained editorial artifact. Jekyll renders a custom static catalog shell and dependency-free browser JavaScript performs search, filtering, URL-state synchronization, and summary calculation.

**Tech Stack:** Node.js 20 test runner and generators, Jekyll/GitHub Pages, Liquid, semantic HTML, modern CSS, vanilla ECMAScript modules, `awesome-lint` 2.3.

---

## File Map

- `src/catalog-generator.mjs`: validate and normalize upstream catalog records.
- `scripts/generate-catalog.mjs`: write normalized data to `_data/catalog.json` only.
- `test/catalog-generator.test.mjs`: generator schema, duplicate, optional-field, and deterministic-order tests.
- `assets/js/catalog.mjs`: pure search/filter/query-state functions plus guarded browser initialization.
- `test/catalog-ui.test.mjs`: pure unit tests for catalog interaction behavior.
- `_data/catalog.json`: generated full source catalog.
- `index.html`: Liquid-rendered catalog content and data bootstrap.
- `_layouts/catalog.html`: document shell, metadata, skip link, header, and footer.
- `_includes/catalog-filters.html`: labeled search and filter controls.
- `_includes/catalog-results.html`: result count, card template, empty state, and failure state.
- `assets/css/catalog.css`: accessible responsive visual system.
- `_config.yml`: site identity, canonical repository values, plugins, and exclusions.
- `README.md`: manual 30–50-item Awesome List.
- `CONTRIBUTING.md`: separate editorial nomination and complete-catalog contribution paths.
- `SUBMISSIONS.md`: full-catalog eligibility and source-request instructions.
- `LICENSE`: CC0-1.0 text required for Awesome-list eligibility.
- `package.json`: renamed package and test/generation/lint scripts.
- `Gemfile`: reproducible GitHub Pages/Jekyll build dependencies.
- `.github/workflows/update-catalog.yml`: update generated catalog data without touching README.
- `.github/workflows/validate.yml`: test, Awesome lint, and Jekyll build validation.
- `.github/ISSUE_TEMPLATE/*.yml`: updated terminology and canonical links.

### Task 1: Replace README generation with catalog-data generation

**Files:**
- Modify: `src/catalog-generator.mjs`
- Create: `scripts/generate-catalog.mjs`
- Delete: `scripts/generate-readme.mjs`
- Delete: `templates/README.md`
- Modify: `test/catalog-generator.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Rewrite generator tests around normalized JSON output**

Replace README-rendering tests with tests that import `parseCatalog` and
`serializeCatalog`. Include records containing `owner`, `name`, `countryCode`,
and an optional `description`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { parseCatalog, serializeCatalog } from "../src/catalog-generator.mjs";

const catalog = {
  generatedAt: "2026-09-02",
  repositories: [
    {
      repository: "beta/jobs",
      owner: "beta",
      name: "jobs",
      url: "https://github.com/beta/jobs",
      description: "Jobs shared by the Beta developer community.",
      country: "Brazil",
      countryCode: "BR",
      region: "South America",
      locale: "pt-BR",
      scope: "national",
    },
    {
      repository: "alpha/roles",
      owner: "alpha",
      name: "roles",
      url: "https://github.com/alpha/roles",
      country: "Global",
      countryCode: "GLOBAL",
      region: "Global",
      locale: "en",
      scope: "global",
    },
  ],
};

test("normalizes catalog records and preserves optional descriptions", () => {
  const parsed = parseCatalog(catalog);
  assert.equal(parsed.repositories[0].repository, "alpha/roles");
  assert.equal(parsed.repositories[1].description, "Jobs shared by the Beta developer community.");
  assert.equal(parsed.repositories[0].description, undefined);
});

test("serializes normalized data deterministically", () => {
  const first = serializeCatalog(parseCatalog(catalog));
  const second = serializeCatalog(parseCatalog(catalog));
  assert.equal(first, second);
  assert.equal(first.endsWith("\n"), true);
});
```

Retain explicit rejection tests for duplicate repository names, invalid dates,
non-GitHub URLs, missing required fields, invalid scope, and invalid region.

- [ ] **Step 2: Run the generator tests and verify the new API is missing**

Run: `node --test test/catalog-generator.test.mjs`

Expected: FAIL because `serializeCatalog` is not exported and normalized fields
are not yet returned.

- [ ] **Step 3: Implement the normalized catalog contract**

Update `parseCatalog` to return only public site fields and validate controlled
values:

```js
const VALID_REGIONS = new Set(REGION_ORDER);
const VALID_SCOPES = new Set(["global", "national", "regional", "city"]);

function optionalText(value, name) {
  if (value === undefined || value === null || value === "") return undefined;
  return text(value, name);
}

// Inside the repository mapping:
const region = text(item.region, "region");
const scope = text(item.scope, "scope");
if (!VALID_REGIONS.has(region)) throw new Error(`Invalid region: ${region}`);
if (!VALID_SCOPES.has(scope)) throw new Error(`Invalid scope: ${scope}`);
return {
  repository,
  owner: text(item.owner ?? repository.split("/")[0], "owner"),
  name: text(item.name ?? repository.split("/")[1], "name"),
  url: url.toString(),
  description: optionalText(item.description, "description"),
  country: text(item.country, "country"),
  countryCode: text(item.countryCode, "country code"),
  region,
  locale: text(item.locale, "locale"),
  scope,
};
```

Export deterministic serialization:

```js
export function serializeCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}
```

Remove `renderCatalog`, `renderReadme`, and Markdown-only helper functions.

- [ ] **Step 4: Add the data-only generator script**

Create `scripts/generate-catalog.mjs`:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCatalog, serializeCatalog } from "../src/catalog-generator.mjs";

const root = process.cwd();
const inputPath = path.resolve(
  process.argv[2] ?? process.env.OPENINGS_CATALOG_PATH ??
  "../data-pipeline/src/modules/catalog/repositories.json",
);
const outputPath = path.join(root, "_data", "catalog.json");
const next = serializeCatalog(parseCatalog(JSON.parse(await readFile(inputPath, "utf8"))));
const current = await readFile(outputPath, "utf8").catch(() => "");

await mkdir(path.dirname(outputPath), { recursive: true });
if (current === next) {
  console.log("Catalog data is already current.");
} else {
  await writeFile(outputPath, next);
  console.log("Catalog data updated.");
}
```

Change the package script to `"generate": "node scripts/generate-catalog.mjs"`.
Remove `scripts/generate-readme.mjs` and `templates/README.md` with `apply_patch`.

- [ ] **Step 5: Generate data and run tests**

Run: `npm run generate -- ../data-pipeline/src/modules/catalog/repositories.json`

Expected: `_data/catalog.json` is created and reports `Catalog data updated.`

Run: `npm test`

Expected: all generator tests PASS.

- [ ] **Step 6: Commit the data boundary**

```bash
git add src/catalog-generator.mjs scripts/generate-catalog.mjs test/catalog-generator.test.mjs package.json _data/catalog.json
git add -u scripts/generate-readme.mjs templates/README.md
git commit -m "refactor: generate catalog data instead of readme"
```

### Task 2: Implement search, filters, and shareable URL state

**Files:**
- Create: `assets/js/catalog.mjs`
- Create: `test/catalog-ui.test.mjs`

- [ ] **Step 1: Write failing tests for pure catalog behavior**

Create fixtures and tests for normalization, combined filters, case-insensitive
search, available filter options, empty results, and query strings:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  filterCatalog,
  getFilterOptions,
  parseQueryState,
  serializeQueryState,
} from "../assets/js/catalog.mjs";

const items = [
  { repository: "frontendbr/vagas", owner: "frontendbr", name: "vagas", description: "Brazilian frontend roles", region: "South America", country: "Brazil", locale: "pt-BR", scope: "national", url: "https://github.com/frontendbr/vagas" },
  { repository: "pythonjobs/jobs", owner: "pythonjobs", name: "jobs", region: "Global", country: "Global", locale: "en", scope: "global", url: "https://github.com/pythonjobs/jobs" },
];

test("combines text and facet filters", () => {
  assert.deepEqual(
    filterCatalog(items, { query: "frontend", region: "South America", country: "Brazil", locale: "pt-BR", scope: "national" }),
    [items[0]],
  );
});

test("round-trips non-empty query state", () => {
  const state = { query: "python", region: "Global", country: "", locale: "en", scope: "global" };
  assert.deepEqual(parseQueryState(serializeQueryState(state)), state);
});

test("returns unique sorted filter options", () => {
  assert.deepEqual(getFilterOptions(items).locale, ["en", "pt-BR"]);
});
```

- [ ] **Step 2: Verify the UI unit tests fail**

Run: `node --test test/catalog-ui.test.mjs`

Expected: FAIL because `assets/js/catalog.mjs` does not exist.

- [ ] **Step 3: Implement pure search and URL functions**

Export these stable functions:

```js
const EMPTY_STATE = { query: "", region: "", country: "", locale: "", scope: "" };

export function filterCatalog(items, state) {
  const query = state.query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const haystack = [item.repository, item.owner, item.name, item.description]
      .filter(Boolean).join(" ").toLocaleLowerCase();
    return (!query || haystack.includes(query)) &&
      (!state.region || item.region === state.region) &&
      (!state.country || item.country === state.country) &&
      (!state.locale || item.locale === state.locale) &&
      (!state.scope || item.scope === state.scope);
  });
}

export function serializeQueryState(state) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) if (value) params.set(key, value);
  return params.toString();
}

export function parseQueryState(value) {
  const params = value instanceof URLSearchParams ? value : new URLSearchParams(value);
  return Object.fromEntries(Object.keys(EMPTY_STATE).map((key) => [key, params.get(key) ?? ""]));
}
```

Implement `getFilterOptions(items)` with unique locale-aware sorted values for
`region`, `country`, `locale`, and `scope`.

- [ ] **Step 4: Implement guarded browser initialization**

Add `initCatalog(root, catalog)` and only auto-run when `document` exists. The
initializer must populate selects, restore `window.location.search`, listen to
the search input and selects, update `history.replaceState`, clone a semantic
card `<template>`, toggle empty/failure states, update the live result count,
and clear all controls from the clear button.

Use `textContent` and property assignment for record values. Do not construct
HTML strings from catalog data.

- [ ] **Step 5: Run all Node tests**

Run: `npm test`

Expected: generator and UI tests PASS.

- [ ] **Step 6: Commit catalog behavior**

```bash
git add assets/js/catalog.mjs test/catalog-ui.test.mjs
git commit -m "feat: add searchable catalog behavior"
```

### Task 3: Build the custom GitHub Pages catalog

**Files:**
- Create: `index.html`
- Create: `_layouts/catalog.html`
- Create: `_includes/catalog-filters.html`
- Create: `_includes/catalog-results.html`
- Create: `assets/css/catalog.css`
- Modify: `_config.yml`
- Create: `Gemfile`

- [ ] **Step 1: Add a structural site test**

Create `test/site-structure.test.mjs` that reads the source files and asserts
the accessibility and data hooks required by the JavaScript:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("catalog source exposes accessible controls and states", async () => {
  const [layout, filters, results, index] = await Promise.all([
    readFile("_layouts/catalog.html", "utf8"),
    readFile("_includes/catalog-filters.html", "utf8"),
    readFile("_includes/catalog-results.html", "utf8"),
    readFile("index.html", "utf8"),
  ]);
  assert.match(layout, /class="skip-link"/u);
  assert.match(filters, /<label[^>]+for="catalog-search"/u);
  assert.match(results, /aria-live="polite"/u);
  assert.match(results, /<template id="catalog-card-template">/u);
  assert.match(index, /site\.data\.catalog \| jsonify/u);
});
```

- [ ] **Step 2: Verify the structural test fails**

Run: `node --test test/site-structure.test.mjs`

Expected: FAIL because the site files do not exist.

- [ ] **Step 3: Create the Jekyll shell and content entry point**

`_layouts/catalog.html` must include a skip link, `{% seo %}`, stylesheet,
semantic header/main/footer landmarks, `{{ content }}`, and the module script.
`index.html` must have front matter and safely expose catalog JSON:

```html
---
layout: catalog
title: Catalog
---
<section class="catalog-intro" aria-labelledby="catalog-title">
  <p class="eyebrow">Community-maintained source directory</p>
  <h1 id="catalog-title">Find job boards hosted on GitHub</h1>
  <p>Search communities and repositories. For current openings, visit <a href="https://openings.dev">openings.dev</a>.</p>
</section>
{% include catalog-filters.html %}
{% include catalog-results.html %}
<script type="application/json" id="catalog-data">{{ site.data.catalog | jsonify }}</script>
```

The JavaScript initializer must parse `#catalog-data` inside a `try/catch` and
show the failure state on malformed content.

- [ ] **Step 4: Create filters and results includes**

Use native `<input type="search">`, four labeled `<select>` elements, a clear
`<button>`, a result count with `aria-live="polite"`, an initially empty results
container, and a reusable `<template>`. Include separate hidden empty and error
states. Every control needs a visible label; placeholder text is not a label.

- [ ] **Step 5: Implement the responsive visual system**

Define custom properties for background, surface, text, muted text, accent,
border, focus ring, spacing, radii, and shadows. Implement:

- a centered `min(1180px, calc(100% - 2rem))` content width;
- a compact header and high-contrast introductory band;
- a responsive filter grid using `repeat(auto-fit, minmax(10rem, 1fr))`;
- cards using `repeat(auto-fill, minmax(min(100%, 19rem), 1fr))`;
- `:focus-visible` outlines with at least a two-pixel visible ring;
- `[hidden] { display: none !important; }`;
- a single-column mobile treatment below 640px;
- a `prefers-reduced-motion: reduce` rule that removes transitions.

Do not use remote fonts, icon libraries, or decorative JavaScript.

- [ ] **Step 6: Replace Cayman configuration**

Set the canonical metadata:

```yaml
title: "Awesome GitHub Job Boards"
description: "Community-driven technology job boards hosted on GitHub."
url: "https://openings-dev.github.io"
baseurl: "/awesome-github-job-boards"
repository: "openings-dev/awesome-github-job-boards"
plugins:
  - jekyll-seo-tag
markdown: "kramdown"
kramdown:
  input: GFM
exclude:
  - node_modules/
  - test/
  - scripts/
  - src/
  - docs/
  - Gemfile
  - Gemfile.lock
```

Remove `theme`, `jekyll-relative-links`, and the default page layout rule.

- [ ] **Step 7: Add reproducible local Jekyll dependencies**

Create `Gemfile`:

```ruby
source "https://rubygems.org"
gem "github-pages", group: :jekyll_plugins
```

Run: `bundle install`

Expected: dependencies install and `Gemfile.lock` is created.

Run: `bundle exec jekyll build --strict_front_matter`

Expected: site builds successfully into `_site/`.

- [ ] **Step 8: Run tests and commit the site**

Run: `npm test`

Expected: all tests PASS.

```bash
git add index.html _layouts _includes assets/css _config.yml Gemfile Gemfile.lock test/site-structure.test.mjs
git commit -m "feat: build searchable job board catalog"
```

### Task 4: Convert the README into a compliant editorial Awesome List

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SUBMISSIONS.md`
- Modify: `LICENSE`
- Modify: `package.json`
- Create: `assets/logo.svg` only if a reviewed project illustration is available

- [ ] **Step 1: Add Awesome-list validation tooling**

Add `awesome-lint` version `2.3.0` as a development dependency and scripts:

```json
{
  "scripts": {
    "generate": "node scripts/generate-catalog.mjs",
    "test": "node --test test/*.test.mjs",
    "lint:awesome": "awesome-lint",
    "verify": "npm test && npm run lint:awesome"
  },
  "devDependencies": {
    "awesome-lint": "2.3.0"
  }
}
```

Run: `npm install`

Expected: `package-lock.json` is updated with `awesome-lint@2.3.0`.

- [ ] **Step 2: Write the manual README structure**

Replace the generated directory with this editorial structure:

```markdown
# Awesome GitHub Job Boards [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> Community-driven technology job boards hosted on GitHub.

## Contents

- [Global](#global)
- [Africa](#africa)
- [Asia](#asia)
- [Europe](#europe)
- [North America](#north-america)
- [Oceania](#oceania)
- [South America](#south-america)

## Global

<!-- Manually reviewed entries in alphabetical order. -->

## Africa

<!-- Manually reviewed entries in alphabetical order. -->

## Asia

<!-- Manually reviewed entries in alphabetical order. -->

## Europe

<!-- Manually reviewed entries in alphabetical order. -->

## North America

<!-- Manually reviewed entries in alphabetical order. -->

## Oceania

<!-- Manually reviewed entries in alphabetical order. -->

## South America

<!-- Manually reviewed entries in alphabetical order. -->

## Contributing

Read the [contribution guidelines](CONTRIBUTING.md) before proposing an entry.

## Footnotes

Browse the [complete source catalog](https://openings-dev.github.io/awesome-github-job-boards/) or search [current job openings](https://openings.dev).
```

Populate 30–50 entries selected using the approved criteria. Every entry must
have a factual description beginning with an uppercase character and ending in
a period. Confirm activity and documentation manually; do not choose entries by
stars alone and do not copy the generated catalog wholesale.

- [ ] **Step 3: Align contribution documentation with the two tiers**

Document two explicit routes:

1. Nominate an active, documented, community-relevant source for the curated
   README through a pull request with evidence for the editorial criteria.
2. Submit any qualifying public source to the full openings.dev catalog through
   the source request form.

State that catalog inclusion does not guarantee README inclusion. Remove all
instructions implying that README entries are generated or that contributors
should edit generated regional sections.

- [ ] **Step 4: Replace MIT with CC0-1.0**

Replace `LICENSE` with the complete CC0 1.0 Universal legal text from
`https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt`. Do not place
license prose or a License section in the README.

- [ ] **Step 5: Run Awesome lint and correct every actionable error**

Run: `npm run lint:awesome`

Expected: exit code 0. If repository-age or remote-name validation cannot pass
before the GitHub rename, record that exact transient failure in the migration
checklist; do not suppress formatting, description, contents, or license rules.

Run: `npm test`

Expected: all tests PASS and no test expects README generation.

- [ ] **Step 6: Commit the editorial list**

```bash
git add README.md CONTRIBUTING.md SUBMISSIONS.md LICENSE package.json package-lock.json assets/logo.svg
git commit -m "docs: curate awesome github job boards list"
```

Omit `assets/logo.svg` from the command if no reviewed illustration is added.

### Task 5: Update automation without allowing README writes

**Files:**
- Modify: `.github/workflows/update-catalog.yml`
- Create: `.github/workflows/validate.yml`
- Modify: `.github/PULL_REQUEST_TEMPLATE.md`
- Modify: `.github/ISSUE_TEMPLATE/add-job-board.yml`
- Modify: `.github/ISSUE_TEMPLATE/report-problem.yml`
- Modify: `.github/ISSUE_TEMPLATE/config.yml`

- [ ] **Step 1: Add a regression test for workflow boundaries**

Extend `test/site-structure.test.mjs`:

```js
test("scheduled automation updates catalog data, never README", async () => {
  const workflow = await readFile(".github/workflows/update-catalog.yml", "utf8");
  assert.match(workflow, /_data\/catalog\.json/u);
  assert.doesNotMatch(workflow, /git add README\.md/u);
  assert.doesNotMatch(workflow, /generate-readme/u);
});
```

- [ ] **Step 2: Verify the workflow test fails**

Run: `node --test test/site-structure.test.mjs`

Expected: FAIL because the workflow still stages `README.md`.

- [ ] **Step 3: Update the scheduled catalog workflow**

Keep the current checkout and Node setup, run `npm ci`, `npm test`, and
`npm run generate -- .catalog-data/src/modules/catalog/repositories.json`.
Change the diff guard and commit scope to `_data/catalog.json`:

```yaml
- name: Commit changed catalog
  run: |
    if git diff --quiet -- _data/catalog.json; then
      echo "Catalog is already current."
      exit 0
    fi
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git add _data/catalog.json
    git commit -m "data: refresh job board catalog"
    git push
```

- [ ] **Step 4: Add pull-request validation**

Create `.github/workflows/validate.yml` triggered by `pull_request` and pushes to
`main`. It must check out code, set up Node 20, run `npm ci`, `npm test`, and
`npm run lint:awesome`, then set up Ruby with Bundler caching and run
`bundle exec jekyll build --strict_front_matter`.

- [ ] **Step 5: Update templates and links**

Use “Awesome GitHub Job Boards” consistently. The pull request checklist must
ask whether the change targets the curated README or site code. Issue templates
for complete-catalog additions must continue sending users to the openings.dev
source request form instead of implying automatic README inclusion.

- [ ] **Step 6: Run tests and commit automation**

Run: `npm test`

Expected: all tests PASS, including the no-README-write assertion.

```bash
git add .github test/site-structure.test.mjs
git commit -m "ci: validate awesome list and catalog site"
```

### Task 6: Apply canonical naming and prepare the remote rename

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: all tracked text files containing the old name

- [ ] **Step 1: Add a stale-name validation test**

Create `scripts/check-canonical-name.mjs` that calls `git ls-files -z`, reads
text files, excludes the historical design and implementation documents, and
fails when a tracked project file contains
`awesome-github-issues-job-boards` or `Awesome GitHub Issues Job Boards`.
Add `"lint:name": "node scripts/check-canonical-name.mjs"` to `package.json`
and include it in `verify`.

- [ ] **Step 2: Verify stale references are reported**

Run: `npm run lint:name`

Expected: FAIL and list `_config.yml`, package metadata, or documentation that
still uses the old name.

- [ ] **Step 3: Update canonical references**

Change the package name to `@openings-dev/awesome-github-job-boards`. Update all
repository paths, page URLs, human-readable titles, and descriptions outside
the historical design documents. Use `rg -n 'awesome-github-issues-job-boards|Awesome GitHub Issues Job Boards'` to inspect every match before editing it.

- [ ] **Step 4: Run the canonical-name and full verification suites**

Run: `npm run lint:name`

Expected: PASS.

Run: `npm run verify`

Expected: all Node tests, name checks, and Awesome lint checks PASS, except only
an explicitly documented remote-name check that requires the GitHub rename.

Run: `bundle exec jekyll build --strict_front_matter`

Expected: PASS.

- [ ] **Step 5: Commit canonical naming**

```bash
git add package.json package-lock.json scripts/check-canonical-name.mjs README.md CONTRIBUTING.md SUBMISSIONS.md _config.yml .github
git commit -m "chore: adopt awesome github job boards name"
```

- [ ] **Step 6: Rename the GitHub repository after local checks pass**

In GitHub repository settings, rename
`openings-dev/awesome-github-issues-job-boards` to
`openings-dev/awesome-github-job-boards`. This is an external administrative
step and must not be simulated locally.

After renaming, update the local remote explicitly:

```bash
git remote set-url origin git@github.com:openings-dev/awesome-github-job-boards.git
git remote -v
```

Expected: fetch and push URLs both name `awesome-github-job-boards`.

### Task 7: Final verification and publication audit

**Files:**
- Modify only files required by failures found during verification

- [ ] **Step 1: Run the complete local verification**

Run: `npm run verify`

Expected: PASS with no skipped Node tests and `awesome-lint` exit code 0.

Run: `bundle exec jekyll build --strict_front_matter`

Expected: PASS with no invalid front matter or missing includes.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 2: Preview and manually test the production build**

Run: `bundle exec jekyll serve --baseurl /awesome-github-job-boards`

Verify at the local preview URL:

- search matches repository, owner, name, and optional description;
- region, country, locale, and scope filters work independently and together;
- clear filters restores all results;
- reloading and sharing a filtered URL restores state;
- no-results and malformed-data states are distinct;
- every control is reachable and visibly focused by keyboard;
- mobile layout works at 320 CSS pixels without horizontal scrolling;
- the current-jobs call to action goes to openings.dev;
- the README and contribution links resolve.

- [ ] **Step 3: Verify the deployed project URL after pushing**

Open `https://openings-dev.github.io/awesome-github-job-boards/` and repeat the
search, shared-URL, and internal-link smoke tests. Confirm the old Pages URL is
not used by any tracked project file.

- [ ] **Step 4: Verify repository metadata for Awesome submission**

Confirm the default branch is `main`, the GitHub topics include `awesome` and
`awesome-list`, the visible description is objective, the CC0 license is
detected, and the repository has been public for at least 30 days before opening
the upstream submission.

- [ ] **Step 5: Commit any verification-only corrections**

If verification required edits:

```bash
git add <only-the-corrected-files>
git commit -m "fix: complete catalog publication audit"
```

If no files changed, do not create an empty commit.

