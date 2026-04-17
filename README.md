# SLEEP NOD

Portfolio site for Dylan Ward / SLEEP NOD — film, video, performance, sound.

Writing: [sleepnod.substack.com](https://sleepnod.substack.com)
Video archive: [vimeo.com/dfw](https://vimeo.com/dfw)

## Stack

Astro 4 · content collections · Vercel · Vimeo oEmbed. No CMS in Phase 1; Keystatic is added in Phase 2.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/
npm run preview
```

## Add a Work

Create `src/content/works/<slug>.md`:

```markdown
---
title: The Lesser Evils
year: '2017'
medium: performance
role: Director & Producer
venue: Base Arts Space, Seattle
tags: [with-cherdonna]
section: dance-for-stage
summary: One-line summary for cards and meta.
featuredImage: /media/works/the-lesser-evils/hero.jpg
vimeoId: '123456789'
status: featured
featuredOrder: 2
---

Body copy in markdown.
```

`status` must be `published` or `featured` for the Work to appear. Everything else defaults sensibly.

## Phase roadmap

- **Phase 1** — hand-write 5–10 featured Works, ship to Vercel under an unguessable preview URL.
- **Phase 2** — add Keystatic for a browser-based editing UI.
- **Phase 3** — one-shot import from `SleepNod_Catalog_of_Works.xlsx`, then archive the import script.
- **Phase 4** — Pagefind search, Vimeo metadata refresh, custom domain.

See [CLAUDE.md](CLAUDE.md) for the full agent briefing.
