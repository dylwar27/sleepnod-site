#!/usr/bin/env node
// One-time migration: normalize `with-*` tags + free-form `venue` strings
// on src/content/works/*.md into typed cross-refs (`collaborators: [slug]`,
// `venueRef: slug`) against the new people/ and venues/ collections.
//
// Safe to re-run — idempotent. Rows already migrated are left alone.
//
// Modes:
//   --dry-run   (default)  print per-work mapping + audit counts, no writes
//   --write                apply changes to .md files
//   --verbose              show skipped rows too

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKS_DIR = join(__dirname, '..', 'src', 'content', 'works');
const PEOPLE_DIR = join(__dirname, '..', 'src', 'content', 'people');
const VENUES_DIR = join(__dirname, '..', 'src', 'content', 'venues');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const VERBOSE = argv.includes('--verbose');

// Tag aliases: `with-<alias>` → people slug.
// Populate from the seeded people entries, plus known typography variants.
const PEOPLE_ALIAS = {
  'petra': 'petra-zanki',
  'petra-zanki': 'petra-zanki',
  'dayna': 'dayna-hanson',
  'dayna-hanson': 'dayna-hanson',
  'cherdonna': 'cherdonna',
  'alice': 'alice-gosti',
  'alice-gosti': 'alice-gosti',
  'lars': 'lars-jan',
  'lars-jan': 'lars-jan',
  'zoe': 'zoe-juniper',
  'zoe-juniper': 'zoe-juniper',
  'jeffry-frace': 'jeffry-frace',
  'patrick-kilbane': 'patrick-kilbane',
  'kim-lusk': 'kim-lusk',
  'dccd': 'dccd',
  'fuzzy-math': 'fuzzy-math',
  'maurya-kerr': 'maurya-kerr',
};

// Venue aliases: normalized venue string → venues slug.
// Keys are lowercased + comma-split-head.
const VENUE_ALIAS = {
  'anima productions': 'anima-productions',
  'greenspace': 'greenspace',
  'base arts space': 'base-arts-space',
  'men in dance': 'men-in-dance',
  'gay city arts': 'gay-city-arts',
  'on the boards': 'on-the-boards',
  'velocity dance center': 'velocity-dance-center',
  "whim w'him": 'whim-whim',
  'whim whim': 'whim-whim',
  'bridge project': 'bridge-project',
  'nw new works': 'nw-new-works',
  '10 degrees': 'ten-degrees',
  'burning man': 'burning-man',
  'future colossal': 'future-colossal',
};

// Verify the people/venues referenced in aliases exist on disk.
const peopleFiles = new Set(readdirSync(PEOPLE_DIR).filter((f) => f.endsWith('.json')).map((f) => basename(f, '.json')));
const venueFiles = new Set(readdirSync(VENUES_DIR).filter((f) => f.endsWith('.json')).map((f) => basename(f, '.json')));

for (const slug of new Set(Object.values(PEOPLE_ALIAS))) {
  if (!peopleFiles.has(slug)) console.warn(`ALIAS WARNING: people/${slug}.json not seeded`);
}
for (const slug of new Set(Object.values(VENUE_ALIAS))) {
  if (!venueFiles.has(slug)) console.warn(`ALIAS WARNING: venues/${slug}.json not seeded`);
}

// Audit tallies.
let workCount = 0;
let peopleMatches = 0;
let venueMatches = 0;
let skipped = 0;
const unmatchedTags = new Map();   // `with-xyz` → [work slugs]
const unmatchedVenues = new Map(); // raw venue string → [work slugs]
const mutated = [];

function addUnmatched(map, key, workSlug) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(workSlug);
}

function venueKey(raw) {
  return String(raw).toLowerCase().trim().split(',')[0].trim();
}

for (const file of readdirSync(WORKS_DIR).filter((f) => f.endsWith('.md'))) {
  const workSlug = basename(file, '.md');
  const path = join(WORKS_DIR, file);
  const src = readFileSync(path, 'utf8');
  const parsed = matter(src);
  const fm = parsed.data;
  workCount++;

  let changed = false;
  const existingCollabs = new Set((fm.collaborators || []).map(String));
  const tagsIn = Array.isArray(fm.tags) ? fm.tags : [];
  const tagsOut = [];
  const newCollabs = [];

  for (const tag of tagsIn) {
    if (typeof tag !== 'string' || !tag.startsWith('with-')) {
      tagsOut.push(tag);
      continue;
    }
    const alias = tag.slice('with-'.length);
    const personSlug = PEOPLE_ALIAS[alias];
    if (personSlug && peopleFiles.has(personSlug)) {
      if (!existingCollabs.has(personSlug) && !newCollabs.includes(personSlug)) {
        newCollabs.push(personSlug);
      }
      peopleMatches++;
      // drop the tag — now represented as a ref
    } else {
      tagsOut.push(tag);
      addUnmatched(unmatchedTags, tag, workSlug);
    }
  }

  if (newCollabs.length > 0) {
    fm.collaborators = [...(fm.collaborators || []), ...newCollabs];
    fm.tags = tagsOut;
    changed = true;
  }

  // Venue: only set venueRef when unset and the venue string matches a known alias.
  if (fm.venue && !fm.venueRef) {
    const slug = VENUE_ALIAS[venueKey(fm.venue)];
    if (slug && venueFiles.has(slug)) {
      fm.venueRef = slug;
      venueMatches++;
      changed = true;
    } else {
      addUnmatched(unmatchedVenues, fm.venue, workSlug);
    }
  }

  if (!changed) {
    skipped++;
    if (VERBOSE) console.log(`· ${workSlug}  (no-op)`);
    continue;
  }

  mutated.push({ slug: workSlug, newCollabs, venueRef: fm.venueRef });

  if (WRITE) {
    const out = matter.stringify(parsed.content, fm, { lineWidth: -1 });
    writeFileSync(path, out);
  }
}

// --- Report ---

console.log(`\nMigration ${WRITE ? '(WRITE MODE)' : '(dry-run)'}`);
console.log(`  Works scanned:        ${workCount}`);
console.log(`  Rows changed:         ${mutated.length}`);
console.log(`  Tag→people matches:   ${peopleMatches}`);
console.log(`  Venue-string matches: ${venueMatches}`);
console.log(`  Unchanged:            ${skipped}\n`);

if (mutated.length > 0) {
  console.log('Changes:');
  for (const m of mutated) {
    const parts = [];
    if (m.newCollabs.length > 0) parts.push(`collaborators += [${m.newCollabs.join(', ')}]`);
    if (m.venueRef) parts.push(`venueRef = ${m.venueRef}`);
    console.log(`  · ${m.slug.padEnd(40)}  ${parts.join('; ')}`);
  }
  console.log('');
}

if (unmatchedTags.size > 0) {
  console.log('Unmatched `with-*` tags (need seed or are non-person):');
  const sorted = [...unmatchedTags.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [tag, slugs] of sorted) {
    console.log(`  ${tag.padEnd(35)} (${slugs.length})  ${slugs.slice(0, 3).join(', ')}${slugs.length > 3 ? '…' : ''}`);
  }
  console.log('');
}

if (unmatchedVenues.size > 0) {
  console.log('Unmatched venue strings:');
  const sorted = [...unmatchedVenues.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [venue, slugs] of sorted) {
    console.log(`  "${venue}"  (${slugs.length} work${slugs.length === 1 ? '' : 's'})`);
  }
  console.log('');
}

if (!WRITE) {
  console.log('DRY-RUN — no files written. Re-run with --write to apply.');
}
