import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import React, { memo, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Plus, Database, User, ChevronDown, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAdmin } from 'src/context/AdminContext';
import { useTheme as useCustomTheme } from 'src/theme/theme-provider';
import { paths } from 'src/routes/paths';
import { useTranslate } from 'src/locales';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuthContext } from 'src/auth/hooks';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/drop-down-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';

import KBGrid from './kb-grid';
import { ListView } from './dasboard-list-view';
import KBDetailsDrawer from './kb-details-drawer';
import { KnowledgeBaseAPI } from '../services/api';
import { ShareKnowledgeBaseDialog } from './dialogs/share-dialog';
import { EditKnowledgeBaseDialog } from './dialogs/edit-dialogs';
import { DeleteConfirmDialog } from './dialogs/delete-confirm-dialog';
import { CreateKnowledgeBaseDialog } from './dialogs/create-kb-dialog';
import { getUserById } from '@/sections/accountdetails/utils';

import type { KnowledgeBase } from '../types/kb';
import type { RouteParams } from '../hooks/use-router';

// Helper function to get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Helper function to generate consistent color from string
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

interface DashboardProps {
  navigateToKB: (kb: KnowledgeBase) => void;
  CompactCard: React.ComponentType<{ children: React.ReactNode }>;
  isInitialized: boolean;
  navigate: (route: RouteParams) => void;
}
type ViewMode = 'grid' | 'list';

const useIntersectionObserver = (callback: () => void, options: IntersectionObserverInit = {}) => {
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
        rootMargin: '100px',
        ...options,
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [options]);

  return targetRef;
};

