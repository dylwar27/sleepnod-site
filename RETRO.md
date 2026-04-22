# SLEEP NOD Portfolio — Project Retrospective
**For: Dylan Ward (site owner + curator)**
**Date: 2026-04-21**
**Format: Working agenda — bring this to your own review session**

---

## Purpose of this document

You asked for a design-process retrospective to get leadership (you) back on track with your own goals. This document:

1. Recaps every decision made and why
2. Shows the current state of the site in plain numbers
3. Names what is working and what is blocked
4. Lists every open gate that only you can unlock
5. Proposes a prioritized path forward

Treat this as a meeting agenda with yourself. Each numbered section is a discussion point.

---

## 1. The Original Brief — What You Said You Wanted

From the planning session (2026-04-16):

- **A clean, minimal, image/video-forward portfolio** that's the editorial opposite of CRFW (which is dense/maximalist)
- **Ship 5–10 featured Works fast** (one weekend), then backfill on your own cadence
- **Edit through a UI eventually** — not right now, but it must be the path
- **Link out to Substack for writing**, not duplicate it on this site
- **SLEEP NOD** as the brand mark (Dylan Ward lives only in About + footer)
- **Counsel/MH work omitted entirely** — this is purely your artistic archive

### Locked decisions made in planning:

| Decision | What was chosen | Why |
|---|---|---|
| CMS timing | Keystatic deferred to Phase 2 | Ship first, edit second |
| Build tool | Astro 4 (same as CRFW) | Muscle memory; content collections; static |
| Hosting | GitHub Pages (then → Vercel option) | Free, instant, no signup friction |
| Content source | Markdown (.md) in git | Archival-safe; no vendor lock-in |
| Vimeo embeds | Numeric ID in frontmatter, iframe in page | Simple, reliable, works for unlisted |
| Writing | Pure link-out to Substack | No maintenance overhead |
| Collaborator data | `with-*` tags → `/with/[slug]` pages | Derived, not a separate collection |

---

## 2. What Was Actually Built (Session by Session)

### Session 01 — Scaffold, Pages deploy, Admin
*2026-04-16/17 · commits: `362bc8b` → `0d7d544`*

Everything from zero:
- Astro 4 project at `~/Desktop/sleepnod-site/`
- Full page set: `/`, `/works`, `/works/[slug]`, `/sections/[slug]`, `/with/[slug]`, `/about`, `/404`
- All components: `Nav`, `Footer`, `WorkCard`, `VimeoEmbed`, `Gallery`
- `src/lib/vimeo.ts` — build-time oEmbed fetch + `.cache/vimeo/` disk cache
- Warm off-white light theme (`#faf7f2` bg, system serif, no animation)
- `/admin` page — cosmetic passphrase gate, sortable/filterable table, CSV download/upload round-trip
- GitHub Pages deploy live at `https://dylwar27.github.io/sleepnod-site/`
- `robots.txt` Disallow (WIP posture — still active)
- 1 shape-check Work (`no-haiku`) to prove the schema

**What was NOT done:** No real content. No Vimeo IDs. No images.

---

### Session 02 — xlsx import (68 Works)
*2026-04-17 · commit: `01031c5`*

- `scripts/import-from-xlsx.mjs` — reads `SleepNod_Catalog_of_Works.xlsx`, maps to `.md` files
- 68 Works imported, all as `status: draft`
- Schema extended: `year` and `role` made optional (several xlsx rows were blank)
- Admin shows all 69 Works (68 imported + `no-haiku`)

**Caveat:** The xlsx `Status` column was blank for all 68 rows — so the "import only published" plan would have imported nothing. All 68 came in as drafts. The curation gate is yours.

---

### Session 03 — Dark theme + Admin CMS + Multi-platform embeds + Vimeo token
*2026-04-19/20 · commits: `2f6b851`, `a665d02`*

Major rework:

- **Dark palette flipped:** `#161310` bg, `#f0ece3` ink, `#221e19` card surfaces — the opposite of what was built in Session 01. (You asked for this flip.)
- **Schema additions:** `youtubeId`, `soundcloudUrl`, `bandcampEmbedUrl` — three new optional embed fields
- **Multi-embed rendering:** Vimeo > YouTube > image for the hero; SoundCloud + Bandcamp render below
- **Admin rewritten as lightweight CMS:**
  - Status pill click cycles `draft → published → featured → draft` in memory
  - Row click opens a right-side drawer (embeds + summary + tags + visibility)
  - "Download changes (N)" button emits a JSZip of changed `.md` files — no CSV round-trip needed for common edits
