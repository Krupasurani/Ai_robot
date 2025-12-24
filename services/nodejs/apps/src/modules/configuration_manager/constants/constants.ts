export const storageTypes = {
  LOCAL: 'local',
  S3: 's3',
  GCP: 'gcp',
  AZURE_BLOB: 'azureBlob',
};

export const authTypes = {
  AZURE_AD: 'azureAd',
  SSO: 'sso',
  GOOGLE: 'google',
  MICROSOFT: 'microsoft',
};

export const keyValueStoreTypes = {
  REDIS: 'redis',
};

export const messageBrokerTypes = {
  KAFKA: 'kafka',
};

export const googleWorkspaceTypes = {
  INDIVIDUAL: 'individual',
  BUSINESS: 'business',
};

export const googleWorkspaceServiceTypes = {
  GOOGLE_DRIVE: 'googleDrive',
  GOOGLE_DOCS: 'googleDocs',
  GOOGLE_SHEETS: 'googleSheets',
  GOOGLE_SLIDES: 'googleSlides',
  GOOGLE_CALENDAR: 'googleCalendar',
  GOOGLE_CONTACTS: 'googleContacts',
  GOOGLE_MAIL: 'gmail',
};

export const aiModelsTypes = {
  OCR: 'ocr',
  EMBEDDING: 'embedding',
  SLM: 'slm',
  REASONING: 'reasoning',
  LLM: 'llm',
  MULTI_MODAL: 'multiModal',
  IMAGE_GENERATION: 'imageGeneration',
};

export const dbTypes = {
  MONGO_DB: 'mongodb',
  ARANGO_DB: 'arangodb',
};

export const aiModelRoute = `api/v1/configurationManager/internal/aiModelsConfig`;

export interface AIServiceResponse {
  statusCode: number;
  data?: any;
  msg?: string;
}

// Platform feature flags (maintainable list)
export interface PlatformFeatureFlagDef {
  key: string;
  label: string;
  description?: string;
  defaultEnabled?: boolean;
}

export const PLATFORM_FEATURE_FLAGS: PlatformFeatureFlagDef[] = [
  {
    key: 'ENABLE_BETA_CONNECTORS',
    label: 'Enable Beta Connectors',
    description: 'Allow usage of beta connector integrations that may be unstable.',
    defaultEnabled: false,
  },
  {
    key: 'AGENT_BUILDER_VISIBLE_FOR_ALL_USERS',
    label: 'Agent Builder visible for all users',
    description:
      'When enabled, non-admin users can see and use the Agents area and Agent Builder from the main navigation.',
    defaultEnabled: false,
  },
  {
    key: 'ENABLE_WEB_SEARCH',
    label: 'Web search',
    description:
      'Allow the assistant to call external web search tools and enrich answers with live web data.',
    defaultEnabled: true,
  },
  {
    key: 'ENABLE_DEEP_RESEARCH',
    label: 'Deep Research mode',
    description:
      'Expose the Deep Research chat mode for longer, more exhaustive research-style answers.',
    defaultEnabled: true,
  },
  {
    key: 'ENABLE_IMAGE_CHAT',
    label: 'Image chat & generation',
    description:
      'Enable image-focused chat experiences and image generation tools for all users.',
    defaultEnabled: true,
  },
];
