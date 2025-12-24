import { CONFIG } from 'src/config-global';
import { setFont } from '@/theme/utils';

import { SvgColor } from '@/components/custom/svg-color';
import { cn } from '@/utils/cn';

type Props = {
  value: string;
  options: string[];
  onClickOption: (newValue: string) => void;
};

export function FontOptions({ value, options, onClickOption }: Props) {
  return (
    <div className="px-2 pb-2 pt-4 rounded-lg flex relative flex-col border border-border/30">
      <span className="px-1.25 -top-3 text-[13px] rounded-[22px] leading-[22px] absolute items-center text-white dark:text-zinc-800 inline-flex bg-foreground font-semibold">
        Font
      </span>
      <ul className="grid grid-cols-2 gap-1.5">
        {options.map((option) => {
          const selected = value === option;

          return (
            <li key={option} className="inline-flex">
              <button
                type="button"
                onClick={() => onClickOption(option)}
                className={cn(
                  'w-full rounded-xl leading-[18px] text-muted-foreground border border-transparent font-semibold text-[13px] transition-all py-2 gap-0.75 flex-col text-xs flex items-center justify-center',
                  selected && ['text-foreground bg-card border-border/8 shadow-sm']
                )}
                style={{ fontFamily: setFont(option) }}
              >
                <SvgColor
                  width={28}
                  src={`${CONFIG.assetsDir}/assets/icons/settings/ic-font.svg`}
                  className="text-current"
                />
                <span>
                  {option.endsWith('Variable') ? option.replace(' Variable', '') : option}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
