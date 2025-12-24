import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'src/routes/hooks';
import { toast } from 'sonner';
import { PromptLibraryApi, PromptTemplate } from '@/api/prompt-library';
import { useDebounce } from '@/hooks/use-debounce';

type PromptScope = 'all' | 'private' | 'workspace';
type ViewMode = 'grid' | 'list';

export interface PromptFiltersState {
  scope: PromptScope;
  category: string;
  tag: string;
  search: string;
  sort: 'updatedAt' | 'title';
}

const defaultFilters: PromptFiltersState = {
  scope: 'all',
  category: 'all',
  tag: 'all',
  search: '',
  sort: 'updatedAt',
};

export function usePromptLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<PromptFiltersState>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 350);

  const normalizedFilters = useMemo(
    () => ({
      visibility: filters.scope,
      category: filters.category !== 'all' ? filters.category : undefined,
      tag: filters.tag !== 'all' ? filters.tag : undefined,
      search: debouncedSearch || undefined,
      sortBy: filters.sort,
      sortOrder: (filters.sort === 'title' ? 'asc' : 'desc') as 'asc' | 'desc',
    }),
    [filters, debouncedSearch]
  );

  const fetchPrompts = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await PromptLibraryApi.list(normalizedFilters);
      setPrompts(data);
      if (data.length === 0) {
        setSelectedPrompt(null);
        return;
      }
      setSelectedPrompt((prev) => {
        if (!prev) return data[0];
        const stillExists = data.find((p) => p._id === prev._id);
        return stillExists || data[0];
      });
    } catch (error) {
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [normalizedFilters]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((prompt) => {
      if (prompt.category) set.add(prompt.category);
    });
    return Array.from(set).sort();
  }, [prompts]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((prompt) => {
      prompt.tags?.forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [prompts]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.scope !== 'all' ||
      filters.category !== 'all' ||
      filters.tag !== 'all' ||
      filters.search !== '' ||
      filters.sort !== 'updatedAt'
    );
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const updateFilters = useCallback((updates: Partial<PromptFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    prompts,
    setPrompts,
    selectedPrompt,
    setSelectedPrompt,
    viewMode,
    setViewMode,
    filters,
    updateFilters,
    resetFilters,
    isLoading,
    isRefreshing,
    categories,
    tags,
    hasActiveFilters,
    fetchPrompts,
    router,
    pathname,
    searchParams,
  };
}
