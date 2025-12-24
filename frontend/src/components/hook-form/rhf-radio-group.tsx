import React from 'react';
import { useFormContext } from 'react-hook-form';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type Props = Omit<React.ComponentProps<typeof RadioGroup>, 'name'> & {
  name: string;
  label?: string;
  helperText?: React.ReactNode;
  options: {
    label: string;
    value: string;
  }[];
};

export function RHFRadioGroup({ name, label, options, helperText, className, ...other }: Props) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3">
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <RadioGroup
              value={field.value ?? ''}
              onValueChange={field.onChange}
              className={className}
              {...other}
            >
              {options.map((option) => (
                <FormItem key={option.value} className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value={option.value} />
                  </FormControl>
                  {option.label && (
                    <FormLabel className="font-normal cursor-pointer">{option.label}</FormLabel>
                  )}
                </FormItem>
              ))}
            </RadioGroup>
          </FormControl>
          {helperText && <FormDescription>{helperText}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
