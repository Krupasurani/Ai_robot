import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Users,
  RefreshCw,
  Plus,
  X,
  Search,
  Trash2,
  AlertTriangle,
  ChevronDown,
  Check,
  UserPlus,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/drop-down-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

// Shared, normalized types used by this dialog
export type UnifiedRole =
  | 'OWNER'
  | 'WRITER'
  | 'READER'
  | 'COMMENTER'
  | 'ORGANIZER'
  | 'FILE_ORGANIZER';

export interface User {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  createdAtTimestamp?: number;
  updatedAtTimestamp?: number;
}

export interface Team {
  id: string; // team key/id (normalized)
  name: string;
  description?: string;
  createdBy?: string;
  createdAtTimestamp?: number;
  updatedAtTimestamp?: number;
  members?: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    role: UnifiedRole;
    isOwner: boolean;
  }[];
  memberCount?: number;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageMembers?: boolean;
  currentUserPermission?: UnifiedPermission;
}

export interface UnifiedPermission {
  id: string;
  userId: string;
  type: 'USER' | 'TEAM';
  name: string;
  email?: string;
  role: UnifiedRole;
  createdAtTimestamp?: number;
  updatedAtTimestamp?: number;
}

// API contract via callbacks so agents/KB can plug in their own endpoints
export interface UnifiedPermissionsApi {
  // Loads all permissions for the subject (agent/knowledge base)
  loadPermissions: () => Promise<UnifiedPermission[]>;
  // Loads selectable users
  loadUsers: () => Promise<User[]>;
  // Loads selectable teams
  loadTeams: () => Promise<Team[]>;
  // Create a new team and optionally add members with a default role
  createTeam: (data: {
    name: string;
    description?: string;
    userIds: string[];
    role: UnifiedRole;
  }) => Promise<Team>;
  // Grant permissions to users and/or teams
  createPermissions: (data: {
    userIds: string[];
    teamIds: string[];
    role: UnifiedRole;
  }) => Promise<void>;
  // Update role for a specific user or team (pass exactly one of userIds/teamIds with a single id)
  updatePermissions: (data: {
    userIds?: string[];
    teamIds?: string[];
    role: UnifiedRole;
  }) => Promise<void>;
  // Remove permissions for specific principals
  removePermissions: (data: { userIds?: string[]; teamIds?: string[] }) => Promise<void>;
}

interface UnifiedPermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  subjectName: string; // e.g., Agent name / Knowledge Base name (display only)
  api: UnifiedPermissionsApi;
  // Optional feature flags and labels
  title?: string; // default: Manage Access
  addPeopleLabel?: string; // default: Add People
}

const ROLE_OPTIONS: { value: UnifiedRole; label: string; description: string }[] = [
  { value: 'OWNER', label: 'Owner', description: 'Full control and ownership' },
  { value: 'WRITER', label: 'Editor', description: 'Create and edit content' },
  { value: 'COMMENTER', label: 'Commenter', description: 'Add comments only' },
  { value: 'READER', label: 'Viewer', description: 'View only and use' },
];

