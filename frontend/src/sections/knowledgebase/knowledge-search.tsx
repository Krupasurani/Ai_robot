import type { IconifyIcon } from '@iconify/react';

import { Icon } from '@iconify/react';
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, RefreshCw, Eye, Lightbulb, FileSearch, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/cn';

import { ORIGIN } from './constants/knowledge-search';

import type { SearchResult, KnowledgeSearchProps } from './types/search-response';
import LoadingState from '@/components/ui/loader';

const VIEWABLE_EXTENSIONS = [
  'pdf',
  'xlsx',
  'xls',
  'csv',
  'docx',
  'html',
  'txt',
  'md',
  'mdx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'svg',
];

// Helper function to get file icon color based on extension
export const getFileIconColor = (extension: string): string => {
  const ext = extension?.toLowerCase() || '';

  switch (ext) {
    case 'pdf':
      return '#f44336';
    case 'doc':
    case 'docx':
      return '#2196f3';
    case 'xls':
    case 'xlsx':
      return '#4caf50';
    case 'ppt':
    case 'pptx':
      return '#ff9800';
    case 'mail':
    case 'email':
      return '#9C27B0';
    default:
      return '#1976d2';
  }
};

// Helper function to format date strings
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return 'N/A';
  }
};

// Generate a truncated preview of the content
export const getContentPreview = (content: string, maxLength: number = 220): string => {
  if (!content) return '';
  return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
};

// Get source icon based on origin/connector - now uses dynamic connector data
export const getSourceIcon = (result: SearchResult, allConnectors: any[]): string => {
  if (!result?.metadata) {
    return '/assets/icons/connectors/default.svg';
  }

  // Find connector data dynamically
  const connector = allConnectors.find(
    (c) =>
      c.name.toUpperCase() === result.metadata.connector?.toUpperCase() ||
      c.name === result.metadata.connector
  );

  // If connector found, use its iconPath
  if (connector?.iconPath) {
    return connector.iconPath;
  }

  return '/assets/icons/connectors/default.svg';
};

// Helper for highlighting search text
export const highlightText = (text: string, query: string) => {
  if (!query || !text) return text;

  try {
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200/40 px-0.5 rounded-sm text-foreground">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch (e) {
    return text;
  }
};

function isDocViewable(extension: string): boolean {
  return VIEWABLE_EXTENSIONS.includes(extension?.toLowerCase());
}

interface ActionButtonProps {
  icon: string | IconifyIcon;
  label: string;
  onClick?: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick }) => (
  <Button variant="outline" onClick={onClick} className="rounded-md font-medium py-2 px-4 text-sm">
    <Icon icon={icon} className="mr-2 size-4" />
    {label}
  </Button>
);

