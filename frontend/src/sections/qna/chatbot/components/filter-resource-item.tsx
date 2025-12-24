import React from 'react';
import { cn } from '@/utils/cn';
import { Database, Plug } from 'lucide-react';

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

export interface Resource {
  id: string;
  name: string;
  iconPath?: string;
}

export interface FilterResourceItemProps {
  resource: Resource;
  type: 'app' | 'kb';
  isSelected: boolean;
  onToggle: () => void;
  isSearchResult?: boolean;
}

/**
 * FilterResourceItem Component
 *
 * Individual resource item (App or Knowledge Base) in the filter menu
 * Displays icon, name, selection indicator, and optional type badge for search results
 */
export const FilterResourceItem = React.memo<FilterResourceItemProps>(
  ({ resource, type, isSelected, onToggle, isSearchResult = false }) => {
    const config = SECTIONS[type === 'app' ? 'apps' : 'kb'];
    const IconComponent = config.icon;

    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full px-4 py-2 mx-2 mb-1 rounded-md min-h-[36px] transition-all duration-150 ease-in-out text-left',
          isSelected ? 'bg-muted border border-border' : 'bg-transparent border border-transparent',
          'hover:bg-muted/80'
        )}
      >
        <div className="flex items-center w-full gap-3">
          {/* Icon */}
          <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
            {type === 'app' ? (
              <img
                src={resource.iconPath || '/assets/icons/connectors/default.svg'}
                alt={resource.name}
                width={12}
                height={12}
                className="opacity-80"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    '/assets/icons/connectors/default.svg';
                }}
              />
            ) : (
              <IconComponent size={12} className="text-muted-foreground" />
            )}
          </div>

          {/* Name */}
          <span className="flex-1 text-sm font-normal text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
            {resource.name}
          </span>

          {/* Type indicator for search */}
          {isSearchResult && (
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {config.type}
            </span>
          )}

          {/* Selection indicator */}
          {isSelected && (
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/60 flex-shrink-0" />
          )}
        </div>
      </button>
    );
  }
);

FilterResourceItem.displayName = 'FilterResourceItem';
