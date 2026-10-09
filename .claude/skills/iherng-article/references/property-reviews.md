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
