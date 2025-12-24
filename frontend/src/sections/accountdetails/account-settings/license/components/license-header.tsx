import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/locales';
import { Check, AlertCircle, Clock, Settings } from 'lucide-react';

import type { SubscriptionStatus } from '../types';

interface LicenseHeaderProps {
  status: SubscriptionStatus;
  planName: string;
}

export function LicenseHeader({ status, planName }: LicenseHeaderProps) {
  const { t } = useTranslate('settings');

  const statusConfig: Record<
    SubscriptionStatus,
    { label: string; icon: React.ElementType; className: string }
  > = {
    active: {
      label: t('license.status.active'),
      icon: Check,
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    trial: {
      label: t('license.status.trial'),
      icon: Clock,
      className: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    canceled: {
      label: t('license.status.canceled'),
      icon: AlertCircle,
      className: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    },
    past_due: {
      label: t('license.status.past_due'),
      icon: AlertCircle,
      className: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex items-center justify-between py-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-roboto text-2xl font-medium tracking-tight text-foreground">
                {t('license.title')}
              </h1>
              <Badge variant="outline" className={cn('gap-1 font-roboto text-xs font-normal', config.className)}>
                <StatusIcon className="h-3 w-3" strokeWidth={2} />
                {config.label}
              </Badge>
            </div>
            <p className="font-roboto text-sm text-muted-foreground">
              {t('license.manage_subscription', { planName })}
            </p>
          </div>

          <Button variant="ghost" size="sm" className="gap-2 font-roboto text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" strokeWidth={1.5} />
            {t('license.settings')}
          </Button>
        </div>
      </div>
    </div>
  );
}


