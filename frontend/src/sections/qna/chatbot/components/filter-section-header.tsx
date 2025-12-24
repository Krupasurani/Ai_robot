import React from 'react';
import { cn } from '@/utils/cn';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronUp, ChevronDown, Database, Plug } from 'lucide-react';

const SECTIONS = {
  apps: {
    icon: Plug,
    label: 'Data Sources',
    type: 'SOURCE',
  },
  kb: {
    icon: Database,
    label: 'Knowledge',
    type: 'KB',
  },
} as const;

export interface FilterSectionHeaderProps {
  section: 'apps' | 'kb';
  isExpanded: boolean;
  selectedCount: number;
  onToggle: () => void;
}

/**
 * FilterSectionHeader Component
 *
 * Header for collapsible filter sections (Apps/Knowledge Bases)
 * Displays section icon, label, selected count badge, and expand/collapse chevron
 */
export const FilterSectionHeader = React.memo<FilterSectionHeaderProps>(
  ({ section, isExpanded, selectedCount, onToggle }) => {
    const config = SECTIONS[section];
    const IconComponent = config.icon;

    return (
      <CollapsibleTrigger asChild>
        <div
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
          role="button"
          tabIndex={0}
          className={cn(
            'flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-150 ease-in-out',
            'hover:bg-muted/50 rounded-md'
          )}
        >
          <div className="flex items-center gap-3">
            <IconComponent size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{config.label}</span>
            {selectedCount > 0 && (
              <div className="min-w-[20px] h-5 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground px-1.5">
                {selectedCount}
              </div>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp
              size={14}
              className="text-muted-foreground/60 transition-transform duration-150"
            />
          ) : (
            <ChevronDown
              size={14}
              className="text-muted-foreground/60 transition-transform duration-150"
            />
          )}
        </div>
      </CollapsibleTrigger>
    );
  }
);

FilterSectionHeader.displayName = 'FilterSectionHeader';
