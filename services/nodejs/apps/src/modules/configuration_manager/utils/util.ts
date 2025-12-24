import { KeyValueStoreService } from '../../../libs/services/keyValueStore.service';
import { EncryptionService } from '../../../libs/encryptor/encryptor';
import { loadConfigurationManagerConfig } from '../config/config';
import { configPaths } from '../paths/paths';
import { PLATFORM_FEATURE_FLAGS } from '../constants/constants';
import { KB_UPLOAD_LIMITS } from '../../knowledge_base/constants/kb.constants';
import { Logger } from '../../../libs/services/logger.service';

const logger = Logger.getInstance({
  service: 'PlatformSettingsUtil',
});

export type EmailTemplateActor = {
  id?: string;
  email?: string;
  name?: string;
};

export type SystemEmailTemplate = {
  enabled: boolean;
  subject: string;
  markdown: string;
  updatedAt?: string;
  updatedBy?: EmailTemplateActor;
};

export const DEFAULT_SYSTEM_EMAIL_TEMPLATE: SystemEmailTemplate = {
  enabled: false,
  subject: 'You have a new notification from Thero',
  markdown: [
    '## Hello {{recipientName || "there"}},',
    '',
    'Customize this message with Markdown to match your brand tone.',
    '',
    '- Share what happened',
    '- Explain the next steps',
    '',
    'Use `{{link}}` or any template data referenced by existing notification emails.',
    '',
    'Thanks,',
    '',
    '**The Thero Team**',
  ].join('\n'),
};

const sanitizeActor = (actor?: EmailTemplateActor): EmailTemplateActor | undefined => {
  if (!actor || typeof actor !== 'object') {
    return undefined;
  }

  const sanitized: EmailTemplateActor = {};
  if (typeof actor.id === 'string' && actor.id.trim()) {
    sanitized.id = actor.id.trim();
  }
  if (typeof actor.email === 'string' && actor.email.trim()) {
    sanitized.email = actor.email.trim();
  }
  if (typeof actor.name === 'string' && actor.name.trim()) {
    sanitized.name = actor.name.trim();
  }
  return Object.keys(sanitized).length ? sanitized : undefined;
};

export const sanitizeSystemEmailTemplate = (
  template?: Partial<SystemEmailTemplate>,
  fallback: SystemEmailTemplate = DEFAULT_SYSTEM_EMAIL_TEMPLATE,
): SystemEmailTemplate => {
  const base = template && typeof template === 'object' ? template : {};
  return {
    enabled: !!base.enabled,
    subject: (typeof base.subject === 'string' && base.subject.trim()
      ? base.subject.trim()
      : fallback.subject
    ).slice(0, 200),
    markdown:
      typeof base.markdown === 'string' && base.markdown.trim()
        ? base.markdown
        : fallback.markdown,
    updatedAt: typeof base.updatedAt === 'string' ? base.updatedAt : undefined,
    updatedBy: sanitizeActor(base.updatedBy),
  };
};

export const prepareSystemEmailTemplateForSave = (
  template?: Partial<SystemEmailTemplate>,
  actor?: EmailTemplateActor,
): SystemEmailTemplate => {
  const sanitized = sanitizeSystemEmailTemplate(template);
  return {
    ...sanitized,
    updatedAt: new Date().toISOString(),
    updatedBy: actor ? sanitizeActor(actor) : sanitizeActor(sanitized.updatedBy),
  };
};

export type PlatformSettings = {
  fileUploadMaxSizeBytes: number;
  featureFlags: Record<string, boolean>;
  systemEmailTemplate: SystemEmailTemplate;
};

/**
 * Shared utility to fetch and parse platform settings from the key-value store.
 * Handles decryption, parsing, and applying defaults.
 */
export async function getPlatformSettingsFromStore(
  keyValueStoreService: KeyValueStoreService,
): Promise<PlatformSettings> {
  const configManagerConfig = loadConfigurationManagerConfig();
  const encrypted = await keyValueStoreService.get<string>(configPaths.platform.settings);

  const defaults: PlatformSettings = {
    fileUploadMaxSizeBytes: KB_UPLOAD_LIMITS.defaultMaxFileSizeBytes,
    featureFlags: {} as Record<string, boolean>,
    systemEmailTemplate: DEFAULT_SYSTEM_EMAIL_TEMPLATE,
  };

  type PlatformSettingsStored = Partial<{
    fileUploadMaxSizeBytes: number;
    featureFlags: Record<string, boolean>;
    systemEmailTemplate: Partial<SystemEmailTemplate>;
  }>;

  let stored: PlatformSettingsStored | null = null;

  if (encrypted) {
    try {
      const decrypted = EncryptionService.getInstance(
        configManagerConfig.algorithm,
        configManagerConfig.secretKey,
      ).decrypt(encrypted);
      stored = JSON.parse(decrypted);
    } catch (e) {
      logger.warn('Failed to decrypt/parse platform settings; using defaults', { error: e });
    }
  }

  const base = stored && typeof stored === 'object' ? stored : {};

  const settings: PlatformSettings = {
    fileUploadMaxSizeBytes:
      typeof base.fileUploadMaxSizeBytes === 'number' && base.fileUploadMaxSizeBytes > 0
        ? base.fileUploadMaxSizeBytes
        : defaults.fileUploadMaxSizeBytes,
    featureFlags: (() => {
      const current: Record<string, boolean> =
        base.featureFlags && typeof base.featureFlags === 'object' ? base.featureFlags : {};
      // Ensure all known flags are present with a default
      for (const def of PLATFORM_FEATURE_FLAGS) {
        if (typeof current[def.key] === 'undefined') {
          current[def.key] = !!def.defaultEnabled;
        }
      }
      return current;
    })(),
    systemEmailTemplate: sanitizeSystemEmailTemplate(
      base.systemEmailTemplate,
      defaults.systemEmailTemplate,
    ),
  };

  return settings;
}
