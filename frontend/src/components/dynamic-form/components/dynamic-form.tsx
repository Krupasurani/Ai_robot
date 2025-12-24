import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Loader2, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

import { useAuthContext } from 'src/auth/hooks';
import DynamicField from './dynamic-field';
import { useDynamicForm } from '../hooks/use-dynamic-form';
import type { ConfigType } from '../core/config-registry';

interface DynamicFormProps {
  // Core configuration
  configType: ConfigType;

  // Callbacks
  onValidationChange: (isValid: boolean, formData?: any) => void;
  onSaveSuccess?: () => void;
  onProviderChange?: (newProviderId: string) => void; // New callback for provider changes

  // Data management
  getConfig: () => Promise<any>;
  updateConfig: (config: any) => Promise<any>;

  // UI customization
  title?: string;
  description?: string;
  infoMessage?: string;
  documentationUrl?: string;

  // Behavior modes
  stepperMode?: boolean; // For stepper/wizard mode
  isRequired?: boolean; // For required fields validation
  initialProvider?: string; // Initial provider selection

  // Legacy support (backward compatibility)
  modelType?: 'llm' | 'embedding'; // Deprecated: Use configType instead
}

interface SaveResult {
  success: boolean;
  warning?: string;
  error?: string;
}

export interface DynamicFormRef {
  handleSave: () => Promise<SaveResult>;
  getFormData: () => Promise<any>;
  validateForm: () => Promise<boolean>;
  hasFormData: () => Promise<boolean>;
  rehydrateForm?: (data: any) => Promise<void>;

  // Legacy method names for backward compatibility
  handleSubmit?: () => Promise<SaveResult>; // Alias for handleSave
}

