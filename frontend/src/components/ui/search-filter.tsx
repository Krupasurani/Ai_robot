import * as React from 'react';
import { Search, X, Calendar, User, FileText, Filter } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from './input';
import { Button } from './button';
import { Badge } from './badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './drop-down-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export interface SearchFilters {
  lastUpdated?: string;
  from?: string;
  type?: string;
}

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  filters?: SearchFilters;
  onFilterChange?: (filters: SearchFilters) => void;
  placeholder?: string;
  className?: string;
}

export function SearchFilter({
  value,
  onChange,
  onSearch,
  filters = {},
  onFilterChange,
  placeholder = 'Search...',
  className,
}: SearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, filterValue: string) => {
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        [key]: filterValue === 'all' ? undefined : filterValue,
      });
    }
  };

  const clearFilter = (key: keyof SearchFilters) => {
    if (onFilterChange) {
      const newFilters = { ...filters };
      delete newFilters[key];
      onFilterChange(newFilters);
    }
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-4 h-10 rounded-lg bg-input border-border shadow-sm"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter Button */}
      <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="default"
            className={cn(
              'h-10 rounded-lg border-border shadow-sm',
              activeFiltersCount > 0 && 'bg-primary/10 border-primary/20'
            )}
          >
            <Filter className="size-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-lg shadow-md">
          <DropdownMenuLabel>Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Last Updated Filter */}
          <div className="px-2 py-1.5">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="size-3" />
              Last updated
            </label>
            <Select
              value={filters.lastUpdated || 'all'}
              onValueChange={(val) => handleFilterChange('lastUpdated', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
            {filters.lastUpdated && filters.lastUpdated !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 mt-1 text-xs"
                onClick={() => clearFilter('lastUpdated')}
              >
                Clear
              </Button>
            )}
          </div>

          <DropdownMenuSeparator />

          {/* From Filter */}
          <div className="px-2 py-1.5">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <User className="size-3" />
              From
            </label>
            <Select
              value={filters.from || 'all'}
              onValueChange={(val) => handleFilterChange('from', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="me">Me</SelectItem>
                <SelectItem value="team">My team</SelectItem>
              </SelectContent>
            </Select>
            {filters.from && filters.from !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 mt-1 text-xs"
                onClick={() => clearFilter('from')}
              >
                Clear
              </Button>
            )}
          </div>

          <DropdownMenuSeparator />

          {/* Type Filter */}
          <div className="px-2 py-1.5">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <FileText className="size-3" />
              Type
            </label>
            <Select
              value={filters.type || 'all'}
              onValueChange={(val) => handleFilterChange('type', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
            {filters.type && filters.type !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 mt-1 text-xs"
                onClick={() => clearFilter('type')}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Clear All Filters */}
          {activeFiltersCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onFilterChange?.({})}
                className="text-destructive focus:text-destructive"
              >
                Clear all filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filter Badges */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.lastUpdated && filters.lastUpdated !== 'all' && (
            <Badge variant="secondary" className="gap-1.5">
              <Calendar className="size-3" />
              {filters.lastUpdated}
              <button
                onClick={() => clearFilter('lastUpdated')}
                className="ml-1 hover:bg-secondary/80 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.from && filters.from !== 'all' && (
            <Badge variant="secondary" className="gap-1.5">
              <User className="size-3" />
              {filters.from}
              <button
                onClick={() => clearFilter('from')}
                className="ml-1 hover:bg-secondary/80 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.type && filters.type !== 'all' && (
            <Badge variant="secondary" className="gap-1.5">
              <FileText className="size-3" />
              {filters.type}
              <button
                onClick={() => clearFilter('type')}
                className="ml-1 hover:bg-secondary/80 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

