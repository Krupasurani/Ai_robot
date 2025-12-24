import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslate } from '@/locales';
import { FileUp, Info } from 'lucide-react';

interface FileUploadSectionProps {
  fileSizeInput: string;
  fileSizeError: string | null;
  maxMb: number;
  loading: boolean;
  onFileSizeChange: (value: string) => void;
  onFileSizeBlur: () => void;
}

export function FileUploadSection({
  fileSizeInput,
  fileSizeError,
  maxMb,
  loading,
  onFileSizeChange,
  onFileSizeBlur,
}: FileUploadSectionProps) {
  const { t } = useTranslate('settings');

  return (
    <div className="rounded-2xl border-0 bg-card shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:translate-y-[-1px]">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/40 px-6 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <FileUp className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{t('platform.file_upload.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('platform.file_upload.description')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-5">
          {/* Input Group */}
          <div className="space-y-2">
            <Label
              htmlFor="maxFileSize"
              className="text-sm font-medium text-foreground"
            >
              {t('platform.file_upload.max_size')}
            </Label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Input
                  id="maxFileSize"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="decimal"
                  value={fileSizeInput}
                  onChange={(e) => onFileSizeChange(e.target.value)}
                  onBlur={onFileSizeBlur}
                  aria-invalid={!!fileSizeError}
                  disabled={loading}
                  className={cn(
                    'pr-14 text-base font-medium transition-all duration-200',
                    'focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    fileSizeError && 'border-destructive focus:ring-destructive/20'
                  )}
                  placeholder="30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  MB
                </span>
              </div>
            </div>
            {fileSizeError ? (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <Info className="h-3.5 w-3.5" />
                {fileSizeError}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('platform.file_upload.current_limit')}:{' '}
                <span className="font-semibold text-foreground">{maxMb} MB</span>
              </p>
            )}
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-200/50 bg-blue-50/50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
              {t('platform.file_upload.info')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


