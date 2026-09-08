import Link from 'next/link';
import { ArrowUpRight, Play } from 'lucide-react';
import { PropertySection, PodcastSection } from '@/components/journal';
export default function Home() {
 return <main id="main" className="container">
 <div className="edition-line"><span>THE IHERNG JOURNAL</span><span>PROPERTY. PEOPLE. PERSPECTIVE.</span></div>
 <section className="intro"><h1>A little perspective.<br /><span>A better place to call home.</span></h1><p>Property walkthroughs and honest conversations,<br className="desktop-break" /> distilled into a good read.</p></section>
 <section className="feature-grid" aria-label="Featured reading">
 <Link href="/articles/manor-born-ipoh" className="feature-photo"><img src="https://i.ytimg.com/vi/Em5Ls6ECFJ8/maxresdefault.jpg" alt="iherng's Manor Born property review in Ipoh" width="1280" height="720" /><span className="image-chip"><Play size={13} fill="currentColor" /> FROM THE VIDEO</span></Link>
 <div className="feature-story"><span className="eyebrow">THE EDITOR'S PICK <span>↗</span></span><div><p className="category">PROPERTY REVIEWS <span>· IPOH, PERAK</span></p><Link href="/articles/manor-born-ipoh"><h2>Manor Born:<br />big spaces,<br /><em>small community.</em></h2></Link><p className="story-deck">An intimate bungalow development with mountain views—and a few everyday trade-offs worth a closer look.</p></div><Link className="text-link" href="/articles/manor-born-ipoh">Read the story <ArrowUpRight size={21} /></Link></div>
 </section>
 <PropertySection /><PodcastSection />
 </main>;
}

