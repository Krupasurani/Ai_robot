import { useState } from 'react';
import { UserPlus, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import { addUsersToGroups } from '../../utils';
import type { AddUsersToGroupsModalProps } from '../../types/group-details';

export function AddUsersToGroupModal({
  open,
  onClose,
  onUsersAdded,
  allUsers,
  group,
}: AddUsersToGroupsModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAddUsersToGroups = async () => {
    try {
      if (!group) {
        throw new Error('Group ID is required');
      }

      if (selectedUsers.length === 0) {
        toast.error('Please select at least one user');
        return;
      }

      setIsSubmitting(true);
      const userIds = selectedUsers.map((user) => user.value);

      await addUsersToGroups({ userIds, groupIds: [group] });
      toast.success(
        `${userIds.length} user${userIds.length > 1 ? 's' : ''} added to group`
      );
      onUsersAdded();
      setSelectedUsers([]);
      onClose();
    } catch (error: any) {
      toast.error(error?.errorMessage || 'Error adding users to group');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert GroupUser[] to Option[] for MultipleSelector
  const userOptions: Option[] =
    allUsers
      ?.filter((user) => user._id !== null)
      .map((user) => ({
        value: user._id || '',
        label: user.fullName || 'Invited User',
        description: user.email || 'No email',
        hasPhoto: user.hasPhoto,
      })) || [];

  const renderUserOption = (option: Option) => (
    <div className="flex items-center gap-2 py-0.5">
      <UserAvatar
        userId={option.value}
        fullName={option.label}
        hasPhoto={Boolean(option.hasPhoto)}
        className="h-6 w-6"
        fallbackClassName="text-[10px]"
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{option.label}</span>
        <span className="text-xs text-muted-foreground">{option.description}</span>
      </div>
    </div>
  );

  const handleClose = () => {
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            Add members
          </DialogTitle>
          <DialogDescription>
            Select users to add to this group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {allUsers ? (
            <div className="space-y-2">
              <Label>Select users</Label>
              <MultipleSelector
                value={selectedUsers}
                onChange={setSelectedUsers}
                options={userOptions}
                placeholder="Search by name or email..."
                renderOptionLabel={renderUserOption}
                emptyIndicator={
                  <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
                }
                className="bg-muted/30"
              />
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {selectedUsers.length > 0 && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
            </p>
          )}

          <Alert className="border-blue-500/20 bg-blue-500/5">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm text-muted-foreground">
              Added users will inherit all permissions associated with this group.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleAddUsersToGroups} disabled={selectedUsers.length === 0 || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add member{selectedUsers.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
