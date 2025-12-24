import React from 'react';
import { useFormContext } from 'react-hook-form';

import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export type RHFAutocompleteProps = {
  name: string;
  label?: string;
  placeholder?: string;
  hiddenLabel?: boolean;
  helperText?: React.ReactNode;
  options: ComboboxOption[];
  disabled?: boolean;
  className?: string;
};

export function RHFAutocomplete({
  name,
  label,
  helperText,
  placeholder,
  options,
  disabled,
  className,
  hiddenLabel,
  ...other
}: RHFAutocompleteProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && !hiddenLabel && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Combobox
              options={options}
              value={field.value ?? undefined}
              onValueChange={(value) => {
                form.setValue(name, value, { shouldValidate: true });
              }}
              placeholder={placeholder}
              disabled={disabled}
              {...other}
            />
          </FormControl>
          {helperText && <FormDescription>{helperText}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
