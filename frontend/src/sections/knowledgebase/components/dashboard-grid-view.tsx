import { Icon } from '@iconify/react';
import React, { memo, useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

import { EmptyState } from './empy-state';
import { MenuButton } from './menu-button';
import { getKBIcon } from '../utils/kb-icon';

import type { KnowledgeBase } from '../types/kb';

const GridItem = memo<{
  kb: KnowledgeBase;
  navigateToKB: (kb: KnowledgeBase) => void;
  onEdit: (kb: KnowledgeBase) => void;
  onDelete: (kb: KnowledgeBase) => void;
  CompactCard: React.ComponentType<{ children: React.ReactNode }>;
}>(({ kb, navigateToKB, onEdit, onDelete, CompactCard }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    navigateToKB(kb);
  }, [navigateToKB, kb]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Simple, readable date formatting
  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '—';

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const kbIcon = getKBIcon(kb.name);

  return (
    <div className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3">
      <Card
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative h-[140px] cursor-pointer transition-all duration-200',
          'hover:border-primary hover:shadow-md hover:-translate-y-0.5',
          'border rounded-lg bg-card'
        )}
      >
        <div
          onClick={handleClick}
          className="h-full p-5 flex flex-col items-start justify-between rounded-lg"
        >
          {/* Header Section */}
          <div className="w-full mb-2">
            <div className="flex items-start gap-2">
              {/* Clean Icon */}
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  'bg-muted text-muted-foreground',
                  isHovered && 'bg-primary/10 text-primary'
                )}
              >
                {kb.icon ? (
                  <span className="text-xl">{kb.icon}</span>
                ) : (
                  <Icon icon={kbIcon} fontSize={20} />
                )}
              </div>

              <div className="flex-grow min-w-0">
                <h3 className="text-base font-semibold leading-tight text-foreground mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                  {kb.name}
                </h3>

                <p className="text-xs text-muted-foreground font-medium capitalize">
                  {kb.userRole}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="w-full flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">
              Updated {formatDate(kb.updatedAtTimestamp)}
            </p>

            <div className="w-1.5 h-1.5 rounded-full bg-green-500 opacity-80" />
          </div>
        </div>

        {/* Clean Menu Button */}
        {kb.userRole !== 'READER' && (
          <div
            className={cn(
              'absolute top-2 right-2 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-40'
            )}
          >
            <MenuButton
              kb={kb}
              onEdit={onEdit}
              onDelete={onDelete}
              className="w-7 h-7 rounded-md bg-card border border-border text-muted-foreground hover:bg-background hover:border-foreground hover:text-foreground"
            />
          </div>
        )}
      </Card>
    </div>
  );
});

GridItem.displayName = 'GridItem';

// Loading skeletons
const GridSkeleton = memo<{ count?: number }>(({ count = 20 }) => (
  <div className="grid grid-cols-12 gap-5">
    {Array.from(new Array(count)).map((_, index) => (
      <div key={index} className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3">
        <Skeleton className="h-[140px] rounded-lg border" />
      </div>
    ))}
  </div>
));

GridSkeleton.displayName = 'GridSkeleton';

// Memoized components (GridView and ListView remain the same)
const GridView = memo<{
  loading: boolean;
  knowledgeBases: KnowledgeBase[];
  filteredKnowledgeBases: KnowledgeBase[];
  debouncedSearchQuery: string;
  hasMore: boolean;
  navigateToKB: (kb: KnowledgeBase) => void;
  onEditKB: (kb: KnowledgeBase) => void;
  onDeleteKB: (kb: KnowledgeBase) => void;
  CompactCard: React.ComponentType<{ children: React.ReactNode }>;
  handleLoadMore: () => void;
  handleClearSearch: () => void;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  setCreateKBDialog: (open: boolean) => void;
  loadingMore: boolean;
}>(
  ({
    loading,
    knowledgeBases,
    filteredKnowledgeBases,
    debouncedSearchQuery,
    hasMore,
    navigateToKB,
    onEditKB,
    onDeleteKB,
    CompactCard,
    handleLoadMore,
    handleClearSearch,
    loadMoreRef,
    setCreateKBDialog,
    loadingMore,
  }) => {
    if (loading && knowledgeBases.length === 0) {
      return <GridSkeleton />;
    }

    if (filteredKnowledgeBases.length === 0 && !loading) {
      return (
        <EmptyState
          isSearchResult={!!debouncedSearchQuery}
          searchQuery={debouncedSearchQuery}
          onClearSearch={handleClearSearch}
          onCreateKB={() => setCreateKBDialog(true)}
          loading={loading}
        />
      );
    }

    return (
      <div>
        <div className="grid grid-cols-12 gap-5">
          {filteredKnowledgeBases.map((kb) => (
            <GridItem
              key={kb.id}
              kb={kb}
              navigateToKB={navigateToKB}
              onEdit={onEditKB}
              onDelete={onDeleteKB}
              CompactCard={CompactCard}
            />
          ))}
        </div>

        {/* Infinite Scroll Trigger and Loading More Indicator */}
        {hasMore && !debouncedSearchQuery && (
          <div ref={loadMoreRef} className="mt-8 mb-6 text-center border-t border-border/50 pt-6">
            {loadingMore ? (
              <div className="py-2">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-1 text-sm text-muted-foreground">
                  Loading more knowledge bases...
                </p>
              </div>
            ) : (
              <div className="py-1">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  className="h-9 px-3 rounded-md text-sm font-medium border-border text-muted-foreground bg-card hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Loading skeletons for infinite scroll */}
        {loadingMore && (
          <div className="mt-2 mb-6">
            <GridSkeleton count={8} />
          </div>
        )}
      </div>
    );
  }
);

GridView.displayName = 'GridView';

export { GridView };
