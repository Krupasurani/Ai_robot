import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';
import { InputField } from 'src/components/ui/input-field';
import { PasswordField } from 'src/components/ui/password-field';
import { SelectField } from 'src/components/ui/select-field';

import type { EmbeddingFormValues } from './types';

// Define common model configurations to reduce repetition
const modelConfigs = {
  // Models requiring API key and model name only
  standardApiKeyModels: ['openai'] as const,
  // Models requiring endpoint, API key, and model name
  endpointModels: ['azureOpenAI', 'openAICompatible'] as const,
  // Models requiring model name only
  modelOnlyModels: ['sentenceTransformers'] as const,
  // Default model (no configuration needed)
  defaultModel: 'default' as const,
};

// Helper type for model types
type ModelType =
  | (typeof modelConfigs.standardApiKeyModels)[number]
  | (typeof modelConfigs.endpointModels)[number]
  | (typeof modelConfigs.modelOnlyModels)[number]
  | typeof modelConfigs.defaultModel;

// Model-specific placeholders for better UI guidance
const modelPlaceholders = {
  openai: 'e.g., text-embedding-3-small, text-embedding-3-large',
  openAICompatible: 'e.g., text-embedding-3-large (with compatible endpoint)',
  azureOpenAI: 'e.g., text-embedding-3-small',
  sentenceTransformers: 'e.g., all-MiniLM-L6-v2',
};

// Create schemas for each model type
const createApiKeyModelSchema = (modelType: (typeof modelConfigs.standardApiKeyModels)[number]) =>
  z.object({
    modelType: z.literal(modelType),
    apiKey: z.string().min(1, 'API Key is required'),
    model: z.string().min(1, 'Model is required'),
  });

// Zod schema for Azure OpenAI embedding validation
const azureEmbeddingSchema = z.object({
  modelType: z.literal('azureOpenAI'),
  endpoint: z.string().min(1, 'Endpoint is required').url('Please enter a valid URL'),
  apiKey: z.string().min(1, 'API Key is required'),
  model: z.string().min(1, 'Model is required'),
});

// Zod schema for Sentence Transformers embedding validation
const sentenceTransformersEmbeddingSchema = z.object({
  modelType: z.literal('sentenceTransformers'),
  model: z.string().min(1, 'Model is required'),
  // apiKey is not required for sentenceTransformers
});

// Zod schema for Default option - no validation needed
const defaultEmbeddingSchema = z.object({
  modelType: z.literal('default'),
  // No other fields required for default
});

// Create schemas for API key models
const openaiEmbeddingSchema = createApiKeyModelSchema('openai');

// OpenAI-compatible embedding schema (endpoint + apiKey + model)
const openAICompatibleEmbeddingSchema = z.object({
  modelType: z.literal('openAICompatible'),
  endpoint: z.string().min(1, 'Endpoint is required').url('Please enter a valid URL'),
  apiKey: z.string().min(1, 'API Key is required'),
  model: z.string().min(1, 'Model is required'),
});

// Combined schema using discriminated union
const embeddingSchema = z.discriminatedUnion('modelType', [
  openaiEmbeddingSchema,
  azureEmbeddingSchema,
  openAICompatibleEmbeddingSchema,
  sentenceTransformersEmbeddingSchema,
  defaultEmbeddingSchema,
]);

interface EmbeddingConfigStepProps {
  onSubmit: (data: EmbeddingFormValues) => void;
  onSkip: () => void;
  initialValues: EmbeddingFormValues | null;
}

