import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

import type { WalktourTooltipProps } from './types';

export function WalktourTooltip({
  size,
  step,
  index,
  backProps,
  skipProps,
  continuous,
  closeProps,
  isLastStep,
  primaryProps,
  tooltipProps,
}: WalktourTooltipProps) {
  const {
    title,
    content,
    slotProps,
    hideFooter,
    showProgress,
    showSkipButton,
    hideBackButton,
    hideCloseButton,
  } = step;

  const progress = ((index + 1) / size) * 100;

  return (
    <div
      {...tooltipProps}
      className={cn('w-[360px] rounded-lg bg-background shadow-lg', slotProps?.root?.className)}
      style={slotProps?.root?.style}
    >
      <div className="px-6 pt-6 relative">
        {title && (
          <h6
            className={cn('text-lg font-semibold text-foreground', slotProps?.title?.className)}
            style={slotProps?.title?.style}
          >
            {title}
          </h6>
        )}

        {!hideCloseButton && !isLastStep && (
          <button
            {...closeProps}
            type="button"
            className={cn(
              'absolute top-2.5 right-2.5 p-1 rounded-md border border-border/12 hover:bg-muted transition-colors',
              slotProps?.closeBtn?.className
            )}
            style={slotProps?.closeBtn?.style}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {content && (
        <div
          className={cn('px-6 pt-4 pb-8', slotProps?.content?.className)}
          style={slotProps?.content?.style}
        >
          {content}
        </div>
      )}

      {showProgress && (
        <Progress
          value={progress}
          className={cn('h-0.5 rounded-none bg-muted/20', slotProps?.progress?.className)}
          style={slotProps?.progress?.style}
        />
      )}

      {!hideFooter && (
        <div className="p-5 flex items-center justify-end gap-3 border-t border-border">
          {showSkipButton && index > 0 && !isLastStep && (
            <Button
              {...skipProps}
              variant="ghost"
              className={cn('text-muted-foreground', slotProps?.skipBtn?.className)}
              style={slotProps?.skipBtn?.style}
            >
              {skipProps.title}
            </Button>
          )}

          <div className="flex-1" />

          {!hideBackButton && index > 0 && (
            <Button
              {...backProps}
              variant="outline"
              className={slotProps?.backBtn?.className}
              style={slotProps?.backBtn?.style}
            >
              {backProps.title}
            </Button>
          )}

          {continuous && (
            <Button
              {...primaryProps}
              variant={isLastStep ? 'default' : 'outline'}
              className={slotProps?.nextBtn?.className}
              style={slotProps?.nextBtn?.style}
            >
              {primaryProps.title}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
