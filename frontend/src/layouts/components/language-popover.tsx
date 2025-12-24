import type { LanguageValue } from 'src/locales';

import { m } from 'framer-motion';
import { useCallback, useState } from 'react';

import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenuItem } from '@/components/ui/drop-down-menu';
import { useTranslate } from 'src/locales';
import { FlagIcon } from 'src/components/iconify';

export type LanguagePopoverProps = React.ComponentProps<typeof Button> & {
  data?: {
    value: string;
    label: string;
    countryCode: string;
  }[];
};

export function LanguagePopover({ data = [], className, ...other }: LanguagePopoverProps) {
  const [open, setOpen] = useState(false);
  const { onChangeLang, currentLang } = useTranslate();

  const handleChangeLang = useCallback(
    (newLang: LanguageValue) => {
      onChangeLang(newLang);
      setOpen(false);
    },
    [onChangeLang]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-10 w-10', open && 'bg-muted', className)}
          asChild
          {...other}
        >
          <m.button
            whileTap="tap"
            whileHover="hover"
            variants={{
              hover: { scale: 1.05 },
              tap: { scale: 0.95 },
            }}
          >
            <FlagIcon code={currentLang.countryCode} />
          </m.button>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="end">
        <div className="min-h-[72px]">
          {data?.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleChangeLang(option.value as LanguageValue)}
              className={cn('cursor-pointer', option.value === currentLang.value && 'bg-muted')}
            >
              <FlagIcon code={option.countryCode} className="mr-2" />
              {option.label}
            </DropdownMenuItem>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
