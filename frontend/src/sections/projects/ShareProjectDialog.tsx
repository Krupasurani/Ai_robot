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

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
};

type ProjectMember = { userId: string; accessLevel: 'read' | 'write' };

export default function ShareProjectDialog({ open, onClose, projectId, projectTitle }: Props) {
  const users = useUsers();
  const [emails, setEmails] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

  const shareUrl = `${window.location.origin}/projects/${projectId}`;

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await axios.get(`/api/v1/projects/${projectId}/members`);
      setMembers(res.data?.sharedWith || []);
      setOwnerId(res.data?.ownerId ? String(res.data.ownerId) : null);
    } catch (_) {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const handleInvite = async () => {
    const typedEmails = emails
      .split(/[,\s]+/)
      .map((e) => e.trim())
      .filter((e) => !!e);

    const selectedUserIds = selectedUsers.map((u) => u._id);

    if (selectedUserIds.length === 0 && typedEmails.length === 0) {
      toast.error('Please enter at least one email or select users');
      return;
    }

    setSubmitting(true);
    try {
      // 1) Add selected existing users as project members
      if (selectedUserIds.length > 0) {
        const shareRes = await axios.post(`/api/v1/projects/${projectId}/share`, {
          userIds: selectedUserIds,
          accessLevel: 'read',
        });
        setMembers(shareRes.data?.sharedWith || []);
        toast.success('Users added to project');
      }

      // 2) Send invites for typed emails (non-users)
      if (typedEmails.length > 0) {
        await axios.post('/api/v1/users/bulk/invite', { emails: typedEmails });
        toast.success('Invitations sent');
      }

      setEmails('');
      setSelectedUsers([]);

      // keep dialog open so owner can continue managing members
      await fetchMembers();
    } catch (e) {
      toast.error('Could not complete sharing/invites');
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.info('Share link copied to clipboard');
      } catch (_) {
        // ignore
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userIdToRemove: string) => {
    try {
      await axios.post(`/api/v1/projects/${projectId}/unshare`, { userIds: [userIdToRemove] });
      setMembers((prev) => prev.filter((m) => String(m.userId) !== String(userIdToRemove)));
      toast.success('Member removed');
    } catch (_) {
      toast.error('Failed to remove member');
    }
  };

  const handleChangeMemberRole = async (userIdToUpdate: string, newRole: 'read' | 'write') => {
    try {
      const res = await axios.post(`/api/v1/projects/${projectId}/share`, {
        userIds: [userIdToUpdate],
        accessLevel: newRole,
      });
      setMembers(res.data?.sharedWith || []);
      toast.success('Role updated');
    } catch (_) {
      toast.error('Failed to update role');
    }
  };

  const renderUserLabel = (userId: string) => {
    const u = users.find((x) => String(x._id) === String(userId));
    if (!u) return userId;
    return `${u.fullName} (${u.email})`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share project {projectTitle ? `“${projectTitle}”` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Owner info */}
          {ownerId && (
            <div className="flex items-center justify-between rounded-md border p-2">
              <div className="text-xs">
                <span className="font-medium">Owner: </span>
                <span>{renderUserLabel(ownerId)}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">Owner</Badge>
            </div>
          )}

          {/* Add members */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Select team members</span>
            <MultipleSelector
              value={selectedUsers.map((user) => ({ value: user._id, label: `${user.fullName} (${user.email})` }))}
              onChange={(options) => {
                const selected = users.filter((user) => options.some((opt) => opt.value === user._id));
                setSelectedUsers(selected);
              }}
              defaultOptions={users.map((user) => ({ value: user._id, label: `${user.fullName} (${user.email})` }))}
              placeholder="Search users by name or email..."
              emptyIndicator={
                <p className="text-center text-sm text-muted-foreground">No users found.</p>
              }
            />
          </div>
          <Separator />

          {/* Invite via email */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Invite by email</span>
            <Input
              placeholder="name1@company.com, name2@company.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Use comma or space to separate multiple emails.</p>
          </div>
          <Separator />

          {/* Current members list with role switching */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Current members</span>
              {loadingMembers && <span className="text-[11px] text-muted-foreground">Loading…</span>}
            </div>
            {members.length === 0 && !loadingMembers && (
              <p className="text-[12px] text-muted-foreground">No members yet.</p>
            )}
            {members.length > 0 && (
              <div className="space-y-1">
                {members.map((m) => (
                  <div key={String(m.userId)} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{renderUserLabel(String(m.userId))}</span>
                      <Select
                        value={(m.accessLevel || 'read') as 'read' | 'write'}
                        onValueChange={(v) => handleChangeMemberRole(String(m.userId), v as 'read' | 'write')}
                        disabled={String(m.userId) === String(ownerId)}
                      >
                        <SelectTrigger className="h-8 w-[110px]">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="write">Write</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(String(m.userId))}
                      aria-label="Remove member"
                      disabled={String(m.userId) === String(ownerId)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Share link</span>
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl} className="font-mono text-xs" />
              <Button type="button" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); }}>Copy</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={handleInvite} disabled={submitting}>Share / Invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


