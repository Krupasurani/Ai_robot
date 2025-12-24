import React from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Filled Field Row - 3-column layout with Label | Input | Preview
// ============================================================================

interface FilledFieldRowProps {
  label: string;
  required?: boolean;
  preview?: React.ReactNode;
  error?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function FilledFieldRow({
  label,
  required,
  preview,
  error,
  description,
  className,
  children,
}: FilledFieldRowProps) {
  return (
    <div className={cn('grid grid-cols-12 gap-4 items-start', className)}>
      {/* Label Column */}
      <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5 pt-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{label}</span>
          {required && (
            <Badge className="h-5 px-1.5 text-[10px] font-medium bg-zinc-800 text-zinc-400 border-0 rounded">
              Required
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Input Column */}
      <div className={cn('col-span-12', preview ? 'md:col-span-6' : 'md:col-span-9')}>
        {children}
        {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
      </div>

      {/* Preview Column (optional) */}
      {preview && (
        <div className="col-span-12 md:col-span-3 flex items-center pt-2.5">
          <div className="text-sm text-zinc-500">{preview}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Filled Input - Dark background input with purple focus ring
// ============================================================================

interface FilledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const FilledInput = React.forwardRef<HTMLInputElement, FilledInputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-3 py-2.5 rounded-md transition-all duration-150',
          'bg-[#1e1e24] text-fuchsia-400 placeholder:text-fuchsia-400/40',
          'border border-transparent',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-0',
          hasError && 'ring-2 ring-red-500/50 border-red-500/30',
          className
        )}
        {...props}
      />
    );
  }
);
FilledInput.displayName = 'FilledInput';

// ============================================================================
// Filled Textarea - Dark background textarea with purple focus ring
// ============================================================================

interface FilledTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const FilledTextarea = React.forwardRef<HTMLTextAreaElement, FilledTextareaProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2.5 rounded-md transition-all duration-150 resize-none',
          'bg-[#1e1e24] text-fuchsia-400 placeholder:text-fuchsia-400/40',
          'border border-transparent',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-0',
          'font-mono text-xs',
          hasError && 'ring-2 ring-red-500/50 border-red-500/30',
          className
        )}
        {...props}
      />
    );
  }
);
FilledTextarea.displayName = 'FilledTextarea';

// ============================================================================
// Filled Field - Simple vertical layout (label above input)
// ============================================================================

interface FilledFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function FilledField({
  label,
  required,
  error,
  description,
  className,
  children,
}: FilledFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-200">{label}</label>
        {required && (
          <Badge className="h-5 px-1.5 text-[10px] font-medium bg-zinc-800 text-zinc-400 border-0 rounded">
            Required
          </Badge>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {description && !error && (
        <p className="text-xs text-zinc-500">{description}</p>
      )}
    </div>
  );
}

// ============================================================================
// FilledInputField - react-hook-form compatible wrapper
// ============================================================================

interface FilledInputFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  description?: string;
  required?: boolean;
  type?: React.ComponentProps<'input'>['type'];
  IconComponent?: LucideIcon;
}

export function FilledInputField<
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
  type = 'text',
  IconComponent,
}: FilledInputFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  return (
    <FilledField
      label={label}
      required={required}
      error={error?.message}
      description={description}
      className={className}
    >
      <div className="relative">
        {IconComponent && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400">
            <IconComponent className="h-4 w-4" />
          </div>
        )}
        <FilledInput
          {...field}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          hasError={!!error}
          className={cn(IconComponent && 'pl-10')}
        />
      </div>
    </FilledField>
  );
}

