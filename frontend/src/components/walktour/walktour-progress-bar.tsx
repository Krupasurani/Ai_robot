import React from 'react';
import { cn } from '../../utils/cn';

import type { WalktourProgressBarProps } from './types';

export function WalktourProgressBar({
  onGoStep,
  totalSteps,
  currentStep,
}: WalktourProgressBarProps) {
  return (
    <div className="absolute left-0 w-full bottom-[-1px] flex flex-row">
      <div
        className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300"
        style={{
          width: `calc(100% / ${totalSteps} * ${currentStep})`,
        }}
      />

      {[...Array(totalSteps)].map((_, index) => {
        const stepIndex = index + 1;
        const isActive = currentStep >= stepIndex;

        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (currentStep !== stepIndex) {
                onGoStep(index);
              }
            }}
            className={cn(
              'pt-1 flex-1 transition-colors',
              isActive ? 'hover:bg-primary/10' : 'hover:bg-muted'
            )}
            style={{
              width: `calc(100% / ${totalSteps})`,
            }}
          />
        );
      })}
    </div>
  );
}
