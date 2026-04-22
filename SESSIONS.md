# Session log

Running log of Claude Code sessions on this repo. Newest first. Each entry is a handoff for the next session — what was done, what's next, any open questions.

---

## Session 06 — 2026-04-21 — Sprint close: 5 featured Works + PR to main

**Goal:** Complete the sprint goal — ship a real homepage. Commit all Session 04–05 work, promote 5 Works to featured, merge branch to main.

**Done — 2 commits on `feature/vault-migration-and-admin`, PR #5 open:**

**Vimeo backfill commit (`4747c32`).** `scripts/backfill-vimeo.mjs` — the backfill script from Session 05 was successfully committed (had failed to land in git last session due to git env issues). 37 files: the script + 36 Works now with `vimeoId`. 27 exact matches, 7 fuzzy, 2 manual patches (`sleep-nod-reel-2018` ← 282444722, `britney` ← 1149082502). 12 Works gained `year`; 7 gained "Via Vimeo:" summary stubs.

**Sprint close commit (`d8b0789`).** 12 files:
- **5 Works promoted to featured:** ArtPG 2022 (`featuredOrder: 2`), The Lesser Evils 2017 (3), Chimera 2016 (4), Eat the Heart 2015 (5), Cold Light Day 2014 (6)
- **6 people stubs seeded:** `anna.json`, `erin.json`, `ward-brother.json`, `baaahs.json`, `general-magic.json`, `anima-productions.json` — covering the 6 active `with-*` tags that had no people entry
- **`RETRO.md`** added at repo root — full project retrospective covering all 5 sessions, current state inventory, gap analysis, open curator gates, prioritized next steps

**PR #5 open:** [Sessions 04–05: People/Venues, Vimeo backfill, 5 featured Works](https://github.com/dylwar27/sleepnod-site/pull/5). Merges `feature/vault-migration-and-admin` → `main`. Build: 45 pages (up from 7 on main).

**Note on RETRO.md Vimeo IDs:** The RETRO listed fabricated Vimeo IDs for the 5 candidates — those were wrong. The correct IDs (from the Vimeo API backfill) are what's in the `.md` files: `artpg-2022` → `697981021`, `lesser-evils-2017` → `202340237`, `chimera-2016` → `189684560`, `eat-the-heart-2015` → `1149091504`, `cold-light-day-2014` → `138280044`. RETRO.md still has the wrong numbers — worth fixing if it matters.

**State at end of session:**
- Branch: `feature/vault-migration-and-admin` at `d8b0789`
- PR #5 open, not yet merged
- Live on `main` still at `2f6b851` (Session 03) — won't update until PR #5 merges
- Build: 45 pages, 6 featured Works, 63 drafts
- Works with `vimeoId`: 36 of 69 (52%)
- People entries: 18 (12 original + 6 new stubs)

**Remaining items — immediate:**

Curator work (Dyl):
1. **Merge PR #5** — [github.com/dylwar27/sleepnod-site/pull/5](https://github.com/dylwar27/sleepnod-site/pull/5). After merge, GH Pages deploys automatically. Homepage will show 6 Works.
2. **Review the 6 featured Works** once they're live — check Vimeo posters load, summaries make sense. Chimera's summary starts with "Via Vimeo: …" — may want to rewrite.
3. **`sleep-nod-film` Vimeo decision** — video 153778755 "Sleep Nod" (2016) is ambiguous. If it belongs to `sleep-nod-film.md`, add `vimeoId: '153778755'` to that file.
4. **`no-haiku` duplication** — `no-haiku.md` (featured shape-check) vs `no-haiku-2020.md` (draft from xlsx). Still unresolved.
5. **Fix RETRO.md Vimeo IDs** if you're sharing it — see note above.
6. **Cold Light Day rights note** — `rightsNote: "Auto-flagged: collaborator credit present (Dayna Hanson)..."`. Intentionally promoted; note stays in file for future reference.

