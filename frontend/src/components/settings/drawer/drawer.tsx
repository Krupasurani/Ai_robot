import { RefreshCcw, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import COLORS from 'src/theme/colors.json';
import PRIMARY_COLOR from 'src/theme/primary-colors.json';
import { useTheme } from '@/theme/theme-provider';

import { BaseOption } from './option-base';
import { Scrollbar } from '@/components/custom/scrollbar';
import { FontOptions } from './option-font';
import { useSettingsContext } from '../context';
import { PresetsOptions } from './option-presets';
import { defaultSettings } from '../config';
import { FullScreenButton } from './button-fullscreen';

import type { SettingsDrawerProps } from '../types';

export function SettingsDrawer({
  className,
  hideFont,
  hideCompact,
  hidePresets,
  hideNavColor,
  hideContrast,
  hideNavLayout,
  hideDirection,
  hideColorScheme,
}: SettingsDrawerProps) {
  const settings = useSettingsContext();
  const { setTheme } = useTheme();

  const handleReset = () => {
    settings.onReset();
    setTheme(defaultSettings.colorScheme as 'light' | 'dark');
  };

  const handleColorSchemeToggle = () => {
    const next = settings.colorScheme === 'light' ? 'dark' : 'light';
    settings.onUpdateField('colorScheme', next);
    setTheme(next);
  };

  const handleContrastToggle = () => {
    settings.onUpdateField('contrast', settings.contrast === 'default' ? 'hight' : 'default');
  };

  const handleDirectionToggle = () => {
    settings.onUpdateField('direction', settings.direction === 'ltr' ? 'rtl' : 'ltr');
  };

  const handleCompactToggle = () => {
    settings.onUpdateField('compactLayout', !settings.compactLayout);
  };

  return (
    <Sheet open={settings.openDrawer} onOpenChange={(open) => !open && settings.onCloseDrawer()}>
      <SheetContent side="right" className={cn('w-[360px] p-0', className)}>
        <div className="flex items-center py-2 pr-1 pl-2.5">
          <h6 className="text-lg font-semibold flex-grow">UI Settings</h6>

          <FullScreenButton />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleReset} className="relative">
                {settings.canReset && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-2 w-2 rounded-full p-0"
                  />
                )}
                <RefreshCcw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={settings.onCloseDrawer}>
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Close</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Scrollbar>
          <div className="flex flex-col gap-6 px-2.5 pb-5">
            <div className="grid grid-cols-2 gap-2">
              {!hideColorScheme && (
                <BaseOption
                  label="Dark mode"
                  icon="moon"
                  selected={settings.colorScheme === 'dark'}
                  onClick={handleColorSchemeToggle}
                />
              )}

              {!hideContrast && (
                <BaseOption
                  label="Contrast"
                  icon="contrast"
                  selected={settings.contrast === 'hight'}
                  onClick={handleContrastToggle}
                />
              )}

              {!hideDirection && (
                <BaseOption
                  label="Right to left"
                  icon="align-right"
                  selected={settings.direction === 'rtl'}
                  onClick={handleDirectionToggle}
                />
              )}

              {!hideCompact && (
                <BaseOption
                  tooltip="Dashboard only and available at large resolutions > 1600px (xl)"
                  label="Compact"
                  icon="autofit-width"
                  selected={settings.compactLayout}
                  onClick={handleCompactToggle}
                />
              )}
            </div>

            {!hidePresets && (
              <PresetsOptions
                value={settings.primaryColor}
                onClickOption={(newValue) => settings.onUpdateField('primaryColor', newValue)}
                options={[
                  { name: 'default', value: COLORS.primary.main },
                  { name: 'cyan', value: PRIMARY_COLOR.cyan.main },
                  { name: 'purple', value: PRIMARY_COLOR.purple.main },
                  { name: 'blue', value: PRIMARY_COLOR.blue.main },
                  { name: 'orange', value: PRIMARY_COLOR.orange.main },
                  { name: 'red', value: PRIMARY_COLOR.red.main },
                ]}
              />
            )}

            {!hideFont && (
              <FontOptions
                value={settings.fontFamily}
                onClickOption={(newValue) => settings.onUpdateField('fontFamily', newValue)}
                options={[
                  'Public Sans Variable',
                  'Inter Variable',
                  'DM Sans Variable',
                  'Nunito Sans Variable',
                ]}
              />
            )}
          </div>
        </Scrollbar>
      </SheetContent>
    </Sheet>
  );
}
