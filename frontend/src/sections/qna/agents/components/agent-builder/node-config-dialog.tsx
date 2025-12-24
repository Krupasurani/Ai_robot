import React, { memo, useState, useEffect, useCallback } from 'react';
import { Cog, X, UserPlus, Users, Shield, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { cn } from '@/utils/cn';

import { useUsers } from 'src/context/UserContext';
import { useGroups } from 'src/context/GroupsContext';

interface NodeConfigDialogProps {
  node: any;
  open: boolean;
  onClose: () => void;
  onSave: (nodeId: string, config: Record<string, any>) => void;
  onDelete: (nodeId: string) => void;
}

// Helper function to get initials
const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

const NodeConfigDialog: React.FC<NodeConfigDialogProps> = memo(
  ({ node, open, onClose, onSave, onDelete }) => {
    const [config, setConfig] = useState<Record<string, any>>({});
    const [isInitialized, setIsInitialized] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const users = useUsers();
    const groups = useGroups();

    // Initialize config only when dialog opens with a valid node
    useEffect(() => {
      if (open && node && !isInitialized) {
        setConfig(node.data.config || {});
        setIsInitialized(true);
      } else if (!open) {
        setIsInitialized(false);
        setConfig({});
      }
    }, [open, node, isInitialized]);

    const handleSave = useCallback(() => {
      if (node) {
        onSave(node.id, config);
        onClose();
      }
    }, [node, config, onSave, onClose]);

    const handleClose = useCallback(() => {
      onClose();
    }, [onClose]);

    const handleDelete = useCallback(() => {
      if (node) {
        onDelete(node.id);
        onClose();
      }
    }, [node, onDelete, onClose]);

    // Get avatar color based on name
    const getAvatarColor = useCallback((name: string) => {
      const colors = [
        'hsl(var(--primary))',
        'hsl(var(--info))',
        'hsl(var(--success))',
        'hsl(var(--warning))',
        'hsl(var(--destructive))',
      ];

      const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + (acc * 32 - acc), 0);
      return colors[Math.abs(hash) % colors.length];
    }, []);

    const renderConfigField = useCallback(
      (key: string, value: any) => {
        // Special handling for Agent configuration
        if (node?.data.type === 'agent-core') {
          if (key === 'systemPrompt') {
            return (
              <div key={key} className="col-span-12">
                <Label className="mb-2 font-medium">System Prompt</Label>
                <Textarea
                  rows={4}
                  value={value || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="Define the agent's role, capabilities, and behavior instructions..."
                  className="rounded-lg"
                />
              </div>
            );
          }
          if (key === 'startMessage') {
            return (
              <div key={key} className="col-span-12">
                <Label className="mb-2 font-medium">Starting Message</Label>
                <Textarea
                  rows={2}
                  value={value || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="Enter the agent's greeting message to users..."
                  className="rounded-lg"
                />
              </div>
            );
          }
          if (key === 'routing') {
            return (
              <div key={key} className="col-span-12">
                <Label className="mb-2 font-medium">Routing Strategy</Label>
                <Select
                  value={value || 'auto'}
                  onValueChange={(val) => setConfig((prev) => ({ ...prev, [key]: val }))}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Intelligent Routing)</SelectItem>
                    <SelectItem value="sequential">Sequential Processing</SelectItem>
                    <SelectItem value="parallel">Parallel Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          }
          if (key === 'allowMultipleLLMs') {
            return (
              <div key={key} className="col-span-12">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={Boolean(value)}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                  <div className="flex-1">
                    <Label className="font-medium">Allow Multiple LLMs</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enable the agent to use multiple language models simultaneously
                    </p>
                  </div>
                </div>
              </div>
            );
          }
        }

        // Special handling for Tool approval configuration with full user/group selection
        if (node?.data.type.startsWith('tool-') && !node?.data.type.startsWith('tool-group-')) {
          if (key === 'approvalConfig') {
            const selectedUsers = users
              ? users.filter((user) => value?.approvers?.users?.includes(user._id))
              : [];
            const selectedGroups = groups
              ? groups.filter((group) => value?.approvers?.groups?.includes(group._id))
              : [];

            return (
              <div key={key} className="col-span-12">
                <div className="p-4 border border-border/20 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-warning" />
                    <h3 className="text-sm font-semibold text-foreground">Approval Settings</h3>
                  </div>

                  <div className="flex items-start gap-3 mb-4">
                    <Switch
                      checked={Boolean(value?.requiresApproval)}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            requiresApproval: checked,
                            approvers: prev[key]?.approvers || { users: [], groups: [] },
                            approvalThreshold: prev[key]?.approvalThreshold || 'single',
                          },
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label className="font-medium">Require Approval for Tool Actions</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enable approval workflow before tool execution
                      </p>
                    </div>
                  </div>

                  {value?.requiresApproval && (
                    <div>
                      {/* Users Selection */}
                      <div className="mb-4">
                        <Label className="mb-2 font-medium">Select Users</Label>
                        {selectedUsers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {selectedUsers.map((user) => (
                              <Badge
                                key={user._id}
                                variant="outline"
                                className="bg-primary/10 border-primary/20 text-primary"
                              >
                                {user.fullName || 'Unknown User'}
                                <button
                                  onClick={() => {
                                    setConfig((prev) => ({
                                      ...prev,
                                      [key]: {
                                        ...prev[key],
                                        approvers: {
                                          ...prev[key]?.approvers,
                                          users:
                                            prev[key]?.approvers?.users?.filter(
                                              (id: string) => id !== user._id
                                            ) || [],
                                        },
                                      },
                                    }));
                                  }}
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
                            <UserPlus className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <CommandInput
                              placeholder="Search users..."
                              value={userSearchQuery}
                              onValueChange={setUserSearchQuery}
                            />
                          </div>
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            {(users || [])
                              .filter(
                                (user) =>
                                  !userSearchQuery ||
                                  user.fullName
                                    ?.toLowerCase()
                                    .includes(userSearchQuery.toLowerCase()) ||
                                  user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                              )
                              .map((user) => {
                                const isSelected = selectedUsers.some((u) => u._id === user._id);
                                return (
                                  <CommandItem
                                    key={user._id}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setConfig((prev) => ({
                                          ...prev,
                                          [key]: {
                                            ...prev[key],
                                            approvers: {
                                              ...prev[key]?.approvers,
                                              users:
                                                prev[key]?.approvers?.users?.filter(
                                                  (id: string) => id !== user._id
                                                ) || [],
                                            },
                                          },
                                        }));
                                      } else {
                                        setConfig((prev) => ({
                                          ...prev,
                                          [key]: {
                                            ...prev[key],
                                            approvers: {
                                              ...prev[key]?.approvers,
                                              users: [
                                                ...(prev[key]?.approvers?.users || []),
                                                user._id,
                                              ],
                                            },
                                          },
                                        }));
                                      }
                                    }}
                                    className={cn(
                                      'flex items-center gap-3 py-2',
                                      isSelected && 'bg-primary/10'
                                    )}
                                  >
                                    <Avatar
                                      className="h-6 w-6 text-xs"
                                      style={{
                                        backgroundColor: getAvatarColor(user.fullName || 'U'),
                                      }}
                                    >
                                      <AvatarFallback>
                                        {getInitials(user.fullName || 'U')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-foreground">
                                        {user.fullName || 'Unknown User'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {user.email || 'No email'}
                                      </p>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                  </CommandItem>
                                );
                              })}
                          </CommandList>
                        </Command>
                      </div>

                      {/* Groups Selection */}
                      <div className="mb-4">
                        <Label className="mb-2 font-medium">Select Groups</Label>
                        {selectedGroups.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {selectedGroups.map((group) => (
                              <Badge
                                key={group._id}
                                variant="outline"
                                className="bg-primary/10 border-primary/20 text-primary"
                              >
                                {group.name}
                                <button
                                  onClick={() => {
                                    setConfig((prev) => ({
                                      ...prev,
                                      [key]: {
                                        ...prev[key],
                                        approvers: {
                                          ...prev[key]?.approvers,
                                          groups:
                                            prev[key]?.approvers?.groups?.filter(
                                              (id: string) => id !== group._id
                                            ) || [],
                                        },
                                      },
                                    }));
                                  }}
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
                            <CommandInput
                              placeholder="Search groups..."
                              value={groupSearchQuery}
                              onValueChange={setGroupSearchQuery}
                            />
                          </div>
                          <CommandList>
                            <CommandEmpty>No groups found.</CommandEmpty>
                            {(groups || [])
                              .filter(
                                (group) =>
                                  !groupSearchQuery ||
                                  group.name?.toLowerCase().includes(groupSearchQuery.toLowerCase())
                              )
                              .map((group) => {
                                const isSelected = selectedGroups.some((g) => g._id === group._id);
                                return (
                                  <CommandItem
                                    key={group._id}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setConfig((prev) => ({
                                          ...prev,
                                          [key]: {
                                            ...prev[key],
                                            approvers: {
                                              ...prev[key]?.approvers,
                                              groups:
                                                prev[key]?.approvers?.groups?.filter(
                                                  (id: string) => id !== group._id
                                                ) || [],
                                            },
                                          },
                                        }));
                                      } else {
                                        setConfig((prev) => ({
                                          ...prev,
                                          [key]: {
                                            ...prev[key],
                                            approvers: {
                                              ...prev[key]?.approvers,
                                              groups: [
                                                ...(prev[key]?.approvers?.groups || []),
                                                group._id,
                                              ],
                                            },
                                          },
                                        }));
                                      }
                                    }}
                                    className={cn(
                                      'flex items-center gap-3 py-2',
                                      isSelected && 'bg-primary/10'
                                    )}
                                  >
                                    <div className="h-6 w-6 rounded-full bg-primary/30 flex items-center justify-center">
                                      <Users className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <p className="flex-1 text-sm font-medium text-foreground">
                                      {group.name}
                                    </p>
                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                  </CommandItem>
                                );
                              })}
                          </CommandList>
                        </Command>
                      </div>

                      {/* Approval Threshold */}
                      <div className="mb-4">
                        <Label className="mb-3 font-medium">Approval Threshold</Label>
                        <div className="flex gap-2">
                          {[
                            { value: 'single', label: 'Single', description: 'Any one approver' },
                            { value: 'majority', label: 'Majority', description: 'More than 50%' },
                            {
                              value: 'unanimous',
                              label: 'Unanimous',
                              description: 'All approvers',
                            },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    approvalThreshold: option.value,
                                  },
                                }))
                              }
                              className={cn(
                                'p-3 rounded-lg border cursor-pointer flex-1 text-center transition-all',
                                value?.approvalThreshold === option.value
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border/30 hover:border-primary hover:bg-primary/5'
                              )}
                            >
                              <p className="text-sm font-semibold mb-1">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Auto-approve toggle */}
                      <div className="mb-4">
                        <div className="flex items-start gap-3">
                          <Switch
                            checked={Boolean(value?.autoApprove)}
                            onCheckedChange={(checked) =>
                              setConfig((prev) => ({
                                ...prev,
                                [key]: {
                                  ...prev[key],
                                  autoApprove: checked,
                                },
                              }))
                            }
                          />
                          <div className="flex-1">
                            <Label className="font-medium">
                              Auto-approve after initial approval
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              For recurring actions, skip approval after first approval
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="p-4 bg-green-500/8 rounded-lg border border-green-500/20">
                        <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                          ✨ Configuration Summary
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This tool requires approval from{' '}
                          <strong>
                            {(selectedUsers.length || 0) + (selectedGroups.length || 0)} approver(s)
                          </strong>{' '}
                          using <strong>{value?.approvalThreshold || 'single'}</strong> threshold.
                          {value?.autoApprove && ' Auto-approval is enabled for recurring actions.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        }

        // Special handling for LLM configuration
        if (node?.data.type?.startsWith('llm-')) {
          if (key === 'temperature') {
            return (
              <div key={key} className="col-span-12">
                <Label className="mb-2 font-medium">Temperature</Label>
                <Select
                  value={String(value || 0.5)}
                  onValueChange={(val) =>
                    setConfig((prev) => ({ ...prev, [key]: parseFloat(val) }))
                  }
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.1">0.1 (Very Focused)</SelectItem>
                    <SelectItem value="0.3">0.3 (Focused)</SelectItem>
                    <SelectItem value="0.5">0.5 (Balanced)</SelectItem>
                    <SelectItem value="0.7">0.7 (Creative)</SelectItem>
                    <SelectItem value="1.0">1.0 (Very Creative)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          }
          if (key === 'maxTokens') {
            return (
              <div key={key} className="col-span-12">
                <Label className="mb-2 font-medium">Max Tokens</Label>
                <Input
                  type="number"
                  value={value || 1000}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [key]: parseInt(e.target.value, 10) || 1000 }))
                  }
                  min={1}
                  max={4000}
                  className="rounded-lg"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Maximum number of tokens in the response
                </p>
              </div>
            );
          }
          if (key === 'isMultimodal' || key === 'isDefault') {
            return (
              <div key={key} className="col-span-12">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={Boolean(value)}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                  <div className="flex-1">
                    <Label className="font-medium">
                      {key === 'isMultimodal' ? 'Multimodal Model' : 'Default Model'}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {key === 'isMultimodal'
                        ? 'Supports text, images, and other media types'
                        : 'Use this as the primary model for the agent'}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
        }

        // Special handling for Tool Group configuration
        if (node?.data.type.startsWith('tool-group-')) {
          if (key === 'selectedTools') {
            return (
              <div key={key} className="col-span-12">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Selected Tools ({Array.isArray(value) ? value.length : 0} of{' '}
                      {node.data.config?.tools?.length || 0})
                    </h3>
                  </div>
                  <div className="max-h-[300px] overflow-auto border-2 border-border/20 rounded-lg bg-background/80 backdrop-blur-sm p-2">
                    {node.data.config?.tools?.map((tool: any) => (
                      <div
                        key={tool.toolId}
                        className="p-4 rounded-lg transition-colors hover:bg-primary/5"
                      >
                        <div className="flex items-start gap-3">
                          <Switch
                            checked={Array.isArray(value) ? value.includes(tool.toolId) : false}
                            onCheckedChange={(checked) => {
                              const currentSelected = Array.isArray(value) ? value : [];
                              const newSelected = checked
                                ? [...currentSelected, tool.toolId]
                                : currentSelected.filter((id) => id !== tool.toolId);
                              setConfig((prev) => ({ ...prev, [key]: newSelected }));
                            }}
                          />
                          <div className="flex-1 ml-1">
                            <p className="text-sm font-semibold mb-1">
                              {tool.toolName?.replace(/_/g, ' ') || tool.fullName}
                            </p>
                            {tool.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {tool.description.length > 80
                                  ? `${tool.description.slice(0, 80)}...`
                                  : tool.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
        }

        // Special handling for KB Group configuration
        if (node?.data.type === 'kb-group') {
          if (key === 'selectedKBs') {
            return (
              <div key={key} className="col-span-12">
                <Label className="mb-2 font-medium">
                  Selected Knowledge Bases ({Array.isArray(value) ? value.length : 0} of{' '}
                  {node.data.config?.knowledgeBases?.length || 0})
                </Label>
                <div className="max-h-[200px] overflow-auto border border-border rounded-lg p-2">
                  {node.data.config?.knowledgeBases?.map((kb: any) => (
                    <div key={kb.id} className="flex items-center gap-3 mb-2">
                      <Switch
                        checked={Array.isArray(value) ? value.includes(kb.id) : false}
                        onCheckedChange={(checked) => {
                          const currentSelected = Array.isArray(value) ? value : [];
                          const newSelected = checked
                            ? [...currentSelected, kb.id]
                            : currentSelected.filter((id) => id !== kb.id);
                          setConfig((prev) => ({ ...prev, [key]: newSelected }));
                        }}
                      />
                      <Label className="text-sm font-medium flex-1">{kb.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        }

        // Special handling for App Memory configuration
        if (node?.data.type.startsWith('app-')) {
          if (key === 'searchScope' || key === 'fileTypes' || key === 'services') {
            const options =
              key === 'searchScope'
                ? ['all', 'channels', 'dms', 'inbox', 'sent', 'drafts']
                : key === 'fileTypes'
                  ? ['all', 'documents', 'images', 'videos', 'presentations']
                  : ['drive', 'docs', 'sheets', 'slides'];

            return (
              <div key={key} className="col-span-12">
                <Label className="mb-2 font-medium">
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </Label>
                <Select
                  value={String(Array.isArray(value) ? value[0] : value || '')}
                  onValueChange={(val) =>
                    setConfig((prev) => ({
                      ...prev,
                      [key]: Array.isArray(value) ? [val] : val,
                    }))
                  }
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
        }

        // Skip certain technical fields
        if (
          [
            'modelKey',
            'modelName',
            'provider',
            'modelType',
            'toolId',
            'fullName',
            'appName',
            'appDisplayName',
            'tools',
            'knowledgeBases',
          ].includes(key)
        ) {
          return null;
        }

        // Default text field for other properties
        if (typeof value === 'string' || typeof value === 'number') {
          return (
            <div key={key} className="col-span-12">
              <Label className="mb-2 font-medium">
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </Label>
              <Input
                value={String(value)}
                onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                className="rounded-lg"
              />
            </div>
          );
        }

        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      },
      [
        node?.data.type,
        users,
        groups,
        getAvatarColor,
        node?.data.config?.tools,
        node?.data.config?.knowledgeBases,
        userSearchQuery,
        groupSearchQuery,
      ]
    );

    // Don't render if no node or not open
    if (!node || !open) return null;

    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-2xl p-0">
          <DialogTitle className="flex items-center justify-between p-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Cog className="h-4.5 w-4.5 text-primary" />
              </div>
              <h3 className="font-medium text-base m-0">Configure {node.data.label}</h3>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleClose}
              className="h-8 w-8"
              aria-label="close"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>

          <div className="px-6 pt-6 pb-0">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-4">{node.data.description}</p>

              <div className="grid grid-cols-12 gap-4">
                {Object.entries(config).map(([key, value]) => renderConfigField(key, value))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border bg-muted/50">
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              Delete Node
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

NodeConfigDialog.displayName = 'NodeConfigDialog';

export default NodeConfigDialog;
