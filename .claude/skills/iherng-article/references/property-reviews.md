# Property reviews

A review should tell a reader quickly what this project has that others don't,
where it is, and what Sean himself thinks. Keep it short and specific; readers
skim reviews, and the embedded episode carries the detail.

## Shape

`content/articles/<slug>.json`, series `property-reviews`, `episode` = the review
number in the video title. Copy the fields of an existing review such as
`sunway-dhill-kota-damansara.json`. `propertyType` must be `Landed` or
`High-Rise` (the series page filters by it, and the build enforces it); reviews
have no `category`.

`stage` records what Sean filmed: `show-unit` when he toured a sales gallery or
show unit while the project was still being built (a launch, "handover in two
or three years"), `completed` when he saw the finished project (an owner's unit,
vacant possession, a revisit after completion). Decide from the transcript, not
the title. It is the stage at filming, not today. Show-unit reviews get a
badge and a note on the page that the project was still being built, and the
series page filters by it.

`state` is the project's state or federal territory, exactly as listed in
`content/states.json` (e.g. `Kuala Lumpur`, `Selangor`, `Negeri Sembilan`), and
`location` ends with it: `"location": "Subang Jaya, Selangor"`, `"state":
"Selangor"`. The State filter shows only states that have a review.

- `sections`: two, each 1–2 short paragraphs (about 130–150 words in all), plus
  an optional third:
  1. **"What sets it apart"**: the features that distinguish this project, with
     Sean's figures (units, sizes, layout, price and psf).
  2. **"Where it is"**: the location as Sean describes it: roads, transit,
     schools, malls, neighbours, and anything he flags about the surroundings.
  3. **"Rent and returns"**, only when Sean talks about it: rents he quotes (say
     who gave the figure, e.g. the developer's team), who rents there, whether
     rent covers the instalment, subsale or capital-gain figures, investor tips,
     and whether he sees it as own-stay or investment. If he doesn't discuss
     rent, leave this section out rather than guess.
- `standout` (optional): `{ "title", "body" }`, the one idea in the project
  that visibly impressed Sean, shown on the page as "What caught Sean's eye".
  Look for where he marvels ("wow", "my favourite", "first time I've seen",
  "clever", "I really appreciate") at something specific to this project, such
  as Meta Residences splitting its deck between SOHO and residents so each side
  pays its own share of maintenance. Title: a short claim; body: 2-3 sentences
  on what it is and why it matters, in his terms. It should be a design or
  planning idea, not the location, and can overlap one of his pros. If nothing
  in the episode clearly stands out to him, leave the field out.
- `seanTake`: `pros` and `cons`, three each. Every review episode ends with
  "Sean's take three on three": three things he likes, then three he doesn't.
  Find that segment near the end of the transcript and follow it **in his
  order**, one item per point, keeping his specifics and his reasoning
  (including the upside he mentions for a drawback). This is the heart of the
  page, so don't merge, reorder or add points of your own.
- `closing`: one sentence: who the project suits, ideally Sean's own
  conclusion or punchline.
- `takeaways`: three short lines, used for search and the RSS feed.
- `excerpt`: one sentence for search and share previews (not shown on the page).
- `sourceNote`: "Based on Sean's full English captions for this <Month YYYY>
  episode. The 3 on 3 follows the three things he likes and the three he
  doesn't, in his order, at the end of the video." Then say who hosted the
  visit if Sean says so (the developer's team, or an owner/viewer).

There is no verbatim quote in a review, so `verify_quotes.py` doesn't apply;
check figures against the transcript by hand.

Avoid: tour-guide narration ("coming in, you'll see…"), generic praise, room
by room measurements unless they are what makes the project different, and
anything Sean didn't say.
