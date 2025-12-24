import fs from 'node:fs/promises';
import path from 'node:path';

import { v4 as uuidv4 } from 'uuid';
import { z, ZodError } from 'zod';

import { Logger } from '../../../libs/services/logger.service';
import { KeyValueStoreService } from '../../../libs/services/keyValueStore.service';
import { ConfigurationManagerConfig } from '../config/config';
import { configPaths } from '../paths/paths';
import { EncryptionService } from '../../../libs/encryptor/encryptor';
import { aiModelsConfigSchema, modelConfigurationSchema } from '../validator/validators';
import { AppConfig } from '../../tokens_manager/config/config';
import { HttpMethod } from '../../../libs/enums/http-methods.enum';
import { AIServiceCommand } from '../../../libs/commands/ai_service/ai.service.command';

type ModelConfiguration = z.infer<typeof modelConfigurationSchema> & {
  modelKey?: string;
  role?: string;
};

type ModelType = 'llm' | 'embedding' | 'slm' | 'reasoning' | 'multiModal' | 'ocr' | 'deepresearch' | 'imageGeneration';

const AI_MODELS_CONFIG_BODY_SCHEMA = aiModelsConfigSchema.shape.body;

type RawAIModelsConfig = z.infer<typeof AI_MODELS_CONFIG_BODY_SCHEMA>;

type AIModelsConfig = Record<ModelType, ModelConfiguration[]>;

const MODEL_TYPES: ModelType[] = [
  'llm',
  'embedding',
  'slm',
  'reasoning',
  'multiModal',
  'ocr',
  'deepresearch',
  'imageGeneration',
];

const DEFAULT_ROLE_BY_TYPE: Partial<Record<ModelType, string>> = {
  llm: 'internal',
  slm: 'slm',
  reasoning: 'reasoning',
  multiModal: 'multimodal',
  deepresearch: 'deepresearch',
  imageGeneration: 'imageGeneration',
};

const DEFAULT_LOGGER = Logger.getInstance({ service: 'AIModelsInitializer' });

export interface AIModelsInitializerOptions {
  keyValueStoreService: KeyValueStoreService;
  configurationManagerConfig: ConfigurationManagerConfig;
  appConfig: AppConfig;
  logger?: Logger;
}

