import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/theme/theme-provider';
import { cn } from '@/utils/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';

export type ThemeToggleButtonProps = React.ComponentProps<'div'>;

export function ThemeToggleButton({ className, ...other }: ThemeToggleButtonProps) {
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)} {...other}>
            <Sun
              className={cn(
                'h-4 w-4 transition-colors',
                isDarkMode ? 'text-muted-foreground' : 'text-foreground'
              )}
            />
            <Switch
              checked={isDarkMode}
              onCheckedChange={toggleTheme}
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            />
            <Moon
              className={cn(
                'h-4 w-4 transition-colors',
                isDarkMode ? 'text-foreground' : 'text-muted-foreground'
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Switch to {isDarkMode ? 'light' : 'dark'} mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
