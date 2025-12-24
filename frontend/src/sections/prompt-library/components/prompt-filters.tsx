import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, XCircle } from 'lucide-react';
import { PromptFiltersState } from '../hooks/use-prompt-library';

type PromptScope = 'all' | 'private' | 'workspace';

interface PromptFiltersProps {
  filters: PromptFiltersState;
  categories: string[];
  tags: string[];
  hasActiveFilters: boolean;
  onFiltersChange: (updates: Partial<PromptFiltersState>) => void;
  onResetFilters: () => void;
}

export function PromptFilters({
  filters,
  categories,
  tags,
  hasActiveFilters,
  onFiltersChange,
  onResetFilters,
}: PromptFiltersProps) {
  return (
    <div className="border-t border-border bg-muted/30 px-3 py-2 sm:px-4 md:px-6">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {/* Search - Compact */}
        <div className="relative shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="h-7 pl-7 pr-6 text-xs sm:text-sm"
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: '' })}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-0.5 hover:bg-muted"
            >
              <XCircle className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Scope Tabs - Compact */}
        <Tabs
          value={filters.scope}
          onValueChange={(value) => onFiltersChange({ scope: value as PromptScope })}
          className="shrink-0"
        >
          <TabsList className="h-7">
            <TabsTrigger value="all" className="px-2 text-[11px] sm:text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="private" className="px-2 text-[11px] sm:text-xs">
              Private
            </TabsTrigger>
            <TabsTrigger value="workspace" className="px-2 text-[11px] sm:text-xs">
              Shared
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category - Compact */}
        <Select
          value={filters.category}
          onValueChange={(value) => onFiltersChange({ category: value })}
        >
          <SelectTrigger className="h-7 w-[110px] text-[11px] sm:h-8 sm:w-[130px] sm:text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tag - Compact */}
        <Select value={filters.tag} onValueChange={(value) => onFiltersChange({ tag: value })}>
          <SelectTrigger className="h-7 w-[90px] text-[11px] sm:h-8 sm:w-[110px] sm:text-xs">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort - Compact */}
        <Select
          value={filters.sort}
          onValueChange={(value) => onFiltersChange({ sort: value as PromptFiltersState['sort'] })}
        >
          <SelectTrigger className="h-7 w-[110px] text-[11px] sm:h-8 sm:w-[130px] sm:text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Recently updated</SelectItem>
            <SelectItem value="title">A ? Z</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset Button - Compact */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-1.5 text-[11px] sm:h-8 sm:px-2 sm:text-xs"
            onClick={onResetFilters}
          >
            <XCircle className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
