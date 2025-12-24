import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConfigStepperProps {
  activeStep: number;
  steps: string[];
}

const ConfigStepper: React.FC<ConfigStepperProps> = ({ activeStep, steps }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {steps.map((label, index) => {
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200',
                    isActive || isCompleted
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'bg-muted text-muted-foreground border-2 border-muted-foreground/20'
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </div>
                {/* Step Label */}
                <div
                  className={cn(
                    'mt-2 text-xs font-semibold transition-colors',
                    isActive
                      ? 'text-primary'
                      : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  )}
                >
                  {label}
                </div>
              </div>
              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 -mt-4 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-border/40'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ConfigStepper;
