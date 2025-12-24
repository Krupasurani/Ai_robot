import { useState } from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { cn } from '@/utils/cn';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeClosed, Lock } from 'lucide-react';

export type PasswordFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
  showIcon?: boolean;
  IconComponent?: React.ElementType;
  helperText?: string;
};

export function PasswordField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder = '*********',
  disabled,
  className,
  required,
  autoFocus,
  showIcon = true,
  helperText,
  IconComponent,
}: PasswordFieldProps<TFieldValues, TName>) {
  const [showPassword, setShowPassword] = useState(false);
  const Icon = IconComponent || Lock;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('mb-3', className)}>
          <FormLabel className="mb-1 gap-0 tracking-tight text-muted-foreground text-sm ml-0.5">
            {label}
            {required && <span className="text-destructive ml-0">*</span>}
          </FormLabel>
          <FormControl>
            <div
              className={cn(
                'flex mt-1 border p-0 rounded-lg justify-center items-center gap-1 transition-all duration-75 ease-in border-border',
                'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[2px]',
                'has-[:aria-invalid]:ring-destructive/20 dark:has-[:aria-invalid]:ring-destructive/40 has-[:aria-invalid]:border-destructive'
              )}
            >
              {IconComponent && <Icon size={20} className="text-primary ml-2 h-4 w-4" />}
              <Input
                {...field}
                type={showPassword ? 'text' : 'password'}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className={cn(
                  'border-none shadow-none p-2 bg-transparent focus-visible:ring-0 flex-1',
                  IconComponent ? 'focus:bg-transparent' : ''
                )}
              />
              {showIcon && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="cursor-pointer h-auto w-auto p-0 mr-3"
                >
                  {showPassword ? (
                    <Eye size={20} className="text-foreground" />
                  ) : (
                    <EyeClosed size={20} className="text-foreground" />
                  )}
                </Button>
              )}
            </div>
          </FormControl>
          <FormMessage className="text-xs text-destructive ml-1" />
          {helperText && <p className="text-xs text-muted-foreground ml-1">{helperText}</p>}
        </FormItem>
      )}
    />
  );
}
