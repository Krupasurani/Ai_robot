import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';

export type StepperProps = {
  activeStep: number;
  steps: string[];
  alternativeLabel?: boolean;
  className?: string;
  getStepStatus?: (index: number) => 'completed' | 'active' | undefined;
  renderStepLabel?: (label: string, index: number) => React.ReactNode;
};

export function Stepper({
  activeStep,
  steps,
  alternativeLabel = false,
  className,
  getStepStatus,
  renderStepLabel,
}: StepperProps) {
  return (
    <div className={cn('w-full', alternativeLabel && 'mb-8', className)}>
      <div className={cn('relative flex', alternativeLabel ? 'justify-between' : 'flex-col gap-4')}>
        {steps.map((label, index) => {
          const status = getStepStatus
            ? getStepStatus(index)
            : index < activeStep
              ? 'completed'
              : index === activeStep
                ? 'active'
                : undefined;

          return (
            <div
              key={label}
              className={cn(
                'relative flex items-center',
                alternativeLabel ? 'flex-1 flex-col' : 'gap-3'
              )}
            >
              {/* Connector line for alternative label */}
              {alternativeLabel && index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-[calc(50%+1.25rem)] right-0 h-0.5 transition-colors',
                    index < activeStep ? 'bg-primary' : 'bg-muted-foreground/30',
                    'z-0'
                  )}
                />
              )}

              {/* Step indicator */}
              <div className="relative z-10 flex items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                    status === 'completed' && 'border-primary bg-primary text-primary-foreground',
                    status === 'active' && 'border-primary bg-primary/10 text-primary',
                    !status && 'border-muted-foreground/30 bg-background text-muted-foreground'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {!alternativeLabel && index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-12 transition-colors',
                      index < activeStep ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              <div className={cn(alternativeLabel && 'mt-2 text-center')}>
                {renderStepLabel ? (
                  renderStepLabel(label, index)
                ) : (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      status === 'active' && 'text-primary',
                      status === 'completed' && 'text-foreground',
                      !status && 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
