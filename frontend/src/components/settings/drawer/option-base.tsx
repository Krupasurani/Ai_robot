import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CONFIG } from 'src/config-global';
import { SvgColor } from '../../custom/svg-color';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  label: string;
  selected: boolean;
  tooltip?: string;
};

export function BaseOption({ icon, label, tooltip, selected, className, ...other }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'px-2 py-2.5 rounded-lg cursor-pointer flex flex-col items-start',
        'border border-border/30 hover:bg-muted/50',
        selected && 'bg-muted/50',
        className
      )}
      {...other}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <SvgColor src={`${CONFIG.assetsDir}/assets/icons/settings/ic-${icon}.svg`} />
        <Switch name={label} checked={selected} className="-mr-3" />
      </div>

      <div className="flex items-center justify-between w-full">
        <span className="text-[13px] font-semibold leading-[18px]">{label}</span>

        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-4 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px]">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </button>
  );
}
