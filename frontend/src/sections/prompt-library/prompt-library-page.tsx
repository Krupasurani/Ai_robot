import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslate } from '@/locales';
import { useRouter } from 'src/routes/hooks';
import { cn } from '@/utils/cn';
import { Grid3x3, List, Loader2, Plus } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { PromptTemplate } from '@/api/prompt-library';
import { usePromptLibrary } from './hooks/use-prompt-library';
import { usePromptActions } from './hooks/use-prompt-actions';
import { usePromptForm } from './hooks/use-prompt-form';
import { PromptFormValues } from './schemas/prompt-form-schema';
import { PromptList } from './components/prompt-list';
import { PromptSkeletonList } from './components/prompt-skeleton-list';
import { EmptyState } from './components/empty-state';
import { PromptDetailsPanel } from './components/prompt-details-panel';
import { PromptFormDialog } from './components/prompt-form-dialog';
import { DeletePromptDialog } from './components/delete-prompt-dialog';
import { PromptFilters } from './components/prompt-filters';
import SharePromptDialog from './SharePromptDialog';

export default function PromptLibraryPage() {
  const { t } = useTranslate('prompt-library');
  const router = useRouter();
  const isMobile = useIsMobile();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [promptToShare, setPromptToShare] = useState<string | null>(null);
  const [promptToShareTitle, setPromptToShareTitle] = useState<string | undefined>(undefined);

  const {
    prompts,
    setPrompts,
    selectedPrompt,
    setSelectedPrompt,
    viewMode,
    setViewMode,
    filters,
    updateFilters,
    resetFilters,
    isLoading,
    isRefreshing,
    categories,
    tags,
    hasActiveFilters,
    fetchPrompts,
    searchParams,
    pathname,
  } = usePromptLibrary();

  const {
    isSaving,
    isDeleting,
    pendingDelete,
    setPendingDelete,
    handleSavePrompt,
    handleDeletePrompt,
    handleDuplicatePrompt,
    handleToggleVisibility,
    handleUsePrompt,
  } = usePromptActions(prompts, setPrompts, selectedPrompt, setSelectedPrompt);

  const {
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
  } = usePromptForm();

  // Auto-open create dialog when navigating with ?create=true query parameter
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true';
    if (shouldCreate && !isDialogOpen) {
      openCreateDialog();
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('create');
      const newSearch = newSearchParams.toString();
      const newPath = newSearch ? `${pathname}?${newSearch}` : pathname;
      router.replace(newPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isDialogOpen, router, pathname]);

  const handleSelectPrompt = useCallback(
    (prompt: PromptTemplate) => {
      setSelectedPrompt(prompt);
      if (isMobile) {
        setDetailsOpen(true);
      }
    },
    [isMobile, setSelectedPrompt]
  );

  const handleSave = useCallback(
    async (data: PromptFormValues) => {
      const payload = {
        title: data.title.trim(),
        description: data.description?.trim() || '',
        content: data.content.trim(),
        category: data.category?.trim() || 'general',
        tags: data.tags,
        visibility: data.visibility,
      };
      const success = await handleSavePrompt(payload, dialogMode, editingPromptId);
      if (success) {
        closeDialog();
      }
    },
    [dialogMode, editingPromptId, handleSavePrompt, closeDialog]
  );

  const handleShare = useCallback((prompt: PromptTemplate) => {
    setPromptToShare(prompt._id);
    setPromptToShareTitle(prompt.title);
    setShareDialogOpen(true);
  }, []);

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold md:text-2xl">{t('page.title')}</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">{t('page.description')}</p>
          </div>
          <Button onClick={openCreateDialog} size="sm" className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('header.newPrompt')}</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Filters */}
        <PromptFilters
          filters={filters}
          categories={categories}
          tags={tags}
          hasActiveFilters={hasActiveFilters}
          onFiltersChange={updateFilters}
          onResetFilters={resetFilters}
        />
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {/* Prompt List */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col border-r border-border',
            !isMobile && selectedPrompt && 'lg:w-1/2'
          )}
        >
          {/* Toolbar */}
          <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'}
              </span>
              {isRefreshing && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Prompt Grid/List */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {isLoading ? (
                <PromptSkeletonList viewMode={viewMode} />
              ) : prompts.length === 0 ? (
                <EmptyState onCreate={openCreateDialog} />
              ) : (
                <PromptList
                  prompts={prompts}
                  selectedPromptId={selectedPrompt?._id}
                  onSelect={handleSelectPrompt}
                  viewMode={viewMode}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Details Panel - Desktop */}
        {!isMobile && (
          <div className="hidden w-1/2 flex-col border-l border-border lg:flex">
            <PromptDetailsPanel
              prompt={selectedPrompt}
              onUse={handleUsePrompt}
              onEdit={openEditDialog}
              onDuplicate={handleDuplicatePrompt}
              onDelete={setPendingDelete}
              onVisibilityChange={handleToggleVisibility}
              onShare={handleShare}
            />
          </div>
        )}
      </div>

      {/* Details Panel - Mobile Sheet */}
      {isMobile && (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
            <SheetHeader className="border-b border-border px-4 py-3 shrink-0">
              <SheetTitle>Prompt Details</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <PromptDetailsPanel
                prompt={selectedPrompt}
                onUse={handleUsePrompt}
                onEdit={openEditDialog}
                onDuplicate={handleDuplicatePrompt}
                onDelete={setPendingDelete}
                onVisibilityChange={handleToggleVisibility}
                onShare={handleShare}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <PromptFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        form={form}
        onSubmit={handleSave}
        isSaving={isSaving || form.formState.isSubmitting}
        onAssist={handleAssist}
        assistLoading={assistLoading}
      />

      <DeletePromptDialog
        prompt={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeletePrompt}
        isLoading={isDeleting}
      />

      <SharePromptDialog
        open={shareDialogOpen}
        onClose={() => {
          setShareDialogOpen(false);
          setPromptToShare(null);
          setPromptToShareTitle(undefined);
        }}
        promptId={promptToShare || ''}
        promptTitle={promptToShareTitle}
        onSuccess={() => {
          if (promptToShare) {
            fetchPrompts();
          }
        }}
      />
    </div>
  );
}
