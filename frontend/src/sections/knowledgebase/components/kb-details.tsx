import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import {
  RefreshCw,
  List,
  LayoutGrid,
  ArrowLeft,
  Folder,
  FolderPlus,
  Upload,
  Users,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Link as LinkIcon,
  Search,
  FileText,
  ChevronDown,
  LayoutDashboard,
  Library,
} from 'lucide-react';
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

import { GridView } from './folder-grid-view';
import { ListView } from './folder-list-view';
import { ShareKnowledgeBaseDialog } from './dialogs/share-dialog';
import { LinkKnowledgeBaseDialog } from './dialogs/link-kb-dialog';
import { KBRecordsList } from './kb-records-list';
import { KnowledgeBaseAPI } from '../services/api';

import type { KnowledgeBase, Item } from '../types/kb';

// CompactIconButton replacement for GridView/ListView
const CompactIconButton: React.FC<{
  size?: 'small' | 'medium';
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ size = 'small', onClick, children, className }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    onClick={onClick}
    className={cn(
      'h-9 w-9 rounded-lg border border-border/8 bg-background/80 backdrop-blur-sm transition-all hover:bg-primary/8 hover:border-primary/20 hover:scale-105',
      className
    )}
  >
    {children}
  </Button>
);

// Helper to format relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/* eslint-disable react/no-unused-prop-types */
interface KBDetailsProps {
  navigationPath: any;
  navigateToDashboard: any;
  navigateToPathIndex: any;
  viewMode: any;
  handleViewChange: any;
  navigateBack: any;
  CompactCard: any;
  items: any;
  pageLoading: any;
  navigateToFolder: any;
  handleMenuOpen: any;
  totalCount: any;
  hasMore: any;
  loadingMore: any;
  handleLoadMore: any;
  currentKB: KnowledgeBase | null;
  loadKBContents: any;
  stableRoute: any;
  currentUserPermission: any;
  setCreateFolderDialog: any;
  setUploadDialog: any;
  openPermissionsDialog: any;
  handleRefresh: any;
  setPage: any;
  setRowsPerPage: any;
  rowsPerPage: any;
  page: any;
  setContextItem?: any;
  setItemToDelete?: any;
  setDeleteDialog?: any;
}
/* eslint-enable react/no-unused-prop-types */

// Main component wrapper to handle state
export const KBDetailView: React.FC<KBDetailsProps> = (props) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [linkKBDialogOpen, setLinkKBDialogOpen] = useState(false);
  const [isReindexing, setIsReindexing] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentKB, loadKBContents, stableRoute, setContextItem, setItemToDelete, setDeleteDialog } = props;

  // Handle reindex record
  const handleReindexRecord = async (recordId: string) => {
    setIsReindexing(recordId);
    try {
      const response = await axios.post(
        `${CONFIG.backendUrl}/api/v1/knowledgeBase/reindex/record/${recordId}`
      );
      if (response.data.success) {
        toast.success('File indexing started');
        // Refresh the KB contents to show updated status
        if (loadKBContents && stableRoute) {
          loadKBContents(currentKB?.id, stableRoute.folderId);
        }
      } else {
        toast.error('Failed to start reindexing');
      }
    } catch (error) {
      console.log('error in re indexing', error);
      toast.error('Failed to start reindexing');
    } finally {
      setIsReindexing(null);
    }
  };

  return (
    <>
      {renderKBDetail({ ...props, setShareDialogOpen, setLinkKBDialogOpen, navigate, handleReindexRecord, isReindexing })}

      {/* Share Dialog */}
      {currentKB && (
        <ShareKnowledgeBaseDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          kbId={currentKB.id}
          kbName={currentKB.name}
        />
      )}

      {/* Link KB Dialog */}
      {currentKB && (
        <LinkKnowledgeBaseDialog
          open={linkKBDialogOpen}
          onClose={() => setLinkKBDialogOpen(false)}
          kbId={currentKB.id}
          kbName={currentKB.name}
          currentLinkedKBs={currentKB.linkedKBs}
          onLink={async (linkedKbId: string) => {
            try {
              await KnowledgeBaseAPI.linkKnowledgeBase(currentKB.id, linkedKbId);
              toast.success('Knowledge Base linked successfully');
              // Refresh KB data
              if (loadKBContents && stableRoute) {
                await loadKBContents(currentKB.id, stableRoute.folderId, true, true);
              }
            } catch (error) {
              toast.error('Failed to link Knowledge Base');
            }
          }}
          onUnlink={async (linkedKbId: string) => {
            try {
              await KnowledgeBaseAPI.unlinkKnowledgeBase(currentKB.id, linkedKbId);
              toast.success('Knowledge Base unlinked successfully');
              // Refresh KB data
              if (loadKBContents && stableRoute) {
                await loadKBContents(currentKB.id, stableRoute.folderId, true, true);
              }
            } catch (error) {
              toast.error('Failed to unlink Knowledge Base');
            }
          }}
        />
      )}
    </>
  );
};

