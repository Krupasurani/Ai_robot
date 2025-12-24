import { Icon } from '@iconify/react';
import React, { memo, useEffect, useMemo } from 'react';
import { Database, MoreVertical, ChevronsUpDown, ChevronUp, ChevronDown, Share2, Clock, FileText, User, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/drop-down-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { getUserById } from '@/sections/accountdetails/utils';
import { getKBIcon } from '../utils/kb-icon';
import type { KnowledgeBase } from '../types/kb';

// Helper function to format time ago
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months = Math.floor(diff / 2592000000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}min ago`;
  if (hours < 24) return `${hours}hrs ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mth ago`;
};

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

type SortField = 'name' | 'records' | 'createdBy' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

const ListView = memo<{
  filteredKnowledgeBases: KnowledgeBase[];
  navigateToKB: (kb: KnowledgeBase) => void;
  onEditKB: (kb: KnowledgeBase) => void;
  onShareKB: (kb: KnowledgeBase) => void;
  onDeleteKB: (kb: KnowledgeBase) => void;
  onShowDetails?: (kb: KnowledgeBase) => void;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (kbId: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (kbId: string, checked: boolean) => void;
  onToggleSelectAll?: (kbIds: string[], checked: boolean) => void;
  totalCount: number;
  page: number;
  rowsPerPage: number;
  handlePageChange: (page: number) => void;
  handleRowsPerPageChange: (rowsPerPage: number) => void;
  loading: boolean;
}>(
  ({
    filteredKnowledgeBases,
    navigateToKB,
    onEditKB,
    onShareKB,
    onDeleteKB,
    loading,
  }) => {
    const [sortField, setSortField] = React.useState<SortField>('lastUpdated');
    const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
    const [userNames, setUserNames] = React.useState<Map<string, string>>(new Map());
    const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

    // Fetch user names for all knowledge bases
    useEffect(() => {
      const fetchUserNames = async () => {
        const userIds = filteredKnowledgeBases
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
    }, [filteredKnowledgeBases]);

    // Sort knowledge bases based on current sort field and direction
    const knowledgeBases = useMemo(() => {
      const sorted = [...filteredKnowledgeBases].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'records':
            comparison = (a.metrics?.docs ?? -1) - (b.metrics?.docs ?? -1);
            break;
          case 'createdBy': {
            const ownerA = a.ownerName || (a.ownerId ? userNames.get(a.ownerId) : null) || 'Unknown';
            const ownerB = b.ownerName || (b.ownerId ? userNames.get(b.ownerId) : null) || 'Unknown';
            comparison = ownerA.localeCompare(ownerB);
            break;
          }
          case 'lastUpdated':
            comparison = a.updatedAtTimestamp - b.updatedAtTimestamp;
            break;
          default:
            comparison = 0;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });

      return sorted;
    }, [filteredKnowledgeBases, sortField, sortDirection, userNames]);

    const handleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
      if (sortField !== field) {
        return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground/50" />;
      }
      return sortDirection === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
      );
    };

    if (loading && knowledgeBases.length === 0) {
      return (
        <div className="space-y-2 px-2 sm:px-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 sm:h-16 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }

    if (knowledgeBases.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <Database className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No knowledge bases found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Create your first knowledge base to get started
          </p>
        </div>
      );
    }

    return (
      <div className="w-full max-w-[1800px] mx-auto">
        {/* Desktop Header - Hidden on mobile */}
        <div className="hidden md:grid md:grid-cols-[2.5fr_80px_1.2fr_1.2fr_48px] gap-3 md:gap-4 lg:gap-6 px-4 lg:px-6 xl:px-8 py-3 border-b border-border/40">
          <button
            type="button"
            className="group flex items-center text-left text-sm font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            onClick={() => handleSort('name')}
          >
            Name
            <SortIcon field="name" />
          </button>
          <button
            type="button"
            className="group flex items-center justify-center text-sm font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            onClick={() => handleSort('records')}
          >
            Records
            <SortIcon field="records" />
          </button>
          <button
            type="button"
            className="group flex items-center justify-center text-sm font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            onClick={() => handleSort('createdBy')}
          >
            Created by
            <SortIcon field="createdBy" />
          </button>
          <button
            type="button"
            className="group flex items-center justify-center text-sm font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            onClick={() => handleSort('lastUpdated')}
          >
            Last updated
            <SortIcon field="lastUpdated" />
          </button>
          <div />
        </div>

        {/* Mobile Sort Controls */}
        <div className="flex md:hidden items-center justify-between px-4 py-2 border-b border-border/40">
          <span className="text-sm text-muted-foreground">
            {knowledgeBases.length} {knowledgeBases.length === 1 ? 'item' : 'items'}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                Sort: {sortField === 'name' ? 'Name' : sortField === 'records' ? 'Records' : sortField === 'createdBy' ? 'Owner' : 'Updated'}
                {sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort('name')}>
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('records')}>
                Records {sortField === 'records' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('createdBy')}>
                Created by {sortField === 'createdBy' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('lastUpdated')}>
                Last updated {sortField === 'lastUpdated' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {knowledgeBases.map((kb) => {
            const kbIcon = getKBIcon(kb.name);
            const ownerName = kb.ownerName || (kb.ownerId ? userNames.get(kb.ownerId) : null) || 'Unknown';
            const recordCount = kb.metrics?.docs;

            return (
              <div
                key={kb.id}
                onClick={() => navigateToKB(kb)}
                className="hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
              >
                {/* Mobile Layout */}
                <div className="flex md:hidden items-start gap-3 p-4">
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                    {kb.icon ? (
                      <span className="text-2xl">{kb.icon}</span>
                    ) : (
                      <Icon icon={kbIcon} fontSize={24} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary truncate">
                      {kb.name}
                    </p>
                    {kb.description && (
                      <p className="text-sm text-muted-foreground/50 line-clamp-2 mt-0.5">
                        {kb.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {recordCount ?? '—'} records
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {ownerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(kb.updatedAtTimestamp)}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu open={openMenuId === `mobile-${kb.id}`} onOpenChange={(open) => setOpenMenuId(open ? `mobile-${kb.id}` : null)}>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                      >
                        <MoreVertical className="w-4.5 h-4.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl border border-border/50 shadow-lg backdrop-blur-sm">
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigateToKB(kb); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                          <Eye className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">Open</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onShareKB(kb); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">Share</span>
                      </DropdownMenuItem>
                      {kb.userRole !== 'READER' && (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onEditKB(kb); }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500">
                              <Pencil className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium">Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onDeleteKB(kb); }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-destructive/10 text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/10 text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium">Delete</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:grid md:grid-cols-[2.5fr_80px_1.2fr_1.2fr_48px] gap-3 md:gap-4 lg:gap-6 px-4 lg:px-6 xl:px-8 py-4 items-center">
                  {/* Name Column */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                      {kb.icon ? (
                        <span className="text-xl">{kb.icon}</span>
                      ) : (
                        <Icon icon={kbIcon} fontSize={20} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-primary truncate hover:underline">
                        {kb.name}
                      </p>
                      {kb.description && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm text-muted-foreground/50 truncate">
                                {kb.description}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              align="start"
                              className="max-w-md text-sm"
                            >
                              {kb.description}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Records Column */}
                  <div className="flex items-center justify-center">
                    <span className="text-sm text-foreground tabular-nums">
                      {recordCount ?? '—'}
                    </span>
                  </div>

                  {/* Created By Column - Hide avatar on medium screens, show on large */}
                  <div className="flex items-center justify-center gap-2 min-w-0">
                    <Avatar className="hidden lg:flex w-7 h-7 flex-shrink-0">
                      {kb.ownerPhotoBase64 && kb.ownerPhotoMimeType ? (
                        <AvatarImage
                          src={`data:${kb.ownerPhotoMimeType};base64,${kb.ownerPhotoBase64}`}
                          alt={ownerName}
                        />
                      ) : null}
                      <AvatarFallback className={cn('text-xs text-white', getAvatarColor(ownerName))}>
                        {getInitials(ownerName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground truncate">
                      {ownerName}
                    </span>
                  </div>

                  {/* Last Updated Column */}
                  <div className="flex items-center justify-center">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(kb.updatedAtTimestamp)}
                    </span>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center justify-end">
                    <DropdownMenu open={openMenuId === kb.id} onOpenChange={(open) => setOpenMenuId(open ? kb.id : null)}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                        >
                          <MoreVertical className="w-4.5 h-4.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl border border-border/50 shadow-lg backdrop-blur-sm">
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigateToKB(kb); }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                            <Eye className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">Open</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onShareKB(kb); }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500">
                            <Share2 className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">Share</span>
                        </DropdownMenuItem>
                        {kb.userRole !== 'READER' && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onEditKB(kb); }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50"
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500">
                                <Pencil className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium">Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onDeleteKB(kb); }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-destructive/10 text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/10 text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium">Delete</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

ListView.displayName = 'ListView';

export { ListView };
