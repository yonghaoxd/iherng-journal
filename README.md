# iherng Journal

A responsive editorial reading companion to iherng's YouTube channel, with six property-review articles, three Asking Sean podcast articles, and three buyer guides.

## Run locally

```sh
npm install
npm run dev
```

## Architecture

- React + Vinext App Router, using the Sites starter.
- Static export configured in `next.config.ts`; public build output is `dist/client`.
- Home: `/`; series: `/property-reviews`, `/iherng-podcast`, and `/buyer-guides`.
- Each article has a permanent `/articles/[slug]` route.
- Article content lives in individual JSON files in `content/articles`.
- `lib/articles.ts` registers articles and holds the series definitions.
- Shared editorial components live in `components/journal.tsx`; styles in `app/globals.css`.
- There is no database, admin dashboard, or automatic publishing pipeline.

## Add an article

1. Copy an existing JSON content file and give it a unique slug and verified video ID.
2. Add its import to `lib/articles.ts` and include it in `articles`.
3. Write an original summary based on material actually reviewed, with accurate dates and source links. State whether full video content or only episode notes were available.
4. Collection counts are derived from the registered articles. Update any homepage or footer summary copy that refers to a fixed count.
5. Run `npx tsc --noEmit` and `npm run build`.

## Editorial provenance

The original six video IDs, titles, publication timestamps, durations and thumbnail URLs were verified against YouTube on 8 September 2026. Full captions were unavailable for those episodes, so their articles stay within Sean's public episode descriptions; Manor Born and Cempaka Seri also reference their linked Pokok.Asia write-ups.

Three further property reviews—Dedaun Rimba, Sunway D'Hill and Allevia—were verified on 9 September 2026 using their public YouTube metadata and English captions. Each includes a “Sean's Take 3 on 3” that paraphrases the three strengths and three concerns presented in the corresponding review. Every article states its source basis and links to the original episode. No current asking prices or investment returns have been inferred.

The site is labelled as an independent editorial prototype. Thumbnails are served from YouTube and videos are embedded through youtube-nocookie.com; both require external network access. Original videos may impose their own playback restrictions. Every embed has a direct YouTube fallback link.

Research downloads are ignored in `.research/` and are excluded from deployment. The scripts in `scripts/` document the public-source retrieval and caption-cleaning process and are not used at runtime.

## Publishing

The private Sites project is recorded in `.openai/hosting.json`. Publish the exact validated source and static build using the Sites workflow. Site access remains owner-only unless explicitly changed.