export async function initializeAIModelsFromEnv({
  keyValueStoreService,
  configurationManagerConfig,
  appConfig,
  logger = DEFAULT_LOGGER,
}: AIModelsInitializerOptions): Promise<boolean> {
  try {
    const rawConfigString = await readConfigFromEnvironment(logger);
    if (!rawConfigString) {
      logger.debug(
        'No AI models environment configuration detected. Checking etcd...',
      );
      
      // Check if etcd has config
      const existingConfig = await keyValueStoreService.get<string>(
        configPaths.aiModels,
      );
      
      if (!existingConfig) {
        logger.warn(
          'No AI models configuration found in environment or etcd. Please configure AI_MODELS_CONFIG.',
        );
      } else {
        logger.debug('AI models configuration exists in etcd.');
      }
      return false;
    }

    const parsedConfig = parseAndValidate(rawConfigString);
    const normalizedConfig = normalizeConfig(parsedConfig);

    if (!hasModels(normalizedConfig)) {
      logger.warn(
        'AI models configuration from environment does not contain any model definitions. Skipping initialization.',
      );
      return false;
    }

    // Get existing config from etcd to compare
    const existingEncryptedConfig = await keyValueStoreService.get<string>(
      configPaths.aiModels,
    );

    let shouldUpdate = !existingEncryptedConfig;

    if (existingEncryptedConfig) {
      // Decrypt and compare
      const encryptionService = EncryptionService.getInstance(
        configurationManagerConfig.algorithm,
        configurationManagerConfig.secretKey,
      );
      
      try {
        const existingDecrypted = encryptionService.decrypt(existingEncryptedConfig);
        const existingConfig = JSON.parse(existingDecrypted);
        
        // Normalize both for comparison
        const normalizedExisting = JSON.stringify(sortConfigKeys(existingConfig));
        const normalizedNew = JSON.stringify(sortConfigKeys(normalizedConfig));
        
        shouldUpdate = normalizedExisting !== normalizedNew;
        
        if (shouldUpdate) {
          logger.info('AI models configuration differs from environment. Updating...');
        } else {
          logger.debug('AI models configuration in etcd is up-to-date.');
          return false;
        }
      } catch (error) {
        logger.warn('Failed to decrypt/compare existing config. Will update.', {
          error: error instanceof Error ? error.message : String(error),
        });
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      if (!shouldSkipHealthChecks()) {
        await runHealthChecks(normalizedConfig, appConfig, logger);
      } else {
        logger.warn(
          'AI models health checks are disabled via AI_MODELS_HEALTHCHECK_SKIP. Proceeding without validation.',
        );
      }

      await persistConfig(
        normalizedConfig,
        keyValueStoreService,
        configurationManagerConfig,
      );

      logger.info('Seeded/updated AI models configuration from environment.', {
        modelTypes: MODEL_TYPES.filter(
          (type) => normalizedConfig[type].length > 0,
        ),
      });
    }

    return shouldUpdate;
  } catch (error) {
    logger.error('Failed to initialize AI models from environment.', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function readConfigFromEnvironment(logger: Logger): Promise<string | null> {
  if (process.env.AI_MODELS_CONFIG) {
    return process.env.AI_MODELS_CONFIG;
  }

  if (process.env.AI_MODELS_CONFIG_BASE64) {
    try {
      return Buffer.from(process.env.AI_MODELS_CONFIG_BASE64, 'base64').toString(
        'utf-8',
      );
    } catch (error) {
      logger.error('Unable to decode AI_MODELS_CONFIG_BASE64.', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  if (process.env.AI_MODELS_CONFIG_FILE) {
    const configPath = path.isAbsolute(process.env.AI_MODELS_CONFIG_FILE)
      ? process.env.AI_MODELS_CONFIG_FILE
      : path.resolve(process.cwd(), process.env.AI_MODELS_CONFIG_FILE);

    return fs.readFile(configPath, 'utf-8');
  }

  return null;
}

function parseAndValidate(rawConfig: string): RawAIModelsConfig {
  try {
    const parsed = JSON.parse(rawConfig);
    return AI_MODELS_CONFIG_BODY_SCHEMA.parse(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`AI models configuration is not valid JSON: ${error.message}`);
    }
    if (error instanceof ZodError) {
      throw new Error(`AI models configuration validation failed: ${error.message}`);
    }
    throw error;
  }
}

function normalizeConfig(rawConfig: RawAIModelsConfig): AIModelsConfig {
  return MODEL_TYPES.reduce<AIModelsConfig>((acc, type) => {
    const models = [...(rawConfig[type] ?? [])] as ModelConfiguration[];
    if (models.length === 0) {
      acc[type] = [];
      return acc;
    }

    const hasExplicitDefault = models.some((model) => model.isDefault);

    acc[type] = models.map((model, index) => ({
      ...model,
      role: model.role ?? DEFAULT_ROLE_BY_TYPE[type],
      modelKey: model.modelKey ?? uuidv4(),
      isDefault:
        typeof model.isDefault === 'boolean'
          ? model.isDefault
          : !hasExplicitDefault && index === 0,
      isMultimodal:
        typeof model.isMultimodal === 'boolean'
          ? model.isMultimodal
          : type === 'multiModal',
      isReasoning:
        typeof model.isReasoning === 'boolean'
          ? model.isReasoning
          : type === 'reasoning',
    }));

    return acc;
  }, createEmptyModelMap());
}

function createEmptyModelMap(): AIModelsConfig {
  return MODEL_TYPES.reduce<AIModelsConfig>((acc, type) => {
    acc[type] = [];
    return acc;
  }, {} as AIModelsConfig);
}

function hasModels(config: AIModelsConfig): boolean {
  return MODEL_TYPES.some((type) => config[type]?.length > 0);
}

function shouldSkipHealthChecks(): boolean {
  return String(process.env.AI_MODELS_HEALTHCHECK_SKIP || '').toLowerCase() === 'true';
}

async function runHealthChecks(
  config: AIModelsConfig,
  appConfig: AppConfig,
  logger: Logger,
): Promise<void> {
  const llmLikeTypes: ModelType[] = ['llm', 'slm', 'reasoning', 'multiModal', 'deepresearch'];

  for (const type of llmLikeTypes) {
    if (config[type].length === 0) {
      continue;
    }

    logger.info(`Running LLM health check for ${type} models`, {
      count: config[type].length,
    });

    await invokeHealthEndpoint(
      `${appConfig.aiBackend}/api/v1/llm-health-check`,
      config[type],
      type,
    );
  }

  if (config.embedding.length > 0) {
    logger.info('Running embedding health check.', {
      count: config.embedding.length,
    });

    await invokeHealthEndpoint(
      `${appConfig.aiBackend}/api/v1/embedding-health-check`,
      config.embedding,
      'embedding',
    );
  }

  if (config.ocr.length > 0) {
    logger.info(
      'OCR models provided via environment configuration. Health checks for OCR models are not implemented; skipping.',
    );
  }
}

async function invokeHealthEndpoint(
  uri: string,
  payload: ModelConfiguration[],
  modelType: ModelType,
): Promise<void> {
  const command = new AIServiceCommand({
    uri,
    method: HttpMethod.POST,
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  });

  const response = await command.execute();
  if (response.statusCode >= 300) {
    throw new Error(
      `Health check for ${modelType} models failed with status ${response.statusCode}`,
    );
  }
}

async function persistConfig(
  config: AIModelsConfig,
  keyValueStoreService: KeyValueStoreService,
  configurationManagerConfig: ConfigurationManagerConfig,
): Promise<void> {
  const encryptionService = EncryptionService.getInstance(
    configurationManagerConfig.algorithm,
    configurationManagerConfig.secretKey,
  );

  const encryptedConfig = encryptionService.encrypt(JSON.stringify(config));

  await keyValueStoreService.set<string>(configPaths.aiModels, encryptedConfig);
}

function sortConfigKeys(config: AIModelsConfig): AIModelsConfig {
  const sorted: AIModelsConfig = createEmptyModelMap();
  
  for (const type of MODEL_TYPES) {
    if (config[type]) {
      sorted[type] = [...config[type]].sort((a, b) => {
        const aKey = a.modelKey || '';
        const bKey = b.modelKey || '';
        return aKey.localeCompare(bKey);
      });
    }
  }
  
  return sorted;
}