- **Vimeo API token wired:** `vimeo.ts` reads `VIMEO_TOKEN` env var; uses `api.vimeo.com` (public + unlisted + private) when set, falls back to oEmbed when not. Separate cache keys prevent cross-contamination.
- Token verified working (32-char app-level PAT, lives in local `.env`)
- PR #1 merged: token passed to Vercel/Pages build step via `secrets.VIMEO_TOKEN`

---

### Session 04 — People + Venues collections + with-* tag migration
*2026-04-20 · commits: `13f8aaa`, `6c137be`*

- New content collections: `src/content/people/` (12 entries) and `src/content/venues/` (13 entries)
- Schema extended: `collaborators[]` field on Works — typed refs replacing the old `with-*` tag convention
- `scripts/migrate-to-refs.mjs` ran: migrated `with-*` tags on 16 Works to `collaborators[]` refs
- 9 unmatched `with-*` tags flagged (people not yet seeded — see §7 below)
- Admin extended: People + Venues tabs added to the vault editor panel

---

### Session 05 — Vimeo backfill
*2026-04-20/21 · commit: `4747c32`*

- `scripts/backfill-vimeo.mjs` — paginated Vimeo API fetch (~102 videos), slug/title normalization, exact + fuzzy matching, dry-run by default, idempotent
- **36 Works now have `vimeoId`:** 27 exact matches, 7 fuzzy matches, 2 manual patches
- 12 Works gained `year` from Vimeo `created_time`; 7 gained `"Via Vimeo: "` summary stubs
- **33 Works still have no vimeoId** — either they have no Vimeo video or the title was too different to auto-match

---

## 3. Current State — The Numbers

| Category | Count | Notes |
|---|---|---|
| Total Works | 69 | 68 from xlsx + 1 shape-check |
| `status: featured` | 1 | `no-haiku` (shape-check placeholder) |
| `status: published` | 0 | — |
| `status: draft` | 68 | All imported Works |
| Works with `vimeoId` | 36 | After backfill (52%) |
| Works without `vimeoId` | 33 | Need manual Vimeo IDs or images |
| Works with `featuredImage` | 0 | No images committed yet |
| Works with `year` set | ~40 | From xlsx or Vimeo `created_time` |
| Works with `summary` | ~15 | Mix of xlsx descriptions + "Via Vimeo:" stubs |
| People entries | 12 | Alice Gosti, Cherdonna, Dayna Hanson, DCCD, Fuzzy Math… |
| Venue entries | 13 | — |
| Public pages live | 7 | `/`, `/works`, `/works/no-haiku`, `/about`, `/404`, `/admin`, plus stubs |
| `robots.txt` | Disallow | Site is WIP-gated, not indexed |
| Vimeo cache files | ~36 | In `.cache/vimeo/*.json` (gitignored) |
| Git branch | `feature/vault-migration-and-admin` | All work is on this branch — not on `main` yet |

### What the public can currently see

The live site (`https://dylwar27.github.io/sleepnod-site/`) is on `main` branch at commit `2f6b851` (Session 03 state). Everything from Sessions 04–05 is on `feature/vault-migration-and-admin`. Until that branch is merged and a PR is opened, the live site is behind.

---

## 4. Plan vs. Reality — Where We Deviated

| Original plan said | What actually happened | Impact |
|---|---|---|
| Light theme (`#faf7f2`) | Dark theme in Session 03 | Both are valid; the dark palette is live now. Light theme was Session 01 only. |
| Keystatic Phase 2 (week 2) | Not installed yet | Admin drawer partially replaces Keystatic's day-to-day CMS need; Keystatic is still the right Phase 2 tool |
| 5–10 featured Works by end of Session 01 | 1 shape-check Work; 68 drafts | The xlsx import was faster than hand-writing, but all 68 came in as drafts needing curation |
| "No separate people collection" | People + Venues added in Session 04 | Good deviation — the collaborator data model is now typed, not just tag strings |
| `with-*` tags for collaborators | `collaborators[]` refs replacing most of them | Better long-term but created 9 unseeded entries to resolve |
| Vercel hosting | GitHub Pages (free, instant) | Works fine; revisit only when custom domain or Keystatic OAuth needs Vercel |
| Custom domain at launch | Not done | `robots.txt` Disallow is protecting the WIP state; can flip anytime |

---

## 5. What Is Working Well

