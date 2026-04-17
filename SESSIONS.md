# Session log

Running log of Claude Code sessions on this repo. Newest first. Each entry is a handoff for the next session — what was done, what's next, any open questions.

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
