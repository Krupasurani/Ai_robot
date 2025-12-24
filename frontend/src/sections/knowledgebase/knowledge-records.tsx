import { useMemo, useState, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { paths } from 'src/routes/paths';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationContent,
  PaginationPrevious,
} from '@/components/ui/pagination';

import { KnowledgeBaseAPI } from './services/api';
import AddDataDrawer from './components/add-data-drawer';

import type { KnowledgeBase } from './types/kb';
import type { Filters } from './types/knowledge-base';

type SortField = 'updated' | 'created' | 'name';
type SortOrder = 'asc' | 'desc';

type StatusKey =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'FAILED'
  | 'COMPLETED'
  | 'FILE_TYPE_NOT_SUPPORTED'
  | 'AUTO_INDEX_OFF'
  | string;

interface KnowledgeRecord {
  id: string;
  recordName: string;
  recordType: string;
  indexingStatus: StatusKey | null;
  origin: 'UPLOAD' | 'CONNECTOR' | string;
  connectorName?: string;
  sourceCreatedAtTimestamp?: number;
  sourceLastModifiedTimestamp?: number;
  version?: number | null;
  fileRecord?: {
    sizeInBytes?: number;
    extension?: string;
    mimeType?: string;
  };
  kb?: {
    id: string;
    name: string;
  };
}

interface PaginationState {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface QueryState {
  search: string;
  sortField: SortField;
  sortOrder: SortOrder;
  page: number;
  limit: number;
  filters: Filters;
}

function parseArrayParam(params: URLSearchParams, key: keyof Filters): string[] {
  const values: string[] = [];
  const repeated = params.getAll(String(key));
  if (repeated.length > 0) {
    repeated.forEach((v) => values.push(...v.split(',').filter(Boolean)));
  } else {
    const single = params.get(String(key));
    if (single) values.push(...single.split(',').filter(Boolean));
  }
  return Array.from(new Set(values));
}

function parseQueryStateFromUrl(): QueryState {
  const params = new URLSearchParams(window.location.search);

  const search = params.get('q') || '';
  const sortField = (params.get('sortField') as SortField) || 'updated';
  const sortOrder = (params.get('sortOrder') as SortOrder) || 'desc';
  const page = Math.max(1, Number(params.get('page') || '1') || 1);
  const limit = Math.max(10, Number(params.get('limit') || '20') || 20);

  const filters: Filters = {
    indexingStatus: parseArrayParam(params, 'indexingStatus'),
    recordTypes: parseArrayParam(params, 'recordTypes'),
    origin: parseArrayParam(params, 'origin'),
    connectors: parseArrayParam(params, 'connectors'),
    permissions: parseArrayParam(params, 'permissions'),
    kb: parseArrayParam(params, 'kb'),
    freshness: parseArrayParam(params, 'freshness'),
  };

  return {
    search,
    sortField,
    sortOrder,
    page,
    limit,
    filters,
  };
}

function writeQueryStateToUrl(next: QueryState, replace: boolean = true) {
  const url = new URL(window.location.href);

  // Basic params
  if (next.search) {
    url.searchParams.set('q', next.search);
  } else {
    url.searchParams.delete('q');
  }

  url.searchParams.set('sortField', next.sortField);
  url.searchParams.set('sortOrder', next.sortOrder);
  url.searchParams.set('page', String(next.page));
  url.searchParams.set('limit', String(next.limit));

  // Filter params
  const filterKeys: (keyof Filters)[] = [
    'indexingStatus',
    'recordTypes',
    'origin',
    'connectors',
    'permissions',
    'kb',
  ];

  filterKeys.forEach((key) => {
    url.searchParams.delete(String(key));
    const values = (next.filters[key] || []) as string[];
    if (values.length > 0) {
      url.searchParams.set(String(key), values.join(','));
    }
  });

  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }

  window.dispatchEvent(new Event('popstate'));
}

