import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter, LayoutList, LayoutGrid, ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

interface KBToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  visibility: string;
  onVisibilityChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  owner: string;
  onOwnerChange: (value: string) => void;
  view: 'list' | 'grid';
  onViewChange?: (view: 'list' | 'grid') => void;
  className?: string;
}

export default function KBToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  visibility,
  onVisibilityChange,
  status,
  onStatusChange,
  owner,
  onOwnerChange,
  view,
  onViewChange,
  className,
}: KBToolbarProps) {
  return (
    <div
      className={cn('w-full rounded-xl border border-border bg-background p-3 sm:p-4', className)}
      role="region"
      aria-label="Knowledge base filters and view options"
    >
      <div className="flex flex-col gap-3">
        {/* First Row: Search */}
        <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative">
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search knowledge bases..."
              aria-label="Search knowledge bases"
              className="h-9 min-w-3xs w-full pl-9"
            />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Visibility */}
          <Select value={visibility} onValueChange={onVisibilityChange}>
            <SelectTrigger className="h-9" aria-label="Filter by visibility">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="indexed">Indexed</SelectItem>
              <SelectItem value="syncing">Syncing</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          {/* Owner */}
          <Select value={owner} onValueChange={onOwnerChange}>
            <SelectTrigger className="h-9" aria-label="Filter by owner">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              <SelectItem value="me">Owned by me</SelectItem>
              <SelectItem value="others">Owned by others</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className="h-9" aria-label="Sort by">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>

          {/* Actions: Sort Direction + View Toggle */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="shrink-0" aria-label="Sort direction">
              <ArrowUpDown className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={view === 'list' ? 'default' : 'outline'}
                size="icon"
                aria-label="List view"
                onClick={() => onViewChange?.('list')}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant={view === 'grid' ? 'default' : 'outline'}
                size="icon"
                aria-label="Grid view"
                onClick={() => onViewChange?.('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
