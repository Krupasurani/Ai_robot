import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  RefreshCw,
  Eye,
  Database,
  MoreVertical,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '../utils/format';
import { getStatusColor, getStatusLabel } from '../utils/status';
import { getFileIcon, getFileIconColor } from '../utils/file-icon';

import { KnowledgeBaseAPI } from '../services/api';
import DeleteRecordDialog from '../delete-record-dialog';
import KnowledgeBaseSideBar from '../knowledge-base-sidebar';

import type { Filters } from '../types/knowledge-base';

interface AllRecordsViewProps {
  onNavigateBack: () => void;
  onNavigateToRecord?: (recordId: string) => void;
}

interface RecordItem {
  id: string;
  recordName: string;
  recordType: string;
  indexingStatus: string;
  origin: string;
  connectorName: string;
  webUrl: string;
  externalRecordId?: string;
  fileRecord?: {
    extension?: string;
    sizeInBytes?: number;
    mimeType?: string;
  };
  sourceCreatedAtTimestamp?: number;
  sourceLastModifiedTimestamp?: number;
  version?: string;
  kb?: {
    id: string;
    name: string;
  };
  permission?: {
    role: 'OWNER' | 'WRITER' | 'READER' | 'COMMENTER' | string;
    type: string;
  };
}

interface ActionMenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  isDanger?: boolean;
}

// Helper function to create empty filters object
const createEmptyFilters = (): Filters => ({
  indexingStatus: [],
  department: [],
  moduleId: [],
  searchTags: [],
  appSpecificRecordType: [],
  recordTypes: [],
  origin: [],
  status: [],
  connectors: [],
  app: [],
  permissions: [],
});

