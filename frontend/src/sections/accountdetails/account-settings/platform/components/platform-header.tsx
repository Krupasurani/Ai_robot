import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/locales';
import { Settings2, Loader2, Check, AlertCircle } from 'lucide-react';

interface PlatformHeaderProps {
  hasChanges: boolean;
  saving: boolean;
  loading: boolean;
  error: string | null;
  onSave: () => void;
  onDismissError: () => void;
}

export function PlatformHeader({
  hasChanges,
  saving,
  loading,
  error,
  onSave,
  onDismissError,
}: PlatformHeaderProps) {
  const { t } = useTranslate('settings');

  return (
    <div className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex items-center justify-between py-5">
          {/* Left: Title and Description */}
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {t('platform.title')}
                </h1>
                <div className="relative h-6">
                  <Badge
                    variant="outline"
                    className={cn(
                      'absolute left-0 top-0 transition-all duration-300',
                      hasChanges && !saving
                        ? 'scale-100 opacity-100 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                        : 'scale-95 opacity-0 pointer-events-none'
                    )}
                  >
                    <AlertCircle className="mr-1.5 h-3 w-3" />
                    {t('platform.unsaved')}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'absolute left-0 top-0 transition-all duration-300',
                      !hasChanges && !loading
                        ? 'scale-100 opacity-100 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'scale-95 opacity-0 pointer-events-none'
                    )}
                  >
                    <Check className="mr-1.5 h-3 w-3" />
                    {t('platform.saved')}
                  </Badge>
                </div>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t('platform.description')}
              </p>
            </div>
          </div>

          {/* Right: Save Button */}
          <Button
            onClick={onSave}
            disabled={saving || loading || !hasChanges}
            className={cn(
              'min-w-[120px] gap-2 font-medium transition-all duration-200',
              hasChanges
                ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('auth.saving')}
              </>
            ) : (
              t('platform.save_changes')
            )}
          </Button>
        </div>

        {/* Error Banner */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-out',
            error ? 'max-h-20 pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0'
          )}
        >
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              className="text-sm font-medium text-destructive/70 transition-colors hover:text-destructive"
            >
              {t('platform.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


