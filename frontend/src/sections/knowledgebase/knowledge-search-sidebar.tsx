import type { Icon as IconifyIcon } from '@iconify/react';

import { Icon } from '@iconify/react';
import appIcon from '@iconify-icons/mdi/apps';
import closeIcon from '@iconify-icons/mdi/close';
import gmailIcon from '@iconify-icons/mdi/gmail';
import databaseIcon from '@iconify-icons/mdi/database';
import viewModuleIcon from '@iconify-icons/mdi/view-module';
import filterMenuIcon from '@iconify-icons/mdi/filter-menu';
import googleDriveIcon from '@iconify-icons/mdi/google-drive';
import cloudUploadIcon from '@iconify-icons/mdi/cloud-upload';
import filterRemoveIcon from '@iconify-icons/mdi/filter-remove';
import bookOpenIcon from '@iconify-icons/mdi/book-open-outline';
import officeBuildingIcon from '@iconify-icons/mdi/office-building';
import formatListIcon from '@iconify-icons/mdi/format-list-bulleted';
import closeCircleIcon from '@iconify-icons/mdi/close-circle-outline';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/utils/cn';

import { useAdmin } from 'src/context/AdminContext';

import { KnowledgeBaseAPI } from './services/api';

import type { Modules } from './types/modules';
import type { KnowledgeBase } from './types/kb';
import type { Departments } from './types/departments';
import type { RecordCategories } from './types/record-categories';
import type { Filters, KnowledgeSearchSideBarProps } from './types/knowledge-base';

// Connector definitions for app sources
const apps = [
  { id: 'local', name: 'Local KB', icon: cloudUploadIcon, color: '#34A853' },
  { id: 'drive', name: 'Google Drive', icon: googleDriveIcon, color: '#4285F4' },
  { id: 'gmail', name: 'Gmail', icon: gmailIcon, color: '#EA4335' },
];

// Types for filter components
interface FilterSectionComponentProps {
  id: string;
  icon: React.ComponentProps<typeof IconifyIcon>['icon'];
  label: string;
  filterType: keyof Filters;
  items: any[];
  getItemId?: (item: any) => string;
  getItemLabel?: (item: any) => string;
  renderItemLabel?: ((item: any) => React.ReactNode) | null;
  expanded?: boolean;
  onToggle?: () => void;
  activeFilters?: string[];
  children?: React.ReactNode;
}

// Helper function to format labels
const formatLabel = (label: string): string => {
  if (!label) return '';
  return label
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
};

// Get appropriate icon for KB
const getKBIcon = (name: string) => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('engineering') || lowerName.includes('tech')) {
    return viewModuleIcon;
  }
  if (lowerName.includes('hr') || lowerName.includes('people')) {
    return officeBuildingIcon;
  }
  if (lowerName.includes('api') || lowerName.includes('code')) {
    return formatListIcon;
  }

  return bookOpenIcon;
};

// Intersection Observer Hook for Infinite Scroll
const useIntersectionObserver = (callback: () => void) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callbackRef.current();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return targetRef;
};

