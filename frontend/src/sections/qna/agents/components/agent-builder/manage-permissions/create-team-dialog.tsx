import React from 'react';
import { Plus, X, Loader2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface User {
  _id: string;
  _key: string;
  fullName: string;
  email: string;
}

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  teamName: string;
  teamDescription: string;
  teamUsers: User[];
  teamRole: string;
  onTeamNameChange: (name: string) => void;
  onTeamDescriptionChange: (description: string) => void;
  onTeamUsersChange: (users: User[]) => void;
  onTeamRoleChange: (role: string) => void;
  onCreate: () => void;
  isCreating: boolean;
  users: User[];
  loadingUsers: boolean;
  roleOptions: Array<{ value: string; label: string; description: string }>;
  getInitials: (name: string) => string;
  getAvatarColor: (name: string) => string;
  getRoleDisplayName: (role: string) => string;
}

export function CreateTeamDialog({
  open,
  onClose,
  teamName,
  teamDescription,
  teamUsers,
  teamRole,
  onTeamNameChange,
  onTeamDescriptionChange,
  onTeamUsersChange,
  onTeamRoleChange,
  onCreate,
  isCreating,
  users,
  loadingUsers,
  roleOptions,
  getInitials,
  getAvatarColor,
  getRoleDisplayName,
}: CreateTeamDialogProps) {
  const [userSearchQuery, setUserSearchQuery] = React.useState('');

  const filteredUsers = React.useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.fullName?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  const handleUserToggle = (user: User) => {
    const isSelected = teamUsers.some((u) => u._key === user._key);
    if (isSelected) {
      onTeamUsersChange(teamUsers.filter((u) => u._key !== user._key));
    } else {
      onTeamUsersChange([...teamUsers, user]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-success/10 text-success">
              <Plus className="size-4" />
            </div>
            Create New Team
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => onTeamNameChange(e.target.value)}
              placeholder="Enter team name"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              value={teamDescription}
              onChange={(e) => onTeamDescriptionChange(e.target.value)}
              placeholder="Describe the team's purpose..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Default Role for Team Members</Label>
            <Select value={teamRole} onValueChange={onTeamRoleChange}>
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

          <div className="space-y-2">
            <Label>Add Team Members</Label>
            <Command className="rounded-lg border">
              <div className="flex items-center border-b px-3">
                <UserPlus className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Search users to add to the team..."
                  value={userSearchQuery}
                  onValueChange={setUserSearchQuery}
                />
              </div>
              <CommandList>
                {loadingUsers ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading users...
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No users found.</CommandEmpty>
                    {filteredUsers.map((user) => {
                      const isSelected = teamUsers.some((u) => u._key === user._key);
                      return (
                        <CommandItem
                          key={user._key}
                          onSelect={() => handleUserToggle(user)}
                          className="flex items-center gap-3 py-2"
                        >
                          <Avatar
                            className="size-8"
                            style={{
                              backgroundColor: getAvatarColor(user.fullName || user.email || 'U'),
                            }}
                          >
                            <AvatarFallback className="text-xs">
                              {getInitials(user.fullName || user.email || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.fullName || user.email}</p>
                            {user.fullName && user.email && (
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="size-4 rounded-full bg-primary flex items-center justify-center">
                              <X className="size-3 text-primary-foreground" />
                            </div>
                          )}
                        </CommandItem>
                      );
                    })}
                  </>
                )}
              </CommandList>
            </Command>

            {teamUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {teamUsers.map((user) => (
                  <Badge
                    key={user._key}
                    variant="secondary"
                    className="h-6 px-2 text-xs font-medium gap-1"
                  >
                    {user.fullName || user.email}
                    <button
                      onClick={() =>
                        onTeamUsersChange(teamUsers.filter((u) => u._key !== user._key))
                      }
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {teamUsers.length > 0 && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                <p className="font-medium">
                  Team will be created with {teamUsers.length} member
                  {teamUsers.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs mt-1">
                  All members will have {getRoleDisplayName(teamRole)} permissions
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={isCreating || !teamName.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="size-4 mr-2" />
                Create Team
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
