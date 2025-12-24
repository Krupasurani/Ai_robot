import type { Conversation } from 'src/types/chat-bot';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPlaceholderTitle } from '@/utils/conversation-titles';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/drop-down-menu';
import { X, Check, Pencil, Share2, Trash2, Archive, EllipsisVertical } from 'lucide-react';

interface ChatSidebarItemProps {
  chat: Conversation & { isShared: boolean };
  selectedId: string | null;
  isEditing: boolean;
  editTitle: string;
  isOwner: boolean;
  sidebarLanguage: string;
  onEditStart: (chat: Conversation) => void;
  onEditCancel: () => void;
  onEditSubmit: (e: React.FormEvent) => void;
  onEditTitleChange: (title: string) => void;
  onItemClick: (chat: Conversation) => void;
  onArchive: (chat: Conversation) => void;
  onDelete: (chat: Conversation) => void;
  onShare: (conversationId: string) => void;
}

const ChatSidebarItem = React.memo<ChatSidebarItemProps>(
  ({
    chat,
    selectedId,
    isEditing,
    editTitle,
    isOwner,
    sidebarLanguage,
    onEditStart,
    onEditCancel,
    onEditSubmit,
    onEditTitleChange,
    onItemClick,
    onArchive,
    onDelete,
    onShare,
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    const conversationLanguage = chat.titleLanguage || sidebarLanguage;
    const displayTitle =
      (chat.title && chat.title.trim()) || getPlaceholderTitle(conversationLanguage);

    const chatMenuItems = [
      {
        icon: Archive,
        label: 'Archive',
        onClick: () => onArchive(chat),
        show: isOwner,
      },
      {
        icon: Trash2,
        label: 'Delete',
        onClick: () => onDelete(chat),
        variant: 'destructive' as const,
        show: isOwner,
      },
      {
        icon: Share2,
        label: 'Share',
        onClick: () => onShare(chat._id),
        show: isOwner,
      },
    ].filter((item) => item.show);

    const isSelected = selectedId === chat._id;

    return (
      <div
        className={cn(
          'rounded-md mx-0.5 mb-0.5 transition-all duration-150 ease-in-out p-0 group/chat',
          isSelected
            ? 'bg-primary/10 dark:bg-primary/10'
            : isHovered
              ? 'bg-muted/50'
              : 'bg-transparent',
          chat.isShared && !isSelected
            ? 'border border-amber-300/40 dark:border-amber-500/40'
            : isSelected
              ? 'border border-primary/30 dark:border-primary/30'
              : 'border-none'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isEditing ? (
          <form onSubmit={onEditSubmit} className="flex items-center w-full">
            <Input
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              autoFocus
              placeholder="Enter conversation title"
              className="text-sm rounded-md bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:shadow-none"
            />
            <Button
              size="sm"
              className="rounded-md w-6 h-6 transition-colors duration-150 bg-primary hover:bg-primary/90 text-primary-foreground mx-0.5"
              onClick={onEditSubmit}
              disabled={!editTitle.trim()}
              type="submit"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-md w-6 h-6 transition-colors duration-150 mx-0.5"
              onClick={onEditCancel}
              disabled={!editTitle.trim()}
              type="button"
            >
              <X className="h-3 w-3" />
            </Button>
          </form>
        ) : (
          <div
            onClick={() => onItemClick(chat)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onItemClick(chat);
              }
            }}
            role="button"
            tabIndex={0}
            className="w-full p-2 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm leading-snug overflow-hidden text-ellipsis whitespace-nowrap pr-1.5 flex-1 font-normal text-foreground',
                    isSelected && 'font-medium'
                  )}
                  title={displayTitle}
                >
                  {displayTitle}
                </div>
                {isOwner && (
                  <button
                    type="button"
                    aria-label="Rename conversation"
                    className={cn(
                      'ml-1 text-muted-foreground transition-opacity duration-150 hover:text-foreground',
                      isHovered ? 'opacity-100' : 'opacity-0 group-hover/chat:opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStart(chat);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {chat.isShared && (
                  <Badge
                    variant="outline"
                    className="ml-2 h-5 px-2 text-xs font-medium border-amber-300/50 text-amber-700 bg-amber-50/80 dark:border-amber-700/50 dark:text-amber-300 dark:bg-amber-950/30"
                  >
                    Shared
                  </Badge>
                )}
              </div>
              <div>
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <EllipsisVertical
                        size={16}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="min-w-[8rem] rounded-md border border-border bg-card p-1 shadow-md z-50 text-foreground"
                      sideOffset={5}
                      align="end"
                    >
                      {chatMenuItems.map((item) => (
                        <DropdownMenuItem
                          key={item.label}
                          onClick={(e) => {
                            e.stopPropagation();
                            item.onClick();
                          }}
                          variant={item.variant}
                          className={cn(
                            'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                            item.variant === 'destructive' &&
                              'text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10'
                          )}
                        >
                          {item.icon
                            ? React.createElement(item.icon, { className: 'h-3.5 w-3.5' })
                            : null}
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ChatSidebarItem.displayName = 'ChatSidebarItem';

export default ChatSidebarItem;
