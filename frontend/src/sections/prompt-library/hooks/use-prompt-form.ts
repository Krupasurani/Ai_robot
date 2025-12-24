import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PromptLibraryApi, PromptTemplate } from '@/api/prompt-library';
import {
  promptFormSchema,
  type PromptFormValues,
  defaultPromptFormValues,
} from '../schemas/prompt-form-schema';

export function usePromptForm() {
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: defaultPromptFormValues,
    mode: 'onChange',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setEditingPromptId(null);
    form.reset(defaultPromptFormValues);
    setIsDialogOpen(true);
  }, [form]);

  const openEditDialog = useCallback(
    (prompt: PromptTemplate) => {
      setDialogMode('edit');
      setEditingPromptId(prompt._id);
      form.reset({
        title: prompt.title || '',
        description: prompt.description || '',
        content: prompt.content || '',
        category: prompt.category || '',
        tags: prompt.tags || [],
        visibility: prompt.visibility || 'private',
      });
      setIsDialogOpen(true);
    },
    [form]
  );

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    form.reset(defaultPromptFormValues);
    setEditingPromptId(null);
    setDialogMode('create');
  }, [form]);

  const handleAssist = useCallback(async () => {
    const currentValues = form.getValues();
    setAssistLoading(true);
    try {
      const suggestion = await PromptLibraryApi.assist({
        idea: currentValues.title,
        goal: currentValues.description || '',
        tone: currentValues.visibility === 'workspace' ? 'collaborative' : 'personal',
        audience: currentValues.category || '',
        existingPrompt: currentValues.content,
        tags: currentValues.tags,
        category: currentValues.category || '',
      });
      form.setValue('title', suggestion.title || currentValues.title);
      form.setValue('description', suggestion.description || currentValues.description || '');
      form.setValue('content', suggestion.content || currentValues.content);
      toast.success('Assistant drafted a prompt template.');
    } catch (error) {
      toast.error('Assistant could not generate a prompt right now.');
    } finally {
      setAssistLoading(false);
    }
  }, [form]);

  return {
    form,
    isDialogOpen,
    setIsDialogOpen,
    dialogMode,
    editingPromptId,
    assistLoading,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleAssist,
  };
}
