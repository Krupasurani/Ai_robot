import { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/locales';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import * as Progress from '@radix-ui/react-progress';
import { Plus, Minus, AlertTriangle } from 'lucide-react';

import type { LicenseOverview } from '../types';

interface LicenseUsageCardProps {
  license: LicenseOverview;
  onUpdateSeats?: (newTotal: number) => void;
}

export function LicenseUsageCard({ license, onUpdateSeats }: LicenseUsageCardProps) {
  const { t } = useTranslate('settings');
  const [seatsInput, setSeatsInput] = useState<number>(license.seatsTotal);
  const [isUpdating, setIsUpdating] = useState(false);

  const utilization = useMemo(() => {
    if (license.seatsTotal === 0) return 0;
    return Math.round((license.seatsUsed / license.seatsTotal) * 100);
  }, [license.seatsUsed, license.seatsTotal]);

  const seatsAvailable = license.seatsTotal - license.seatsUsed;
  const isHighUtilization = utilization >= 80;
  const isCriticalUtilization = utilization >= 95;

  const getProgressColor = () => {
    if (isCriticalUtilization) return 'bg-red-500';
    if (isHighUtilization) return 'bg-amber-500';
    return 'bg-primary';
  };

  const handleUpdateSeats = async () => {
    if (seatsInput < license.seatsUsed || seatsInput === license.seatsTotal) return;

    setIsUpdating(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    onUpdateSeats?.(seatsInput);
    setIsUpdating(false);
  };

  const adjustSeats = (delta: number) => {
    const newValue = seatsInput + delta;
    if (newValue >= license.seatsUsed && newValue <= 1000) {
      setSeatsInput(newValue);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="font-roboto text-lg font-medium text-foreground">{t('license.usage.seats')}</h2>
          <p className="font-roboto text-sm text-muted-foreground">
            {t('license.usage.seats_desc')}
          </p>
        </div>
        {isHighUtilization && (
          <div className={cn(
            'flex items-center gap-1.5 font-roboto text-xs',
            isCriticalUtilization ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
          )}>
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
            {isCriticalUtilization ? t('license.usage.almost_full') : t('license.usage.high_usage')}
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-roboto text-3xl font-medium text-foreground">{license.seatsUsed}</span>
            <span className="font-roboto text-lg text-muted-foreground">/ {license.seatsTotal}</span>
          </div>
          <span className="font-roboto text-sm text-muted-foreground">
            {t('license.usage.used_percentage', { count: utilization })}
          </span>
        </div>

        {/* Radix Progress */}
        <Progress.Root
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted"
          value={utilization}
        >
          <Progress.Indicator
            className={cn('h-full transition-all duration-500 ease-out', getProgressColor())}
            style={{ width: `${utilization}%` }}
          />
        </Progress.Root>

        {/* Quick Stats */}
        <div className="flex gap-6 font-roboto text-sm">
          <div>
            <span className="text-muted-foreground">{t('license.usage.active')}: </span>
            <span className="font-medium text-foreground">{license.seatsUsed}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('license.usage.available')}: </span>
            <span className="font-medium text-foreground">{seatsAvailable}</span>
          </div>
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Seat Management */}
      <div className="space-y-3">
        <p className="font-roboto text-sm font-medium text-foreground">{t('license.usage.adjust_seats')}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-r-none border-r-0"
              onClick={() => adjustSeats(-1)}
              disabled={seatsInput <= license.seatsUsed}
            >
              <Minus className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Input
              type="number"
              min={license.seatsUsed}
              max={1000}
              value={seatsInput}
              onChange={(e) => setSeatsInput(Number(e.target.value) || license.seatsUsed)}
              className="h-9 w-16 rounded-none border-x-0 text-center font-roboto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-l-none border-l-0"
              onClick={() => adjustSeats(1)}
              disabled={seatsInput >= 1000}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
          <Button
            onClick={handleUpdateSeats}
            disabled={isUpdating || seatsInput === license.seatsTotal || seatsInput < license.seatsUsed}
            className="font-roboto"
            size="sm"
          >
            {isUpdating ? t('license.usage.updating') : t('license.usage.update')}
          </Button>
        </div>
        {seatsInput < license.seatsUsed && (
          <p className="font-roboto text-xs text-destructive">
            {t('license.usage.min_seats_required', { count: license.seatsUsed })}
          </p>
        )}
      </div>
    </div>
  );
}


