import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';

interface RemoveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const RemoveButton = React.forwardRef<HTMLButtonElement, RemoveButtonProps>(
  ({ children, className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      className={cn(
        'min-w-0 p-1.5 text-muted-foreground flex items-center transition-all duration-200',
        'hover:bg-destructive/10 hover:pr-3 hover:text-destructive',
        '[&_.removeText]:max-w-0 [&_.removeText]:overflow-hidden [&_.removeText]:opacity-0 [&_.removeText]:whitespace-nowrap',
        '[&_.removeText]:transition-all [&_.removeText]:duration-200',
        'hover:[&_.removeText]:max-w-[100px] hover:[&_.removeText]:opacity-100 hover:[&_.removeText]:ml-2',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
);

RemoveButton.displayName = 'RemoveButton';

  export default RemoveButton;
