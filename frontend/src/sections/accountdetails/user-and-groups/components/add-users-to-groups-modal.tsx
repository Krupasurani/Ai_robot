import { useState } from 'react';
import { Users as UsersIcon, UserCog, Loader2 } from 'lucide-react';
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
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import { addUsersToGroups } from '../../utils';
import type { AddUsersToGroupsModalProps } from '../../types/group-details';

export function AddUsersToGroupsModal({
  open,
  onClose,
  onUsersAdded,
  allUsers,
  groups,
}: AddUsersToGroupsModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<Option[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Convert users to Option format
  const userOptions: Option[] = (allUsers || [])
    .filter((user) => Boolean(user?._id && user?.fullName))
    .map((user) => ({
      value: user._id!,
      label: user.fullName || 'Unknown User',
      description: user.email || 'No email',
      hasPhoto: user.hasPhoto,
    }));

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

  // Convert groups to Option format
  const groupOptions: Option[] = (groups || []).map((group) => ({
    value: group._id,
    label: group.name,
  }));

  const handleAddUsersToGroups = async () => {
    if (selectedUsers.length === 0 || selectedGroups.length === 0) return;

    setIsSubmitting(true);
    try {
      const userIds = selectedUsers.map((option) => option.value);
      const groupIds = selectedGroups.map((option) => option.value);

      await addUsersToGroups({ userIds, groupIds });
      toast.success(
        `${userIds.length} user${userIds.length > 1 ? 's' : ''} added to ${groupIds.length} group${groupIds.length > 1 ? 's' : ''}`
      );

      setSelectedUsers([]);
      setSelectedGroups([]);
      onUsersAdded();
      onClose();
    } catch (error: any) {
      toast.error(error?.errorMessage || 'Failed to add users to groups');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSelectedGroups([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            Add users to groups
          </DialogTitle>
          <DialogDescription>
            Select users and groups to manage permissions more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Select users</Label>
            <MultipleSelector
              value={selectedUsers}
              onChange={(options) => setSelectedUsers(options)}
              options={userOptions}
              placeholder="Search and select users..."
              renderOptionLabel={renderUserOption}
              hidePlaceholderWhenSelected
              className="bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <Label>Select groups</Label>
            <MultipleSelector
              value={selectedGroups}
              onChange={(options) => setSelectedGroups(options)}
              options={groupOptions}
              placeholder="Search and select groups..."
              hidePlaceholderWhenSelected
              className="bg-muted/30"
            />
          </div>

          {selectedUsers.length > 0 && selectedGroups.length > 0 && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} will be added to{' '}
              {selectedGroups.length} group{selectedGroups.length > 1 ? 's' : ''}.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddUsersToGroups}
            disabled={selectedUsers.length === 0 || selectedGroups.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UsersIcon className="mr-2 h-4 w-4" />
                Add to groups
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
