import type { NavSectionProps } from 'src/components/nav-section/nav-section';

import { useState, useCallback, useMemo } from 'react';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'src/routes/hooks';
import { isExternalLink } from 'src/routes/utils';
import { useBoolean } from 'src/hooks/use-boolean';
import { useEventListener } from 'src/hooks/use-event-listener';
import { SearchNotFound } from 'src/components/custom/search-not-found';

import { ResultItem } from './result-item';
import { groupItems, applyFilter, getAllItems } from './utils';

export type SearchbarProps = {
  data?: NavSectionProps['data'];
  className?: string;
};

export function Searchbar({ data: navItems = [], className }: SearchbarProps) {
  const router = useRouter();
  const search = useBoolean();

  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = useCallback(() => {
    search.onFalse();
    setSearchQuery('');
  }, [search]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'k' && event.metaKey) {
      search.onToggle();
      setSearchQuery('');
    }
  };

  useEventListener('keydown', handleKeyDown);

  const handleClick = useCallback(
    (path: string) => {
      if (isExternalLink(path)) {
        window.open(path);
      } else {
        router.push(path);
      }
      handleClose();
    },
    [handleClose, router]
  );

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const dataFiltered = applyFilter({
    inputData: getAllItems({ data: navItems }),
    query: searchQuery,
  });

  const notFound = searchQuery && !dataFiltered.length;
  const dataGroups = useMemo(() => groupItems(dataFiltered), [dataFiltered]);

  return (
    <>
      <div
        onClick={search.onTrue}
        className={cn(
          'flex items-center',
          'sm:pr-3 sm:rounded-lg sm:cursor-pointer sm:bg-muted/50',
          'hover:bg-muted/70 transition-colors',
          className
        )}
      >
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-5 w-5" />
        </Button>

        <Badge
          variant="secondary"
          className="hidden sm:inline-flex text-xs font-mono px-2 py-0.5 bg-background shadow-sm"
        >
          ⌘K
        </Badge>
      </div>

      <Dialog open={search.value} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-0 gap-0 top-[15%] translate-y-0">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-9 pr-16 h-12 text-base"
              />
              <Badge
                variant="secondary"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tracking-wider"
              >
                esc
              </Badge>
            </div>
          </div>

          {notFound ? (
            <div className="py-16 px-4">
              <SearchNotFound query={searchQuery} />
            </div>
          ) : (
            <ScrollArea className="px-4 pb-4 pt-2 h-[400px]">
              {Object.keys(dataGroups)
                .sort((a, b) => -b.localeCompare(a))
                .map((group, index) => (
                  <ul key={`${group}-${index}`} className="space-y-1">
                    {dataGroups[group].map((item) => {
                      const { title, path } = item;

                      const partsTitle = parse(title, match(title, searchQuery));

                      const partsPath = parse(path, match(path, searchQuery));

                      return (
                        <li key={`${title}${path}`} className="flex">
                          <ResultItem
                            path={partsPath}
                            title={partsTitle}
                            groupLabel={searchQuery && group}
                            onClickItem={() => handleClick(path)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                ))}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
