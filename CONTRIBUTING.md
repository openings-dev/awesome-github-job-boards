# Contributing

There are two ways to suggest a GitHub job board. Choose the path that matches your goal.

## Nominate a Board for the Editorial List

Open a pull request that adds one entry to `README.md`. A nomination should provide evidence that the repository:

- Has recent, meaningful activity or a clearly maintained posting workflow.
- Hosts technology jobs directly on GitHub, through Issues or a documented repository list.
- Documents how employers or community members submit and maintain listings.
- Applies its publishing rules consistently.
- Serves a defined technology community, geography, or role category.
- Improves the list's geographic, linguistic, community, or technology diversity.

Use this exact format:

```markdown
- [owner/repository](https://github.com/owner/repository) - Objective factual description.
```

Place the entry under the correct continent and sort entries alphabetically by `owner/repository`, case-insensitively. In the pull request, link to evidence for activity, GitHub-hosted jobs, and contributor documentation. Keep the description conservative, start it with an uppercase letter, and end it with a period.

## Request Addition to the Complete Catalog

Browse the [openings.dev community directory](https://openings.dev/communities/) when a source belongs in the broader catalog but is not yet a strong fit for this editorial list. To propose a missing source, use the source request link available there and include the repository URL, geographic scope, language, and an explanation of how listings are published.

Catalog inclusion does not guarantee inclusion in the README. The catalog records eligible sources broadly; the README is a smaller editorial selection.

## Pull Request Checklist

- Confirm the repository is public and the URL works.
- Confirm it is not archived, deprecated, duplicated, or tied to an expired hiring season.
- Verify the evidence against the criteria above.
- Preserve the entry format and alphabetical ordering.
- Run `npm run verify`.

## Conduct

By contributing, you agree to follow the project [Code of Conduct](CODE_OF_CONDUCT.md).
