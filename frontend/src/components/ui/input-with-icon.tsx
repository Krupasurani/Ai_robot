import * as React from 'react';
import { cn } from '@/utils/cn';

export interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, icon, type, ...props }, ref) => (
    <div
      className={cn(
        'flex h-10 items-center rounded-md border border-input pl-3 text-sm ring-offset-background focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
    >
      {icon}
      <input
        {...props}
        type={type || "search"}
        ref={ref}
        className="w-full p-2 placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
);
InputWithIcon.displayName = 'InputWithIcon';

export { InputWithIcon };
