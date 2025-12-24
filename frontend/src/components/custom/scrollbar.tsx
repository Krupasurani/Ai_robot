import type { ComponentRef } from 'react';

import { forwardRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/cn';

export type ScrollbarProps = React.ComponentProps<typeof ScrollArea> & {
  fillContent?: boolean;
};

export const Scrollbar = forwardRef<ComponentRef<typeof ScrollArea>, ScrollbarProps>(
  ({ children, fillContent, className, ...props }, ref) => {
    return (
      <ScrollArea
        ref={ref}
        className={cn(
          'min-w-0 min-h-0 flex-1 flex flex-col',
          fillContent &&
            '[&_[data-slot=scroll-area-viewport]]:flex [&_[data-slot=scroll-area-viewport]]:flex-1 [&_[data-slot=scroll-area-viewport]]:flex-col',
          className
        )}
        {...props}
      >
        {children}
      </ScrollArea>
    );
  }
);

Scrollbar.displayName = 'Scrollbar';

