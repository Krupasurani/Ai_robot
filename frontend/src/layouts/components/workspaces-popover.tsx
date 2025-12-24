import { useState, useCallback } from 'react';
import { ChevronsUpDown } from 'lucide-react';

import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenuItem } from '@/components/ui/drop-down-menu';

export type WorkspacesPopoverProps = React.ComponentProps<'button'> & {
  data?: {
    id: string;
    name: string;
    logo: string;
    plan: string;
  }[];
};

export function WorkspacesPopover({ data = [], className, ...other }: WorkspacesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState(data[0]);

  const handleChangeWorkspace = useCallback((newValue: (typeof data)[0]) => {
    setWorkspace(newValue);
    setOpen(false);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex items-center gap-1 sm:gap-2 py-1 px-2 rounded-md hover:bg-muted transition-colors',
            className
          )}
          {...other}
        >
          <img alt={workspace?.name} src={workspace?.logo} className="w-6 h-6 rounded-full" />

          <span className="hidden sm:inline-flex text-sm font-semibold">{workspace?.name}</span>

          <Badge
            variant={workspace?.plan === 'Free' ? 'secondary' : 'default'}
            className="hidden sm:inline-flex h-[22px] text-xs"
          >
            {workspace?.plan}
          </Badge>

          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-1" align="start">
        <div>
          {data.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleChangeWorkspace(option)}
              className={cn('h-12 cursor-pointer', option.id === workspace?.id && 'bg-muted')}
            >
              <Avatar className="w-6 h-6 mr-3">
                <AvatarImage alt={option.name} src={option.logo} />
              </Avatar>

              <span className="flex-1">{option.name}</span>

              <Badge variant={option.plan === 'Free' ? 'secondary' : 'default'} className="ml-2">
                {option.plan}
              </Badge>
            </DropdownMenuItem>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
