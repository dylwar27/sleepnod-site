#!/usr/bin/env node
// One-shot import from SleepNod_Catalog_of_Works.xlsx → src/content/works/*.md
//
// After a successful `--write`, this script and its `xlsx` devDep should be
// archived / removed. The CMS (or `/admin`, or the .md files themselves) is
// then authoritative. Re-runs are not supported.
//
// Modes:
//   --inspect                    print sheet names, column headers, row counts. No writes.
//   --dry-run                    full import simulation; prints per-row mapping. No writes. (default)
//   --write                      actually emit .md files under src/content/works/.
//   --only-status=pub,feat       only import rows with status in that set (comma-separated).
//                                Default imports ALL Works. Every imported Work lands as
//                                `status: draft` regardless — the /admin page is the promotion gate.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Flags ---
const argv = process.argv.slice(2);
const args = new Set(argv);
const INSPECT = args.has('--inspect');
const WRITE = args.has('--write');
const DRY = !WRITE;

const onlyStatusArg = argv.find((a) => a.startsWith('--only-status='));
const ONLY_STATUS = onlyStatusArg
  ? new Set(onlyStatusArg.split('=')[1].split(',').map((s) => s.toLowerCase().trim()))
  : null;

const XLSX_PATH = process.env.SLEEPNOD_XLSX
  || join(homedir(), 'Library/CloudStorage/Dropbox/OLD/SleepNod_Catalog_of_Works.xlsx');

const WORKS_DIR = join(__dirname, '..', 'src', 'content', 'works');
const REPORT_PATH = join(__dirname, '..', 'xlsx-import-report.txt');

if (!existsSync(XLSX_PATH)) {
  console.error(`xlsx not found at ${XLSX_PATH}`);
  console.error(`set SLEEPNOD_XLSX env var to override.`);
  process.exit(1);
}

const wb = XLSX.readFile(XLSX_PATH);

// --- Inspect mode ---

if (INSPECT) {
  console.log(`\nWorkbook: ${XLSX_PATH}\n`);
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    console.log(`── Sheet: ${name} — ${rows.length} rows`);
    console.log(`   Columns (${headers.length}): ${headers.join(' | ')}`);
    if (rows.length > 0) {
      console.log(`   Sample row: ${JSON.stringify(rows[0]).slice(0, 240)}${JSON.stringify(rows[0]).length > 240 ? '…' : ''}`);
    }
    console.log('');
  }
  process.exit(0);
}

// --- Load sheets ---

