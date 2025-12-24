import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const visibilityEnum = z.enum(['private', 'users', 'workspace']);

const tagArray = z
  .array(z.string().min(1).max(60))
  .max(30)
  .optional();

export const listPromptsSchema = z.object({
  query: z.object({
    visibility: z.enum(['all', 'private', 'users', 'workspace']).optional(),
    category: z.string().max(120).optional(),
    tag: z.string().max(60).optional(),
    search: z.string().max(200).optional(),
    sortBy: z.enum(['updatedAt', 'title']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const promptBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  content: z.string().min(1).max(20000),
  category: z.string().max(120).optional(),
  tags: tagArray,
  visibility: visibilityEnum.optional(),
});

export const createPromptSchema = z.object({
  body: promptBodySchema,
});

export const updatePromptSchema = z.object({
  params: z.object({
    promptId: z.string().regex(objectIdRegex),
  }),
  body: promptBodySchema.partial(),
});

export const deletePromptSchema = z.object({
  params: z.object({
    promptId: z.string().regex(objectIdRegex),
  }),
});

export const sharePromptSchema = z.object({
  params: z.object({
    promptId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    visibility: visibilityEnum,
  }),
});

export const sharePromptWithUsersSchema = z.object({
  params: z.object({
    promptId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    userIds: z.array(z.string().regex(objectIdRegex)).min(1),
    accessLevel: z.enum(['read', 'write']).default('read'),
  }),
});

export const unsharePromptUsersSchema = z.object({
  params: z.object({
    promptId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    userIds: z.array(z.string().regex(objectIdRegex)).min(1),
  }),
});

export const assistantPromptSchema = z.object({
  body: z.object({
    idea: z.string().max(2000).optional(),
    goal: z.string().max(2000).optional(),
    tone: z.string().max(200).optional(),
    audience: z.string().max(200).optional(),
    constraints: z.string().max(2000).optional(),
    tags: tagArray,
    category: z.string().max(120).optional(),
    existingPrompt: z.string().max(20000).optional(),
    modelKey: z.string().max(120).nullable().optional(),
    modelName: z.string().max(120).nullable().optional(),
  }),
});