- **The admin drawer** — real editing without a CSV round-trip. Status cycling + embed fields + Download changes zip. This is your current CMS.
- **Vimeo token path** — private/unlisted video thumbnails load correctly at build time. The `.env` local token is working; CI token is wired via repo secret.
- **Schema is solid** — the `works` schema in `config.ts` covers every field you'll need without overreach. `fuzzyDate` handles your year-only and month-only entries.
- **Backfill script** — idempotent, dry-run-safe, documents its own logic. Can re-run anytime if you add new Vimeo videos.
- **Build is fast** — ~5s for 7 non-draft pages. Will stay fast until you promote Works to published/featured.
- **People + Venues** — the typed `collaborators[]` field is a foundation for proper `/with/[slug]` pages.

---

## 6. What Is Blocked

These are the things that look done but aren't actually moving the site forward:

### Blocked: Nothing is public except the placeholder

The entire catalog (68 Works, 36 with Vimeo IDs) is `status: draft`. Nothing shows on the homepage except `no-haiku`. The site is technically live but functionally empty.

**Unblocked by:** Promoting Works to `published` or `featured` in the admin drawer.

### Blocked: No images

Zero `featuredImage` entries. This means Work cards on the homepage and `/works` show a grey placeholder, and the Vimeo thumbnail fallback only works for the 36 Works that have `vimeoId` (and only at build time).

**Unblocked by:** Committing images to `public/media/works/[slug]/`, or setting `featuredImage` to a hosted URL.

### Blocked: Session 04–05 work not on main

All the People/Venues/collaborators/vimeo backfill work is on `feature/vault-migration-and-admin`. It needs a PR → merge before it's live.

**Unblocked by:** Opening a PR on GitHub and merging it.

### Blocked: Keystatic not installed

The `/admin` drawer covers the immediate editing need but isn't a long-term CMS. Keystatic would give you a proper editing interface accessible from any browser, with auth, without needing to run `npm run dev` locally.

**Unblocked by:** Phase 2 session (needs ~1–2 hours: install + GitHub App setup).

### Blocked: 9 unseeded people

9 `with-*` tags from the xlsx couldn't be matched to people entries because the person isn't in `src/content/people/` yet: `anna`, `erin`, `ward-brother`, `baaahs`, `general-magic`, `in-the-box`, `anima-productions`, `cia`, `no-glasses`. Until these are seeded, those Works' `collaborators[]` refs are broken.

**Unblocked by:** Creating JSON stubs in `src/content/people/` for each missing person.

---

## 7. Open Curator Gates (Only You Can Do These)

These are decisions and actions that require your judgment — they can't be scripted or delegated:

### 7a. The Ambiguous Vimeo ID
- **Video 153778755** ("Sleep Nod", 2016) matched two Works: `sleep-nod-film` and `sleep-nod-reel-2018`
- `sleep-nod-reel-2018` was already manually patched with the 2018 reel ID (282444722)
- **Decision needed:** Is 153778755 the `sleep-nod-film` video? If yes, open `sleep-nod-film.md` in the admin drawer and add vimeoId `153778755`.

### 7b. Promote Works to published/featured
- The homepage shows 1 Work. To actually launch, you need 5–10 promoted.
- **Recommended first pass:** In `/admin`, use the status pill to cycle any Work to `featured`, then open its drawer to verify embed + summary + order. Download changes, commit.
- **Priority candidates** (from the original plan):
  1. ArtPG (2022) — `artpg-2022.md`, vimeoId: `715498697`
  2. The Lesser Evils (2017) — `lesser-evils-2017.md`, vimeoId: `237344001`
  3. Chimera (2016) — `chimera-2016.md`, vimeoId: `153773012`
  4. Eat the Heart (2015) — `eat-the-heart-2015.md`, vimeoId: `123289208`
  5. Cold Light Day (2014) — `cold-light-day-2014.md`, vimeoId: `103685993`

### 7c. Resolve `no-haiku` duplication
- `no-haiku.md` — the original shape-check (featured, order 1, placeholder body)
- `no-haiku-2020.md` — imported from xlsx as a draft
- **Decision needed:** Merge them (pick one, delete the other), or keep both as separate entries?

### 7d. Summaries for Works going public
- Any Work that goes `status: published` or `featured` needs a one-sentence summary
- Currently ~15 have summaries (mix of xlsx descriptions + "Via Vimeo:" stubs from backfill)
- The admin drawer has a summary textarea — edit directly there, Download changes, commit

### 7e. The 33 Works without vimeoId
- These have no video at all, or the Vimeo title was too different to auto-match
- **Options:** (a) Add the Vimeo ID manually via the admin drawer if you know it; (b) Add a `featuredImage` instead; (c) Leave as draft until media is sourced

### 7f. Confirm the 9 unseeded people
- People not yet in `src/content/people/`: anna, erin, ward-brother, baaahs, general-magic, in-the-box, anima-productions, cia, no-glasses
- **Decision needed:** Are these the right slugs? If yes, an agent can seed the JSON stubs.

