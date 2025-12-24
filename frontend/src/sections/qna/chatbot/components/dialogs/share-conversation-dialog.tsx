import type { User } from 'src/context/UserContext';

import { toast } from 'sonner';
import { useState } from 'react';
import { X, Share2Icon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import LoadingState from '@/components/ui/loader';
import MultipleSelector from '@/components/ui/multi-select';
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { cn } from '@/utils/cn';
import axiosInstance from 'src/utils/axios';

import { useUsers } from 'src/context/UserContext';

interface ShareConversationDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  onShareSuccess?: (conversationId?: string) => void;
}

const ShareConversationDialog = ({
  open,
  onClose,
  conversationId,
  onShareSuccess,
}: ShareConversationDialogProps) => {
  const usersData = useUsers();
  // Ensure users is always an array (handles cases where API returns unexpected format)
  const users = Array.isArray(usersData) ? usersData : [];

  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [shareLink, setShareLink] = useState<string>('');
  const [isShared, setIsShared] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [allowWriteAccess, setAllowWriteAccess] = useState<boolean>(false);

  const handleShareConversation = async () => {
    if (selectedUsers.length === 0) return;

    setIsLoading(true);
    try {
      const response = await axiosInstance.post(`/api/v1/conversations/${conversationId}/share`, {
        isPublic: true,
        userIds: selectedUsers.map((user) => user._id),
        accessLevel: allowWriteAccess ? 'write' : 'read',
      });

      setShareLink(response.data.shareLink);
      setIsShared(true);
      onShareSuccess?.(conversationId || undefined);
    } catch (error) {
      toast.error('Failed to share conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      toast.success('Link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleDialogClose = () => {
    setSelectedUsers([]);
    setShareLink('');
    setIsShared(false);
    setAllowWriteAccess(false);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleDialogClose}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader className="relative flex flex-row justify-between items-center pb-0">
          <AlertDialogTitle className="flex text-primary gap-2 items-center text-base font-semibold">
            <Share2Icon className="h-4 w-4" />
            Share Conversation
          </AlertDialogTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-sm hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </AlertDialogHeader>
        <Separator className="my-4" />
        <AlertDialogDescription className="text-foreground">
          <div>
            <h2 className="mb-3 font-medium text-base text-foreground">Share With Team Members</h2>
            <MultipleSelector
              value={selectedUsers.map((user) => ({
                value: user._id,
                label: `${user.fullName} (${user.email})`,
              }))}
              onChange={(options) => {
                const selected = users.filter((user) =>
                  options.some((opt) => opt.value === user._id)
                );
                setSelectedUsers(selected);
              }}
              defaultOptions={users.map((user) => ({
                value: user._id,
                label: `${user.fullName} (${user.email})`,
              }))}
              placeholder="Search users by name or email..."
              emptyIndicator={
                <p className="text-center text-sm leading-10 text-muted-foreground">
                  No users found.
                </p>
              }
            />
            <div className="mt-4 flex items-start gap-2">
              <Checkbox
                id="allowWriteAccess"
                checked={allowWriteAccess}
                onCheckedChange={(checked) => setAllowWriteAccess(Boolean(checked))}
                disabled={selectedUsers.length === 0}
                className="mt-0.5"
              />
              <Label
                htmlFor="allowWriteAccess"
                className={cn(
                  'text-sm leading-relaxed cursor-pointer',
                  selectedUsers.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                )}
              >
                Allow selected users to write messages and chat with the AI in this conversation
              </Label>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-center">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              Sharing conversations with uploaded images is not supported
            </span>
          </div>
        </AlertDialogDescription>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={selectedUsers.length === 0 || isLoading}
            onClick={handleShareConversation}
            className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <LoadingState loading={isLoading}>Share</LoadingState>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ShareConversationDialog;
