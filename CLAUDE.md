# CLAUDE.md — agent briefing for the SLEEP NOD portfolio site

You are a coding agent working on **Dylan Ward's** public portfolio site, published under the artist name **SLEEP NOD**. Dylan is an artist, filmmaker, and performer (Seattle 2010–2018, NYC 2018–2023, now SF). Treat this as a working portfolio — image- and video-forward, editorial in tone, restrained in ornament. The opposite visual register from the sibling CRFW site at `~/Desktop/site`, but the same maintainer, same stack, same archival instinct.

Read this file at the start of every session. The source-of-truth catalog is `~/Library/CloudStorage/Dropbox/OLD/SleepNod_Catalog_of_Works.xlsx`. The planning doc is `~/Library/CloudStorage/Dropbox/OLD/SleepNod_Inventory_and_Plan.md`. The implementation plan that kicked off this repo is `~/.claude/plans/plan-a-portfolio-site-generic-barto.md`.

---

## What this site is

A static portfolio at the presentation layer. The xlsx is the operational catalog. Writing lives on Substack (`sleepnod.substack.com`) — this site never hosts novel chapters, essays, or poems; it links out. Video lives on Vimeo (`vimeo.com/dfw`) — this site embeds, never re-hosts.

The goal for v1 is 5–10 featured Works live; everything else gets backfilled on Dylan's own cadence.

---

## Golden rules

1. **Preserve idiosyncratic typography.** If a Work title has intentional capitalization, spacing, or punctuation (`_SLEEP_NOD_V2`, lowercase titles, etc.), put the display form in `preservedTitle` and a readable form in `title`. Do not "fix" typography.
2. **Don't invent artistic descriptions or biographical framing.** If a Work needs a body but you have no source material, leave it empty or write one factual sentence. Voice is Dylan's, not the agent's.
3. **Check `rightsNote` on collaborator-authored Work.** When Dylan isn't the sole creator (e.g. Cherdonna, Petra Zanki, Lars Jan collaborations), the Work may need a rights flag before publishing. Flag, don't decide.
4. **Status defaults to `draft`.** A Work only appears on the public site when its status is `published` or `featured`. Never publish a Work without explicit direction.
5. **The counselor track is not on this site.** SLEEP NOD stays purely artistic. No MH CV, no counselor bio, no grad-school mention in `/about` beyond what's already there.

---

## Stack

- **Astro 4** (content collections, vanilla JS where needed, no framework)
- **GitHub Pages** hosting during Phase 1 (same pattern as CRFW: `base: '/sleepnod-site'`, subpath URLs handled via `withBase()` at [src/lib/url.ts](src/lib/url.ts:1)). Swap to a custom domain when ready by setting `base: '/'`, updating `site`, and adding `public/CNAME`.
- **Vimeo oEmbed** at build time — cached to `.cache/vimeo/` (gitignored)
- **Keystatic** will be added in Phase 2 for a non-terminal editing UI; not in v1
- No Cloudinary, no CDN. Images live in `public/media/works/<slug>/` and are committed to git.

---

## Commands

```bash
npm install            # first-time only
npm run dev            # http://localhost:4321
npm run build          # dist/
npm run preview        # serves dist/ locally
```

---

## Repo layout

```
sleepnod-site/
├── CLAUDE.md                       ← you are here
├── README.md
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── media/                      ← per-Work images (hero + gallery), shared placeholders
│   └── robots.txt                  ← Disallow: / while WIP
├── src/
│   ├── config/site.ts              ← nav, social, SEO defaults
│   ├── content/
│   │   ├── config.ts               ← zod schemas (single `works` collection)
│   │   └── works/                  ← one .md per Work
│   ├── layouts/Base.astro
│   ├── components/
│   │   ├── Nav.astro / Footer.astro
│   │   ├── WorkCard.astro
│   │   ├── VimeoEmbed.astro
│   │   └── Gallery.astro
│   ├── lib/vimeo.ts                ← oEmbed fetch with disk cache
│   ├── pages/
│   │   ├── index.astro             ← featured grid
│   │   ├── works/index.astro       ← all works + filters
│   │   ├── works/[slug].astro
│   │   ├── sections/[slug].astro   ← editorial clusters (e.g. dance-for-film)
│   │   ├── with/[slug].astro       ← collaborator clusters (auto from `with-*` tags)
│   │   ├── about.astro
│   │   └── 404.astro
│   └── styles/global.css
└── .cache/vimeo/                   ← gitignored; auto-populated by oEmbed fetches
```

