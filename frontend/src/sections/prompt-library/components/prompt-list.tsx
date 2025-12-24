import { Badge } from '@/components/ui/badge';
import { PromptTemplate } from '@/api/prompt-library';
import { cn } from '@/utils/cn';

type ViewMode = 'grid' | 'list';

interface PromptListProps {
  prompts: PromptTemplate[];
  selectedPromptId?: string;
  onSelect: (prompt: PromptTemplate) => void;
  viewMode: ViewMode;
}

export function PromptList({ prompts, selectedPromptId, onSelect, viewMode }: PromptListProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {prompts.map((prompt) => {
          const isSelected = selectedPromptId === prompt._id;
          return (
            <button
              key={prompt._id}
              onClick={() => onSelect(prompt)}
              className={cn(
                'group relative rounded-lg border p-4 text-left transition-all hover:border-primary/50',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:bg-muted/30'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="line-clamp-2 flex-1 text-sm font-semibold group-hover:text-primary">
                  {prompt.title || 'Untitled prompt'}
                </h3>
                <Badge
                  variant={prompt.visibility === 'workspace' ? 'secondary' : 'outline'}
                  className="shrink-0 text-xs"
                >
                  {prompt.visibility === 'workspace' ? 'Shared' : 'Private'}
                </Badge>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground mb-3">
                {prompt.description || 'No description'}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {prompt.category && (
                  <Badge variant="outline" className="text-xs">
                    {prompt.category}
                  </Badge>
                )}
                {(prompt.tags || []).slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {(prompt.tags || []).length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{(prompt.tags || []).length - 2}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => {
        const isSelected = selectedPromptId === prompt._id;
        return (
          <button
            key={prompt._id}
            onClick={() => onSelect(prompt)}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:bg-muted/50'
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="line-clamp-1 text-sm font-medium flex-1">
                {prompt.title || 'Untitled prompt'}
              </h3>
              <Badge
                variant={prompt.visibility === 'workspace' ? 'secondary' : 'outline'}
                className="shrink-0 text-xs"
              >
                {prompt.visibility === 'workspace' ? 'Shared' : 'Private'}
              </Badge>
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground mb-2">
              {prompt.description || 'No description'}
            </p>
            {prompt.category && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{prompt.category}</span>
                {(prompt.tags || []).length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">�</span>
                    <div className="flex gap-1">
                      {(prompt.tags || []).slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
