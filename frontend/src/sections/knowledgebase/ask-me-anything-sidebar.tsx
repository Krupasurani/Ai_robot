import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { MessageSquare, RefreshCw, MoreVertical, FileSearch, Loader2, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/cn';

import axiosInstance from 'src/utils/axios';

import type { ConversationRecord, RecordSidebarProps } from './types/records-ask-me-anything';

const DRAWER_WIDTH = 350;

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) {
    return `Today at ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  if (date >= yesterday) {
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RecordSidebar = ({
  onClose,
  onRecordSelect,
  selectedRecordId,
  recordType,
  initialRecord,
  onRefreshComplete,
  shouldRefresh,
  onNewChat,
  recordId,
}: RecordSidebarProps) => {
  const [records, setRecords] = useState<ConversationRecord[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<ConversationRecord | null>(null);
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Memoized fetch function
  const fetchRecords = useCallback(
    async (pageNum: number, forceRefresh = false) => {
      if (!recordId) return;

      // Skip if we've already fetched for this recordId and it's not a force refresh
      if (!forceRefresh && lastFetchedId === recordId && pageNum === 1) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await axiosInstance.get('/api/v1/conversations/', {
          params: {
            page: pageNum,
            conversationSource: 'records',
            limit: 20,
            recordIds: [recordId],
            conversationSourceRecordId: recordId,
          },
        });

        const { conversations = [], pagination = {} } = response.data;

        if (pageNum === 1) {
          setRecords(conversations);
          setLastFetchedId(recordId);
        } else {
          setRecords((prev) => [...prev, ...conversations]);
        }

        setHasMore(pagination.hasNextPage || false);
        setPage(pageNum);
      } catch (error) {
        setHasMore(false);
        toast.error('Failed to fetch conversations');
      } finally {
        setIsLoading(false);
      }
    },
    [recordId, lastFetchedId]
  );

  // Initial fetch effect
  useEffect(() => {
    if (recordId && recordId !== lastFetchedId) {
      setPage(1);
      fetchRecords(1);
    }
  }, [recordId, lastFetchedId, fetchRecords]);

  // Refresh effect
  useEffect(() => {
    if (shouldRefresh) {
      fetchRecords(1, true);
      onRefreshComplete?.();
    }
  }, [shouldRefresh, fetchRecords, onRefreshComplete]);

  const handleNewChatClick = useCallback(() => {
    if (onNewChat) {
      onNewChat();
    } else {
      onRecordSelect({
        ...initialRecord,
        conversationSource: 'records',
      });
    }
  }, [onNewChat, onRecordSelect, initialRecord]);

  const handleRefresh = useCallback(() => {
    fetchRecords(1, true);
  }, [fetchRecords]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  }, []);

  // Memoized filtered records
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter((record) => record.title?.toLowerCase().includes(query));
  }, [records, searchQuery]);

  // Memoized grouped records
  const groupedRecords = useMemo(() => {
    const groups: { [key: string]: ConversationRecord[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 days': [],
      'Previous 30 days': [],
      Older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    filteredRecords.forEach((record: ConversationRecord) => {
      const recordDate = new Date(record.createdAt);

      if (recordDate >= today) {
        groups.Today.push(record);
      } else if (recordDate >= yesterday) {
        groups.Yesterday.push(record);
      } else if (recordDate >= weekAgo) {
        groups['Previous 7 days'].push(record);
      } else if (recordDate >= monthAgo) {
        groups['Previous 30 days'].push(record);
      } else {
        groups.Older.push(record);
      }
    });

    return Object.fromEntries(Object.entries(groups).filter(([_, recs]) => recs.length > 0));
  }, [filteredRecords]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const bottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 1;

      if (bottom && hasMore && !isLoading) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchRecords(nextPage);
      }
    },
    [hasMore, isLoading, page, fetchRecords]
  );

  const handleListItemClick = useCallback(
    (record: ConversationRecord) => {
      if (record) {
        onRecordSelect?.(record);
      }
    },
    [onRecordSelect]
  );

  return (
    <div
      className={cn(
        'h-full flex flex-col bg-background border-r border-border',
        `w-[${DRAWER_WIDTH}px]`
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-2 border-b border-border min-h-16 bg-background">
        <Button variant="ghost" size="icon" onClick={onClose} className="size-8">
          <Menu className="size-4" />
        </Button>
        <h3 className="flex-1 text-base font-semibold">Conversations</h3>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleNewChatClick} className="size-8">
                <MessageSquare className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleRefresh} className="size-8">
                <RefreshCw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Separator />

      {/* Search */}
      <div className="p-2 border-b border-border">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="h-9"
        />
      </div>

      {/* Records List */}
      <ScrollArea className="flex-1 px-2" onScrollCapture={handleScroll}>
        <div className="py-2">
          {Object.entries(groupedRecords).map(([group, groupRecords]) => (
            <div key={group} className="mb-4">
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group}
              </p>
              <div className="space-y-1">
                {groupRecords.map((record) => {
                  const isSelected = selectedRecordId === record._id;
                  return (
                    <div key={record._id} className="relative group">
                      <button
                        onClick={() => handleListItemClick(record)}
                        className={cn(
                          'w-full rounded-md py-3 px-4 text-left transition-colors',
                          'hover:bg-muted',
                          isSelected && 'bg-primary/10 hover:bg-primary/10'
                        )}
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <MessageSquare
                              className={cn(
                                'size-4 flex-shrink-0',
                                isSelected ? 'text-primary' : 'text-muted-foreground'
                              )}
                            />
                            <p
                              className={cn(
                                'flex-1 text-sm font-medium truncate',
                                isSelected ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {record.title || 'Untitled Conversation'}
                            </p>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecord(record);
                                  }}
                                >
                                  <MoreVertical className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleListItemClick(record);
                                  }}
                                >
                                  <MessageSquare className="mr-2 size-4" />
                                  Open Conversation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6 truncate">
                            {formatDate(record.lastActivityAt)}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-center p-4">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && records.length === 0 && (
            <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
              <FileSearch className="size-10 text-muted-foreground/40" />
              <p>No conversations found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RecordSidebar;
