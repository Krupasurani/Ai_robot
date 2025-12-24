import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { cn } from '@/utils/cn';

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

import type {
  LlmFormValues,
  AzureLlmFormValues,
  OpenAILlmFormValues,
  OpenAICompatibleLlmFormValues,
} from './types';

// Zod schema for OpenAI validation with more descriptive error messages
const openaiSchema = z.object({
  modelType: z.literal('openai'),
  // clientId: z.string().min(1, 'Client ID is required'),
  apiKey: z.string().min(1, 'API Key is required'),
  model: z.string().min(1, 'Model is required'),
});

// Zod schema for Azure OpenAI validation with more descriptive error messages
const azureSchema = z.object({
  modelType: z.literal('azure'),
  endpoint: z.string().min(1, 'Endpoint is required').url('Please enter a valid URL'),
  apiKey: z.string().min(1, 'API Key is required'),
  deploymentName: z.string().min(1, 'Deployment Name is required'),
  model: z.string().min(1, 'Model is required'),
});

// Zod schema for OpenAI API Compatible validation with more descriptive error messages
const openAICompatibleSchema = z.object({
  modelType: z.literal('openAICompatible'),
  endpoint: z.string().min(1, 'Endpoint is required').url('Please enter a valid URL'),
  apiKey: z.string().min(1, 'API Key is required'),
  model: z.string().min(1, 'Model is required'),
});

// Combined schema using discriminated union
const llmSchema = z.discriminatedUnion('modelType', [
  openaiSchema,
  azureSchema,
  openAICompatibleSchema,
]);

interface LlmConfigStepProps {
  onSubmit: (data: LlmFormValues) => void;
  onSkip: () => void;
  initialValues: LlmFormValues | null;
}

