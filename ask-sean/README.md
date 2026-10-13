# AIherng (Ask Sean)

The chatbot behind the Journal's `/ask` page. It answers Malaysian property questions,
asked in any language, in Sean's voice and in Simplified Chinese, only from the iherng
Journal's Buyer Guides and iherng Podcast articles, and cites the articles it used.
Design, decisions and eval history: [DESIGN.md](DESIGN.md) (Chinese, with an English summary).

It lives in the Journal repository as `ask-sean/` (it was the separate `asking-iherng`
repository until October 2026). Run every command below from this folder.

Run Wrangler with `--config wrangler.toml` here (the npm scripts already do). Without it,
Wrangler also finds the site's build output in `../.wrangler/` and refuses to choose.

## Setup

```sh
npm install
```

Fill in `DEEPSEEK_API_KEY` in `.env` (see `.env.example`). Articles are read from the live
site at `JOURNAL_SITE_URL` (default https://iherng-journal.pages.dev).

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is disabled.

## Knowledge base

| Command | What it does | Cost |
|---|---|---|
| `npm run kb:sync` | Read every Buyer Guides and iherng Podcast article listed in the live site's `feed.xml` into `knowledge/articles` | free |
| `npm run kb:enrich` | Generate aliases and example questions for new or changed articles (`-- --force` for all) | < $0.01 |
| `npm run kb:build` | Build `knowledge/catalog.json`, the index the router reads | free |
| `npm run kb` | All three in order | |
| `npm run eval:route` | Check the router against `evals/route.jsonl` (`-- --strict` fails on any miss) | ≈ $0.015 |

## Answering

| Command | What it does | Cost |
|---|---|---|
| `npm run ask -- "your question"` | Route and answer one question, with sources and token cost | ≈ $0.0009 |
| `npm run eval:answers` | Answer `evals/answers.jsonl`, flag rule breaks, write a Markdown report to `evals/results/` | ≈ $0.013 |

After enriching, read the files in `knowledge/enrich/`, fix anything wrong and set
`"reviewed": true`. Re-run `npm run kb:build` after any edit.

## API (Cloudflare Worker)

| Command | What it does |
|---|---|
| `npm run db:migrate:local` | Create the tables in the local D1 database |
| `npm run worker:dev` | Run the API at http://127.0.0.1:8787 (reads `DEEPSEEK_API_KEY` from `.env`) |
| `npm run worker:deploy` | Deploy the API; run `npm run kb:build` first so `knowledge/bundle.json` is current |

The Journal's `/ask` page calls this API. In local development it uses
`http://127.0.0.1:8787` automatically; in production it uses `askApiUrl` from the
Journal's `site.config.json`.

First deployment:

1. `npx wrangler d1 create ask-sean` and copy the printed `database_id` into `wrangler.toml`.
2. `npm run db:migrate:remote`
3. `npx wrangler secret put DEEPSEEK_API_KEY` (paste the key when asked)
4. `npm run worker:deploy` and put the printed `*.workers.dev` URL in the Journal's `site.config.json` as `askApiUrl`.

After the knowledge base changes (`npm run kb`), only the Worker needs redeploying.

Hide a question from the public feed:

```sh
npx wrangler d1 execute ask-sean --remote --command "UPDATE questions SET hidden = 1 WHERE id = '<id>'"
```
## Automatic updates

```
new Asking Sean video ──(your PC, daily 9:00)──▶ Journal article, published
Journal feed changes  ──(GitHub Actions, daily 10:00 + after each article)──▶ chatbot updated
```

**`scripts/auto-journal.ts`** runs from Windows Task Scheduler ("Ask Sean - auto journal",
installed by `scripts/install-auto-journal.ps1`). For each Asking Sean video uploaded after
the job's first run that has no article, it downloads the English captions (yt-dlp in
`.venv`), has DeepSeek write the article in the Journal's Ask Sean format, checks every
field and that Sean's quote appears word for word in the captions, builds the Journal,
then commits, pushes and deploys it and starts the GitHub workflow below. Any failure
leaves the Journal untouched and the video is retried daily, up to 5 times. It does
nothing while the Journal has uncommitted changes outside `ask-sean/`. Needs
`DEEPSEEK_API_KEY` in `.env`, and the local `gh` and `wrangler` logins; the Journal is
the repository this folder sits in, unless `JOURNAL_DIR` says otherwise.

Log: `.cache/auto-journal/log.txt`. Try it without publishing:

```sh
npm run auto:journal -- --dry-run --video <youtube id>
```

**`.github/workflows/update-knowledge.yml`** (at the repository root; it runs inside
`ask-sean/`) syncs from the live Journal, enriches
new articles, requires `npm run eval:route -- --strict` to pass, deploys the Worker,
commits the knowledge files and opens an issue listing the unreviewed aliases.
Repository secrets on `iherng-journal`: `DEEPSEEK_API_KEY` and `CLOUDFLARE_API_TOKEN`.