const EmbeddingConfigStep: React.FC<EmbeddingConfigStepProps> = ({
  onSubmit,
  onSkip,
  initialValues,
}) => {
  const [modelType, setModelType] = useState<ModelType>(
    initialValues?.modelType || modelConfigs.defaultModel
  );

  // Get default values based on modelType
  const getDefaultValues = () => {
    // For models requiring endpoint + API key
    if (modelType === 'azureOpenAI') {
      return {
        modelType: 'azureOpenAI' as const,
        endpoint: initialValues?.endpoint || '',
        apiKey: initialValues?.apiKey || '',
        model: initialValues?.model || '',
      };
    }

    if (modelType === 'openAICompatible') {
      return {
        modelType: 'openAICompatible' as const,
        endpoint: initialValues?.endpoint || '',
        apiKey: initialValues?.apiKey || '',
        model: initialValues?.model || '',
      };
    }

    // For models requiring only model name
    if (modelType === 'sentenceTransformers') {
      return {
        modelType: 'sentenceTransformers' as const,
        model: initialValues?.model || '',
      };
    }

    // For default option (no config needed)
    if (modelType === 'default') {
      return {
        modelType: 'default' as const,
      };
    }

    // For standard API key models (OpenAI, Gemini, Cohere)
    if (modelConfigs.standardApiKeyModels.includes(modelType as any)) {
      return {
        modelType: modelType as any,
        apiKey: initialValues?.apiKey || '',
        model: initialValues?.model || '',
      };
    }

    // Fallback to default
    return {
      modelType: 'default' as const,
    };
  };

  const { control, handleSubmit, reset, trigger, watch } = useForm<EmbeddingFormValues>({
    resolver: zodResolver(embeddingSchema),
    mode: 'onChange', // Validate on change
    defaultValues: getDefaultValues(),
  });

  // Watch the current modelType for conditional rendering
  const currentModelType = watch('modelType');

  // Handle model type change when it changes
  useEffect(() => {
    if (currentModelType && currentModelType !== modelType) {
      const newType = currentModelType as ModelType;
      setModelType(newType);

      // Reset form with appropriate fields based on the model type
      if (newType === 'azureOpenAI') {
        reset({
          modelType: 'azureOpenAI',
          endpoint: '',
          apiKey: '',
          model: '',
        });
      } else if (newType === 'openAICompatible') {
        reset({
          modelType: 'openAICompatible',
          endpoint: '',
          apiKey: '',
          model: '',
        });
      } else if (newType === 'sentenceTransformers') {
        reset({
          modelType: 'sentenceTransformers',
          model: '',
        });
      } else if (newType === 'default') {
        reset({
          modelType: 'default',
        });
      } else if (modelConfigs.standardApiKeyModels.includes(newType as any)) {
        // Handle all standard API key models
        reset({
          modelType: newType as any,
          apiKey: '',
          model: '',
        });
      }
    }
  }, [currentModelType]);

  // Initialize form with initial values if available
  useEffect(() => {
    if (initialValues) {
      setModelType(initialValues.modelType);
      reset(initialValues);
      // Validate initial values
      setTimeout(() => {
        trigger();
      }, 0);
    }
  }, [initialValues, reset, trigger]);

  // Expose methods for external validation and submission
  useEffect(() => {
    // Method to check if form has any input
    window.hasEmbeddingInput = () => {
      // If using default or sentenceTransformers, consider it as having input
      if (modelType === 'default' || modelType === 'sentenceTransformers') {
        return true;
      }

      const values = getDefaultValues();
      return Object.values(values).some(
        (val) => typeof val === 'string' && val.trim() !== '' && val !== values.model
      );
    };

    // Method to validate and submit the form programmatically
    window.submitEmbeddingForm = async () => {
      // If using default option, always consider it valid
      if (modelType === 'default') {
        const data = { modelType: 'default' };
        onSubmit(data as EmbeddingFormValues);
        return true;
      }

      // Otherwise trigger validation for all fields
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

    // Method to check if the form is valid
    window.isEmbeddingFormValid = async () => {
      // Default is always valid
      if (modelType === 'default') {
        return true;
      }

      return trigger();
    };

    return () => {
      // Clean up when component unmounts
      delete window.submitEmbeddingForm;
      delete window.isEmbeddingFormValid;
      delete window.hasEmbeddingInput;
    };
    // eslint-disable-next-line
  }, [handleSubmit, onSubmit, trigger, modelType]);

  // Direct form submission handler
  const onFormSubmit = (data: EmbeddingFormValues) => {
    onSubmit(data);
  };

  // Helper to check model types for rendering decisions
  const needsApiKey =
    modelConfigs.standardApiKeyModels.includes(currentModelType as any) ||
    currentModelType === 'azureOpenAI';
  const needsEndpoint = modelConfigs.endpointModels.includes(currentModelType as any);
  const needsModel = currentModelType !== 'default';

  return (
    <form
      id="embedding-config-form"
      onSubmit={handleSubmit(onFormSubmit)}
      noValidate
      className="px-2 mb-2"
    >
      <div className="mb-2">
        <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
          Embeddings Configuration
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Configure the embedding model for generating text embeddings in your application.
          Embeddings are used for semantic search and document retrieval.
        </p>
      </div>

      <div className="mb-3 rounded-md border border-blue-200 flex gap-2 items-center  bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-950/50 dark:text-blue-200">
        <AlertCircle className="text-blue-400" size={24} />
        Select the embedding provider to use. You can use the default system embeddings or configure
        a specific provider. All fields marked * with are required for the selected provider.
      </div>

      <div className="space-y-4">
        <div>
          <SelectField
            control={control}
            name="modelType"
            label="Provider"
            placeholder="Select a provider"
            required
            options={[
              { value: 'default', label: 'Default' },
              { value: 'sentenceTransformers', label: 'Sentence Transformer' },
              { value: 'openai', label: 'OpenAI' },
              { value: 'azureOpenAI', label: 'Azure OpenAI' },
              { value: 'gemini', label: 'Gemini' },
              { value: 'cohere', label: 'Cohere' },
            ]}
            className="mb-0"
          />
        </div>

        {/* Show message for default option */}
        {currentModelType === 'default' && (
          <div className="mt-1">
            <Alert className="bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-400/20 text-green-800 dark:text-green-200">
              <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription>
                Using default system embeddings. No additional configuration required.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Optional Endpoint field for models that need it */}
        {needsEndpoint && (
          <div>
            <InputField
              control={control}
              name="endpoint"
              label="Endpoint"
              placeholder="e.g., https://your-resource-name.openai.azure.com/"
              required
              className="mb-0"
            />
          </div>
        )}

        {/* API Key field - only show for models that need it */}
        {needsApiKey && (
          <div>
            <PasswordField
              control={control}
              name="apiKey"
              label="API Key"
              placeholder="Enter your API key"
              required
              showIcon={false}
              className="mb-0"
            />
          </div>
        )}

        {/* Model field - show for all except default */}
        {needsModel && (
          <div>
            <InputField
              control={control}
              name="model"
              label="Embedding Model"
              placeholder={
                modelPlaceholders[currentModelType as keyof typeof modelPlaceholders] ||
                'Enter model name'
              }
              required
              description={
                modelPlaceholders[currentModelType as keyof typeof modelPlaceholders] ||
                'Enter model name'
              }
              className="mb-0"
            />
          </div>
        )}
      </div>

      {/* This hidden submit button ensures the form can be submitted programmatically */}
      <Button type="submit" className="hidden" id="embedding-form-submit-button">
        Submit
      </Button>
    </form>
  );
};

// Declare the window method types for external validation calls
declare global {
  interface Window {
    submitEmbeddingForm?: () => Promise<boolean>;
    isEmbeddingFormValid?: () => Promise<boolean>;
    hasEmbeddingInput?: () => boolean;
  }
}

export default EmbeddingConfigStep;
