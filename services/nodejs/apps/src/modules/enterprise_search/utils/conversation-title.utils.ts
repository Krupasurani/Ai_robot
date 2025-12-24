import { HttpMethod } from '../../../libs/enums/http-methods.enum';
import { Logger } from '../../../libs/services/logger.service';
import { AIServiceCommand } from '../../../libs/commands/ai_service/ai.service.command';
import { AppConfig } from '../../tokens_manager/config/config';
import {
  IConversationDocument,
  IMessageDocument,
} from '../types/conversation.interfaces';
import { IAgentConversationDocument } from '../schema/agent.conversation.schema';

const logger = Logger.getInstance({ service: 'ConversationTitleService' });

const TITLE_LABELS = {
  de: { placeholder: 'Neue Unterhaltung', fallback: 'Allgemeine Fragen' },
  en: { placeholder: 'New conversation', fallback: 'General questions' },
  es: { placeholder: 'Nueva conversación', fallback: 'Preguntas generales' },
  fr: { placeholder: 'Nouvelle conversation', fallback: 'Questions générales' },
  it: { placeholder: 'Nuova conversazione', fallback: 'Domande generali' },
  nl: { placeholder: 'Nieuw gesprek', fallback: 'Algemene vragen' },
  pt: { placeholder: 'Nova conversa', fallback: 'Perguntas gerais' },
} as const;

type TitleLanguage = keyof typeof TITLE_LABELS;

const SUPPORTED_LANGS = Object.keys(TITLE_LABELS) as TitleLanguage[];
const DEFAULT_LANG: TitleLanguage = 'en';
const MAX_TITLE_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 400;
const TITLE_MAX_LENGTH = 60;
const ASSISTANT_MESSAGE_TYPES = new Set([
  'bot_response',
  'research_plan',
  'clarification',
]);

type ConversationDoc =
  | IConversationDocument
  | IAgentConversationDocument;

const sanitizeContent = (content: string): string =>
  content.replace(/\s+/g, ' ').slice(0, MAX_MESSAGE_LENGTH).trim();

export const normalizeLanguage = (
  language?: string | null,
): TitleLanguage => {
  const rawValue = typeof language === 'string' ? language : '';
  let normalizedInput = '';
  if (rawValue && rawValue.length > 0) {
    const parts = rawValue.split(/[-_]/);
    normalizedInput = (parts[0] || '').toLowerCase();
  }

  const matchedLang = SUPPORTED_LANGS.find(
    (lang) => lang === normalizedInput,
  );

  return matchedLang ?? DEFAULT_LANG;
};

export const getPlaceholderTitle = (language?: string | null): string => {
  const lang = normalizeLanguage(language);
  return TITLE_LABELS[lang].placeholder;
};

export const getGenericTitle = (language?: string | null): string => {
  const lang = normalizeLanguage(language);
  return TITLE_LABELS[lang].fallback;
};

export const isPlaceholderTitle = (
  title?: string | null,
  language?: string | null,
): boolean => {
  if (!title) {
    return true;
  }
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) {
    return true;
  }
  const placeholderSet = new Set(
    Object.values(TITLE_LABELS).map(({ placeholder }) =>
      placeholder.toLowerCase(),
    ),
  );
  return (
    placeholderSet.has(normalizedTitle) ||
    normalizedTitle ===
      getPlaceholderTitle(language).toLowerCase()
  );
};

const hasRequiredMessages = (conversation: ConversationDoc): boolean => {
  if (!conversation?.messages?.length) {
    return false;
  }
  let hasUser = false;
  let hasAssistant = false;
  for (const message of conversation.messages) {
    if (message.messageType === 'user_query') {
      hasUser = true;
    }
    if (ASSISTANT_MESSAGE_TYPES.has(message.messageType as string)) {
      hasAssistant = true;
    }
    if (hasUser && hasAssistant) {
      return true;
    }
  }
  return false;
};

export const shouldGenerateTitle = (
  conversation: ConversationDoc,
): boolean => {
  if (!conversation) {
    return false;
  }
  if (conversation.titleManuallySet) {
    return false;
  }
  const needsTitleUpdate =
    !conversation.title ||
    isPlaceholderTitle(conversation.title, conversation.titleLanguage);

  if (!needsTitleUpdate) {
    return false;
  }
  return hasRequiredMessages(conversation);
};

const buildTitleMessages = (
  conversation: ConversationDoc,
): Array<{ role: 'user' | 'assistant'; content: string }> => {
  const prepared: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const message of conversation.messages as IMessageDocument[]) {
    if (
      message.messageType !== 'user_query' &&
      message.messageType !== 'bot_response' &&
      message.messageType !== 'research_plan' &&
      message.messageType !== 'clarification'
    ) {
      continue;
    }
    const role = message.messageType === 'user_query' ? 'user' : 'assistant';
    const content = sanitizeContent(message.content || '');
    if (!content) {
      continue;
    }
    prepared.push({ role, content });
    if (prepared.length >= MAX_TITLE_MESSAGES) {
      break;
    }
  }

  return prepared;
};

const sanitizeGeneratedTitle = (title?: string | null): string | null => {
  if (!title) {
    return null;
  }
  const normalized = title
    .replace(/[\r\n]+/g, ' ')
    .replace(/^["'‘’“”]+|["'‘’“”]+$/g, '')
    .trim();
  if (!normalized) {
    return null;
  }
  return normalized.length > TITLE_MAX_LENGTH
    ? normalized.slice(0, TITLE_MAX_LENGTH).trim()
    : normalized;
};

interface TitleGenerationOptions {
  conversation: ConversationDoc;
  appConfig: AppConfig;
  headers: Record<string, string>;
  requestId?: string;
}

export const maybeGenerateConversationTitle = async ({
  conversation,
  appConfig,
  headers,
  requestId,
}: TitleGenerationOptions): Promise<string | null> => {
  if (!shouldGenerateTitle(conversation)) {
    return null;
  }

  const language = normalizeLanguage(conversation.titleLanguage);
  conversation.titleLanguage = language;

  const messages = buildTitleMessages(conversation);
  if (!messages.length) {
    return null;
  }

  try {
    const command = new AIServiceCommand<{ title?: string }>({
      uri: `${appConfig.aiBackend}/api/v1/chat/title`,
      method: HttpMethod.POST,
      headers,
      body: {
        language,
        messages,
        max_tokens: 40,
      },
    });

    const response = await command.execute();
    if (response.statusCode !== 200 || !response.data?.title) {
      logger.warn('Title generation failed', {
        conversationId: conversation._id?.toString(),
        requestId,
        statusCode: response.statusCode,
      });
      return null;
    }

    let sanitizedTitle = sanitizeGeneratedTitle(response.data.title);
    if (!sanitizedTitle || isPlaceholderTitle(sanitizedTitle, language)) {
      sanitizedTitle = getGenericTitle(language);
    }

    if (!sanitizedTitle) {
      return null;
    }

    conversation.title = sanitizedTitle;
    (conversation as any).titleGeneratedAt = Date.now();
    return sanitizedTitle;
  } catch (error: any) {
    logger.error('Failed to generate conversation title', {
      conversationId: conversation._id?.toString(),
      requestId,
      error: error.message,
    });
    return null;
  }
};
