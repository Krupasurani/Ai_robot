import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { PromptTemplate } from '@/api/prompt-library';
import { useTranslate } from '@/locales/use-locales';

interface PromptPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptQuickList: PromptTemplate[];
  promptSearch: string;
  promptLoading: boolean;
  onSearchChange: (value: string) => void;
  onPromptInsert: (content: string) => void;
}

const PromptPickerSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="space-y-2 rounded-2xl border border-dashed border-muted-foreground/40 p-3"
      >
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

export const PromptPickerSheet = React.memo<PromptPickerSheetProps>(
  ({
    open,
    onOpenChange,
    promptQuickList,
    promptSearch,
    promptLoading,
    onSearchChange,
    onPromptInsert,
  }) => {
    const { t } = useTranslate('navbar');

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('chatInput.promptLibrary')}</SheetTitle>
            <SheetDescription>{t('chatInput.browseSavedPrompts')}</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col gap-3 px-4 pb-4">
            <Input
              value={promptSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t('chatInput.searchPrompts')}
              className="rounded-2xl"
            />
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {promptLoading ? (
                <PromptPickerSkeleton />
              ) : promptQuickList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {promptSearch ? t('chatInput.noResults') : t('chatInput.noPromptsAvailable')}
                </p>
              ) : (
                promptQuickList.map((prompt) => (
                  <div
                    key={prompt._id}
                    className="rounded-2xl border border-muted-foreground/20 bg-background p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold leading-tight">
                          {prompt.title || 'Untitled prompt'}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {prompt.description || 'No description provided yet.'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => onPromptInsert(prompt.content || '')}
                      >
                        {t('chatInput.usePrompt')}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                      {prompt.content}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {prompt.visibility === 'workspace' ? 'Shared' : 'Private'}
                      </span>
                      {(prompt.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                onOpenChange(false);
                window.open('/prompt-library', '_blank');
              }}
            >
              {t('chatInput.openFullPromptLibrary')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

PromptPickerSheet.displayName = 'PromptPickerSheet';
