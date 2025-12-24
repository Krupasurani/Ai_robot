import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Search, Filter, Plus } from 'lucide-react';
import { FilterSectionHeader } from './filter-section-header';
import { FilterResourceItem, type Resource } from './filter-resource-item';

// Types
export interface App extends Resource {
  iconPath?: string;
}

export interface KnowledgeBase extends Resource {}

export interface ChatBotFiltersProps {
  resourcesAnchor: HTMLElement | null;
  closeResourcesMenu: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedApps: string[];
  selectedKbIds: string[];
  expandedSections: { apps: boolean; kb: boolean };
  toggleSection: (section: 'apps' | 'kb') => void;
  toggleApp: (id: string) => void;
  toggleKb: (id: string) => void;
  filteredApps: App[];
  filteredKBs: KnowledgeBase[];
  showMoreApps: boolean;
  showMoreKBs: boolean;
  setShowMoreApps: (value: boolean) => void;
  setShowMoreKBs: (value: boolean) => void;
  setSelectedApps: (value: string[]) => void;
  setSelectedKbIds: (value: string[]) => void;
}

// Constants
const CONFIG = {
  MENU_WIDTH: 280,
  MENU_HEIGHT: { MIN: 360, MAX: 420 },
  DISPLAY_COUNT: 6,
  TRANSITION_DURATION: 150,
} as const;

// Main Component
const ChatBotFilters = ({
  resourcesAnchor,
  closeResourcesMenu,
  searchTerm,
  setSearchTerm,
  selectedApps,
  selectedKbIds,
  expandedSections,
  toggleSection,
  toggleApp,
  toggleKb,
  filteredApps,
  filteredKBs,
  showMoreApps,
  showMoreKBs,
  setShowMoreApps,
  setShowMoreKBs,
  setSelectedApps,
  setSelectedKbIds,
}: ChatBotFiltersProps) => {
  const totalSelected = selectedApps.length + selectedKbIds.length;
  const hasResults = filteredApps.length > 0 || filteredKBs.length > 0;
  const isOpen = Boolean(resourcesAnchor);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Update position when anchor changes
  useEffect(() => {
    if (resourcesAnchor && isOpen) {
      const updatePosition = () => {
        const rect = resourcesAnchor.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setPosition(null);
    }
  }, [resourcesAnchor, isOpen]);

  const renderSection = (section: 'apps' | 'kb') => {
    const isApps = section === 'apps';
    const resources = isApps ? filteredApps : filteredKBs;
    const selectedItems = isApps ? selectedApps : selectedKbIds;
    const showMore = isApps ? showMoreApps : showMoreKBs;
    const setShowMore = isApps ? setShowMoreApps : setShowMoreKBs;
    const toggleResource = isApps ? toggleApp : toggleKb;

    const displayCount = showMore ? resources.length : CONFIG.DISPLAY_COUNT;
    const hasMore = resources.length > CONFIG.DISPLAY_COUNT;

    return (
      <Collapsible
        key={section}
        open={expandedSections[section]}
        onOpenChange={() => toggleSection(section)}
      >
        <FilterSectionHeader
          section={section}
          isExpanded={expandedSections[section]}
          selectedCount={selectedItems.length}
          onToggle={() => toggleSection(section)}
        />

        <CollapsibleContent className="pb-2">
          {resources.slice(0, displayCount).map((resource) => (
            <FilterResourceItem
              key={resource.id}
              resource={resource}
              type={isApps ? 'app' : 'kb'}
              isSelected={selectedItems.includes(resource.id)}
              onToggle={() => toggleResource(resource.id)}
            />
          ))}

          {!showMore && hasMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className={cn(
                'w-full px-4 py-2 mx-2 mt-1 rounded-md justify-center min-h-[32px] text-[13px] font-normal',
                'text-muted-foreground border border-dashed border-border',
                'hover:bg-muted/50 hover:border-border/80 transition-all duration-150'
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Plus size={12} />
                <span>{resources.length - CONFIG.DISPLAY_COUNT} more</span>
              </div>
            </button>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderSearchResults = () => (
    <div className="py-2">
      {filteredApps.map((app) => (
        <FilterResourceItem
          key={`search-app-${app.id}`}
          resource={app}
          type="app"
          isSelected={selectedApps.includes(app.id)}
          onToggle={() => toggleApp(app.id)}
          isSearchResult
        />
      ))}

      {filteredKBs.map((kb) => (
        <FilterResourceItem
          key={`search-kb-${kb.id}`}
          resource={kb}
          type="kb"
          isSelected={selectedKbIds.includes(kb.id)}
          onToggle={() => toggleKb(kb.id)}
          isSearchResult
        />
      ))}
    </div>
  );

  if (!isOpen || !position) return null;

  const menuContent = (
    <div
      className={cn(
        'fixed z-50 w-[280px] p-0 rounded-lg border shadow-lg',
        'bg-background',
        'max-h-[420px] min-h-[360px] flex flex-col',
        'animate-in fade-in-0 zoom-in-95'
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filter Sources</span>
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
            />
            <Input
              placeholder="Search sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50 border-border rounded-md focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>

        <Separator className="opacity-60" />

        {/* Content */}
        <div className="flex-1 overflow-auto max-h-[250px] px-1 py-1 chat-bot-filters-scroll">
          {searchTerm ? (
            !hasResults ? (
              <div className="py-8 text-center">
                <p className="text-[13px] text-muted-foreground font-normal">
                  No results for &quot;{searchTerm}&quot;
                </p>
              </div>
            ) : (
              renderSearchResults()
            )
          ) : (
            <div className="py-1">
              {renderSection('apps')}
              {renderSection('kb')}
            </div>
          )}
        </div>

        {/* Footer */}
        {totalSelected > 0 && (
          <>
            <Separator className="opacity-60" />
            <div className="p-4 flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground font-normal">
                {totalSelected} selected
              </span>

              <Button
                onClick={() => {
                  setSelectedApps([]);
                  setSelectedKbIds([]);
                }}
                variant="ghost"
                size="sm"
                className="text-[13px] font-normal text-muted-foreground h-auto p-1.5 hover:bg-muted"
              >
                Clear
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={closeResourcesMenu} aria-hidden="true" />
      {menuContent}
    </>,
    document.body
  );
};

export default React.memo(ChatBotFilters);
