import { memo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EmptyState = memo<{
  isSearchResult?: boolean;
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreateKB?: () => void;
  loading?: boolean;
}>(({ isSearchResult = false, searchQuery = '', onClearSearch, onCreateKB, loading = false }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
        <Search className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">No knowledge bases found</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {isSearchResult
          ? `No results found for "${searchQuery}". Try adjusting your search terms.`
          : 'Create your first knowledge base to get started organizing your information.'}
      </p>
      {isSearchResult && onClearSearch && (
        <Button variant="outline" onClick={onClearSearch} className="rounded-sm">
          Clear search
        </Button>
      )}
      {!isSearchResult && !loading && onCreateKB && (
        <Button variant="outline" onClick={onCreateKB} className="rounded-sm gap-2">
          <Plus className="h-4 w-4" />
          Create Knowledge Base
        </Button>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
