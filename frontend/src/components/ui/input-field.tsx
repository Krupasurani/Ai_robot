import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { cn } from '@/utils/cn';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export type CommonFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  description?: string;
  required?: boolean;
};

// Input field props
export type InputFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = CommonFieldProps<TFieldValues, TName> & {
  type?: React.ComponentProps<typeof Input>['type'];
  autoComplete?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  IconComponent?: React.ElementType;
  autoFocus?: boolean;
};

export function InputField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder,
  disabled,
  className,
  description,
  required,
  type = 'text',
  autoComplete,
  min,
  max,
  step,
  IconComponent,
  autoFocus,
}: InputFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('mb-3', className)}>
          <FormLabel className="mb-1 gap-0 tracking-tight text-muted-foreground text-sm ml-0.5">
            {label}
            {required && <span className="text-red-500 m-0">*</span>}
          </FormLabel>
          <FormControl>
            <div
              className={cn(
                'flex mt-1 border rounded-lg justify-center items-center gap-1 transition-all duration-75 ease-in cursor-text',
                IconComponent ? 'border-border' : 'border-none p-0',
                IconComponent &&
                  'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[2px]',
                IconComponent &&
                  'has-[:aria-invalid]:ring-destructive/20 dark:has-[:aria-invalid]:ring-destructive/40 has-[:aria-invalid]:border-destructive'
              )}
            >
              {IconComponent && <IconComponent className="text-primary h-4 w-4 ml-2" />}
              <Input
                {...field}
                type={type}
                value={
                  type === 'number'
                    ? field.value
                      ? parseInt(String(field.value))
                      : ''
                    : field.value
                }
                onChange={(e) => {
                  if (type === 'number') {
                    field.onChange(e.target.value ? parseInt(e.target.value) : '');
                  } else {
                    field.onChange(e.target.value);
                  }
                }}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                autoComplete={autoComplete}
                min={min}
                max={max}
                step={step}
                className={cn(
                  'bg-transparent shadow-none p-2',
                  IconComponent ? 'border-none focus-visible:ring-0 flex-1' : 'border'
                )}
              />
            </div>
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage className="text-xs text-destructive ml-1 my-1" />
        </FormItem>
      )}
    />
  );
}
