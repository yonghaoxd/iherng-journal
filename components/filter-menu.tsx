'use client';

import { Select } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/**
 * One filter as a compact dropdown, styled like the sort menu. The trigger
 * shows the filter's name until something is chosen, then the choice itself,
 * so a row of them stays quiet until it matters.
 */
export function FilterMenu({
  name,
  allValue,
  value,
  options,
  onChange,
}: {
  name: string;
  /** The option meaning "no filter"; listed first. */
  allValue: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const active = value !== allValue;
  const chosen = options.find((option) => option.value === value);

  return (
    <Select.Root
      items={options.map(({ value: v, label }) => ({ value: v, label }))}
      value={value}
      onValueChange={(next) => next && onChange(next as string)}
      modal={false}
    >
      <Select.Trigger
        className={`sort-trigger filter-trigger ${active ? 'is-active' : ''}`}
        aria-label={active ? `${name}: ${chosen?.label}` : `Filter by ${name}`}
      >
        <span className="filter-trigger-value">
          {active ? chosen?.label : name}
        </span>
        <Select.Icon className="sort-trigger-chevron">
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          className="sort-menu-positioner"
          side="bottom"
          align="start"
          sideOffset={8}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="sort-menu filter-menu">
            <Select.List>
              <Select.Group className="sort-menu-group">
                <Select.GroupLabel className="sort-menu-label">
                  {name}
                </Select.GroupLabel>
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    // Nothing to show with the other filters as they are.
                    disabled={option.count === 0 && option.value !== value}
                    className="sort-menu-item filter-menu-item"
                  >
                    <Select.ItemText className="sort-menu-item-text">
                      {option.label}
                    </Select.ItemText>
                    <span className="filter-menu-count">{option.count}</span>
                    <Select.ItemIndicator className="sort-menu-check">
                      <Check size={14} strokeWidth={2.5} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
