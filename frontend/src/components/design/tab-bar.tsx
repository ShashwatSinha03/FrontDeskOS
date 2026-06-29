'use client';

import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  value: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function TabBar({ tabs, activeTab, onTabChange, className, size = 'md' }: TabBarProps) {
  return (
    <div className={cn('flex gap-0 border-b overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'font-medium border-b-2 transition-colors whitespace-nowrap',
            size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm',
            activeTab === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
