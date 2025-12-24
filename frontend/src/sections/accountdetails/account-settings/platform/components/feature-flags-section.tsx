import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTranslate } from '@/locales';
import { Flag, ChevronDown, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type FeatureFlagInfo = {
  key: string;
  label: string;
  description?: string;
  defaultEnabled?: boolean;
};

interface FeatureFlagsSectionProps {
  availableFlags: FeatureFlagInfo[];
  featureFlags: Record<string, boolean>;
  loading: boolean;
  onToggleFlag: (key: string, enabled: boolean) => void;
}

export function FeatureFlagsSection({
  availableFlags,
  featureFlags,
  loading,
  onToggleFlag,
}: FeatureFlagsSectionProps) {
  const { t } = useTranslate('settings');
  const [isExpanded, setIsExpanded] = useState(true);
  
  const activeFlags = availableFlags.filter((flag) => !!featureFlags[flag.key]).length;
  const featureFlagCount = availableFlags.length;

  return (
    <div className="rounded-2xl border-0 bg-card shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:translate-y-[-1px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('platform.feature_flags.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('platform.feature_flags.description')}
            </p>
          </div>
        </div>
        
        {featureFlagCount > 0 && (
          <Badge
            variant="secondary"
            className={cn(
              'px-3 py-1 text-xs font-semibold',
              activeFlags > 0
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {t('platform.feature_flags.active_count', { active: activeFlags, total: featureFlagCount })}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {featureFlagCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('platform.feature_flags.no_flags')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {t('platform.feature_flags.flags_appear')}
            </p>
          </div>
        ) : (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="space-y-2">
              {/* Show first 3 flags always */}
              {availableFlags.slice(0, 3).map((flag) => (
                <FeatureFlagItem
                  key={flag.key}
                  flag={flag}
                  isEnabled={!!featureFlags[flag.key]}
                  loading={loading}
                  onToggle={(enabled) => onToggleFlag(flag.key, enabled)}
                />
              ))}
              
              {/* Collapsible content for remaining flags */}
              {availableFlags.length > 3 && (
                <>
                  <CollapsibleContent className="space-y-2">
                    {availableFlags.slice(3).map((flag) => (
                      <FeatureFlagItem
                        key={flag.key}
                        flag={flag}
                        isEnabled={!!featureFlags[flag.key]}
                        loading={loading}
                        onToggle={(enabled) => onToggleFlag(flag.key, enabled)}
                      />
                    ))}
                  </CollapsibleContent>
                  
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/30 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                      {isExpanded
                        ? t('platform.feature_flags.show_less')
                        : t('platform.feature_flags.show_more', { count: availableFlags.length - 3 })}
                    </button>
                  </CollapsibleTrigger>
                </>
              )}
            </div>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

interface FeatureFlagItemProps {
  flag: FeatureFlagInfo;
  isEnabled: boolean;
  loading: boolean;
  onToggle: (enabled: boolean) => void;
}

function FeatureFlagItem({ flag, isEnabled, loading, onToggle }: FeatureFlagItemProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border px-4 py-3.5',
        'transition-all duration-300 ease-out',
        'hover:scale-[1.01] hover:shadow-sm',
        isEnabled
          ? 'border-violet-200 bg-violet-50/50 shadow-sm dark:border-violet-800/50 dark:bg-violet-950/30'
          : 'border-border/60 bg-background hover:border-border hover:bg-muted/30'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
            isEnabled
              ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Flag className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {flag.label || flag.key}
          </p>
          {flag.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="truncate text-xs text-muted-foreground cursor-help">
                  {flag.description}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{flag.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      
      <Switch
        checked={isEnabled}
        disabled={loading}
        onCheckedChange={onToggle}
        aria-label={`Toggle ${flag.label || flag.key}`}
        className="flex-shrink-0 ml-4"
      />
    </div>
  );
}


