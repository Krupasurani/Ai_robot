import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

import { useTranslate } from 'src/locales';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmojiPicker } from '@/components/ui/emoji-picker';

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, icon?: string, description?: string) => Promise<void>;
  loading?: boolean;
}

export const CreateKnowledgeBaseDialog: React.FC<CreateKnowledgeBaseDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const { t } = useTranslate('dialogs');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📚');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (name.trim()) {
      await onSubmit(name.trim(), icon, description.trim() || undefined);
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setIcon('📚');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && name.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[440px] gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {t('kb.create.title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            {t('kb.create.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Form Body */}
        <div className="px-6 pb-6 space-y-4">
          {/* Knowledge Base Name - Icon + Input Row */}
          <div className="space-y-2">
            <Label htmlFor="kb-name" className="text-sm font-medium flex items-center gap-1">
              {t('kb.create.name_label')}
              <span className="text-muted-foreground text-xs font-normal ml-0.5">ⓘ</span>
            </Label>
            <div className="flex items-center gap-2">
              {/* Emoji Picker Trigger - Same height as input */}
              <EmojiPicker
                value={icon}
                onChange={setIcon}
                disabled={loading}
              />
              {/* Name Input */}
              <Input
                id="kb-name"
                placeholder={t('kb.create.name_placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1"
              />
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="kb-description" className="text-sm font-medium">
              {t('kb.create.desc_label')} <span className="text-muted-foreground font-normal">({t('kb.create.optional')})</span>
            </Label>
            <Textarea
              id="kb-description"
              placeholder={t('kb.create.desc_placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="min-h-[80px] resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 gap-2 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={loading}
            className="text-muted-foreground"
          >
            {t('kb.create.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || loading}
            className="bg-[#5C9DFF] hover:bg-[#4A8BE8] text-white"
          >
            {loading ? t('kb.create.creating') : t('kb.create.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