const AllRecordsView: React.FC<AllRecordsViewProps> = ({ onNavigateBack, onNavigateToRecord }) => {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>(createEmptyFilters());

  // Delete dialog state
  const [deleteDialogData, setDeleteDialogData] = useState({
    open: false,
    recordId: '',
    recordName: '',
  });

  // Refs to prevent re-renders
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Sidebar handlers
  const handleToggleSidebar = () => {
    setSidebarOpen((prev: boolean) => !prev);
  };

  const handleFilterChange = (newFilters: Filters) => {
    // Ensure all filter properties are arrays to prevent undefined errors
    const normalizedFilters: Filters = {
      indexingStatus: newFilters.indexingStatus || [],
      department: newFilters.department || [],
      moduleId: newFilters.moduleId || [],
      searchTags: newFilters.searchTags || [],
      appSpecificRecordType: newFilters.appSpecificRecordType || [],
      recordTypes: newFilters.recordTypes || [],
      origin: newFilters.origin || [],
      status: newFilters.status || [],
      connectors: newFilters.connectors || [],
      app: newFilters.app || [],
      permissions: newFilters.permissions || [],
    };

    setFilters(normalizedFilters);
    setPage(0); // Reset to first page when filters change
  };

  // Convert filters to API params
  const buildApiParams = useCallback(() => {
    const params: any = {
      page: page + 1,
      limit,
      search: activeSearchQuery,
    };

    // Add filters to params - convert arrays to comma-separated strings for the API
    if (filters.indexingStatus && filters.indexingStatus.length > 0) {
      params.indexingStatus = filters.indexingStatus.join(',');
    }
    if (filters.recordTypes && filters.recordTypes.length > 0) {
      params.recordTypes = filters.recordTypes.join(',');
    }
    if (filters.origin && filters.origin.length > 0) {
      params.origins = filters.origin.join(','); // Note: API expects 'origins' not 'origin'
    }
    if (filters.connectors && filters.connectors.length > 0) {
      params.connectors = filters.connectors.join(',');
    }
    if (filters.permissions && filters.permissions.length > 0) {
      params.permissions = filters.permissions.join(',');
    }
    if (filters.department && filters.department.length > 0) {
      params.department = filters.department.join(',');
    }
    if (filters.moduleId && filters.moduleId.length > 0) {
      params.moduleId = filters.moduleId.join(',');
    }
    if (filters.searchTags && filters.searchTags.length > 0) {
      params.searchTags = filters.searchTags.join(',');
    }
    if (filters.appSpecificRecordType && filters.appSpecificRecordType.length > 0) {
      params.appSpecificRecordType = filters.appSpecificRecordType.join(',');
    }

    return params;
  }, [page, limit, activeSearchQuery, filters]);

  // Load all records
  const loadAllRecords = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const params = buildApiParams();
      const data = await KnowledgeBaseAPI.getAllRecords(params);

      if (data.records && data.pagination) {
        setRecords(data.records);
        setTotalCount(data.pagination.totalCount || 0);
      } else if (Array.isArray(data)) {
        setRecords(data);
        setTotalCount(data.length);
      } else {
        setRecords([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch records');
      setRecords([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [buildApiParams]);

  // Load records on page/limit change or filter change
  useEffect(() => {
    loadAllRecords();
  }, [loadAllRecords]);

  // Initial load
  useEffect(() => {
    loadAllRecords();
  }, [loadAllRecords]);

  useEffect(() => {
    setPage(0);
  }, [filters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = () => {
    // Only trigger a new search if the query has actually changed
    if (searchQuery !== activeSearchQuery) {
      setActiveSearchQuery(searchQuery);
      setPage(0); // Reset to the first page for the new search
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearchQuery(''); // Immediately clear the active search
    setPage(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage - 1);
  };

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value, 10));
    setPage(0);
  };

  const handleRowClick = (record: RecordItem, event: React.MouseEvent): void => {
    const isCheckboxClick = (event.target as HTMLElement).closest('[role="checkbox"]');
    const isButtonClick = (event.target as HTMLElement).closest('button');
    if (!isCheckboxClick && !isButtonClick && onNavigateToRecord) {
      onNavigateToRecord(record.id);
    }
  };

  const handleRefresh = () => {
    loadAllRecords();
  };

  // Handle retry indexing
  const handleRetryIndexing = async (recordId: string) => {
    try {
      const response = await KnowledgeBaseAPI.reindexRecord(recordId);
      toast.success(
        response.success ? 'File indexing started successfully' : 'Failed to start reindexing'
      );
      // Refresh the records to show updated status
      loadAllRecords();
    } catch (err: any) {
      toast.error('Failed to start reindexing');
      console.error('Failed to reindexing document', err);
    }
  };

  // Handle download document
  const handleDownload = async (externalRecordId: string, recordName: string, origin: string) => {
    try {
      await KnowledgeBaseAPI.handleDownloadDocument(externalRecordId, recordName, origin);
      toast.success('Download started successfully');
    } catch (err: any) {
      toast.error('Failed to download document');
      console.error('Failed to download document', err);
    }
  };

  // Handle delete success
  const handleDeleteSuccess = () => {
    toast.success('Record deleted successfully');
    loadAllRecords(); // Refresh the records
  };

  // Close the delete dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogData({
      open: false,
      recordId: '',
      recordName: '',
    });
  };

  // Table columns
  const columns = useMemo<ColumnDef<RecordItem>[]>(
    () => [
      {
        id: 'rowNumber',
        header: '#',
        cell: ({ row, table }) => {
          const rowIndex = table.getRowModel().rows.findIndex((r) => r.id === row.id);
          const rowNumber = page * limit + rowIndex + 1;
          return (
            <div className="text-center text-sm text-muted-foreground font-medium py-2">
              {rowNumber}
            </div>
          );
        },
        size: 60,
      },
      {
        accessorKey: 'recordName',
        header: 'Name',
        cell: ({ row }) => {
          const extension = row.original.fileRecord?.extension || '';
          const mimeType = row.original.fileRecord?.mimeType || '';
          const recordType = row.original.recordType || '';
          const IconComponent = getFileIcon(
            extension || (recordType === 'MAIL' ? 'eml' : ''),
            'file',
            mimeType
          );
          const iconColor = getFileIconColor(
            extension || (recordType === 'MAIL' ? 'eml' : ''),
            'file',
            mimeType
          );
          return (
            <div className="flex items-center h-full w-full pl-0.5">
              <IconComponent
                width={18}
                height={18}
                className="mr-2.5 flex-shrink-0 opacity-85"
                style={{ color: iconColor }}
              />
              <span className="text-sm font-medium truncate">{row.original.recordName}</span>
            </div>
          );
        },
        minSize: 200,
        size: 300,
      },
      {
        accessorKey: 'recordType',
        header: 'Type',
        cell: ({ row }) => (
          <div className="text-center text-xs font-medium">{row.original.recordType}</div>
        ),
        size: 100,
      },
      {
        accessorKey: 'indexingStatus',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.indexingStatus || 'NOT_STARTED';
          const statusColor = getStatusColor(status);
          const statusLabel = getStatusLabel(status);
          return (
            <div className="flex items-center justify-center py-2">
              <Badge variant="secondary" style={{ backgroundColor: statusColor, color: 'white' }}>{statusLabel}</Badge>
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: 'origin',
        header: 'Origin',
        cell: ({ row }) => {
          if (row.original.origin === 'CONNECTOR') {
            return (
              <div className="text-center text-xs font-medium text-primary">
                {row.original.connectorName}
              </div>
            );
          }
          return <div className="text-center text-xs font-medium">KNOWLEDGE BASE</div>;
        },
        size: 180,
      },
      {
        id: 'fileSize',
        header: 'Size',
        cell: ({ row }) => {
          const size = row.original.fileRecord?.sizeInBytes;
          const formattedSize =
            size !== undefined && !Number.isNaN(size) && size > 0 ? formatFileSize(size) : '—';
          return <div className="text-xs text-muted-foreground pr-2">{formattedSize}</div>;
        },
        size: 100,
      },
      {
        accessorKey: 'sourceCreatedAtTimestamp',
        header: 'Created',
        cell: ({ row }) => {
          const timestamp = row.original.sourceCreatedAtTimestamp;
          if (!timestamp) {
            return <div className="text-xs text-muted-foreground">—</div>;
          }
          try {
            const date = new Date(timestamp);
            if (Number.isNaN(date.getTime())) {
              return <div className="text-xs text-muted-foreground">—</div>;
            }
            return (
              <div className="pl-0.5 py-1.5">
                <div className="text-xs font-medium">
                  {date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            );
          } catch (e) {
            return <div className="text-xs text-muted-foreground">—</div>;
          }
        },
        size: 160,
      },
      {
        accessorKey: 'sourceLastModifiedTimestamp',
        header: 'Updated',
        cell: ({ row }) => {
          const timestamp = row.original.sourceLastModifiedTimestamp;
          if (!timestamp) {
            return <div className="text-xs text-muted-foreground">—</div>;
          }
          try {
            const date = new Date(timestamp);
            if (Number.isNaN(date.getTime())) {
              return <div className="text-xs text-muted-foreground">—</div>;
            }
            return (
              <div className="pl-0.5 py-1.5">
                <div className="text-xs font-medium">
                  {date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            );
          } catch (e) {
            return <div className="text-xs text-muted-foreground">—</div>;
          }
        },
        size: 160,
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => (
          <div className="text-center text-xs text-muted-foreground font-medium">
            {row.original.version || '1.0'}
          </div>
        ),
        size: 70,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const record = row.original;
          const fileExt = record.fileRecord?.extension || '';
          const recordPermission = record.permission;
          const canReindex =
            recordPermission?.role === 'OWNER' ||
            recordPermission?.role === 'WRITER' ||
            recordPermission?.role === 'READER';
          const canModify =
            recordPermission?.role === 'OWNER' || recordPermission?.role === 'WRITER';

          const getDownloadLabel = () => {
            if (fileExt.toLowerCase().includes('pdf')) return 'Download PDF';
            if (fileExt.toLowerCase().includes('doc')) return 'Download Document';
            if (fileExt.toLowerCase().includes('xls')) return 'Download Spreadsheet';
            return 'Download File';
          };

          const menuItems: ActionMenuItem[] = [
            {
              label: 'View Details',
              icon: Eye,
              onClick: () => {
                if (onNavigateToRecord) {
                  onNavigateToRecord(record.id);
                }
              },
            },
            {
              label: getDownloadLabel(),
              icon: Download,
              onClick: () =>
                handleDownload(record.externalRecordId!, record.recordName, record.origin),
            },
            ...(canReindex &&
              (record.indexingStatus === 'FAILED' || record.indexingStatus === 'NOT_STARTED')
              ? [
                {
                  label: 'Retry Indexing',
                  icon: RefreshCw,
                  onClick: () => handleRetryIndexing(record.id),
                },
              ]
              : []),
            ...(canReindex && record.indexingStatus === 'AUTO_INDEX_OFF'
              ? [
                {
                  label: 'Start Manual Indexing',
                  icon: RefreshCw,
                  onClick: () => handleRetryIndexing(record.id),
                },
              ]
              : []),
            ...(canModify
              ? [
                {
                  label: 'Delete Record',
                  icon: Trash2,
                  onClick: () =>
                    setDeleteDialogData({
                      open: true,
                      recordId: record.id,
                      recordName: record.recordName,
                    }),
                  isDanger: true,
                },
              ]
              : []),
          ];

          return (
            <div className="flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {menuItems.map((item, index) => {
                    const showSeparator = item.isDanger && index > 0;
                    const IconComponent = item.icon;
                    return (
                      <React.Fragment key={`${item.label}-${index}`}>
                        {showSeparator && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            item.onClick();
                          }}
                          className={cn(item.isDanger && 'text-destructive focus:text-destructive')}
                        >
                          <IconComponent className="mr-2 h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      </React.Fragment>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 70,
        enableSorting: false,
      },
    ],
    [page, limit, onNavigateToRecord, handleDownload, handleRetryIndexing]
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / limit) || 1,
  });

  return (
    <div className="flex max-h-[90vh] w-screen overflow-hidden">
      {/* Sidebar */}
      <KnowledgeBaseSideBar
        filters={filters}
        onFilterChange={handleFilterChange}
        openSidebar={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {loading && (
          <div className="absolute top-0 left-0 right-0 z-[1400] h-0.5">
            <Progress value={undefined} className="h-0.5" />
          </div>
        )}

        {/* Toolbar */}
        <div className="sticky top-0 z-[1100] flex items-center justify-between gap-3 border-b border-border/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigateBack}
              className="h-9 w-9 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1.5">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">All Records</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full min-w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records ..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
                className="pl-9 pr-9 rounded-lg border-border shadow-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  className="h-9 w-9 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Data</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {/* Table Container */}
        <div className="flex-1 m-4 min-h-0 flex">
          <div className="flex-1 overflow-hidden w-full flex flex-col rounded-xl border border-border shadow-sm min-h-[80vh] bg-card">
            {loading && records.length === 0 ? (
              <div className="flex justify-center items-center h-full flex-col gap-4">
                <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading all records...</p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="border-b border-border/50">
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              style={{
                                width: header.getSize() !== 150 ? header.getSize() : undefined,
                              }}
                              className="h-14 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30"
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && 'selected'}
                            className="cursor-pointer border-b border-border/30 hover:bg-muted/30 transition-colors h-14"
                            onClick={(e) => handleRowClick(row.original, e)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className="py-3">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination footer */}
                <div className="flex-shrink-0 flex justify-between items-center px-6 py-3 border-t border-border/50 bg-muted/20 h-[54px]">
                  <p className="text-sm text-muted-foreground font-medium">
                    {totalCount === 0
                      ? 'No records found'
                      : `Showing ${page * limit + 1}-${Math.min((page + 1) * limit, totalCount)} of ${totalCount} records`}
                  </p>

                  <div className="flex items-center gap-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(page)}
                            className={cn(
                              'rounded-md',
                              page === 0 && 'pointer-events-none opacity-50'
                            )}
                          />
                        </PaginationItem>
                        {Array.from(
                          { length: Math.min(5, Math.ceil(totalCount / limit)) },
                          (_, i) => {
                            const totalPages = Math.ceil(totalCount / limit);
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page < 3) {
                              pageNum = i + 1;
                            } else if (page > totalPages - 4) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = page - 1 + i;
                            }
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => handlePageChange(pageNum - 1)}
                                  isActive={page === pageNum - 1}
                                  className="rounded-md"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(page + 2)}
                            className={cn(
                              'rounded-md',
                              page >= Math.ceil(totalCount / limit) - 1 &&
                              'pointer-events-none opacity-50'
                            )}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <Select value={limit.toString()} onValueChange={handleLimitChange}>
                      <SelectTrigger className="w-[120px] rounded-md border-border shadow-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="20">20 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Delete Record Dialog */}
        <DeleteRecordDialog
          open={deleteDialogData.open}
          onClose={handleCloseDeleteDialog}
          onRecordDeleted={handleDeleteSuccess}
          recordId={deleteDialogData.recordId}
          recordName={deleteDialogData.recordName}
        />
      </div>
    </div>
  );
};

export default AllRecordsView;
