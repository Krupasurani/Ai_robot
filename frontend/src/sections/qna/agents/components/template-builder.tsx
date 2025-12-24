import type { AgentTemplate, AgentTemplateFormData } from 'src/types/agent';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Check, Trash2, FileText, Loader2 } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/utils/cn';

import AgentApiService from '../services/api';
import { TEMPLATE_CATEGORIES, getInitialTemplateFormData } from '../utils/agent';

interface TemplateBuilderProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (template: AgentTemplate) => void;
  editingTemplate?: AgentTemplate | null;
}

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  open,
  onClose,
  onSuccess,
  editingTemplate,
}) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<AgentTemplateFormData>(getInitialTemplateFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Initialize form data with safe handling
  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name || '',
        description: editingTemplate.description || '',
        category: editingTemplate.category || '',
        startMessage: editingTemplate.startMessage || '',
        systemPrompt: editingTemplate.systemPrompt || '',
        tags: Array.isArray(editingTemplate.tags) ? [...editingTemplate.tags] : [],
        isDeleted: editingTemplate.isDeleted || false,
      });
    } else {
      setFormData(getInitialTemplateFormData());
    }
  }, [editingTemplate, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(getInitialTemplateFormData());
      setErrors({});
      setNewTag('');
    }
  }, [open]);

  const handleFormChange = useCallback(
    (field: keyof AgentTemplateFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    },
    [errors]
  );

  const handleSave = useCallback(
    async (e?: React.MouseEvent) => {
      // Prevent any event bubbling that might interfere
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      try {
        setIsSaving(true);
        const template = editingTemplate
          ? await AgentApiService.updateTemplate(editingTemplate._key, formData)
          : await AgentApiService.createTemplate(formData);

        onSuccess(template);
        onClose();
      } catch (error) {
        console.error('Error saving template:', error);
        setErrors({ general: 'Failed to save template. Please try again.' });
      } finally {
        setIsSaving(false);
      }
    },
    [formData, editingTemplate, onSuccess, onClose]
  );

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!isSaving) {
        onClose();
      }
    },
    [isSaving, onClose]
  );

  // Array field helpers with safe handling
  const addArrayItem = useCallback(
    (field: keyof AgentTemplateFormData, value: string) => {
      if (!value.trim()) return;

      const currentArray = Array.isArray(formData[field]) ? (formData[field] as string[]) : [];
      if (!currentArray.includes(value.trim())) {
        handleFormChange(field, [...currentArray, value.trim()]);
      }
    },
    [formData, handleFormChange]
  );

  const removeArrayItem = useCallback(
    (field: keyof AgentTemplateFormData, index: number) => {
      const currentArray = Array.isArray(formData[field]) ? (formData[field] as string[]) : [];
      handleFormChange(
        field,
        currentArray.filter((_, i) => i !== index)
      );
    },
    [formData, handleFormChange]
  );

  const handleAddTag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (newTag.trim()) {
        addArrayItem('tags', newTag);
        setNewTag('');
      }
    },
    [newTag, addArrayItem]
  );

  const renderArrayField = (
    field: keyof AgentTemplateFormData,
    label: string,
    placeholder: string,
    newValue: string,
    setNewValue: (value: string) => void,
    helperText: string,
    suggestions: string[] = []
  ) => {
    const fieldArray = Array.isArray(formData[field]) ? (formData[field] as string[]) : [];

    return (
      <div key={field} className="col-span-12">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{label}</h3>

        {fieldArray.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {fieldArray.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-primary/8 border-primary/20 text-primary hover:bg-primary/12"
              >
                {item}
                <button
                  onClick={() => removeArrayItem(field, index)}
                  className="ml-2 hover:text-primary/80"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-2">
          {suggestions.length > 0 ? (
            <Command className="flex-1 rounded-xl border">
              <CommandInput
                placeholder={placeholder}
                value={newValue}
                onValueChange={setNewValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem(field, newValue);
                    setNewValue('');
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>No suggestions found.</CommandEmpty>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => {
                      addArrayItem(field, suggestion);
                      setNewValue('');
                    }}
                  >
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          ) : (
            <Input
              placeholder={placeholder}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem(field, newValue);
                  setNewValue('');
                }
              }}
              className="flex-1 rounded-xl bg-muted/50"
            />
          )}
          <Button
            onClick={
              field === 'tags'
                ? handleAddTag
                : () => {
                    addArrayItem(field, newValue);
                    setNewValue('');
                  }
            }
            disabled={!newValue.trim()}
            variant="outline"
            size="icon"
            className="rounded-xl border-primary/30 text-primary hover:bg-primary/8 hover:border-primary"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isSaving && handleClose()}>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DialogContent
              className={cn(
                'max-w-2xl max-h-[92vh] p-0 flex flex-col overflow-hidden',
                isMobile && 'h-screen max-h-screen m-0 rounded-none'
              )}
            >
              {/* Header */}
              <DialogTitle className="flex items-center justify-between p-6 pb-4 border-b border-border/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">
                      {editingTemplate ? 'Edit Template' : 'Create Agent Template'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {editingTemplate
                        ? 'Modify template settings'
                        : 'Build a reusable agent template'}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogTitle>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                {/* Basic Information */}
                <div className="mb-8">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Basic Information</h3>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 sm:col-span-8">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        placeholder="Enter template name"
                        value={formData.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className={cn(
                          'mt-1.5 rounded-xl bg-muted/50',
                          errors.name && 'border-destructive'
                        )}
                      />
                      {errors.name ? (
                        <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          A unique name for your template
                        </p>
                      )}
                    </div>

                    <div className="col-span-12 sm:col-span-4">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => handleFormChange('category', value)}
                      >
                        <SelectTrigger
                          id="category"
                          className={cn(
                            'mt-1.5 w-full rounded-xl bg-muted/50',
                            errors.category && 'border-destructive'
                          )}
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="mt-1.5 text-xs text-destructive">{errors.category}</p>
                      )}
                    </div>

                    <div className="col-span-12">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what this template is for and what kind of agents it creates"
                        value={formData.description}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        rows={3}
                        className={cn(
                          'mt-1.5 rounded-xl bg-muted/50',
                          errors.description && 'border-destructive'
                        )}
                      />
                      {errors.description ? (
                        <p className="mt-1.5 text-xs text-destructive">{errors.description}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Explain the purpose and use case of this template
                        </p>
                      )}
                    </div>

                    <div className="col-span-12">
                      <Label htmlFor="system-prompt">System Prompt Template</Label>
                      <Textarea
                        id="system-prompt"
                        placeholder="You are a helpful AI assistant specialized in... Always be professional and..."
                        value={formData.systemPrompt}
                        onChange={(e) => handleFormChange('systemPrompt', e.target.value)}
                        rows={5}
                        className={cn(
                          'mt-1.5 rounded-xl bg-muted/50',
                          errors.systemPrompt && 'border-destructive'
                        )}
                      />
                      {errors.systemPrompt ? (
                        <p className="mt-1.5 text-xs text-destructive">{errors.systemPrompt}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Default system prompt that defines behavior for agents created from this
                          template
                        </p>
                      )}
                    </div>

                    <div className="col-span-12">
                      <div className="flex items-start gap-3">
                        <Switch
                          checked={formData.isDeleted}
                          onCheckedChange={(checked) => handleFormChange('isDeleted', checked)}
                        />
                        <div className="flex-1">
                          <Label className="font-medium">Public Template</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Allow other users in your organization to discover and use this template
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Default Configuration */}
                <div className="mb-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Default Configuration
                  </h3>
                  <div className="grid grid-cols-12 gap-4">
                    {renderArrayField(
                      'tags',
                      'Default Tags',
                      'Add a tag',
                      newTag,
                      setNewTag,
                      'Tags that will be applied to agents created from this template'
                    )}
                  </div>
                </div>

                {/* Validation Errors */}
                {errors.general && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{errors.general}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Actions */}
              <DialogFooter className="p-6 pt-4 border-t border-border/10 flex-shrink-0 bg-muted/50">
                <Button
                  onClick={handleClose}
                  disabled={isSaving}
                  variant="outline"
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-xl min-w-[140px] font-semibold"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingTemplate ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {editingTemplate ? 'Update Template' : 'Create Template'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </m.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default TemplateBuilder;