### 7g. Merge the open branch
- All Sessions 04–05 work lives on `feature/vault-migration-and-admin`
- A PR should be opened and merged before the next agent session, or the next session will continue piling onto this branch

---

## 8. Prioritized Next Steps

Ordered by impact / effort tradeoff:

### Immediate — highest impact, curator work only

1. **Merge `feature/vault-migration-and-admin` to main** — everything from Sessions 04–05 is undeployed. Open a PR on GitHub, merge it, done. 10 minutes.

2. **Promote 5 Works to featured** — the homepage shows 1 placeholder. Use `/admin` drawer: cycle status pill → open row → set `featuredOrder` 2–6 → add any missing summary → Save → Download changes (N) → commit the zip. The site goes from empty to a real portfolio. 1–2 hours.

3. **Resolve `sleep-nod-film` vimeoId** (153778755) — one field in one file. 2 minutes.

4. **Resolve `no-haiku` duplication** — pick one, discard the other. 5 minutes.

### Short-term — next agent session

5. **Seed 9 missing people** — agent-doable once you confirm the slugs are right. Quick JSON stub pass.

6. **Open a PR for `feature/vault-migration-and-admin`** if not done in step 1.

7. **Drop `robots.txt` Disallow** once you've reviewed the featured Works and are comfortable with the URL going semi-public.

### Medium-term — when you have a focus session

8. **Keystatic Phase 2** — install `@keystatic/core`, `@keystatic/astro`, `@astrojs/react`. Register a GitHub App, wire OAuth, set env vars. Budget 2 hours including the GitHub App setup friction. After this, you can edit Works from any browser without running `npm run dev`.

9. **Custom domain** — two lines in `astro.config.mjs` (`base: '/'`, `site: 'https://sleepnod.com'`) + `public/CNAME`. Flip robots.txt to Allow. Under 30 minutes once the domain DNS is pointed at GitHub Pages.

10. **Images pass** — commit hero images to `public/media/works/[slug]/` and set `featuredImage` on the Works you're promoting. Even 5 images makes the homepage feel like a real site.

### Long-term — ongoing curator cadence

11. **Summaries and descriptions** — the 53 Works without summaries. Use the CSV export from `/admin`, fill in Google Sheets, upload back, or use the drawer one by one.

12. **Pagefind search** — worth adding when Works ≥ 30 are published. Under 1 hour to wire.

13. **The 33 Works without vimeoId** — check each one in your Vimeo account, add IDs via the admin drawer as you go.

---

## 9. The Site's Current Posture

```
Phase 1 ✓   Scaffold + deploy (Sessions 01–03)
Phase 1 ✓   Full catalog import (Session 02)
Phase 1 ✓   Admin CMS with drawer (Session 03)
Phase 1 ✓   People + Venues (Session 04)
Phase 1 ✓   Vimeo backfill script + 36 IDs (Session 05)
Phase 1 ✗   Featured content on homepage (waiting on curator)
Phase 1 ✗   Merge open branch to main
Phase 1 ✗   Drop robots.txt Disallow (waiting on featured content)
Phase 2 ✗   Keystatic (deferred, still appropriate)
Phase 2 ✗   Custom domain
Phase 3 ✗   Full catalog curation (long tail)
```

You are at the end of the agent-buildable Phase 1 work. The next unlock is entirely editorial — the decisions in §7 above. Once you've promoted 5 Works and confirmed them, the site is launchable.

---

## 10. Questions Worth Answering in This Review

Work through these in order:

1. **Is the dark theme right?** Session 01 was light (`#faf7f2`), Session 03 flipped to dark (`#161310`). Which do you want?

2. **Which 5 Works go on the homepage first?** Name them — agent can backfill any missing data.

3. **Is `no-haiku` the right shape-check to keep?** Or should it be replaced by one of the 5 real featured Works?

4. **Do you want to merge the open branch this week?** If yes, open a PR on GitHub now.

5. **Keystatic this month or next?** It changes the editing workflow significantly — once installed, you won't need `npm run dev` for content edits.

6. **Custom domain timeline?** The site is live but hidden. Naming a go-live date will focus the remaining work.

7. **Are the 9 unseeded people the right slugs?** Review the list in §7f — confirm or rename before they're seeded.

---

*Generated from: git log --oneline (10 commits) + src/content/works/ inventory + SESSIONS.md + plan file.*
*Last commit: `4747c32` (Vimeo backfill) on branch `feature/vault-migration-and-admin`.*
