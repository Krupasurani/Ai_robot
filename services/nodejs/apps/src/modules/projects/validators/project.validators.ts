import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string().min(1)).max(50).optional(),
    goal: z.string().max(5000).optional(),
    systemPrompt: z.string().max(10000).optional(),
    template: z.string().max(200).optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    projectId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string().min(1)).max(50).optional(),
    goal: z.string().max(5000).optional(),
    systemPrompt: z.string().max(10000).optional(),
    template: z.string().max(200).optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const projectIdParamsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(objectIdRegex),
  }),
});

export const shareProjectParamsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    userIds: z.array(z.string().regex(objectIdRegex)).min(1),
    accessLevel: z.enum(['read', 'write']).optional(),
  }),
});

export const unshareProjectParamsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    userIds: z.array(z.string().regex(objectIdRegex)).min(1),
  }),
});

export const projectMemoriesParamsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(objectIdRegex),
    memoryId: z.string().regex(objectIdRegex).optional(),
  }),
});

export const createMemorySchema = z.object({
  params: z.object({
    projectId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    text: z.string().min(1).max(1000),
    key: z.string().max(200).optional(),
    tags: z.array(z.string().min(1)).max(20).optional(),
    approved: z.boolean().optional(),
    sourceConversationId: z.string().regex(objectIdRegex).optional(),
    sourceMessageId: z.string().regex(objectIdRegex).optional(),
  }),
});

export const updateMemorySchema = z.object({
  params: z.object({
    projectId: z.string().regex(objectIdRegex),
    memoryId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    text: z.string().min(1).max(1000).optional(),
    key: z.string().max(200).optional(),
    tags: z.array(z.string().min(1)).max(20).optional(),
    approved: z.boolean().optional(),
  }),
});