function formatBytes(bytes?: number): string {
  if (!bytes || Number.isNaN(bytes) || bytes <= 0) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatStatus(status: StatusKey | null): string {
  const value = status || 'NOT_STARTED';
  switch (value) {
    case 'COMPLETED':
      return 'Available';
    case 'IN_PROGRESS':
    case 'NOT_STARTED':
      return 'Updating';
    case 'FAILED':
    case 'FILE_TYPE_NOT_SUPPORTED':
    case 'AUTO_INDEX_OFF':
      return 'Not available';
    default:
      return 'Updating';
  }
}

function formatRecordType(type: string): string {
  if (!type) return '—';
  return type
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatOrigin(origin: string): string {
  if (origin === 'UPLOAD') return 'Knowledge base';
  if (origin === 'CONNECTOR') return 'Connector';
  return origin;
}

function getStatusBadgeClasses(status: StatusKey | null): string {
  const value = status || 'NOT_STARTED';
  switch (value) {
    case 'COMPLETED':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
    case 'IN_PROGRESS':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300';
    case 'FAILED':
      return 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300';
    case 'FILE_TYPE_NOT_SUPPORTED':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'AUTO_INDEX_OFF':
      return 'border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-300';
    case 'NOT_STARTED':
    default:
      return 'border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300';
  }
}

export default function KnowledgeRecords() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<QueryState>(() => parseQueryStateFromUrl());
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [kbOptions, setKbOptions] = useState<KnowledgeBase[]>([]);
  const [addDataOpen, setAddDataOpen] = useState<boolean>(false);

  const { toggleSidebar } = useSidebar();

  // Local search input state (debounced into URL/query)
  const [searchInput, setSearchInput] = useState<string>(query.search);

  // Keep local search in sync with URL changes
  useEffect(() => {
    setSearchInput(query.search);
  }, [query.search]);

  // Listen for URL changes (filters/search/page/sort)
  useEffect(() => {
    const handlePopState = () => {
      setQuery(parseQueryStateFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const totalActiveFilters = useMemo(() => {
    const { filters, search } = query;
    const keys: (keyof Filters)[] = [
      'indexingStatus',
      'recordTypes',
      'origin',
      'connectors',
      'permissions',
      'kb',
    ];

    const countFromFilters = keys.reduce((acc, key) => {
      const arr = filters[key] || [];
      return acc + (Array.isArray(arr) ? arr.length : 0);
    }, 0);

    const searchCount = search ? 1 : 0;
    return countFromFilters + searchCount;
  }, [query]);

  const loadKnowledgeBases = useCallback(async () => {
    try {
      const data = await KnowledgeBaseAPI.getKnowledgeBases({
        page: 1,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      if (Array.isArray(data)) {
        setKbOptions(data as KnowledgeBase[]);
      } else if (data.knowledgeBases) {
        setKbOptions(data.knowledgeBases as KnowledgeBase[]);
      } else if (data.data) {
        setKbOptions(data.data as KnowledgeBase[]);
      }
    } catch (e) {
      // Non-critical, silently ignore
      // eslint-disable-next-line no-console
      console.error('Failed to load knowledge bases list', e);
    }
  }, []);

  const loadRecords = useCallback(async (currentQuery: QueryState) => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: currentQuery.page,
        limit: currentQuery.limit,
        search: currentQuery.search,
      };

      const { filters } = currentQuery;

      // Statusfilter: für Endnutzer nur „Available“ -> COMPLETED
      if (filters.indexingStatus && filters.indexingStatus.length > 0) {
        params.indexingStatus = filters.indexingStatus.join(',');
      }
      if (filters.recordTypes && filters.recordTypes.length > 0) {
        params.recordTypes = filters.recordTypes.join(',');
      }
      if (filters.origin && filters.origin.length > 0) {
        params.origins = filters.origin.join(',');
      }
      if (filters.connectors && filters.connectors.length > 0) {
        params.connectors = filters.connectors.join(',');
      }
      if (filters.permissions && filters.permissions.length > 0) {
        params.permissions = filters.permissions.join(',');
      }
      if (filters.kb && filters.kb.length > 0) {
        params.kb = filters.kb.join(',');
      }

      const data = await KnowledgeBaseAPI.getAllRecords(params);

      if (data.records && data.pagination) {
        let rows = data.records as KnowledgeRecord[];

        // Clientseitiger Aktualitätsfilter (optional)
        if (filters.freshness && filters.freshness.length > 0) {
          const now = Date.now();
          rows = rows.filter((r) => {
            const ts = r.sourceLastModifiedTimestamp || r.sourceCreatedAtTimestamp;
            if (!ts) return false;
            const diffDays = (now - ts) / (1000 * 60 * 60 * 24);
            if (filters.freshness?.includes('7d') && diffDays <= 7) return true;
            if (filters.freshness?.includes('30d') && diffDays <= 30 && diffDays > 7) return true;
            if (filters.freshness?.includes('older') && diffDays > 30) return true;
            return false;
          });
        }

        setRecords(rows);
        setPagination({
          page: data.pagination.page || currentQuery.page,
          limit: data.pagination.limit || currentQuery.limit,
          totalCount: (rows.length ?? data.pagination.totalCount) || 0,
          totalPages: data.pagination.totalPages || 1,
        });
      } else if (Array.isArray(data)) {
        setRecords(data as KnowledgeRecord[]);
        setPagination({
          page: 1,
          limit: currentQuery.limit,
          totalCount: (data as KnowledgeRecord[]).length,
          totalPages: 1,
        });
      } else {
        setRecords([]);
        setPagination({
          page: 1,
          limit: currentQuery.limit,
          totalCount: 0,
          totalPages: 1,
        });
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch records', e);
      setError(e?.message || 'Failed to fetch records');
      setRecords([]);
      setPagination((prev) => ({ ...prev, totalCount: 0, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadKnowledgeBases();
  }, [loadKnowledgeBases]);

  // Reload records when query changes
  useEffect(() => {
    loadRecords(query);
  }, [query, loadRecords]);

  const sortedRecords = useMemo(() => {
    const items = [...records];
    const { sortField, sortOrder } = query;

    const compare = (a: KnowledgeRecord, b: KnowledgeRecord) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      if (sortField === 'name') {
        aValue = a.recordName?.toLowerCase?.() || '';
        bValue = b.recordName?.toLowerCase?.() || '';
      } else if (sortField === 'created') {
        aValue = a.sourceCreatedAtTimestamp || 0;
        bValue = b.sourceCreatedAtTimestamp || 0;
      } else {
        aValue = a.sourceLastModifiedTimestamp || 0;
        bValue = b.sourceLastModifiedTimestamp || 0;
      }

      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      return sortOrder === 'asc' ? 1 : -1;
    };

    return items.sort(compare);
  }, [records, query]);

  const handleSearchSubmit = useCallback(() => {
    const next: QueryState = {
      ...query,
      search: searchInput.trim(),
      page: 1,
    };
    setQuery(next);
    writeQueryStateToUrl(next);
  }, [query, searchInput]);

  const handleClearSearch = useCallback(() => {
    const next: QueryState = {
      ...query,
      search: '',
      page: 1,
    };
    setQuery(next);
    setSearchInput('');
    writeQueryStateToUrl(next);
  }, [query]);

  const handleSortChange = useCallback(
    (value: string) => {
      const [field, order] = value.split(':') as [SortField, SortOrder];
      const next: QueryState = {
        ...query,
        sortField: field || 'updated',
        sortOrder: order || 'desc',
      };
      setQuery(next);
      writeQueryStateToUrl(next);
    },
    [query]
  );

  const handleKbChange = useCallback(
    (value: string) => {
      const nextFilters: Filters = {
        ...query.filters,
        kb: value === 'ALL' ? [] : [value],
      };
      const next: QueryState = {
        ...query,
        filters: nextFilters,
        page: 1,
      };
      setQuery(next);
      writeQueryStateToUrl(next);
    },
    [query]
  );

  const handlePageChange = useCallback(
    (pageNumber: number) => {
      const clamped = Math.min(Math.max(pageNumber, 1), pagination.totalPages || 1);
      const next: QueryState = {
        ...query,
        page: clamped,
      };
      setQuery(next);
      writeQueryStateToUrl(next);
    },
    [pagination.totalPages, query]
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const limit = Number(value) || 20;
      const next: QueryState = {
        ...query,
        page: 1,
        limit,
      };
      setQuery(next);
      writeQueryStateToUrl(next);
    },
    [query]
  );

  const handleResetFilters = useCallback(() => {
    const next: QueryState = {
      ...query,
      search: '',
      page: 1,
      filters: {
        indexingStatus: [],
        recordTypes: [],
        origin: [],
        connectors: [],
        permissions: [],
        kb: [],
      },
    };
    setQuery(next);
    setSearchInput('');
    writeQueryStateToUrl(next);
  }, [query]);

  const activeKbId = query.filters.kb && query.filters.kb[0];

  const kbLabel = useMemo(() => {
    if (!activeKbId) return 'All knowledge bases';
    const kb = kbOptions.find((k) => k.id === activeKbId);
    return kb?.name || 'Selected knowledge base';
  }, [activeKbId, kbOptions]);

  const filterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];

    if (query.search) {
      chips.push({ key: 'search', label: `Search: “${query.search}”` });
    }

    const statusMap: Record<string, string> = {
      NOT_STARTED: 'Not started',
      IN_PROGRESS: 'In progress',
      FAILED: 'Failed',
      COMPLETED: 'Completed',
      FILE_TYPE_NOT_SUPPORTED: 'File type not supported',
      AUTO_INDEX_OFF: 'Manual sync',
    };

    const pushFromArray = (
      values: string[] | undefined,
      prefix: string,
      formatter?: (v: string) => string
    ) => {
      (values || []).forEach((v) => {
        chips.push({
          key: `${prefix}:${v}`,
          label: `${prefix}: ${formatter ? formatter(v) : v}`,
        });
      });
    };

    pushFromArray(query.filters.indexingStatus, 'Status', (v) => statusMap[v] || formatStatus(v));
    pushFromArray(query.filters.recordTypes, 'Type', (v) => formatRecordType(v));
    pushFromArray(query.filters.origin, 'Origin', (v) => formatOrigin(v));
    pushFromArray(query.filters.connectors, 'Connector');
    pushFromArray(query.filters.permissions, 'Permissions');

    if (activeKbId) {
      chips.push({
        key: `kb:${activeKbId}`,
        label: `KB: ${kbLabel}`,
      });
    }

    return chips;
  }, [activeKbId, kbLabel, query.filters, query.search]);

  const recordCountLabel =
    pagination.totalCount === 0
      ? 'No records'
      : `${pagination.totalCount} record${pagination.totalCount === 1 ? '' : 's'}`;

  const headerSubtitle =
    totalActiveFilters > 0
      ? `${recordCountLabel} · ${totalActiveFilters} active filter${totalActiveFilters === 1 ? '' : 's'}`
      : `${recordCountLabel}`;

  const hasAnyFiltersOrSearch =
    totalActiveFilters > 0 || query.search || (query.filters.kb && query.filters.kb.length > 0);

  const isEmpty = !loading && pagination.totalCount === 0;

  const showNoResultsState = isEmpty && hasAnyFiltersOrSearch;

  const showNoDataState = isEmpty && !hasAnyFiltersOrSearch;

  const handleAddData = useCallback(() => {
    setAddDataOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-full gap-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Knowledge Records
          </h1>
          <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate(paths.dashboard.knowledgebase.root)}
          >
            Manage knowledge bases
          </Button>
          <Button
            variant="outline"
            className="sm:hidden"
            type="button"
            onClick={() => toggleSidebar()}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button type="button" onClick={handleAddData}>
            Add data
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
        {/* Search and Filters Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
              placeholder="Search records…"
              className="pl-9 h-9"
              aria-label="Search records"
            />
          </div>
          <div className="flex items-center gap-2">
            {query.search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={handleClearSearch}
              >
                Clear
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Select value={activeKbId || 'ALL'} onValueChange={handleKbChange}>
                <SelectTrigger className="h-9 w-[160px] sm:w-[200px]">
                  <SelectValue placeholder="All knowledge bases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All knowledge bases</SelectItem>
                  {kbOptions.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={`${query.sortField}:${query.sortOrder}`}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="h-9 w-[160px] sm:w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated:desc">
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Updated (newest)
                    </span>
                  </SelectItem>
                  <SelectItem value="updated:asc">Updated (oldest)</SelectItem>
                  <SelectItem value="created:desc">Created (newest)</SelectItem>
                  <SelectItem value="created:asc">Created (oldest)</SelectItem>
                  <SelectItem value="name:asc">Name (A–Z)</SelectItem>
                  <SelectItem value="name:desc">Name (Z–A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        {filterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            {filterChips.map((chip) => (
              <Badge key={chip.key} variant="outline" className="text-xs font-normal">
                {chip.label}
              </Badge>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={handleResetFilters}
            >
              Reset filters
            </Button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-border bg-background overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/30 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 w-[40px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  #
                </TableHead>
                <TableHead className="h-12 min-w-[220px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </TableHead>
                <TableHead className="h-12 w-[100px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Type
                </TableHead>
                <TableHead className="h-12 w-[120px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="h-12 w-[180px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Knowledge Base
                </TableHead>
                <TableHead className="h-12 w-[100px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Origin
                </TableHead>
                <TableHead className="h-12 w-[80px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Size
                </TableHead>
                <TableHead className="h-12 w-[120px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">
                  Created
                </TableHead>
                <TableHead className="h-12 w-[120px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`skeleton-${idx}`} className="border-b border-border/50">
                      {Array.from({ length: 9 }).map((__, cellIdx) => (
                        <TableCell key={cellIdx} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              )}

              {!loading && sortedRecords.length > 0 && (
                <>
                  {sortedRecords.map((record, index) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 h-14"
                      onClick={() => {
                        window.open(`/record/${record.id}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 max-w-[280px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {record.recordName}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {record.kb?.name || '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatRecordType(record.recordType)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-normal',
                            getStatusBadgeClasses(record.indexingStatus)
                          )}
                        >
                          {formatStatus(record.indexingStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {record.kb?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatOrigin(record.origin)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(record.fileRecord?.sizeInBytes)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(record.sourceCreatedAtTimestamp)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(record.sourceLastModifiedTimestamp)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>

          {!loading && sortedRecords.length === 0 && (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              {showNoDataState && (
                <>
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8">
                    <p className="text-base font-medium text-foreground mb-2">No records yet</p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      You don&apos;t have any knowledge records yet. Start by adding data from files
                      or connectors.
                    </p>
                    <Button type="button" size="sm" onClick={handleAddData}>
                      Add data
                    </Button>
                  </div>
                </>
              )}

              {showNoResultsState && (
                <>
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8">
                    <p className="text-base font-medium text-foreground mb-2">
                      No records match your filters
                    </p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      Try adjusting your filters or search term. You can also reset all filters to
                      see every record.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                      Clear filters
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {pagination.totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border bg-background px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-foreground">
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
              </span>{' '}
              of <span className="font-medium text-foreground">{pagination.totalCount}</span>{' '}
              results
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="rows-per-page"
                  className="text-sm text-muted-foreground whitespace-nowrap"
                >
                  Rows per page
                </label>
                <Select value={String(query.limit)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger id="rows-per-page" className="h-9 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (query.page > 1) handlePageChange(query.page - 1);
                      }}
                      className={cn(query.page <= 1 && 'pointer-events-none opacity-50')}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={pageNum === query.page}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  {pagination.totalPages > 5 && (
                    <PaginationItem>
                      <span className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground">
                        …
                      </span>
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (query.page < pagination.totalPages) handlePageChange(query.page + 1);
                      }}
                      className={cn(
                        query.page >= pagination.totalPages && 'pointer-events-none opacity-50'
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>
      <AddDataDrawer
        open={addDataOpen}
        onOpenChange={setAddDataOpen}
        kbOptions={kbOptions}
        onKbListRefresh={loadKnowledgeBases}
        onUploadSuccess={() => {
          loadKnowledgeBases();
          loadRecords(query);
        }}
      />
    </div>
  );
}
