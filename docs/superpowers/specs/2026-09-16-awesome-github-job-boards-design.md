# Awesome GitHub Job Boards: Rename and Catalog Design

## Summary

Rename the repository from `awesome-github-issues-job-boards` to
`awesome-github-job-boards` and separate its two responsibilities:

1. A manually curated Awesome List in `README.md` that is eligible for
   submission to the main Awesome project.
2. A complete, searchable GitHub Pages catalog generated from the openings.dev
   public source data.

The README is the editorial artifact. The website is the discovery tool. The
repository must not generate or overwrite the curated README.

## Goals

- Follow the current requirements for submission to the main Awesome list.
- Give the project a shorter, clearer name that retains the required
  `awesome-*` convention and distinguishes it from generic job-board lists.
- Turn the GitHub Pages site into a useful catalog with search and filters.
- Preserve all known sources in the full catalog without presenting every
  source as an editorial recommendation.
- Keep the site static, fast, accessible, and inexpensive to maintain.
- Preserve openings.dev as the destination for searching individual job
  openings.

## Non-goals

- Displaying or searching individual job openings on this site.
- Replacing openings.dev.
- Introducing a server, database, or JavaScript application framework.
- Automatically selecting entries for the curated README.
- Making the README and full catalog contain the same set of sources.

## Naming

### Repository slug

`awesome-github-job-boards`

### README title

`Awesome GitHub Job Boards`

### Short description

`Community-driven technology job boards hosted on GitHub.`

### Rationale

The name follows the required lowercase `awesome-name-of-list` repository
format. Removing `issues` makes the name shorter and avoids restricting the
project to one GitHub feature. Keeping `github` identifies the project's
specific territory and differentiates it from existing generic Awesome Job
Boards lists. `Job boards` describes the curated items more accurately than
`jobs`, which could imply a list of individual vacancies.

## Content Model

### Curated README

The README will contain approximately 30 to 50 sources. Selection is manual and
based on:

- recent, meaningful activity;
- jobs being published or organized through GitHub-hosted content;
- clear documentation for candidates or employers;
- a consistent history without spam;
- relevance to a technology community;
- geographic and technological diversity.

The README will follow the Awesome submission conventions, including:

- an Awesome badge;
- a succinct, objective description of the topic;
- a first section named `Contents`;
- consistent entry descriptions;
- an appropriate Creative Commons license;
- contribution guidelines;
- a logo or illustration when an appropriate asset is available;
- validation with `awesome-lint`.

The README is never generated. Automation may validate it but may not rewrite
or select its entries.

### Full catalog

The website contains all sources accepted into the openings.dev source catalog,
including sources that do not meet the stricter editorial threshold for the
README. Each record supports:

- repository owner and name;
- GitHub URL;
- concise description when available;
- region;
- country;
- locale or language;
- geographic scope;
- catalog status and update metadata when available.

The public website must make the distinction between inclusion in the complete
catalog and editorial selection for the README explicit.

## Site Experience

### Header

The header contains the project name, the short objective description, and
links to:

- the curated README;
- openings.dev for searching individual vacancies;
- the contribution flow for suggesting or correcting a source.

### Catalog summary

The page displays the total number of sources, represented countries, locales,
and the catalog's last update date. Values are calculated from the catalog data
rather than maintained manually.

### Search and filters

The catalog supports instant client-side search across repository owner,
repository name, and description. Users can additionally filter by:

- region;
- country;
- locale or language;
- geographic scope.

Active filters are represented in the URL query string. Opening or sharing that
URL restores the same view. A single action clears all filters.

### Results

Results use compact, responsive cards. Each card contains the repository name,
description when available, country or region, locale, geographic scope, and a
direct GitHub link. Results use a stable, documented ordering and may be grouped
by country when no search query makes grouping distracting.

### Empty and failure states