interface RenderKBDetailProps extends KBDetailsProps {
  setShareDialogOpen?: (open: boolean) => void;
  setLinkKBDialogOpen?: (open: boolean) => void;
  navigate?: (path: string) => void;
  handleReindexRecord?: (recordId: string) => Promise<void>;
  isReindexing?: string | null;
  setContextItem?: any;
  setItemToDelete?: any;
  setDeleteDialog?: any;
}

export const renderKBDetail = ({
  navigationPath,
  navigateToDashboard,
  navigateToPathIndex,
  viewMode,
  handleViewChange,
  navigateBack,
  CompactCard,
  items,
  pageLoading,
  navigateToFolder,
  handleMenuOpen,
  totalCount,
  hasMore,
  loadingMore,
  handleLoadMore,
  currentKB,
  loadKBContents,
  stableRoute,
  currentUserPermission,
  setCreateFolderDialog,
  setUploadDialog,
  openPermissionsDialog,
  handleRefresh,
  setPage,
  setRowsPerPage,
  rowsPerPage,
  page,
  setShareDialogOpen,
  setLinkKBDialogOpen,
  navigate,
  handleReindexRecord,
  isReindexing,
  setContextItem,
  setItemToDelete,
  setDeleteDialog,
}: RenderKBDetailProps) => {
  // Check if we're in a subfolder
  const isInSubfolder = navigationPath.length > 1;

  // Build owner photo URL if available
  const ownerPhotoUrl = currentKB?.ownerPhotoBase64 && currentKB?.ownerPhotoMimeType
    ? `data:${currentKB.ownerPhotoMimeType};base64,${currentKB.ownerPhotoBase64}`
    : undefined;

  // Get owner initials
  const getOwnerInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if current user is the owner
  const isOwner = currentUserPermission?.role === 'OWNER';
  const ownerDisplayName = isOwner ? 'You' : (currentKB?.ownerName || 'Unknown');

  return (
    <div className="h-full flex flex-col font-roboto">
      {/* If in subfolder, show the old toolbar style */}
      {isInSubfolder ? (
        <>
          {/* Old Toolbar for subfolders */}
          <div className="flex flex-col gap-3 border-b border-border/8 bg-background/90 backdrop-blur-md px-3 py-2 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:py-3 lg:min-h-[60px]">
            <div className="flex w-full items-center gap-2 min-h-[48px]">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={navigateBack}
                className="h-8 w-8 shrink-0 rounded border border-border bg-transparent text-muted-foreground transition-all hover:border-primary hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft width={16} height={16} />
              </Button>

              <div className="flex flex-1 min-w-0">
                <nav className="flex items-center gap-1 text-sm">
                  {navigationPath.map((item: any, index: number) => (
                    <React.Fragment key={item.id}>
                      {index > 0 && <span className="text-muted-foreground/50">/</span>}
                      <button
                        type="button"
                        onClick={() => navigateToPathIndex(index)}
                        className={cn(
                          'px-1.5 py-0.5 rounded hover:bg-accent transition-colors truncate max-w-[150px]',
                          index === navigationPath.length - 1
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {item.name}
                      </button>
                    </React.Fragment>
                  ))}
                </nav>
              </div>

              {/* View Toggle */}
              <div className="flex shrink-0 gap-1 rounded border border-border p-0.5">
                <Button
                  type="button"
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange(null, 'list')}
                  className={cn(
                    'h-8 min-w-[36px] rounded px-3 py-1 text-muted-foreground transition-all',
                    viewMode === 'list' && 'bg-accent text-foreground'
                  )}
                >
                  <List width={16} height={16} />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange(null, 'grid')}
                  className={cn(
                    'h-8 min-w-[36px] rounded px-3 py-1 text-muted-foreground transition-all',
                    viewMode === 'grid' && 'bg-accent text-foreground'
                  )}
                >
                  <LayoutGrid width={16} height={16} />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex shrink-0 gap-1">
                {currentUserPermission?.canCreateFolders && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateFolderDialog(true)}
                    className="h-8 rounded border-border bg-transparent px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary hover:bg-accent hover:text-foreground sm:px-4"
                  >
                    <FolderPlus width={14} height={14} className="sm:mr-2" />
                    <span className="hidden sm:inline">New Folder</span>
                  </Button>
                )}

                {currentUserPermission?.canUpload && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadDialog(true)}
                    className="h-8 rounded border-primary bg-transparent px-3 text-xs font-medium text-primary transition-all hover:bg-primary/5 sm:px-4"
                  >
                    <Upload width={14} height={14} className="sm:mr-2" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  className="h-8 w-8 rounded border border-border bg-transparent text-muted-foreground transition-all hover:border-primary hover:bg-accent hover:text-foreground"
                >
                  <RefreshCw width={16} height={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area for subfolders */}
          <div className="flex flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            {items.length === 0 && !pageLoading ? (
              <div className="flex w-full flex-col items-center justify-center py-8 text-center text-muted-foreground sm:py-12 md:py-16">
                <Folder width={48} height={48} className="mb-4 opacity-30" />
                <h6 className="mb-1 text-lg font-semibold">This folder is empty</h6>
                <p className="mb-6 text-sm">Upload files or create folders to get started</p>
                <div className="flex max-w-[300px] flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadDialog(true)}
                    className="w-full border-primary text-primary hover:bg-primary/5 sm:w-auto"
                  >
                    <Upload width={14} height={14} className="mr-2" />
                    Upload Files
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateFolderDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    <FolderPlus width={14} height={14} className="mr-2" />
                    Create Folder
                  </Button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <GridView
                items={items}
                pageLoading={pageLoading}
                navigateToFolder={navigateToFolder}
                handleMenuOpen={handleMenuOpen}
                CompactCard={CompactCard}
                CompactIconButton={CompactIconButton}
                totalCount={totalCount}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMore}
              />
            ) : (
              <ListView
                items={items}
                pageLoading={pageLoading}
                navigateToFolder={navigateToFolder}
                handleMenuOpen={handleMenuOpen}
                totalCount={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                setPage={setPage}
                setRowsPerPage={setRowsPerPage}
                currentKB={currentKB}
                loadKBContents={loadKBContents}
                route={stableRoute}
                CompactIconButton={CompactIconButton}
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* New Thero-style Header for KB root */}
          <div className="">
            {/* Top Action Bar */}
            <div className="flex items-center justify-between gap-2 px-6 py-3 w-full">
              {/* Back Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={navigateToDashboard}
                className="h-8 w-8 shrink-0 rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft width={20} height={20} />
              </Button>

              {/* Right side actions */}
              <div className="flex items-center gap-2">
                {/* Open all links */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    // TODO: Implement open all links functionality
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open all links</span>
                </button>

                {/* More Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 gap-1.5 text-[14px] font-normal border-gray-300 hover:bg-gray-50"
                    >
                      More
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuItem onClick={() => setCreateFolderDialog(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      New Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLinkKBDialogOpen?.(true)}>
                      <Library className="w-4 h-4 mr-2" />
                      Link Knowledge Base
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openPermissionsDialog}>
                      <Users className="w-4 h-4 mr-2" />
                      Manage Permissions
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleRefresh}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Add Knowledge Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 gap-1.5 text-[14px] font-normal border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add knowledge
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuItem onClick={() => {
                      // TODO: Implement search functionality
                    }}>
                      <Search className="w-4 h-4 mr-2" />
                      From Search
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      // TODO: Implement URL import functionality
                    }}>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      From a URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setUploadDialog(true)}>
                      <FileText className="w-4 h-4 mr-2" />
                      From a Document
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Share Button */}
                <Button
                  size="sm"
                  className="h-9 px-4 gap-2 text-[14px] font-medium bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setShareDialogOpen?.(true)}
                >
                  <LinkIcon className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>

            <div className="max-w-5xl mx-auto w-full">
              {/* KB Header Info */}
              <div className="px-6 pb-8">
                {/* Large Icon */}
                <div className="text-5xl mb-4 ml-1">
                  {currentKB?.icon || '📚'}
                </div>

                {/* Title */}
                <h1 className="text-[28px] font-semibold text-foreground mb-2">
                  {currentKB?.name || 'Knowledge Base'}
                </h1>

                {/* Created by & Last updated */}
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground mb-4">
                  <span>Created by</span>
                  <Avatar className="h-5 w-5">
                    {ownerPhotoUrl ? (
                      <AvatarImage src={ownerPhotoUrl} alt={ownerDisplayName} />
                    ) : null}
                    <AvatarFallback className="text-[10px] bg-blue-500 text-white">
                      {getOwnerInitials(currentKB?.ownerName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{ownerDisplayName}</span>
                  <span>·</span>
                  <span>Last updated {formatRelativeTime(currentKB?.updatedAtTimestamp || Date.now())}</span>
                  {currentKB?.indexingStatus === 'IN_PROGRESS' && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Indexing...
                    </span>
                  )}
                </div>

                {/* Contributors from linked KBs */}
                {currentKB?.contributors && currentKB.contributors.length > 0 && (
                  <div className="flex items-center gap-2 text-[14px] text-muted-foreground mb-4">
                    <span>Collection</span>
                    <span>·</span>
                    <span>{items.length} documents</span>
                    <span>·</span>
                    <div className="flex -space-x-1.5">
                      {currentKB.contributors.slice(0, 3).map((contributor, idx) => {
                        const contributorPhotoUrl = contributor.photoBase64 && contributor.photoMimeType
                          ? `data:${contributor.photoMimeType};base64,${contributor.photoBase64}`
                          : contributor.photoUrl;

                        return (
                          <Avatar key={idx} className="h-5 w-5 border border-background">
                            {contributorPhotoUrl ? (
                              <AvatarImage src={contributorPhotoUrl} alt={contributor.name} />
                            ) : null}
                            <AvatarFallback className="text-[9px] bg-blue-500 text-white">
                              {getOwnerInitials(contributor.name)}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                    <span>
                      {currentKB.contributors.slice(0, 2).map(c => c.firstName || c.name.split(' ')[0]).join(', ')}
                      {currentKB.contributors.length > 2 && `, and ${currentKB.contributors.length - 2} more`}
                    </span>
                  </div>
                )}

                {/* Description */}
                {currentKB?.description && (
                  <p className="text-[15px] text-muted-foreground max-w-3xl leading-relaxed">
                    {currentKB.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex flex-1 overflow-auto bg-background">
            <div className="w-full max-w-5xl mx-auto">
              {items.length === 0 && !pageLoading ? (
                /* Empty State - Thero Style */
                <div className="flex w-full flex-col items-center justify-center py-20 text-center px-6">
                  {/* Grid Icon */}
                  <div className="mb-4 grid grid-cols-2 gap-1.5 opacity-30">
                    <div className="w-6 h-6 border-2 border-muted-foreground rounded" />
                    <div className="w-6 h-6 border-2 border-muted-foreground rounded" />
                    <div className="w-6 h-6 border-2 border-muted-foreground rounded" />
                    <div className="w-6 h-6 border-2 border-muted-foreground rounded" />
                  </div>

                  <p className="text-[16px] text-muted-foreground mb-6">
                    No records in this Knowledge Base yet
                  </p>

                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setUploadDialog(true)}
                    className="h-10 px-5 text-[14px] font-normal border-gray-300 hover:bg-gray-50"
                  >
                    Add to this Knowledge Base
                  </Button>
                </div>
              ) : (
                <div className="w-full px-6 py-6">
                  {/* Thero-style Records List */}
                  <KBRecordsList
                    items={items}
                    loading={pageLoading}
                    onNavigateToFolder={navigateToFolder}
                    onNavigateToLinkedKB={(kbId) => {
                      const searchParams = new URLSearchParams(window.location.search);
                      searchParams.set('view', 'knowledge-base');
                      searchParams.set('kbId', kbId);
                      searchParams.delete('folderId');

                      const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
                      window.history.pushState(null, '', newUrl);
                      window.dispatchEvent(new Event('locationchange'));
                    }}
                    onViewRecord={(recordId) => {
                      navigate?.(`/record/${recordId}`);
                    }}
                    onDeleteRecord={(item) => {
                      setContextItem?.({ ...item, action: 'delete' } as any);
                      setItemToDelete?.(item);
                      setDeleteDialog?.(true);
                    }}
                    onReindexRecord={(recordId) => {
                      handleReindexRecord?.(recordId);
                    }}
                    onDownloadRecord={(item) => {
                      if (item.webUrl) {
                        window.open(item.webUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    onMenuOpen={handleMenuOpen}
                    onUnlinkKB={async (linkedKbId) => {
                      if (currentKB) {
                        try {
                          await KnowledgeBaseAPI.unlinkKnowledgeBase(currentKB.id, linkedKbId);
                          toast.success('Knowledge Base unlinked successfully');
                          if (loadKBContents && stableRoute) {
                            await loadKBContents(currentKB.id, stableRoute.folderId, true, true);
                          }
                        } catch (error) {
                          toast.error('Failed to unlink Knowledge Base');
                        }
                      }
                    }}
                  />

                  {/* Load More / Pagination */}
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="h-9 px-4 text-[14px]"
                      >
                        {loadingMore ? 'Loading...' : 'Load more'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
