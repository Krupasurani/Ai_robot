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
import { Textarea } from '@/components/ui/textarea';

export type TextareaFieldProps<
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
  rows?: number;
};

export function TextareaField<
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
  rows = 4,
}: TextareaFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('mb-3', className)}>
          <FormLabel className="mb-2 tracking-tight text-gray-500 text-[13px] ml-0.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Textarea {...field} placeholder={placeholder} disabled={disabled} rows={rows} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage className="text-[11px] text-red-800 dark:text-red-400 ml-1 my-1" />
        </FormItem>
      )}
    />
  );
}
