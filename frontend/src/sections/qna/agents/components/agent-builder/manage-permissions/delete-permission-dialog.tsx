import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Permission {
  _id: string;
  _key: string;
  entity_id: string;
  entity_key: string;
  entity_name: string;
  entity_email?: string;
  entity_type: 'USER' | 'TEAM';
  role: string;
  created_at: number;
  updated_at: number;
}

interface DeletePermissionDialogProps {
  open: boolean;
  onClose: () => void;
  permission: Permission | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeletePermissionDialog({
  open,
  onClose,
  permission,
  onConfirm,
  isDeleting,
}: DeletePermissionDialogProps) {
  if (!permission) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" />
            </div>
            Remove Access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            Are you sure you want to remove <strong>{permission.entity_name}</strong>&apos;s access
            to this agent?
          </p>

          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription className="font-medium">
              This action cannot be undone
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="size-4 mr-2" />
                Remove Access
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
