import { z } from 'zod';

import { FIELD_TEMPLATES } from './field-template';

import type { FieldTemplate, FieldTemplateName } from './field-template';

export interface FieldConfig {
  name: FieldTemplateName;
  required?: boolean; // Optional, defaults to template's required value
  defaultValue?: any;
  placeholder?: string; // Optional placeholder text for the field
}

export interface ProviderConfig {
  id: string;
  label: string;
  description?: string;
  modelPlaceholder?: string;
  fields?: readonly (FieldTemplateName | FieldConfig)[];
  customFields?: Record<string, Partial<FieldTemplate>>;
  customValidation?: (fields: any) => z.ZodType;
  isSpecial?: boolean;
  accountType?: 'individual' | 'business';
}

export const createUrlValidator = (optional: boolean = true) => {
  const baseValidator = z.string().refine(
    (val) => {
      if (!val || val.trim() === '') return optional;
      try {
        const url = new URL(val);
        return !!url;
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid URL' }
  );

  return optional ? baseValidator.optional().or(z.literal('')) : baseValidator;
};

export const URL_VALIDATOR = createUrlValidator(true);

export const ENHANCED_FIELD_TEMPLATES = {
  ...FIELD_TEMPLATES,
  baseUrl: {
    name: 'baseUrl',
    label: 'Base URL (Optional)',
    type: 'url' as const,
    placeholder: 'http://localhost:3000/files',
    icon: 'linkIcon', // Assuming you import this
    required: false,
    validation: URL_VALIDATOR, // ✅ Use the reusable validator
    gridSize: { xs: 12, sm: 6 },
  },
} as const;

// LLM PROVIDERS
export const LLM_PROVIDERS: readonly ProviderConfig[] = [
  {
    id: 'openAI',
    label: 'OpenAI API',
    description: 'Enter your OpenAI API credentials to get started.',
    modelPlaceholder: 'e.g., gpt-4o-mini, gpt-4o',
    fields: ['apiKey', 'model', { name: 'temperature', required: false, placeholder: '0.0 - 1.0 (default: 0.4)' }],
  },
  {
    id: 'azureOpenAI',
    label: 'Azure OpenAI Service',
    description: 'You need an active Azure subscription with Azure OpenAI Service enabled.',
    modelPlaceholder: 'e.g., gpt-4o-mini, gpt-4o',
    fields: ['endpoint', 'apiKey', 'deploymentName', 'model', { name: 'temperature', required: false, placeholder: '0.0 - 1.0 (default: 0.4)' }],
    customFields: {
      endpoint: {
        placeholder: 'e.g., https://your-resource.openai.azure.com/',
      },
    },
  },
  {
    id: 'openAICompatible',
    label: 'OpenAI API Compatible',
    description: 'Enter your OpenAI-compatible API credentials to get started.',
    modelPlaceholder: 'e.g. deepseek-ai/DeepSeek-V3',
    fields: ['endpoint', 'apiKey', 'model', { name: 'temperature', required: false, placeholder: '0.0 - 1.0 (default: 0.4)' }],
    customFields: {
      endpoint: {
        placeholder: 'e.g., https://api.together.xyz/v1/',
      },
    },
  },
] as const;

// EMBEDDING PROVIDERS
export const EMBEDDING_PROVIDERS: readonly ProviderConfig[] = [
  {
    id: 'default',
    label: 'Default (System Provided)',
    description:
      'Using the default embedding model provided by the system. No additional configuration required.',
    isSpecial: true,
  },
  {
    id: 'openAI',
    label: 'OpenAI API',
    description: 'Enter your OpenAI API credentials for embeddings.',
    modelPlaceholder: 'e.g., text-embedding-3-small, text-embedding-3-large',
    fields: ['apiKey', 'model'],
  },
  {
    id: 'azureOpenAI',
    label: 'Azure OpenAI Service',
    description: 'Configure Azure OpenAI for embeddings.',
    modelPlaceholder: 'e.g., text-embedding-3-small',
    fields: ['endpoint', 'apiKey', 'deploymentName', 'model'],
    customFields: {
      endpoint: {
        placeholder: 'e.g., https://your-resource.openai.azure.com/',
      },
    },
  },
  {
    id: 'sentenceTransformers',
    label: 'Sentence Transformers',
    description: 'Use local Sentence Transformers models (no API key required).',
    modelPlaceholder: 'e.g., all-MiniLM-L6-v2',
    fields: ['model'],
  }
] as const;

// STORAGE PROVIDERS
export const STORAGE_PROVIDERS: readonly ProviderConfig[] = [
  {
    id: 'local',
    label: 'Local Storage',
    description: 'Store files locally on the server. Additional options are optional.',
    fields: ['mountName', 'baseUrl'],
    customValidation: () =>
      z.object({
        providerType: z.literal('local'),
        modelType: z.literal('local'),
      }),
  },
  {
    id: 's3',
    label: 'Amazon S3',
    description: 'Configure Amazon S3 storage for your application data.',
    fields: ['s3AccessKeyId', 's3SecretAccessKey', 's3Region', 's3BucketName'],
  },
  {
    id: 'azureBlob',
    label: 'Azure Blob Storage',
    description: 'Configure Azure Blob Storage for your application data.',
    fields: ['accountName', 'accountKey', 'containerName', 'endpointProtocol', 'endpointSuffix'],
  },
] as const;

// SMTP PROVIDERS
export const SMTP_PROVIDERS: readonly ProviderConfig[] = [
  {
    id: 'smtp',
    label: 'SMTP Configuration',
    description: 'Configure SMTP settings for email notifications.',
    fields: ['host', 'port', 'fromEmail', 'username', 'password'],
  },
] as const;

// URL PROVIDERS
export const URL_PROVIDERS: readonly ProviderConfig[] = [
  {
    id: 'urls',
    label: 'Public URLs',
    description: 'Configure the public URLs for your services.',
    fields: ['frontendUrl', 'connectorUrl'],
  },
] as const;