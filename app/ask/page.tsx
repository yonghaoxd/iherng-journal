import Link from 'next/link';
import { MessageCircleQuestion } from 'lucide-react';
import { AskSeanChat } from '@/components/ask-sean-chat';
import { AIherngName } from '@/components/aiherng-name';
import { JsonLd } from '@/components/json-ld';
import { DEFAULT_OG_IMAGE, SITE_NAME, breadcrumbJsonLd } from '@/lib/seo';

const TITLE = 'AIherng — 用 AI 问 Sean 的买房建议';
const DESCRIPTION =
  '用中文问马来西亚买房问题，AI 根据 iherng Journal 整理的 Asking Sean 节目和 Buyer Guides 回答，每个回答都附原文和原视频。';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/ask' },
  openGraph: {
    type: 'website' as const,
    url: '/ask',
    siteName: SITE_NAME,
    locale: 'zh_CN',
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function AskPage() {
  return (
    <main id="main" className="container askbot-page" lang="zh-Hans">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'AIherng', path: '/ask' },
        ])}
      />

      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="slash">/</span>
        <span className="active">
          <AIherngName />
        </span>
      </div>

      <section className="series-hero-banner">
        <div className="hero-badge">
          <MessageCircleQuestion size={13} />
          <span>AI 问答 · 根据 SEAN 的节目</span>
        </div>
        <h1 className="series-heading">
          <AIherngName variant="serif" />
          <span className="orange-dot">.</span>
        </h1>
        <div className="series-intro-row">
          <p className="series-intro-text">
            买房卡住了？直接问。回答只从 Journal 整理的 Asking Sean 节目和 Buyer Guides
            里来，先给你 Sean 的建议和做法，每段都附原文和原视频。
          </p>
        </div>
      </section>

      <AskSeanChat />
    </main>
  );
}
