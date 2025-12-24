import { cn } from '@/utils/cn';

type SearchNotFoundProps = {
  query?: string;
  className?: string;
};

export function SearchNotFound({ query, className }: SearchNotFoundProps) {
  if (!query) {
    return <p className={cn('text-sm text-muted-foreground', className)}>Please enter keywords</p>;
  }

  return (
    <div className={cn('text-center rounded-lg', className)}>
      <h3 className="mb-2 text-lg font-semibold">Not found</h3>

      <p className="text-sm text-muted-foreground">
        No results found for &nbsp;
        <strong className="text-foreground">{`"${query}"`}</strong>
        .
        <br /> Try checking for typos or using complete words.
      </p>
    </div>
  );
}

