import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';

type Props = {
  title: {
    text: string;
    highlight: boolean;
  }[];
  path: {
    text: string;
    highlight: boolean;
  }[];
  groupLabel: string;
  onClickItem: () => void;
};

export function ResultItem({ title, path, groupLabel, onClickItem }: Props) {
  return (
    <button
      type="button"
      onClick={onClickItem}
      className={cn(
        'w-full flex items-center justify-between px-4 py-3 text-left',
        'border border-transparent border-b-border border-dashed',
        'hover:rounded-md hover:border-primary hover:bg-primary/10',
        'transition-colors duration-200'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold capitalize mb-1">
          {title.map((part, index) => (
            <span key={index} className={cn(part.highlight ? 'text-primary' : 'text-foreground')}>
              {part.text}
            </span>
          ))}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {path.map((part, index) => (
            <span
              key={index}
              className={cn(part.highlight ? 'text-primary' : 'text-muted-foreground')}
            >
              {part.text}
            </span>
          ))}
        </div>
      </div>

      {groupLabel && (
        <Badge variant="secondary" className="ml-2 shrink-0">
          {groupLabel}
        </Badge>
      )}
    </button>
  );
}
