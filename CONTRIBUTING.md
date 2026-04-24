# Contributing

Thanks for helping improve Awesome GitHub Issues Job Boards.

This repository curates public GitHub repositories where developer jobs are posted, tracked, or indexed. The ideal entry is a community job board powered directly by GitHub Issues.

## What Belongs Here

A good entry should:

- Be a public GitHub repository.
- Publish jobs directly through GitHub Issues, or maintain a GitHub-native job board/list with clear job links.
- Belong to a developer community, language ecosystem, regional tech group, open-source project, or transparent job-tracking initiative.
- Be useful to job seekers, with recent enough activity or a clear archive value.
- Have a clear geographic or global scope.

Entries that usually do not belong:

- Closed-source job platforms with no GitHub-native job data.
- Personal bookmarking lists without curation.
- Company-only career pages unless they are intentionally run as an open GitHub job board.
- Repositories with spam, unclear ownership, or mostly unrelated issues.

## Entry Format

Add new entries to `README.md` under the correct region and country.

Use this format:

```markdown
- [owner/repository](https://github.com/owner/repository) - scope; locale.
```

Accepted scopes:

- `global`
- `national`
- `regional`
- `city`

Examples:

```markdown
- [frontendbr/vagas](https://github.com/frontendbr/vagas) - national; pt-BR.
- [developersRJ/vagas](https://github.com/developersRJ/vagas) - city; pt-BR.
```

## Suggested Metadata

When opening an issue or pull request, include:

```yaml
repository: owner/repository
url: https://github.com/owner/repository
country: Country
countryCode: CC
region: Region
locale: en-US
scope: national
evidence: https://github.com/owner/repository/issues
```

## Pull Request Checklist

Before opening a pull request:

- Confirm the repository URL works.
- Confirm the repository is public.
- Confirm jobs are visible through Issues or clear GitHub-hosted job links.
- Put the entry under the right region and country.
- Keep entries sorted alphabetically by `owner/repository` inside each country.
- Avoid duplicate entries.
- Keep descriptions short and factual.

## Source Catalog

This list is aligned with the openings.dev source catalog. If a contribution should also be consumed by openings.dev, it may need a corresponding update in the data catalog repository.

## Conduct

By contributing, you agree to follow the project [Code of Conduct](CODE_OF_CONDUCT.md).
