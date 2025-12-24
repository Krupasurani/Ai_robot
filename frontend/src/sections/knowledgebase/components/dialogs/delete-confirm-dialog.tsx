import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { useTranslate } from 'src/locales';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  loading?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
}) => {
  const { t } = useTranslate('dialogs');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" />
            </div>
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div
            className="text-sm text-foreground leading-relaxed mb-4 [&_strong]:font-semibold [&_strong]:text-foreground"
            dangerouslySetInnerHTML={{ __html: message }}
          />

          <Alert variant="destructive" className="bg-destructive/8 border-destructive/20">
            <AlertTriangle className="size-4" />
            <AlertDescription className="font-medium text-destructive">
              {t('delete.cannot_be_undone')}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('delete.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? t('delete.deleting') : t('delete.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
