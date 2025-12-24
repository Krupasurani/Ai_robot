import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslate } from '@/locales';
import { FormProvider } from 'react-hook-form';
import { RHFTextField } from '@/components/hook-form/rhf-text-field';
import { RHFSelect } from '@/components/hook-form/rhf-select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { TagInput } from './tag-input';
import { TEMPLATE_OPTIONS } from '../constants';
import { PromptFormValues } from '../schemas/prompt-form-schema';
import { UseFormReturn } from 'react-hook-form';

interface PromptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  form: UseFormReturn<PromptFormValues>;
  onSubmit: (data: PromptFormValues) => Promise<void>;
  isSaving: boolean;
  onAssist: () => void;
  assistLoading: boolean;
}

export function PromptFormDialog({
  open,
  onOpenChange,
  mode,
  form,
  onSubmit,
  isSaving,
  onAssist,
  assistLoading,
}: PromptFormDialogProps) {
  const { t } = useTranslate('prompt-library');

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  const handleTemplateSelect = (templateValues: PromptFormValues) => {
    form.reset(templateValues);
  };

  const heading = mode === 'create' ? t('dialog.createTitle') : t('dialog.editTitle');

  return (
    <FormProvider {...form}>
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>{t('dialog.description')}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('dialog.quickTemplates')}</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {TEMPLATE_OPTIONS.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.values)}
                    className="rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
                  >
                    <p className="text-sm font-medium">{template.label}</p>
                    <p className="text-xs text-muted-foreground">{template.helper}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <RHFTextField
                name="title"
                label={t('dialog.titleLabel')}
                placeholder={t('dialog.titlePlaceholder')}
                required
              />
              <RHFSelect
                name="visibility"
                label={t('dialog.visibilityLabel')}
                placeholder={t('dialog.visibilityLabel')}
                options={[
                  { label: t('dialog.visibilityOptions.private'), value: 'private' },
                  { label: t('dialog.visibilityOptions.users'), value: 'users' },
                  { label: t('dialog.visibilityOptions.workspace'), value: 'workspace' },
                ]}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('dialog.descriptionPlaceholder')}
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.contentLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[200px] font-mono text-sm"
                      placeholder={t('dialog.contentPlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <RHFTextField
                name="category"
                label={t('dialog.categoryLabel')}
                placeholder={t('dialog.categoryPlaceholder')}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TagInput tags={field.value || []} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onAssist}
                disabled={assistLoading}
              >
                {assistLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('dialog.refining')}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> {t('dialog.aiAssist')}
                  </>
                )}
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('dialog.refining')}
                  </>
                ) : mode === 'create' ? (
                  t('dialog.create')
                ) : (
                  t('dialog.saveChanges')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