// Knowledge Base Filter Component
const KnowledgeBaseFilter: React.FC<{
  filters: Filters;
  onFilterChange: (filterType: keyof Filters, value: string) => void;
  expanded: boolean;
  onToggle: () => void;
  knowledgeBasesMap: Map<string, KnowledgeBase>;
  setKnowledgeBasesMap: (map: Map<string, KnowledgeBase>) => void;
}> = ({ filters, onFilterChange, expanded, onToggle, knowledgeBasesMap, setKnowledgeBasesMap }) => {
  const { isAdmin } = useAdmin();
  const [kbSearch, setKbSearch] = useState('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [paginationMode, setPaginationMode] = useState<'infinite' | 'pagination'>('infinite');

  const loadingRef = useRef(false);
  const itemsPerPage = 10;

  const loadKnowledgeBases = useCallback(
    async (searchQuery = '', pageNum = 1, isLoadMore = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        if (!isLoadMore) {
          setKnowledgeBases([]);
        }
      }

      try {
        const params = {
          page: pageNum,
          limit: itemsPerPage,
          search: searchQuery,
        };

        const data = await KnowledgeBaseAPI.getKnowledgeBases(params);

        if (data.knowledgeBases && data.pagination) {
          const newKBs = data.knowledgeBases;

          // Update knowledge bases map for name lookup
          const newMap = new Map(knowledgeBasesMap);
          newKBs.forEach((kb: KnowledgeBase) => {
            newMap.set(kb.id, kb);
          });
          setKnowledgeBasesMap(newMap);

          if (isLoadMore) {
            setKnowledgeBases((prev) => [...prev, ...newKBs]);
          } else {
            setKnowledgeBases(newKBs);
          }

          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
          setHasMore(pageNum < data.pagination.totalPages);
        } else if (Array.isArray(data)) {
          // Update map
          const newMap = new Map(knowledgeBasesMap);
          data.forEach((kb: KnowledgeBase) => {
            newMap.set(kb.id, kb);
          });
          setKnowledgeBasesMap(newMap);

          if (isLoadMore) {
            setKnowledgeBases((prev) => [...prev, ...data]);
          } else {
            setKnowledgeBases(data);
          }
          setTotalPages(1);
          setTotalCount(data.length);
          setHasMore(false);
        }
      } catch (error) {
        console.error('Failed to fetch knowledge bases:', error);
        if (!isLoadMore) {
          setKnowledgeBases([]);
          setTotalPages(1);
          setTotalCount(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [knowledgeBasesMap, setKnowledgeBasesMap]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      loadKnowledgeBases(kbSearch, 1, false);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [kbSearch]);

  // Load KBs on page change (pagination mode)
  useEffect(() => {
    if (paginationMode === 'pagination' && page > 1) {
      loadKnowledgeBases(kbSearch, page, false);
    }
  }, [page, kbSearch, loadKnowledgeBases, paginationMode]);

  // Initial load when expanded
  useEffect(() => {
    if (expanded && knowledgeBases.length === 0) {
      loadKnowledgeBases();
    }
  }, [expanded, knowledgeBases.length, loadKnowledgeBases]);

  // Refresh list when admin status changes so global KBs are hidden/shown immediately
  useEffect(() => {
    if (expanded) {
      setKnowledgeBases([]);
      setPage(1);
      setHasMore(true);
      loadKnowledgeBases(kbSearch, 1, false);
    }
    // eslint-disable-next-line
  }, [isAdmin, expanded]);

  // Infinite scroll handler
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading && paginationMode === 'infinite') {
      const nextPage = Math.floor(knowledgeBases.length / itemsPerPage) + 1;
      loadKnowledgeBases(kbSearch, nextPage, true);
    }
  }, [
    loadingMore,
    hasMore,
    loading,
    paginationMode,
    knowledgeBases.length,
    kbSearch,
    loadKnowledgeBases,
  ]);

  const loadMoreRef = useIntersectionObserver(handleLoadMore);

  const handleKbSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setKbSearch(event.target.value);
  };

  const handleKBToggle = (kbId: string) => {
    onFilterChange('kb', kbId);
  };

  const handleLoadMoreClick = () => {
    if (!loadingMore && hasMore) {
      handleLoadMore();
    }
  };

  const activeKBCount = (filters.kb || []).length;

  return (
    <div className="rounded-md mb-3 overflow-hidden border border-border/50 shadow-none">
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              'px-4 py-3 flex items-center justify-between cursor-pointer rounded-t-md transition-colors',
              expanded ? 'bg-primary/5 hover:bg-primary/8' : 'bg-background/50 hover:bg-primary/8'
            )}
          >
            <div className="flex items-center gap-3 text-sm font-medium text-foreground">
              <Icon
                icon={databaseIcon}
                className={cn('size-4', expanded ? 'text-primary' : 'text-muted-foreground/70')}
              />
              Knowledge Bases
              {activeKBCount > 0 && (
                <Badge variant="default" className="ml-1 h-[18px] min-w-[18px] text-[0.7rem] px-1">
                  {activeKBCount}
                </Badge>
              )}
            </div>
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground/70" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground/70" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 py-2 max-h-[400px] overflow-auto">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={kbSearch}
                onChange={handleKbSearchChange}
                placeholder="Search knowledge bases..."
                className="h-8 pl-7 pr-7 text-xs bg-background/80"
              />
              {kbSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setKbSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>

            {/* KB List */}
            <div className="min-h-[200px] max-h-[280px]">
              {loading ? (
                <div>
                  {Array.from(new Array(5)).map((_, index) => (
                    <div key={index} className="flex items-center py-2">
                      <Skeleton className="size-5 rounded-full mr-2" />
                      <Skeleton className="h-5 w-[80%]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-0">
                  {knowledgeBases.map((kb) => {
                    const isChecked = (filters.kb || []).includes(kb.id);
                    const kbIcon = getKBIcon(kb.name);

                    return (
                      <div
                        key={kb.id}
                        onClick={() => handleKBToggle(kb.id)}
                        className="px-0 py-1 cursor-pointer rounded-md hover:bg-muted/50 transition-colors flex items-center gap-2"
                      >
                        <div className="min-w-[32px] flex items-center justify-center">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleKBToggle(kb.id)}
                            className="size-5"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{kb.name}</p>
                          {kb.userRole && (
                            <p className="text-[0.7rem] text-muted-foreground truncate">
                              {kb.userRole}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Infinite Scroll Trigger */}
                  {paginationMode === 'infinite' && hasMore && !loading && (
                    <div ref={loadMoreRef} className="h-5 flex items-center justify-center my-1">
                      {loadingMore && <Loader2 className="size-4 animate-spin text-primary" />}
                    </div>
                  )}
                </div>
              )}

              {!loading && knowledgeBases.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">
                    {kbSearch ? 'No knowledge bases found' : 'No knowledge bases available'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Load More Button (Infinite Scroll Mode) */}
      {paginationMode === 'infinite' && expanded && hasMore && knowledgeBases.length > 0 && (
        <div className="mt-2 px-4 pb-2">
          <Button
            onClick={handleLoadMoreClick}
            disabled={loadingMore}
            variant="outline"
            className="w-full h-8 text-xs font-medium rounded-md border-border/50 text-muted-foreground bg-transparent hover:bg-primary/5 hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${totalCount - knowledgeBases.length} remaining)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default function KnowledgeSearchSideBar({
  filters,
  onFilterChange,
  className,
  openSidebar,
  onToggleSidebar,
}: KnowledgeSearchSideBarProps) {
  const [open, setOpen] = useState<boolean>(true);
  const [departments, setDepartments] = useState<Departments[]>([]);
  const [recordCategories, setRecordCategories] = useState<RecordCategories[]>([]);
  const [modules, setModules] = useState<Modules[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const isFilterChanging = useRef(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    apps: true,
    kb: false,
    departments: false,
    modules: false,
    categories: false,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Knowledge base map for name lookup in chips
  const [knowledgeBasesMap, setKnowledgeBasesMap] = useState<Map<string, KnowledgeBase>>(new Map());

  useEffect(() => {
    setOpen(openSidebar ?? false);
  }, [openSidebar]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Mock data since API calls are commented out
        setDepartments([
          {
            _id: 'engineering',
            name: 'Engineering',
            tag: 'eng',
            origin: 'system',
            description: '',
            orgId: '',
            isDeleted: false,
            __v: 0,
            createdAt: '',
            updatedAt: '',
          },
          {
            _id: 'product',
            name: 'Product Management',
            tag: 'pm',
            origin: 'system',
            description: '',
            orgId: '',
            isDeleted: false,
            __v: 0,
            createdAt: '',
            updatedAt: '',
          },
        ]);
        setRecordCategories([
          {
            _id: 'technical',
            name: 'Technical Documentation',
            tag: 'tech',
            origin: 'system',
            description: '',
            orgId: '',
            isDeleted: false,
            __v: 0,
            createdAt: '',
            updatedAt: '',
          },
        ]);
        setModules([
          {
            _id: 'module1',
            name: 'User Management',
            description: '',
            orgId: '',
            isDeleted: false,
            createdAt: '',
            updatedAt: '',
            __v: 0,
          },
        ]);
      } catch (error) {
        console.error('Error fetching filter data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDrawerToggle = () => {
    setOpen(!open);
    onToggleSidebar?.();
  };

  const toggleSection = (section: string) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  const handleFilterChange = (filterType: keyof Filters, value: string) => {
    if (isFilterChanging.current) return;

    isFilterChanging.current = true;

    requestAnimationFrame(() => {
      const currentFilterValues = filters[filterType] || [];
      const updatedFilters = {
        ...filters,
        [filterType]: currentFilterValues.includes(value)
          ? currentFilterValues.filter((item: string) => item !== value)
          : [...currentFilterValues, value],
      };

      onFilterChange(updatedFilters);

      setTimeout(() => {
        isFilterChanging.current = false;
      }, 50);
    });
  };

  const handleCollapsedFilterClick = (sectionId: string, filterType: keyof Filters) => {
    if (!open) {
      setOpen(true);
      setExpandedSections({
        ...expandedSections,
        [sectionId]: true,
      });
    }
  };

  const getActiveFilterCount = (filterType: keyof Filters): number =>
    (filters[filterType] || []).length;

  const getTotalActiveFilterCount = (): number =>
    Object.values(filters).reduce((acc, curr) => acc + (curr || []).length, 0);

  const getFilterName = (type: keyof Filters, id: string): string => {
    switch (type) {
      case 'department':
        return departments.find((d) => d._id === id)?.name || id;
      case 'moduleId':
        return modules.find((m) => m._id === id)?.name || id;
      case 'appSpecificRecordType':
        return recordCategories.find((c) => c._id === id)?.name || id;
      case 'app':
        return apps.find((c) => c.id === id)?.name || id;
      case 'kb': {
        // Get KB name from the map, fallback to truncated ID
        const kb = knowledgeBasesMap.get(id);
        return kb ? kb.name : `KB: ${id.substring(0, 8)}...`;
      }
      default:
        return id;
    }
  };

  const clearFilter = (type: keyof Filters, value: string) => {
    if (isFilterChanging.current) return;

    isFilterChanging.current = true;

    requestAnimationFrame(() => {
      const updatedFilters = {
        ...filters,
        [type]: (filters[type] || []).filter((item) => item !== value),
      };
      onFilterChange(updatedFilters);

      setTimeout(() => {
        isFilterChanging.current = false;
      }, 50);
    });
  };

  const clearAllFilters = () => {
    if (isFilterChanging.current) return;

    isFilterChanging.current = true;

    requestAnimationFrame(() => {
      onFilterChange({
        department: [],
        moduleId: [],
        appSpecificRecordType: [],
        app: [],
        kb: [],
      });

      setTimeout(() => {
        isFilterChanging.current = false;
      }, 50);
    });
  };

  const hasActiveFilters = getTotalActiveFilterCount() > 0;

  const filterItems = <T extends { name: string; id?: string }>(items: T[]): T[] => {
    if (!searchTerm) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.id && item.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const renderActiveFilters = () => {
    if (!hasActiveFilters) return null;

    return (
      <div className="p-3 mb-6 flex flex-wrap gap-2 bg-background/50 rounded-md border border-border/50">
        <div className="w-full flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-primary">
            Active Filters ({getTotalActiveFilterCount()})
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-auto px-2 py-1 text-xs font-medium text-primary hover:text-primary"
          >
            <Icon icon={closeCircleIcon} className="mr-1 size-3" />
            Clear All
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(filters).map(([type, values]) =>
            (values || []).map((value: any) => (
              <Badge
                key={`${type}-${value}`}
                variant="outline"
                className="h-6 text-xs font-medium rounded px-2 border-primary/15 text-primary hover:bg-primary/12 hover:border-primary/30 transition-colors"
              >
                {getFilterName(type as keyof Filters, value)}
                <button
                  onClick={() => clearFilter(type as keyof Filters, value)}
                  className="ml-1.5 hover:text-primary"
                >
                  <Icon icon={closeIcon} className="size-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>
    );
  };

  // Collapsed sidebar content
  const renderCollapsedContent = () => (
    <div className="flex flex-col items-center pt-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCollapsedFilterClick('apps', 'app')}
            className="mb-4 hover:scale-105 active:scale-95 transition-transform"
          >
            <Badge variant="default" className={getActiveFilterCount('app') > 0 ? '' : 'hidden'}>
              {getActiveFilterCount('app')}
            </Badge>
            <Icon icon={appIcon} className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">App Sources</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCollapsedFilterClick('kb', 'kb')}
            className="mb-4 hover:scale-105 active:scale-95 transition-transform"
          >
            <Badge variant="default" className={getActiveFilterCount('kb') > 0 ? '' : 'hidden'}>
              {getActiveFilterCount('kb')}
            </Badge>
            <Icon icon={databaseIcon} className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Knowledge Bases</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCollapsedFilterClick('departments', 'department')}
            className="mb-4 hover:scale-105 active:scale-95 transition-transform"
          >
            <Badge
              variant="default"
              className={getActiveFilterCount('department') > 0 ? '' : 'hidden'}
            >
              {getActiveFilterCount('department')}
            </Badge>
            <Icon icon={officeBuildingIcon} className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Department Filters</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCollapsedFilterClick('modules', 'moduleId')}
            className="mb-4 hover:scale-105 active:scale-95 transition-transform"
          >
            <Badge
              variant="default"
              className={getActiveFilterCount('moduleId') > 0 ? '' : 'hidden'}
            >
              {getActiveFilterCount('moduleId')}
            </Badge>
            <Icon icon={viewModuleIcon} className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Module Filters</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCollapsedFilterClick('categories', 'appSpecificRecordType')}
            className="mb-4 hover:scale-105 active:scale-95 transition-transform"
          >
            <Badge
              variant="default"
              className={getActiveFilterCount('appSpecificRecordType') > 0 ? '' : 'hidden'}
            >
              {getActiveFilterCount('appSpecificRecordType')}
            </Badge>
            <Icon icon={formatListIcon} className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Category Filters</TooltipContent>
      </Tooltip>

      {hasActiveFilters && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearAllFilters}
              className="mt-4 bg-destructive/10 hover:bg-destructive/20 hover:scale-105 active:scale-95 transition-transform"
            >
              <Icon icon={filterRemoveIcon} className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear All Filters</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  // Filter section component with enhanced styling
  const FilterSectionComponent = ({
    id,
    icon,
    label,
    filterType,
    items,
    getItemId = (item: any) => item._id || item.id,
    getItemLabel = (item: any) => item.name,
    renderItemLabel = null,
    expanded,
    onToggle,
    activeFilters = [],
    children,
  }: FilterSectionComponentProps) => {
    const isExpanded = expanded !== undefined ? expanded : expandedSections[id];
    const handleToggle = onToggle || (() => toggleSection(id));

    return (
      <div className="rounded-md mb-3 overflow-hidden border border-border/50 shadow-none">
        <Collapsible open={isExpanded} onOpenChange={handleToggle}>
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                'px-4 py-3 flex items-center justify-between cursor-pointer rounded-t-md transition-colors',
                isExpanded
                  ? 'bg-primary/5 hover:bg-primary/8'
                  : 'bg-background/50 hover:bg-primary/8'
              )}
            >
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <Icon
                  icon={icon}
                  className={cn('size-4', isExpanded ? 'text-primary' : 'text-muted-foreground/70')}
                />
                {label}
                {getActiveFilterCount(filterType) > 0 && (
                  <Badge
                    variant="default"
                    className="ml-1 h-[18px] min-w-[18px] text-[0.7rem] px-1"
                  >
                    {getActiveFilterCount(filterType)}
                  </Badge>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="size-4 text-muted-foreground/70" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground/70" />
              )}
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 py-2 max-h-[400px] overflow-auto">
              {children || (
                <>
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="size-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filterItems(items).map((item) => {
                        const itemId = typeof item === 'string' ? item : getItemId(item);
                        const isChecked = filters[filterType]?.includes(itemId) || false;

                        return (
                          <div
                            key={itemId}
                            className="flex items-center gap-2 py-1.5 -ml-2 hover:opacity-90"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleFilterChange(filterType, itemId)}
                              className="size-4"
                            />
                            <Label className="text-sm font-normal cursor-pointer flex-1">
                              {renderItemLabel !== null
                                ? renderItemLabel(item)
                                : typeof item === 'string'
                                  ? formatLabel(item)
                                  : getItemLabel(item)}
                            </Label>
                          </div>
                        );
                      })}

                      {filterItems(items).length === 0 && (
                        <p className="py-2 text-center text-sm text-muted-foreground">
                          No matching items
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] flex-shrink-0 whitespace-nowrap box-border transition-all duration-300 bg-background shadow-sm z-40',
        open ? `w-[280px]` : 'w-[60px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 min-h-16">
        {open ? (
          <>
            <div className="flex items-center gap-2 text-base font-semibold text-primary">
              <Icon icon={filterMenuIcon} className="size-5" />
              Filters
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDrawerToggle}
                  className="size-8 text-muted-foreground hover:scale-105 active:scale-95 transition-transform"
                >
                  <ChevronLeft className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse sidebar</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDrawerToggle}
                className="mx-auto text-primary hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronRight className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      {!open ? (
        renderCollapsedContent()
      ) : (
        <ScrollArea className="h-[calc(100vh-130px)] px-3 py-4">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search filters..."
              className="h-9 pl-8 pr-8 text-sm bg-background/80"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>

          {renderActiveFilters()}

          <FilterSectionComponent
            id="apps"
            icon={appIcon}
            label="App Sources"
            filterType="app"
            items={apps}
            renderItemLabel={(app) => (
              <div className="flex items-center gap-2">
                <Icon icon={app.icon} style={{ color: app.color }} className="size-4" />
                <span className="text-sm">{app.name}</span>
              </div>
            )}
          />

          {/* Knowledge Base Filter */}
          <KnowledgeBaseFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            expanded={expandedSections.kb}
            onToggle={() => toggleSection('kb')}
            knowledgeBasesMap={knowledgeBasesMap}
            setKnowledgeBasesMap={setKnowledgeBasesMap}
          />

          {/* Uncomment these sections when API data is available */}
          {/*
          <FilterSectionComponent
            id="departments"
            icon={officeBuildingIcon}
            label="Departments"
            filterType="department"
            items={departments}
          />

          <FilterSectionComponent
            id="modules"
            icon={viewModuleIcon}
            label="Modules"
            filterType="moduleId"
            items={modules}
          />

          <FilterSectionComponent
            id="categories"
            icon={formatListIcon}
            label="Record Categories"
            filterType="appSpecificRecordType"
            items={recordCategories}
          />
          */}
        </ScrollArea>
      )}
    </div>
  );
}
