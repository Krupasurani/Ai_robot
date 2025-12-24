// ListView.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MoreVertical } from 'lucide-react';
import { formatFileSize } from '../utils/format';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
} from '@tanstack/react-table';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { getRecordIcon } from './file-type-icons';

const getStatusDisplay = (status: string) => {
  if (!status) return { label: '', variant: 'outline' as const };

  let displayLabel = '';
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';

  switch (status) {
    case 'COMPLETED':
      displayLabel = 'COMPLETED';
      variant = 'default';
      break;
    case 'IN_PROGRESS':
      displayLabel = 'IN PROGRESS';
      variant = 'secondary';
      break;
    case 'FAILED':
      displayLabel = 'FAILED';
      variant = 'destructive';
      break;
    case 'NOT_STARTED':
      displayLabel = 'NOT STARTED';
      variant = 'outline';
      break;
    case 'FILE_TYPE_NOT_SUPPORTED':
      displayLabel = 'FILE TYPE NOT SUPPORTED';
      variant = 'outline';
      break;
    case 'AUTO_INDEX_OFF':
      displayLabel = 'MANUAL SYNC';
      variant = 'secondary';
      break;
    default:
      displayLabel = status.replace(/_/g, ' ').toLowerCase();
      displayLabel = displayLabel
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      variant = 'outline';
  }

  return { label: displayLabel, variant };
};