const LlmConfigStep: React.FC<LlmConfigStepProps> = ({ onSubmit, onSkip, initialValues }) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [modelType, setModelType] = useState<
    'openai' | 'azure' | 'gemini' | 'anthropic' | 'openAICompatible'
  >(
    initialValues?.modelType &&
      ['openai', 'azure', 'openAICompatible'].includes(initialValues.modelType)
      ? initialValues.modelType
      : 'openai'
  );

  // Get default values based on modelType
  const getDefaultValues = () => {
    if (modelType === 'azure') {
      return {
        modelType: 'azure' as const,
        endpoint: (initialValues as AzureLlmFormValues)?.endpoint || '',
        apiKey: initialValues?.apiKey || '',
        deploymentName: (initialValues as AzureLlmFormValues)?.deploymentName || '',
        model: initialValues?.model || '',
      } as AzureLlmFormValues;
    }
    if (modelType === 'openAICompatible') {
      return {
        modelType: 'openAICompatible' as const,
        endpoint: (initialValues as OpenAICompatibleLlmFormValues)?.endpoint || '',
        apiKey: initialValues?.apiKey || '',
        model: initialValues?.model || '',
      } as OpenAICompatibleLlmFormValues;
    }
    // Remove unsupported providers (gemini, anthropic)
    return {
      modelType: 'openai' as const,
      // clientId: (initialValues as OpenAILlmFormValues)?.clientId || '',
      apiKey: initialValues?.apiKey || '',
      model: initialValues?.model || '',
    } as OpenAILlmFormValues;
  };

  const { control, handleSubmit, reset, trigger } = useForm<LlmFormValues>({
    resolver: zodResolver(llmSchema),
    mode: 'onChange', // Validate on change
    defaultValues: getDefaultValues(),
  });

  // Handle model type change
  const handleModelTypeChange = (newType: 'openai' | 'azure' | 'openAICompatible') => {
    setModelType(newType);
    reset(
      newType === 'azure'
        ? ({
            modelType: 'azure',
            endpoint: '',
            apiKey: '',
            deploymentName: '',
            model: '',
          } as AzureLlmFormValues)
        : newType === 'openAICompatible'
          ? ({
              modelType: 'openAICompatible',
              endpoint: '',
              apiKey: '',
              model: '',
            } as OpenAICompatibleLlmFormValues)
          : ({
              modelType: 'openai',
              // clientId: '',
              apiKey: '',
              model: '',
            } as OpenAILlmFormValues)
    );
  };

  // Initialize form with initial values if available
  useEffect(() => {
    if (initialValues) {
      const allowed: any = ['openai', 'azure', 'openAICompatible'];
      setModelType(
        allowed.includes(initialValues.modelType) ? (initialValues.modelType as any) : 'openai'
      );
      reset(initialValues);
      // Validate initial values
      setTimeout(() => {
        trigger();
      }, 0);
    }
  }, [initialValues, reset, trigger]);

  // Expose submit method to parent component with improved validation
  useEffect(() => {
    (window as any).submitLlmForm = async () => {
      // Trigger validation for all fields
      const isFormValid = await trigger();

      if (isFormValid) {
        // Use a simple trick to ensure the form submits directly
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

    return () => {
      delete (window as any).submitLlmForm;
    };
  }, [handleSubmit, onSubmit, trigger]);

  // Direct form submission handler
  const onFormSubmit = (data: LlmFormValues) => {
    onSubmit(data);
  };

  return (
    <form
      id="llm-config-form"
      onSubmit={handleSubmit(onFormSubmit)}
      noValidate
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-medium text-foreground">Large Language Model</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure OpenAI , Azure OpenAI or Gemini to enable AI features.
        </p>
      </div>

      <Alert>
        <AlertDescription>
          LLM configuration is required to proceed with setup. All fields marked with{' '}
          <span className="text-destructive">*</span> are required.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="modelType">Provider *</Label>
          <Controller
            name="modelType"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <Select
                  value={field.value}
                  onValueChange={(
                    value: 'openai' | 'azure' | 'gemini' | 'anthropic' | 'openAICompatible'
                  ) => {
                    field.onChange(value);
                    handleModelTypeChange(value as 'openai' | 'azure' | 'openAICompatible');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="openAICompatible">OpenAI API Compatible</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>

        {/* Azure OpenAI specific fields */}
        {modelType === 'azure' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint *</Label>
              <Controller
                name="endpoint"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-1">
                    <Input
                      {...field}
                      id="endpoint"
                      placeholder="e.g., https://your-resource-name.openai.azure.com/"
                      className={cn(
                        fieldState.error &&
                          'border-destructive focus:border-destructive focus:ring-destructive/30'
                      )}
                      onBlur={() => {
                        field.onBlur();
                        trigger('endpoint');
                      }}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deploymentName">Deployment Name *</Label>
              <Controller
                name="deploymentName"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-1">
                    <Input
                      {...field}
                      id="deploymentName"
                      className={cn(
                        fieldState.error &&
                          'border-destructive focus:border-destructive focus:ring-destructive/30'
                      )}
                      onBlur={() => {
                        field.onBlur();
                        trigger('deploymentName');
                      }}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
          </>
        )}

        {/* OpenAi API compatible fields */}
        {modelType === 'openAICompatible' && (
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint *</Label>
            <Controller
              name="endpoint"
              control={control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <Input
                    {...field}
                    id="endpoint"
                    placeholder="e.g., https://api.together.xyz/v1/"
                    className={cn(
                      fieldState.error &&
                        'border-destructive focus:border-destructive focus:ring-destructive/30'
                    )}
                    onBlur={() => {
                      field.onBlur();
                      trigger('endpoint');
                    }}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>
        )}

        {/* Common fields for both providers */}
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key *</Label>
          <Controller
            name="apiKey"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    {...field}
                    id="apiKey"
                    type={showPassword ? 'text' : 'password'}
                    className={cn(
                      'pr-10',
                      fieldState.error &&
                        'border-destructive focus:border-destructive focus:ring-destructive/30'
                    )}
                    onBlur={() => {
                      field.onBlur();
                      trigger('apiKey');
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model Name *</Label>
          <Controller
            name="model"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <Input
                  {...field}
                  id="model"
                  placeholder={
                    modelType === 'openai'
                      ? 'e.g., gpt-4-turbo'
                      : modelType === 'gemini'
                        ? 'e.g., gemini-2.0-flash'
                        : modelType === 'anthropic'
                          ? 'e.g., claude-3-7-sonnet-20250219'
                          : modelType === 'openAICompatible'
                            ? 'e.g., deepseek-ai/DeepSeek-V3'
                            : 'e.g., gpt-4o'
                  }
                  className={cn(
                    fieldState.error &&
                      'border-destructive focus:border-destructive focus:ring-destructive/30'
                  )}
                  onBlur={() => {
                    field.onBlur();
                    trigger('model');
                  }}
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* This hidden submit button ensures the form can be submitted programmatically */}
      <Button type="submit" className="hidden" id="llm-form-submit-button">
        Submit
      </Button>
    </form>
  );
};

export default LlmConfigStep;
