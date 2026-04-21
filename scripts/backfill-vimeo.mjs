#!/usr/bin/env node
// scripts/backfill-vimeo.mjs
//
// Fetches all videos from the authenticated Vimeo account, matches them to
// works in src/content/works/*.md by slug/title normalization, and backfills
// vimeoId + vimeoPrivacy (and optionally year + summary when blank).
//
// Modes:
//   --dry-run   (default)  print proposed matches, no writes
//   --write                apply exact matches to .md files
//   --fuzzy                (with --write) also apply unambiguous fuzzy matches
//   --verbose              show full Vimeo descriptions in report

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKS_DIR = join(__dirname, '..', 'src', 'content', 'works');
const ENV_PATH  = join(__dirname, '..', '.env');

const argv = process.argv.slice(2);
const WRITE   = argv.includes('--write');
const FUZZY   = argv.includes('--fuzzy');
const VERBOSE = argv.includes('--verbose');

// ── Inline .env reader (no dotenv dep) ──────────────────────────────────────

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv(ENV_PATH);

const VIMEO_TOKEN = process.env.VIMEO_TOKEN;
if (!VIMEO_TOKEN) {
  console.error('error: VIMEO_TOKEN not set. Add it to .env or export it before running.');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s) {
  return String(s ?? '')
    .replace(/_/g, ' ')                          // MULTI_SEssions → spaces
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')             // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')               // strip punctuation
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function stripYear(s) {
  return s.replace(/-\d{4}$/, '');
}

// Segment-aware containment: checks needle appears as contiguous dash-segments
// in haystack (prevents "work" matching "overwork-2017" as a substring).
function segmentContains(haystack, needle) {
  if (!needle || !haystack) return false;
  const hp = haystack.split('-');
  const np = needle.split('-');
  if (np.length === 0 || hp.length < np.length) return false;
  for (let i = 0; i <= hp.length - np.length; i++) {
    if (hp.slice(i, i + np.length).every((p, j) => p === np[j])) return true;
  }
  return false;
}

function mapPrivacy(raw) {
  if (raw === 'anybody')  return 'public';
  if (raw === 'unlisted') return 'unlisted';
  return 'private';
}

// ── Vimeo API ─────────────────────────────────────────────────────────────────

const VIMEO_BASE   = 'https://api.vimeo.com';
const VIMEO_FIELDS = 'uri,name,description,privacy.view,created_time,duration';

async function fetchVimeoPage(path) {
  const res = await fetch(VIMEO_BASE + path, {
    headers: {
      Authorization: `bearer ${VIMEO_TOKEN}`,
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    },
  });
  if (res.status === 401) {
    console.error('error: Vimeo returned 401. Check VIMEO_TOKEN.');
    process.exit(1);
  }
  if (res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    const waitMs = reset ? Math.max(0, new Date(reset) - Date.now()) + 1000 : 60_000;
    console.warn(`Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s…`);
    await new Promise(r => setTimeout(r, waitMs));
    return fetchVimeoPage(path);
  }
  if (!res.ok) {
    console.error(`error: Vimeo API ${res.status} on ${path}`);
    process.exit(1);
  }
  return res.json();
}

async function fetchAllVideos() {
  const videos = [];
  let nextPath = `/me/videos?fields=${encodeURIComponent(VIMEO_FIELDS)}&per_page=100`;
  while (nextPath) {
    const data = await fetchVimeoPage(nextPath);
    for (const v of data.data ?? []) {
      const id = v.uri?.split('/').pop();
      if (!id) continue;
      videos.push({
        id,
        name: v.name ?? '',
        description: (v.description ?? '').trim(),
        privacyRaw: v.privacy?.view ?? 'anybody',
        privacy: mapPrivacy(v.privacy?.view ?? 'anybody'),
        createdYear: (v.created_time ?? '').slice(0, 4),
        duration: v.duration ?? null,
      });
    }
    // paging.next is a full path like /me/videos?page=2&...
    const next = data.paging?.next ?? null;
    nextPath = next ? next.replace(VIMEO_BASE, '') : null;
  }
  return videos;
}

// ── Load works ────────────────────────────────────────────────────────────────