function readSheet(name) {
  const sheet = wb.Sheets[name];
  if (!sheet) {
    console.error(`Sheet '${name}' not found. Available: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// Sheet names may vary — match case-insensitively.
function findSheet(pattern) {
  const re = new RegExp(pattern, 'i');
  return wb.SheetNames.find((s) => re.test(s));
}

const worksSheetName = findSheet('^works?$') || 'Works';
const filesSheetName = findSheet('^files?$') || 'Files';
const vimeoSheetName = findSheet('vimeo') || 'Vimeo Raw';

const worksRows = readSheet(worksSheetName);
const filesRows = wb.Sheets[filesSheetName] ? readSheet(filesSheetName) : [];
const vimeoRows = wb.Sheets[vimeoSheetName] ? readSheet(vimeoSheetName) : [];

console.log(`Loaded:`);
console.log(`  ${worksRows.length} rows from '${worksSheetName}'`);
console.log(`  ${filesRows.length} rows from '${filesSheetName}'`);
console.log(`  ${vimeoRows.length} rows from '${vimeoSheetName}'`);
console.log(``);

// --- Column accessors (resilient to minor header variations) ---

function pick(row, ...candidates) {
  for (const c of candidates) {
    const match = Object.keys(row).find((k) => k.toLowerCase().trim() === c.toLowerCase());
    if (match !== undefined) {
      const v = row[match];
      if (v !== '' && v !== null && v !== undefined) return String(v).trim();
    }
  }
  return '';
}

// --- Field mapping helpers ---

const VALID_MEDIUMS = new Set(['film', 'video', 'performance', 'sound', 'writing', 'event', 'installation', 'other']);

function normalizeMedium(raw) {
  const v = (raw || '').toLowerCase().trim();
  if (VALID_MEDIUMS.has(v)) return v;
  // Common variants
  if (v.includes('film')) return 'film';
  if (v.includes('video')) return 'video';
  if (v.includes('perf') || v.includes('dance') || v.includes('choreo')) return 'performance';
  if (v.includes('sound') || v.includes('music') || v.includes('audio')) return 'sound';
  if (v.includes('writ') || v.includes('essay') || v.includes('novel') || v.includes('poem')) return 'writing';
  if (v.includes('event') || v.includes('producing')) return 'event';
  if (v.includes('install')) return 'installation';
  return 'other';
}

function normalizeYear(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  // Allow YYYY, YYYY-MM, YYYY-MM-DD
  const m = v.match(/\b(19|20)(\d{2})\b/);
  if (m) return m[0];
  // 2-digit year, assume 20XX
  const m2 = v.match(/^'?(\d{2})$/);
  if (m2) return `20${m2[1]}`;
  return '';
}

function extractVimeoId(url) {
  if (!url) return '';
  const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : '';
}

function splitList(raw, sep = /[,;|]/) {
  if (!raw) return [];
  return String(raw).split(sep).map((s) => s.trim()).filter(Boolean);
}

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// --- YAML emission (minimal, no dep) ---

const FIELD_ORDER = [
  'title', 'preservedTitle', 'year', 'medium', 'role', 'venue',
  'tags', 'section', 'summary', 'featuredImage', 'gallery',
  'vimeoId', 'vimeoPrivacy', 'status', 'featuredOrder',
  'substackUrl', 'archivePath', 'rightsNote',
];

function yamlScalar(v) {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return String(v);
  const s = String(v ?? '');
  if (s === '') return "''";
  if (/^(true|false|null|yes|no|on|off)$/i.test(s)) return `'${s}'`;
  if (/^-?\d+(\.\d+)?$/.test(s)) return `'${s}'`;
  if (/[:#&*!|>'"%@`,\[\]{}\n]/.test(s) || /^\s|\s$/.test(s)) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}

