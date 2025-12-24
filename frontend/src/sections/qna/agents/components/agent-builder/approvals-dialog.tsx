import React, { useState, useEffect } from 'react';
import { CheckCircle2, X, User, Shield, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { cn } from '@/utils/cn';

interface User {
  _key: string;
  name: string;
  email: string;
  role?: string;
}

interface Group {
  _key: string;
  name: string;
  description?: string;
  memberCount?: number;
}

interface ApprovalsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (approvalConfig: ApprovalConfig) => void;
  toolName: string;
  users: User[];
  groups: Group[];
  initialConfig?: ApprovalConfig;
}

export interface ApprovalConfig {
  requiresApproval: boolean;
  approvers: {
    users: string[];
    groups: string[];
  };
  approvalThreshold: 'single' | 'majority' | 'unanimous';
  autoApprove: boolean;
}

export default function ApprovalsDialog({
  open,
  onClose,
  onSave,
  toolName,
  users,
  groups,
  initialConfig,
}: ApprovalsDialogProps) {
  const [config, setConfig] = useState<ApprovalConfig>({
    requiresApproval: false,
    approvers: {
      users: [],
      groups: [],
    },
    approvalThreshold: 'single',
    autoApprove: false,
  });

  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
      // Set selected users and groups based on initial config
      const selectedUsersList = users.filter((user) =>
        initialConfig.approvers.users.includes(user._key)
      );
      const selectedGroupsList = groups.filter((group) =>
        initialConfig.approvers.groups.includes(group._key)
      );
      setSelectedUsers(selectedUsersList);
      setSelectedGroups(selectedGroupsList);
    }
  }, [initialConfig, users, groups]);

  const handleRequiresApprovalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({
      ...prev,
      requiresApproval: event.target.checked,
    }));
  };

  const handleAutoApproveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({
      ...prev,
      autoApprove: event.target.checked,
    }));
  };

  const handleThresholdChange = (threshold: 'single' | 'majority' | 'unanimous') => {
    setConfig((prev) => ({
      ...prev,
      approvalThreshold: threshold,
    }));
  };

  const handleUsersChange = (user: User) => {
    const isSelected = selectedUsers.some((u) => u._key === user._key);
    const newValue = isSelected
      ? selectedUsers.filter((u) => u._key !== user._key)
      : [...selectedUsers, user];
    setSelectedUsers(newValue);
    setConfig((prev) => ({
      ...prev,
      approvers: {
        ...prev.approvers,
        users: newValue.map((u) => u._key),
      },
    }));
  };

  const handleGroupsChange = (group: Group) => {
    const isSelected = selectedGroups.some((g) => g._key === group._key);
    const newValue = isSelected
      ? selectedGroups.filter((g) => g._key !== group._key)
      : [...selectedGroups, group];
    setSelectedGroups(newValue);
    setConfig((prev) => ({
      ...prev,
      approvers: {
        ...prev.approvers,
        groups: newValue.map((g) => g._key),
      },
    }));
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const thresholdOptions = [
    { value: 'single', label: 'Single Approval', description: 'Any one approver can approve' },
    {
      value: 'majority',
      label: 'Majority',
      description: 'More than 50% of approvers must approve',
    },
    { value: 'unanimous', label: 'Unanimous', description: 'All approvers must approve' },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl p-0">
        <DialogTitle className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <h3 className="font-medium text-base m-0">Tool Approvals - {toolName}</h3>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="close"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogTitle>

        <div className="px-6 py-5">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-4">
              Configure approval requirements for this tool. When enabled, actions performed by this
              tool will require approval from selected users or groups.
            </p>

            {/* Main Approval Toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="requires-approval"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-base font-semibold">Require Approval for Tool Actions</span>
                </Label>
                <Switch
                  id="requires-approval"
                  checked={config.requiresApproval}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, requiresApproval: checked }))
                  }
                />
              </div>
            </div>

            {config.requiresApproval && (
              <>
                {/* Auto-approve toggle */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="auto-approve"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Auto-approve after initial approval (for recurring actions)
                      </span>
                    </Label>
                    <Switch
                      id="auto-approve"
                      checked={config.autoApprove}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, autoApprove: checked }))
                      }
                    />
                  </div>
                </div>

                {/* Approval Threshold */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                    Approval Threshold
                  </Label>
                  <div className="flex flex-col gap-2">
                    {thresholdOptions.map((option) => (
                      <div
                        key={option.value}
                        onClick={() => handleThresholdChange(option.value as any)}
                        className={cn(
                          'p-3 border rounded-lg cursor-pointer transition-all duration-200',
                          config.approvalThreshold === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary hover:bg-primary/5'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center',
                              config.approvalThreshold === option.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                          {config.approvalThreshold === option.value && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* User Approvers */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Approvers
                  </Label>
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedUsers.map((user) => (
                        <Badge
                          key={user._key}
                          variant="outline"
                          className="bg-primary/10 border-primary/20 text-primary"
                        >
                          <User className="h-3 w-3 mr-1" />
                          {user.name}
                          <button
                            onClick={() => handleUsersChange(user)}
                            className="ml-2 hover:text-primary/80"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Command className="rounded-lg border">
                    <div className="flex items-center border-b px-3">
                      <User className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <CommandInput placeholder="Search users..." />
                    </div>
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      {users.map((user) => {
                        const isSelected = selectedUsers.some((u) => u._key === user._key);
                        return (
                          <CommandItem
                            key={user._key}
                            onSelect={() => handleUsersChange(user)}
                            className={cn(
                              'flex items-center gap-3 py-2',
                              isSelected && 'bg-primary/10'
                            )}
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandList>
                  </Command>
                </div>

                {/* Group Approvers */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Group Approvers
                  </Label>
                  {selectedGroups.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedGroups.map((group) => (
                        <Badge
                          key={group._key}
                          variant="outline"
                          className="bg-primary/10 border-primary/20 text-primary"
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {group.name}
                          <button
                            onClick={() => handleGroupsChange(group)}
                            className="ml-2 hover:text-primary/80"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Command className="rounded-lg border">
                    <div className="flex items-center border-b px-3">
                      <Users className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <CommandInput placeholder="Search groups..." />
                    </div>
                    <CommandList>
                      <CommandEmpty>No groups found.</CommandEmpty>
                      {groups.map((group) => {
                        const isSelected = selectedGroups.some((g) => g._key === group._key);
                        return (
                          <CommandItem
                            key={group._key}
                            onSelect={() => handleGroupsChange(group)}
                            className={cn(
                              'flex items-center gap-3 py-2',
                              isSelected && 'bg-primary/10'
                            )}
                          >
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{group.name}</p>
                              {group.memberCount && (
                                <p className="text-xs text-muted-foreground">
                                  {group.memberCount} members
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandList>
                  </Command>
                </div>

                {/* Summary */}
                <Alert className="mt-4">
                  <AlertDescription>
                    <strong>Summary:</strong> This tool will require approval from{' '}
                    {config.approvers.users.length + config.approvers.groups.length} approver(s)
                    using <strong>{config.approvalThreshold}</strong> threshold.
                    {config.autoApprove && ' Auto-approval is enabled for recurring actions.'}
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-border bg-muted/50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Shield className="mr-2 h-4 w-4" />
            Save Approval Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