function loadWorks() {
  const works = [];
  for (const file of readdirSync(WORKS_DIR).filter(f => f.endsWith('.md'))) {
    const slug = basename(file, '.md');
    const path = join(WORKS_DIR, file);
    const src  = readFileSync(path, 'utf8');
    const parsed = matter(src);
    works.push({ slug, path, src, parsed, fm: parsed.data });
  }
  return works;
}

// ── Matching ──────────────────────────────────────────────────────────────────

function matchVideo(video, works) {
  const v    = slugify(video.name);
  const vny  = stripYear(v);   // video name without year suffix
  const exactCandidates = [];
  const fuzzyCandidates = [];

  for (const work of works) {
    const ws   = work.slug;
    const wsny = stripYear(ws);
    const wt   = slugify(work.fm.title ?? '');
    const wtny = stripYear(wt);
    const wp   = work.fm.preservedTitle ? slugify(work.fm.preservedTitle) : null;

    // ── Exact tier ───────────────────────────────────────────────────────────
    if (v === ws)   { exactCandidates.push({ work, reason: 'video==slug' }); continue; }
    if (v === wsny) { exactCandidates.push({ work, reason: 'video==slug-no-year' }); continue; }
    if (v === wt)   { exactCandidates.push({ work, reason: 'video==title' }); continue; }
    if (v === wtny) { exactCandidates.push({ work, reason: 'video==title-no-year' }); continue; }
    if (vny === ws)   { exactCandidates.push({ work, reason: 'video-no-year==slug' }); continue; }
    if (vny === wsny) { exactCandidates.push({ work, reason: 'video-no-year==slug-no-year' }); continue; }
    if (wp && v === wp) { exactCandidates.push({ work, reason: 'video==preservedTitle' }); continue; }
    if (wp && vny === stripYear(wp)) { exactCandidates.push({ work, reason: 'video-no-year==preservedTitle-no-year' }); continue; }

    // ── Fuzzy tier (segment-aware contains, bidirectional) ───────────────────
    if (v.length >= 3) {
      if (segmentContains(wsny, v) || segmentContains(v, wsny))
        { fuzzyCandidates.push({ work, reason: 'contains(slug-no-year)' }); continue; }
      if (segmentContains(wtny, v) || segmentContains(v, wtny))
        { fuzzyCandidates.push({ work, reason: 'contains(title-no-year)' }); continue; }
      if (wp && (segmentContains(stripYear(wp), v) || segmentContains(v, stripYear(wp))))
        { fuzzyCandidates.push({ work, reason: 'contains(preservedTitle)' }); continue; }
    }
  }

  return { exactCandidates, fuzzyCandidates };
}

// ── Build field updates for a matched work ────────────────────────────────────

function buildUpdates(work, video) {
  const updates = {};
  const fm = work.fm;

  updates.vimeoId      = video.id;
  updates.vimeoPrivacy = video.privacy;

  if (!fm.year && video.createdYear && /^\d{4}$/.test(video.createdYear)) {
    updates.year = video.createdYear;
  }

  if (!fm.summary && video.description) {
    const flat = video.description.replace(/\s+/g, ' ').trim();
    const truncated = flat.length > 200 ? flat.slice(0, 197) + '…' : flat;
    updates.summary = `Via Vimeo: ${truncated}`;
  }

  return updates;
}

// ── Write a work file with reordered frontmatter ──────────────────────────────

const FIELD_ORDER = [
  'title', 'preservedTitle', 'year', 'medium', 'role',
  'venue', 'venueRef', 'collaborators',
  'tags', 'section', 'summary', 'featuredImage', 'gallery',
  'vimeoId', 'vimeoPrivacy', 'youtubeId', 'soundcloudUrl', 'bandcampEmbedUrl',
  'status', 'featuredOrder',
  'archivePath', 'rightsNote', 'substackUrl',
];

