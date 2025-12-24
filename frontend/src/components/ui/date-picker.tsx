import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';

export interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  helperText?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  disabled = false,
  className,
  error = false,
  helperText,
}: DatePickerProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal h-9 rounded-lg bg-input border-border shadow-sm',
              !date && 'text-muted-foreground',
              error && 'border-destructive ring-destructive/20'
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {date ? format(date, 'dd/MM/yyyy') : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-lg shadow-md" align="start">
          <Calendar mode="single" selected={date} onSelect={onDateChange} />
        </PopoverContent>
      </Popover>
      {helperText && (
        <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {helperText}
        </p>
      )}
    </div>
  );
}