When filters produce no results, the interface explains the condition and
offers actions to clear filters or suggest a missing source. If the catalog data
cannot be loaded or parsed, the page shows a concise failure state with links to
the curated README and openings.dev. It must not present an empty catalog as a
successful result.

### Footer

The footer links to the methodology, contribution guidelines, license, and
openings.dev. It explains that the site catalogs source communities while
openings.dev searches current vacancies.

## Visual Direction

The site will use a custom Jekyll layout rather than `jekyll-theme-cayman`. Its
visual hierarchy should feel like a maintained open-source directory, not a
marketing landing page. The design will use restrained openings.dev brand cues,
strong typography, compact metadata, clear focus states, and high information
density without visual clutter.

The layout must work at mobile and desktop widths, meet WCAG AA color contrast,
support keyboard navigation, respect reduced-motion preferences, and remain
usable without decorative assets.

## Technical Architecture

### Files and responsibilities

- `README.md`: manually curated Awesome List.
- `_config.yml`: Jekyll metadata and build configuration only.
- `_data/catalog.json`: generated full catalog consumed by the site.
- `index.html`: catalog page entry point.
- `_layouts/catalog.html`: overall site document and layout.
- `_includes/`: reusable header, summary, filters, result-card, empty-state, and
  footer fragments where Liquid rendering is useful.
- `assets/css/`: custom responsive styles and design tokens.
- `assets/js/`: dependency-free client-side search, filtering, query-string
  synchronization, and failure-state behavior.
- `scripts/`: data generation and validation utilities.
- `test/`: generator, schema, filtering, URL-state, and validation tests.

### Data flow

1. The scheduled workflow checks out the public openings.dev catalog.
2. The generator validates and normalizes source records.
3. The generator writes `_data/catalog.json` in a deterministic order.
4. Tests reject missing required values, invalid values, and duplicates.
5. The workflow commits only catalog data changes.
6. GitHub Pages builds the custom Jekyll site.
7. The browser applies search and filters to the embedded or loaded catalog.

The workflow must never generate `README.md`.

### Publishing

GitHub Pages remains the hosting platform. The canonical project URL changes to
the path associated with `awesome-github-job-boards`. Repository metadata,
package metadata, internal links, workflow labels, and documentation are updated
as part of the rename. Old URLs are audited during implementation, and any
redirect behavior provided by GitHub is treated as migration assistance rather
than a permanent dependency.

## Validation and Testing

Automated checks will cover:

- catalog input schema and required fields;
- duplicate repository detection;
- deterministic normalization and ordering;
- generation of summary counts;
- text search behavior;
- each filter independently and in combination;
- query-string serialization and restoration;
- empty and malformed-data states;
- keyboard-visible controls and semantic labels where practical;
- `awesome-lint` compliance for the README;
- absence of generated-content markers in the README;
- broken internal links introduced by the repository rename.

A production build of the Jekyll site must succeed before publication. The
result must also receive a manual responsive and keyboard-navigation review.

## Migration Sequence

1. Create the custom site structure and generated catalog data path.
2. Replace automatic README generation with catalog data generation.
3. Rewrite the README as the curated Awesome List.
4. Add validation for both the editorial README and complete catalog.
5. Update the Creative Commons license if the current license is incompatible.
6. Update all repository, package, workflow, and documentation references.
7. Rename the GitHub repository to `awesome-github-job-boards`.
8. Verify the new GitHub Pages URL and audit old inbound links.
9. Allow the list to satisfy all age and quality requirements before submitting
   it to the main Awesome repository.

## Success Criteria

- The README contains a manually maintained selection of 30 to 50 qualifying
  sources and passes `awesome-lint`.
- The complete catalog remains available and searchable on GitHub Pages.
- Users can combine filters, share a filtered URL, and recover the same state.
- The site clearly distinguishes source discovery from searching current jobs.
- No scheduled automation modifies the curated README.
- The production site is responsive, keyboard accessible, and handles empty or
  invalid data visibly.
- The repository and title use `awesome-github-job-boards` consistently.

