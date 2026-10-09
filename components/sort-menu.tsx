'use client';

import { Select } from '@base-ui/react/select';
import {
  ArrowDownUp,
  CalendarArrowDown,
  CalendarArrowUp,
  Check,
  ChevronDown,
  ListOrdered,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export type SortOrder =
  | 'series'
  | 'latest'
  | 'oldest'
  | 'most-viewed'
  | 'least-viewed';

interface SortOption {
  value: SortOrder;
  label: string;
  icon: LucideIcon;
}

const DATE_OPTIONS: SortOption[] = [
  { value: 'latest', label: 'Latest first', icon: CalendarArrowDown },
  { value: 'oldest', label: 'Oldest first', icon: CalendarArrowUp },
];

const VIEW_OPTIONS: SortOption[] = [
  { value: 'most-viewed', label: 'Most viewed', icon: TrendingUp },
  { value: 'least-viewed', label: 'Least viewed', icon: TrendingDown },
];

function SortItem({ option }: { option: SortOption }) {
  const Icon = option.icon;
  return (
    <Select.Item value={option.value} className="sort-menu-item">
      <Icon size={15} className="sort-menu-item-icon" aria-hidden="true" />
      <Select.ItemText className="sort-menu-item-text">
        {option.label}
      </Select.ItemText>
      <Select.ItemIndicator className="sort-menu-check">
        <Check size={14} strokeWidth={2.5} />
      </Select.ItemIndicator>
    </Select.Item>
  );
}

/**
 * The series pages' sort control. A styled listbox rather than a native
 * <select>, whose open menu the browser draws in its own light theme.
 */
export function SortMenu({
  value,
  onChange,
  seriesOrderLabel,
}: {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
  /** Adds the series' own order as a first option, e.g. "Guide order". */
  seriesOrderLabel?: string;
}) {
  const orderOptions: SortOption[] = seriesOrderLabel
    ? [{ value: 'series', label: seriesOrderLabel, icon: ListOrdered }]
    : [];
  const items = [...orderOptions, ...DATE_OPTIONS, ...VIEW_OPTIONS].map(
    ({ value: optionValue, label }) => ({ value: optionValue, label }),
  );

  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(next) => next && onChange(next as SortOrder)}
      modal={false}
    >
      <Select.Trigger className="sort-trigger" aria-label="Sort stories">
        <ArrowDownUp
          size={14}
          className="sort-trigger-icon"
          aria-hidden="true"
        />
        <span className="sort-trigger-label">Sort</span>
        <Select.Value className="sort-trigger-value" />
        <Select.Icon className="sort-trigger-chevron">
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          className="sort-menu-positioner"
          side="bottom"
          align="end"
          sideOffset={8}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="sort-menu">
            <Select.List>
              {orderOptions.length > 0 && (
                <Select.Group className="sort-menu-group">
                  <Select.GroupLabel className="sort-menu-label">
                    Series
                  </Select.GroupLabel>
                  {orderOptions.map((option) => (
                    <SortItem key={option.value} option={option} />
                  ))}
                </Select.Group>
              )}
              <Select.Group className="sort-menu-group">
                <Select.GroupLabel className="sort-menu-label">
                  Date
                </Select.GroupLabel>
                {DATE_OPTIONS.map((option) => (
                  <SortItem key={option.value} option={option} />
                ))}
              </Select.Group>
              <Select.Group className="sort-menu-group">
                <Select.GroupLabel className="sort-menu-label">
                  YouTube views
                </Select.GroupLabel>
                {VIEW_OPTIONS.map((option) => (
                  <SortItem key={option.value} option={option} />
                ))}
              </Select.Group>
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