function writeWork(work, updates) {
  const fm = { ...work.fm, ...updates };
  const ordered = {};
  for (const key of FIELD_ORDER) {
    if (key in fm) ordered[key] = fm[key];
  }
  for (const key of Object.keys(fm)) {
    if (!(key in ordered)) ordered[key] = fm[key];
  }
  const out = matter.stringify(work.parsed.content, ordered, { lineWidth: -1 });
  writeFileSync(work.path, out);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nVimeo Backfill — ${WRITE ? 'WRITE MODE' : 'dry-run'} (${new Date().toISOString().slice(0, 10)})\n`);

  process.stdout.write('Loading works… ');
  const works = loadWorks();
  console.log(`${works.length} found`);

  process.stdout.write('Fetching Vimeo library… ');
  const videos = await fetchAllVideos();
  console.log(`${videos.length} videos\n`);

  // ── Match every video to works ──────────────────────────────────────────────

  // matchMap: video.id → { video, exactCandidates, fuzzyCandidates }
  const matchMap = new Map();
  // Track works already claimed (first video wins in write mode)
  const claimedSlugs = new Set();

  for (const video of videos) {
    const { exactCandidates, fuzzyCandidates } = matchVideo(video, works);
    matchMap.set(video.id, { video, exactCandidates, fuzzyCandidates });
  }

  // ── Collect results ─────────────────────────────────────────────────────────

  const exactMatches   = [];  // { video, work, reason }
  const fuzzyMatches   = [];  // { video, work, reason }
  const ambiguous      = [];  // { video, candidates: [...] }
  const noMatchVideos  = [];  // video (no work found)
  const writtenItems   = [];
  const skippedAlready = [];
  const skippedAmbig   = [];

  for (const [, entry] of matchMap) {
    const { video, exactCandidates, fuzzyCandidates } = entry;

    if (exactCandidates.length === 1) {
      exactMatches.push({ video, work: exactCandidates[0].work, reason: exactCandidates[0].reason });
    } else if (exactCandidates.length > 1) {
      ambiguous.push({ video, tier: 'exact', candidates: exactCandidates });
    } else if (fuzzyCandidates.length === 1) {
      fuzzyMatches.push({ video, work: fuzzyCandidates[0].work, reason: fuzzyCandidates[0].reason });
    } else if (fuzzyCandidates.length > 1) {
      ambiguous.push({ video, tier: 'fuzzy', candidates: fuzzyCandidates });
    } else {
      noMatchVideos.push(video);
    }
  }

  const noMatchWorks = works.filter(w =>
    !exactMatches.some(m => m.work.slug === w.slug) &&
    !fuzzyMatches.some(m => m.work.slug === w.slug)
  );

  // ── Report / Write ──────────────────────────────────────────────────────────

  const RULE = '─'.repeat(58);

  // Exact matches
  if (exactMatches.length > 0) {
    console.log(`── EXACT MATCHES (${exactMatches.length}) ${RULE.slice(0, 38 - String(exactMatches.length).length)}`);
    for (const m of exactMatches) {
      const alreadySet = !!m.work.fm.vimeoId;
      const tag = alreadySet ? '[already set]' : '';
      const willSet = !alreadySet
        ? `vimeoId=${m.video.id}  vimeoPrivacy=${m.video.privacy}`
        : `vimeoId=${m.work.fm.vimeoId} (unchanged)`;
      const updates = buildUpdates(m.work, m.video);
      const extras = [];
      if (!alreadySet && updates.year) extras.push(`year=${updates.year}`);
      if (!alreadySet && updates.summary) extras.push(`summary set`);

      console.log(`  MATCH  [${m.video.id}] "${m.video.name}" ${tag}`);
      console.log(`         → ${m.work.slug.padEnd(38)} [${m.reason}]`);
      if (!alreadySet) {
        process.stdout.write(`         would set: ${willSet}`);
        if (extras.length) process.stdout.write(`  + ${extras.join(', ')}`);
        console.log('');
      }
      if (VERBOSE && m.video.description) {
        console.log(`         desc: "${m.video.description.slice(0, 120)}${m.video.description.length > 120 ? '…' : ''}"`);
      }
      console.log('');

      if (WRITE) {
        if (alreadySet) {
          skippedAlready.push(m);
        } else if (!claimedSlugs.has(m.work.slug)) {
          claimedSlugs.add(m.work.slug);
          writeWork(m.work, updates);
          writtenItems.push({ ...m, updates });
        }
      }
    }
  }

  // Fuzzy matches
  if (fuzzyMatches.length > 0) {
    console.log(`── FUZZY MATCHES (${fuzzyMatches.length}) ${RULE.slice(0, 38 - String(fuzzyMatches.length).length)}`);
    for (const m of fuzzyMatches) {
      const alreadySet = !!m.work.fm.vimeoId;
      const apply = WRITE && FUZZY && !alreadySet && !claimedSlugs.has(m.work.slug);
      const flag = alreadySet ? '[already set]' : FUZZY ? '' : '(use --fuzzy to apply)';
      console.log(`  FUZZY  [${m.video.id}] "${m.video.name}" ${flag}`);
      console.log(`         → ${m.work.slug.padEnd(38)} [${m.reason}]`);
      if (VERBOSE && m.video.description) {
        console.log(`         desc: "${m.video.description.slice(0, 120)}${m.video.description.length > 120 ? '…' : ''}"`);
      }
      console.log('');

      if (WRITE && FUZZY) {
        if (alreadySet) {
          skippedAlready.push(m);
        } else if (apply) {
          claimedSlugs.add(m.work.slug);
          const updates = buildUpdates(m.work, m.video);
          writeWork(m.work, updates);
          writtenItems.push({ ...m, updates, tier: 'fuzzy' });
        }
      }
    }
  }

  // Ambiguous
  if (ambiguous.length > 0) {
    console.log(`── AMBIGUOUS (${ambiguous.length}) ─ manual assignment required ────────────────────`);
    for (const a of ambiguous) {
      console.log(`  AMBIG  [${a.video.id}] "${a.video.name}" (${a.tier})`);
      for (const c of a.candidates) {
        console.log(`         candidate: ${c.work.slug}  [${c.reason}]`);
      }
      if (WRITE) skippedAmbig.push(a);
      console.log('');
    }
  }

  // Unmatched videos
  if (noMatchVideos.length > 0) {
    console.log(`── UNMATCHED VIDEOS (${noMatchVideos.length}) ─ potential new works to seed ─────────────`);
    for (const v of noMatchVideos) {
      const priv = v.privacy !== 'public' ? ` [${v.privacy}]` : '';
      console.log(`  NOMATCH  [${v.id}] "${v.name}" (${v.createdYear})${priv}`);
      if (VERBOSE && v.description) {
        console.log(`           "${v.description.slice(0, 100)}${v.description.length > 100 ? '…' : ''}"`);
      }
    }
    console.log('');
  }

  // Unmatched works
  if (noMatchWorks.length > 0) {
    console.log(`── UNMATCHED WORKS (${noMatchWorks.length}) ─ no Vimeo video found ───────────────────`);
    for (const w of noMatchWorks) {
      const hasId = w.fm.vimeoId ? ` [vimeoId=${w.fm.vimeoId}]` : '';
      console.log(`  NOMATCH  ${w.slug.padEnd(42)}  "${w.fm.title ?? ''}"${hasId}`);
    }
    console.log('');
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log(`── SUMMARY ${'─'.repeat(48)}`);
  console.log(`  Videos fetched:           ${videos.length}`);
  console.log(`  Exact matches:            ${exactMatches.length}`);
  console.log(`  Fuzzy matches (unambig):  ${fuzzyMatches.length}`);
  console.log(`  Ambiguous:                ${ambiguous.length}`);
  console.log(`  Unmatched videos:         ${noMatchVideos.length}`);
  console.log(`  Unmatched works:          ${noMatchWorks.length}`);

  if (WRITE) {
    console.log(`\n  Written:                  ${writtenItems.length}`);
    for (const w of writtenItems) {
      const extras = [];
      if (w.updates.year)    extras.push(`year=${w.updates.year}`);
      if (w.updates.summary) extras.push('summary');
      const extraStr = extras.length ? `  +${extras.join(', ')}` : '';
      console.log(`    ✓ ${w.work.slug.padEnd(40)} ← [${w.video.id}] "${w.video.name}"${extraStr}`);
    }
    if (skippedAlready.length) {
      console.log(`\n  Skipped (already had vimeoId): ${skippedAlready.length}`);
    }
    if (skippedAmbig.length) {
      console.log(`  Skipped (ambiguous):           ${skippedAmbig.length}`);
    }
  } else {
    console.log(`\nDRY-RUN — no files written.`);
    if (exactMatches.length > 0) console.log(`  Re-run with --write to apply ${exactMatches.length} exact match${exactMatches.length === 1 ? '' : 'es'}.`);
    if (fuzzyMatches.length > 0) console.log(`  Add --fuzzy to also apply ${fuzzyMatches.length} fuzzy match${fuzzyMatches.length === 1 ? '' : 'es'}.`);
  }
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
