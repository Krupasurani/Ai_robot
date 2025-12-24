import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type RHFTextFieldProps = Omit<React.ComponentProps<'input'>, 'name'> & {
  name: string;
  label?: string;
  helperText?: string;
};

export function RHFTextField({
  name,
  label,
  helperText,
  type,
  className,
  ...other
}: RHFTextFieldProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const displayValue = type === 'number' && fieldState.invalid ? field.value : (type === 'number' && field.value === 0 ? '' : (field.value ?? ''));

        return (
          <FormItem className="w-full">
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <Input
                {...field}
                type={type}
                value={displayValue}
                onChange={(event) => {
                  if (type === 'number') {
                    field.onChange(
                      event.target.value === '' ? undefined : Number(event.target.value)
                    );
                  } else {
                    field.onChange(event.target.value);
                  }
                }}
                autoComplete="off"
                className={className}
                {...other}
              />
            </FormControl>
            {helperText && !fieldState.error && <FormDescription>{helperText}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
