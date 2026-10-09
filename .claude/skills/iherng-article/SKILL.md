---
name: iherng-article
description: Write a new iherng Journal article for the iherng Podcast or Buyer Guides series from one of Sean Tan's (iherng) YouTube videos, in the Journal's "Ask Sean" question-and-answer format, from the full English captions, with a verbatim quote check, registration, build, and commit. Use this whenever the user asks to add, write, publish or rewrite a podcast or buyer guide article, turn an Asking Sean episode or an iherng video into an article, "add N more articles", fill the Buyer Guides or iherng Podcast series, or fix an article's summary, even if they only paste a YouTube link or say "加多几篇 article". Not for property reviews (those keep the chaptered format) or for the Ask Sean chatbot's knowledge base.
---

# Writing an iherng Journal article

The Journal is an independent reading companion to Sean Tan's (@iherng) Malaysian
property channel. Readers arrive with a real problem ("should I settle my loan
early?"), so every iherng Podcast and Buyer Guides article answers one question:
the situation, Sean's verdict, why, what to do, and when it does not apply. The
format is rendered by `components/ask-sean-summary.tsx` from a `qa` object in the
article's JSON; README.md ("Article formats") describes it for humans.

The two things that matter most, and why:

- **Faithfulness.** Every claim is something Sean actually said in that video.
  The article sits next to the embedded episode and carries his name, so an
  invented figure or a misread caption puts words in a real person's mouth.
  When the captions are unclear, leave the point out rather than guess.
- **Usefulness.** The reader should finish knowing what to do. Prefer Sean's
  concrete numbers, rules of thumb and steps over his asides and anecdotes.

## Workflow

### 1. Pick the video

Check what is already covered first, so you don't duplicate a topic:

```bash
node -e "for (const f of require('fs').readdirSync('content/articles')) { const a = require('./content/articles/' + f); console.log(a.series.padEnd(17), a.episode, a.videoId, a.slug) }"
```

`.research/buyer-guide-channel-videos.tsv` lists about 600 channel videos (id, -,
duration, title) to choose from; it can be stale, so newer uploads may be missing.

- **iherng Podcast:** an *Asking Sean #N* episode where a viewer brings their own
  dilemma (family money, a specific purchase, a life change). `episode` is the
  Asking Sean number.
- **Buyer Guides:** a practical topic many buyers face (loans, leasehold,
  defects, purchase channels, unsold stock). It can come from an Asking Sean
  episode or a standalone video. `episode` is the guide's sequence number: one
  more than the current highest buyer guide.
- **When a guest gives the answer** (Sean interviewing a lawyer, say), credit
  them with `qa.answeredBy: { "name", "role" }`. The page then labels it "LAWYER
  TEA'S ANSWER" rather than "Sean's answer", and the chatbot attributes the advice
  to them. Without it, the guest's advice would be credited to Sean.
  - Take the name as the video description gives it (e.g. "Lawyer Tea"), and
    leave out contact details.
  - The quote must be the guest's own words. Captions have no speaker labels,
    so tell speakers apart by what they say (Sean asks, the guest explains).
  - If two guests can't be told apart, credit both in `name` ("Gary and Xin
    Hui") and say so in `sourceNote`.
  - Panels and keynotes with several people talking over each other are still
    best skipped, because no single answer can be fairly credited.

### 2. Fetch and read the captions

```bash
python .claude/skills/iherng-article/scripts/fetch_episode.py VIDEO_ID [VIDEO_ID ...] --series buyer-guides
```

It saves Sean's English captions to `.research/<series folder>/<id>.en-orig.txt`
(where `scripts/verify_quotes.py` looks), and prints the title, the date in
Malaysia time, the duration and any guest/sponsor warning. Use those printed
values for `date`, `videoTitle` and `duration`. YouTube rate-limits caption
requests (HTTP 429); the script pauses between videos, and a failed one can be
retried a minute later. Write the article only from a full transcript, never
from the title or the description alone.

**Read the whole transcript**, not just the start. Auto-captions have no
punctuation and mishear words, so read for meaning:

- Ringgit is written as spoken: "2008" can be RM2,800, "1,8" can be RM1,800, and
  "6,7" can mean "6,000 to 7,000". Accept a figure only when the context
  (Sean's own arithmetic, the viewer's email) makes it unambiguous.
- Names and places are often garbled ("free hole" = freehold, "secret" = CCRIS,
  "B purchase" = bulk purchase, "Jalamong Kiara" = Jalan Mont Kiara). Use the
  correct term in paraphrase, but leave out anything you can't identify with
  confidence.
- Note any sponsor, partnership or personal stake Sean declares that touches the
  advice (for example, being a client of a bulk-purchase club, owning a unit in
  the project discussed, or recommending a company his channel promotes). The
  article must say so, in `sourceNote`, as
  `property-research-before-buying.json` does ("Sean is a customer of FAR
  Capital, not its owner"). A sponsor of an unrelated product, such as a
  water filter read out at the start, needs no mention.

### 3. Write the article JSON

Save it as `content/articles/<slug>.json`. Read one existing article of the same
series first (for example `content/articles/settle-housing-loan-early.json`) and
match its tone: plain, specific, British spelling, no hype, no exclamation marks.
See `references/article-schema.md` for every field, with lengths and a worked
example.

The `qa` object:

| Field | What goes in it |
| --- | --- |
| `kind` | `"question"` when a viewer wrote in, `"problem"` for a topic Sean raises himself |
| `asker` | Initials or first name only, e.g. `"Miss N, a viewer who wrote in by email"`; leave the field out for a problem |
| `context` | 2–4 sentences of the viewer's facts as they stated them |
| `question` | The question, in one sentence |
| `answeredBy` | Only when a guest answers: `{ "name": "Lawyer Tea", "role": "a lawyer who acts for landlords…" }`; leave it out when Sean answers |
| `quote` | **One** line of the answerer's own words: verbatim, **under 15 words**, the verdict if possible |
| `answer` | 1–3 sentences: his verdict stated directly |
| `reasons` | 3–4 `{title, body}`; title a short claim, body 1–3 sentences with his figures |
| `actions` | 3–5 imperative steps the reader can take |
| `caveat` | When this answer doesn't apply |

Quote rules, because this is the only verbatim text on the page:

- Copy a contiguous run of caption words. You may add punctuation and capitals,
  nothing else.
- Choose a line with no misheard words, so it reads correctly once punctuated.
- Keep it under 15 words. Everything else is paraphrase, never long copied
  passages.

Privacy: viewers write in privately. Use initials, keep personal details to what
the answer needs, and leave out anything that identifies them (employer, exact
address, family members' names). Don't name developers or projects in a
negative light unless Sean's point depends on it.

### 4. Register it

In `lib/articles.ts`, add an import above `import seriesData from '@/content/series.json';`,
then add the name to `articles`:

- **iherng Podcast:** directly under the comment
  `// iherng Podcast, newest episode first; series pages keep this order.` when
  it is the newest episode; otherwise in date order within that block.
- **Buyer Guides:** at the end of the buyer guide entries (after the current
  highest-numbered guide), since guides display in registry order.

### 5. Verify

Run all of these and fix anything they report:

```bash
python scripts/verify_quotes.py
npx tsc --noEmit
npm run build
```

`verify_quotes.py` fails on a quote that isn't word for word in the transcript
or is 15 words or longer. The build regenerates the sitemap and RSS feed.

Then update copy that states a fixed count, because the series counters are
derived but some sentences are not:

```bash
grep -rn -i -w "nine\|ten\|eleven\|twelve\|thirteen\|fourteen\|fifteen" app components README.md
```

- README.md line 3 and `app/buyer-guides/page.tsx` mention counts.
- The social card shows per-series counts: run `python scripts/make_og_image.py`,
  then `npm run build` again.

Before finishing, re-read the article against the transcript once more:

- Is every figure his, and every name spelt correctly?
- Does each action follow from what he said?

### 6. Commit, and ask before publishing

Commit the article JSON, `lib/articles.ts`, and any count or social-card changes,
with a message like `Add buyer guide #10: <title>` and a short note on the source
and any caption judgement calls. Follow the repository's commit conventions.

Pushing and deploying are public actions. Ask the user before each one. When
they agree, deploy with:

```bash
npx.cmd wrangler pages deploy dist/client --project-name iherng-journal --branch main
```

On macOS or Linux, use `npx` in place of `npx.cmd`. After deploying, load
`https://iherng-journal.pages.dev/articles/<slug>` to confirm it is live. The
chatbot's daily workflow picks new articles up from the live site on its own.

## Reporting back

Tell the user, for each article:

- the title, and the video it came from
- the quote
- any points you left out because the captions were unclear
- any declared sponsor or stake you disclosed
- any video you skipped, and why
