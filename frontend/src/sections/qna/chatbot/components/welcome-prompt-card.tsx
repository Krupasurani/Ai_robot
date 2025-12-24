import { cn } from '@/utils/cn';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import type { PromptTemplate } from '@/api/prompt-library';

export interface PromptCardProps {
  prompt: PromptTemplate;
  onSelect: (prompt: PromptTemplate) => void;
  createdBy?: string;
  usageCount?: number;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  onSelect,
  createdBy,
  usageCount,
}) => {
  const isAdvanced = prompt.tags?.some((tag) => tag.toUpperCase() === 'ADVANCED');

  return (
    <Card
      className={cn(
        'group cursor-pointer rounded-3xl border border-transparent bg-muted/50 p-5 shadow-none',
        'transition-all duration-200 hover:border-primary/50 hover:bg-muted',
        'flex flex-col gap-3 h-full'
      )}
      onClick={() => onSelect(prompt)}
    >
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-1.5">
              {prompt.title || 'Untitled prompt'}
            </h3>
            {isAdvanced && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium text-muted-foreground border-border rounded-md px-2 py-0.5 inline-block shadow-none"
              >
                ADVANCED
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {prompt.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {prompt.description}
          </p>
        )}
      </div>

      {/* Footer with creator and usage */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
        {createdBy ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border/40 flex-shrink-0">
              <span className="text-[10px] font-medium text-foreground">
                {createdBy.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="truncate">{createdBy}</span>
          </>
        ) : (
          <span className="text-muted-foreground/60">Former teammate</span>
        )}
        {usageCount !== undefined && (
          <>
            <span className="text-muted-foreground/40">�</span>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>{usageCount.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};


