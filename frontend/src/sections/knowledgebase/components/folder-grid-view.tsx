import React, { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Loader2 } from 'lucide-react';

import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatFileSize, formatDate } from '../utils/format';
import { getStatusColor, getStatusLabel } from '../utils/status';
import { FileIconDisplay } from './file-icon-display';

interface GridViewProps {
  items: any[];
  pageLoading: boolean;
  navigateToFolder: (item: any) => void;
  handleMenuOpen: (event: React.MouseEvent<HTMLElement>, item: any) => void;
  CompactCard: any;
  CompactIconButton: any;
  totalCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

// Helper hook for infinite scroll
const useIntersectionObserver = (callback: () => void, options: IntersectionObserverInit = {}) => {
  const targetRef = useRef<HTMLDivElement>(null);

  // Use useCallback to memoize the callback and prevent unnecessary re-renders
  const memoizedCallback = useCallback(callback, [callback]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined; // Explicitly return undefined instead of implicit return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          memoizedCallback();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Load content before it's visible
        ...options,
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [memoizedCallback, options]); // Include options in dependency array

  return targetRef;
};

export const GridView: React.FC<GridViewProps> = ({
  items,
  pageLoading,
  navigateToFolder,
  handleMenuOpen,
  CompactCard,
  CompactIconButton,
  totalCount,
  hasMore,
  loadingMore,
  onLoadMore,
}) => {
  const navigate = useNavigate();
  const loadMoreRef = useIntersectionObserver(onLoadMore);

  // Get item data with proper fallbacks
  const getItemData = (item: any) => {
    const isFolder = item.type === 'folder';
    // const isRecord = item.type === 'record';

    return {
      id: item.id,
      name: item.name || item.recordName,
      type: isFolder ? 'folder' : 'file',
      extension: item.extension || item.fileRecord?.extension,
      mimeType: item.fileRecord?.mimeType,
      sizeInBytes: item.sizeInBytes || item.fileRecord?.sizeInBytes,
      updatedAt: item.updatedAtTimestamp || item.updatedAt || item.sourceLastModifiedTimestamp,
      createdAt: item.createdAtTimestamp || item.createdAt || item.sourceCreatedAtTimestamp,
      indexingStatus: item.indexingStatus,
      recordType: item.recordType,
      origin: item.origin,
      hasChildren: item.hasChildren,
      counts: item.counts,
      webUrl: item.webUrl,
      description: item.description,
    };
  };

  return (
    <div className="max-h-[75vh] overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {pageLoading
          ? Array.from(new Array(16)).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-[120px] rounded-xl" />
            </div>
          ))
          : items.map((item) => {
            const itemData = getItemData(item);
            const isFolder = itemData.type === 'folder';

            return (
              <div key={itemData.id} className="mt-2">
                <CompactCard
                  className={cn(
                    'h-[120px] relative transition-all duration-200',
                    'hover:-translate-y-0.5 hover:shadow-lg'
                  )}
                >
                  <div
                    onClick={() =>
                      isFolder
                        ? navigateToFolder(item)
                        : navigate(`/record/${item.id}`)
                    }
                    className={cn(
                      'p-4 h-full flex flex-col items-start cursor-pointer rounded-xl',
                      isFolder && 'hover:bg-primary/5'
                    )}
                  >
                    {/* Header with icon and name */}
                    <div className="flex items-center gap-3 w-full mb-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted/30">
                        <FileIconDisplay
                          extension={itemData.extension}
                          type={itemData.type}
                          mimeType={itemData.mimeType}
                          recordType={itemData.recordType}
                          origin={itemData.origin}
                          size={26}
                          className="opacity-90"
                        />
                      </div>

                      <div className="overflow-hidden flex-1 min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-semibold leading-tight text-foreground truncate">
                              {itemData.name}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{itemData.name}</p>
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-[0.7rem] uppercase tracking-wider font-medium text-muted-foreground truncate">
                          {itemData.type === 'folder'
                            ? `${itemData.counts?.totalItems || 0} items`
                            : itemData.extension?.toUpperCase() || itemData.recordType || 'FILE'}
                        </p>
                      </div>
                    </div>

                    {/* Footer with metadata */}
                    <div className="mt-auto w-full">
                      <div className="flex justify-between items-center mb-1">
                        {itemData.description ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="text-[0.7rem] font-medium text-muted-foreground truncate max-w-[60%]"
                                style={{
                                  maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                                  WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                                }}
                              >
                                {itemData.description}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">{itemData.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        <span className="text-[0.7rem] font-medium text-muted-foreground ml-auto">
                          {formatDate(itemData.updatedAt)}
                        </span>
                      </div>

                      {/* Status and origin badges */}
                      <div className="flex gap-1 items-center">
                        {itemData.indexingStatus && (
                          <Badge
                            variant="secondary"
                            className="text-[0.65rem] h-5 font-medium px-2"
                            style={{
                              backgroundColor: getStatusColor(itemData.indexingStatus),
                              color: 'white',
                            }}
                          >
                            {getStatusLabel(itemData.indexingStatus)}
                          </Badge>
                        )}
                        {itemData.origin && itemData.origin !== 'UPLOAD' && (
                          <Badge
                            variant="secondary"
                            className="text-[0.6rem] h-[18px] font-medium px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          >
                            {itemData.origin}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action menu button */}
                  <CompactIconButton
                    onClick={(e: React.MouseEvent<HTMLElement>) => {
                      e.stopPropagation();
                      handleMenuOpen(e, item);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-background/80 backdrop-blur-sm border border-border/10 opacity-70 transition-all hover:opacity-100 hover:bg-primary/10 hover:border-primary/20 hover:scale-105"
                  >
                    <MoreVertical size={14} />
                  </CompactIconButton>
                </CompactCard>
              </div>
            );
          })}
      </div>
      {/* Skeletons for "load more" action */}
      {loadingMore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
          {Array.from(new Array(6)).map((_, index) => (
            <Skeleton key={`skeleton-${index}`} className="h-[120px] rounded-xl" />
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        {/* Case 1: More items are available, and we are not currently loading */}
        {hasMore && !loadingMore && !pageLoading && (
          <div ref={loadMoreRef}>
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="rounded-lg px-6 py-2 text-sm font-medium"
            >
              Load More
            </Button>
          </div>
        )}

        {/* Case 2: We are actively loading more items */}
        {loadingMore && (
          <div className="py-4">
            <Loader2 size={24} className="animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading more items...</p>
          </div>
        )}

        {/* Case 3: Display the count after the initial load is complete */}
        {!pageLoading && items.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {items.length} of {totalCount} items
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridView;
