import { useState } from 'react';
import { m } from 'framer-motion';
import { Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenuItem } from '@/components/ui/drop-down-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

import { fToNow } from 'src/utils/format-time';
import { varHover } from 'src/components/animate';

export type ContactsPopoverProps = React.ComponentProps<typeof Button> & {
  data?: {
    id: string;
    role: string;
    name: string;
    email: string;
    status: string;
    address: string;
    avatarUrl: string;
    phoneNumber: string;
    lastActivity: string;
  }[];
};

const statusColors = {
  online: 'bg-green-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
  alway: 'bg-blue-500',
};

export function ContactsPopover({ data = [], className, ...other }: ContactsPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(open && 'bg-muted', className)}
          asChild
          {...other}
        >
          <m.button whileTap="tap" whileHover="hover" variants={varHover(1.05)}>
            <Users className="h-5 w-5" />
          </m.button>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="text-base font-semibold">
            Contacts <span className="text-muted-foreground">({data.length})</span>
          </h3>
        </div>

        <ScrollArea className="h-80 w-80">
          <div className="p-1">
            {data.map((contact) => (
              <DropdownMenuItem key={contact.id} className="p-2 cursor-pointer">
                <div className="relative mr-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage alt={contact.name} src={contact.avatarUrl} />
                    <AvatarFallback>{contact.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
                      statusColors[contact.status as keyof typeof statusColors] || 'bg-gray-400'
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{contact.name}</p>
                  {contact.status === 'offline' && (
                    <p className="text-xs text-muted-foreground truncate">
                      {fToNow(contact.lastActivity)}
                    </p>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
