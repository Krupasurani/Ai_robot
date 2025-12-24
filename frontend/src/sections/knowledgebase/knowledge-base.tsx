import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Eye, Pencil, Trash2, Download, FolderOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/drop-down-menu';

import UploadManager from './upload-manager';
import { useRouter } from './hooks/use-router';
import { KnowledgeBaseAPI } from './services/api';
import DashboardComponent from './components/dashboard';
import { KBDetailView } from './components/kb-details';
import AllRecordsView from './components/all-records-view';
import { EditFolderDialog } from './components/dialogs/edit-dialogs';
import KbPermissionsDialog from './components/dialogs/kb-permissions-dialog';
import { CreateFolderDialog, DeleteConfirmDialog } from './components/dialogs';

// Import types and services
import type {
  Item,
  KnowledgeBase,
  UserPermission,
  CreatePermissionRequest,
  UpdatePermissionRequest,
} from './types/kb';

type ViewMode = 'grid' | 'list';

interface MenuItemWithAction extends KnowledgeBase {
  type: string;
  action?: 'edit' | 'delete';
}

// CompactCard component using shadcn Card with Tailwind
const CompactCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <Card
    className={`relative transition-all duration-200 border rounded-xl bg-background backdrop-blur-sm shadow-sm hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 ${className || ''}`}
  >
    {children}
  </Card>
);

// Simple icon component for menu items
const MenuIcon: React.FC<{
  icon: React.ComponentType<any>;
}> = ({ icon: Icon }) => <Icon size={18} />;