function emitFrontmatter(row) {
  const lines = ['---'];
  for (const key of FIELD_ORDER) {
    const val = row[key];
    if (val === undefined || val === null || val === '') continue;
    if (key === 'gallery') {
      if (!Array.isArray(val) || val.length === 0) continue;
      lines.push('gallery:');
      for (const item of val) {
        lines.push(`  - src: ${yamlScalar(item.src)}`);
        if (item.caption) lines.push(`    caption: ${yamlScalar(item.caption)}`);
      }
      continue;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of val) lines.push(`  - ${yamlScalar(item)}`);
      continue;
    }
    lines.push(`${key}: ${yamlScalar(val)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function emitMarkdown(row, body) {
  return `${emitFrontmatter(row)}\n\n${body || ''}\n`;
}

// --- Build Work entries ---

// Group files by Work ID
const filesByWorkId = new Map();
for (const f of filesRows) {
  const wid = pick(f, 'Work ID', 'WorkID', 'Work Id', 'work_id', 'slug');
  if (!wid) continue;
  if (!filesByWorkId.has(wid)) filesByWorkId.set(wid, []);
  filesByWorkId.get(wid).push(f);
}

// Group vimeo by Work ID (many-to-one, take first public one as primary)
const vimeoByWorkId = new Map();
for (const v of vimeoRows) {
  const wid = pick(v, 'Work ID', 'WorkID', 'Work Id', 'work_id', 'slug');
  if (!wid) continue;
  if (!vimeoByWorkId.has(wid)) vimeoByWorkId.set(wid, []);
  vimeoByWorkId.get(wid).push(v);
}

const imports = [];
const skipped = [];

for (const row of worksRows) {
  const slug = (
    pick(row, 'slug', 'Work ID', 'WorkID', 'id', 'ID')
    || slugify(pick(row, 'title', 'Title', 'name', 'Name'))
  );
  if (!slug) {
    skipped.push({ reason: 'no slug/title', row });
    continue;
  }

  const rawStatus = pick(row, 'status', 'Status').toLowerCase();
  if (ONLY_STATUS && !ONLY_STATUS.has(rawStatus)) {
    skipped.push({ reason: `status=${rawStatus || '(empty)'}`, slug });
    continue;
  }

  const title = pick(row, 'title', 'Title', 'name', 'Name') || slug;
  const preservedTitle = pick(row, 'preservedTitle', 'preserved title', 'display title');
  const year = normalizeYear(pick(row, 'year', 'Year', 'date', 'Date'));
  const medium = normalizeMedium(pick(row, 'medium', 'Medium', 'type', 'Type'));
  const role = pick(row, 'role', 'Role');
  const venue = pick(row, 'venue', 'Venue', 'location', 'Location');
  const section = pick(row, 'section', 'Section', 'cluster');
  const summary = pick(row, 'description', 'Description', 'summary', 'Summary');
  const notesField = pick(row, 'notes', 'Notes');
  const archivePath = pick(row, 'archivePath', 'archive path', 'folder', 'Folder');
  const substackUrl = pick(row, 'Primary Substack URL', 'primary substack url', 'substackUrl', 'substack url', 'Substack');

  const collaboratorsRaw = pick(row, 'collaborators', 'Collaborators', 'with', 'With');
  const tagsRaw = pick(row, 'tags', 'Tags');
  const collaborators = splitList(collaboratorsRaw);
  const tagsFromSheet = splitList(tagsRaw).map(slugify);
  const hasCollabTagsInSheet = tagsFromSheet.some((t) => t.startsWith('with-'));
  const collabTags = hasCollabTagsInSheet
    ? []
    : collaborators.map((c) => {
        const s = slugify(c);
        return s.startsWith('with-') ? s : `with-${s}`;
      });
  const tags = Array.from(new Set([...tagsFromSheet, ...collabTags])).filter(Boolean);

  // Vimeo: prefer the Primary Vimeo URL on the Work row; fall back to Vimeo Raw join
  let vimeoId = extractVimeoId(pick(row, 'Primary Vimeo URL', 'primary vimeo url', 'vimeo url', 'Vimeo URL'));
  let vimeoPrivacyRaw = '';

  if (!vimeoId) {
    const vimeoEntries = vimeoByWorkId.get(slug) || [];
    const primary = vimeoEntries.find((v) => {
      const privacy = pick(v, 'Privacy (current)', 'privacy', 'Privacy').toLowerCase();
      return privacy === 'public' || privacy === 'unlisted';
    }) || vimeoEntries[0];
    if (primary) {
      vimeoId = extractVimeoId(pick(primary, 'URL', 'url', 'vimeo url', 'link'));
      vimeoPrivacyRaw = pick(primary, 'Privacy (current)', 'privacy', 'Privacy').toLowerCase();
    }
  } else {
    // Look up privacy for the Primary URL in Vimeo Raw if available
    const match = vimeoRows.find((v) => {
      const url = pick(v, 'URL', 'url');
      return extractVimeoId(url) === vimeoId;
    });
    if (match) vimeoPrivacyRaw = pick(match, 'Privacy (current)', 'privacy', 'Privacy').toLowerCase();
  }
  const vimeoPrivacy = ['public', 'unlisted', 'private'].includes(vimeoPrivacyRaw) ? vimeoPrivacyRaw : 'public';

  // Files → gallery (only if looks like an image)
  const fileEntries = filesByWorkId.get(slug) || [];
  const gallery = fileEntries
    .filter((f) => {
      const path = pick(f, 'path', 'Path', 'filename', 'Filename', 'file', 'File');
      return /\.(jpe?g|png|gif|webp|svg)$/i.test(path);
    })
    .map((f) => ({
      src: pick(f, 'path', 'Path', 'filename', 'Filename', 'file', 'File'),
      caption: pick(f, 'caption', 'Caption') || undefined,
    }))
    .filter((g) => g.src);

  // Rights flag for collaborator work (curator reviews + clears)
  const rightsNote = collabTags.length > 0
    ? `Auto-flagged: collaborator credit present (${collaborators.join(', ')}). Verify rights before promoting from draft.`
    : '';

  const frontmatter = {
    title,
    preservedTitle: preservedTitle || undefined,
    year,
    medium,
    role,
    venue: venue || undefined,
    tags,
    section: section || undefined,
    summary: summary || undefined,
    vimeoId: vimeoId || undefined,
    vimeoPrivacy,
    status: 'draft',
    archivePath: archivePath || undefined,
    rightsNote: rightsNote || undefined,
    substackUrl: substackUrl || undefined,
    gallery,
  };

  const body = notesField || '*Imported from catalog. Body pending.*';
  imports.push({ slug, frontmatter, body });
}

// --- Report ---

const filterDescription = ONLY_STATUS
  ? `filtered from ${worksRows.length} by status ∈ {${[...ONLY_STATUS].join(', ')}}`
  : `from ${worksRows.length} total rows — all imported as draft`;

console.log(`Import plan: ${imports.length} Works (${filterDescription})`);
console.log(`Skipped:     ${skipped.length}`);
console.log(``);

const skippedByReason = skipped.reduce((acc, s) => {
  acc[s.reason] = (acc[s.reason] || 0) + 1;
  return acc;
}, {});
for (const [reason, n] of Object.entries(skippedByReason)) {
  console.log(`  ${n} × ${reason}`);
}
console.log(``);

console.log(`First 5 imports (preview):`);
for (const imp of imports.slice(0, 5)) {
  console.log(`  ${imp.slug} — ${imp.frontmatter.title} (${imp.frontmatter.year}, ${imp.frontmatter.medium})`);
  if (imp.frontmatter.vimeoId) console.log(`    vimeo ${imp.frontmatter.vimeoId}`);
  if (imp.frontmatter.gallery.length > 0) console.log(`    gallery ${imp.frontmatter.gallery.length} files`);
  if (imp.frontmatter.rightsNote) console.log(`    ⚠ ${imp.frontmatter.rightsNote.slice(0, 80)}...`);
}
console.log(``);

// --- Write or Dry-run ---

const reportLines = [];
reportLines.push(`SLEEP NOD xlsx import — ${new Date().toISOString()}`);
reportLines.push(`Mode: ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
reportLines.push(`Source: ${XLSX_PATH}`);
reportLines.push(``);
reportLines.push(`Imports: ${imports.length}`);
reportLines.push(`Skipped: ${skipped.length}`);
reportLines.push(``);

const existing = new Set();
for (const imp of imports) {
  const outPath = join(WORKS_DIR, `${imp.slug}.md`);
  const alreadyThere = existsSync(outPath);
  if (alreadyThere) existing.add(imp.slug);

  const md = emitMarkdown(imp.frontmatter, `${imp.body}\n`);

  if (WRITE) {
    writeFileSync(outPath, md);
  }
  reportLines.push(`${alreadyThere ? 'OVERWRITE' : 'NEW      '} ${imp.slug}.md — ${imp.frontmatter.title}`);
}

reportLines.push(``);
reportLines.push(`Skipped rows:`);
for (const s of skipped) {
  reportLines.push(`  ${s.slug || '(no slug)'} — ${s.reason}`);
}

writeFileSync(REPORT_PATH, reportLines.join('\n'));

console.log(`Report: ${REPORT_PATH}`);
if (DRY) {
  console.log(`\nDRY-RUN — no files written. Re-run with --write to emit.`);
  if (existing.size > 0) {
    console.log(`\n⚠ ${existing.size} slugs already exist in src/content/works/ and would be OVERWRITTEN:`);
    for (const s of existing) console.log(`  - ${s}.md`);
  }
} else {
  console.log(`\nWROTE ${imports.length} files to ${WORKS_DIR}`);
  if (existing.size > 0) {
    console.log(`(${existing.size} existed — they were overwritten)`);
  }
}
