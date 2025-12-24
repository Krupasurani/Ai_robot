import { cn } from '@/utils/cn';
import type { EditorToolbarItemProps } from '../types';

type ToolbarItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & EditorToolbarItemProps;

export function ToolbarItem({
  icon,
  label,
  active,
  disabled,
  className,
  ...other
}: ToolbarItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex items-center justify-center px-3 h-7 w-7 rounded-md text-sm',
        'transition-colors hover:bg-accent',
        active && 'bg-accent',
        disabled && 'pointer-events-none cursor-not-allowed opacity-48',
        className
      )}
      {...other}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {label && <span>{label}</span>}
    </button>
  );
}
