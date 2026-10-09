/**
 * Fails the build when article content breaks the Journal's fixed filters or
 * its registry. Runs as the first `prebuild` step, and on its own with
 * `npm run check`.
 *
 * - Podcast and buyer guide articles need a `category` from
 *   content/categories.json. The list is fixed so the topic filter stays short
 *   as articles are added; a new topic means editing that file on purpose.
 * - Property reviews need a `propertyType` of Landed or High-Rise, and a
 *   `stage`: `show-unit` if Sean filmed a show unit while the project was
 *   being built, `completed` if he saw the finished project. Their `state`
 *   must be in content/states.json and end their `location`
 *   ("Subang Jaya, Selangor" has state "Selangor").
 * - Every article file is registered in lib/articles.ts, and slugs and video
 *   IDs are unique.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const SERIES = Object.keys(readJson(path.join(ROOT, 'content', 'series.json')));
const CATEGORY_IDS = readJson(
  path.join(ROOT, 'content', 'categories.json'),
).map((category) => category.id);
const PROPERTY_TYPES = ['Landed', 'High-Rise'];
const STAGES = ['show-unit', 'completed'];
const STATES = readJson(path.join(ROOT, 'content', 'states.json'));
const registry = fs.readFileSync(path.join(ROOT, 'lib', 'articles.ts'), 'utf8');

const problems = [];
const seen = { slug: new Map(), videoId: new Map() };

for (const file of fs
  .readdirSync(ARTICLES_DIR)
  .filter((f) => f.endsWith('.json'))) {
  const article = readJson(path.join(ARTICLES_DIR, file));
  const where = `content/articles/${file}`;

  if (!SERIES.includes(article.series)) {
    problems.push(`${where}: unknown series "${article.series}"`);
  } else if (article.series === 'property-reviews') {
    if (!PROPERTY_TYPES.includes(article.propertyType)) {
      problems.push(
        `${where}: propertyType must be ${PROPERTY_TYPES.join(' or ')}, not "${article.propertyType}"`,
      );
    }
    if (!STAGES.includes(article.stage)) {
      problems.push(
        `${where}: stage must be ${STAGES.join(' or ')} (what Sean filmed), not "${article.stage}"`,
      );
    }
    // The standout is optional, but when present it needs both parts.
    if (
      article.standout !== undefined &&
      !(article.standout?.title?.trim() && article.standout?.body?.trim())
    ) {
      problems.push(
        `${where}: standout needs a non-empty title and body, or leave it out`,
      );
    }
    if (!STATES.includes(article.state)) {
      problems.push(
        `${where}: state must be one of content/states.json, not "${article.state}"`,
      );
    } else if (article.location.split(',').pop().trim() !== article.state) {
      problems.push(
        `${where}: location "${article.location}" should end with its state, "${article.state}"`,
      );
    }
  } else if (!CATEGORY_IDS.includes(article.category)) {
    problems.push(
      `${where}: category must be one of ${CATEGORY_IDS.join(', ')} (content/categories.json), not "${article.category}"`,
    );
  }

  if (`${article.slug}.json` !== file) {
    problems.push(
      `${where}: slug "${article.slug}" does not match the file name`,
    );
  }
  for (const key of ['slug', 'videoId']) {
    const other = seen[key].get(article[key]);
    if (other)
      problems.push(
        `${where}: duplicate ${key} "${article[key]}" (also in ${other})`,
      );
    seen[key].set(article[key], where);
  }
  if (!registry.includes(`'@/content/articles/${file}'`)) {
    problems.push(`${where}: not imported in lib/articles.ts`);
  }
}

if (problems.length) {
  console.error(
    `Content check failed (${problems.length}):\n- ${problems.join('\n- ')}`,
  );
  process.exit(1);
}
console.log(`Content check passed: ${seen.slug.size} articles.`);
