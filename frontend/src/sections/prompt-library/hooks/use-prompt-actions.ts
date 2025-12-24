import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  PromptLibraryApi,
  PromptTemplate,
  PromptVisibility,
  CreatePromptPayload,
} from '@/api/prompt-library';

export function usePromptActions(
  prompts: PromptTemplate[],
  setPrompts: React.Dispatch<React.SetStateAction<PromptTemplate[]>>,
  selectedPrompt: PromptTemplate | null,
  setSelectedPrompt: React.Dispatch<React.SetStateAction<PromptTemplate | null>>
) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PromptTemplate | null>(null);

  const handleSavePrompt = useCallback(
    async (
      payload: CreatePromptPayload,
      mode: 'create' | 'edit',
      editingPromptId: string | null
    ) => {
      setIsSaving(true);
      try {
        if (mode === 'create') {
          const created = await PromptLibraryApi.create(payload);
          setPrompts((prev) => [created, ...prev]);
          setSelectedPrompt(created);
          toast.success('Prompt saved to your library.');
        } else if (editingPromptId) {
          const updated = await PromptLibraryApi.update(editingPromptId, payload);
          setPrompts((prev) => prev.map((p) => (p._id === editingPromptId ? updated : p)));
          setSelectedPrompt(updated);
          toast.success('Prompt updated.');
        }
        return true;
      } catch (error) {
        toast.error('Failed to save prompt.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [setPrompts, setSelectedPrompt]
  );

  const handleDeletePrompt = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await PromptLibraryApi.remove(pendingDelete._id);
      setPrompts((prev) => prev.filter((p) => p._id !== pendingDelete._id));
      if (selectedPrompt?._id === pendingDelete._id) {
        setSelectedPrompt(null);
      }
      toast.success('Prompt deleted.');
    } catch (error) {
      toast.error('Unable to delete prompt.');
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, setPrompts, selectedPrompt, setSelectedPrompt]);

  const handleDuplicatePrompt = useCallback(
    async (prompt: PromptTemplate) => {
      try {
        const duplicated = await PromptLibraryApi.create({
          title: `${prompt.title || 'Prompt'} (copy)`,
          description: prompt.description || '',
          content: prompt.content,
          category: prompt.category || 'general',
          tags: prompt.tags || [],
          visibility: 'private',
        });
        setPrompts((prev) => [duplicated, ...prev]);
        toast.success('Prompt duplicated.');
      } catch (error) {
        toast.error('Unable to duplicate prompt.');
      }
    },
    [setPrompts]
  );

  const handleToggleVisibility = useCallback(
    async (prompt: PromptTemplate, visibility: PromptVisibility) => {
      try {
        const updated = await PromptLibraryApi.setVisibility(prompt._id, visibility);
        setPrompts((prev) => prev.map((p) => (p._id === prompt._id ? updated : p)));
        setSelectedPrompt(updated);
        toast.success(
          visibility === 'workspace' ? 'Prompt shared with workspace.' : 'Prompt set to private.'
        );
      } catch (error) {
        toast.error('Failed to update visibility.');
      }
    },
    [setPrompts, setSelectedPrompt]
  );

  const handleUsePrompt = useCallback(async (prompt: PromptTemplate) => {
    try {
      await navigator.clipboard.writeText(prompt.content || '');
      toast.success('Prompt copied. Switch to chat to paste it.');
    } catch {
      toast.error('Unable to copy prompt.');
    }
  }, []);

  return {
    isSaving,
    isDeleting,
    pendingDelete,
    setPendingDelete,
    handleSavePrompt,
    handleDeletePrompt,
    handleDuplicatePrompt,
    handleToggleVisibility,
    handleUsePrompt,
  };
}
