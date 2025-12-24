import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Props = {
  title: string;
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
};

export function Block({ title, tooltip, children, className }: Props) {
  return (
    <div
      className={cn(
        'px-2 pb-2 pt-4 rounded-lg flex relative flex-col border border-border/30',
        className
      )}
    >
      <span className="px-1.25 -top-3 text-[13px] rounded-[22px] leading-[22px] absolute items-center text-white dark:text-zinc-800 inline-flex bg-foreground font-semibold">
        {title}

        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="ml-0.5 -mr-0.5 size-3.5 opacity-48 cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </span>

      {children}
    </div>
  );
}

type BlockOptionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  icon?: React.ReactNode;
  label?: React.ReactNode;
};

export function BlockOption({ icon, label, selected, className, ...other }: BlockOptionProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-xl leading-[18px] text-muted-foreground border border-transparent font-semibold text-[13px]',
        'transition-all',
        selected && ['text-foreground bg-card border-border/8 shadow-sm'],
        className
      )}
      {...other}
    >
      {icon && icon}
      {label && label}
    </button>
  );
}
