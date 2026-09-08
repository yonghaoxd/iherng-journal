import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import './globals.css';
import { JournalNav } from '@/components/journal-nav';
export const metadata: Metadata = {
 metadataBase: new URL('https://iherng-journal.showtv1688ai.chatgpt.site'),
 title: { default: 'iherng Journal — Property, people & perspective', template: '%s | iherng Journal' },
 description: 'Explore Malaysian property reviews and iherng podcast episodes through concise, source-linked articles.',
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><div className="header-inner"><Link href="/" aria-label="iherng Journal home" className="wordmark">iherng<span>.</span><small>JOURNAL</small></Link><JournalNav /><a className="channel-link" href="https://www.youtube.com/@iherng" target="_blank" rel="noreferrer">Watch on YouTube <ArrowUpRight size={17}/></a></div></header>{children}<footer className="site-footer"><div className="container footer-inner"><div><Link className="wordmark" href="/">iherng<span>.</span><small>JOURNAL</small></Link><p>A reading companion to Sean Tan's videos.</p></div><div><p>Independent editorial prototype · 2026</p><p>Video content belongs to its respective creators.</p><a href="https://www.youtube.com/@iherng" target="_blank" rel="noreferrer">Find iherng on YouTube ↗</a></div></div></footer></body></html>;
}

