# Ask Sean (iherng)

An English Q&A bot that answers Malaysian property questions only from the iherng Journal's
Buyer Guides and iherng Podcast articles. Design and decisions: [DESIGN.md](DESIGN.md).

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
| `npm run eval:route` | Check the router against `evals/route.jsonl` | ≈ $0.01 |

## Answering

| Command | What it does | Cost |
|---|---|---|
| `npm run ask -- "your question"` | Route and answer one question, with sources and token cost | ≈ $0.0004 |
| `npm run eval:answers` | Answer `evals/answers.jsonl`, flag rule breaks, write a Markdown report to `evals/results/` | ≈ $0.01 |

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