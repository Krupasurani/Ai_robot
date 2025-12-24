import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslate } from '@/locales/use-locales';

interface FilterBadgesProps {
  selectedApps: string[];
  selectedKbIds: string[];
  appItems: Array<{ id: string; name: string; iconPath?: string }>;
  kbNameMap: Map<string, string>;
  onToggleApp: (id: string) => void;
  onToggleKb: (id: string) => void;
  onOpenResourcesMenu: (event: React.MouseEvent<HTMLElement>) => void;
}

export const FilterBadges = React.memo<FilterBadgesProps>(
  ({
    selectedApps,
    selectedKbIds,
    appItems,
    kbNameMap,
    onToggleApp,
    onToggleKb,
    onOpenResourcesMenu,
  }) => {
    const { t } = useTranslate('navbar');

    if (selectedApps.length === 0 && selectedKbIds.length === 0) {
      return null;
    }

    return (
      <div className="mb-2">
        <span className="block text-xs text-muted-foreground mb-1">{t('chatInput.filter')}</span>
        <div className="flex flex-wrap gap-1">
          {selectedApps.slice(0, 3).map((id) => {
            const app = appItems.find((a) => a.id === id);
            const label = app ? app.name : id;
            return (
              <Badge
                key={`app-${id}`}
                variant="secondary"
                className="h-5 px-2 text-xs font-medium cursor-pointer rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30"
              >
                <span className="mr-1">{label}</span>
                <button
                  type="button"
                  onClick={() => onToggleApp(id)}
                  className="ml-1 hover:opacity-70"
                  aria-label={`Remove ${label}`}
                >
                  ×
                </button>
              </Badge>
            );
          })}
          {selectedApps.length > 3 && (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-xs font-medium cursor-pointer rounded-full"
              onClick={(e) => onOpenResourcesMenu(e as React.MouseEvent<HTMLElement>)}
              asChild
            >
              <button type="button">{`+${selectedApps.length - 3} more`}</button>
            </Badge>
          )}
          {selectedKbIds.slice(0, 3).map((id) => {
            const label = kbNameMap.get(id) || id;
            return (
              <Badge
                key={`kb-${id}`}
                variant="outline"
                className="h-5 px-2 text-xs font-medium cursor-pointer rounded-full border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
              >
                <span className="mr-1">{label}</span>
                <button
                  type="button"
                  onClick={() => onToggleKb(id)}
                  className="ml-1 hover:opacity-70"
                  aria-label={`Remove ${label}`}
                >
                  ×
                </button>
              </Badge>
            );
          })}
          {selectedKbIds.length > 3 && (
            <Badge
              variant="outline"
              className="h-5 px-2 text-xs font-medium cursor-pointer rounded-full"
              onClick={(e) => onOpenResourcesMenu(e as React.MouseEvent<HTMLElement>)}
              asChild
            >
              <button type="button">{`+${selectedKbIds.length - 3} more`}</button>
            </Badge>
          )}
        </div>
      </div>
    );
  }
);

FilterBadges.displayName = 'FilterBadges';
