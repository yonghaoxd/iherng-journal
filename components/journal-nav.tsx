'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { articles } from '@/lib/articles';
import { Home, Building2, Mic, BookOpen, Calculator, Menu, X } from 'lucide-react';

export function JournalNav() {
  const path = usePathname();
  const current = articles.find((a) => path === `/articles/${a.slug}`)?.series;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const countFor = (series: string) =>
    String(articles.filter((article) => article.series === series).length).padStart(2, '0');

  const links = [
    { href: '/', title: 'Home', icon: Home },
    {
      href: '/property-reviews',
      title: 'Property Reviews',
      badge: countFor('property-reviews'),
      icon: Building2,
    },
    {
      href: '/iherng-podcast',
      title: 'iherng Podcast',
      badge: countFor('iherng-podcast'),
      icon: Mic,
    },
    {
      href: '/buyer-guides',
      title: 'Buyer Guides',
      badge: countFor('buyer-guides'),
      icon: BookOpen,
    },
    { href: '/calculator', title: 'Calculator', icon: Calculator },
  ];

  return (
    <>
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map((link) => {
          const active =
            path === link.href || (Boolean(current) && link.href === `/${current}`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={14} className="nav-icon" />
              <span>{link.title}</span>
              {link.badge && <span className="nav-badge">{link.badge}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-expanded={mobileMenuOpen}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-modal="true">
          <div className="mobile-nav-links">
            {links.map((link) => {
              const active =
                path === link.href || (Boolean(current) && link.href === `/${current}`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`mobile-nav-item ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{link.title}</span>
                  </div>
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </Link>
              );
            })}
            <a
              href="https://www.youtube.com/@iherng"
              target="_blank"
              rel="noreferrer"
              className="mobile-channel-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Watch @iherng on YouTube ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}
