// es_schema.ts
import { z } from 'zod';
import { APP_TYPES } from '../connectors/connectors';

// Regular expression for MongoDB ObjectId validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const webSearchConfigSchema = z.object({
  mode: z.enum(['auto', 'always']).optional(),
  maxResults: z.number().min(1).max(25).optional(),
  maxPages: z.number().min(1).max(10).optional(),
  includeSourceContent: z.boolean().optional(),
  firecrawlStrategy: z.enum(['fast', 'deep']).optional(),
});

export const enterpriseSearchCreateSchema = z.object({
  body: z.object({
    query: z
      .string({ required_error: 'Query is required' })
      .min(1, { message: 'Query is required' })
      .max(100000, {
        message: 'Query exceeds maximum length of 100000 characters',
      }),
    recordIds: z
      .array(
        z
          .string()
          .regex(objectIdRegex, { message: 'Invalid record ID format' }),
      )
      .optional(),
    departments: z
      .array(
        z
          .string()
          .regex(objectIdRegex, { message: 'Invalid department ID format' }),
      )
      .optional(),
    filters: z
      .object({
        apps: z.array(z.enum([APP_TYPES.DRIVE, APP_TYPES.GMAIL, APP_TYPES.ONEDRIVE, APP_TYPES.SHAREPOINT_ONLINE, APP_TYPES.LOCAL])).optional(),
        kb: z.array(z.string().uuid()).optional(),
      })
      .optional(),
    modelKey: z.string().min(1, { message: 'Model key is required' }).optional(),
    modelName: z.string().min(1, { message: 'Model name is required' }).optional(),
    chatMode: z.string().min(1, { message: 'Chat mode is required' }).optional(),
    useWebSearch: z.boolean().optional(),
    webSearch: webSearchConfigSchema.optional(),
  }),
});

const baseUnifiedChatBodySchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .min(1, { message: 'Message is required' })
    .max(100000, {
      message: 'Message exceeds maximum length of 100000 characters',
    }),
  conversationId: z.string().regex(objectIdRegex).optional(),
  chatMode: z.string().optional(),
  model: z
    .object({
      key: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
    })
    .optional(),
  reasoningEnabled: z.boolean().optional(),
  webSearchEnabled: z.boolean().optional(),
  filters: z
    .object({
      apps: z.array(z.string()).optional(),
      kb: z.array(z.string()).optional(),
    })
    .optional(),
  context: z
    .object({
      recordIds: z.array(z.string()).optional(),
      projectId: z.string().optional(),
    })
    .optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        type: z.string().optional(),
        content: z.string().optional(),
        processingTimeMs: z.number().optional(),
      })
    )
    .optional(),
  agentId: z.string().optional(),
  systemPrompt: z.string().optional(),
  // Deep Research clarification response fields
  isClarificationResponse: z.boolean().optional(),
  // Deep Research plan confirmation fields
  isPlanConfirmation: z.boolean().optional(),
  originalQuery: z.string().optional(),
  confirmedPlan: z.array(z.string()).optional(),
  confirmedAssumptions: z.array(z.string()).optional(),
  // Deep Research scope (hybrid, company, web)
  researchScope: z.string().optional(),
});

export const unifiedChatRequestSchema = z.object({
  body: baseUnifiedChatBodySchema,
});

export const unifiedAgentChatRequestSchema = z.object({
  body: baseUnifiedChatBodySchema.extend({
    agentId: z
      .string({ required_error: 'agentId is required' })
      .min(1, { message: 'agentId is required for agent chats' }),
  }),
});

export const conversationIdParamsSchema = z.object({
  params: z.object({
    conversationId: z
      .string()
      .regex(objectIdRegex, { message: 'Invalid message ID format' }),
  }),
});

export const conversationTitleParamsSchema = conversationIdParamsSchema.extend({
  body: z.object({
    title: z
      .string()
      .min(1, { message: 'Title is required' })
      .max(60, { message: 'Title must be 60 characters or less' }),
  }),
});

export const conversationShareParamsSchema = conversationIdParamsSchema.extend({
  body: z.object({
    userIds: z
      .array(z.string().regex(objectIdRegex))
      .min(1, { message: 'At least one user ID is required' }),
  }),
});

export const addMessageParamsSchema = enterpriseSearchCreateSchema.extend({
  params: z.object({
    conversationId: z.string().regex(objectIdRegex, {
      message: 'Invalid conversation ID format',
    }),
  }),
  body: z.object({
    query: z.string().min(1, { message: 'Query is required' }),
    filters: z
      .object({
        apps: z.array(z.enum([APP_TYPES.DRIVE, APP_TYPES.GMAIL, APP_TYPES.ONEDRIVE, APP_TYPES.SHAREPOINT_ONLINE, APP_TYPES.LOCAL])).optional(),
        kb: z.array(z.string().uuid()).optional(),
      })
      .optional(),
    modelKey: z.string().min(1, { message: 'Model key is required' }).optional(),
    modelName: z.string().min(1, { message: 'Model name is required' }).optional(),
    chatMode: z.string().min(1, { message: 'Chat mode is required' }).optional(),
    useWebSearch: z.boolean().optional(),
    webSearch: webSearchConfigSchema.optional(),
  }),
});

