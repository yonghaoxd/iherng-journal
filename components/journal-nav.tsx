'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { articles } from '@/lib/articles';
export function JournalNav() {
 const path=usePathname(); const current=articles.find(a=>path===`/articles/${a.slug}`)?.series;
 return <nav aria-label="Main navigation">{[{href:'/',title:'Home'},{href:'/property-reviews',title:'Property Reviews'},{href:'/iherng-podcast',title:'iherng Podcast'}].map(link=>{const active=path===link.href || (current && link.href===`/${current}`);return <Link key={link.href} href={link.href} aria-current={active?'page':undefined}>{link.title}</Link>;})}</nav>;
}
