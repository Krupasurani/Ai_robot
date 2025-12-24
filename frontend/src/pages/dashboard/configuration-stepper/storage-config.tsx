import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState, useEffect, useCallback } from 'react';

import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from 'src/components/ui/select';
// Storage types enum
export const storageTypes = {
  LOCAL: 'local',
  S3: 's3',
  AZURE_BLOB: 'azureBlob',
} as const;

// Type for storage type values
type StorageType = (typeof storageTypes)[keyof typeof storageTypes];

// Base schema for all storage types
const baseStorageSchema = z.object({
  storageType: z.enum([storageTypes.LOCAL, storageTypes.S3, storageTypes.AZURE_BLOB]),
});

// S3 specific schema - all fields required
const s3ConfigSchema = baseStorageSchema.extend({
  storageType: z.literal(storageTypes.S3),
  s3AccessKeyId: z.string().min(1, { message: 'S3 access key ID is required' }),
  s3SecretAccessKey: z.string().min(1, { message: 'S3 secret access key is required' }),
  s3Region: z.string().min(1, { message: 'S3 region is required' }),
  s3BucketName: z.string().min(1, { message: 'S3 bucket name is required' }),
});

// Azure Blob specific schema - all required except endpointSuffix
const azureBlobConfigSchema = baseStorageSchema.extend({
  storageType: z.literal(storageTypes.AZURE_BLOB),
  endpointProtocol: z.enum(['http', 'https']).default('https'),
  accountName: z.string().min(1, { message: 'Azure account name is required' }),
  accountKey: z.string().min(1, { message: 'Azure account key is required' }),
  endpointSuffix: z.string().optional().default('core.windows.net'),
  containerName: z.string().min(1, { message: 'Azure container name is required' }),
});

// Local storage specific schema - all fields optional
const localConfigSchema = baseStorageSchema.extend({
  storageType: z.literal(storageTypes.LOCAL),
  mountName: z.string().optional(),
  // Allow empty string (optional) or valid URL
  baseUrl: z
    .union([z.string().url({ message: 'Must be a valid URL' }), z.string().max(0)])
    .optional(),
});

// Combined schema using discriminated union based on storageType
const storageSchema = z.discriminatedUnion('storageType', [
  s3ConfigSchema,
  azureBlobConfigSchema,
  localConfigSchema,
]);

// Type for form values derived from the zod schema
export type StorageFormValues = z.infer<typeof storageSchema>;

// Helper types for each storage configuration
type S3Config = z.infer<typeof s3ConfigSchema>;
type AzureBlobConfig = z.infer<typeof azureBlobConfigSchema>;
type LocalConfig = z.infer<typeof localConfigSchema>;

interface StorageConfigStepProps {
  onSubmit: (data: StorageFormValues) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
  initialValues: StorageFormValues | null;
}

