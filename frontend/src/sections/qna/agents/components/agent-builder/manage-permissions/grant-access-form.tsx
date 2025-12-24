import { useState, useMemo } from 'react';
import { UserPlus, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { Loader2 } from 'lucide-react';

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

interface GrantAccessFormProps {
  selectedUsers: User[];
  selectedTeams: Team[];
  selectedRole: string;
  onUsersChange: (users: User[]) => void;
  onTeamsChange: (teams: Team[]) => void;
  onRoleChange: (role: string) => void;
  onShare: () => void;
  isSubmitting: boolean;
  users: User[];
  teams: Team[];
  loadingUsers: boolean;
  loadingTeams: boolean;
  roleOptions: Array<{ value: string; label: string; description: string }>;
  onCreateTeam: () => void;
  getInitials: (name: string) => string;
  getAvatarColor: (name: string) => string;
  getRoleDisplayName: (role: string) => string;
}

export function GrantAccessForm({
  selectedUsers,
  selectedTeams,
  selectedRole,
  onUsersChange,
  onTeamsChange,
  onRoleChange,
  onShare,
  isSubmitting,
  users,
  teams,
  loadingUsers,
  loadingTeams,
  roleOptions,
  onCreateTeam,
  getInitials,
  getAvatarColor,
  getRoleDisplayName,
}: GrantAccessFormProps) {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.fullName?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  const filteredTeams = useMemo(() => {
    if (!teamSearchQuery.trim()) return teams;
    const query = teamSearchQuery.toLowerCase();
    return teams.filter((team) => team.name?.toLowerCase().includes(query));
  }, [teams, teamSearchQuery]);

  const handleUserToggle = (user: User) => {
    const isSelected = selectedUsers.some((u) => u._key === user._key);
    if (isSelected) {
      onUsersChange(selectedUsers.filter((u) => u._key !== user._key));
    } else {
      onUsersChange([...selectedUsers, user]);
    }
  };

  const handleTeamToggle = (team: Team) => {
    const isSelected = selectedTeams.some((t) => t._id === team._id || t._key === team._key);
    if (isSelected) {
      onTeamsChange(selectedTeams.filter((t) => t._id !== team._id && t._key !== team._key));
    } else {
      onTeamsChange([...selectedTeams, team]);
    }
  };

  const canShare = selectedUsers.length > 0 || selectedTeams.length > 0;

  return (
    <div className="space-y-6">
      {/* Users Selection */}
      <div className="space-y-2">
        <Label>Select Users</Label>
        <Command className="rounded-lg border">
          <div className="flex items-center border-b px-3">
            <UserPlus className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Choose users to share with..."
              value={userSearchQuery}
              onValueChange={setUserSearchQuery}
            />
          </div>
          <CommandList>
            {loadingUsers ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin mx-auto mb-2" />
                Loading users...
              </div>
            ) : (
              <>
                <CommandEmpty>No users found.</CommandEmpty>
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.some((u) => u._key === user._key);
                  return (
                    <CommandItem
                      key={user._key}
                      onSelect={() => handleUserToggle(user)}
                      className="flex items-center gap-3 py-2"
                    >
                      <Avatar
                        className="size-7"
                        style={{ backgroundColor: getAvatarColor(user.fullName || 'U') }}
                      >
                        <AvatarFallback className="text-xs">
                          {getInitials(user.fullName || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.fullName || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">{user.email || 'No email'}</p>
                      </div>
                      {isSelected && (
                        <div className="size-4 rounded-full bg-primary flex items-center justify-center">
                          <div className="size-2 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </CommandItem>
                  );
                })}
              </>
            )}
          </CommandList>
        </Command>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedUsers.map((user) => (
              <Badge
                key={user._key}
                variant="secondary"
                className="h-6 px-2 text-xs font-medium gap-1 bg-primary/10 text-primary border-primary/20"
              >
                {user.fullName || 'Unknown User'}
                <button
                  onClick={() => onUsersChange(selectedUsers.filter((u) => u._key !== user._key))}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Teams Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Teams</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateTeam}
            className="h-7 text-xs gap-1.5 text-success hover:text-success hover:bg-success/10"
          >
            <Plus className="size-3.5" />
            Create Team
          </Button>
        </div>
        <Command className="rounded-lg border">
          <div className="flex items-center border-b px-3">
            <Users className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Choose teams to share with..."
              value={teamSearchQuery}
              onValueChange={setTeamSearchQuery}
            />
          </div>
          <CommandList>
            {loadingTeams ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin mx-auto mb-2" />
                Loading teams...
              </div>
            ) : (
              <>
                <CommandEmpty>No teams found.</CommandEmpty>
                {filteredTeams.map((team) => {
                  const isSelected = selectedTeams.some(
                    (t) => t._id === team._id || t._key === team._key
                  );
                  return (
                    <CommandItem
                      key={team._id || team._key}
                      onSelect={() => handleTeamToggle(team)}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="size-7 rounded-full bg-info/15 flex items-center justify-center">
                        <Users className="size-3.5 text-info" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{team.name}</p>
                        {team.description && (
                          <p className="text-xs text-muted-foreground">{team.description}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="size-4 rounded-full bg-primary flex items-center justify-center">
                          <div className="size-2 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </CommandItem>
                  );
                })}
              </>
            )}
          </CommandList>
        </Command>

        {selectedTeams.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedTeams.map((team) => (
              <Badge
                key={team._id || team._key}
                variant="secondary"
                className="h-6 px-2 text-xs font-medium gap-1 bg-info/10 text-info border-info/20"
              >
                {team.name}
                <button
                  onClick={() =>
                    onTeamsChange(
                      selectedTeams.filter((t) => t._id !== team._id && t._key !== team._key)
                    )
                  }
                  className="ml-1 hover:bg-info/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Role Selection */}
      <div className="space-y-2">
        <Label>Permission Level</Label>
        <Select value={selectedRole} onValueChange={onRoleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select permission level" />
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

      {/* Summary */}
      {canShare && (
        <Card className="p-4 bg-success/5 border-success/20">
          <p className="text-sm font-semibold text-success">
            Ready to grant {getRoleDisplayName(selectedRole)} access to{' '}
            {selectedUsers.length + selectedTeams.length} recipient
            {selectedUsers.length + selectedTeams.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedUsers.length > 0 &&
              `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`}
            {selectedUsers.length > 0 && selectedTeams.length > 0 && ' and '}
            {selectedTeams.length > 0 &&
              `${selectedTeams.length} team${selectedTeams.length > 1 ? 's' : ''}`}
          </p>
        </Card>
      )}
    </div>
  );
}
