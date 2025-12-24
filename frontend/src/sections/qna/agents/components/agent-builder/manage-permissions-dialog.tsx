import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'src/utils/axios';
import { GrantAccessForm } from './manage-permissions/grant-access-form';
import { CurrentAccessList } from './manage-permissions/current-access-list';
import { EditPermissionDialog } from './manage-permissions/edit-permission-dialog';
import { CreateTeamDialog } from './manage-permissions/create-team-dialog';
import { DeletePermissionDialog } from './manage-permissions/delete-permission-dialog';

interface ManageAgentPermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  onPermissionsUpdated?: () => void;
}

interface User {
  _id: string;
  _key: string;
  fullName: string;
  email: string;
}

interface Team {
  _id: string;
  _key?: string;
  name: string;
  description?: string;
}

interface ShareData {
  userIds: string[];
  teamIds: string[];
  message?: string;
  role: string;
}

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

interface UpdatePermissionData {
  userIds?: string[];
  teamIds?: string[];
  role: string;
}

// Helper function to get initials
const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

const ManageAgentPermissionsDialog: React.FC<ManageAgentPermissionsDialogProps> = ({
  open,
  onClose,
  agentId,
  agentName,
  onPermissionsUpdated,
}) => {
  // State
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('READER');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [newRole, setNewRole] = useState<string>('');
  const [updatingPermission, setUpdatingPermission] = useState<boolean>(false);
  const [deletingPermission, setDeletingPermission] = useState<boolean>(false);

  // Create Team Dialog State
  const [teamDialogOpen, setTeamDialogOpen] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newTeamDescription, setNewTeamDescription] = useState<string>('');
  const [creatingTeam, setCreatingTeam] = useState<boolean>(false);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [teamRole, setTeamRole] = useState<string>('READER');

  // Search state for filtering current access
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null);

  // Reset form when dialog closes
  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedUsers([]);
      setSelectedTeams([]);
      setSelectedRole('READER');
      setTeamDialogOpen(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setTeamUsers([]);
      setTeamRole('READER');
      setEditingPermission(null);
      setEditDialogOpen(false);
      setNewRole('');
      setSearchQuery('');
      setDeleteDialogOpen(false);
      setPermissionToDelete(null);
      onClose();
    }
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0 && selectedTeams.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload: ShareData = {
        userIds: selectedUsers.map((u) => u._key),
        teamIds: selectedTeams.map((t) => t._id || t._key || '').filter(Boolean),
        role: selectedRole,
      };
      await axios.post(`/api/v1/agents/${agentId}/share`, payload);

      await fetchPermissions();
      onPermissionsUpdated?.();

      // Reset form
      setSelectedUsers([]);
      setSelectedTeams([]);
      setSelectedRole('READER');
    } catch (error) {
      console.error('Error sharing agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const { data } = await axios.get(`/api/v1/agents/${agentId}/permissions`);
      setPermissions(data?.permissions || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleUpdatePermission = async () => {
    if (!editingPermission || !newRole) return;

    setUpdatingPermission(true);
    try {
      const payload: UpdatePermissionData = {
        role: newRole,
      };

      if (editingPermission.entity_type === 'USER') {
        payload.userIds = [editingPermission.entity_key];
      } else {
        payload.teamIds = [editingPermission.entity_key];
      }

      await axios.put(`/api/v1/agents/${agentId}/permissions`, payload);

      await fetchPermissions();
      onPermissionsUpdated?.();
      setEditDialogOpen(false);
      setEditingPermission(null);
      setNewRole('');
    } catch (error) {
      console.error('Error updating permission:', error);
    } finally {
      setUpdatingPermission(false);
    }
  };

  const handleDeletePermission = async (permission: Permission) => {
    setPermissionToDelete(permission);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePermission = async () => {
    if (!permissionToDelete) return;

    setDeletingPermission(true);
    try {
      const payload = {
        userIds: permissionToDelete.entity_type === 'USER' ? [permissionToDelete.entity_key] : [],
        teamIds: permissionToDelete.entity_type === 'TEAM' ? [permissionToDelete.entity_key] : [],
      };

      await axios.post(`/api/v1/agents/${agentId}/unshare`, payload);

      await fetchPermissions();
      onPermissionsUpdated?.();
      setDeleteDialogOpen(false);
      setPermissionToDelete(null);
    } catch (error) {
      console.error('Error removing permission:', error);
    } finally {
      setDeletingPermission(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await axios.get(`/api/v1/users/graph/list`);
      const items: User[] = data?.users || [];
      setUsers(items);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const { data } = await axios.get(`/api/v1/teams/list?limit=100`);
      const items = data?.teams || [];
      const mapped: Team[] = items.map((t: any) => ({
        _id: t._key || t._id?.split('/')[1],
        _key: t._key,
        name: t.name,
        description: t.description,
      }));
      setTeams(mapped);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setCreatingTeam(true);
    try {
      const body = {
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || undefined,
        userIds: teamUsers.map((u) => u._key),
        role: teamRole,
      };
      const { data } = await axios.post('/api/v1/entity/team', body);
      const created = data?.data || data;
      const createdTeam: Team = {
        _id: created?._key,
        _key: created?._key,
        name: created?.name,
        description: created?.description,
      };

      setTeams((prev) => [createdTeam, ...prev]);
      setSelectedTeams((prev) => [createdTeam, ...prev]);

      // Reset form
      setNewTeamName('');
      setNewTeamDescription('');
      setTeamUsers([]);
      setTeamRole('READER');
      setTeamDialogOpen(false);
    } catch (error) {
      console.error('Failed to create team', error);
    } finally {
      setCreatingTeam(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchTeams();
      fetchPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getAvatarColor = (name: string) => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--info))',
      'hsl(var(--success))',
      'hsl(var(--warning))',
      'hsl(var(--destructive))',
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + (acc * 32 - acc), 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const roleOptions = useMemo(
    () => [
      { value: 'READER', label: 'Reader', description: 'Can view and use the agent' },
      { value: 'WRITER', label: 'Writer', description: 'Can view, use, and modify the agent' },
      { value: 'OWNER', label: 'Owner', description: 'Can manage and share the agent' },
    ],
    []
  );

  const getRoleDisplayName = useCallback(
    (role: string) => {
      const option = roleOptions.find((r) => r.value === role);
      return option?.label || role;
    },
    [roleOptions]
  );

  // Filter permissions based on search query
  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return permissions;

    const query = searchQuery.toLowerCase();
    return permissions.filter((permission) => {
      const nameMatch = permission.entity_name.toLowerCase().includes(query);
      const emailMatch = permission.entity_email?.toLowerCase().includes(query) || false;
      const roleMatch = getRoleDisplayName(permission.role).toLowerCase().includes(query);
      const typeMatch = permission.entity_type.toLowerCase().includes(query);

      return nameMatch || emailMatch || roleMatch || typeMatch;
    });
  }, [permissions, searchQuery, getRoleDisplayName]);

  const handleRefresh = () => {
    fetchPermissions();
    fetchUsers();
    fetchTeams();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 text-primary">
                <Share2 className="size-4" />
              </div>
              Manage Permissions - {agentName}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {/* Grant New Access Section */}
              <GrantAccessForm
                selectedUsers={selectedUsers}
                selectedTeams={selectedTeams}
                selectedRole={selectedRole}
                onUsersChange={setSelectedUsers}
                onTeamsChange={setSelectedTeams}
                onRoleChange={setSelectedRole}
                onShare={handleShare}
                isSubmitting={isSubmitting}
                users={users}
                teams={teams}
                loadingUsers={loadingUsers}
                loadingTeams={loadingTeams}
                roleOptions={roleOptions}
                onCreateTeam={() => setTeamDialogOpen(true)}
                getInitials={getInitials}
                getAvatarColor={getAvatarColor}
                getRoleDisplayName={getRoleDisplayName}
              />

              {/* Current Access Section */}
              <CurrentAccessList
                permissions={permissions}
                filteredPermissions={filteredPermissions}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onRefresh={handleRefresh}
                onEdit={(permission) => {
                  setEditingPermission(permission);
                  setNewRole(permission.role);
                  setEditDialogOpen(true);
                }}
                onDelete={handleDeletePermission}
                loading={deletingPermission || updatingPermission}
                loadingPermissions={loadingPermissions}
                getInitials={getInitials}
                getAvatarColor={getAvatarColor}
                getRoleDisplayName={getRoleDisplayName}
              />
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Close
            </Button>
            <Button
              onClick={handleShare}
              disabled={(selectedUsers.length === 0 && selectedTeams.length === 0) || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Granting Access...
                </>
              ) : (
                <>
                  <Share2 className="size-4 mr-2" />
                  Grant Access
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Dialog */}
      <EditPermissionDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingPermission(null);
          setNewRole('');
        }}
        permission={editingPermission}
        newRole={newRole}
        onRoleChange={setNewRole}
        onSave={handleUpdatePermission}
        isUpdating={updatingPermission}
        roleOptions={roleOptions}
        getInitials={getInitials}
        getAvatarColor={getAvatarColor}
      />

      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={teamDialogOpen}
        onClose={() => {
          setTeamDialogOpen(false);
          setNewTeamName('');
          setNewTeamDescription('');
          setTeamUsers([]);
          setTeamRole('READER');
        }}
        teamName={newTeamName}
        teamDescription={newTeamDescription}
        teamUsers={teamUsers}
        teamRole={teamRole}
        onTeamNameChange={setNewTeamName}
        onTeamDescriptionChange={setNewTeamDescription}
        onTeamUsersChange={setTeamUsers}
        onTeamRoleChange={setTeamRole}
        onCreate={handleCreateTeam}
        isCreating={creatingTeam}
        users={users}
        loadingUsers={loadingUsers}
        roleOptions={roleOptions}
        getInitials={getInitials}
        getAvatarColor={getAvatarColor}
        getRoleDisplayName={getRoleDisplayName}
      />

      {/* Delete Confirmation Dialog */}
      <DeletePermissionDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPermissionToDelete(null);
        }}
        permission={permissionToDelete}
        onConfirm={confirmDeletePermission}
        isDeleting={deletingPermission}
      />
    </>
  );
};

export default ManageAgentPermissionsDialog;
