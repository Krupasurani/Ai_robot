import { Controller, useFormContext } from 'react-hook-form';
import { DatePicker, DatePickerProps } from '@/components/ui/date-picker';
import { parseISO, isValid } from 'date-fns';

type RHFDatePickerProps = Omit<DatePickerProps, 'date' | 'onDateChange'> & {
  name: string;
};

export function RHFDatePicker({ name, ...other }: RHFDatePickerProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        // Convert field value to Date object
        let dateValue: Date | undefined;
        if (field.value) {
          if (typeof field.value === 'string') {
            const parsed = parseISO(field.value);
            dateValue = isValid(parsed) ? parsed : undefined;
          } else if (field.value instanceof Date) {
            dateValue = isValid(field.value) ? field.value : undefined;
          }
        }

        return (
          <DatePicker
            date={dateValue}
            onDateChange={(date) => {
              // Convert Date to ISO string for form
              field.onChange(date ? date.toISOString() : null);
            }}
            error={!!error}
            helperText={error?.message}
            {...other}
          />
        );
      }}
    />
  );
}

type RHFDateTimePickerProps = Omit<DatePickerProps, 'date' | 'onDateChange'> & {
  name: string;
  showTime?: boolean;
};

export function RHFDateTimePicker({ name, showTime = false, ...other }: RHFDateTimePickerProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        // Convert field value to Date object
        let dateValue: Date | undefined;
        if (field.value) {
          if (typeof field.value === 'string') {
            const parsed = parseISO(field.value);
            dateValue = isValid(parsed) ? parsed : undefined;
          } else if (field.value instanceof Date) {
            dateValue = isValid(field.value) ? field.value : undefined;
          }
        }

        return (
          <DatePicker
            date={dateValue}
            onDateChange={(date) => {
              // Convert Date to ISO string for form
              field.onChange(date ? date.toISOString() : null);
            }}
            error={!!error}
            helperText={error?.message}
            placeholder={showTime ? 'Pick a date and time' : 'Pick a date'}
            {...other}
          />
        );
      }}
    />
  );
}
