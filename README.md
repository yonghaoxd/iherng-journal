# iherng Journal

A responsive editorial reading companion to iherng's YouTube channel, with three property-review articles and three Asking Sean podcast articles.

## Run locally

```sh
npm install
npm run dev
```

## Architecture

- React + Vinext App Router, using the Sites starter.
- Static export configured in `next.config.ts`; public build output is `dist/client`.
- Home: `/`; series: `/property-reviews` and `/iherng-podcast`.
- Each article has a permanent `/articles/[slug]` route.
- Article content lives in individual JSON files in `content/articles`.
- `lib/articles.ts` registers articles and holds the series definitions.
- Shared editorial components live in `components/journal.tsx`; styles in `app/globals.css`.
- There is no database, admin dashboard, or automatic publishing pipeline.

## Add an article

1. Copy an existing JSON content file and give it a unique slug and verified video ID.
2. Add its import to `lib/articles.ts` and include it in `articles`.
3. Write an original summary based on material actually reviewed, with accurate dates and source links. State whether full video content or only episode notes were available.
4. Update the displayed collection counts when expanding the pilot.
5. Run `npx tsc --noEmit` and `npm run build`.

## Editorial provenance

The six video IDs, titles, publication timestamps, durations and original thumbnail URLs were verified against YouTube on 8 September 2026. Full caption requests returned no usable transcript. Consequently these pilot articles are concise summaries of Sean's public episode descriptions. Manor Born and Cempaka Seri also reference their linked Pokok.Asia write-ups. Each article states this limitation directly and links to its sources. No detailed transcript-derived statements, quotations, current asking prices or investment returns have been invented.

The site is labelled as an independent editorial prototype. Thumbnails are served from YouTube and videos are embedded through youtube-nocookie.com; both require external network access. Original videos may impose their own playback restrictions. Every embed has a direct YouTube fallback link.

Research downloads are ignored in `.research/` and are excluded from deployment. `scripts/research.py`, `scripts/episodes.py`, and `scripts/transcripts.py` document the public-source retrieval process and are not used at runtime.

## Publishing

The private Sites project is recorded in `.openai/hosting.json`. Publish the exact validated source and static build using the Sites workflow. Site access remains owner-only unless explicitly changed.