// Format date for list view (returns object with date and time)
const formatDate = (timestamp: number) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  return {
    date: date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

interface ListViewProps {
  items: any[];
  pageLoading: boolean;
  navigateToFolder: (item: any) => void;
  handleMenuOpen: (event: React.MouseEvent<HTMLElement>, item: any) => void;
  totalCount: number;
  rowsPerPage: number;
  page: number;
  setPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;
  currentKB: any;
  loadKBContents: (kbId: string, folderId?: string) => void;
  route: any;
  CompactIconButton: any;
}

export const ListView: React.FC<ListViewProps> = ({
  items,
  pageLoading,
  navigateToFolder,
  handleMenuOpen,
  totalCount,
  rowsPerPage,
  page,
  setPage,
  setRowsPerPage,
  currentKB,
  loadKBContents,
  route,
  CompactIconButton,
}) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 56,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const item = row.original;
          const extension = item.extension || item.fileRecord?.extension || '';
          const mimeType = item.fileRecord?.mimeType || item.mimeType || '';
          const recordType = item.recordType || (item.type === 'folder' ? 'FOLDER' : 'FILE');
          const IconComponent = getRecordIcon(recordType, extension, mimeType, item.origin);

          return (
            <div className="flex items-center h-14 pl-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-2.5 flex-shrink-0 bg-muted/30">
                <IconComponent
                  size={26}
                  className="opacity-90"
                />
              </div>
              <span className="text-sm font-medium truncate">{item.name || item.recordName}</span>
            </div>
          );
        },
        size: 200,
        minSize: 200,
      },
      {
        accessorKey: 'indexingStatus',
        header: 'Status',
        cell: ({ row }) => {
          const item = row.original;
          if (!item.indexingStatus || item.type === 'folder') {
            return null;
          }

          const { label, variant } = getStatusDisplay(item.indexingStatus);

          return (
            <div className="flex items-center justify-center h-14">
              <Badge variant={variant} className="text-xs font-medium">
                {label}
              </Badge>
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: 'origin',
        header: 'Origin',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-14">
            <span className="text-xs font-medium">{row.original.origin || 'LOCAL'}</span>
          </div>
        ),
        size: 110,
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => {
          const item = row.original;
          const size = item.sizeInBytes || item.fileRecord?.sizeInBytes;
          const formattedSize =
            size !== undefined && !Number.isNaN(size) && size > 0 ? formatFileSize(size) : '—';

          return (
            <div className="flex items-center h-14">
              <span className="text-xs text-muted-foreground font-mono">{formattedSize}</span>
            </div>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'sourceCreatedAtTimestamp',
        header: 'Created',
        cell: ({ row }) => {
          const item = row.original;
          const timestamp = item.sourceCreatedAtTimestamp;
          const formatted = formatDate(timestamp);

          if (!formatted) {
            return (
              <div className="flex items-center h-14">
                <span className="text-xs text-muted-foreground">—</span>
              </div>
            );
          }

          return (
            <div className="flex flex-col justify-center h-14 pl-2">
              <span className="text-xs font-medium">{formatted.date}</span>
              <span className="text-xs text-muted-foreground">{formatted.time}</span>
            </div>
          );
        },
        size: 160,
      },
      {
        accessorKey: 'sourceLastModifiedTimestamp',
        header: 'Updated',
        cell: ({ row }) => {
          const item = row.original;
          const timestamp = item.sourceLastModifiedTimestamp;
          const formatted = formatDate(timestamp);

          if (!formatted) {
            return (
              <div className="flex items-center h-14">
                <span className="text-xs text-muted-foreground">—</span>
              </div>
            );
          }

          return (
            <div className="flex flex-col justify-center h-14 pl-2">
              <span className="text-xs font-medium">{formatted.date}</span>
              <span className="text-xs text-muted-foreground">{formatted.time}</span>
            </div>
          );
        },
        size: 160,
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-14">
            <span className="text-xs text-muted-foreground font-medium">
              {row.original.version || '1'}
            </span>
          </div>
        ),
        size: 70,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-14">
            <CompactIconButton
              onClick={(e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation();
                handleMenuOpen(e, row.original);
              }}
              className="w-7 h-7 text-muted-foreground/60 hover:text-primary hover:bg-primary/5"
            >
              <MoreVertical width={16} height={16} />
            </CompactIconButton>
          </div>
        ),
        enableSorting: false,
        size: 70,
      },
    ],
    [handleMenuOpen]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    manualPagination: true,
    pageCount: Math.ceil(totalCount / rowsPerPage) || 1,
  });

  const navigate = useNavigate();

  const handleRowClick = (item: any, event: React.MouseEvent) => {
    const isCheckboxClick = (event.target as HTMLElement).closest('[role="checkbox"]');
    if (!isCheckboxClick && item.type === 'folder') {
      navigateToFolder(item);
    } else if (!isCheckboxClick) {
      navigate(`/record/${item.id}`);
    }
  };

  if (pageLoading) {
    return (
      <div className="h-[600px] flex flex-col rounded-lg border overflow-hidden">
        <div className="flex-1">
          {Array.from(new Array(8)).map((_, index) => (
            <div key={index} className="border-b border-border">
              <div className="flex items-center gap-4 py-4 px-6">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const currentPage = page + 1;

  return (
    <div className="overflow-hidden h-[calc(100vh-200px)] flex flex-col border rounded-lg">
      <div className="flex-1 overflow-auto h-[calc(100%-64px)]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-14 font-semibold text-sm"
                    style={{
                      width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined,
                    }}
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
                  onClick={(e) => handleRowClick(row.original, e)}
                  className={cn(
                    'h-14 border-b cursor-pointer hover:bg-primary/5',
                    row.getIsSelected() && 'bg-primary/10 hover:bg-primary/15'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width:
                          cell.column.getSize() !== 150 ? `${cell.column.getSize()}px` : undefined,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <p className="text-sm text-muted-foreground">
                    No records uploaded for knowledge base
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex justify-between items-center px-6 py-3 border-t bg-muted/30 h-[64px]">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? 'No records found'
            : `Showing ${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, totalCount)} of ${totalCount} records`}
        </p>

        <div className="flex items-center gap-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(Math.max(0, page - 1))}
                  className={cn(page === 0 && 'pointer-events-none opacity-50')}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    {pageNum === currentPage ? (
                      <PaginationLink isActive>{pageNum}</PaginationLink>
                    ) : (
                      <PaginationLink onClick={() => setPage(pageNum - 1)}>
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  className={cn(page >= totalPages - 1 && 'pointer-events-none opacity-50')}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(parseInt(value, 10));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default ListView;
