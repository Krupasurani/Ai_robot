import type { IChatParticipant } from 'src/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SearchNotFound } from 'src/components/custom/search-not-found';

type Props = {
  query: string;
  results: IChatParticipant[];
  onClickResult: (contact: IChatParticipant) => void;
};

export function ChatNavSearchResults({ query, results, onClickResult }: Props) {
  const totalResults = results.length;

  const notFound = !totalResults && !!query;

  const renderNotFound = (
    <SearchNotFound query={query} className="p-3 mx-auto w-[calc(100%-40px)] bg-muted rounded-lg" />
  );

  const renderResults = (
    <nav>
      <ul className="space-y-0.5">
        {results.map((result) => (
          <li key={result.id} className="flex">
            <button
              type="button"
              onClick={() => onClickResult(result)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Avatar className="h-8 w-8">
                {result.avatarUrl && <AvatarImage src={result.avatarUrl} alt={result.name} />}
                <AvatarFallback className="text-xs">
                  {result.name?.charAt(0).toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{result.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      <h2 className="mb-2 px-2.5 text-sm font-semibold text-foreground">
        Contacts <span className="text-xs font-normal text-muted-foreground">({totalResults})</span>
      </h2>

      {notFound ? renderNotFound : renderResults}
    </>
  );
}
