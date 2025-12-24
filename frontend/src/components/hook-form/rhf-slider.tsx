import React from 'react';
import { useFormContext } from 'react-hook-form';

import { Slider } from '@/components/ui/slider';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

type Props = Omit<React.ComponentProps<typeof Slider>, 'value' | 'onValueChange'> & {
  name: string;
  helperText?: React.ReactNode;
};

export function RHFSlider({ name, helperText, className, ...other }: Props) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Slider
              value={Array.isArray(field.value) ? field.value : [field.value ?? 0]}
              onValueChange={(value) => {
                field.onChange(value.length === 1 ? value[0] : value);
              }}
              className={className}
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
