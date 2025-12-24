import React from 'react';
import { cn } from '@/utils/cn';
import { useTranslate } from '@/locales/use-locales';

type ContextType = 'kb' | 'project' | 'record' | 'app' | 'user';

type SuggestionItem = {
  type: ContextType;
  id: string;
  label: string;
  secondary?: string;
};

interface MentionSuggestionsListProps {
  suggestions: {
    kbs: SuggestionItem[];
    projects: SuggestionItem[];
    records: SuggestionItem[];
    apps: SuggestionItem[];
    users: SuggestionItem[];
  };
  activeCategory: 'all' | 'kb' | 'project' | 'record' | 'app' | 'user';
  activeIndex: number;
  loadingSuggestions: boolean;
  onInsertMention: (suggestion: SuggestionItem) => void;
}

export const MentionSuggestionsList = React.memo<MentionSuggestionsListProps>(
  ({ suggestions, activeCategory, activeIndex, loadingSuggestions, onInsertMention }) => {
    const { t } = useTranslate('navbar');

    const all: SuggestionItem[] = [
      ...(suggestions.kbs || []),
      ...(suggestions.projects || []),
      ...(suggestions.records || []),
      ...(suggestions.apps || []),
      ...(suggestions.users || []),
    ];

    const visible = all.filter((s) => activeCategory === 'all' || s.type === activeCategory);

    if (loadingSuggestions) {
      return (
        <div className="text-xs text-muted-foreground px-2 py-1">{t('chatInput.loading')}</div>
      );
    }

    if (visible.length === 0) {
      return (
        <div className="text-xs text-muted-foreground px-2 py-1">{t('chatInput.noResults')}</div>
      );
    }

    return (
      <>
        {visible.map((s, idx) => (
          <button
            type="button"
            key={`${s.type}-${s.id}`}
            className={cn(
              'w-full text-left text-sm px-2 py-2 rounded-md border flex items-center gap-2',
              idx === activeIndex ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
            )}
            onClick={() => onInsertMention(s)}
          >
            <span className="text-xs uppercase opacity-70 w-14">{s.type}</span>
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </>
    );
  }
);

MentionSuggestionsList.displayName = 'MentionSuggestionsList';
