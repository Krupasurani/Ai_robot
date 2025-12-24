import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/locales';
import { Separator } from '@/components/ui/separator';
import { ArrowUpRight } from 'lucide-react';

import type { LicenseOverview, PlanTier } from '../types';

interface PlanOverviewCardProps {
  license: LicenseOverview;
}

export function PlanOverviewCard({ license }: PlanOverviewCardProps) {
  const { t, currentLang } = useTranslate('settings');

  const tierConfig: Record<PlanTier, { label: string; className: string }> = {
    starter: {
      label: t('license.tiers.starter'),
      className: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    },
    pro: {
      label: t('license.tiers.pro'),
      className: 'border-primary/30 bg-primary/10 text-primary',
    },
    enterprise: {
      label: t('license.tiers.enterprise'),
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  };

  const tierBadge = tierConfig[license.planTier];

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currentLang.value, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(currentLang.value, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const monthlyTotal = license.pricePerSeat * license.seatsUsed;

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-roboto text-lg font-medium text-foreground">{license.planName}</h2>
            <Badge variant="outline" className={cn('font-roboto text-xs font-normal', tierBadge.className)}>
              {tierBadge.label}
            </Badge>
          </div>
          <p className="font-roboto text-sm text-muted-foreground">
            {t('license.plan.current_plan')}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 font-roboto text-primary hover:text-primary">
          {t('license.plan.upgrade_plan')}
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Button>
      </div>

      <Separator className="bg-border/50" />

      {/* Plan Details */}
      <div className="grid gap-8 sm:grid-cols-4">
        <div className="space-y-1">
          <p className="font-roboto text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('license.plan.price_per_seat')}
          </p>
          <p className="font-roboto text-xl font-medium text-foreground">
            {formatCurrency(license.pricePerSeat, license.currency)}
            <span className="text-sm font-normal text-muted-foreground">{t('license.plan.per_month')}</span>
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-roboto text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('license.plan.billing')}
          </p>
          <p className="font-roboto text-base text-foreground">
            {license.billingCycle === 'yearly' ? t('license.plan.annual') : t('license.plan.monthly')}
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-roboto text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('license.plan.next_invoice')}
          </p>
          <p className="font-roboto text-base text-foreground">
            {formatDate(license.nextBillingDate)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-roboto text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('license.plan.monthly_total')}
          </p>
          <p className="font-roboto text-xl font-medium text-foreground">
            {formatCurrency(monthlyTotal, license.currency)}
          </p>
        </div>
      </div>
    </div>
  );
}


