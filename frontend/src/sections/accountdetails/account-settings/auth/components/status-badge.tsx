import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

type StatusType = 'configured' | 'requires-setup' | 'active' | 'inactive';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    icon: React.ReactNode;
    className: string;
  }
> = {
  configured: {
    label: 'Ready',
    icon: <Check className="h-3 w-3" />,
    className:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  'requires-setup': {
    label: 'Setup required',
    icon: <AlertCircle className="h-3 w-3" />,
    className:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  active: {
    label: 'Active',
    icon: (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    ),
    className:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  inactive: {
    label: 'Inactive',
    icon: <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
}

export default StatusBadge;




