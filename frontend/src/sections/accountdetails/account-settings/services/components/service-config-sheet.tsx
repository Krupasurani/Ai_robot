import { useState, useEffect } from 'react';
import { Globe, Link2, Loader2, Info, ExternalLink, CheckCircle2, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useTranslate } from '@/locales';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

import {
  getFrontendPublicUrl,
  getConnectorPublicUrl,
  updateFrontendPublicUrl,
  updateConnectorPublicUrl,
} from '../utils/services-configuration-service';

interface ServiceConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string | null;
  onSave: () => void;
}

export default function ServiceConfigSheet({
  open,
  onOpenChange,
  serviceId,
  onSave,
}: ServiceConfigSheetProps) {
  const { t } = useTranslate('settings');
  const [url, setUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  // Service configurations
  const SERVICE_CONFIG = {
    frontendPublicUrl: {
      icon: Globe,
      title: t('services.internal.frontendPublicUrl.title'),
      description: t('services.internal.frontendPublicUrl.description'),
      color: '#3B82F6',
      placeholder: 'https://app.example.com',
      helpText: t('services.internal.frontendPublicUrl.help'),
    },
    connectorPublicUrl: {
      icon: Link2,
      title: t('services.internal.connectorPublicUrl.title'),
      description: t('services.internal.connectorPublicUrl.description'),
      color: '#8B5CF6',
      placeholder: 'https://connectors.example.com',
      helpText: t('services.internal.connectorPublicUrl.help'),
    },
  };

  const config = serviceId ? SERVICE_CONFIG[serviceId as keyof typeof SERVICE_CONFIG] : null;
  const Icon = config?.icon;

  // Fetch current URL when sheet opens
  useEffect(() => {
    if (open && serviceId) {
      const fetchUrl = async () => {
        setIsLoading(true);
        setError(null);
        try {
          let response;
          if (serviceId === 'frontendPublicUrl') {
            response = await getFrontendPublicUrl();
          } else if (serviceId === 'connectorPublicUrl') {
            response = await getConnectorPublicUrl();
          }
          const currentUrl = response?.url || '';
          setUrl(currentUrl);
          setOriginalUrl(currentUrl);
        } catch (err) {
          console.error('Failed to fetch URL:', err);
          setError(t('services.sheet.failed_load'));
        } finally {
          setIsLoading(false);
        }
      };
      fetchUrl();
    }
  }, [open, serviceId, t]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setUrl('');
      setOriginalUrl('');
      setError(null);
      setIsValid(false);
    }
  }, [open]);

  // Validate URL
  useEffect(() => {
    if (!url.trim()) {
      setIsValid(false);
      setError(null);
      return;
    }

    try {
      const urlObj = new URL(url);
      const hasValidProtocol = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      // Allow saving even if URL hasn't changed (user might want to confirm)
      setIsValid(hasValidProtocol);
      setError(null);
    } catch {
      setIsValid(false);
      if (url.trim()) {
        setError(t('services.sheet.invalid_url'));
      }
    }
  }, [url, t]);

  // Handle save
  const handleSave = async () => {
    if (!isValid || !serviceId) return;

    setIsSaving(true);
    setError(null);

    try {
      if (serviceId === 'frontendPublicUrl') {
        await updateFrontendPublicUrl(url);
      } else if (serviceId === 'connectorPublicUrl') {
        await updateConnectorPublicUrl(url);
      }
      toast.success(t('services.messages.config_saved'));
      setOriginalUrl(url); // Update original URL after successful save
      onSave();
    } catch (err) {
      console.error('Failed to save URL:', err);
      setError(t('services.sheet.failed_save_retry'));
      toast.error(t('services.sheet.failed_save_retry'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!config || !Icon) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] w-full flex flex-col p-0 gap-0">
        <SheetHeader className="px-8 pt-10 pb-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4 mb-2">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-sm"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <Icon className="h-6 w-6" style={{ color: config.color }} />
            </div>
            <div>
              <SheetTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {config.title}
              </SheetTitle>
              <SheetDescription className="text-slate-500 dark:text-slate-400">
                {t('services.sheet.configure_endpoint')}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              {t('services.sheet.overview')}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">{config.description}</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-xs text-slate-400 font-medium">{t('services.sheet.fetching_config')}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* URL Input */}
              <div className="space-y-3">
                <Label htmlFor="url" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('services.sheet.public_endpoint_url')}
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={config.placeholder}
                    className={cn(
                      'pl-10 h-11 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500',
                      error && 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
                    )}
                  />
                  {url && !error && isValid && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  )}
                </div>
                {error ? (
                  <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1.5 ml-1">
                    <ShieldCheck className="h-3 w-3" />
                    {error}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 font-medium ml-1">{config.helpText}</p>
                )}
              </div>

              {/* Current Configuration */}
              {originalUrl && (
                <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t('services.sheet.active_url')}
                  </p>
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    {originalUrl}
                  </p>
                </div>
              )}

              {/* Security & Best Practices */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  {t('services.sheet.recommendations')}
                </h3>
                <div className="grid gap-3">
                  {(t('services.sheet.tips', { returnObjects: true }) as string[]).map((tip: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="p-8 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              {t('services.sheet.discard_changes')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || isSaving}
              className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 transition-all shadow-md"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.saving')}
                </>
              ) : (
                t('services.sheet.apply_changes')
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

