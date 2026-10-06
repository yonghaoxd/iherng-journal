import {
  articles,
  bodyTextFor,
  series,
  type Article,
  type SeriesKey,
} from '@/lib/articles';
import siteConfig from '@/site.config.json';

export const SITE_URL = siteConfig.url;
export const SITE_NAME = siteConfig.name;
export const SITE_DESCRIPTION = siteConfig.description;
export const CHANNEL_URL = siteConfig.channelUrl;
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export function absoluteUrl(path: string) {
  return path.startsWith('http') ? path : `${SITE_URL}${path}`;
}

export function articleUrl(article: Article) {
  return absoluteUrl(`/articles/${article.slug}`);
}

export function thumbnailUrl(article: Article) {
  return `https://i.ytimg.com/vi/${article.videoId}/maxresdefault.jpg`;
}

export function watchUrl(article: Article) {
  return `https://www.youtube.com/watch?v=${article.videoId}`;
}

export function embedUrl(article: Article) {
  return `https://www.youtube-nocookie.com/embed/${article.videoId}`;
}

/** "35:30" -> 2130. Durations in the content files are always MM:SS or H:MM:SS. */
export function durationSeconds(duration: string) {
  const parts = duration.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** "35:30" -> "PT35M30S", the ISO 8601 form Schema.org and video sitemaps expect. */
export function isoDuration(duration: string) {
  const total = durationSeconds(duration);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${
    seconds ? `${seconds}S` : ''
  }`;
}

/** Content files carry a publication date only; midday UTC matches `dateFor`. */
export function publishedAt(article: { date: string }) {
  return `${article.date}T12:00:00.000Z`;
}

export function latestArticleDate() {
  return articles
    .map((a) => a.date)
    .sort()
    .at(-1)!;
}

export function sortedByDateDesc(list: readonly Article[] = articles) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

const PUBLISHER = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/favicon.svg`,
  },
} as const;

const CREATOR = {
  '@type': 'Person',
  name: siteConfig.creatorName,
  alternateName: siteConfig.creatorHandle,
  url: CHANNEL_URL,
} as const;

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'en',
    publisher: PUBLISHER,
    about: CREATOR,
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * The page embeds Sean's original episode, so the video is marked up as his
 * work: he is the creator and uploader, and the canonical copy stays on YouTube.
 */
export function videoJsonLd(article: Article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${articleUrl(article)}#video`,
    name: article.videoTitle,
    description: article.excerpt,
    thumbnailUrl: [thumbnailUrl(article)],
    uploadDate: publishedAt(article),
    duration: isoDuration(article.duration),
    contentUrl: watchUrl(article),
    embedUrl: embedUrl(article),
    url: articleUrl(article),
    creator: CREATOR,
    publisher: CREATOR,
    inLanguage: 'en',
  };
}

export function articleJsonLd(article: Article) {
  const info = series[article.series as SeriesKey];
  const body = bodyTextFor(article).join('\n\n');

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${articleUrl(article)}#article`,
    headline: article.title,
    description: article.excerpt,
    articleSection: info.title,
    datePublished: publishedAt(article),
    dateModified: publishedAt(article),
    inLanguage: 'en',
    isAccessibleForFree: true,
    wordCount: body.split(/\s+/).filter(Boolean).length,
    keywords: [
      article.tag,
      ...('propertyType' in article && typeof article.propertyType === 'string'
        ? [article.propertyType]
        : []),
      ...('location' in article && article.location ? [article.location] : []),
    ],
    image: [thumbnailUrl(article)],
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl(article) },
    author: { '@type': 'Organization', name: 'iherng Journal Editorial', url: SITE_URL },
    publisher: PUBLISHER,
    /* The summary is derived from Sean's episode, not an original report. */
    isBasedOn: watchUrl(article),
    citation: article.sources.map((source) => source.url),
    video: { '@id': `${articleUrl(article)}#video` },
  };
}

/**
 * Canonical + Open Graph for a series landing page. A page-level `openGraph`
 * replaces the layout's, so the shared fields are restated here.
 */
export function seriesMetadata(id: SeriesKey, description: string) {
  const info = series[id];
  return {
    title: info.title,
    description,
    alternates: { canonical: `/${id}` },
    openGraph: {
      type: 'website' as const,
      url: `/${id}`,
      siteName: SITE_NAME,
      locale: 'en_US',
      title: `${info.title} — ${SITE_NAME}`,
      description,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: info.title }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: `${info.title} — ${SITE_NAME}`,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function seriesJsonLd(id: SeriesKey) {
  const info = series[id];
  const entries = sortedByDateDesc(articles.filter((a) => a.series === id));

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl(`/${id}`)}#collection`,
    name: info.title,
    description: info.intro,
    url: absoluteUrl(`/${id}`),
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: PUBLISHER,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: entries.length,
      itemListElement: entries.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: articleUrl(article),
        name: article.title,
      })),
    },
  };
}
