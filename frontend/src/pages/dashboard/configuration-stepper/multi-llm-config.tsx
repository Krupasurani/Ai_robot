import { z } from 'zod';
import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import addIcon from '@iconify-icons/mdi/plus';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { PasswordField } from '@/components/ui/password-field';
import robotIcon from '@iconify-icons/mdi/robot';
import deleteIcon from '@iconify-icons/mdi/delete';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Iconify } from 'src/components/iconify';
import { LLM_ROLES } from './types';

import type {
  LlmRole,
  ProviderType,
  LlmFormValues,
  MultiLlmFormValues,
  AzureLlmFormValues,
  OpenAILlmFormValues,
  OpenAICompatibleLlmFormValues,
} from './types';

// Zod schema for individual LLM validation
const baseLlmSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(1).optional(),
  role: z.enum(['llm', 'slm', 'reasoning', 'multimodal', 'deepresearch']).optional(),
});

const openaiSchema = z
  .object({
    modelType: z.literal('openai'),
  })
  .merge(baseLlmSchema);

const azureSchema = z
  .object({
    modelType: z.literal('azure'),
    endpoint: z.string().min(1, 'Endpoint is required').url('Please enter a valid URL'),
    deploymentName: z.string().min(1, 'Deployment Name is required'),
  })
  .merge(baseLlmSchema);

const openAICompatibleSchema = z
  .object({
    modelType: z.literal('openAICompatible'),
    endpoint: z.string().min(1, 'Endpoint is required').url('Please enter a valid URL'),
  })
  .merge(baseLlmSchema);

// Combined schema using discriminated union
const llmSchema = z.discriminatedUnion('modelType', [
  openaiSchema,
  azureSchema,
  openAICompatibleSchema,
]);

// Multi-LLM schema with role uniqueness validation
const multiLlmSchema = z
  .object({
    llmConfigs: z.array(llmSchema).min(1, 'At least one LLM configuration is required'),
  })
  .refine(
    (data) => {
      // Check for duplicate roles
      const roles = data.llmConfigs.map((config) => config.role).filter(Boolean);
      const uniqueRoles = new Set(roles);
      return roles.length === uniqueRoles.size;
    },
    {
      message: 'Each role can only be assigned to one LLM configuration',
      path: ['llmConfigs'],
    }
  );

interface MultiLlmConfigStepProps {
  onSubmit: (data: MultiLlmFormValues) => void;
  onSkip: () => void;
  initialValues: MultiLlmFormValues | null;
}

