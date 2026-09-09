# iherng Journal

A responsive editorial reading companion to iherng's YouTube channel, with six property-review articles, three Asking Sean podcast articles, and nine buyer guides.

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
- `lib/articles.ts` registers articles; series definitions are in `content/series.json` and site-wide constants in `site.config.json`.
- Shared editorial components live in `components/journal.tsx`; styles in `app/globals.css`.
- `lib/seo.ts` builds the canonical URLs, Open Graph metadata and JSON-LD; `components/json-ld.tsx` renders it.
- There is no database, admin dashboard, or automatic publishing pipeline.

## Search engine assets

`sitemap.xml`, `robots.txt` and `feed.xml` are generated into `public/` by
`scripts/generate-seo-assets.mjs`, which runs automatically as the `prebuild`
step. Regenerate them on their own with `npm run seo`. The three files are
gitignored because every build rewrites them.

They are **not** Next.js metadata routes (`app/sitemap.ts` and friends), because
neither form survives this project's static export: vinext's
`emitStaticMetadataFiles` copies only literal metadata files and skips
code-generated ones, and `output: 'export'` drops route handlers entirely. Both
were tried and produced no output. If the site ever moves off static export,
they can move back into `app/`.

Structured data emitted per page:

| Page | JSON-LD |
| --- | --- |
| Every page | `WebSite` |
| `/articles/[slug]` | `Article`, `VideoObject`, `BreadcrumbList` |
| Series pages | `CollectionPage` with `ItemList`, `BreadcrumbList` |

The `VideoObject` describes Sean's original episode, which the page embeds — he
is marked as its creator and uploader, and `contentUrl` points at YouTube. The
`Article` records the summary as derived work via `isBasedOn` and `citation`.

The default social card is `public/og-default.png`, rebuilt with
`python scripts/make_og_image.py` after any palette, wordmark or count change.
Article pages use the episode's own YouTube thumbnail instead.

## Add an article

1. Copy an existing JSON content file and give it a unique slug and verified video ID.
2. Add its import to `lib/articles.ts` and include it in `articles`.
3. Write an original summary based on material actually reviewed, with accurate dates and source links. State whether full video content or only episode notes were available.
4. Collection counts are derived from the registered articles. Update any homepage or footer summary copy that refers to a fixed count.
5. Run `npx tsc --noEmit` and `npm run build`. The build regenerates the sitemap and feed; rerun `python scripts/make_og_image.py` if the counts on the social card changed.

## Editorial provenance

The original six video IDs, titles, publication timestamps, durations and thumbnail URLs were verified against YouTube on 8 September 2026. Full captions were unavailable for those episodes, so their articles stay within Sean's public episode descriptions; Manor Born and Cempaka Seri also reference their linked Pokok.Asia write-ups.

Three further property reviews—Dedaun Rimba, Sunway D'Hill and Allevia—were verified on 9 September 2026 using their public YouTube metadata and English captions. Each includes a “Sean's Take 3 on 3” that paraphrases the three strengths and three concerns presented in the corresponding review. Every article states its source basis and links to the original episode. No current asking prices or investment returns have been inferred.

The site is labelled as an independent editorial prototype. Thumbnails are served from YouTube and videos are embedded through youtube-nocookie.com; both require external network access. Original videos may impose their own playback restrictions. Every embed has a direct YouTube fallback link.

Research downloads are ignored in `.research/` and are excluded from deployment. The scripts in `scripts/` document the public-source retrieval and caption-cleaning process and are not used at runtime.

## Publishing

The private Sites project is recorded in `.openai/hosting.json`. Publish the exact validated source and static build using the Sites workflow. Site access remains owner-only unless explicitly changed.