export default function KnowledgeBaseComponent() {
  const { route, navigate, isInitialized } = useRouter();
  const [shouldOpenUploadOnInit, setShouldOpenUploadOnInit] = useState(false);

  const loadingRef = useRef(false);
  const currentKBRef = useRef<KnowledgeBase | null>(null);
  const isViewInitiallyLoading = useRef(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastLoadParams = useRef<string>('');

  const [currentKB, setCurrentKB] = useState<KnowledgeBase | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [currentUserPermission, setCurrentUserPermission] = useState<UserPermission | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [permissionsDialog, setPermissionsDialog] = useState(false);

  const [editFolderDialog, setEditFolderDialog] = useState(false);

  // const [permissions, setPermissions] = useState<KBPermission[]>([]);
  // const [permissionsLoading, setPermissionsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Auto-refresh after upload to pick up late-committed files
  const [postUploadRefreshUntil, setPostUploadRefreshUntil] = useState<number | null>(null);
  const postUploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mergingRef = useRef(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextItem, setContextItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [itemToEdit, setItemToEdit] = useState<any>(null);

  const [navigationPath, setNavigationPath] = useState<
    Array<{ id: string; name: string; type: 'kb' | 'folder'; icon?: string }>
  >([]);

  const stableRoute = useMemo(() => route, [route]);

  // Merge latest folder contents into current list, replacing temp items by real ones and updating statuses
  const mergeLatestFolderContents = useCallback(async () => {
    if (!currentKB || mergingRef.current) return;
    try {
      mergingRef.current = true;
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery,
      };
      const data = await KnowledgeBaseAPI.getFolderContents(
        currentKB.id,
        stableRoute.folderId,
        params
      );

      const folders = (data.folders || []).map((folder) => ({
        ...folder,
        type: 'folder' as const,
        createdAt: folder.createdAtTimestamp || Date.now(),
        updatedAt: folder.updatedAtTimestamp || Date.now(),
      }));

      const records = (data.records || []).map((record) => ({
        ...record,
        name: record.recordName || record.name,
        type: 'file' as const,
        createdAt: record.createdAtTimestamp || Date.now(),
        updatedAt: record.updatedAtTimestamp || Date.now(),
        extension: record.fileRecord?.extension,
        sizeInBytes: record.fileRecord?.sizeInBytes,
      }));

      const fresh = [...folders, ...records];

      // Helper to normalize names for comparison (remove extension, lowercase, trim)
      const normalize = (name: string) =>
        (name || '')
          .toLowerCase()
          .trim()
          .replace(/\.[^.]+$/, '');

      // Build lookup sets for incoming real records
      const incomingRealNames = new Set(
        fresh.filter((it) => it.type === 'file').map((rec) => normalize(rec.name))
      );
      const incomingRealKeys = new Set(
        fresh
          .filter((it) => it.type === 'file')
          .map((rec) => `${normalize(rec.name)}|${rec.fileRecord?.sizeInBytes ?? ''}`)
      );

      setItems((prev) => {
        let next = [...prev];

        // Remove temp items that correspond to any incoming real record by normalized name and size
        next = next.filter((item) => {
          if (String(item.id).startsWith('temp-') && item.type === 'file') {
            const key = `${normalize(item.name)}|${item.fileRecord?.sizeInBytes ?? ''}`;
            if (incomingRealKeys.has(key) || incomingRealNames.has(normalize(item.name))) {
              return false; // drop temp duplicate
            }
          }
          return true;
        });

        // Merge/replace duplicates by normalized name
        fresh.forEach((rec) => {
          if (rec.type === 'file') {
            // Replace by ID if present
            const existingIdx = next.findIndex((it) => String(it.id) === String(rec.id));
            if (existingIdx !== -1) {
              next[existingIdx] = rec;
              return;
            }

            const recNorm = normalize(rec.name);
            const duplicateIdx = next.findIndex(
              (it) => it.type === 'file' && normalize(it.name) === recNorm
            );
            if (duplicateIdx !== -1) {
              const existing = next[duplicateIdx];
              const isExistingTemp = String(existing.id).startsWith('temp-');
              const sameSize =
                (existing.fileRecord?.sizeInBytes ?? 0) > 0 &&
                existing.fileRecord?.sizeInBytes === rec.fileRecord?.sizeInBytes;
              // Prefer replacing temp or same-name same-size entries with the real one
              if (isExistingTemp || sameSize) {
                next[duplicateIdx] = rec;
              } else {
                // If uncertain, prepend real record
                next = [rec, ...next];
              }
            } else {
              next = [rec, ...next];
            }
          } else {
            // Folders
            const existingIdx = next.findIndex((it) => String(it.id) === String(rec.id));
            if (existingIdx === -1) {
              next.push(rec);
            } else {
              next[existingIdx] = rec;
            }
          }
        });
        return next;
      });
    } finally {
      mergingRef.current = false;
    }
  }, [currentKB, page, rowsPerPage, searchQuery, stableRoute.folderId]);

  const loadKBContents = useCallback(
    async (kbId: string, folderId?: string, resetItems = true, forceReload = false) => {
      if (loadingRef.current && !forceReload) return;

      const loadId = `content-${kbId}-${folderId || 'root'}-${page}-${rowsPerPage}-${searchQuery}`;

      if (!forceReload && lastLoadParams.current === loadId) return;

      loadingRef.current = true;
      lastLoadParams.current = loadId;
      setPageLoading(true);

      try {
        const params = {
          page: page + 1,
          limit: rowsPerPage,
          search: searchQuery,
        };

        const data = await KnowledgeBaseAPI.getFolderContents(kbId, folderId, params);

        const folders = (data.folders || []).map((folder) => ({
          ...folder,
          type: 'folder' as const,
          createdAt: folder.createdAtTimestamp || Date.now(),
          updatedAt: folder.updatedAtTimestamp || Date.now(),
        }));

        const records = (data.records || []).map((record) => ({
          ...record,
          name: record.recordName || record.name,
          type: 'file' as const,
          createdAt: record.createdAtTimestamp || Date.now(),
          updatedAt: record.updatedAtTimestamp || Date.now(),
          extension: record.fileRecord?.extension,
          sizeInBytes: record.fileRecord?.sizeInBytes,
        }));

        // Fetch linked KBs only when in KB root (no folderId) and when resetting the list
        let linkedKBItems: Item[] = [];
        if (!folderId && resetItems) {
          try {
            const linkedKBs = await KnowledgeBaseAPI.getLinkedKnowledgeBases(kbId);
            linkedKBItems = (linkedKBs || []).map((linkedKB) => ({
              id: linkedKB.id,
              name: linkedKB.name,
              type: 'linked-kb' as const,
              icon: linkedKB.icon,
              documentCount: linkedKB.documentCount,
              webUrl: `/knowledge-base/${linkedKB.id}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }));
          } catch (err) {
            console.error('Failed to fetch linked KBs:', err);
          }
        }

        const newItems = [...linkedKBItems, ...folders, ...records];

        if (resetItems) {
          setItems(newItems);
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }

        setCurrentUserPermission(data.userPermission);
        setTotalCount(data.pagination.totalItems);
        setHasMore(newItems.length < data.pagination.totalItems);

        isViewInitiallyLoading.current = false;
      } catch (err: any) {
        toast.error(err.message || 'Failed to fetch contents');
        if (resetItems) {
          setItems([]);
          setTotalCount(0);
        }
      } finally {
        setPageLoading(false);
        loadingRef.current = false;
      }
    },
    [page, searchQuery, rowsPerPage]
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (currentKB && stableRoute.view !== 'dashboard') {
      searchTimeoutRef.current = setTimeout(async () => {
        if (!loadingRef.current) {
          await loadKBContents(currentKB.id, stableRoute.folderId);
        }
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [
    searchQuery,
    currentKB?.id,
    stableRoute.folderId,
    stableRoute.view,
    currentKB,
    loadKBContents,
  ]);

  const handleLoadMore = useCallback(async () => {
    if (!currentKB || loadingRef.current || loadingMore || !hasMore) return;

    loadingRef.current = true;
    setLoadingMore(true);

    try {
      const nextPage = Math.floor(items.length / rowsPerPage) + 1;
      const params = {
        page: nextPage,
        limit: rowsPerPage,
        search: searchQuery,
      };

      const data = await KnowledgeBaseAPI.getFolderContents(
        currentKB.id,
        stableRoute.folderId,
        params
      );

      const folders = (data.folders || []).map((folder) => ({
        ...folder,
        type: 'folder' as const,
        createdAt: folder.createdAtTimestamp || Date.now(),
        updatedAt: folder.updatedAtTimestamp || Date.now(),
      }));

      const records = (data.records || []).map((record) => ({
        ...record,
        name: record.recordName || record.name,
        type: 'file' as const,
        createdAt: record.createdAtTimestamp || Date.now(),
        updatedAt: record.updatedAtTimestamp || Date.now(),
        extension: record.fileRecord?.extension,
        sizeInBytes: record.fileRecord?.sizeInBytes,
      }));

      const newItems = [...folders, ...records];
      setItems((prev) => [...prev, ...newItems]);

      const totalAfterLoad = items.length + newItems.length;
      setHasMore(totalAfterLoad < data.pagination.totalItems);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load more items');
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [
    currentKB,
    items.length,
    rowsPerPage,
    searchQuery,
    loadingMore,
    hasMore,
    stableRoute.folderId,
  ]);

  useEffect(() => {
    const loadContents = async () => {
      if (isViewInitiallyLoading.current) return;

      if (currentKB && viewMode === 'list' && !searchQuery) {
        await loadKBContents(currentKB.id, stableRoute.folderId);
      }
    };

    loadContents();
  }, [page, rowsPerPage, viewMode, currentKB, loadKBContents, searchQuery, stableRoute.folderId]); // Removed dependencies that cause duplicate calls

  const loadKBPermissions = useCallback(async (_kbId: string) => {
    // Dialog now loads permissions internally
    // setPermissionsLoading(false);
  }, []);

  const navigateToKB = useCallback(
    (kb: KnowledgeBase) => {
      if (currentKBRef.current?.id === kb.id) return;

      currentKBRef.current = kb;
      setCurrentKB(kb);
      setNavigationPath([{ id: kb.id, name: kb.name, type: 'kb', icon: kb.icon }]);
      navigate({ view: 'knowledge-base', kbId: kb.id });

      // Reset state
      setItems([]);
      setPage(0);
      setSearchQuery('');
      setCurrentUserPermission(null);
      // setPermissions([]);
      isViewInitiallyLoading.current = true;

      setTimeout(async () => {
        if (!loadingRef.current) {
          await loadKBContents(kb.id);
        }
      }, 50);
    },
    [navigate, loadKBContents]
  );

  const navigateToFolder = useCallback(
    (folder: Item) => {
      if (!currentKB) return;

      const newPath = [
        ...navigationPath,
        { id: folder.id, name: folder.name, type: 'folder' as const },
      ];
      setNavigationPath(newPath);
      navigate({ view: 'folder', kbId: currentKB.id, folderId: folder.id });

      // Reset state
      setItems([]);
      setPage(0);
      setSearchQuery('');
      isViewInitiallyLoading.current = true;

      setTimeout(async () => {
        if (!loadingRef.current) {
          await loadKBContents(currentKB.id, folder.id);
        }
      }, 50);
    },
    [currentKB, navigationPath, navigate, loadKBContents]
  );

  const navigateToDashboard = useCallback(() => {
    currentKBRef.current = null;
    setCurrentKB(null);
    setNavigationPath([]);
    navigate({ view: 'dashboard' });

    // Reset all state
    setItems([]);
    setSearchQuery('');
    setCurrentUserPermission(null);
    // setPermissions([]);
    isViewInitiallyLoading.current = true;
  }, [navigate]);

  const navigateBack = useCallback(() => {
    if (navigationPath.length <= 1) {
      navigateToDashboard();
    } else {
      const newPath = navigationPath.slice(0, -1);
      setNavigationPath(newPath);
      const parent = newPath[newPath.length - 1];

      // Reset state
      setItems([]);
      setPage(0);
      setSearchQuery('');
      isViewInitiallyLoading.current = true;

      if (parent.type === 'kb') {
        navigate({ view: 'knowledge-base', kbId: parent.id });
        setTimeout(async () => {
          if (!loadingRef.current) {
            await loadKBContents(parent.id);
          }
        }, 50);
      } else {
        navigate({ view: 'folder', kbId: currentKB!.id, folderId: parent.id });
        setTimeout(async () => {
          if (!loadingRef.current) {
            await loadKBContents(currentKB!.id, parent.id);
          }
        }, 50);
      }
    }
  }, [navigationPath, navigateToDashboard, currentKB, navigate, loadKBContents]);

  useEffect(() => {
    if (!isInitialized) return;

    const initializeFromRoute = async () => {
      if (loadingRef.current) return;

      const routeId = `${stableRoute.view}-${stableRoute.kbId || ''}-${stableRoute.folderId || ''}`;
      if (lastLoadParams.current === routeId) return;

      lastLoadParams.current = routeId;
      isViewInitiallyLoading.current = true;

      // Reset state for all route changes
      setItems([]);
      setSearchQuery('');
      setPage(0);

      // Detect request to auto-open upload dialog via query param
      const urlParams = new URLSearchParams(window.location.search);
      const openUpload = urlParams.get('upload') === '1';

      if (stableRoute.view === 'dashboard') {
        // Reset to dashboard state
        currentKBRef.current = null;
        setCurrentKB(null);
        setNavigationPath([]);
        setCurrentUserPermission(null);
        // setPermissions([]);
      } else if (stableRoute.view === 'all-records') {
        // Handle all-records view - no specific KB needed
        currentKBRef.current = null;
        setCurrentKB(null);
        setNavigationPath([]);
        setCurrentUserPermission(null);
        // setPermissions([]);
      } else if (stableRoute.view === 'knowledge-base' && stableRoute.kbId) {
        if (currentKBRef.current?.id !== stableRoute.kbId) {
          try {
            const kb = await KnowledgeBaseAPI.getKnowledgeBase(stableRoute.kbId);
            currentKBRef.current = kb;
            setCurrentKB(kb);
            setNavigationPath([{ id: kb.id, name: kb.name, type: 'kb', icon: kb.icon }]);
            setCurrentUserPermission(null);
            // setPermissions([]);

            setTimeout(async () => {
              await loadKBContents(stableRoute.kbId!);
            }, 50);

            if (openUpload) {
              setShouldOpenUploadOnInit(true);
            }
          } catch (err: any) {
            toast.error('Knowledge base not found');
            navigate({ view: 'dashboard' });
          }
        }
      } else if (stableRoute.view === 'folder' && stableRoute.kbId && stableRoute.folderId) {
        if (currentKBRef.current?.id !== stableRoute.kbId) {
          try {
            const kb = await KnowledgeBaseAPI.getKnowledgeBase(stableRoute.kbId);
            currentKBRef.current = kb;
            setCurrentKB(kb);
            setNavigationPath([
              { id: kb.id, name: kb.name, type: 'kb', icon: kb.icon },
              { id: stableRoute.folderId, name: 'Folder', type: 'folder' },
            ]);
            setCurrentUserPermission(null);
            // setPermissions([]);

            setTimeout(async () => {
              await loadKBContents(stableRoute.kbId!, stableRoute.folderId);
            }, 50);
          } catch (err: any) {
            toast.warning('Folder not found');
            navigate({ view: 'dashboard' });
          }
        }
      }
    };

    initializeFromRoute();
  }, [
    isInitialized,
    stableRoute.view,
    stableRoute.kbId,
    stableRoute.folderId,
    loadKBContents,
    navigate,
    stableRoute,
  ]);

  // After KB is loaded and contents fetched, open the upload dialog if requested
  useEffect(() => {
    if (shouldOpenUploadOnInit && currentKB && !pageLoading) {
      setUploadDialog(true);
      setShouldOpenUploadOnInit(false);
    }
  }, [shouldOpenUploadOnInit, currentKB, pageLoading]);

  const handleCreateFolder = async (name: string) => {
    if (!currentKB) return;

    setPageLoading(true);
    try {
      const newFolder = await KnowledgeBaseAPI.createFolder(
        currentKB.id,
        stableRoute.folderId || null,
        name
      );

      setItems((prev) => [
        {
          ...newFolder,
          type: 'folder' as const,
          createdAt: newFolder.createdAtTimestamp || Date.now(),
          updatedAt: newFolder.updatedAtTimestamp || Date.now(),
        },
        ...prev,
      ]);

      toast.success('Folder created successfully');
      setCreateFolderDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    } finally {
      setPageLoading(false);
    }
  };

  const handleEditFolder = async (name: string) => {
    if (!itemToEdit || !currentKB) return;

    setPageLoading(true);
    try {
      await KnowledgeBaseAPI.updateFolder(currentKB.id, itemToEdit.id, name);

      setItems((prev) =>
        prev.map((item) => (item.id === itemToEdit.id ? { ...item, name } : item))
      );

      setNavigationPath((prev) =>
        prev.map((item) => (item.id === itemToEdit.id ? { ...item, name } : item))
      );

      toast.success('Folder updated successfully');
      setEditFolderDialog(false);
      setItemToEdit(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update folder');
    } finally {
      setPageLoading(false);
    }
  };

  const handleUploadSuccess = useCallback(
    async (message?: string) => {
      if (!currentKB) return;
      setPageLoading(true);
      try {
        toast.success(message || 'Successfully uploaded file(s)');
        setUploadDialog(false);
        await loadKBContents(currentKB.id, stableRoute.folderId, true, true);
      } catch (err: any) {
        toast.error(err.message || 'Upload failed');
      } finally {
        setPageLoading(false);
      }
    },
    [currentKB, loadKBContents, stableRoute.folderId]
  );

  // Optimistic: show selected files immediately in list with PENDING status
  const handleUploadStarted = useCallback(
    (selectedFiles?: Array<{ name: string; size: number; lastModified: number }>) => {
      if (!currentKB) return;

      if (selectedFiles && selectedFiles.length > 0) {
        // Add optimistic temp items
        const now = Date.now();
        const tempItems = selectedFiles.map((f, idx) => {
          const extension = (f.name.split('.').pop() || '').toLowerCase();
          return {
            id: `temp-${now}-${idx}`,
            name: f.name,
            recordName: f.name,
            type: 'file' as const,
            webUrl: '',
            indexingStatus: 'PENDING' as const,
            createdAt: now,
            updatedAt: now,
            fileRecord: {
              id: '',
              name: f.name,
              extension,
              mimeType: '',
              sizeInBytes: f.size,
              webUrl: '',
              path: '',
              isFile: true,
            },
          };
        });
        setItems((prev) => [...tempItems, ...prev]);

        // Keep refreshing for up to 60s to replace temp with real entries
        setPostUploadRefreshUntil(Date.now() + 60_000);
      }

      // Trigger immediate merge to catch any fast-created records
      if (!loadingRef.current) {
        mergeLatestFolderContents();
      }
    },
    [currentKB, mergeLatestFolderContents]
  );

  // Short-term auto-refresh after upload using merge (no full reset/wipe)
  useEffect(() => {
    const now = Date.now();

    if (currentKB && stableRoute.view !== 'dashboard') {
      const hasActiveIndexing = items.some(
        (it: any) =>
          it.type !== 'folder' &&
          (it.indexingStatus === 'PENDING' ||
            it.indexingStatus === 'IN_PROGRESS' ||
            it.indexingStatus === 'NOT_STARTED')
      );

      if (postUploadRefreshUntil && now < postUploadRefreshUntil && !hasActiveIndexing) {
        if (!postUploadIntervalRef.current) {
          postUploadIntervalRef.current = setInterval(() => {
            if (!loadingRef.current && currentKB) {
              mergeLatestFolderContents();
            }
          }, 2000);
        }
      } else if (postUploadIntervalRef.current) {
        clearInterval(postUploadIntervalRef.current);
        postUploadIntervalRef.current = null;
        if (postUploadRefreshUntil && (now >= postUploadRefreshUntil || hasActiveIndexing)) {
          setPostUploadRefreshUntil(null);
        }
      }
    } else if (postUploadIntervalRef.current) {
      clearInterval(postUploadIntervalRef.current);
      postUploadIntervalRef.current = null;
    }

    return () => {
      if (postUploadIntervalRef.current) {
        clearInterval(postUploadIntervalRef.current);
        postUploadIntervalRef.current = null;
      }
    };
  }, [postUploadRefreshUntil, currentKB, stableRoute.view, items, mergeLatestFolderContents]);

  // Live refresh using merge while any item is NOT_STARTED/PENDING/IN_PROGRESS
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (currentKB && stableRoute.view !== 'dashboard') {
      const hasActiveIndexing = items.some(
        (it: any) =>
          it.type !== 'folder' &&
          (it.indexingStatus === 'PENDING' ||
            it.indexingStatus === 'IN_PROGRESS' ||
            it.indexingStatus === 'NOT_STARTED')
      );
      if (hasActiveIndexing) {
        interval = setInterval(() => {
          if (!loadingRef.current) {
            mergeLatestFolderContents();
          }
        }, 5000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentKB, stableRoute.view, items, mergeLatestFolderContents]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setPageLoading(true);
    try {
      if (itemToDelete.type === 'folder') {
        if (!currentKB) {
          toast.warning('No knowledge base selected');
          return;
        }
        await KnowledgeBaseAPI.deleteFolder(currentKB.id, itemToDelete.id);
        setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
        toast.success('Folder deleted successfully');
      } else if (itemToDelete.type === 'file') {
        await KnowledgeBaseAPI.deleteRecord(itemToDelete.id);
        setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
        toast.success('File deleted successfully');
      }

      setDeleteDialog(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    } finally {
      setPageLoading(false);
    }
  };

  const handleCreatePermissions = async (data: CreatePermissionRequest) => {
    if (!currentKB) return;
    await KnowledgeBaseAPI.createKBPermissions(currentKB.id, data);
  };

  const handleUpdatePermission = async (_userId: string, data: UpdatePermissionRequest) => {
    if (!currentKB) return;
    await KnowledgeBaseAPI.updateKBPermission(currentKB.id, data);
  };

  const handleRemovePermission = async (userId: string) => {
    if (!currentKB) return;
    await KnowledgeBaseAPI.removeKBPermission(currentKB.id, { userIds: [userId], teamIds: [] });
  };

  const handleRefreshPermissions = async () => {
    if (!currentKB) return;
    await loadKBPermissions(currentKB.id);
  };

  const openPermissionsDialog = () => {
    if (currentKB) {
      loadKBPermissions(currentKB.id);
      setPermissionsDialog(true);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: MenuItemWithAction) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setContextItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setContextItem(null);
  };

  const handleEditMenuAction = () => {
    if (!contextItem) return;
    setItemToEdit(contextItem);
    setEditFolderDialog(true);
    handleMenuClose();
  };

  const handleDeleteMenuAction = () => {
    if (!contextItem) return;

    setItemToDelete(contextItem);
    setDeleteDialog(true);
    handleMenuClose();
  };

  const navigateToPathIndex = useCallback(
    (index: number) => {
      if (index === 0 && navigationPath[0]?.type === 'kb') {
        const kb = navigationPath[0];
        setNavigationPath([kb]);
        navigate({ view: 'knowledge-base', kbId: kb.id });

        // Reset state
        setItems([]);
        setPage(0);
        setSearchQuery('');
        setCurrentUserPermission(null);
        // setPermissions([]);
        isViewInitiallyLoading.current = true;

        setTimeout(async () => {
          if (!loadingRef.current) {
            await loadKBContents(kb.id);
          }
        }, 50);
      } else if (index > 0) {
        const newPath = navigationPath.slice(0, index + 1);
        setNavigationPath(newPath);
        const target = newPath[index];
        navigate({ view: 'folder', kbId: currentKB!.id, folderId: target.id });

        // Reset state
        setItems([]);
        setPage(0);
        setSearchQuery('');
        isViewInitiallyLoading.current = true;

        setTimeout(async () => {
          if (!loadingRef.current) {
            await loadKBContents(currentKB!.id, target.id);
          }
        }, 50);
      }
    },
    [navigationPath, currentKB, navigate, loadKBContents]
  );

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: ViewMode | null
  ): void => {
    if (newView !== null) {
      setViewMode(newView);
      if (newView === 'list' && currentKB) {
        isViewInitiallyLoading.current = true;
        setPage(0);
        setTimeout(async () => {
          if (!loadingRef.current) {
            await loadKBContents(currentKB.id, stableRoute.folderId);
          }
        }, 50);
      }
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!currentKB) return;

    // Clear the last load params to force a fresh reload
    lastLoadParams.current = '';

    // Force reload with current parameters
    await loadKBContents(currentKB.id, stableRoute.folderId, true, true);
  }, [stableRoute.folderId, loadKBContents, currentKB]);

  const handleRetryIndexing = async (recordId: string) => {
    if (!currentKB) {
      toast.warning('No KB id found, please refresh');
      return;
    }
    try {
      const response = await KnowledgeBaseAPI.reindexRecord(recordId);
      if (response.success) {
        toast.success('File indexing started successfully');
      } else {
        toast.error('Failed to start reindexing');
      }
      handleMenuClose();

      await loadKBContents(currentKB.id, stableRoute.folderId, true, true);
    } catch (err: any) {
      console.error('Failed to reindexing document', err);
    }
  };

  const renderContextMenu = () => {
    const canModify =
      currentUserPermission?.role === 'OWNER' || currentUserPermission?.role === 'WRITER';

    const folderMenuItems = [
      {
        key: 'open',
        label: 'Open',
        icon: FolderOpen,
        onClick: () => {
          navigateToFolder(contextItem);
          handleMenuClose();
        },
      },
      ...(canModify
        ? [
            {
              key: 'edit',
              label: 'Edit',
              icon: Pencil,
              onClick: handleEditMenuAction,
            },
          ]
        : []),
      ...(canModify
        ? [
            {
              key: 'delete',
              label: 'Delete',
              icon: Trash2,
              onClick: handleDeleteMenuAction,
              isDanger: true,
            },
          ]
        : []),
    ];

    const fileMenuItems = [
      {
        key: 'view-record',
        label: 'View record',
        icon: Eye,
        onClick: () => {
          window.open(`/record/${contextItem.id}`, '_blank', 'noopener,noreferrer');
          handleMenuClose();
        },
      },
      {
        key: 'download',
        label: 'Download',
        icon: Download,
        onClick: () => {
          handleMenuClose();
        },
      },
      ...(canModify
        ? [
            {
              key: 'reindex',
              label: 'Reindex',
              icon: RefreshCw,
              onClick: () => {
                handleRetryIndexing(contextItem.id);
                handleMenuClose();
              },
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: Trash2,
              onClick: handleDeleteMenuAction,
              isDanger: true,
            },
          ]
        : []),
    ];

    const menuItems = contextItem?.type === 'folder' ? folderMenuItems : fileMenuItems;

    if (!anchorEl || !contextItem) return null;

    const rect = anchorEl.getBoundingClientRect();

    return (
      <DropdownMenu open={Boolean(anchorEl)} onOpenChange={(open) => !open && handleMenuClose()}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="fixed opacity-0 pointer-events-none"
            style={{
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            }}
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[180px] rounded-lg border shadow-lg backdrop-blur-sm"
          style={{
            position: 'fixed',
            left: `${rect.right}px`,
            top: `${rect.bottom + 4}px`,
            transform: 'translateX(-100%)',
          }}
        >
          {menuItems.map((item, index) => {
            const isDangerItem = item.isDanger;
            const showDivider = isDangerItem && index > 0;
            const keyBase = String(item.key ?? index);

            return (
              <React.Fragment key={keyBase}>
                {showDivider && <DropdownMenuSeparator className="my-1 opacity-60" />}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick();
                  }}
                  className={cn(
                    'flex items-center gap-2 py-2 px-3 rounded-md transition-all',
                    isDangerItem
                      ? 'text-destructive focus:text-destructive focus:bg-destructive/10'
                      : 'focus:bg-accent'
                  )}
                >
                  <MenuIcon icon={item.icon} />
                  <span className="text-sm font-medium">{item.label}</span>
                </DropdownMenuItem>
              </React.Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const getDeleteMessage = () => {
    if (!itemToDelete) return '';

    const name = `<strong>${itemToDelete.name}</strong>`;
    if (itemToDelete.type === 'kb') {
      return `Are you sure you want to delete ${name}? This will permanently delete the knowledge base and all its contents. This action cannot be undone.`;
    }
    if (itemToDelete.type === 'folder') {
      return `Are you sure you want to delete ${name}? This will permanently delete the folder and all its contents. This action cannot be undone.`;
    }
    return `Are you sure you want to delete ${name}? This action cannot be undone.`;
  };

  if (!isInitialized) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {pageLoading && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary to-transparent z-[1400]" />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {stableRoute.view === 'all-records' ? (
          <AllRecordsView
            key="all-records"
            onNavigateBack={navigateToDashboard}
            onNavigateToRecord={(recordId) => {
              window.open(`/record/${recordId}`, '_blank', 'noopener,noreferrer');
            }}
          />
        ) : stableRoute.view === 'dashboard' ? (
          <DashboardComponent
            key="dashboard"
            navigateToKB={navigateToKB}
            CompactCard={CompactCard}
            isInitialized={isInitialized}
            navigate={navigate}
          />
        ) : (
          <KBDetailView
            key={`kb-${stableRoute.kbId}-${stableRoute.folderId || 'root'}`}
            navigationPath={navigationPath}
            navigateToDashboard={navigateToDashboard}
            navigateToPathIndex={navigateToPathIndex}
            viewMode={viewMode}
            handleViewChange={handleViewChange}
            navigateBack={navigateBack}
            CompactCard={CompactCard}
            items={items}
            pageLoading={pageLoading}
            navigateToFolder={navigateToFolder}
            handleMenuOpen={handleMenuOpen}
            totalCount={totalCount}
            hasMore={hasMore}
            loadingMore={loadingMore}
            handleLoadMore={handleLoadMore}
            currentKB={currentKB}
            loadKBContents={loadKBContents}
            stableRoute={stableRoute}
            currentUserPermission={currentUserPermission}
            setCreateFolderDialog={setCreateFolderDialog}
            setUploadDialog={setUploadDialog}
            openPermissionsDialog={openPermissionsDialog}
            handleRefresh={handleRefresh}
            setPage={setPage}
            setRowsPerPage={setRowsPerPage}
            rowsPerPage={rowsPerPage}
            page={page}
            setContextItem={setContextItem}
            setItemToDelete={setItemToDelete}
            setDeleteDialog={setDeleteDialog}
          />
        )}
      </div>

      <CreateFolderDialog
        open={createFolderDialog}
        onClose={() => setCreateFolderDialog(false)}
        onSubmit={handleCreateFolder}
        loading={pageLoading}
      />

      <EditFolderDialog
        open={editFolderDialog}
        onClose={() => {
          setEditFolderDialog(false);
          setItemToEdit(null);
        }}
        onSubmit={handleEditFolder}
        currentName={itemToEdit?.name || ''}
        loading={pageLoading}
      />

      <UploadManager
        open={uploadDialog}
        onClose={() => setUploadDialog(false)}
        knowledgeBaseId={currentKB?.id}
        folderId={stableRoute.folderId}
        onUploadSuccess={handleUploadSuccess}
      />

      <DeleteConfirmDialog
        open={deleteDialog}
        onClose={() => {
          setDeleteDialog(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message={getDeleteMessage()}
        loading={pageLoading}
      />

      <KbPermissionsDialog
        open={permissionsDialog}
        onClose={() => setPermissionsDialog(false)}
        kbId={currentKB?.id || ''}
        kbName={currentKB?.name || ''}
      />

      {/* Context Menu */}
      {renderContextMenu()}

      {/* Toast notifications handled via useEffect */}
    </div>
  );
}
