import { useFormContext } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type RHFCheckboxProps = {
  name: string;
  label?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
};

export function RHFCheckbox({ name, helperText, label, className, disabled }: RHFCheckboxProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-center gap-2">
            <FormControl>
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            </FormControl>
            {label && <FormLabel className="cursor-pointer">{label}</FormLabel>}
          </div>
          {helperText && <FormDescription>{helperText}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type RHFMultiCheckboxProps = {
  name: string;
  label?: string;
  helperText?: string;
  options: Array<{ label: string; value: string }>;
  className?: string;
  disabled?: boolean;
};

export function RHFMultiCheckbox({
  name,
  label,
  options,
  helperText,
  className,
  disabled,
}: RHFMultiCheckboxProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const selectedValues = (field.value as string[]) || [];

        const toggleValue = (value: string) => {
          const newValues = selectedValues.includes(value)
            ? selectedValues.filter((v) => v !== value)
            : [...selectedValues, value];
          field.onChange(newValues);
        };

        return (
          <FormItem className={className}>
            {label && <FormLabel>{label}</FormLabel>}
            <div className="space-y-2">
              {options.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                return (
                  <FormItem key={option.value} className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleValue(option.value)}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer text-sm font-normal">
                      {option.label}
                    </FormLabel>
                  </FormItem>
                );
              })}
            </div>
            {helperText && <FormDescription>{helperText}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
