import { Edit2, Loader2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

interface EditPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  permission: Permission | null;
  newRole: string;
  onRoleChange: (role: string) => void;
  onSave: () => void;
  isUpdating: boolean;
  roleOptions: Array<{ value: string; label: string; description: string }>;
  getInitials: (name: string) => string;
  getAvatarColor: (name: string) => string;
}

export function EditPermissionDialog({
  open,
  onClose,
  permission,
  newRole,
  onRoleChange,
  onSave,
  isUpdating,
  roleOptions,
  getInitials,
  getAvatarColor,
}: EditPermissionDialogProps) {
  if (!permission) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-warning/10 text-warning">
              <Edit2 className="size-4" />
            </div>
            Edit Permission
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4">
            <Avatar
              className="size-10"
              style={{ backgroundColor: getAvatarColor(permission.entity_name) }}
            >
              <AvatarFallback>
                {permission.entity_type === 'TEAM' ? (
                  <Users className="size-5" />
                ) : (
                  getInitials(permission.entity_name)
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{permission.entity_name}</p>
              <p className="text-xs text-muted-foreground">
                {permission.entity_type}
                {permission.entity_email && ` • ${permission.entity_email}`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={onRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isUpdating || !newRole}>
            {isUpdating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Edit2 className="size-4 mr-2" />
                Update Role
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