const MultiLlmConfigStep: React.FC<MultiLlmConfigStepProps> = ({
  onSubmit,
  onSkip,
  initialValues,
}) => {
  // Get default LLM configuration
  const getDefaultLlmConfig = (
    role: LlmRole = 'llm',
    modelType: ProviderType = 'openai'
  ): LlmFormValues => {
    const baseConfig = {
      apiKey: '',
      model: '',
      temperature: 0.4,
      role,
    };

    switch (modelType) {
      case 'azure':
        return {
          modelType: 'azure',
          endpoint: '',
          deploymentName: '',
          ...baseConfig,
        } as AzureLlmFormValues;
      case 'openAICompatible':
        return {
          modelType: 'openAICompatible',
          endpoint: '',
          ...baseConfig,
        } as OpenAICompatibleLlmFormValues;
      default:
        return {
          modelType: 'openai',
          ...baseConfig,
        } as OpenAILlmFormValues;
    }
  };

  const form = useForm<MultiLlmFormValues>({
    resolver: zodResolver(multiLlmSchema),
    mode: 'onChange',
    defaultValues: initialValues || {
      llmConfigs: [getDefaultLlmConfig('llm', 'openai')],
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    trigger,
    watch,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'llmConfigs',
  });

  // Initialize form with initial values if available
  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
      setTimeout(() => {
        trigger();
      }, 0);
    }
  }, [initialValues, reset, trigger]);

  // Expose submit method to parent component
  useEffect(() => {
    (window as any).submitMultiLlmForm = async () => {
      const isFormValid = await trigger();
      if (isFormValid) {
        const formSubmitHandler = handleSubmit((data) => {
          onSubmit(data);
          return true;
        });
        formSubmitHandler();
        return true;
      }
      return false;
    };

    return () => {
      delete (window as any).submitMultiLlmForm;
    };
  }, [handleSubmit, onSubmit, trigger]);

  // Handle adding new LLM configuration
  const handleAddLlm = () => {
    const currentConfigs = watch('llmConfigs');
    const usedRoles = currentConfigs.map((config) => config.role).filter(Boolean) as LlmRole[];
    const availableRoles = LLM_ROLES.filter((role) => !usedRoles.includes(role.value));
    const nextRole: LlmRole = availableRoles.length > 0 ? availableRoles[0].value : 'llm';

    append(getDefaultLlmConfig(nextRole, 'openai'));
  };

  // Handle removing LLM configuration
  const handleRemoveLlm = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Get provider-specific fields
  const getProviderFields = (index: number, modelType: ProviderType) => {
    switch (modelType) {
      case 'azure':
        return (
          <>
            <div className="col-span-12 md:col-span-6">
              <InputField
                control={control}
                name={`llmConfigs.${index}.endpoint`}
                label="Endpoint"
                placeholder="e.g., https://your-resource-name.openai.azure.com/"
                required
                description="e.g., https://your-resource-name.openai.azure.com/"
                className="mb-0"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <InputField
                control={control}
                name={`llmConfigs.${index}.deploymentName`}
                label="Deployment Name"
                required
                className="mb-0"
              />
            </div>
          </>
        );
      case 'openAICompatible':
        return (
          <div className="col-span-12 md:col-span-6">
            <InputField
              control={control}
              name={`llmConfigs.${index}.endpoint`}
              label="Endpoint"
              placeholder="e.g., https://api.together.xyz/v1/"
              required
              description="e.g., https://api.together.xyz/v1/"
              className="mb-0"
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Get model placeholder based on provider type
  const getModelPlaceholder = (modelType: ProviderType) => {
    switch (modelType) {
      case 'openai':
        return 'e.g., gpt-4-turbo, gpt-4o';
      case 'openAICompatible':
        return 'e.g., deepseek-ai/DeepSeek-V3';
      case 'azure':
        return 'e.g., gpt-4o';
      default:
        return 'Enter model name';
    }
  };

  // Direct form submission handler
  const onFormSubmit = (data: MultiLlmFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form id="multi-llm-config-form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
        <div className="mb-2">
          <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
            Large Language Models Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Configure multiple AI models with different roles and providers to enable advanced AI
            features.
          </p>
        </div>

        <div className="mb-4 rounded-md border border-blue-200 items-center  flex gap-2 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-950/50 dark:text-blue-200">
          <AlertCircle className="text-blue-400" size={24} />
          At least one LLM configuration is required. You can configure multiple models for
          different roles and use cases.
        </div>

        {/* LLM Configurations */}
        {fields.map((field, index) => {
          const modelType = watch(`llmConfigs.${index}.modelType`);
          const role = watch(`llmConfigs.${index}.role`);
          const roleConfig = LLM_ROLES.find((r) => r.value === role);

          return (
            <Card
              key={field.id}
              className="mb-2 border border-gray-200/20 dark:border-gray-700/20 bg-white/10 dark:bg-gray-800/10"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded"
                    style={{
                      backgroundColor: roleConfig ? `${roleConfig.color}20` : '#3b82f620',
                      color: roleConfig?.color || '#3b82f6',
                    }}
                  >
                    <Iconify icon={roleConfig?.icon || robotIcon} width={22} height={22} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">LLM Configuration {index + 1}</div>
                    {roleConfig && (
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded"
                        style={{
                          backgroundColor: `${roleConfig.color}20`,
                          color: roleConfig.color,
                        }}
                      >
                        {roleConfig.label}
                      </span>
                    )}
                  </div>
                </div>
                {fields.length > 1 && (
                  <Button
                    size="sm"
                    onClick={() => handleRemoveLlm(index)}
                    variant="destructive"
                    className="text-white"
                  >
                    <Iconify icon={deleteIcon} width={18} height={18} />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-12 gap-4">
                  {/* Role Selection */}
                  <div className="col-span-12 md:col-span-6">
                    <Controller
                      name={`llmConfigs.${index}.role`}
                      control={control}
                      render={({ field: roleField, fieldState }) => {
                        const selectedRole = LLM_ROLES.find((r) => r.value === roleField.value);
                        const currentConfigs = watch('llmConfigs');

                        return (
                          <div className="space-y-2">
                            <Label htmlFor={`role-${index}`} className="text-sm font-medium">
                              Role
                            </Label>
                            <Select
                              value={roleField.value || 'internal'}
                              onValueChange={roleField.onChange}
                            >
                              <SelectTrigger
                                className={`w-full ${fieldState.error ? 'border-red-500' : ''}`}
                              >
                                <SelectValue placeholder="Select a role">
                                  {selectedRole && (
                                    <div className="flex items-center gap-2 w-full">
                                      <Iconify
                                        icon={selectedRole.icon}
                                        width={16}
                                        height={16}
                                        style={{ color: selectedRole.color }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm">
                                          {selectedRole.label}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="w-[400px]">
                                {LLM_ROLES.map((roleOption) => {
                                  // Check if this role is used by other configs (excluding current one)
                                  const isUsedByOthers = currentConfigs.some(
                                    (config, configIdx) =>
                                      config.role === roleOption.value && configIdx !== index
                                  );

                                  return (
                                    <SelectItem key={roleOption.value} value={roleOption.value}>
                                      <div className="flex items-center gap-2 w-full">
                                        <Iconify
                                          icon={roleOption.icon}
                                          width={16}
                                          height={16}
                                          style={{ color: roleOption.color }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <div className="font-semibold text-sm truncate">
                                              {roleOption.label}
                                            </div>
                                            {isUsedByOthers && (
                                              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded flex-shrink-0">
                                                In Use
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 truncate">
                                            {roleOption.description}
                                          </p>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {fieldState.error && (
                              <p className="text-sm text-red-500">{fieldState.error.message}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                  </div>

                  {/* Provider Selection */}
                  <div className="col-span-12 md:col-span-6">
                    <Controller
                      name={`llmConfigs.${index}.modelType`}
                      control={control}
                      render={({ field: modelField, fieldState }) => (
                        <div className="space-y-2">
                          <Label htmlFor={`provider-${index}`} className="text-sm font-medium">
                            Provider *
                          </Label>
                          <Select
                            value={modelField.value || 'openai'}
                            onValueChange={(value) => {
                              const newType = value as ProviderType;
                              modelField.onChange(newType);

                              // Reset provider-specific fields when changing provider
                              const currentConfig = watch(`llmConfigs.${index}`);
                              const newConfig = getDefaultLlmConfig(currentConfig.role, newType);

                              // Keep the existing values for common fields
                              newConfig.apiKey = currentConfig.apiKey;
                              newConfig.model = currentConfig.model;
                              newConfig.temperature = currentConfig.temperature;
                              newConfig.role = currentConfig.role;

                              // Update the entire config for this index
                              setValue(`llmConfigs.${index}`, newConfig);

                              // Trigger validation for the updated config
                              trigger(`llmConfigs.${index}`);
                            }}
                          >
                            <SelectTrigger
                              className={`w-full ${fieldState.error ? 'border-red-500' : ''}`}
                            >
                              <SelectValue placeholder="Select a provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="azure">Azure OpenAI</SelectItem>
                              <SelectItem value="gemini">Gemini</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                              <SelectItem value="openAICompatible">
                                OpenAI API Compatible
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {fieldState.error && (
                            <p className="text-sm text-red-500">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  {/* Provider-specific fields */}
                  {getProviderFields(index, modelType)}

                  {/* Common fields */}
                  <div className="col-span-12 md:col-span-6">
                    <PasswordField
                      control={control}
                      name={`llmConfigs.${index}.apiKey`}
                      label="API Key"
                      placeholder="Enter your API key"
                      required
                      showIcon={false}
                      className="mb-0"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <InputField
                      control={control}
                      name={`llmConfigs.${index}.model`}
                      label="Model Name"
                      placeholder={getModelPlaceholder(modelType)}
                      required
                      description={getModelPlaceholder(modelType)}
                      className="mb-0"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <InputField
                      control={control}
                      name={`llmConfigs.${index}.temperature`}
                      label="Temperature"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      placeholder="0.4"
                      description="0.0 - 1.0 (default: 0.4)"
                      className="mb-0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add LLM Button */}
        <div className="flex justify-center mb-2">
          <Button
            variant="outline"
            onClick={handleAddLlm}
            className="border border-dashed border-gray-300 text-gray-500 hover:border-primary hover:bg-primary/5"
          >
            <Iconify icon={addIcon} />
            Add Another LLM Configuration
          </Button>
        </div>

        {/* Display validation errors */}
        {errors.llmConfigs && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {typeof errors.llmConfigs.message === 'string'
                ? errors.llmConfigs.message
                : 'Please fix the validation errors in the LLM configurations above.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Display role validation errors */}
        {errors.root && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        {/* Hidden submit button */}
        <Button type="submit" className="hidden" id="multi-llm-form-submit-button">
          Submit
        </Button>
      </form>
    </Form>
  );
};

export default MultiLlmConfigStep;