const DynamicForm = forwardRef<DynamicFormRef, DynamicFormProps>((props, ref) => {
  const {
    configType,
    modelType, // Legacy support
    onValidationChange,
    onSaveSuccess,
    onProviderChange, // New prop
    getConfig,
    updateConfig,
    title,
    description,
    infoMessage,
    documentationUrl,
    stepperMode = false,
    isRequired = false,
    initialProvider,
  } = props;

  const { user } = useAuthContext();
  const accountType = user?.accountType || 'individual';

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(isRequired || stepperMode);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formSubmitSuccess, setFormSubmitSuccess] = useState(false);
  const [fetchError, setFetchError] = useState<boolean>(false);
  const [formDataLoaded, setFormDataLoaded] = useState(stepperMode);
  const [providerHeights, setProviderHeights] = useState<Record<string, number>>({});

  // Refs
  const formContainerRef = useRef<HTMLDivElement>(null);
  const formInstanceKey = useRef(`${configType}-${Date.now()}-${Math.random()}`);
  const originalApiConfigRef = useRef<any>(null);

  // Determine final config type (support legacy modelType)
  const finalConfigType = configType || modelType;
  if (!finalConfigType) {
    throw new Error('Either configType or modelType must be provided');
  }

  // Use the unified dynamic form hook
  const {
    currentProvider,
    switchProvider,
    control,
    handleSubmit,
    reset,
    initializeForm,
    isValid,
    isSwitchingProvider,
    providerConfig,
    providers,
    getValues,
    watch,
    resetToProvider,
  } = useDynamicForm(finalConfigType as ConfigType, initialProvider || '', accountType);

  // Enhanced validation change handler for stepper mode
  useEffect(() => {
    if (stepperMode) {
      const subscription = watch((data: any, { name, type }: any) => {
        const timeoutId = setTimeout(() => {
          let hasData = false;
          let validationResult = false;

          const isSpecialProvider = providerConfig?.isSpecial;

          if (isSpecialProvider) {
            hasData = true;
            validationResult = true;
          } else if (finalConfigType === 'storage' && data.providerType === 'local') {
            hasData = true;
            validationResult = true;
          } else if (finalConfigType === 'url') {
            hasData = !!(data.frontendUrl?.trim() || data.connectorUrl?.trim());
            validationResult = hasData ? isValid : true;
          } else {
            const nonMetaKeys = Object.keys(data).filter(
              (key) => key !== 'providerType' && key !== 'modelType' && key !== '_provider'
            );

            hasData = nonMetaKeys.some((key) => {
              const value = data[key];
              return value && value.toString().trim() !== '';
            });

            if (isRequired) {
              validationResult = hasData && isValid;
            } else {
              validationResult = hasData ? isValid : true;
            }
          }

          onValidationChange(validationResult, hasData ? data : null);
        }, 100);

        return () => clearTimeout(timeoutId);
      });

      return () => subscription.unsubscribe();
    }

    return () => {};
  }, [
    watch,
    isValid,
    isRequired,
    onValidationChange,
    stepperMode,
    finalConfigType,
    providerConfig,
    currentProvider,
  ]);

  // Regular validation change handler for non-stepper mode
  useEffect(() => {
    if (!stepperMode) {
      if (isSwitchingProvider) return () => {};

      const handler = setTimeout(() => {
        const isLegacyModelType = ['llm', 'embedding'].includes(finalConfigType);
        const shouldReportValid = isLegacyModelType
          ? isValid && isEditing && !isSwitchingProvider
          : isRequired
            ? isValid
            : isValid && isEditing;

        onValidationChange(shouldReportValid && !isSwitchingProvider);
      }, 100);

      return () => clearTimeout(handler);
    }
    return () => {};
  }, [
    stepperMode,
    isValid,
    isEditing,
    onValidationChange,
    isSwitchingProvider,
    isRequired,
    finalConfigType,
  ]);

  // Config loading for non-stepper mode
  const fetchConfig = React.useCallback(
    async (forceRefresh = false) => {
      if (!stepperMode && (!formDataLoaded || forceRefresh)) {
        setIsLoading(true);
        try {
          const config = await getConfig();
          setFetchError(false);

          if (config) {
            originalApiConfigRef.current = config;

            const providerType = config.providerType || config.modelType;
            if (providerType && providerType !== currentProvider) {
              switchProvider(providerType, null);
            }
            initializeForm(config);
          }
          setFormDataLoaded(true);
        } catch (error) {
          console.error(`Failed to load ${finalConfigType} configuration:`, error);
          setFetchError(true);
          setSaveError('Failed to load configuration. View-only mode enabled.');
        } finally {
          setIsLoading(false);
        }
      }
    },
    [
      stepperMode,
      formDataLoaded,
      getConfig,
      finalConfigType,
      switchProvider,
      initializeForm,
      currentProvider,
    ]
  );

  // Expose methods to parent component
  useImperativeHandle(ref, () => {
    const handleSaveImpl = async (): Promise<SaveResult> => {
      if (stepperMode) {
        // Stepper mode validation without saving
        const formData = getValues();

        if (providerConfig?.isSpecial) {
          return { success: true };
        }

        if (finalConfigType === 'storage' && formData.providerType === 'local') {
          return { success: true };
        }

        const hasData =
          Object.keys(formData).filter(
            (key) =>
              key !== 'providerType' &&
              key !== 'modelType' &&
              key !== '_provider' &&
              formData[key] &&
              formData[key].toString().trim() !== ''
          ).length > 0;

        if (isRequired) {
          if (hasData && isValid) {
            return { success: true };
          }
          if (!hasData) {
            return {
              success: false,
              error: 'This configuration is required. Please complete all required fields.',
            };
          }
          return { success: false, error: 'Please complete all required fields correctly.' };
        }

        if (!hasData || (hasData && isValid)) {
          return { success: true };
        }
        return {
          success: false,
          error: 'Please complete all required fields or leave empty to skip.',
        };
      }

      // Regular save mode
      try {
        setIsSaving(true);
        setSaveError(null);
        setFormSubmitSuccess(false);

        return await new Promise<SaveResult>((resolve) => {
          handleSubmit(async (data: any) => {
            try {
              const isLegacyModelType = ['llm', 'embedding'].includes(finalConfigType);
              const saveData = {
                ...data,
                [isLegacyModelType ? 'modelType' : 'providerType']: currentProvider,
                _provider: currentProvider,
              };

              await updateConfig(saveData);

              if (onSaveSuccess) {
                onSaveSuccess();
              }

              setFormSubmitSuccess(true);
              setIsEditing(false);

              // Store for legacy mode cancel functionality
              if (isLegacyModelType) {
                originalApiConfigRef.current = saveData;

                // Refresh config in legacy mode
                setTimeout(() => {
                  fetchConfig(true);
                }, 100);
              }

              resolve({ success: true });
            } catch (error: any) {
              console.error('Error saving configuration:', error);
              const errorMessage =
                error.response?.data?.message ||
                error.message ||
                `Failed to save ${providerConfig?.label} configuration`;
              setSaveError(errorMessage);
              resolve({ success: false, error: errorMessage });
            } finally {
              setIsSaving(false);
            }
          })();
        });
      } catch (error) {
        setIsSaving(false);
        return {
          success: false,
          error: 'Unexpected error occurred during save operation',
        };
      }
    };

    // ✅ FIXED: Return all methods including aliases in one place
    return {
      handleSave: handleSaveImpl,

      getFormData: async (): Promise<any> => {
        const formData = getValues();
        const isLegacyModelType = ['llm', 'embedding'].includes(finalConfigType);
        return {
          ...formData,
          [isLegacyModelType ? 'modelType' : 'providerType']: currentProvider,
          _provider: currentProvider,
        };
      },

      validateForm: async (): Promise<boolean> => {
        const formData = getValues();

        if (providerConfig?.isSpecial) {
          return true;
        }

        if (finalConfigType === 'storage' && formData.providerType === 'local') {
          return true;
        }

        const nonMetaKeys = Object.keys(formData).filter(
          (key) => key !== 'providerType' && key !== 'modelType' && key !== '_provider'
        );

        const hasData = nonMetaKeys.some((key) => {
          const value = formData[key];
          return value && value.toString().trim() !== '';
        });

        if (isRequired) {
          return hasData && isValid;
        }
        return !hasData || isValid;
      },

      hasFormData: async (): Promise<boolean> => {
        const formData = getValues();

        if (providerConfig?.isSpecial) {
          return true;
        }

        if (finalConfigType === 'storage' && formData.providerType === 'local') {
          return true;
        }

        if (finalConfigType === 'url') {
          return !!(formData.frontendUrl?.trim() || formData.connectorUrl?.trim());
        }

        const nonMetaKeys = Object.keys(formData).filter(
          (key) => key !== 'providerType' && key !== 'modelType' && key !== '_provider'
        );

        return nonMetaKeys.some((key) => {
          const value = formData[key];
          return value && value.toString().trim() !== '';
        });
      },

      // Allow parent to rehydrate form with previously captured data (including provider)
      rehydrateForm: async (data: any): Promise<void> => {
        if (!data) return;
        const providerType = data.providerType || (data as any).modelType || currentProvider;
        if (providerType && resetToProvider) {
          resetToProvider(providerType, data);
        } else if (reset) {
          reset(data);
        }
      },

      handleSubmit: handleSaveImpl,
    };
  }, [
    stepperMode,
    getValues,
    providerConfig,
    finalConfigType,
    isRequired,
    isValid,
    handleSubmit,
    currentProvider,
    updateConfig,
    onSaveSuccess,
    fetchConfig,
    resetToProvider,
    reset,
  ]);

  // Add legacy method alias
  const refMethods = ref as any;
  if (refMethods?.current) {
    refMethods.current.handleSubmit = refMethods.current.handleSave;
  }

  useEffect(() => {
    if (!stepperMode && !formDataLoaded) {
      fetchConfig();
    }
  }, [fetchConfig, stepperMode, formDataLoaded]);

  // Height tracking for smooth transitions
  useEffect(() => {
    if (formContainerRef.current && !isSwitchingProvider && !isLoading) {
      const timer = setTimeout(() => {
        if (formContainerRef.current) {
          const { height } = formContainerRef.current.getBoundingClientRect();
          if (height > 0) {
            setProviderHeights((prev) => ({
              ...prev,
              [currentProvider]: height,
            }));
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
    return () => {};
  }, [currentProvider, isSwitchingProvider, isLoading, formDataLoaded]);

  // Auto-clear save errors
  useEffect(() => {
    if (saveError) {
      const timer = setTimeout(() => setSaveError(null), 5000);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [saveError]);

  // Event handlers
  const handleProviderChange = (value: string) => {
    const selectedProvider = providers.find((p: any) => p.id === value);
    if (selectedProvider && selectedProvider.id !== currentProvider) {
      // Call the callback to notify parent of provider change
      if (onProviderChange) {
        onProviderChange(selectedProvider.id);
      } else {
        switchProvider(selectedProvider.id);
      }
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      setIsEditing(false);
      setSaveError(null);
      setFormSubmitSuccess(false);

      const isLegacyModelType = ['llm', 'embedding'].includes(finalConfigType);
      if (isLegacyModelType && originalApiConfigRef.current) {
        // For legacy model types, reset to the original configuration
        const originalProvider =
          originalApiConfigRef.current.providerType || originalApiConfigRef.current.modelType;
        if (resetToProvider && originalProvider) {
          resetToProvider(originalProvider, originalApiConfigRef.current);
        }
      } else if (!stepperMode) {
        // Reload config for non-legacy types
        fetchConfig(true);
      }
    } else {
      setIsEditing(true);
    }
  };

  const getTransitionHeight = () => {
    if (isSwitchingProvider && providerHeights[currentProvider]) {
      return providerHeights[currentProvider];
    }
    return providerHeights[currentProvider] || 'auto';
  };

  // Generate default description based on config type
  const getDefaultDescription = () => {
    switch (finalConfigType) {
      case 'llm':
        return 'Configure your LLM model to enable AI capabilities in your application.';
      case 'embedding':
        return 'Configure your embedding model to enable semantic search and document retrieval in your application.';
      case 'storage':
        return 'Configure your storage settings for file management.';
      case 'smtp':
        return 'Configure SMTP settings for email notifications.';
      case 'url':
        return 'Configure the public URLs for your services.';
      default:
        return `Configure your ${String(finalConfigType).toUpperCase()} settings.`;
    }
  };

  // Render form fields
  const renderFieldStructure = () => {
    if (!providerConfig) {
      return (
        <div className="col-span-12">
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              No provider configuration found. Please check the provider setup.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // Handle special providers (like default)
    if (providerConfig.isSpecial || currentProvider === 'default') {
      return (
        <div className="col-span-12">
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>{providerConfig.description}</AlertDescription>
          </Alert>
        </div>
      );
    }

    const fieldsToRender = providerConfig.allFields || [];

    if (fieldsToRender.length === 0) {
      return (
        <div className="col-span-12">
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              No fields configured for this provider. Please check the provider configuration.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return fieldsToRender.map((field: any) => {
      const gridSize = field.gridSize || {
        xs: 12,
        md: 6,
      };
      const colSpan = gridSize.xs === 12 ? 'col-span-12' : 'col-span-12 md:col-span-6';

      return (
        <div key={`${field.name}-${formInstanceKey.current}`} className={colSpan}>
          <DynamicField
            name={field.name}
            label={field.label}
            control={control}
            isEditing={isEditing}
            isDisabled={fetchError || isSwitchingProvider}
            type={field.type || 'text'}
            placeholder={field.placeholder || ''}
            icon={field.icon}
            required={field.required}
            options={field.options}
            multiline={field.multiline}
            rows={field.rows}
            modelPlaceholder={field.name === 'model' ? providerConfig.modelPlaceholder : undefined}
            acceptedFileTypes={field.acceptedFileTypes}
            maxFileSize={field.maxFileSize}
            fileProcessor={field.fileProcessor}
            onFileProcessed={(data, fileName) => {
              // Handle file processing results
              if (field.fileProcessor && data) {
                Object.keys(data).forEach((key) => {
                  if (key !== field.name) {
                    // Auto-populate other fields from file data
                    const otherField = fieldsToRender.find((f: any) => f.name === key);
                    // Could implement auto-population logic here
                  }
                });
              }
            }}
          />
        </div>
      );
    });
  };

  // Loading state for initial load
  if (!stepperMode && isLoading && !formDataLoaded) {
    return (
      <div className="flex justify-center my-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative" key={formInstanceKey.current}>
      {/* Info message */}
      <Alert className="mb-6 p-4 border-blue-500/20 bg-blue-500/5">
        <Info className="h-5 w-5 text-blue-500" />
        <AlertDescription className="text-sm text-muted-foreground">
          {infoMessage || description || getDefaultDescription()}
          {providerConfig?.description && ` ${providerConfig.description}`}
          {fetchError && ' (View-only mode due to connection error)'}
        </AlertDescription>
      </Alert>

      {/* Edit button (only for non-stepper mode) */}
      {!stepperMode && !fetchError && (
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleToggleEdit}
            variant={isEditing ? 'destructive' : 'default'}
            size="sm"
            disabled={isSaving}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      )}

      {/* Form container with transition support */}
      <div
        ref={formContainerRef}
        className={cn(
          'relative mb-4 transition-all duration-300 ease-in-out',
          isSwitchingProvider && 'overflow-hidden'
        )}
        style={isSwitchingProvider ? { height: getTransitionHeight() } : undefined}
      >
        {/* Provider selector (show if multiple providers) */}
        {providers.length > 1 && (
          <div className="mb-4">
            <Select
              value={currentProvider}
              onValueChange={handleProviderChange}
              disabled={!isEditing || fetchError || isSwitchingProvider}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Provider Type" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider: any) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Form fields content area with cross-fade transition */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {!isSwitchingProvider && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative w-full"
              >
                <div className="grid grid-cols-12 gap-5">{renderFieldStructure()}</div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Switching provider overlay */}
          <AnimatePresence>
            {isSwitchingProvider && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-10 rounded"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Switching to{' '}
                    {providers.find((p: any) => p.id === currentProvider)?.label || 'new provider'}
                    ...
                  </p>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Error/Success alerts */}
      {saveError && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {formSubmitSuccess && !saveError && (
        <Alert className="mt-6 border-green-500/20 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Configuration saved successfully.</AlertDescription>
        </Alert>
      )}

      {/* Documentation link */}
      {documentationUrl && (
        <Alert className="my-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Refer to{' '}
            <a
              href={documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              the documentation
            </a>{' '}
            for more information.
          </AlertDescription>
        </Alert>
      )}

      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-[1000] rounded">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium">Saving configuration...</p>
        </div>
      )}

      {/* Loading indicator for data refresh */}
      {isLoading && formDataLoaded && (
        <div className="flex justify-center my-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
});

DynamicForm.displayName = 'DynamicForm';

export default DynamicForm;
