# Article JSON fields

Every podcast and buyer guide article is one file in `content/articles/`. TypeScript
infers the article type from the JSON files registered in `lib/articles.ts`, so a
missing or misspelt field shows up in `npx tsc --noEmit` or as a broken page. Copy
the field order below.

| Field | Rule |
| --- | --- |
| `slug` | kebab-case topic, 3–6 words, unique; it becomes `/articles/<slug>`. Name the topic, not the viewer |
| `series` | `"iherng-podcast"` or `"buyer-guides"` |
| `episode` | Podcast: the Asking Sean number. Guide: next guide sequence number |
| `title` | The reader's question, ≤ 70 characters, ends with "?" |
| `shortTitle` | ≤ 30 characters, for cards and breadcrumbs |
| `tag` | Short topic label, e.g. `"Mortgage Strategy"`, `"Leasehold & tenure"`. Shown on the card only; it does not drive the filter, so it can be specific |
| `category` | One id from `content/categories.json`, the fixed topic list the series page filters by (`loans-finance`, `buying-process`, `choosing-a-home`, `investing-risk`, `family-life`, `retirement-legacy`). Pick the best fit; never invent one. The build fails on anything else |
| `date` | `YYYY-MM-DD` publication date in Malaysia time (from `fetch_episode.py`) |
| `videoId` | The YouTube ID |
| `videoTitle` | The video's title exactly as on YouTube |
| `duration` | `m:ss` or `h:mm:ss`, from `fetch_episode.py` |
| `excerpt` | 1–2 sentences, ≤ 220 characters: the situation, then what Sean explains. Used on cards, in search and in the RSS feed |
| `qa` | See SKILL.md; 3–4 `reasons`, 3–5 `actions`; `answeredBy` (between `question` and `quote`) only when a guest answers, as in `tenant-not-paying-rent.json` |
| `sourceNote` | Fixed pattern, see below |
| `sources` | `[{ "label": "Original video and English captions · <D Month YYYY>", "url": "https://www.youtube.com/watch?v=<id>" }]` |
| `location` | Guides: `"Malaysia Nationwide"` unless the topic is local. Podcast: who or where it concerns |

`sourceNote` pattern (adapt the episode name, and add one sentence on anything
time-sensitive):

> Summarised from Sean's full English captions for Asking Sean #283. The quoted
> answer is verbatim; everything else is paraphrased. Figures are as Sean stated
> them in the episode. EPF dividends, loan rates and tax rules change, so check
> current ones for your own situation.

For a video that isn't an Asking Sean episode, describe it instead: "…for this
September 2025 episode, which draws on NAPIC data from 2015 to 2024." Any sponsor
or stake Sean declares goes at the end: "Sean is a customer of FAR Capital, not
its owner."

## Worked example (trimmed)

```json
{
  "slug": "settle-housing-loan-early",
  "series": "buyer-guides",
  "episode": 7,
  "title": "Should You Settle Your Housing Loan Early?",
  "shortTitle": "Early Mortgage Repayment",
  "tag": "Mortgage Strategy",
  "category": "loans-finance",
  "date": "2025-05-14",
  "videoId": "jA5cBaGWCPI",
  "videoTitle": "ASKING SEAN #283 | SETTLE THE LOAN EARLY TO SAVE ON INTEREST?",
  "duration": "26:08",
  "excerpt": "A reader with three mortgages dreams of being debt-free. Sean explains why he would keep the loans running, and what to do with the spare cash instead.",
  "qa": {
    "kind": "question",
    "asker": "Miss N, a viewer who wrote in by email",
    "context": "Miss N is in her early 30s, single, and earns about RM15,000 a month. She has three mortgages: a rented unit, a commercial lot and a landed home under renovation.",
    "question": "Should she pay the loans off as fast as possible to save on interest, or let them run the full term?",
    "quote": "I will definitely not settle the loan.",
    "answer": "Keep the loans running. At around 4%, a housing loan is the cheapest money you can get, so spare cash should go where it earns more than the loan costs.",
    "reasons": [
      {
        "title": "Settling early can raise your tax bill",
        "body": "Rent counts as taxable income, but the interest on a rental property loan is a deductible expense. Clear the loan and that deduction disappears."
      }
    ],
    "actions": [
      "Leave loans alone on units whose rent already covers the instalment.",
      "Keep a buffer of about six months of instalments for every unit."
    ],
    "caveat": "If owing the bank keeps you up at night, settling is a legitimate choice. Sean treats it as a question of peace of mind rather than maths."
  },
  "sourceNote": "Summarised from Sean's full English captions for Asking Sean #283. The quoted answer is verbatim; everything else is paraphrased. Figures are as Sean stated them in the episode.",
  "sources": [
    { "label": "Original video and English captions · 14 May 2025", "url": "https://www.youtube.com/watch?v=jA5cBaGWCPI" }
  ],
  "location": "Malaysia Nationwide"
}
```

The real file has four reasons and five actions; this example is trimmed for
length.
