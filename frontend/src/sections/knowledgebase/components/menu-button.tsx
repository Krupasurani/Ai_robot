import React, { memo, useState, useCallback } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/cn';

import type { KnowledgeBase } from '../types/kb';

export const MenuButton = memo<{
  kb: KnowledgeBase;
  onEdit: (kb: KnowledgeBase) => void;
  onDelete: (kb: KnowledgeBase) => void;
  className?: string;
}>(({ kb, onEdit, onDelete, className }) => {
  const [open, setOpen] = useState(false);

  const handleEdit = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onEdit(kb);
      setOpen(false);
    },
    [onEdit, kb]
  );

  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onDelete(kb);
      setOpen(false);
    },
    [onDelete, kb]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-7 rounded border border-border bg-transparent opacity-70 transition-all hover:opacity-100 hover:bg-muted hover:border-border',
            className
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          aria-label="More options"
        >
          <MoreVertical className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
          <Pencil className="mr-2 size-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="mr-2 size-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

MenuButton.displayName = 'MenuButton';