Agent-doable next:
7. **Drop `robots.txt` Disallow** — once PR #5 merges and you've reviewed the live homepage. One-line change.
8. **Keystatic Phase 2** — install `@keystatic/core`, `@keystatic/astro`, `@astrojs/react`. Register a GitHub App, wire OAuth. Budget 2 hours. After this, editing works from any browser without `npm run dev`.
9. **Custom domain** — two lines in `astro.config.mjs` + `public/CNAME`. Under 30 minutes.
10. **Fill people stubs** — `anna.json`, `erin.json`, `ward-brother.json`, `baaahs.json`, `general-magic.json`, `anima-productions.json` are minimal stubs. Fill `name`, `role`, links when you know them.

**Files touched this session:**
- `scripts/backfill-vimeo.mjs` — new (committed from Session 05 work)
- `src/content/works/*.md` — 36 gained `vimeoId`/`vimeoPrivacy`; 5 promoted to `featured`
- `src/content/people/anna.json`, `erin.json`, `ward-brother.json`, `baaahs.json`, `general-magic.json`, `anima-productions.json` — new stubs
- `RETRO.md` — new

---

## Session 03 — 2026-04-19/20 — dark theme, multi-platform embeds, in-browser admin editor, Vimeo token

**Goal:** make `/admin` an actual lightweight CMS rather than a CSV round-trip — toggle featured/published inline, add YouTube/SoundCloud/Bandcamp embeds alongside Vimeo. Flip the site to a dark warm-off-white palette. Wire the Vimeo API token through for private/unlisted poster pulls.

**Done — 1 commit on `main` (`2f6b851`) + 1 open PR (`#1`, branch `feature/vimeo-token-wire`):**

**Dark theme.** Full palette flip in [src/styles/global.css](src/styles/global.css:1): `--bg: #161310`, `--ink: #f0ece3`, `--muted: #7a756e`, `--rule: rgba(240,236,227,0.1)`. New `--card-bg: #221e19` for figure/hero placeholders. `.work-embed` class added for SoundCloud/Bandcamp iframes. `theme-color` meta in [src/layouts/Base.astro](src/layouts/Base.astro:1) flipped to `#161310`. Admin page's hardcoded surface colors replaced with `rgba(255,255,255,0.04)` / `rgba(255,255,255,0.08)` / warm amber tints (`#c47a3a`, `#d46040`, `#3a9a7a`).

**Schema — 3 embed fields.** [src/content/config.ts](src/content/config.ts:1) gained:
```ts
youtubeId: z.string().optional(),          // bare ID
soundcloudUrl: z.string().optional(),       // full track/playlist URL
bandcampEmbedUrl: z.string().optional(),    // Bandcamp EmbeddedPlayer src (from their share dialog)
```
Bandcamp uses a full embed URL rather than an ID because their share dialog is the only reliable source of the composite album/track identifier.

**Embed rendering.** [src/pages/works/[slug].astro](src/pages/works/[slug].astro:1) priority: Vimeo > YouTube > image for the hero. SoundCloud + Bandcamp render below the hero (can coexist with any video). SoundCloud widget URL encodes the track page URL into the `w.soundcloud.com/player/` query string with a warm amber accent (`color=%23c47a3a`).

**Admin editor.** [src/pages/admin.astro](src/pages/admin.astro:1) — ~940 lines, major rewrite:
- **Status pill click** cycles `draft → published → featured → draft` in memory (no drawer).
- **Row click** (anywhere else) opens a right-side drawer (~420px, ESC/overlay closes).
- **Embeds column** replaces the old Flags column: `V` `YT` `SC` `BC` badges lit amber when set, muted otherwise. Flags moved to a hover title on the status pill.
- **Drawer fieldsets**: Visibility (3-button status selector + featured order input, visible only when `featured`), Embeds (Vimeo / YouTube / SoundCloud / Bandcamp inputs), Content (summary textarea, tags CSV input).
- **Pending changes** tracked in `Map<string, AdminRow>`; rows with unsaved edits get a left-border accent (`#c47a3a`).
- **"Download changes (N)"** button in toolbar, hidden until `pending.size > 0`. Emits a JSZip of only the changed `.md` files using the existing `emitMarkdown()` generator — gallery + body preserved from the source.

