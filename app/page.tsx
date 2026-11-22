import { ArrowUpRight } from 'lucide-react';
import { AskSeanChat } from '@/components/ask-sean-chat';
import { AskFeed } from '@/components/ask-feed';
import { AIherngName } from '@/components/aiherng-name';
import { articles, seriesCount } from '@/lib/articles';

/** "37:13" or "1:02:05" → seconds. */
function seconds(duration: string | undefined): number {
  return (duration ?? '').split(':').reduce((total, part) => total * 60 + (Number(part) || 0), 0);
}

// What AIherng answers from: the Asking Sean episodes and buyer guides in its knowledge base.
const knowledge = articles.filter((article) => article.series === 'iherng-podcast' || article.series === 'buyer-guides');
const episodeCount = knowledge.length;
const hours = Math.round(knowledge.reduce((total, article) => total + seconds(article.duration), 0) / 3600);
const newest = knowledge.reduce((latest, article) => (article.date > latest ? article.date : latest), '');
const newestLabel = new Date(`${newest}T12:00:00Z`).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * The home page is AIherng and nothing else, after ask.lizheng.ai: the question box,
 * what others are asking, and where the answers come from. Reviews, the 4 Steps and
 * the calculators are one click away in the header.
 */
export default function Home() {
  return (
    <main id="main" className="home-page home-ask">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-inner">
          <h1 id="home-title" className="home-title">
            Any property question?
            <br />
            Ask <AIherngName variant="serif" />.
          </h1>
          <p className="home-lead">
            Buying, loans, hidden costs, renting out. Ask in your own words and get a straight
            answer, with the video it comes from.
          </p>
          <AskSeanChat />
        </div>
      </section>

      <div className="container home-ask-sections">
        <AskFeed />

        <section className="askfeed askfeed-sources" aria-labelledby="sources-title">
          <h2 id="sources-title" className="askfeed-side-title">
            Where the answers come from
          </h2>
          <div className="sources-body">
            <div className="sources-stats">
              <div>
                <strong>
                  {episodeCount} <span>episodes</span>
                </strong>
                <span>Asking Sean and buyer guides, 2017 to now</span>
              </div>
              <div>
                <strong>
                  {hours} <span>hours</span>
                </strong>
                <span>of Sean on video, read from the full captions</span>
              </div>
            </div>
            <div className="sources-text">
              <p>
                <AIherngName /> only quotes Sean: his Asking Sean episodes, his buyer guides and the parts of
                interviews where he is the one speaking.
              </p>
              <p>
                When a guest answers, such as a mortgage banker or a lawyer, the source says so. A guest&apos;s view
                is never passed off as Sean&apos;s.
              </p>
              <p className="small">
                Right now: {seriesCount('iherng-podcast')} Asking Sean episodes and {seriesCount('buyer-guides')}{' '}
                buyer guides, written up from their full English captions. Every quote in them is checked word for
                word against the captions.
              </p>
              <p className="small">Every answer names its episodes and links to the video on YouTube.</p>
              <a href="https://www.youtube.com/@iherng" target="_blank" rel="noreferrer">
                Watch Sean&apos;s channel on YouTube <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
            <p className="sources-note">
              Answers are written by AI from Sean&apos;s public videos, not by Sean himself. Newest episode in the
              knowledge base: {newestLabel}.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
