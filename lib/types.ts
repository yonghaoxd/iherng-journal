export type Series = "buyer-guides" | "iherng-podcast";

/** What the Journal summary was written from; it decides how confidently the bot may speak. */
export type Basis = "captions" | "episode-notes" | "sean-guide";

/** One Journal article: a viewer's question and Sean's answer from an episode. */
export interface Article {
  id: string;
  series: Series;
  title: string;
  excerpt: string;
  date: string;
  tag: string;
  question: {
    /** Who asked, e.g. "From CY, a viewer who wrote in by email". Empty for general episodes. */
    asker: string;
    /** The viewer's situation: age, income, the property in question. */
    context: string;
    text: string;
  };
  answer: {
    /** Sean's words, verbatim from the captions. The only text that may be quoted as his. */
    quote: string;
    /** The Journal's paraphrase of his answer. */
    summary: string;
  };
  reasons: { title: string; body: string }[];
  actions: string[];
  /** When Sean's answer does not apply. Empty if the article has none. */
  caveat: string;
  basis: Basis;
  sourceNote: string;
  askingSeanEpisode: number | null;
  video: { id: string; title: string; duration: string; url: string };
  articleUrl: string;
}

export interface Manifest {
  articles: Record<string, { hash: string }>;
}

export interface Enrichment {
  id: string;
  /** Hash of the article this was generated from; a mismatch means the article changed. */
  sourceHash: string;
  /** Set to true by hand after checking the generated aliases and questions. */
  reviewed: boolean;
  aliases: string[];
  questions: string[];
}

export interface CatalogEntry {
  id: string;
  title: string;
  date: string;
  series: Series;
  askingSeanEpisode: number | null;
  tag: string;
  excerpt: string;
  viewerQuestion: string;
  answer: string;
  points: string[];
  aliases: string[];
  questions: string[];
}

export interface Catalog {
  version: string;
  articles: CatalogEntry[];
}

/** knowledge/bundle.json: the catalog plus full articles, bundled into the Worker. */
export interface KnowledgeBundle {
  catalog: Catalog;
  articles: Article[];
}

export interface Knowledge {
  catalog: Catalog;
  articles: Map<string, Article>;
}
