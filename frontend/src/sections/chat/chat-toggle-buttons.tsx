import arrowDownIcon from '@iconify-icons/eva/arrow-ios-downward-fill';
import arrowForwardIcon from '@iconify-icons/eva/arrow-ios-forward-fill';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { Iconify } from 'src/components/iconify';

type CollapseButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function CollapseButton({
  selected,
  disabled,
  children,
  className,
  ...other
}: CollapseButtonProps) {
  const icon = (!selected || disabled ? arrowForwardIcon : arrowDownIcon) ?? arrowForwardIcon;

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md px-3',
        'text-[11px] font-semibold uppercase tracking-wide',
        'bg-muted text-muted-foreground',
        'disabled:cursor-not-allowed disabled:opacity-60',
        !disabled && 'hover:bg-muted/80',
        className
      )}
      {...other}
    >
      <span className="truncate">{children}</span>
      <Iconify width={16} icon={icon} />
    </button>
  );
}

type ToggleButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function ToggleButton({ className, children, ...other }: ToggleButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'absolute left-0 top-20 z-10 flex h-8 w-8 items-center justify-center',
        'rounded-r-xl bg-primary text-primary-foreground shadow-md',
        'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        className
      )}
      {...other}
    >
      {children}
    </button>
  );
}
