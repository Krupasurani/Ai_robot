// LLM Role definitions - aligned with backend roles used for routing
export type LlmRole = 'llm' | 'slm' | 'reasoning' | 'multimodal' | 'deepresearch';

// Provider type definitions
export type ProviderType =
  | 'openai'
  | 'azure'
  | 'openAICompatible'
  | 'gemini'
  | 'anthropic';

// Base LLM configuration interface
export interface BaseLlmFormValues {
  modelType: ProviderType;
  apiKey: string;
  model: string;
  temperature?: number;
  role?: LlmRole;
}

// OpenAI specific fields
export interface OpenAILlmFormValues extends BaseLlmFormValues {
  modelType: 'openai';
}

export interface AdditionalProviderLlmFormValues extends BaseLlmFormValues {
  modelType: Exclude<ProviderType, 'azure' | 'openAICompatible' | 'openai'>;
}

// Removed unsupported providers (gemini, anthropic)

// Azure OpenAI specific fields
export interface AzureLlmFormValues extends BaseLlmFormValues {
  modelType: 'azure';
  endpoint: string;
  deploymentName: string;
}

// Open AI Compatible specific fields
export interface OpenAICompatibleLlmFormValues extends BaseLlmFormValues {
  modelType: 'openAICompatible';
  endpoint: string;
}

// Embedding configuration
export interface EmbeddingFormValues {
  modelType: 'openai' | 'azureOpenAI' | 'openAICompatible' | 'sentenceTransformers' | 'default';
  apiKey?: string;
  model: string;
  endpoint?: string; // Required for Azure and OpenAI-compatible
}

// Union type for LLM form values
export type LlmFormValues =
  | OpenAILlmFormValues
  | AdditionalProviderLlmFormValues
  | AzureLlmFormValues
  | OpenAICompatibleLlmFormValues;

export const storageTypes = {
  LOCAL: 'local',
  S3: 's3',
  AZURE_BLOB: 'azureBlob',
} as const;

export type StorageType = (typeof storageTypes)[keyof typeof storageTypes];

// Base storage configuration
export interface BaseStorageFormValues {
  storageType: StorageType;
}

// S3 storage configuration
export interface S3StorageFormValues extends BaseStorageFormValues {
  storageType: typeof storageTypes.S3;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Region: string;
  s3BucketName: string;
}

// Azure Blob storage configuration - Make endpointProtocol and endpointSuffix non-optional
export interface AzureBlobStorageFormValues extends BaseStorageFormValues {
  storageType: typeof storageTypes.AZURE_BLOB;
  endpointProtocol: 'http' | 'https'; // Remove optional
  accountName: string;
  accountKey: string;
  endpointSuffix: string; // Remove optional
  containerName: string;
}

// Local storage configuration
export interface LocalStorageFormValues extends BaseStorageFormValues {
  storageType: typeof storageTypes.LOCAL;
  mountName?: string;
  baseUrl?: string;
}

// Combined storage form values type
export type StorageFormValues =
  | S3StorageFormValues
  | AzureBlobStorageFormValues
  | LocalStorageFormValues;

// Connector form values
export interface ConnectorFormValues {
  googleWorkspace: {
    serviceCredentials: string;
    clientId?: string;
    clientEmail?: string;
    privateKey?: string;
    projectId?: string;
    clientSecret?: string;
    redirectUri?: string;
    adminEmail?: string;
    enableRealTimeUpdates?: boolean;
    topicName?: string;
  };
}

// SMTP form values
export interface SmtpFormValues {
  host: string;
  port: number;
  username?: string;
  password?: string;
  fromEmail: string;
}

// Multi-LLM configuration interface
export interface MultiLlmFormValues {
  llmConfigs: LlmFormValues[];
}

// Role configuration options (limited to backend-recognized roles)
export const LLM_ROLES = [
  {
    value: 'llm' as LlmRole,
    label: 'LLM',
    description: 'Primary large model for answer generation',
    icon: 'carbon:machine-learning-model',
    color: '#4CAF50',
  },
  {
    value: 'slm' as LlmRole,
    label: 'SLM',
    description: 'Small/light model for internal or cost-efficient tasks',
    icon: 'mdi:robot-outline',
    color: '#2196F3',
  },
  {
    value: 'reasoning' as LlmRole,
    label: 'Reasoning',
    description: 'Advanced reasoning and complex problem solving',
    icon: 'mdi:brain',
    color: '#FF9800',
  },
  {
    value: 'multimodal' as LlmRole,
    label: 'Multimodal',
    description: 'Vision or multi-input understanding (text+image, etc.)',
    icon: 'mdi:image-multiple-outline',
    color: '#9C27B0',
  },
  {
    value: 'deepresearch' as LlmRole,
    label: 'Deep Research',
    description: 'Advanced research and reasoning capabilities',
    icon: 'mdi:text-box-search-outline',
    color: '#FF9800',
  },
] as const;
