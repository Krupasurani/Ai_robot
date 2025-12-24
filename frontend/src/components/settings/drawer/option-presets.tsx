import { cn } from '@/utils/cn';
import { CONFIG } from 'src/config-global';
import { SvgColor } from '../../custom/svg-color';
import type { SettingsState } from '../types';

type Value = SettingsState['primaryColor'];

type Props = {
  value: Value;
  options: { name: Value; value: string }[];
  onClickOption: (newValue: Value) => void;
};

export function PresetsOptions({ value, options, onClickOption }: Props) {
  return (
    <div className="px-2 pb-2 pt-4 rounded-lg flex relative flex-col border border-border/30">
      <span className="px-1.25 -top-3 text-[13px] rounded-[22px] leading-[22px] absolute items-center text-white dark:text-zinc-800 inline-flex bg-foreground font-semibold">
        Presets
      </span>
      <ul className="grid grid-cols-3 gap-1.5">
        {options.map((option) => {
          const selected = value === option.name;

          return (
            <li key={option.name} className="flex">
              <button
                type="button"
                onClick={() => onClickOption(option.name)}
                className={cn(
                  'w-full h-16 rounded-xl transition-all flex items-center justify-center',
                  selected && 'border-2 border-border shadow-sm'
                )}
                style={{
                  color: option.value,
                  backgroundColor: selected ? `${option.value}14` : 'transparent',
                  borderColor: selected ? option.value : 'transparent',
                }}
              >
                <SvgColor
                  width={28}
                  src={`${CONFIG.assetsDir}/assets/icons/settings/ic-siderbar-duotone.svg`}
                  className="text-current"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
