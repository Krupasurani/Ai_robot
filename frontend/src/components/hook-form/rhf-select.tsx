import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type RHFSelectProps = {
  name: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  children?: React.ReactNode;
  options?: Array<{ label: string; value: string }>;
  className?: string;
  disabled?: boolean;
};

export function RHFSelect({
  name,
  label,
  placeholder,
  helperText,
  children,
  options,
  className,
  disabled,
  ...other
}: RHFSelectProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={disabled} {...other}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options
                ? options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                : children}
            </SelectContent>
          </Select>
          {helperText && <FormDescription>{helperText}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type RHFMultiSelectProps = {
  name: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  options: Array<{ label: string; value: string }>;
  chip?: boolean;
  checkbox?: boolean;
  className?: string;
  disabled?: boolean;
};

export function RHFMultiSelect({
  name,
  label,
  placeholder,
  helperText,
  options,
  className,
  disabled,
  ...other
}: RHFMultiSelectProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const selectedValues = (field.value as string[]) || [];
        const selectedOptions: Option[] = options
          .filter((item) => selectedValues.includes(item.value))
          .map((item) => ({ value: item.value, label: item.label }));

        const allOptions: Option[] = options.map((item) => ({
          value: item.value,
          label: item.label,
        }));

        return (
          <FormItem className={className}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <MultipleSelector
                value={selectedOptions}
                options={allOptions}
                placeholder={placeholder}
                onChange={(newOptions: Option[]) => {
                  field.onChange(newOptions.map((opt: Option) => opt.value));
                }}
                disabled={disabled}
                {...other}
              />
            </FormControl>
            {helperText && <FormDescription>{helperText}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
