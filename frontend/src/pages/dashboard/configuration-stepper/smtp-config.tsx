import { z } from 'zod';
import eyeIcon from '@iconify-icons/eva/eye-fill';
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import eyeOffIcon from '@iconify-icons/eva/eye-off-fill';

import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Iconify } from 'src/components/iconify';
import { Button } from 'src/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from 'src/components/ui/alert';

import type { SmtpFormValues } from './types';

// Very simple schema - all fields are optional by default
const smtpSchema = z
  .object({
    host: z.string().optional(),
    port: z.number().optional().default(587),
    username: z.string().optional(),
    password: z.string().optional(),
    fromEmail: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Only validate if any field has a value
    const hasValues =
      data.host ||
      (data.fromEmail && data.fromEmail.trim() !== '') ||
      (data.username && data.username.trim() !== '') ||
      (data.password && data.password.trim() !== '');

    if (hasValues) {
      // Check host
      if (!data.host || data.host.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SMTP Host is required when configuring SMTP',
          path: ['host'],
        });
      }

      // Check fromEmail
      if (!data.fromEmail || data.fromEmail.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'From Email is required when configuring SMTP',
          path: ['fromEmail'],
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.fromEmail)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Must be a valid email address',
          path: ['fromEmail'],
        });
      }
    }
  });

interface SmtpConfigStepProps {
  onSubmit: (data: SmtpFormValues) => void;
  onSkip: () => void;
  isSubmitting: boolean;
  initialValues: SmtpFormValues | null;
}

const SmtpConfigStep: React.FC<SmtpConfigStepProps> = ({
  onSubmit,
  onSkip,
  isSubmitting,
  initialValues,
}) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showValidationWarning, setShowValidationWarning] = useState<boolean>(false);
  const [displayPort, setDisplayPort] = useState<string>(''); // For UI display
  const [validationAttempted, setValidationAttempted] = useState<boolean>(false);

  // Default values - with port as a number to match the type
  const defaultValues = {
    host: '',
    port: 587, // Using the default number value
    username: '',
    password: '',
    fromEmail: '',
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors },
    trigger,
    setValue,
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    mode: 'onSubmit',
    defaultValues,
  });

  // Watch form values
  const formValues = watch();

  // Initialize form with initial values if available
  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
      // Update display port if initial values include a custom port
      if (initialValues.port && initialValues.port !== 587) {
        setDisplayPort(initialValues.port.toString());
      }
    }
  }, [initialValues, reset]);

  // Function to check if user has entered any data
  const hasUserInput = (): boolean =>
    !!(
      (formValues.host && formValues.host.trim()) ||
      (formValues.username && formValues.username.trim()) ||
      (formValues.password && formValues.password.trim()) ||
      (formValues.fromEmail && formValues.fromEmail.trim()) ||
      displayPort !== ''
    );

  // Expose the submit function with a clear signature that returns a promise
  useEffect(() => {
    // This function will be called from the parent component when Continue button is clicked
    (window as any).submitSmtpForm = async () => {
      setValidationAttempted(true);

      // Check if ANY field has input
      const hasAnyInput = hasUserInput();

      // If ANY field has input, ALL required fields must be filled
      if (hasAnyInput) {
        // Validate the entire form
        const isFormValid = await trigger();
        if (!isFormValid) {
          setShowValidationWarning(true);
          return false; // Return false to prevent submission
        }

        // Form is valid, submit it
        handleSubmit(onSubmit)();
        return true;
      }
      // ALL fields are empty - this should NOT happen when clicking Complete Setup
      // We should force the user to explicitly skip using the Skip button
      setShowValidationWarning(true);
      return false; // Return false to prevent submission
    };

    // For skipping - completely bypass validation
    (window as any).skipSmtpForm = () => {
      onSkip(); // Directly call skip
      return true;
    };

    // For checking if form has any input - needed by parent
    (window as any).hasSmtpInput = () => hasUserInput();

    // For getting form values
    (window as any).getSmtpFormValues = () => getValues();

    return () => {
      // Clean up
      delete (window as any).submitSmtpForm;
      delete (window as any).skipSmtpForm;
      delete (window as any).hasSmtpInput;
      delete (window as any).getSmtpFormValues;
    };
    // eslint-disable-next-line
  }, [handleSubmit, onSubmit, onSkip, getValues, trigger, formValues, displayPort]);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 mb-2 px-2" id="smtp-config-form">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          SMTP Configuration
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Configure SMTP settings for email notifications. You can leave all fields empty to skip this
          configuration or use the Skip button.
        </p>
      </div>

      {/* Validation warning - show when validation attempted and has errors */}
      {showValidationWarning && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>SMTP Configuration Error</AlertTitle>
          <AlertDescription>
            {hasUserInput()
              ? 'Please complete all required SMTP fields to continue.'
              : "Please use the 'Skip SMTP Configuration' button if you don't want to configure SMTP."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP Host</Label>
            <Controller
              name="host"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  id="host"
                  placeholder="e.g., smtp.gmail.com"
                  className={validationAttempted && fieldState.error ? "border-destructive" : ""}
                />
              )}
            />
            {validationAttempted && errors.host && (
              <p className="text-sm text-destructive">{errors.host.message}</p>
            )}
            {!validationAttempted && (
              <p className="text-sm text-muted-foreground">Required if configuring SMTP</p>
            )}
          </div>
        </div>

        <div className="md:col-span-4">
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Controller
              name="port"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  value={displayPort}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setDisplayPort(inputValue);

                    // Update the actual form value (empty string defaults to 587)
                    if (inputValue === '') {
                      field.onChange(587);
                    } else {
                      field.onChange(Number(inputValue));
                    }
                  }}
                  onBlur={field.onBlur}
                  id="port"
                  placeholder="587"
                  type="number"
                  className={validationAttempted && fieldState.error ? "border-destructive" : ""}
                />
              )}
            />
            {validationAttempted && errors.port && (
              <p className="text-sm text-destructive">{errors.port.message}</p>
            )}
            {!validationAttempted && (
              <p className="text-sm text-muted-foreground">Default: 587</p>
            )}
          </div>
        </div>

        <div className="md:col-span-12">
          <div className="space-y-2">
            <Label htmlFor="fromEmail">From Email Address</Label>
            <Controller
              name="fromEmail"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  id="fromEmail"
                  placeholder="e.g., notifications@yourdomain.com"
                  className={validationAttempted && fieldState.error ? "border-destructive" : ""}
                />
              )}
            />
            {validationAttempted && errors.fromEmail && (
              <p className="text-sm text-destructive">{errors.fromEmail.message}</p>
            )}
            {!validationAttempted && (
              <p className="text-sm text-muted-foreground">Required if configuring SMTP</p>
            )}
          </div>
        </div>

        <div className="md:col-span-6">
          <div className="space-y-2">
            <Label htmlFor="username">SMTP Username (Optional)</Label>
            <Controller
              name="username"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  id="username"
                  placeholder="e.g., your.username"
                  className={validationAttempted && fieldState.error ? "border-destructive" : ""}
                />
              )}
            />
            {validationAttempted && errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>
        </div>

        <div className="md:col-span-6">
          <div className="space-y-2">
            <Label htmlFor="password">SMTP Password (Optional)</Label>
            <div className="relative">
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    {...field}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={validationAttempted && fieldState.error ? "border-destructive pr-10" : "pr-10"}
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Iconify
                  icon={showPassword ? eyeOffIcon : eyeIcon}
                  width={16}
                  height={16}
                  className="text-muted-foreground"
                />
              </Button>
            </div>
            {validationAttempted && errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default SmtpConfigStep;
