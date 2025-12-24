/**
 * Unit tests for AI Models Initializer Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeAIModelsFromEnv } from '../../src/modules/configuration_manager/services/ai-models-initializer.service';
import { KeyValueStoreService } from '../../src/libs/services/keyValueStore.service';
import { ConfigurationManagerConfig } from '../../src/modules/configuration_manager/config/config';
import { AppConfig } from '../../src/modules/tokens_manager/config/config';
import { Logger } from '../../src/libs/services/logger.service';
import { EncryptionService } from '../../src/libs/encryptor/encryptor';

// Mock dependencies
vi.mock('../../src/libs/services/keyValueStore.service');
vi.mock('../../src/libs/encryptor/encryptor');
vi.mock('../../src/libs/commands/ai_service/ai.service.command');

describe('AI Models Initializer Service', () => {
  let mockKeyValueStoreService: any;
  let mockConfigurationManagerConfig: ConfigurationManagerConfig;
  let mockAppConfig: AppConfig;
  let mockLogger: any;
  let mockEncryptionService: any;

  const validAIModelsConfig = {
    llm: [
      {
        provider: 'openAI',
        configuration: {
          model: 'gpt-4o',
          apiKey: 'sk-test123',
        },
        isDefault: true,
        modelKey: 'test-llm-key',
      },
    ],
    embedding: [
      {
        provider: 'openAI',
        configuration: {
          model: 'text-embedding-3-small',
          apiKey: 'sk-test123',
        },
        isDefault: true,
        modelKey: 'test-embedding-key',
      },
    ],
    slm: [],
    reasoning: [],
    multiModal: [],
    ocr: [],
    deepresearch: [],
    imageGeneration: [],
  };

  beforeEach(() => {
    // Reset environment
    delete process.env.AI_MODELS_CONFIG;
    delete process.env.AI_MODELS_CONFIG_BASE64;
    delete process.env.AI_MODELS_CONFIG_FILE;
    delete process.env.AI_MODELS_HEALTHCHECK_SKIP;

    // Mock KeyValueStoreService
    mockKeyValueStoreService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    // Mock ConfigurationManagerConfig
    mockConfigurationManagerConfig = {
      storeType: 'etcd3',
      storeConfig: {
        host: 'localhost',
        port: 2379,
        dialTimeout: 2000,
      },
      secretKey: 'test-secret-key',
      algorithm: 'aes-256-gcm',
    };

    // Mock AppConfig
    mockAppConfig = {
      aiBackend: 'http://localhost:8000',
    } as AppConfig;

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Mock EncryptionService
    mockEncryptionService = {
      encrypt: vi.fn((data: string) => `encrypted:${data}`),
      decrypt: vi.fn((data: string) => data.replace('encrypted:', '')),
    };

    vi.spyOn(EncryptionService, 'getInstance').mockReturnValue(
      mockEncryptionService as any,
    );
  });

  describe('No environment configuration', () => {
    it('should return false when no AI_MODELS_CONFIG found in environment', async () => {
      mockKeyValueStoreService.get.mockResolvedValue(null);

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(false);
      expect(mockKeyValueStoreService.set).not.toHaveBeenCalled();
    });

    it('should return false when etcd already has config but no env config', async () => {
      const existingEncryptedConfig = `encrypted:${JSON.stringify(validAIModelsConfig)}`;
      mockKeyValueStoreService.get.mockResolvedValue(existingEncryptedConfig);

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(false);
      expect(mockKeyValueStoreService.set).not.toHaveBeenCalled();
    });
  });

  describe('Seeding from environment', () => {
    beforeEach(() => {
      process.env.AI_MODELS_HEALTHCHECK_SKIP = 'true';
    });

    it('should seed config when etcd is empty and env has valid config', async () => {
      process.env.AI_MODELS_CONFIG = JSON.stringify(validAIModelsConfig);
      mockKeyValueStoreService.get.mockResolvedValue(null);
      mockKeyValueStoreService.set.mockResolvedValue(true);

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(true);
      expect(mockKeyValueStoreService.set).toHaveBeenCalledWith(
        '/services/aiModels',
        expect.stringContaining('encrypted:'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Seeded/updated'),
        expect.any(Object),
      );
    });

    it('should update config when etcd config differs from env', async () => {
      const oldConfig = { ...validAIModelsConfig };
      oldConfig.embedding[0].configuration.model = 'old-model';

      const existingEncryptedConfig = `encrypted:${JSON.stringify(oldConfig)}`;
      mockKeyValueStoreService.get.mockResolvedValue(existingEncryptedConfig);
      mockKeyValueStoreService.set.mockResolvedValue(true);

      process.env.AI_MODELS_CONFIG = JSON.stringify(validAIModelsConfig);

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(true);
      expect(mockKeyValueStoreService.set).toHaveBeenCalledWith(
        '/services/aiModels',
        expect.stringContaining('encrypted:'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('differs from environment'),
      );
    });

    it('should not update when etcd config matches env', async () => {
      const existingEncryptedConfig = `encrypted:${JSON.stringify(validAIModelsConfig)}`;
      mockKeyValueStoreService.get.mockResolvedValue(existingEncryptedConfig);

      process.env.AI_MODELS_CONFIG = JSON.stringify(validAIModelsConfig);

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(false);
      expect(mockKeyValueStoreService.set).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('up-to-date'),
      );
    });
  });

  describe('Configuration validation', () => {
    beforeEach(() => {
      process.env.AI_MODELS_HEALTHCHECK_SKIP = 'true';
      mockKeyValueStoreService.get.mockResolvedValue(null);
    });

    it('should reject invalid JSON', async () => {
      process.env.AI_MODELS_CONFIG = 'invalid json {';

      await expect(
        initializeAIModelsFromEnv({
          keyValueStoreService: mockKeyValueStoreService,
          configurationManagerConfig: mockConfigurationManagerConfig,
          appConfig: mockAppConfig,
          logger: mockLogger,
        }),
      ).rejects.toThrow();
    });

    it('should reject config without models', async () => {
      const emptyConfig = {
        llm: [],
        embedding: [],
        slm: [],
        reasoning: [],
        multiModal: [],
        ocr: [],
        deepresearch: [],
        imageGeneration: [],
      };

      process.env.AI_MODELS_CONFIG = JSON.stringify(emptyConfig);

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not contain any model definitions'),
      );
    });
  });

  describe('Different config sources', () => {
    beforeEach(() => {
      process.env.AI_MODELS_HEALTHCHECK_SKIP = 'true';
      mockKeyValueStoreService.get.mockResolvedValue(null);
      mockKeyValueStoreService.set.mockResolvedValue(true);
    });

    it('should read from AI_MODELS_CONFIG_BASE64', async () => {
      const base64Config = Buffer.from(
        JSON.stringify(validAIModelsConfig),
      ).toString('base64');
      process.env.AI_MODELS_CONFIG_BASE64 = base64Config;

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(true);
      expect(mockKeyValueStoreService.set).toHaveBeenCalled();
    });

    it('should prefer AI_MODELS_CONFIG over AI_MODELS_CONFIG_BASE64', async () => {
      process.env.AI_MODELS_CONFIG = JSON.stringify(validAIModelsConfig);
      process.env.AI_MODELS_CONFIG_BASE64 = Buffer.from(
        JSON.stringify({ invalid: 'config' }),
      ).toString('base64');

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(true);
      expect(mockKeyValueStoreService.set).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      process.env.AI_MODELS_HEALTHCHECK_SKIP = 'true';
      process.env.AI_MODELS_CONFIG = JSON.stringify(validAIModelsConfig);
      mockKeyValueStoreService.get.mockResolvedValue(null);
    });

    it('should handle decryption errors gracefully', async () => {
      const corruptedEncrypted = 'corrupted-encrypted-data';
      mockKeyValueStoreService.get.mockResolvedValue(corruptedEncrypted);
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });
      mockKeyValueStoreService.set.mockResolvedValue(true);

      const result = await initializeAIModelsFromEnv({
        keyValueStoreService: mockKeyValueStoreService,
        configurationManagerConfig: mockConfigurationManagerConfig,
        appConfig: mockAppConfig,
        logger: mockLogger,
      });

      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to decrypt/compare'),
        expect.any(Object),
      );
      expect(mockKeyValueStoreService.set).toHaveBeenCalled();
    });

    it('should propagate errors during persistence', async () => {
      mockKeyValueStoreService.set.mockRejectedValue(
        new Error('Failed to write to etcd'),
      );

      await expect(
        initializeAIModelsFromEnv({
          keyValueStoreService: mockKeyValueStoreService,
          configurationManagerConfig: mockConfigurationManagerConfig,
          appConfig: mockAppConfig,
          logger: mockLogger,
        }),
      ).rejects.toThrow('Failed to write to etcd');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize'),
        expect.any(Object),
      );
    });
  });
});