const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
    'bg-indigo-500', 'bg-rose-500'
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const UnifiedPermissionsDialog: React.FC<UnifiedPermissionsDialogProps> = ({
  open,
  onClose,
  subjectName,
  api,
  title = 'Manage Access',
  addPeopleLabel = 'Add People',
}) => {
  // Data
  const [permissions, setPermissions] = useState<UnifiedPermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(User | Team)[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Create Team dialog
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [teamRole, setTeamRole] = useState<UnifiedRole>('READER');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Ensure body scroll and pointer events are restored when dialog closes
  useEffect(() => {
    const cleanup = () => {
      document.body.style.pointerEvents = '';
      document.body.style.overflow = '';
      document.body.removeAttribute('data-scroll-locked');
    };

    if (!open) {
      // Force cleanup of any remaining pointer-events blocking
      cleanup();

      // Also cleanup after delays to catch any Radix delayed state changes
      const timeout1 = setTimeout(cleanup, 50);
      const timeout2 = setTimeout(cleanup, 150);
      const timeout3 = setTimeout(cleanup, 300);

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    }

    // Cleanup on unmount
    return cleanup;
  }, [open]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, u, t] = await Promise.all([
        api.loadPermissions(),
        api.loadUsers(),
        api.loadTeams(),
      ]);
      setPermissions(p || []);
      setUsers(u || []);
      setTeams(t || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load permissions');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSearchResults([]);
      setActionLoading(false);
      loadAll();
    } else {
      // Cleanup when dialog closes
      setSearchQuery('');
      setSearchResults([]);
      setActionLoading(false);
      handleCloseTeamDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Filter users without access
    const withAccess = new Set(permissions.filter((p) => p.type === 'USER').map((p) => p.userId));
    const filteredUsers = users
      .filter((u) => !withAccess.has(u.userId))
      .filter((u) =>
        (u.name || '').toLowerCase().includes(lowerQuery) ||
        (u.email || '').toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5);

    // Filter teams without access
    const teamsWithAccess = new Set(permissions.filter((p) => p.type === 'TEAM').map((p) => p.id));
    const filteredTeams = teams
      .filter((t) => !teamsWithAccess.has(t.id))
      .filter((t) => (t.name || '').toLowerCase().includes(lowerQuery))
      .slice(0, 5);

    setSearchResults([...filteredUsers, ...filteredTeams]);
  };

  const handleAddPermission = async (item: User | Team, role: UnifiedRole = 'READER') => {
    try {
      // Check if it's a user or team
      const isUser = 'userId' in item;

      await api.createPermissions({
        userIds: isUser ? [item.id] : [],
        teamIds: isUser ? [] : [item.id],
        role,
      });

      toast.success(`${item.name || 'Member'} added as ${ROLE_OPTIONS.find(r => r.value === role)?.label}`);
      setSearchQuery('');
      setSearchResults([]);
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add permission');
    }
  };

  const handleUpdateRole = async (permission: UnifiedPermission, newRole: UnifiedRole) => {
    try {
      await api.updatePermissions({
        userIds: permission.type === 'USER' ? [permission.userId] : [],
        teamIds: permission.type === 'TEAM' ? [permission.id] : [],
        role: newRole,
      });
      toast.success(`Role updated to ${ROLE_OPTIONS.find(r => r.value === newRole)?.label}`);
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update role');
    }
  };

  const handleRemoveAccess = async (permission: UnifiedPermission) => {
    try {
      await api.removePermissions({
        userIds: permission.type === 'USER' ? [permission.userId] : [],
        teamIds: permission.type === 'TEAM' ? [permission.id] : [],
      });
      toast.success('Access removed');
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove access');
    }
  };

  const handleOpenTeamDialog = () => {
    setTeamDialogOpen(true);
    setNewTeamName('');
    setNewTeamDescription('');
    setTeamUsers([]);
    setTeamRole('READER');
  };

  const handleCloseTeamDialog = () => {
    if (!creatingTeam) {
      setTeamDialogOpen(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setTeamUsers([]);
      setTeamRole('READER');
    }
  };

  const handleMainDialogClose = () => {
    // Close team dialog if it's open
    if (teamDialogOpen && !creatingTeam) {
      setTeamDialogOpen(false);
    }
    // Reset all states
    setSearchQuery('');
    setSearchResults([]);
    setActionLoading(false);

    // Force cleanup pointer-events immediately
    document.body.style.pointerEvents = '';
    document.body.style.overflow = '';
    document.body.removeAttribute('data-scroll-locked');

    // Call parent onClose
    onClose();
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Team name is required');
      return;
    }

    setCreatingTeam(true);
    try {
      const created = await api.createTeam({
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || undefined,
        userIds: teamUsers.map((u) => u.id),
        role: teamRole,
      });

      setTeams((prev) => [created, ...prev]);
      toast.success('Team created successfully');
      handleCloseTeamDialog();

      // Auto-add the team to permissions
      await handleAddPermission(created, teamRole);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  return (
    <>
      {/* Main permissions dialog - Modern Thero/Google-style */}
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleMainDialogClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden rounded-xl font-roboto" showCloseButton={false} aria-describedby={undefined}>
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-border/30">
            <DialogTitle className="text-[20px] font-bold text-foreground">
              {title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
              onClick={handleMainDialogClose}
              disabled={loading || actionLoading}
            >
              <X className="w-5 h-5 text-muted-foreground/60" />
            </Button>
          </div>

          {/* Body */}
          <div className="px-6 pt-2 pb-5 space-y-5">
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder="Search for a person or team"
                className="h-12 px-4 text-[15px] bg-white border-gray-300 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all rounded-lg placeholder:text-muted-foreground/50"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                disabled={loading}
              />

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-popover border border-border/50 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  {searchResults.map((item) => {
                    const isUser = 'userId' in item;
                    return (
                      <button
                        key={item.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 rounded-md transition-colors text-left"
                        onClick={() => handleAddPermission(item)}
                      >
                        <Avatar className="h-9 w-9 ring-1 ring-border/30">
                          <AvatarFallback className={cn(
                            'text-sm',
                            isUser ? getAvatarColor(item.name || '') : 'bg-sky-500'
                          )}>
                            {isUser ? (
                              <span className="text-white font-medium">
                                {getInitials(item.name || (item as User).email || 'U')}
                              </span>
                            ) : (
                              <Building2 className="w-5 h-5 text-white" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-normal truncate">{item.name || (isUser ? (item as User).email : 'Team')}</div>
                          {isUser && (item as User).email && item.name && (
                            <div className="text-[13px] text-muted-foreground/60 truncate">{(item as User).email}</div>
                          )}
                          {!isUser && (item as Team).description && (
                            <div className="text-[13px] text-muted-foreground/60 truncate">{(item as Team).description}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* People with access */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-[13px] font-medium text-black">People with access</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={loadAll}
                        disabled={loading || actionLoading}
                        className="h-7 w-7 rounded-full hover:bg-muted/50"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenTeamDialog}
                        disabled={actionLoading}
                        className="h-8 gap-1.5 text-[13px] font-normal"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        New Team
                      </Button>
                    </div>
                  </div>


                  <ScrollArea className="max-h-[300px] -mx-1 px-1">
                    <div className="space-y-0.5">
                      {permissions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                          <p className="text-[14px] text-muted-foreground mb-1">No members yet</p>
                          <p className="text-[13px] text-muted-foreground/60">
                            Search above to add people or teams
                          </p>
                        </div>
                      ) : (
                        permissions.map((perm) => {
                          const isOwner = perm.role === 'OWNER';
                          const isTeam = perm.type === 'TEAM';
                          const role = (perm.role || 'READER') as UnifiedRole;

                          return (
                            <div key={perm.id} className="flex items-center justify-between py-2 group">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Avatar className="h-10 w-10 ring-1 ring-border/40">
                                  <AvatarFallback className={cn(
                                    'text-sm font-medium',
                                    isTeam ? 'bg-sky-500' : getAvatarColor(perm.name || '')
                                  )}>
                                    {isTeam ? (
                                      <Building2 className="w-5 h-5 text-white" />
                                    ) : (
                                      <span className="text-white">
                                        {getInitials(perm.name || perm.email || 'U')}
                                      </span>
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[15px] text-foreground font-normal truncate">
                                    {perm.name}
                                  </div>
                                  {perm.email && (
                                    <div className="text-[13px] text-muted-foreground/60 truncate">
                                      {perm.email}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isOwner ? (
                                <span className="text-[15px] text-muted-foreground/70 px-3 font-normal">
                                  Owner
                                </span>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 gap-1.5 text-[14px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-normal"
                                    >
                                      {ROLE_OPTIONS.find(r => r.value === role)?.label || role}
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[200px] rounded-lg shadow-md">
                                    {ROLE_OPTIONS.filter(opt => opt.value !== 'OWNER').map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => handleUpdateRole(perm, option.value)}
                                        className="py-2.5"
                                      >
                                        <div className="flex flex-col flex-1">
                                          <span className="font-medium text-sm">{option.label}</span>
                                          <span className="text-xs text-muted-foreground">{option.description}</span>
                                        </div>
                                        {role === option.value && <Check className="h-4 w-4 ml-2 text-blue-600" />}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator className="my-1" />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive py-2.5"
                                      onClick={() => handleRemoveAccess(perm)}
                                    >
                                      Remove access
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 flex items-center justify-end border-t border-border/30 bg-background">
            <Button
              className="rounded-lg px-6 h-9 text-[14px] font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={handleMainDialogClose}
              disabled={loading || actionLoading}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Team dialog - Modern style */}
      <Dialog
        open={teamDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleCloseTeamDialog();
        }}
      >
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-xl font-roboto" showCloseButton={false} aria-describedby={undefined}>
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-border/30">
            <DialogTitle className="text-[20px] font-bold text-foreground">
              Create Team
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
              onClick={handleCloseTeamDialog}
              disabled={creatingTeam}
            >
              <X className="w-5 h-5 text-muted-foreground/60" />
            </Button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">
                Team name <span className="text-destructive">*</span>
              </label>
              <Input
                value={newTeamName}
                autoFocus
                onChange={(e) => setNewTeamName(e.target.value)}
                className="h-10 text-[14px]"
                placeholder="e.g. Marketing Team"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">
                Description
              </label>
              <Textarea
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                rows={3}
                className="text-[14px] resize-none"
                placeholder="Describe the team's purpose..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">
                Add team members
              </label>
              <div className="rounded-lg border bg-background p-2">
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {users.map((u) => {
                      const selected = teamUsers.some((s) => s.id === u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setTeamUsers((prev) =>
                              selected ? prev.filter((p) => p.id !== u.id) : [...prev, u]
                            );
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                            'hover:bg-accent/50',
                            selected && 'bg-blue-50'
                          )}
                        >
                          <Avatar className="h-8 w-8 ring-1 ring-border/30">
                            <AvatarFallback className={getAvatarColor(u.name || u.email || '')}>
                              <span className="text-white text-xs font-medium">
                                {getInitials(u.name || u.email || 'U')}
                              </span>
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-normal truncate">{u.name || u.email}</div>
                            {u.name && u.email && (
                              <div className="text-[12px] text-muted-foreground truncate">{u.email}</div>
                            )}
                          </div>
                          {selected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              {teamUsers.length > 0 && (
                <p className="text-[13px] text-muted-foreground">
                  {teamUsers.length} member{teamUsers.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 flex items-center justify-end gap-2 border-t border-border/30 bg-background">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseTeamDialog}
              disabled={creatingTeam}
              className="h-9 px-4 text-[14px] font-normal"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTeam}
              disabled={creatingTeam || !newTeamName.trim()}
              className="h-9 px-4 text-[14px] font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              {creatingTeam ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UnifiedPermissionsDialog;
