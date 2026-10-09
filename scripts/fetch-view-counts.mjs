/**
 * Writes content/view-counts.json: the YouTube view count of every article's
 * video, which the series pages use to sort by most or least viewed.
 *
 *     npm run views
 *
 * Run it before a build when you want fresher counts, and commit the file.
 * It is deliberately not part of `prebuild`: counts change daily, and a build
 * that rewrites a tracked file would leave the tree dirty for the automated
 * journal job. A video that can't be read keeps its previous count.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'content', 'view-counts.json');
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');

const videoIds = [
  ...new Set(
    fs
      .readdirSync(ARTICLES_DIR)
      .filter((file) => file.endsWith('.json'))
      .map(
        (file) =>
          JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8'))
            .videoId,
      )
      .filter(Boolean),
  ),
].sort((a, b) => a.localeCompare(b));

const previous = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, 'utf8')).views
  : {};

async function viewCount(videoId) {
  const response = await fetch(
    `https://www.youtube.com/watch?v=${videoId}&hl=en`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'en',
        // Skips the EU consent interstitial, which has no player data.
        Cookie: 'CONSENT=YES+1',
      },
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  // The player response's videoDetails carries the exact count as a string.
  const match = html.match(/"videoDetails":\{.*?"viewCount":"(\d+)"/s);
  if (!match) throw new Error('no viewCount in page');
  return Number(match[1]);
}

const views = {};
let failures = 0;
for (const id of videoIds) {
  try {
    views[id] = await viewCount(id);
  } catch (error) {
    failures += 1;
    if (previous[id] !== undefined) views[id] = previous[id];
    console.warn(
      `${id}: ${error.message}${previous[id] !== undefined ? ' (kept previous count)' : ''}`,
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
}

const fetchedAt = new Date().toLocaleDateString('en-CA', {
  timeZone: 'Asia/Kuala_Lumpur',
});
fs.writeFileSync(OUT, JSON.stringify({ fetchedAt, views }, null, 2) + '\n');
console.log(
  `Wrote ${Object.keys(views).length} of ${videoIds.length} view counts to content/view-counts.json` +
    (failures ? ` (${failures} not refreshed)` : ''),
);
