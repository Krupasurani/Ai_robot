import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface RecordActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  tooltip?: string;
  className?: string;
  compact?: boolean;
}

export const RecordActionButton: React.FC<RecordActionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  variant = 'outline',
  size = 'default',
  disabled = false,
  tooltip,
  className,
  compact = false,
}) => {
  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        compact ? 'h-7 px-2 text-xs' : 'h-8 px-3.5 text-sm',
        'rounded-md font-medium',
        className
      )}
    >
      <Icon className={cn(compact ? 'mr-1.5 h-3.5 w-3.5' : 'mr-2 h-4 w-4')} />
      {label}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{button}</span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
};
