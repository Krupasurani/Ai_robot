import React from 'react';
import { MoreVertical, Folder, ExternalLink, Trash2, RefreshCw, Eye, Download, Library, Unlink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/drop-down-menu';
import { Skeleton } from '@/components/ui/skeleton';

import { getRecordIcon, VerifiedBadge, CollectionIcon } from './file-type-icons';

import type { Item } from '../types/kb';

// Helper to format relative time
const formatRelativeTime = (timestamp: number | undefined): string => {
  if (!timestamp) return '';

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format date for "Updated" style
const formatUpdateDate = (timestamp: number | undefined): string => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  return `Updated ${date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })}`;
};

interface RecordItemProps {
  item: Item;
  onNavigateToFolder?: (folder: Item) => void;
  onNavigateToLinkedKB?: (kbId: string) => void;
  onViewRecord?: (recordId: string) => void;
  onDeleteRecord?: (item: Item) => void;
  onReindexRecord?: (recordId: string) => void;
  onDownloadRecord?: (item: Item) => void;
  onMenuOpen?: (e: React.MouseEvent<HTMLElement>, item: Item) => void;
  onUnlinkKB?: (kbId: string) => void;
}

const RecordItem: React.FC<RecordItemProps> = ({
  item,
  onNavigateToFolder,
  onNavigateToLinkedKB,
  onViewRecord,
  onDeleteRecord,
  onReindexRecord,
  onDownloadRecord,
  onMenuOpen,
  onUnlinkKB,
}) => {
  const isFolder = item.type === 'folder';
  const isLinkedKB = item.type === 'linked-kb';
  const isCollection = item.type === 'folder' || (item as any).recordType === 'COLLECTION';

  // Get the appropriate icon
  const IconComponent = isLinkedKB
    ? null // We'll render emoji/icon directly for linked KBs
    : isFolder
      ? CollectionIcon
      : getRecordIcon(
        (item as any).recordType || 'FILE',
        item.extension || item.fileRecord?.extension,
        item.fileRecord?.mimeType,
        (item as any).origin
      );

  // Get record details
  const recordName = item.name || item.recordName || 'Untitled';
  const webUrl = item.webUrl || item.fileRecord?.webUrl;
  const description = (item as any).description || (item as any).summary;
  const createdAt = item.createdAt || item.createdAtTimestamp;
  const updatedAt = item.updatedAt || item.updatedAtTimestamp;
  const createdBy = (item as any).createdByName || (item as any).ownerName;
  const createdByPhoto = (item as any).createdByPhoto;
  const isVerified = (item as any).isVerified;
  const folderName = (item as any).folderName || (item as any).kbName;
  const documentCount = (item as any).documentCount;
  const indexingStatus = (item as any).indexingStatus;
  const linkedKb = (item as any).linkedKb || (item as any).kb;

  // Handle click on item
  const handleClick = () => {
    if (isLinkedKB && onNavigateToLinkedKB) {
      onNavigateToLinkedKB(item.id);
    } else if (isFolder && onNavigateToFolder) {
      onNavigateToFolder(item);
    } else if (onViewRecord) {
      onViewRecord(item.id);
    }
  };

  // Get initials from name
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className="group flex items-center gap-5 py-4 px-3 hover:bg-muted/30 rounded-xl cursor-pointer transition-colors"
      onClick={handleClick}
    >
      {/* Icon - Fixed size container with flex centering */}
      <div className="flex items-center justify-center flex-shrink-0 w-12 h-12">
        {isLinkedKB ? (
          <span className="text-3xl">{item.icon || '📚'}</span>
        ) : (
          IconComponent && <IconComponent size={44} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Title Row */}
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-semibold text-blue-600 hover:underline truncate leading-snug">
            {recordName}
          </h3>
          {isVerified && <VerifiedBadge size={18} />}
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-1.5 text-[14px] text-gray-500 flex-wrap leading-relaxed">
          {/* Description with fade effect if too long */}
          {description && !isFolder && (
            <>
              <span
                className="truncate max-w-[350px] relative"
                title={description}
                style={{
                  maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                }}
              >
                {description}
              </span>
              <span>·</span>
            </>
          )}

          {/* Linked KB info */}
          {isLinkedKB && (
            <>
              <span>Knowledge Base</span>
              <span>·</span>
              <span>{documentCount ?? 0} documents</span>
            </>
          )}

          {/* Collection info */}
          {isCollection && !isLinkedKB && documentCount !== undefined && (
            <>
              <span>Collection</span>
              <span>·</span>
              <span>{documentCount} documents</span>
              <span>·</span>
            </>
          )}

          {/* Time info */}
          {(createdAt || updatedAt) && (
            <>
              <span>{formatUpdateDate(updatedAt || createdAt)}</span>
            </>
          )}

          {/* Author */}
          {createdBy && (
            <>
              <span>·</span>
              <Avatar className="h-5 w-5">
                {createdByPhoto ? (
                  <AvatarImage src={createdByPhoto} alt={createdBy} />
                ) : null}
                <AvatarFallback className="text-[9px] bg-blue-500 text-white">
                  {getInitials(createdBy)}
                </AvatarFallback>
              </Avatar>
              <span>{createdBy}</span>
            </>
          )}

          {/* Folder info */}
          {folderName && !isCollection && (
            <>
              <span>·</span>
              <Folder className="h-4 w-4" />
              <span>{folderName}</span>
            </>
          )}

          {/* Linked KB group */}
          {linkedKb && linkedKb.name && (
            <>
              <span>·</span>
              <Library className="h-4 w-4" />
              <span className="hover:underline cursor-pointer">{linkedKb.name}</span>
            </>
          )}

          {/* Multiple authors for collections */}
          {isCollection && (item as any).contributors && (
            <>
              <div className="flex -space-x-1.5">
                {((item as any).contributors as any[]).slice(0, 3).map((contributor: any, idx: number) => (
                  <Avatar key={idx} className="h-5 w-5 border border-background">
                    {contributor.photo ? (
                      <AvatarImage src={contributor.photo} alt={contributor.name} />
                    ) : null}
                    <AvatarFallback className="text-[9px] bg-blue-500 text-white">
                      {getInitials(contributor.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span>
                {((item as any).contributors as any[]).slice(0, 2).map((c: any) => c.name).join(', ')}
                {(item as any).contributors.length > 2 && `, and ${(item as any).contributors.length - 2} more`}
              </span>
            </>
          )}
        </div>

        {/* Description/Summary */}
        {description && (
          <p className="text-[14px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}

        {/* Indexing Status Badge */}
        {indexingStatus && indexingStatus !== 'COMPLETED' && (
          <div className="mt-2">
            <span className={cn(
              'text-xs px-2.5 py-0.5 rounded-full font-medium',
              indexingStatus === 'IN_PROGRESS' && 'bg-blue-100 text-blue-700',
              indexingStatus === 'FAILED' && 'bg-red-100 text-red-700',
              indexingStatus === 'NOT_STARTED' && 'bg-yellow-100 text-yellow-700',
              indexingStatus === 'PENDING' && 'bg-gray-100 text-gray-700'
            )}>
              {indexingStatus === 'IN_PROGRESS' && 'Indexing...'}
              {indexingStatus === 'FAILED' && 'Indexing Failed'}
              {indexingStatus === 'NOT_STARTED' && 'Pending'}
              {indexingStatus === 'PENDING' && 'Pending'}
            </span>
          </div>
        )}
      </div>

      {/* Actions Menu */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onMenuOpen?.(e, item);
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            {!isFolder && !isLinkedKB && (
              <>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onViewRecord?.(item.id);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>

                {webUrl && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    window.open(webUrl, '_blank', 'noopener,noreferrer');
                  }}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Link
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onDownloadRecord?.(item);
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>

                {(indexingStatus === 'FAILED' || indexingStatus === 'NOT_STARTED') && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onReindexRecord?.(item.id);
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Indexing
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
              </>
            )}

            {isFolder && (
              <>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToFolder?.(item);
                }}>
                  <Folder className="h-4 w-4 mr-2" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {isLinkedKB && (
              <>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToLinkedKB?.(item.id);
                }}>
                  <Library className="h-4 w-4 mr-2" />
                  View KB
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlinkKB?.(item.id);
                  }}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Unlink KB
                </DropdownMenuItem>
              </>
            )}

            {!isLinkedKB && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRecord?.(item);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Loading skeleton for list items
const RecordItemSkeleton: React.FC = () => (
  <div className="flex items-start gap-4 py-4 px-2">
    <Skeleton className="h-10 w-10 rounded" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-64" />
    </div>
  </div>
);

interface KBRecordsListProps {
  items: Item[];
  loading?: boolean;
  onNavigateToFolder?: (folder: Item) => void;
  onNavigateToLinkedKB?: (kbId: string) => void;
  onViewRecord?: (recordId: string) => void;
  onDeleteRecord?: (item: Item) => void;
  onReindexRecord?: (recordId: string) => void;
  onDownloadRecord?: (item: Item) => void;
  onMenuOpen?: (e: React.MouseEvent<HTMLElement>, item: Item) => void;
  onUnlinkKB?: (kbId: string) => void;
}

export const KBRecordsList: React.FC<KBRecordsListProps> = ({
  items,
  loading = false,
  onNavigateToFolder,
  onNavigateToLinkedKB,
  onViewRecord,
  onDeleteRecord,
  onReindexRecord,
  onDownloadRecord,
  onMenuOpen,
  onUnlinkKB,
}) => {
  if (loading) {
    return (
      <div className="divide-y divide-border/50">
        {Array.from({ length: 5 }).map((_, i) => (
          <RecordItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Separate linked KBs, folders and files - linked KBs first, then folders, then files
  const linkedKBs = items.filter(item => item.type === 'linked-kb');
  const folders = items.filter(item => item.type === 'folder');
  const files = items.filter(item => item.type === 'file');
  const sortedItems = [...linkedKBs, ...folders, ...files];

  return (
    <div className="font-roboto w-full space-y-2">
      {sortedItems.map((item) => (
        <RecordItem
          key={item.id}
          item={item}
          onNavigateToFolder={onNavigateToFolder}
          onNavigateToLinkedKB={onNavigateToLinkedKB}
          onViewRecord={onViewRecord}
          onDeleteRecord={onDeleteRecord}
          onReindexRecord={onReindexRecord}
          onDownloadRecord={onDownloadRecord}
          onMenuOpen={onMenuOpen}
          onUnlinkKB={onUnlinkKB}
        />
      ))}
    </div>
  );
};

export default KBRecordsList;

