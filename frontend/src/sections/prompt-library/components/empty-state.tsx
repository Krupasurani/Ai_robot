import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
      <Sparkles className="h-12 w-12 text-primary" />
      <div className="space-y-2">
        <p className="text-lg font-semibold">No prompts yet</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Save your go-to instructions once and reuse them across chats.
        </p>
      </div>
      <Button onClick={onCreate} size="sm">
        Create your first prompt
      </Button>
    </div>
  );
}