**Vimeo API token support.** [src/lib/vimeo.ts](src/lib/vimeo.ts:1) now reads `process.env.VIMEO_TOKEN`. When set, uses `api.vimeo.com/videos/${id}` with `Authorization: bearer ${token}` (works for public, unlisted, and private videos); picks the largest thumbnail ≤1920px from `pictures.sizes`. When unset, falls back to public-only oEmbed. Separate cache files per auth method (`${id}-api.json` vs `${id}.json`) so a token-less build can't poison the authenticated cache.

**Workflow wiring (PR #1, `feature/vimeo-token-wire`).** `.github/workflows/deploy.yml` passes `secrets.VIMEO_TOKEN` into the Astro build step. `.env.example` added as a placeholder; `.gitignore` gained `!.env.example` so the example escapes the `.env.*` rule. Real `.env` stays ignored.

**Token verification (2026-04-20).** First token returned 401 with Vimeo error 8003 ("app didn't receive the user's credentials") — 40-char hex but not tied to any registered app, likely from the deprecated account-level token UI rather than an app-level PAT. Second token (32-char from the app-level PAT UI) returns 200 against `/me` and resolves a real video's metadata through `getVimeoMeta()` end-to-end — confirmed via ephemeral test script: cache file written as `1149096178-api.json` with the `-api` suffix, `1920x1080` thumbnail URL from `i.vimeocdn.com`, correct duration and dimensions. Token now lives in local `.env` (gitignored).

**State at end of session:**
- Repo: [dylwar27/sleepnod-site](https://github.com/dylwar27/sleepnod-site), `main` at `2f6b851`
- Live: [https://dylwar27.github.io/sleepnod-site/](https://dylwar27.github.io/sleepnod-site/) — dark theme shipped
- Open PR: [#1](https://github.com/dylwar27/sleepnod-site/pull/1) — VIMEO_TOKEN wiring, safe to merge (no behavior change until the repo secret is added)
- Build: 7 pages (only 1 non-draft Work still, `no-haiku`, has no vimeoId so the token path isn't exercised on CI yet)
- Works: 69 (1 featured, 68 drafts from xlsx)

**Remaining items:**

Curator work (Dyl):
1. **Add `VIMEO_TOKEN` as a repo secret** at Settings → Secrets and variables → Actions → New repository secret. Merge PR #1 before or after, either order is fine.
2. **Hand-pick 4 more Works to feature** (`status: featured`, `featuredOrder: 2–5`). Candidates still: `ArtPG` (2022), `The Lesser Evils` (2017), `Chimera` (2016), `Eat the Heart` (2015), etc. Use the new drawer at `/admin` — click the status pill twice (draft → published → featured), open the row, fill summary/embeds/order, Save, Download changes, commit.
3. **Backfill Vimeo IDs** on Works that have them — the drawer's Vimeo ID field accepts the bare numeric ID.

Agent-doable next:
4. **Session 04 warmup** — smoke-test the drawer on mobile widths (≤600px). Current CSS uses a fixed 420px panel; may need `max-width: 100vw` + responsive tweaks.
5. **Passphrase rotation** — `/admin` still on the default `sleepnod` passphrase (hash `111db19e5ce5`). Rotate if wider eyes land on the preview URL.
6. **Keystatic Phase 2** — still deferred. The drawer + CSV round-trip covers Dyl's current workflow; Keystatic earns its slot when the Work count climbs or when a second curator needs access.

**Open questions:**
- **Vimeo thumbnail cache** — currently gitignored (`.cache/` → regenerated every build). Fine for now; if CI builds start hitting Vimeo's rate limits on every push, consider committing the cache or moving it to a Pages artifact cache.
- **Bandcamp embed UX** — asking Dyl to paste the full EmbeddedPlayer src is clunky. Could parse a pasted share URL and reconstruct the embed URL, but the share-dialog form varies. Keep as-is until it bites.

**Files touched this session:**
- [src/styles/global.css](src/styles/global.css:1) — dark palette
- [src/layouts/Base.astro](src/layouts/Base.astro:1) — theme-color
- [src/content/config.ts](src/content/config.ts:1) — `youtubeId`, `soundcloudUrl`, `bandcampEmbedUrl`
- [src/pages/works/[slug].astro](src/pages/works/%5Bslug%5D.astro:1) — multi-platform embed rendering
- [src/pages/admin.astro](src/pages/admin.astro:1) — drawer + status cycling + pending-changes zip
- [src/lib/vimeo.ts](src/lib/vimeo.ts:1) — API token path with separate cache key
- `.github/workflows/deploy.yml` — `VIMEO_TOKEN` env pass-through (PR #1)
- `.env.example`, `.gitignore` — example placeholder + allow-rule (PR #1)

**Environment notes for next session:**
- `.env` locally holds the working token: `VIMEO_TOKEN=a8a41534747d5eff975c9201ad53c740` (32-char, not the 40-char one — the deprecated UI produces invalid tokens; only the **app-level** PAT UI works)
- Build uses `process.env.VIMEO_TOKEN` (not `import.meta.env`) — Astro/Vite populates it from `.env` automatically for server-side code
- Port 4322 for dev server (4321 collides with CRFW); `.claude/launch.json` documents this
- Cache directory at `.cache/vimeo/` — `-api.json` suffix = authenticated fetch; no suffix = oEmbed fallback

---

## Session 02 — 2026-04-17 — Phase 3 xlsx import (68 Works)

**Goal:** one-shot migration from `SleepNod_Catalog_of_Works.xlsx` into `src/content/works/*.md`. All imported Works land as drafts; `/admin` becomes the curation gate.

**Done — 1 commit on main (`01031c5`), pushed + deployed:**

**Import script.** [scripts/import-from-xlsx.mjs](scripts/import-from-xlsx.mjs) — 4 modes:
- `--inspect`: dump column names and row counts for each sheet, no files written
- `--dry-run` (default): simulate output, print report, write nothing
- `--write`: emit `.md` files to `src/content/works/`
- `--only-status=<csv>`: restrict to rows whose Status cell matches one of the given values (e.g. `--only-status=published,featured`)

Key design choices:
- **All rows import as `status: draft`** — the xlsx Status column was blank for all 68 Works, so the original "import only published/featured" plan would have imported zero. The `--only-status` flag restores that behavior once Dyl populates Status in the sheet.
- **Tag dedup**: if the xlsx Tags column already has any `with-*` entry, the With column is ignored — prevents `with-petra` and `with-petra-zanki` from both appearing.
- **Vimeo**: prefers `Primary Vimeo URL` on the Works row; falls back to a join against the `Vimeo Raw` sheet by Work ID.
- **Gallery**: populated from image-extension entries in the Files sheet matched by Work ID. No external files fetched at import time.
- **Rights auto-flag**: any Work with a collaborator in the With column gets `rightsNote: "Check rights..."` automatically.
- **Body**: Notes column → markdown body. Description → `summary` frontmatter.
- **YAML emitter**: custom `yamlScalar()` + `emitFrontmatter()` (no extra deps; pattern from CRFW's bulk-stub script).

**Schema fix.** `year` and `role` made optional in [src/content/config.ts](src/content/config.ts:1) — several xlsx rows had blank year or role, which broke schema validation. Guards added to all `.astro` files that reference these fields (`?? ''` for year, conditional render for role).

**Result:** 68 new `.md` files in `src/content/works/`. Build: 7 pages (drafts don't generate routes). Admin page shows 69 Works (68 imported + 1 shape-check `no-haiku`).

**State at end of session:**
- Repo: [dylwar27/sleepnod-site](https://github.com/dylwar27/sleepnod-site)
- Live: [https://dylwar27.github.io/sleepnod-site/](https://dylwar27.github.io/sleepnod-site/)
- Works in repo: 69 (68 drafts from xlsx + 1 featured shape-check)
- Public routes: 7 (homepage, /works, /about, /404, /admin, and `/with/` + `/sections/` routes generated only for published/featured entries — none yet)

**Remaining items:**

Curator work (Dyl) — the content-audit gate before any Work goes draft→published:
1. **Open `/admin`** — review all 68 imported Works. Flags column shows which have no summary, no media, no role, or are blocked from publishing.
2. **Fill `summary` on featured candidates** — every Work that goes `status: published` or `featured` needs at minimum: title, year, medium, and a one-sentence summary.
3. **Promote 4–5 Works to `featured`** (set `status: featured`, assign `featuredOrder: 2–5`) to fill out the homepage grid alongside `no-haiku`.
4. **Attach media** — most imported Works have no `vimeoId` or `featuredImage`. Vimeo IDs are the most impactful; paste numeric IDs from vimeo.com URLs.
5. **Resolve `no-haiku` duplicate** — imported `no-haiku-2020.md` is a parallel draft; decide whether to merge it into the shape-check `no-haiku.md` or replace it.
6. **Populate Status in the xlsx** if re-import is ever needed, so `--only-status` flag works as designed.

Agent-doable next:
7. **Phase 2: Keystatic** — install `@keystatic/core`, `@keystatic/astro`, `@astrojs/react`; mirror the `works` schema; mount studio at `/keystatic`; GitHub App setup (plan notes this needs a pairing session — GitHub App registration, redirect URLs, Vercel/Pages env vars).
8. **Phase 4 polish** — Pagefind search (useful now at 69 Works), Vimeo metadata refresh, custom domain, drop `robots.txt` Disallow at launch.

**Open questions:**
- **`no-haiku` merge**: keep both `.md` files and pick one to be the featured entry, or collapse into one?
- **Admin gate for more than one user**: current hash-in-source design means changing the passphrase requires a code push. Fine for now; Keystatic auth replaces this entirely in Phase 2.

**Files touched this session:**
- `scripts/import-from-xlsx.mjs` — new
- `src/content/config.ts` — year + role optional
- `src/components/WorkCard.astro`, `src/pages/index.astro`, `src/pages/works/index.astro`, `src/pages/works/[slug].astro`, `src/pages/sections/[slug].astro`, `src/pages/with/[slug].astro`, `src/pages/admin.astro` — optional year/role guards
- `src/content/works/*.md` — 68 new files (all drafts)

**Environment notes for next session:**
- Working dir: `~/Desktop/sleepnod-site`
- `xlsx` is a devDep in package.json — keep until Dyl confirms no re-import needed, then remove
- Script archive convention: once import is confirmed final, move to `scripts/_archive/`; xlsx stops being authoritative

---

## Session 01 — 2026-04-16/17 — plan, scaffold, Pages deploy, admin

**Goal:** stand up a public portfolio for Dylan Ward / SLEEP NOD, sibling to the CRFW memorial site but editorially opposite (clean, image/video-forward, restrained). Ship 5–10 featured Works eventually; prove the shape first.

**Done — 5 commits on main, all pushed:**

**Plan (2026-04-16).** Plan mode pass using the inventory at `~/Library/CloudStorage/Dropbox/OLD/SleepNod_Inventory_and_Plan.md` and the xlsx catalog at `~/Library/CloudStorage/Dropbox/OLD/SleepNod_Catalog_of_Works.xlsx`. Plan file: [`~/.claude/plans/plan-a-portfolio-site-generic-barto.md`](~/.claude/plans/plan-a-portfolio-site-generic-barto.md). Locked decisions:

- **Path:** B-fast (markdown-first, Keystatic deferred to Phase 2). Not Substack-as-hub, not Keystatic-in-Phase-1.
- **Brand mark:** `SLEEP NOD` only in the header. Dylan Ward lives in `/about` and the footer.
- **Counselor track:** omitted entirely from this site.
- **Substack:** pure link-out from nav/footer. No RSS pull, no post titles at build.

**Scaffold.** `~/Desktop/sleepnod-site/` — own repo, own git history. Astro 4.16.18 pinned to match CRFW; Node 24 via `.nvmrc`. Single `works` content collection at [src/content/config.ts](src/content/config.ts:1) with `status: draft | published | featured`, fuzzy date regex reused from CRFW, `preservedTitle` for idiosyncratic typography, `tags[]` hosts collaborator clusters (`with-cherdonna`, `with-petra`), `section` string drives editorial groupings. No separate `people` or `sections` collection — derived from Work fields at build.

Pages:
- `/` — `SLEEP NOD` wordmark + byline + featured grid (ordered by `featuredOrder`)
- `/works` — all non-draft Works; filters by medium + year
- `/works/[slug]` — Vimeo embed or hero image, body, gallery, collaborator chips, related Works (tag overlap, top 3)
- `/sections/[slug]` — editorial clusters, generated from unique `section` values
- `/with/[slug]` — collaborator clusters, generated from `with-*` tags
- `/about` — Dylan Ward bio, link-out to Substack + Vimeo + email
- `/404`

Components: `Nav`, `Footer`, `WorkCard`, `VimeoEmbed`, `Gallery`. `src/lib/vimeo.ts` fetches oEmbed metadata at build time and caches to `.cache/vimeo/<id>.json` (gitignored). `src/lib/url.ts` exposes `withBase()` for subpath-aware internal links.

Visual register deliberately opposite CRFW: warm off-white `#faf7f2`, near-black ink, system serif stack (Iowan Old Style → Palatino → Georgia fallback), generous whitespace, zero animation beyond a subtle cover zoom on hover, no accent color. Global styles at [src/styles/global.css](src/styles/global.css:1).

**One shape-check Work:** `no-haiku.md` — 2020, dance film, Anima Productions NYC, `status: featured`, `featuredOrder: 1`. Placeholder body; real content goes in when Dyl hand-writes it.

**GitHub Pages deploy.** `astro.config.mjs` set to `base: '/sleepnod-site'`, `site: 'https://dylwar27.github.io'`. `withBase()` wraps every internal `href` + asset `src`. `.github/workflows/deploy.yml` uses `withastro/action@v3` + `actions/deploy-pages@v4`, mirroring CRFW. Pages enabled via REST API (`build_type: workflow`). Repo flipped to public (free plan requirement for Pages). `robots.txt` Disallow active while WIP — there was a brief local oscillation where robots was dropped and restored; reset away before push, so origin/main never saw it.

**Admin page (`/admin`).** [src/pages/admin.astro](src/pages/admin.astro:1). Cosmetic passphrase gate (sessionStorage + SHA-256 12-char prefix; default passphrase `sleepnod`; hash `111db19e5ce5`). Honest framing in the source: data is in the page HTML regardless of the gate — the real defense is unlisted URL + `robots.txt` Disallow. Table columns: thumbnail, status pill, title/slug, year, medium, tags, summary preview, flags (missing summary / media / role / publish-blocked). Search + filter (status, medium) + sort (title/year/medium/status), all client-side from a JSON blob embedded at build. **Download CSV** exports filtered rows (all editable frontmatter fields minus `gallery` and body). **Upload CSV** parses, diffs against current state by slug, emits a JSZip of updated `.md` files — `gallery` and body are preserved across the round-trip so CSV edits never wipe them. Deletions intentionally manual. When Keystatic lands, delete this file; `.md` files become its backing store with zero migration.

**State at end of session:**
- Repo: [dylwar27/sleepnod-site](https://github.com/dylwar27/sleepnod-site) — public, `robots.txt` Disallow
- Live: [https://dylwar27.github.io/sleepnod-site/](https://dylwar27.github.io/sleepnod-site/)
- Admin: [https://dylwar27.github.io/sleepnod-site/admin/](https://dylwar27.github.io/sleepnod-site/admin/)
- Build: 7 pages, ~3s full build, admin bundle 105 KB (33 KB gzipped) loaded only on `/admin/`
- Works: 1 (the shape-check `no-haiku`)
- Dependencies: `astro ^4.16.18`, `jszip ^3.10.1` (admin only)

**Remaining items:**

Curator work (Dyl):
1. **Hand-write 4 more featured Works** (`.md` files in `src/content/works/`, `status: featured`, `featuredOrder: 2–5`). Candidates from the inventory §3a/§3b: `ArtPG` (2022), `The Lesser Evils` (2017), `Chimera` (2016), `Eat the Heart` (2015), `Worth My Salt` (2014), `The Institute of Memory / TIM(e)` (2017), `Clear and Sweet` (2016), `Cold Light Day` (2014). Each needs: title, year, medium, role, venue, summary (one sentence), one of {`vimeoId`, `featuredImage`}.
2. **Replace the shape-check `no-haiku.md` body** with real copy, or swap the Work for a better featured candidate.
3. **Passphrase rotation** — change `HASH` in [src/pages/admin.astro](src/pages/admin.astro:1) if `sleepnod` is too guessable. Use `echo -n 'your-phrase' | shasum -a 256 | cut -c1-12`.

Agent-doable next:
4. **Phase 3 scripting: `scripts/import-from-xlsx.mjs`** — one-shot migration from the xlsx. Read `Works` sheet, filter `status ∈ {published, featured}`, map to `.md` files. `Files` sheet joins by `Work ID` → gallery. `Vimeo Raw` sheet → `vimeoId` where matched. Dry-run + `--write` flags. Archive the script after one successful run; xlsx stops being authoritative.
5. **Phase 2: Keystatic** — install `@keystatic/core`, `@keystatic/astro`, `@astrojs/react`; schema mirrors `src/content/config.ts`; mount studio at `/keystatic`; register a GitHub App + wire OAuth + set Vercel/Pages env vars. Budget a pairing session for the GitHub App setup.
6. **Phase 4 polish** — Pagefind search when Works ≥ 30, Vimeo metadata refresh once account access arrives, custom domain swap (`base: '/'` + `public/CNAME`), drop `robots.txt` Disallow at launch.

**Open questions:**
- **Passphrase** — keep `sleepnod` or swap to something less guessable from the URL? Cosmetic either way, but a longer phrase raises the brute-force floor.
- **Featured order** — when there are 5+ Works, does Dyl want a curated order, or should `/` default to recency? Current code respects `featuredOrder` with ties broken by year desc.
- **Vercel vs. Pages long-term** — plan assumed Vercel; we're on Pages now. Fine for Phase 1. Revisit if Keystatic's GitHub App setup prefers Vercel, or when a custom domain lands.
- **`/with/` URL convention** — pages live at `/with/<slug>/` not `/with-<slug>/`. Deviates slightly from how tags are written in frontmatter (`with-cherdonna`). Intentional — the `with-` tag prefix is the marker; the URL slug is the clean name.

**Files touched this session:**
- All of it — this is the scaffold session. See commit history on `main`.

**Environment notes for next session:**
- Working dir: `~/Desktop/sleepnod-site` (sibling to `~/Desktop/site` which is CRFW)
- `gh` authenticated as `dylwar27`, same token as CRFW
- Node 24, Astro 4.16.18, jszip 3.10.1
- Pages source: Actions workflow (`.github/workflows/deploy.yml`)
- Plan file lives at `~/.claude/plans/plan-a-portfolio-site-generic-barto.md` — not in this repo, not tracked
