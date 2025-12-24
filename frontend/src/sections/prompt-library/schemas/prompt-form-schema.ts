import { z } from 'zod';

export const promptFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .default(''),
  content: z
    .string()
    .min(1, 'Prompt content is required')
    .max(10000, 'Prompt content must be less than 10000 characters')
    .trim(),
  category: z.string().trim().optional(),
  tags: z.array(z.string().trim()).default([]),
  visibility: z.enum(['private', 'users', 'workspace'] as const).default('private'),
});

export type PromptFormValues = z.infer<typeof promptFormSchema>;

export const defaultPromptFormValues: PromptFormValues = {
  title: '',
  description: '',
  content: '',
  category: '',
  tags: [],
  visibility: 'private',
};
