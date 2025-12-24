import type { User } from 'src/context/UserContext';

import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import MultipleSelector from '@/components/ui/multi-select';
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogTitle, DialogHeader, DialogFooter, DialogContent } from '@/components/ui/dialog';

import axios from 'src/utils/axios';
import { useUsers } from 'src/context/UserContext';
import { useTranslate } from '@/locales';
import { PromptLibraryApi, type PromptAccessLevel } from '@/api/prompt-library';

type Props = {
  open: boolean;
  onClose: () => void;
  promptId: string;
  promptTitle?: string;
  onSuccess?: () => void;
};

type PromptMember = { userId: string; accessLevel: PromptAccessLevel };

export default function SharePromptDialog({ open, onClose, promptId, promptTitle, onSuccess }: Props) {
  const { t } = useTranslate('prompt-library');
  const users = useUsers();
  const [emails, setEmails] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<PromptMember[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const data = await PromptLibraryApi.getMembers(promptId);
      setMembers(data.sharedWith || []);
      setOwnerId(data.ownerId ? String(data.ownerId) : null);
    } catch (_) {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (open && promptId) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, promptId]);

  const handleInvite = async () => {
    const typedEmails = emails
      .split(/[,\s]+/)
      .map((e) => e.trim())
      .filter((e) => !!e);

    const selectedUserIds = selectedUsers.map((u) => u._id);

    if (selectedUserIds.length === 0 && typedEmails.length === 0) {
      toast.error(t('shareDialog.errorNoSelection'));
      return;
    }

    setSubmitting(true);
    try {
      // 1) Add selected existing users as prompt members
      if (selectedUserIds.length > 0) {
        await PromptLibraryApi.shareWithUsers(promptId, selectedUserIds, 'read');
        toast.success(t('shareDialog.successAddUsers'));
      }

      // 2) Send invites for typed emails (non-users)
      if (typedEmails.length > 0) {
        await axios.post('/api/v1/users/bulk/invite', { emails: typedEmails });
        toast.success(t('shareDialog.successInvites'));
      }

      setEmails('');
      setSelectedUsers([]);

      // keep dialog open so owner can continue managing members
      await fetchMembers();
      onSuccess?.();
    } catch (e) {
      toast.error(t('shareDialog.errorShare'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userIdToRemove: string) => {
    try {
      await PromptLibraryApi.removeMember(promptId, userIdToRemove);
      setMembers((prev) => prev.filter((m) => String(m.userId) !== String(userIdToRemove)));
      toast.success(t('shareDialog.successRemove'));
    } catch (_) {
      toast.error(t('shareDialog.errorRemove'));
    }
  };

  const handleChangeMemberRole = async (userIdToUpdate: string, newRole: PromptAccessLevel) => {
    try {
      await PromptLibraryApi.updateMemberAccess(promptId, userIdToUpdate, newRole);
      setMembers((prev) =>
        prev.map((m) =>
          String(m.userId) === String(userIdToUpdate) ? { ...m, accessLevel: newRole } : m,
        ),
      );
      toast.success(t('shareDialog.successRoleUpdate'));
    } catch (_) {
      toast.error(t('shareDialog.errorRole'));
    }
  };

  const renderUserLabel = (userId: string) => {
    const u = users.find((x) => String(x._id) === String(userId));
    if (!u) return userId;
    return `${u.fullName} (${u.email})`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {t('shareDialog.title', { title: promptTitle || 'Prompt' })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Owner info */}
          {ownerId && (
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div className="text-xs">
                <span className="font-medium">{t('shareDialog.ownerLabel')}: </span>
                <span>{renderUserLabel(ownerId)}</span>
              </div>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {t('shareDialog.ownerLabel')}
              </Badge>
            </div>
          )}

          {/* Add members */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {t('shareDialog.selectTeamMembers')}
            </span>
            <MultipleSelector
              value={selectedUsers.map((user) => ({
                value: user._id,
                label: `${user.fullName} (${user.email})`,
              }))}
              onChange={(options) => {
                const selected = users.filter((user) =>
                  options.some((opt) => opt.value === user._id),
                );
                setSelectedUsers(selected);
              }}
              defaultOptions={users.map((user) => ({
                value: user._id,
                label: `${user.fullName} (${user.email})`,
              }))}
              placeholder={t('shareDialog.searchPlaceholder')}
              emptyIndicator={
                <p className="text-center text-sm text-muted-foreground">
                  {t('shareDialog.noUsersFound')}
                </p>
              }
            />
          </div>
          <Separator />

          {/* Invite via email */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {t('shareDialog.inviteByEmail')}
            </span>
            <Input
              placeholder={t('shareDialog.invitePlaceholder')}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="rounded-2xl"
            />
            <p className="text-[11px] text-muted-foreground">
              {t('shareDialog.inviteHelper')}
            </p>
          </div>
          <Separator />

          {/* Current members list with role switching */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('shareDialog.currentMembers')}
              </span>
              {loadingMembers && (
                <span className="text-[11px] text-muted-foreground">
                  {t('shareDialog.loading')}
                </span>
              )}
            </div>
            {members.length === 0 && !loadingMembers && (
              <p className="text-[12px] text-muted-foreground">
                {t('shareDialog.noMembers')}
              </p>
            )}
            {members.length > 0 && (
              <div className="space-y-1">
                {members.map((m) => (
                  <div
                    key={String(m.userId)}
                    className="flex items-center justify-between rounded-2xl border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{renderUserLabel(String(m.userId))}</span>
                      <Select
                        value={m.accessLevel || 'read'}
                        onValueChange={(v) =>
                          handleChangeMemberRole(String(m.userId), v as PromptAccessLevel)
                        }
                        disabled={String(m.userId) === String(ownerId)}
                      >
                        <SelectTrigger className="h-8 w-[110px] rounded-2xl">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">{t('shareDialog.roleRead')}</SelectItem>
                          <SelectItem value="write">{t('shareDialog.roleWrite')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(String(m.userId))}
                      aria-label={t('shareDialog.closeButton')}
                      disabled={String(m.userId) === String(ownerId)}
                      className="rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-2xl">
            {t('shareDialog.closeButton')}
          </Button>
          <Button onClick={handleInvite} disabled={submitting} className="rounded-2xl">
            {t('shareDialog.shareButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