export const messageIdParamsSchema = z.object({
  params: z.object({
    messageId: z
      .string()
      .regex(objectIdRegex, { message: 'Invalid message ID format' }),
  }),
});

export const regenerateAnswersParamsSchema = z.object({
  params: z.object({
    conversationId: z
      .string()
      .regex(objectIdRegex, { message: 'Invalid message ID format' }),
    messageId: z
      .string()
      .regex(objectIdRegex, { message: 'Invalid message ID format' }),
  }),
  body: z.object({
    filters: z
      .object({
        apps: z.array(z.enum([APP_TYPES.DRIVE, APP_TYPES.GMAIL, APP_TYPES.ONEDRIVE, APP_TYPES.SHAREPOINT_ONLINE, APP_TYPES.LOCAL])).optional(),
        kb: z.array(z.string().uuid()).optional(),
      })
      .optional(),
    modelKey: z.string().min(1, { message: 'Model key is required' }).optional(),
    modelName: z.string().min(1, { message: 'Model name is required' }).optional(),
    chatMode: z.string().min(1, { message: 'Chat mode is required' }).optional(),
  }),
});

export const updateFeedbackParamsSchema = regenerateAnswersParamsSchema;

/**
 * Schema for getting an enterprise search document by ID.
 */
export const enterpriseSearchGetSchema = z.object({
  params: z.object({
    conversationId: z.string().regex(objectIdRegex, {
      message: 'ID must be a valid MongoDB ObjectId',
    }),
  }),
});

/**
 * Schema for deleting an enterprise search document.
 * (Same as get schema for ID validation.)
 */
export const enterpriseSearchDeleteSchema = enterpriseSearchGetSchema;

/**
 * Schema for searching enterprise search documents.
 * Validates query parameters:
 * - query (required)
 * - page and limit are optional numbers (with defaults)
 * - sortBy and sortOrder are optional and must be one of the allowed values if provided.
 */
export const enterpriseSearchQuerySchema = z.object({
  query: z.object({
    query: z
      .string({ required_error: 'Search query is required' })
      .min(1, { message: 'Search query is required' }),
    page: z.preprocess((arg) => Number(arg), z.number().min(1).default(1)),
    limit: z.preprocess(
      (arg) => Number(arg),
      z.number().min(1).max(100).default(10),
    ),
    sortBy: z.enum(['createdAt', 'title']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const enterpriseSearchSearchSchema = z.object({
  body: z.object({
    query: z.string().min(1, { message: 'Search query is required' }),
    filters: z
      .object({
        apps: z
          .array(z.enum([APP_TYPES.DRIVE, APP_TYPES.GMAIL, APP_TYPES.ONEDRIVE, APP_TYPES.SHAREPOINT_ONLINE, APP_TYPES.LOCAL]))
          .optional(),
        kb: z.array(z.string().uuid()).optional(),
      })
      .optional(),
    limit: z
      .preprocess((arg) => Number(arg), z.number().min(1).max(100).default(10))
      .optional(),
    modelKey: z.string().min(1, { message: 'Model key is required' }).optional(),
    modelName: z.string().min(1, { message: 'Model name is required' }).optional(),
    chatMode: z.string().min(1, { message: 'Chat mode is required' }).optional(),
  }),
});

export const enterpriseSearchSearchHistorySchema = z.object({
  params: z.object({
    limit: z
      .preprocess((arg) => Number(arg), z.number().min(1).max(100).default(10))
      .optional(),
    page: z
      .preprocess((arg) => Number(arg), z.number().min(1).default(1))
      .optional(),
  }),
});

export const searchIdParamsSchema = z.object({
  params: z.object({
    searchId: z
      .string()
      .regex(objectIdRegex, { message: 'Invalid search ID format' }),
  }),
});

export const searchShareParamsSchema = searchIdParamsSchema.extend({
  body: z.object({
    userIds: z.array(z.string().regex(objectIdRegex)).min(1, {
      message: 'At least one user ID is required',
    }),
    accessLevel: z.enum(['read', 'write']).optional(),
  }),
});

export const webSearchRequestSchema = z.object({
  body: z.object({
    query: z
      .string({ required_error: 'Query is required' })
      .min(1, { message: 'Query is required' }),
    language: z.string().max(8).optional(),
    maxResults: z.number().min(1).max(25).optional(),
    maxPages: z.number().min(1).max(10).optional(),
    useWebSearch: z.boolean().optional(),
    webSearch: webSearchConfigSchema.optional(),
  }),
});
