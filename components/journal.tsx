import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Play, Headphones } from 'lucide-react';
import { articles, imageFor, dateFor, readingTime, series, type Article, type SeriesKey } from '@/lib/articles';

export function ArticleCard({article}: {article:Article}) {
 return <article className="article-card"><Link href={`/articles/${article.slug}`} className="card-image" aria-label={`Read ${article.shortTitle}`}><img src={imageFor(article)} alt={`Video thumbnail: ${article.videoTitle}`} width="1280" height="720" loading="lazy"/><span className="video-duration"><Play size={11} fill="currentColor"/>{article.duration}</span></Link><div className="card-copy"><p className="category">{article.tag} <span>· #{article.episode}</span></p><h3><Link href={`/articles/${article.slug}`}>{article.title}</Link></h3><p className="card-excerpt">{article.excerpt}</p><div className="card-bottom"><span>{readingTime(article)} min read <span>·</span> {dateFor(article)}</span><Link href={`/articles/${article.slug}`} aria-label={`Read ${article.shortTitle}`}><ArrowUpRight size={20}/></Link></div></div></article>;
}

export function PropertySection() {
 return <section className="article-section"><div className="section-top"><div><p className="eyebrow">01 / ON LOCATION</p><h2>Property Reviews<span className="count">03</span></h2><p>Step inside the homes. Look beyond the brochure.</p></div><Link className="text-link" href="/property-reviews">View the series <ArrowRight size={18}/></Link></div><div className="article-grid">{articles.filter(a=>a.series==='property-reviews').map(a=><ArticleCard key={a.slug} article={a}/>)}</div></section>;
}

export function PodcastSection() {
 return <section className="podcast-section"><div className="podcast-intro"><p className="eyebrow"><Headphones size={17}/>02 / IN CONVERSATION</p><h2>Good questions.<br/><em>Better conversations.</em></h2><p>From the iherng Podcast. Ideas to sit with, long after the episode ends.</p><Link href="/iherng-podcast" className="text-link">Explore the podcast <ArrowUpRight size={19}/></Link></div><div className="podcast-list">{articles.filter(a=>a.series==='iherng-podcast').map(a=><article key={a.slug}><Link href={`/articles/${a.slug}`} className="podcast-thumb" aria-label={`Read ${a.shortTitle}`}><img src={imageFor(a)} alt={`Video thumbnail: ${a.videoTitle}`} width="1280" height="720" loading="lazy"/></Link><div><p className="eyebrow">ASKING SEAN #{a.episode} <span>· {readingTime(a)} MIN READ</span></p><h3><Link href={`/articles/${a.slug}`}>{a.title}</Link></h3><p>{a.tag}</p></div><Link className="podcast-arrow" href={`/articles/${a.slug}`} aria-label={`Read ${a.shortTitle}`}><ArrowUpRight size={23}/></Link></article>)}</div></section>;
}

export function SeriesPage({id}: {id:SeriesKey}) {
 const info=series[id];const entries=articles.filter(a=>a.series===id);
 return <main id="main" className="container series-page"><div className="breadcrumb"><Link href="/">Home</Link><span>/</span><span>{info.title}</span></div><section className="series-hero"><p className="eyebrow">SERIES {info.number} / {info.label}</p><h1>{info.title}<span className="orange-dot">.</span></h1><div className="series-description"><p>{info.intro}</p><span className="series-count">03 ARTICLES</span></div></section><div className="listing-label"><span>THE COLLECTION</span><span>CURATED EPISODE READS</span></div><section className="article-grid" aria-label={`${info.title} articles`}>{entries.map(a=><ArticleCard key={a.slug} article={a}/>)}</section><aside className="other-series"><p className="eyebrow">KEEP EXPLORING</p><Link href={id==='property-reviews'?'/iherng-podcast':'/property-reviews'}><span>{id==='property-reviews'?'A conversation worth reading.':'Another home. Another perspective.'}</span><ArrowRight size={27}/></Link></aside></main>;
}
