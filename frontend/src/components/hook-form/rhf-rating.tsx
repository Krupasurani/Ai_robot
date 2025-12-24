import React from 'react';
import { useFormContext } from 'react-hook-form';

import { Rating, type RatingProps } from '@/components/ui/rating';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

type Props = Omit<RatingProps, 'value' | 'onChange'> & {
  name: string;
  helperText?: React.ReactNode;
};

export function RHFRating({ name, helperText, ...other }: Props) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Rating
              value={field.value ?? 0}
              onChange={(value) => {
                field.onChange(value ?? 0);
              }}
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
