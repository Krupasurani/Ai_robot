import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import { Button } from 'src/components/ui/button';
import { Separator } from 'src/components/ui/separator';
import SmtpConfigForm from './smtp-config-form';
import type { SmtpConfigFormRef } from './smtp-config-form';

interface ConfigureSmtpDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ConfigureSmtpDialog: React.FC<ConfigureSmtpDialogProps> = ({ open, onClose, onSave }) => {
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<SmtpConfigFormRef>(null);

  const handleFormValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  const handleSave = async () => {
    if (!formRef.current) return;

    setIsSaving(true);
    try {
      const success = await formRef.current.handleSave();

      if (success) {
        onSave();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure SMTP</DialogTitle>
          <DialogDescription>Configure your SMTP email settings</DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="pt-3">
          <SmtpConfigForm
            ref={formRef}
            onValidationChange={handleFormValidationChange}
            onSaveSuccess={onSave}
          />
        </div>

        <Separator />

        <DialogFooter className="px-3 py-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigureSmtpDialog;
