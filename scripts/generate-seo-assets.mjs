/**
 * Writes sitemap.xml, robots.txt and feed.xml into public/.
 *
 * These cannot be Next.js metadata routes here: vinext's static export only
 * copies *literal* metadata files and skips code-generated ones
 * (`emitStaticMetadataFiles` in vinext/dist/build/prerender.js does
 * `if (route.isDynamic) continue`), and route handlers are dropped entirely by
 * `output: 'export'`. Generating into public/ is the one path that survives the
 * static build. Runs automatically via the `prebuild` npm script.
 *
 * Source of truth is the same content the app reads: content/articles/*.json,
 * content/series.json and site.config.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const readJson = (relative) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));

const site = readJson('site.config.json');
const series = readJson('content/series.json');

const articles = fs
  .readdirSync(path.join(ROOT, 'content', 'articles'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => readJson(path.join('content', 'articles', file)))
  .sort((a, b) => b.date.localeCompare(a.date));

const articleUrl = (article) => `${site.url}/articles/${article.slug}`;
const thumbnailUrl = (article) =>
  `https://i.ytimg.com/vi/${article.videoId}/maxresdefault.jpg`;
const watchUrl = (article) => `https://www.youtube.com/watch?v=${article.videoId}`;
const embedUrl = (article) =>
  `https://www.youtube-nocookie.com/embed/${article.videoId}`;

/** Content files carry a date only; midday UTC matches the site's `dateFor`. */
const isoDate = (date) => `${date}T12:00:00.000Z`;

/** "35:30" -> 2130 */
const durationSeconds = (duration) =>
  duration.split(':').map(Number).reduce((total, part) => total * 60 + part, 0);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function latestDate(list) {
  return list.map((a) => a.date).sort().at(-1);
}

function buildSitemap() {
  const urls = [];

  urls.push({
    loc: site.url,
    lastmod: isoDate(latestDate(articles)),
    changefreq: 'weekly',
    priority: '1.0',
  });

  for (const id of Object.keys(series)) {
    const entries = articles.filter((a) => a.series === id);
    if (entries.length === 0) continue;
    urls.push({
      loc: `${site.url}/${id}`,
      lastmod: isoDate(latestDate(entries)),
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  // Standalone pages that are not part of a series.
  urls.push({
    loc: `${site.url}/calculator`,
    lastmod: isoDate(latestDate(articles)),
    changefreq: 'monthly',
    priority: '0.6',
  });

  for (const article of articles) {
    urls.push({
      loc: articleUrl(article),
      lastmod: isoDate(article.date),
      changefreq: 'monthly',
      priority: '0.7',
      image: thumbnailUrl(article),
      video: article,
    });
  }

  const body = urls
    .map((entry) => {
      const lines = [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        `    <lastmod>${entry.lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
      ];

      if (entry.image) {
        lines.push(
          '    <image:image>',
          `      <image:loc>${escapeXml(entry.image)}</image:loc>`,
          '    </image:image>'
        );
      }

      if (entry.video) {
        const v = entry.video;
        lines.push(
          '    <video:video>',
          `      <video:thumbnail_loc>${escapeXml(thumbnailUrl(v))}</video:thumbnail_loc>`,
          `      <video:title>${escapeXml(v.videoTitle)}</video:title>`,
          `      <video:description>${escapeXml(v.excerpt)}</video:description>`,
          `      <video:player_loc>${escapeXml(embedUrl(v))}</video:player_loc>`,
          `      <video:duration>${durationSeconds(v.duration)}</video:duration>`,
          `      <video:publication_date>${isoDate(v.date)}</video:publication_date>`,
          '      <video:family_friendly>yes</video:family_friendly>',
          '      <video:live>no</video:live>',
          `      <video:uploader info="${escapeXml(site.channelUrl)}">${escapeXml(
            site.creatorName
          )}</video:uploader>`,
          '    </video:video>'
        );
      }

      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${body}
</urlset>
`;
}

function buildRobots() {
  return `# ${site.name}
User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
Host: ${site.url}
`;
}

function buildFeed() {
  const items = articles
    .map((article) => {
      const info = series[article.series];
      const summary = [
        article.excerpt,
        ...article.takeaways.map((takeaway) => `• ${takeaway}`),
      ].join('\n\n');

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(articleUrl(article))}</link>
      <guid isPermaLink="true">${escapeXml(articleUrl(article))}</guid>
      <pubDate>${new Date(isoDate(article.date)).toUTCString()}</pubDate>
      <category>${escapeXml(info.title)}</category>
      <category>${escapeXml(article.tag)}</category>
      <description>${escapeXml(summary)}</description>
      <enclosure url="${escapeXml(thumbnailUrl(article))}" type="image/jpeg" length="0" />
      <source url="${escapeXml(watchUrl(article))}">${escapeXml(
        article.videoTitle
      )}</source>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(site.url)}</link>
    <description>${escapeXml(site.description)}</description>
    <language>${escapeXml(site.language)}</language>
    <lastBuildDate>${new Date(isoDate(latestDate(articles))).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(site.url)}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function write(name, contents) {
  const target = path.join(PUBLIC_DIR, name);
  fs.writeFileSync(target, contents, 'utf8');
  console.log(`  wrote public/${name} (${(contents.length / 1024).toFixed(1)} KB)`);
}

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
console.log(`Generating SEO assets for ${articles.length} articles...`);
write('sitemap.xml', buildSitemap());
write('robots.txt', buildRobots());
write('feed.xml', buildFeed());
