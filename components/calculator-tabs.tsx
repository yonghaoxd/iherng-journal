import Link from 'next/link';
import { Wallet, LineChart } from 'lucide-react';

const TOOLS = [
  {
    href: '/calculator',
    title: 'Purchase costs',
    blurb: 'Cash upfront and the monthly instalment',
    icon: Wallet,
  },
  {
    href: '/rental-calculator',
    title: 'Rental cash flow',
    blurb: 'Whether the rent covers the loan',
    icon: LineChart,
  },
];

export function CalculatorTabs({ active }: { active: string }) {
  return (
    <nav className="calc-tabs" aria-label="Calculators">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = tool.href === active;
        return (
          <Link
            key={tool.href}
            href={tool.href}
            className={`calc-tab ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={15} />
            <span className="calc-tab-text">
              <strong>{tool.title}</strong>
              <span>{tool.blurb}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
