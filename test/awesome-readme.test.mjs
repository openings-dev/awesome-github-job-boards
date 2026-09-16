import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const entryPattern = /^- \[([^\]]+\/[^\]]+)\]\(https:\/\/github\.com\/[^)]+\) - (.+)$/gm;
const entries = [...readme.matchAll(entryPattern)];

test('uses the approved title, badge, and objective description', () => {
  assert.match(readme, /^# Awesome GitHub Job Boards \[!\[Awesome\]\(https:\/\/awesome\.re\/badge\.svg\)\]\(https:\/\/awesome\.re\)$/m);
  assert.match(readme, /^Community-driven technology job boards hosted on GitHub\.$/m);
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

test('organizes entries across every continent represented by the catalog', () => {
  for (const section of ['Global', 'Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']) {
    assert.match(readme, new RegExp(`^## ${section}$`, 'm'));
  }
});

test('formats every entry with a sentence-cased factual description', () => {
  for (const [, repository, description] of entries) {
    assert.match(description, /^[A-Z]/, repository);
    assert.match(description, /\.$/, repository);
  }
});

test('excludes known archived, deprecated, and expired repositories', () => {
  const excluded = [
    'shintalha/New-Grad-Europe-2024',
    'HassanChowdhry/Canadian-Tech-Internships-2025',
    'fitly-work/2025-New-Grad-Jobs-USA-Hourly-Updated',
  ];
  for (const repository of excluded) assert.doesNotMatch(readme, new RegExp(repository));
});

test('links to the complete catalog and openings.dev', () => {
  assert.match(readme, /\[complete source catalog\]\(https:\/\/github\.com\/openings-dev\/data-pipeline\)/i);
  assert.match(readme, /\[openings\.dev\]\(https:\/\/openings\.dev\)/);
});