const StorageConfigStep: React.FC<StorageConfigStepProps> = ({
  onSubmit,
  onSkip,
  isSubmitting = false,
  initialValues,
}) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showValidationWarning, setShowValidationWarning] = useState<boolean>(false);
  const [validationAttempted, setValidationAttempted] = useState<boolean>(false);

  // Get the default values based on the storage type
  const getDefaultValues = (): StorageFormValues => {
    if (!initialValues) {
      // If no initial values provided, return default local config
      return {
        storageType: storageTypes.LOCAL,
        mountName: '',
        baseUrl: '',
      } as LocalConfig;
    }

    // If initialValues are provided, use them directly
    return initialValues;
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { isValid, isDirty },
    trigger,
    setValue,
  } = useForm<StorageFormValues>({
    resolver: zodResolver(storageSchema),
    mode: 'onChange', // We'll control when to show errors
    defaultValues: getDefaultValues(),
  });

  // Watch the storageType to conditionally render fields
  const storageType = watch('storageType');
  const formValues = watch();

  // Check if the form has any values filled - wrapped in useCallback
  const hasAnyFieldFilled = useCallback((): boolean => {
    if (storageType === storageTypes.S3) {
      const values = formValues as S3Config;
      return !!(
        (values.s3AccessKeyId && values.s3AccessKeyId.trim()) ||
        (values.s3SecretAccessKey && values.s3SecretAccessKey.trim()) ||
        (values.s3Region && values.s3Region.trim()) ||
        (values.s3BucketName && values.s3BucketName.trim())
      );
    }

    if (storageType === storageTypes.AZURE_BLOB) {
      const values = formValues as AzureBlobConfig;
      return !!(
        (values.accountName && values.accountName.trim()) ||
        (values.accountKey && values.accountKey.trim()) ||
        (values.containerName && values.containerName.trim()) ||
        (values.endpointSuffix && values.endpointSuffix !== 'core.windows.net')
      );
    }

    return false;
  }, [storageType, formValues]);

  // Check if the form has all required fields filled - wrapped in useCallback
  const hasAllRequiredFieldsFilled = useCallback(async (): Promise<boolean> => {
    // Local storage is always valid
    if (storageType === storageTypes.LOCAL) {
      return true;
    }

    // For S3 and Azure, check if all required fields are filled
    const isFormValid = await trigger();
    return isFormValid;
  }, [storageType, trigger]);

  // Determine if the form is partially filled
  const isPartiallyFilled = (): boolean => {
    // If the form is not dirty or no validation attempted, it's not partially filled
    if (!isDirty || !validationAttempted) {
      return false;
    }

    // Local storage is always valid
    if (storageType === storageTypes.LOCAL) {
      return false;
    }

    // Form is partially filled if it has any fields filled but isn't valid
    return hasAnyFieldFilled() && !isValid;
  };

  // Reset form with proper default values when storage type changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'storageType' && value.storageType) {
        const type = value.storageType;
        setValidationAttempted(false);
        setShowValidationWarning(false);

        // Create a new form state based on the selected storage type
        let newValues: StorageFormValues;

        switch (type) {
          case storageTypes.S3:
            newValues = {
              storageType: storageTypes.S3,
              s3AccessKeyId: '',
              s3SecretAccessKey: '',
              s3Region: '',
              s3BucketName: '',
            } as S3Config;
            break;

          case storageTypes.AZURE_BLOB:
            newValues = {
              storageType: storageTypes.AZURE_BLOB,
              endpointProtocol: 'https',
              accountName: '',
              accountKey: '',
              endpointSuffix: 'core.windows.net',
              containerName: '',
            } as AzureBlobConfig;
            break;

          default:
            newValues = {
              storageType: storageTypes.LOCAL,
              mountName: '',
              baseUrl: '',
            } as LocalConfig;
            break;
        }

        reset(newValues);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, reset]);

  // Initialize form with initial values if available
  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  // Expose submit method to parent component
  useEffect(() => {
    (window as any).submitStorageForm = async () => {
      setValidationAttempted(true);

      // For LOCAL storage, always validate (even though it's simpler)
      if (storageType === storageTypes.LOCAL) {
        // Local storage has minimal requirements, so it's usually valid
        handleSubmit(onSubmit)();
        return true;
      }

      // For S3 and Azure - validate ALL required fields when continuing
      const allFieldsValid = await trigger();

      if (!allFieldsValid) {
        setShowValidationWarning(true);
        return false;
      }

      // If all validations pass, submit the form
      handleSubmit(onSubmit)();
      return true;
    };

    // Method for skipping WITHOUT validation
    (window as any).skipStorageForm = () => {
      onSkip(); // Call directly without validation
      return true;
    };

    // Helper method to check if form is valid
    (window as any).isStorageFormValid = async () => {
      // For LOCAL storage, always valid
      if (storageType === storageTypes.LOCAL) {
        return true;
      }

      // For other storage types, validate all required fields
      // Fix: Don't use await in a return statement
      return trigger();
    };

    // Method to get current form values
    (window as any).getStorageFormValues = () => getValues();

    return () => {
      delete (window as any).submitStorageForm;
      delete (window as any).skipStorageForm;
      delete (window as any).isStorageFormValid;
      delete (window as any).getStorageFormValues;
    };
  }, [
    handleSubmit,
    onSubmit,
    onSkip,
    getValues,
    storageType,
    hasAnyFieldFilled,
    hasAllRequiredFieldsFilled,
    trigger, // Fix: Add missing dependency
  ]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6 mb-2 px-2"
      id="storage-config-form"
    >
      <div>
        <h3 className="text-lg font-semibold">Storage Configuration</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure storage settings for your application data.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Controller
            name="storageType"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor="storageType">Storage Type</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select storage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={storageTypes.LOCAL}>Local Storage</SelectItem>
                    <SelectItem value={storageTypes.S3}>Amazon S3</SelectItem>
                    <SelectItem value={storageTypes.AZURE_BLOB}>Azure Blob Storage</SelectItem>
                  </SelectContent>
                </Select>
                {validationAttempted && fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>

        {/* Warning for partially filled forms */}
        {showValidationWarning && isPartiallyFilled() && (
          <Alert variant="destructive">
            <AlertDescription>
              Please complete all required fields or skip this step. Partial configuration is not
              allowed.
            </AlertDescription>
          </Alert>
        )}

        {/* S3 specific fields */}
        {storageType === storageTypes.S3 && (
          <div className="space-y-4">
            <div>
              <Controller
                name="s3AccessKeyId"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="s3AccessKeyId">Access Key ID *</Label>
                    <Input
                      {...field}
                      id="s3AccessKeyId"
                      className={
                        validationAttempted && fieldState.error ? 'border-destructive' : ''
                      }
                    />
                    {validationAttempted && fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
            <div>
              <Controller
                name="s3SecretAccessKey"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="s3SecretAccessKey">Secret Access Key *</Label>
                    <div className="relative">
                      <Input
                        {...field}
                        id="s3SecretAccessKey"
                        type={showPassword ? 'text' : 'password'}
                        className={
                          validationAttempted && fieldState.error
                            ? 'border-destructive pr-10'
                            : 'pr-10'
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {validationAttempted && fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Controller
                  name="s3Region"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="s3Region">Region *</Label>
                      <Input
                        {...field}
                        id="s3Region"
                        className={
                          validationAttempted && fieldState.error ? 'border-destructive' : ''
                        }
                      />
                      {validationAttempted && fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
              <div>
                <Controller
                  name="s3BucketName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="s3BucketName">Bucket Name *</Label>
                      <Input
                        {...field}
                        id="s3BucketName"
                        className={
                          validationAttempted && fieldState.error ? 'border-destructive' : ''
                        }
                      />
                      {validationAttempted && fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Azure Blob specific fields */}
        {storageType === storageTypes.AZURE_BLOB && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Controller
                  name="accountName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name *</Label>
                      <Input
                        {...field}
                        id="accountName"
                        className={
                          validationAttempted && fieldState.error ? 'border-destructive' : ''
                        }
                      />
                      {validationAttempted && fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
              <div>
                <Controller
                  name="containerName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="containerName">Container Name *</Label>
                      <Input
                        {...field}
                        id="containerName"
                        className={
                          validationAttempted && fieldState.error ? 'border-destructive' : ''
                        }
                      />
                      {validationAttempted && fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
            <div>
              <Controller
                name="accountKey"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor="accountKey">Account Key *</Label>
                    <div className="relative">
                      <Input
                        {...field}
                        id="accountKey"
                        type={showPassword ? 'text' : 'password'}
                        className={
                          validationAttempted && fieldState.error
                            ? 'border-destructive pr-10'
                            : 'pr-10'
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {validationAttempted && fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Controller
                  name="endpointProtocol"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="endpointProtocol">Protocol</Label>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="https">HTTPS</SelectItem>
                          <SelectItem value="http">HTTP</SelectItem>
                        </SelectContent>
                      </Select>
                      {validationAttempted && fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
              <div>
                <Controller
                  name="endpointSuffix"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="endpointSuffix">Endpoint Suffix (Optional)</Label>
                      <Input
                        {...field}
                        id="endpointSuffix"
                        placeholder="e.g., core.windows.net"
                        className={
                          validationAttempted && fieldState.error ? 'border-destructive' : ''
                        }
                      />
                      {validationAttempted && fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Local storage specific fields */}
        {storageType === storageTypes.LOCAL && (
          <div className="space-y-4">
            <Alert className="bg-blue-400/10">
              <AlertDescription className="dark:text-blue-300 text-blue-500">
                Local storage is configured automatically. Additional options are optional.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Controller
                  name="mountName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="mountName">Mount Name (Optional)</Label>
                      <Input
                        {...field}
                        id="mountName"
                        className={
                          validationAttempted && fieldState.error ? 'border-destructive' : ''
                        }
                      />
                      {validationAttempted && fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
              <div>
                <Controller
                  name="baseUrl"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="baseUrl">Base URL (Optional)</Label>
                      <Input
                        {...field}
                        id="baseUrl"
                        placeholder="e.g., http://localhost:3000/files"
                        className={
                          validationAttempted && fieldState.error ? 'border-destructive' : ''
                        }
                        onChange={(e) => {
                          // Handle empty string specially for optional URL
                          if (e.target.value.trim() === '') {
                            setValue('baseUrl', '', { shouldValidate: true });
                          } else {
                            field.onChange(e);
                          }
                        }}
                      />
                      {validationAttempted && fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
            {showValidationWarning && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>
                    All required fields must be filled to continue with this storage configuration.
                  </strong>
                  <br />
                  If you prefer not to configure storage now, please use the &quot;Use Default
                  Storage&quot; button.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </form>
  );
};

export default StorageConfigStep;
