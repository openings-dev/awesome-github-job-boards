import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');
const regions = ['Global', 'Africa', 'Asia', 'Europe', 'North America', 'South America'];
const entryPattern = /^- \[([^\]]+\/[^\]]+)\]\(https:\/\/github\.com\/([^/)]+\/[^/)]+)\) - (.+)$/;

function sectionBody(name) {
  const start = readme.indexOf(`## ${name}\n`);
  assert.notEqual(start, -1, `missing ${name} section`);
  const next = readme.indexOf('\n## ', start + 1);
  return readme.slice(start, next === -1 ? readme.length : next);
}

const entriesByRegion = new Map(regions.map((region) => {
  const lines = sectionBody(region).split('\n').filter((line) => line.startsWith('- '));
  const entries = lines.map((line) => {
    const match = line.match(entryPattern);
    assert.ok(match, `invalid entry in ${region}: ${line}`);
    const [, repository, path, description] = match;
    assert.equal(repository, path, `label and URL differ for ${repository}`);
    return { repository, url: `https://github.com/${path}`, description, line };
  });
  return [region, entries];
}));
const entries = [...entriesByRegion.values()].flat();

test('uses the approved title, badge, and objective description', () => {
  assert.match(readme, /^# Awesome GitHub Job Boards \[!\[Awesome\]\(https:\/\/awesome\.re\/badge\.svg\)\]\(https:\/\/awesome\.re\)$/m);
  assert.match(readme, /^> Community-driven technology job boards hosted on GitHub\.$/m);
});

test('places Contents first and keeps contribution material outside it', () => {
  const headings = [...readme.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.equal(headings[0], 'Contents');
  const contents = readme.slice(readme.indexOf('## Contents'), readme.indexOf('\n## ', readme.indexOf('## Contents') + 1));
  assert.doesNotMatch(contents, /Contributing|Footnotes/);
});

test('contains a focused manual selection of 30 to 50 GitHub entries', () => {
  assert.ok(entries.length >= 30 && entries.length <= 50, `found ${entries.length} entries`);
  assert.doesNotMatch(readme, /generated from|generated section|do not edit entries|AI-generated/i);
});

test('keeps every listed region populated and alphabetically ordered', () => {
  for (const [region, regionalEntries] of entriesByRegion) {
    assert.ok(regionalEntries.length > 0, `${region} is empty`);
    const repositories = regionalEntries.map(({ repository }) => repository);
    const sorted = [...repositories].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    assert.deepEqual(repositories, sorted, `${region} is not alphabetized`);
  }
});

test('uses unique repository labels and URLs throughout the editorial list', () => {
  const repositories = entries.map(({ repository }) => repository.toLowerCase());
  const urls = entries.map(({ url }) => url.toLowerCase());
  assert.equal(new Set(repositories).size, repositories.length);
  assert.equal(new Set(urls).size, urls.length);

  const editorialBody = readme.slice(readme.indexOf('## Global'), readme.indexOf('## Contributing'));
  const editorialListLines = editorialBody.split('\n').filter((line) => line.startsWith('- '));
  assert.deepEqual(editorialListLines, entries.map(({ line }) => line));
});

test('formats every entry with a sentence-cased factual description', () => {
  for (const { repository, description } of entries) {
    assert.match(description, /^[A-Z]/, repository);
    assert.match(description, /\.$/, repository);
  }
});

test('excludes known archived, deprecated, and expired repositories', () => {
  const excluded = [
    'shintalha/New-Grad-Europe-2024',
    'HassanChowdhry/Canadian-Tech-Internships-2025',
    'fitly-work/2025-New-Grad-Jobs-USA-Hourly-Updated',
    'AusJobs/Australia-Tech-Internship',
  ];
  for (const repository of excluded) assert.doesNotMatch(readme, new RegExp(repository));
});

test('links to the complete catalog and openings.dev', () => {
  assert.match(readme, /\[complete source catalog\]\(https:\/\/github\.com\/openings-dev\/data-pipeline\)/i);
  assert.match(readme, /\[openings\.dev\]\(https:\/\/openings\.dev\)/);
});

test('uses the complete CC0 1.0 Universal legal code without a README license section', () => {
  assert.match(license, /^Creative Commons Legal Code\n\nCC0 1\.0 Universal\n/);
  assert.match(license, /Statement of Purpose/);
  assert.match(license, /1\. Copyright and Related Rights\./);
  assert.match(license, /2\. Waiver\./);
  assert.match(license, /3\. Public License Fallback\./);
  assert.match(license, /4\. Limitations and Disclaimers\./);
  assert.doesNotMatch(license, /MIT License/);
  assert.doesNotMatch(readme, /^## License$/m);
  assert.equal(
    createHash('sha256').update(license).digest('hex'),
    'a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499',
  );
});