---

## Data model

One content collection: `works`. Schema lives at [src/content/config.ts](src/content/config.ts:1). Key fields:

- `title`, `preservedTitle` (optional)
- `year` — fuzzy date: `YYYY` | `YYYY-MM` | `YYYY-MM-DD`
- `medium` — enum: film | video | performance | sound | writing | event | installation | other
- `role` — free-form string
- `venue`, `summary`, `archivePath`, `rightsNote` — all optional
- `tags` — free-form strings; collaborator clusters use the convention `with-<slug>` (e.g. `with-cherdonna`)
- `section` — free-form string; drives `/sections/<value>/` pages
- `featuredImage`, `gallery` — image paths (relative to `/media/` or absolute URLs)
- `vimeoId` — numeric string (just the ID), not the full URL
- `status` — `draft` (default, hidden) | `published` | `featured`
- `featuredOrder` — integer for homepage ordering
- `substackUrl` — optional, for Works with a companion Substack post

Collaborator and section pages are derived at build time from Work tags and section values. No separate `people` or `sections` collection until one proves it needs rich metadata.

---

## Vimeo convention

Store the numeric ID, not the URL. `VimeoEmbed` renders a lazy iframe; `getVimeoMeta()` in `src/lib/vimeo.ts` fetches oEmbed metadata at build time and caches it under `.cache/vimeo/<id>.json`. The cache makes repeat builds free. Clear with `rm -rf .cache/vimeo/` if Vimeo metadata changes (retitled video, thumbnail update).

When a Work has no `featuredImage`, the Vimeo poster is used. When neither exists, `public/media/placeholder.svg` is the fallback.

---

## Admin page (`/admin`)

Unlisted route at [src/pages/admin.astro](src/pages/admin.astro:1). Cosmetic passphrase gate (sessionStorage + SHA-256 12-char prefix; default passphrase is `sleepnod`; change by updating the `HASH` constant with `echo -n 'your-phrase' | shasum -a 256 | cut -c1-12`). The page content is in the HTML regardless of the gate — the real protection is unlisted URL + `robots.txt` Disallow.

Supports:

- Visual table of every Work (featured + published + draft), with thumbnail, status pill, flags for missing summary/media/role, sort by title/year/medium/status, filter by status/medium, text search.
- **Download CSV** — full frontmatter of the filtered rows (minus `gallery` and body). Filename `sleepnod-works-YYYY-MM-DD.csv`.
- **Upload CSV** — parses, diffs against current state, emits a zip of updated `.md` files. `gallery` and body are preserved from the original files across the round-trip. Deletions are intentionally not handled (delete a `.md` file manually to remove a Work). Drop the zip into `src/content/works/`, commit, push.

CSV columns are the Keystatic-compatible editable fields. When Keystatic lands in Phase 2, delete this page — the same `.md` files become its backing store with zero migration.

---

## Phased roadmap

- **Phase 1 (current):** markdown-first scaffold. Hand-write 5–10 featured Works. Deployed to GitHub Pages at `https://dylwar27.github.io/sleepnod-site/` with `robots.txt` Disallow while WIP. `/admin` page is live for CSV-based catalog review.
- **Phase 2:** add Keystatic studio for backfill. Requires GitHub App setup — one-time friction, then editing is terminal-free.
- **Phase 3:** write `scripts/import-from-xlsx.mjs`, one-shot import of published/featured Works from the xlsx. Archive the script after a single `--write` run; xlsx stops being authoritative.
- **Phase 4:** Pagefind search, Vimeo metadata refresh with account access, custom domain swap, `robots.txt` lift.

---

## Working approach

- Small commits with descriptive messages. Dylan will want to read the history.
- Never publish a Work whose status Dylan hasn't explicitly set to `published` or `featured`.
- When the schema changes, update this file in the same commit.
- Ask before changing the visual language (editorial/restrained), the CMS choice (Keystatic), or the Substack link-out posture (no content duplication here).
- Flag, don't decide: unclear collaborator credits, ambiguous rights, cryptic archive folder names.
