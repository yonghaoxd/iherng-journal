'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { articles } from '@/lib/articles';
import { Home, Building2, Mic, BookOpen, Calculator, MessageCircleQuestion, Menu, X } from 'lucide-react';

export function JournalNav() {
  const path = usePathname();
  const current = articles.find((a) => path === `/articles/${a.slug}`)?.series;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerTop, setDrawerTop] = useState(0);

  // The page behind the open menu stays put, so the sticky header cannot drift away from it.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Widening past the mobile breakpoint hides the toggle, so close the menu with it.
    const desktop = window.matchMedia('(min-width: 1181px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', closeOnDesktop);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('resize', closeOnDesktop);
    };
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    if (!mobileMenuOpen) {
      // Start the menu at the header's real bottom edge, wherever the banner has scrolled.
      setDrawerTop(document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0);
    }
    setMobileMenuOpen(!mobileMenuOpen);
  };
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
    { href: '/ask', title: 'Asking Sean', icon: MessageCircleQuestion },
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
        onClick={toggleMobileMenu}
        aria-expanded={mobileMenuOpen}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Rendered into <body>: inside the header, whose backdrop-filter makes it the
          containing block for fixed children, the drawer was only as tall as the header
          and the links spilled out over the page with no background behind them. */}
      {mobileMenuOpen && createPortal(
        <div className="mobile-nav-drawer" role="dialog" aria-modal="true" style={{ top: drawerTop }}>
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
        </div>,
        document.body,
      )}
    </>
  );
}
