import { Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslate } from 'src/locales';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { EditGroupModalProps } from '../../types/group-details';

export function EditGroupModal({ open, onClose, groupName }: EditGroupModalProps) {
  const { t } = useTranslate('settings');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            {t('users_groups.edit_group.title')}
          </DialogTitle>
          <DialogDescription>
            {t('users_groups.edit_group.manage_for')} <strong>{groupName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert className="border-blue-500/20 bg-blue-500/5">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm text-muted-foreground">
              {t('users_groups.edit_group.coming_soon')}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            {t('users_groups.edit_group.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