// Main KnowledgeSearch component
const KnowledgeSearch = ({
  searchResults,
  loading,
  canLoadMore = true,
  onSearchQueryChange,
  onTopKChange,
  onViewCitations,
  recordsMap,
  allConnectors,
}: KnowledgeSearchProps) => {
  const [searchInputValue, setSearchInputValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<SearchResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [loadingRecordId, setLoadingRecordId] = useState<string | null>(null);
  const previousQueryRef = useRef<string>('');
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  // Synchronize searchQuery with parent component's state
  useEffect(() => {
    if (searchQuery !== searchInputValue) {
      setSearchInputValue(searchQuery);
    }
    // eslint-disable-next-line
  }, [searchQuery]);

  // Scroll to top when search results change due to query change
  useEffect(() => {
    // Only scroll if the query changed (not due to loading more results)
    if (searchQuery && searchQuery !== previousQueryRef.current && searchResults.length > 0) {
      if (resultsContainerRef.current) {
        resultsContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
      previousQueryRef.current = searchQuery;
    }
  }, [searchResults, searchQuery]);

  const handleViewCitations = (record: SearchResult, event: React.MouseEvent) => {
    event.stopPropagation();

    const recordId = record.metadata?.recordId || '';
    const extension = record.metadata?.extension || '';
    setLoadingRecordId(recordId);

    if (isDocViewable(extension)) {
      if (onViewCitations) {
        onViewCitations(recordId, extension, record).finally(() => {
          setLoadingRecordId(null);
        });
      }
    }
  };

  const lastResultElementRef = useCallback(
    (node: Element | null) => {
      // Stop if:
      // 1. Currently loading
      // 2. Can't load more (reached limit or got fewer results than requested)
      // 3. Have fewer than 10 results (likely all available results shown)
      if (loading || !canLoadMore) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && onTopKChange) {
          onTopKChange((prevTopK: number) => prevTopK + 10);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, onTopKChange, canLoadMore]
  );

  const handleSearch = () => {
    setSearchQuery(searchInputValue);
    setHasSearched(true);
    if (onSearchQueryChange) {
      onSearchQueryChange(searchInputValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchInputValue('');
    setSearchQuery('');
    setHasSearched(false);
    previousQueryRef.current = '';
    if (onSearchQueryChange) {
      onSearchQueryChange('');
    }
  };

  const handleRecordClick = (record: SearchResult): void => {
    const { recordId } = record.metadata;
    const recordMeta = recordsMap[recordId];

    if (!recordMeta?.webUrl) return;

    let { webUrl } = recordMeta;

    if (recordMeta.origin === 'UPLOAD' && !webUrl.startsWith('http')) {
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      webUrl = baseUrl + webUrl;
    }

    window.open(webUrl, '_blank', 'noopener,noreferrer');
  };

  // Deduplicate results so each document (recordId) is only shown once
  const displayedResults = useMemo(() => {
    const seenRecordIds = new Set<string>();
    return searchResults.filter((result) => {
      const recordId = result.metadata?.recordId || result.metadata?._id;
      if (!recordId) {
        return true;
      }
      if (seenRecordIds.has(recordId)) {
        return false;
      }
      seenRecordIds.add(recordId);
      return true;
    });
  }, [searchResults]);

  // Show different UI states based on search state
  const showInitialState = !hasSearched && displayedResults.length === 0;
  const showNoResultsState = hasSearched && displayedResults.length === 0 && !loading;
  const showResultsState = displayedResults.length > 0;
  const showLoadingState = loading && !showResultsState;

  return (
    <div className="h-full w-full bg-background overflow-hidden">
      <div className="px-6 py-6 h-full flex flex-col">
        {/* Header Section */}
        <div>
          <h2 className="mb-2 text-xl font-semibold">Knowledge Search</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Search across your organization&apos;s knowledge base to find documents, FAQs, and other
            resources
          </p>

          {/* Search Bar */}
          <div className="p-1 mb-4 bg-background shadow-none">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 mr-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={searchInputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Search for documents, topics, or keywords..."
                  className="px-8"
                />
                {searchInputValue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchInputValue('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-6 text-muted-foreground"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <Button onClick={handleSearch} disabled={!searchInputValue.trim() || loading}>
                <LoadingState>Search</LoadingState>
              </Button>
            </div>
          </div>
        </div>

        {/* Results Section - Flexbox to take remaining height */}
        <div className="flex-1 flex overflow-hidden">
          {/* Results Column */}
          <ScrollArea
            ref={resultsContainerRef}
            className={cn('transition-all duration-300 pr-2', detailsOpen ? 'w-[55%]' : 'w-full')}
          >
            {/* Loading State */}
            {showLoadingState && (
              <div className="mt-4">
                {[1, 2, 3].map((item) => (
                  <Card key={item} className="p-4 mb-4 rounded-lg border">
                    <div className="flex gap-4">
                      <Skeleton className="size-10 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-[60%]" />
                        <Skeleton className="h-5 w-[30%]" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[85%]" />
                        <Skeleton className="h-4 w-[70%]" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State - No Results */}
            {showNoResultsState && (
              <div className="flex flex-col items-center p-8 mt-4 border border-border rounded-lg bg-background/50">
                <FileSearch className="size-12 text-muted-foreground mb-4" />
                <h3 className="mb-2 text-lg font-medium">No results found</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-[400px]">
                  We couldn&apos;t find any matches for &quot;{searchQuery}&quot;. Try adjusting
                  your search terms or filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSearch}
                  className="rounded-md px-4"
                >
                  <RefreshCw className="mr-2 size-4" />
                  Clear search
                </Button>
              </div>
            )}

            {/* Empty State - Initial */}
            {showInitialState && (
              <div className="flex flex-col items-center p-6 mt-4 border border-border rounded-md bg-transparent max-w-[520px] mx-auto">
                <Lightbulb className="size-8 text-primary mb-4" />

                <h3 className="mb-2 text-base font-medium">Start exploring knowledge</h3>

                <p className="text-sm text-muted-foreground text-center mb-6 max-w-[400px] leading-relaxed">
                  Enter a search term above to discover documents, FAQs, and other resources from
                  your organization&apos;s knowledge base.
                </p>
              </div>
            )}

            {/* Search Results */}
            {showResultsState && (
              <div className="pt-2">
                {displayedResults.map((result, index) => {
                  if (!result?.metadata) return null;

                  const iconPath = getSourceIcon(result, allConnectors);
                  const fileType = result.metadata.extension?.toUpperCase() || 'DOC';
                  const isViewable = isDocViewable(result.metadata.extension);

                  return (
                    <Card
                      key={result.metadata._id || index}
                      ref={index === displayedResults.length - 1 ? lastResultElementRef : null}
                      className={cn(
                        'mb-4 cursor-pointer rounded-lg shadow-sm border transition-all duration-200 hover:border-primary hover:shadow-md',
                        selectedRecord?.metadata?._id === result.metadata._id && 'border-primary'
                      )}
                      onClick={() => handleRecordClick(result)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Document Icon */}
                          <div className="flex items-center justify-center size-10 rounded-md flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative">
                                  <img
                                    src={iconPath}
                                    alt={result.metadata.connector || 'Connector'}
                                    className="size-[26px] object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.setAttribute(
                                        'style',
                                        'display: block'
                                      );
                                    }}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {result.metadata.origin === ORIGIN.UPLOAD
                                  ? 'Local KB'
                                  : result.metadata.connector ||
                                    result.metadata.origin ||
                                    'Document'}
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header with Title and Meta */}
                            <div className="flex justify-between items-center w-full gap-2">
                              {/* Record name with ellipsis for overflow */}
                              <h4 className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap min-w-0 font-medium">
                                {result.metadata.recordName || 'Untitled Document'}
                              </h4>

                              {/* Meta Icons with fixed width */}
                              <div className="flex gap-2 items-center flex-shrink-0">
                                {isViewable && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => handleViewCitations(result, e)}
                                    className="text-xs h-6 whitespace-nowrap rounded px-2"
                                    disabled={loadingRecordId === result.metadata?.recordId}
                                  >
                                    {loadingRecordId === result.metadata?.recordId ? (
                                      <>
                                        <Loader2 className="mr-1 size-3.5 animate-spin" />
                                        Loading...
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="mr-1 size-3.5" />
                                        View Citations
                                      </>
                                    )}
                                  </Button>
                                )}

                                <Badge
                                  variant="secondary"
                                  className="h-5 text-[0.7rem] rounded px-1.5"
                                >
                                  {fileType}
                                </Badge>
                              </div>
                            </div>

                            {/* Metadata Line */}
                            <div className="flex gap-4 items-center mt-1 mb-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(new Date().toISOString())}
                              </span>

                              <Separator orientation="vertical" className="h-3" />

                              <span className="text-xs text-muted-foreground">
                                {result.metadata.categories || 'General'}
                              </span>

                              {result.metadata.pageNum && (
                                <>
                                  <Separator orientation="vertical" className="h-3" />
                                  <span className="text-xs text-muted-foreground">
                                    Page {result.metadata.pageNum}
                                  </span>
                                </>
                              )}
                              {['xlsx', 'csv', 'xls'].includes(result.metadata.extension) &&
                                result.metadata.blockNum && (
                                  <>
                                    <Separator orientation="vertical" className="h-3" />
                                    <span className="text-xs text-muted-foreground">
                                      Row{' '}
                                      {result.metadata?.extension === 'csv'
                                        ? result.metadata.blockNum[0] + 1
                                        : result.metadata.blockNum[0]}
                                    </span>
                                  </>
                                )}
                            </div>

                            {/* Content Preview */}
                            <p className="text-sm text-muted-foreground mb-3">
                              {highlightText(getContentPreview(result.content), searchQuery)}
                            </p>

                            {/* Tags and Departments */}
                            <div className="flex flex-wrap gap-1">
                              {result.metadata.topics &&
                                result.metadata.topics.slice(0, 3).map((topic) => (
                                  <Badge
                                    key={topic}
                                    variant="secondary"
                                    className="h-5 text-[0.7rem] rounded px-1.5"
                                  >
                                    {topic}
                                  </Badge>
                                ))}

                              {result.metadata.departments &&
                                result.metadata.departments.slice(0, 2).map((dept) => (
                                  <Badge
                                    key={dept}
                                    variant="outline"
                                    className="h-5 text-[0.7rem] rounded px-1.5"
                                  >
                                    {dept}
                                  </Badge>
                                ))}

                              {((result.metadata.topics?.length || 0) > 3 ||
                                (result.metadata.departments?.length || 0) > 2) && (
                                <Badge
                                  variant="secondary"
                                  className="h-5 text-[0.7rem] rounded px-1.5"
                                >
                                  +
                                  {(result.metadata.topics?.length || 0) -
                                    3 +
                                    ((result.metadata.departments?.length || 0) - 2)}{' '}
                                  more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Loading Indicator at Bottom */}
                {loading && displayedResults.length > 0 && canLoadMore && (
                  <div className="flex justify-center items-center p-4 gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading more results...</p>
                  </div>
                )}

                {/* End of Results Indicator */}
                {!loading && displayedResults.length >= 10 && !canLoadMore && (
                  <div className="flex justify-center items-center p-4">
                    <p className="text-sm text-muted-foreground">No more results to load</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeSearch;
