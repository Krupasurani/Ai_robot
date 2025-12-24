import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CONFIG } from 'src/config-global';
import { SvgColor } from '../../custom/svg-color';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SettingsState } from '../types';

type Props = {
  value: {
    color: SettingsState['navColor'];
    layout: SettingsState['navLayout'];
  };
  options: {
    colors: SettingsState['navColor'][];
    layouts: SettingsState['navLayout'][];
  };
  onClickOption: {
    color: (newValue: SettingsState['navColor']) => void;
    layout: (newValue: SettingsState['navLayout']) => void;
  };
  hideNavColor?: boolean;
  hideNavLayout?: boolean;
};

export function NavOptions({ options, value, onClickOption, hideNavColor, hideNavLayout }: Props) {
  const labelStyles = 'block text-[11px] leading-[14px] text-muted-foreground font-semibold';

  const renderLayout = (
    <div className="flex flex-col gap-1.5">
      <span className={labelStyles}>Layout</span>
      <div className="flex gap-1.5">
        {options.layouts.map((option) => (
          <LayoutOption
            key={option}
            option={option}
            selected={value.layout === option}
            onClick={() => onClickOption.layout(option)}
          />
        ))}
      </div>
    </div>
  );

  const renderColor = (
    <div className="flex flex-col gap-1.5">
      <span className={labelStyles}>Color</span>
      <div className="flex gap-1.5">
        {options.colors.map((option) => (
          <ColorOption
            key={option}
            option={option}
            selected={value.color === option}
            onClick={() => onClickOption.color(option)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="px-2 pb-2 pt-4 rounded-lg flex relative flex-col border border-border/30 gap-2.5">
      <span className="px-1.25 -top-3 text-[13px] rounded-[22px] leading-[22px] absolute items-center text-white dark:text-zinc-800 inline-flex bg-foreground font-semibold">
        Nav
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="ml-0.5 -mr-0.5 size-3.5 opacity-48 cursor-pointer" />
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Dashboard only</p>
          </TooltipContent>
        </Tooltip>
      </span>
      {!hideNavLayout && renderLayout}
      {!hideNavColor && renderColor}
    </div>
  );
}

// ----------------------------------------------------------------------

type OptionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  option: string;
  selected: boolean;
};

export function LayoutOption({ option, selected, className, ...other }: OptionProps) {
  const renderIconNav = () => {
    const circle = (
      <div
        className={cn(
          'shrink-0 rounded w-2.5 h-2.5 opacity-80 bg-current',
          selected && 'opacity-100 bg-primary'
        )}
      />
    );

    const primaryLine = (
      <div
        className={cn(
          'shrink-0 rounded w-px h-1 opacity-48 bg-current',
          option === 'horizontal' && 'w-4',
          selected && 'bg-primary'
        )}
      />
    );

    const secondaryLine = (
      <div
        className={cn(
          'shrink-0 rounded w-px h-1 max-w-3.5 opacity-24 bg-current',
          option === 'horizontal' && 'max-w-2.5',
          selected && 'bg-primary'
        )}
      />
    );

    return (
      <div
        className={cn(
          'gap-0.5 shrink-0 flex p-0.75 w-8 h-full border-r border-border/8',
          option === 'mini' && 'w-[22px]',
          option === 'horizontal' &&
            'w-full h-[22px] border-r-0 items-center border-b border-border/8',
          option === 'horizontal' ? 'flex-row' : 'flex-col'
        )}
      >
        {circle}
        {primaryLine}
        {secondaryLine}
      </div>
    );
  };

  const renderIconContent = (
    <div className="p-0.5 w-full h-full flex-grow">
      <div
        className={cn(
          'w-full h-full opacity-20 rounded-lg bg-current',
          selected && 'bg-primary opacity-30'
        )}
      />
    </div>
  );

  const renderIcon = (
    <div
      className={cn(
        'flex w-full h-full rounded-inherit border border-border/8',
        option === 'horizontal' ? 'flex-col' : 'flex-row',
        selected && 'border-transparent'
      )}
    >
      {renderIconNav()}
      {renderIconContent}
    </div>
  );

  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-xl leading-[18px] text-muted-foreground border border-transparent font-semibold text-[13px] transition-all h-16',
        selected && ['text-foreground bg-card border-border/8 shadow-sm'],
        className
      )}
      {...other}
    >
      {renderIcon}
    </button>
  );
}

// ----------------------------------------------------------------------

export function ColorOption({ option, selected, className, ...other }: OptionProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-xl leading-[18px] text-muted-foreground border border-transparent font-semibold text-[13px] transition-all gap-1.5 h-14 capitalize flex items-center justify-center',
        selected && ['text-foreground bg-card border-border/8 shadow-sm'],
        className
      )}
      {...other}
    >
      <SvgColor
        src={`${CONFIG.assetsDir}/assets/icons/settings/ic-sidebar-${option === 'integrate' ? 'outline' : 'filled'}.svg`}
      />
      <span>{option}</span>
    </button>
  );
}
