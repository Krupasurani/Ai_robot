import { z } from 'zod';
import { cn } from '@/utils/cn';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import axios from 'src/utils/axios';

// API base URL
const API_BASE_URL = '/api/v1/configurationManager';

// Using export type to fix the TypeScript issue
export type UrlFormValues = {
  frontendUrl: string;
  connectorUrl: string;
};

interface UrlConfigStepProps {
  onSubmit: (data: UrlFormValues) => void;
  onSkip: () => void;
  initialValues: UrlFormValues | null;
  onValidationChange?: (isValid: boolean) => void;
  onSaveSuccess?: () => void;
  submitDirectly?: boolean; // New prop to control direct API submission
}

// URL validation regex
const urlRegex = /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/[\w./?%&=-]*)?$/;

// URL validation function
const isValidURL = (url: string): boolean => {
  if (urlRegex.test(url)) {
    return true;
  }
  return false;
};

// Create Zod schema for URL validation
const urlSchema = z.object({
  frontendUrl: z
    .string()
    .refine((val) => val === '' || isValidURL(val), 'Please enter a valid URL'),
  connectorUrl: z
    .string()
    .refine((val) => val === '' || isValidURL(val), 'Please enter a valid URL'),
});

// Expose utility functions for validation from the parent component
if (typeof window !== 'undefined') {
  (window as any).submitUrlForm = async () => {
    try {
      // If the window function exists, call it
      if (typeof (window as any).__urlFormSubmit === 'function') {
        return (window as any).__urlFormSubmit();
      }
      return false;
    } catch (err) {
      console.error('Error submitting URL form:', err);
      return false;
    }
  };

  // More aligned with the LLM implementation
  (window as any).isUrlFormValid = async () => {
    try {
      // If the window function exists, call it
      if (typeof (window as any).__urlFormIsValid === 'function') {
        return (window as any).__urlFormIsValid();
      }
      return false;
    } catch (err) {
      console.error('Error validating URL form:', err);
      return false;
    }
  };

  // Add a function to check if any user input has been entered
  (window as any).hasUrlInput = () => {
    try {
      // If the window function exists, call it
      if (typeof (window as any).__urlFormHasInput === 'function') {
        return (window as any).__urlFormHasInput();
      }
      return false;
    } catch (err) {
      console.error('Error checking URL form input:', err);
      return false;
    }
  };
}

