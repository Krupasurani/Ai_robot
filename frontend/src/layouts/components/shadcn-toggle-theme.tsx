import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/theme/theme-provider';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={(e) => {
        e.preventDefault();
        setTheme(nextTheme);
      }}
      className="cursor-pointer"
    >
      {theme === 'dark' ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all text-white" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all text-black" />
      )}
    </Button>
  );
}