const DashboardComponent: React.FC<DashboardProps> = ({
  navigateToKB,
  CompactCard,
  isInitialized,
  navigate,
}) => {
  const routerNavigate = useNavigate();
  const { theme: customTheme } = useCustomTheme();
  const { isAdmin } = useAdmin();
  const { user: currentUser } = useAuthContext();
  const { t } = useTranslate('navbar');
  const [dataGridKey, setDataGridKey] = useState(0);

  // Default to list view
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Knowledge base state
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [createKBDialog, setCreateKBDialog] = useState(false);
  const [editKBDialog, setEditKBDialog] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<KnowledgeBase | null>(null);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBase | null>(null);
  const [shareDialog, setShareDialog] = useState(false);
  const [itemToShare, setItemToShare] = useState<KnowledgeBase | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  // Debounced search value
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // IA filters (UI only for now; wiring in later milestones)
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [owner, setOwner] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated');

  // Local filters for the UI
  const [nameFilter, setNameFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const recordCountCacheRef = useRef<Map<string, number>>(new Map());

  // Force DataGrid re-render when theme changes
  useEffect(() => {
    setDataGridKey((prev) => prev + 1);
  }, [customTheme]);

  // Fetch user names for all knowledge bases
  useEffect(() => {
    const fetchUserNames = async () => {
      const userIds = knowledgeBases
        .filter(kb => kb.ownerId && !kb.ownerName)
        .map(kb => kb.ownerId!);

      if (userIds.length === 0) return;

      const uniqueUserIds = Array.from(new Set(userIds));
      const newUserNames = new Map(userNames);

      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          if (newUserNames.has(userId)) return;

          try {
            const userData = await getUserById(userId);
            newUserNames.set(userId, userData.fullName || userData.firstName || 'Unknown');
          } catch (error) {
            console.error(`Failed to fetch user ${userId}:`, error);
            newUserNames.set(userId, 'Unknown');
          }
        })
      );

      setUserNames(newUserNames);
    };

    fetchUserNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgeBases]);

  // Initialize filters from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const v = params.get('view');
    const sort = params.get('sort');
    const vis = params.get('visibility');
    const st = params.get('status');
    const ow = params.get('owner');
    if (q !== null) setSearchQuery(q);
    if (v === 'grid' || v === 'list') setViewMode(v as ViewMode);
    if (sort) setSortBy(sort);
    if (vis) setVisibility(vis);
    if (st) setStatus(st);
    if (ow) setOwner(ow);
    // spaces/tags later via API
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters to URL (replaceState to avoid history spam)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setOrDelete = (key: string, val: string) => {
      if (!val || val === 'all') params.delete(key);
      else params.set(key, val);
    };
    setOrDelete('q', searchQuery.trim());
    params.set('view', viewMode);
    setOrDelete('sort', sortBy);
    setOrDelete('visibility', visibility);
    setOrDelete('status', status);
    setOrDelete('owner', owner);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', next);
  }, [searchQuery, viewMode, sortBy, visibility, status, owner]);

  // Details drawer
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsKB, setDetailsKB] = useState<KnowledgeBase | null>(null);
  const openDetails = (kb: KnowledgeBase) => {
    setDetailsKB(kb);
    setDetailsOpen(true);
  };
  const closeDetails = () => setDetailsOpen(false);

  // Refs to prevent multiple simultaneous calls
  const loadingRef = useRef(false);
  const currentSearchRef = useRef('');

  // Load knowledge bases function
  const loadKnowledgeBases = useCallback(
    async (queryString = '', isLoadMore = false, pageNum = 0, pageSize = 20) => {
      if (!isInitialized || loadingRef.current) return;

      // Prevent loading more if already loading or no more data for grid view
      if (isLoadMore && (loadingMore || !hasMore)) return;

      loadingRef.current = true;
      currentSearchRef.current = queryString;

      // Set appropriate loading states
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        if (queryString !== currentSearchRef.current) {
          setKnowledgeBases([]);
          setHasMore(true);
          setPage(0);
        }
      }

      try {
        const params = {
          page: isLoadMore ? Math.floor(knowledgeBases.length / pageSize) + 1 : pageNum + 1,
          limit: pageSize,
          search: queryString,
        };

        const data = await KnowledgeBaseAPI.getKnowledgeBases(params);

        if (data.knowledgeBases && data.pagination) {
          const newKBs = data.knowledgeBases as KnowledgeBase[];
          const totalItems = data.pagination.totalCount as number;

          const mergeUniqueById = (
            prevList: KnowledgeBase[],
            nextList: KnowledgeBase[]
          ): KnowledgeBase[] => {
            const map = new Map<string, KnowledgeBase>();
            prevList.forEach((kb) => map.set(kb.id, kb));
            nextList.forEach((kb) => map.set(kb.id, kb));
            return Array.from(map.values());
          };

          if (isLoadMore) {
            setKnowledgeBases((prev) => {
              const merged = mergeUniqueById(prev, newKBs);
              setHasMore(merged.length < totalItems);
              return merged;
            });
          } else {
            const unique = mergeUniqueById([], newKBs);
            setKnowledgeBases(unique);
            setHasMore(unique.length < totalItems);
          }

          setTotalCount(totalItems);
        } else if (Array.isArray(data)) {
          const mergeUniqueById = (
            prevList: KnowledgeBase[],
            nextList: KnowledgeBase[]
          ): KnowledgeBase[] => {
            const map = new Map<string, KnowledgeBase>();
            prevList.forEach((kb) => map.set(kb.id, kb));
            nextList.forEach((kb) => map.set(kb.id, kb));
            return Array.from(map.values());
          };

          if (isLoadMore) {
            setKnowledgeBases((prev) => mergeUniqueById(prev, data as KnowledgeBase[]));
          } else {
            setKnowledgeBases(mergeUniqueById([], data as KnowledgeBase[]));
          }
          setTotalCount((data as KnowledgeBase[]).length);
          setHasMore(false);
        }
      } catch (err: any) {
        console.error('Failed to fetch knowledge bases:', err);
        if (!isLoadMore) {
          setKnowledgeBases([]);
          setTotalCount(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [isInitialized, knowledgeBases.length, loadingMore, hasMore]
  );

  // Effect for debounced search
  useEffect(() => {
    if (isInitialized) {
      loadKnowledgeBases(debouncedSearchQuery, false, 0, rowsPerPage);
    }
    // eslint-disable-next-line
  }, [debouncedSearchQuery, isInitialized, rowsPerPage]);

  // Hydrate record counts for KBs shown in the overview (avoid "0" when metrics are missing)
  useEffect(() => {
    if (!isInitialized || knowledgeBases.length === 0) return;

    const toFetch = knowledgeBases.filter(
      (kb) => kb.metrics?.docs == null && !recordCountCacheRef.current.has(kb.id)
    );
    if (toFetch.length === 0) return;

    let cancelled = false;

    const run = async () => {
      const queue = [...toFetch];
      const updates = new Map<string, number>();
      const concurrency = 5;

      const worker = async (): Promise<void> => {
        if (cancelled) return;
        const kb = queue.shift();
        if (!kb) return;

        try {
          const count = await KnowledgeBaseAPI.getKnowledgeBaseRecordCount(kb.id);
          if (!cancelled && count != null) {
            recordCountCacheRef.current.set(kb.id, count);
            updates.set(kb.id, count);
          }
        } catch (err) {
          // ignore: record counts are best-effort and shouldn't block the dashboard
        }

        if (!cancelled && queue.length > 0) {
          await worker();
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, queue.length) },
        () => worker()
      );
      await Promise.all(workers);

      if (cancelled || updates.size === 0) return;
      setKnowledgeBases((prev) =>
        prev.map((kb) => {
          const docs = updates.get(kb.id);
          if (docs == null) return kb;
          return { ...kb, metrics: { ...kb.metrics, docs } };
        })
      );
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isInitialized, knowledgeBases]);

  // Refresh KB list when admin status changes so global KBs are hidden/shown immediately
  useEffect(() => {
    if (isInitialized) {
      setKnowledgeBases([]);
      setPage(0);
      loadKnowledgeBases(debouncedSearchQuery, false, 0, rowsPerPage);
    }
    // eslint-disable-next-line
  }, [isAdmin, isInitialized, rowsPerPage]);

  // Keyboard shortcuts: / focus search, n new KB, g l list, g g grid
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          'input[placeholder="Search knowledge bases..."]'
        );
        el?.focus();
      }
      if (e.key === 'n') {
        e.preventDefault();
        setCreateKBDialog(true);
      }
      if (e.key === 'g') {
        // lookahead second key
        let pressed = true;
        const next = (ev: KeyboardEvent) => {
          if (!pressed) return;
          pressed = false;
          window.removeEventListener('keydown', next, true);
          if (ev.key.toLowerCase() === 'l') setViewMode('list');
          if (ev.key.toLowerCase() === 'g') setViewMode('grid');
        };
        window.addEventListener('keydown', next, true);
        setTimeout(() => {
          pressed = false;
          window.removeEventListener('keydown', next, true);
        }, 500);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load more for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadKnowledgeBases(debouncedSearchQuery, true, 0, rowsPerPage);
    }
  }, [loadingMore, hasMore, loading, debouncedSearchQuery, rowsPerPage, loadKnowledgeBases]);

  // The view toggle was removed — we always render the list view.

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(event.target.value);
  }, []);

  const handleClearSearch = useCallback((): void => {
    setSearchQuery('');
    setPage(0);
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      loadKnowledgeBases(debouncedSearchQuery, false, newPage, rowsPerPage);
    },
    [debouncedSearchQuery, rowsPerPage, loadKnowledgeBases]
  );

  const handleRowsPerPageChange = useCallback(
    (newRowsPerPage: number) => {
      setRowsPerPage(newRowsPerPage);
      setPage(0);
      loadKnowledgeBases(debouncedSearchQuery, false, 0, newRowsPerPage);
    },
    [debouncedSearchQuery, loadKnowledgeBases]
  );

  const handleCreateKB = useCallback(async (name: string, icon?: string, description?: string) => {
    setLoading(true);
    try {
      const newKB = await KnowledgeBaseAPI.createKnowledgeBase(name, icon, description);
      // Add current user info to the new KB so it displays correctly without reload
      const enrichedKB: KnowledgeBase = {
        ...newKB,
        ownerId: newKB.ownerId || currentUser?.id,
        ownerName: newKB.ownerName || currentUser?.fullName || currentUser?.displayName || 'Unknown',
      };
      setKnowledgeBases((prev) => {
        const map = new Map<string, KnowledgeBase>();
        prev.forEach((kb) => map.set(kb.id, kb));
        map.set(enrichedKB.id, enrichedKB);
        return Array.from(map.values());
      });
      toast.success('Knowledge base created successfully');
      setCreateKBDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create knowledge base');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const onEditKB = useCallback(async (kb: KnowledgeBase) => {
    setItemToEdit(kb);
    setEditKBDialog(true);
  }, []);

  const onShareKB = useCallback((kb: KnowledgeBase) => {
    setItemToShare(kb);
    setShareDialog(true);
  }, []);

  const handleEditKB = useCallback(
    async (name: string, icon?: string) => {
      if (!itemToEdit) return;
      setLoading(true);
      try {
        await KnowledgeBaseAPI.updateKnowledgeBase(itemToEdit.id, name, icon);

        // Update knowledge bases list
        setKnowledgeBases((prev) =>
          prev.map((kb) => (kb.id === itemToEdit.id ? { ...kb, name, icon } : kb))
        );
        toast.success('Knowledge base updated successfully');
        setEditKBDialog(false);
        setItemToEdit(null);
      } catch (err: any) {
        toast.error(err.message || 'Failed to update knowledge base');
      } finally {
        setLoading(false);
      }
    },
    [itemToEdit]
  );

  const onDeleteKB = useCallback(async (kb: KnowledgeBase) => {
    setItemToDelete(kb);
    setDeleteDialog(true);
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setPageLoading(true);
    try {
      await KnowledgeBaseAPI.deleteKnowledgeBase(itemToDelete.id);
      setKnowledgeBases((prev) => prev.filter((kb) => kb.id !== itemToDelete.id));
      toast.success('Knowledge base deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    } finally {
      setPageLoading(false);
    }
    setDeleteDialog(false);
    setItemToDelete(null);
  };

  // Intersection observer for infinite scroll
  const loadMoreRef = useIntersectionObserver(handleLoadMore);

  // Memoized filtered knowledge bases
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const toggleFavorite = useCallback((kbId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(kbId)) next.delete(kbId);
      else next.add(kbId);
      return next;
    });
  }, []);

  // Extract unique owners from knowledge bases for the filter dropdown
  const uniqueOwners = useMemo(() => {
    const ownersMap = new Map<string, { id: string; name: string; photoBase64?: string; photoMimeType?: string }>();

    knowledgeBases.forEach(kb => {
      const ownerId = kb.ownerId || 'unknown';
      if (!ownersMap.has(ownerId)) {
        const ownerName = kb.ownerName || (kb.ownerId ? userNames.get(kb.ownerId) : null) || 'Unknown';
        ownersMap.set(ownerId, {
          id: ownerId,
          name: ownerName,
          photoBase64: kb.ownerPhotoBase64,
          photoMimeType: kb.ownerPhotoMimeType,
        });
      }
    });

    return Array.from(ownersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [knowledgeBases, userNames]);

  const filteredKnowledgeBases = useMemo(() => {
    let list = knowledgeBases;

    // Filter by favorites
    if (favoritesOnly) {
      list = list.filter((kb) => favoriteIds.has(kb.id));
    }

    // Filter by name (local filter)
    if (nameFilter.trim()) {
      const searchTerm = nameFilter.toLowerCase().trim();
      list = list.filter((kb) =>
        kb.name.toLowerCase().includes(searchTerm) ||
        (kb.description && kb.description.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by owner
    if (ownerFilter !== 'all') {
      list = list.filter((kb) => kb.ownerId === ownerFilter);
    }

    return list;
  }, [knowledgeBases, favoritesOnly, favoriteIds, nameFilter, ownerFilter]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelect = useCallback((kbId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, kbId])) : prev.filter((id) => id !== kbId)
    );
  }, []);
  const toggleSelectAll = useCallback((kbIds: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        const next = new Set(prev);
        kbIds.forEach((id) => next.add(id));
        return Array.from(next);
      }
      // remove only those on current page
      const remove = new Set(kbIds);
      return prev.filter((id) => !remove.has(id));
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);
  const onBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setPageLoading(true);
    try {
      await Promise.allSettled(selectedIds.map((id) => KnowledgeBaseAPI.deleteKnowledgeBase(id)));
      setKnowledgeBases((prev) => prev.filter((kb) => !selectedIds.includes(kb.id)));
      toast.success('Selected knowledge bases deleted');
      clearSelection();
    } finally {
      setPageLoading(false);
    }
  }, [selectedIds, clearSelection]);

  // Calculate display counts
  const { displayCount, actualTotalCount } = useMemo(
    () => ({
      displayCount: filteredKnowledgeBases.length,
      actualTotalCount: totalCount,
    }),
    [filteredKnowledgeBases.length, totalCount]
  );

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background md:p-6 p-2">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-20">
        {(loading || loadingMore) && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/20" />
        )}

        <div className="px-1 pb-6 flex flex-col gap-3">
          {/* Top Row: Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-shrink-0 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                {t('knowledgeBases.title')}{' '}
                <span className="font-inter text-lg sm:text-xl text-muted-foreground/60">({actualTotalCount})</span>
              </h1>
            </div>

            {/* Primary actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">

              {/* Mobile/Tablet records button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => routerNavigate(paths.dashboard.knowledgebase.records)}
                className="md:hidden"
                aria-label="All Records"
              >
                <Database className="w-4 h-4" />
              </Button>
              <Button onClick={() => setCreateKBDialog(true)} className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Neue Knowledge Base</span>
                <span className="sm:hidden ml-2">Neu</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full overflow-auto">
          <div className="p-4 sm:p-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              {/* Created by Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 px-3 gap-2 font-normal border-border/60 hover:border-border"
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {ownerFilter === 'all'
                        ? 'Created by'
                        : uniqueOwners.find(o => o.id === ownerFilter)?.name || 'Created by'
                      }
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setOwnerFilter('all')}
                    className={cn(
                      "cursor-pointer",
                      ownerFilter === 'all' && "bg-accent"
                    )}
                  >
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Alle Ersteller</span>
                  </DropdownMenuItem>
                  {uniqueOwners.length > 0 && <DropdownMenuSeparator />}
                  {uniqueOwners.map((owner) => (
                    <DropdownMenuItem
                      key={owner.id}
                      onClick={() => setOwnerFilter(owner.id)}
                      className={cn(
                        "cursor-pointer gap-2",
                        ownerFilter === owner.id && "bg-accent"
                      )}
                    >
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        {owner.photoBase64 && owner.photoMimeType ? (
                          <AvatarImage
                            src={`data:${owner.photoMimeType};base64,${owner.photoBase64}`}
                            alt={owner.name}
                          />
                        ) : null}
                        <AvatarFallback className={cn('text-[10px] text-white', getAvatarColor(owner.name))}>
                          {getInitials(owner.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{owner.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search/Filter Input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Filter..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="pl-9 pr-8 h-10"
                />
                {nameFilter && (
                  <button
                    type="button"
                    onClick={() => setNameFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Active filters indicator */}
              {(ownerFilter !== 'all' || nameFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOwnerFilter('all');
                    setNameFilter('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Filter zurücksetzen
                </Button>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="mb-4 rounded-lg border border-border bg-card p-3 flex items-center justify-between">
                <p className="text-sm text-foreground">{selectedIds.length} selected</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                  <Button variant="destructive" size="sm" onClick={onBulkDelete}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
            {viewMode === 'grid' ? (
              <KBGrid
                knowledgeBases={filteredKnowledgeBases}
                onOpen={navigateToKB}
                onEdit={onEditKB}
                onDelete={onDeleteKB}
                onShowDetails={openDetails}
                loading={loading}
              />
            ) : (
              <ListView
                key={dataGridKey}
                loading={loading}
                filteredKnowledgeBases={filteredKnowledgeBases}
                navigateToKB={navigateToKB}
                onEditKB={onEditKB}
                onShareKB={onShareKB}
                onDeleteKB={onDeleteKB}
                onShowDetails={openDetails}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                totalCount={totalCount}
                page={page}
                rowsPerPage={rowsPerPage}
                handlePageChange={handlePageChange}
                handleRowsPerPageChange={handleRowsPerPageChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Details Drawer */}
      <KBDetailsDrawer kb={detailsKB} open={detailsOpen} onClose={closeDetails} />

      {/* Dialogs */}
      <CreateKnowledgeBaseDialog
        open={createKBDialog}
        onClose={() => setCreateKBDialog(false)}
        onSubmit={handleCreateKB}
        loading={loading}
      />

      <EditKnowledgeBaseDialog
        open={editKBDialog}
        onClose={() => {
          setEditKBDialog(false);
          setItemToEdit(null);
        }}
        onSubmit={handleEditKB}
        currentName={itemToEdit?.name || ''}
        currentIcon={itemToEdit?.icon}
        loading={loading}
      />

      <ShareKnowledgeBaseDialog
        open={shareDialog}
        onClose={() => {
          setShareDialog(false);
          setItemToShare(null);
        }}
        kbId={itemToShare?.id || ''}
        kbName={itemToShare?.name || ''}
      />

      <DeleteConfirmDialog
        open={deleteDialog}
        onClose={() => {
          setDeleteDialog(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${itemToDelete?.name}?`}
        loading={pageLoading}
      />
    </div>
  );
};

export default memo(DashboardComponent);