const UrlConfigStep: React.FC<UrlConfigStepProps> = ({
  onSubmit,
  onSkip,
  initialValues,
  onValidationChange,
  onSaveSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isValid },
    setValue,
    trigger,
    watch,
  } = useForm<UrlFormValues>({
    resolver: zodResolver(urlSchema),
    mode: 'onChange', // Validate on change
    defaultValues: initialValues || {
      frontendUrl: '',
      connectorUrl: '',
    },
  });

  // Watch form values to track changes
  const formValues = watch();

  // Fetch existing URL configurations on component mount
  useEffect(() => {
    const fetchExistingUrls = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        // Call the API to fetch existing URL configurations
        const frontendUrlResponse = await axios.get(`${API_BASE_URL}/frontendPublicUrl`);
        const connectorUrlResponse = await axios.get(`${API_BASE_URL}/connectorPublicUrl`);
        let frontendUrl = '';
        let connectorUrl = '';
        if (frontendUrlResponse.data || connectorUrlResponse.data) {
          if (frontendUrlResponse.data) {
            // Only use the URL if it doesn't contain "localhost"
            const {url} = frontendUrlResponse.data;
            if (url && !url.includes('localhost')) {
              frontendUrl = url;
            }
          }

          // Check for connectorUrl data and filter out localhost
          if (connectorUrlResponse.data) {
            // Only use the URL if it doesn't contain "localhost"
            const {url} = connectorUrlResponse.data;
            if (url && !url.includes('localhost')) {
              connectorUrl = url;
            }
          }

          // Set form values with the fetched URLs
          setValue('frontendUrl', frontendUrl || '');
          setValue('connectorUrl', connectorUrl || '');

          // Trigger validation after setting values
          setTimeout(() => {
            trigger();
          }, 0);
        }
      } catch (err) {
        console.error('Error fetching URL configurations:', err);
        setErrorMessage('Failed to fetch existing URL configurations. Please enter URLs manually.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't have initialValues (which would mean they were already set)
    if (!initialValues) {
      fetchExistingUrls();
    }
  }, [setValue, initialValues, trigger]);

  // Notify parent component about validation state changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [isValid, onValidationChange]);

  // Expose submit method to parent component
  useEffect(() => {
    // Store the form submission function in the window object
    (window as any).__urlFormSubmit = async () => {
      // Trigger validation for all fields
      const isFormValid = await trigger();

      if (isFormValid) {
        // Use handleSubmit to properly process the form submission
        const formSubmitHandler = handleSubmit((data) => {
          onSubmit(data);
          return true;
        });

        // Execute the submission handler directly
        formSubmitHandler();
        return true;
      }
      return false;
    };

    // Store the validation function in the window object
    (window as any).__urlFormIsValid = async () => trigger();

    // Store the has input function in the window object
    (window as any).__urlFormHasInput = () => {
      const { frontendUrl, connectorUrl } = formValues;
      return !!(frontendUrl || connectorUrl);
    };

    return () => {
      // Clean up window functions when component unmounts
      delete (window as any).__urlFormSubmit;
      delete (window as any).__urlFormIsValid;
      delete (window as any).__urlFormHasInput;
    };
  }, [handleSubmit, onSubmit, trigger, formValues]);
  const handleFormSubmit = async (data: UrlFormValues) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Call the parent component's submit handler
      // This will now perform the API call in the parent component
      onSubmit(data);

      // Call onSaveSuccess if provided
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      console.error('Error in URL configuration form submission:', err);
      setErrorMessage('Failed to save URL configurations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="url-config-form" onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-6 px-2">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Public URL Configuration
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          Configure the public URLs for your frontend and connector services. These URLs are used for
          OAuth redirects and webhook callbacks.
        </p>

        <div className="bg-blue-50 dark:bg-blue-400/20 border border-blue-200 dark:border-blue-400/10 flex gap-2 items-center rounded-md p-4 mb-6">
          <AlertCircle className='text-blue-400' size={20} />
          <p className="text-sm text-blue-800 dark:text-blue-400">
            All fields marked with <span className="text-red-500">*</span> are required.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-400/20 border border-red-200 dark:border-red-400/10 rounded-md p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      {loading && (
        <div className="bg-blue-50 dark:bg-blue-400/20 dark:border-blue-400/10 border border-blue-200 rounded-md p-4 mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-400">Loading existing URL configurations...</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Controller
            name="frontendUrl"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor="frontendUrl" className="text-sm font-medium">
                  Frontend URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...field}
                  id="frontendUrl"
                  placeholder="https://yourdomain.com"
                  className={cn(
                    fieldState.error && "border-red-500 focus-visible:ring-red-500/50"
                  )}
                  onBlur={() => {
                    field.onBlur();
                    trigger('frontendUrl');
                  }}
                />
                {fieldState.error && (
                  <p className="text-sm text-red-600">{fieldState.error.message}</p>
                )}
                {!fieldState.error && (
                  <p className="text-sm text-muted-foreground">
                    The public URL where your frontend is hosted (e.g., https://yourdomain.com)
                  </p>
                )}
              </div>
            )}
          />
        </div>

        <div>
          <Controller
            name="connectorUrl"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor="connectorUrl" className="text-sm font-medium">
                  Connector URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...field}
                  id="connectorUrl"
                  placeholder="https://connector.yourdomain.com"
                  className={cn(
                    fieldState.error && "border-red-500 focus-visible:ring-red-500/50"
                  )}
                  onBlur={() => {
                    field.onBlur();
                    trigger('connectorUrl');
                  }}
                />
                {fieldState.error && (
                  <p className="text-sm text-red-600">{fieldState.error.message}</p>
                )}
                {!fieldState.error && (
                  <p className="text-sm text-muted-foreground">
                    The public URL where your connector service is hosted (e.g., https://connector.yourdomain.com)
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* This hidden submit button ensures the form can be submitted programmatically */}
      <button type="submit" className="hidden" id="url-form-submit-button">
        Submit
      </button>
    </form>
  );
};

// Remove export from the end of the file to avoid the conflict
export default UrlConfigStep;
