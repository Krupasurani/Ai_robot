import type { Conversation } from 'src/types/chat-bot';

import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Archive, Loader2, ArchiveX, ArchiveRestore } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';

import axiosInstance from 'src/utils/axios';

type ArchivedChatsDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelectChat: (chat: Conversation) => Promise<void>;
  onUnarchive: () => void;
};

const formatDistanceToNow = (date: string): string => {
  const now = new Date();
  const pastDate = new Date(date);
  const diff = now.getTime() - pastDate.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

function getLastMessage(chat: Conversation) {
  if (!chat?.messages || chat.messages.length === 0) return null;
  return chat.messages[chat.messages.length - 1];
}

function buildPreviewText(chat: Conversation): string {
  const last = getLastMessage(chat);
  if (!last) return 'No messages';

  const content = typeof last.content === 'string' ? last.content : '';
  const isImageMessage =
    last.messageType?.toLowerCase?.() === 'image' ||
    last.contentFormat?.toLowerCase?.().includes('image') ||
    /!\[[^\]]*\]\([^)]*\)/.test(content) ||
    /data:image\//.test(content);

  if (isImageMessage) {
    return '[generated image]';
  }

  // Strip newlines and excessive spaces to keep it compact
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
    <span className="grid place-items-center rounded-full border size-16 bg-muted/40 dark:bg-card/50">
      <ArchiveX className="size-7 text-foreground/70" />
    </span>
    <div>
      <h2 className="text-xl font-semibold">No Archived Conversations</h2>
      <p className="text-sm text-muted-foreground mt-1">Archived conversations will appear here.</p>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="px-2 py-4 space-y-4">
    {[...Array(4)].map((_, i) => (
      <div className="space-y-3" key={i}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/5 rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <Separator />
      </div>
    ))}
  </div>
);

const ArchivedChatsDialog = ({
  open,
  onClose,
  onSelectChat,
  onUnarchive,
}: ArchivedChatsDialogProps) => {
  const [archivedChats, setArchivedChats] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUnarchiving, setIsUnarchiving] = useState<boolean>(false);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchArchivedChats();
    }
  }, [open]);

  const fetchArchivedChats = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/api/v1/conversations/show/archives', {
        params: {
          conversationSource: 'sales',
        },
      });
      setArchivedChats(response.data.conversations || []);
    } catch (error) {
      // Error handling commented out as per original code
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchive = async (chatId: string) => {
    setIsUnarchiving(true);
    setUnarchivingId(chatId);
    try {
      await axiosInstance.patch(`/api/v1/conversations/${chatId}/unarchive`);
      setArchivedChats((prev) => prev.filter((chat) => chat._id !== chatId));
      onUnarchive?.();
      toast.success('Conversation unarchived successfully');
    } catch (error) {
      // toast.error('Failed to unarchive conversation');
    } finally {
      setIsUnarchiving(false);
      setUnarchivingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isUnarchiving) onClose();
      }}
    >
      <DialogContent className="max-w-2xl sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Archive className="size-4" />
            Archived Conversations
            {archivedChats.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {archivedChats.length}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Browse and restore archived chats.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <ScrollArea className="max-h-[65vh]">
          {isLoading ? (
            <LoadingSkeleton />
          ) : archivedChats.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="p-4">
              {archivedChats.map((chat) => {
                const previewText = buildPreviewText(chat);
                const isCurrentRowLoading = isUnarchiving && unarchivingId === chat._id;
                return (
                  <div
                    key={chat._id}
                    className="group relative mb-2 flex items-start justify-between gap-3 rounded-xl border bg-card/50 p-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">
                        {typeof chat.title === 'string' ? chat.title : 'Untitled Conversation'}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground break-words">
                        {previewText}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <Badge variant="outline" className="rounded-md text-[10px] px-2 py-0.5">
                        {formatDistanceToNow(chat.createdAt)}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnarchive(chat._id);
                            }}
                            disabled={isUnarchiving}
                            aria-label="Unarchive conversation"
                          >
                            {isCurrentRowLoading ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <ArchiveRestore className="size-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Unarchive</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ArchivedChatsDialog;
