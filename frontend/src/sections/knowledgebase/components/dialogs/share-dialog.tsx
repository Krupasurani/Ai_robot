import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Link as LinkIcon,
  ChevronDown,
  Globe,
  User,
  Users,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/drop-down-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import { KnowledgeBaseAPI } from '../../services/api';
import { getUserById, getUserLogo, getOrgById, getOrgIdFromToken } from '@/sections/accountdetails/utils';
import { useAuthContext } from '@/auth/hooks/use-auth-context';
import type { UnifiedPermission } from 'src/components/permissions/UnifiedPermissionsDialog';
import axios from 'src/utils/axios';
import { paths } from 'src/routes/paths';

interface ShareKnowledgeBaseDialogProps {
  open: boolean;
  onClose: () => void;
  kbId: string;
  kbName: string;
}

type Role = 'OWNER' | 'EDITOR' | 'READER';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: Role;
}

const RoleLabel: Record<Role, string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  READER: 'Viewer',
};

export function ShareKnowledgeBaseDialog({
  open,
  onClose,
  kbId,
  kbName,
}: ShareKnowledgeBaseDialogProps) {
  const { user: currentUser } = useAuthContext();
  const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId;

  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<UnifiedPermission[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [companyName, setCompanyName] = useState<string>('Company');

  // General access state (mocked for now as API might not support it yet)
  const [generalAccess, setGeneralAccess] = useState<'restricted' | 'domain'>('domain');
  const [generalAccessRole, setGeneralAccessRole] = useState<Role>('READER');

  const fetchPermissions = useCallback(async () => {
    if (!kbId) return;
    setLoading(true);
    try {
      const perms = await KnowledgeBaseAPI.listKBPermissions(kbId);
      setPermissions(perms);

      // Fetch user details for each permission
      const userIds = perms.map(p => p.userId).filter(Boolean) as string[];
      const uniqueIds = Array.from(new Set(userIds));

      const newUsersMap = new Map<string, User>();

      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const userData = await getUserById(id);

            // Try to fetch user avatar separately
            let avatarUrl: string | undefined;
            try {
              const logoData = await getUserLogo(id);
              if (logoData) {
                avatarUrl = logoData;
              }
            } catch (e) {
              // Avatar loading failed, will use fallback
            }

            newUsersMap.set(id, {
              id: userData._id,
              name: userData.fullName || userData.firstName || 'Unknown User',
              email: userData.email,
              avatar: avatarUrl,
            });
          } catch (e) {
            console.error(`Failed to fetch user ${id}`, e);
            newUsersMap.set(id, { id, name: 'Unknown User', email: '' });
          }
        })
      );

      setUsersMap(newUsersMap);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast.error('Failed to load sharing settings');
    } finally {
      setLoading(false);
    }
  }, [kbId]);

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const orgId = await getOrgIdFromToken();
        const orgData = await getOrgById(orgId);
        // Use shortName if available, otherwise fall back to registeredName
        setCompanyName(orgData.shortName || orgData.registeredName || 'Company');
      } catch (error) {
        console.error('Failed to fetch company name:', error);
        setCompanyName('Company');
      }
    };

    if (open) {
      fetchPermissions();
      fetchCompanyName();
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [open, fetchPermissions]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Using the same endpoint as in KbPermissionsDialog
      const { data } = await axios.get(`/api/v1/users/graph/list`);
      const allUsers = (data?.users || []) as any[];

      const filtered = allUsers
        .filter(u =>
        (u.firstName?.toLowerCase().includes(query.toLowerCase()) ||
          u.lastName?.toLowerCase().includes(query.toLowerCase()) ||
          u.email?.toLowerCase().includes(query.toLowerCase()))
        )
        .map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim() || u.email,
          email: u.email,
          avatar: u.photoUrl
        }))
        .slice(0, 5); // Limit results

      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddPermission = async (user: User, role: Role = 'EDITOR') => {
    try {
      await KnowledgeBaseAPI.createKBPermissions(kbId, {
        userIds: [user.id],
        teamIds: [],
        role,
      });
      toast.success(`${user.name} added as ${RoleLabel[role]}`);
      setSearchQuery('');
      setSearchResults([]);
      fetchPermissions();
    } catch (error) {
      console.error('Failed to add permission:', error);
      toast.error('Failed to add user');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      await KnowledgeBaseAPI.updateKBPermission(kbId, {
        userIds: [userId],
        teamIds: [],
        role: newRole,
      });
      toast.success(`Role updated to ${RoleLabel[newRole]}`);
      fetchPermissions();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    try {
      await KnowledgeBaseAPI.removeKBPermission(kbId, {
        userIds: [userId],
        teamIds: [],
      });
      toast.success('Access removed');
      fetchPermissions();
    } catch (error) {
      console.error('Failed to remove access:', error);
      toast.error('Failed to remove access');
    }
  };

  const handleCopyLink = async () => {
    // Build URL using the correct route path
    const url = `${window.location.origin}${paths.dashboard.knowledgebase.root}/${encodeURIComponent(kbId)}`;

    try {
      // Try the modern Clipboard API first
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (err) {
      // Fallback for environments where clipboard API fails (e.g., http localhost, some browsers)
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          toast.success('Link copied to clipboard');
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackErr) {
        // Last resort: show the URL in a prompt so user can copy manually
        toast.error('Could not copy automatically. Please copy the link manually.');
        window.prompt('Copy this link:', url);
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500',
      'bg-orange-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden rounded-xl font-roboto" showCloseButton={false} aria-describedby={undefined}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <DialogTitle className="text-[20px] font-bold text-foreground">
            Share &quot;🔥 {kbName}&quot;
          </DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50 transition-colors" onClick={onClose}>
            <X className="w-5 h-5 text-muted-foreground/60" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 pt-2 pb-5 space-y-5">
          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder="Search for a department, team, or teammate"
              className="h-12 px-4 text-[15px] bg-white border-gray-300 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all rounded-lg placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-popover border border-border/50 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 rounded-md transition-colors text-left"
                    onClick={() => handleAddPermission(user)}
                  >
                    <Avatar className="h-9 w-9 ring-1 ring-border/30">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      ) : null}
                      <AvatarFallback className={`${getAvatarColor(user.name)} text-white text-sm`}>
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[15px] font-normal truncate">{user.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* People with access list */}
          <div>
            <h3 className="text-[13px] font-medium text-black mb-3.5">People with access</h3>

            <ScrollArea className="max-h-[260px] -mx-1 px-1">
              <div className="space-y-0.5">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))
                ) : (
                  permissions.map((perm) => {
                    const user = perm.userId ? usersMap.get(perm.userId) : null;
                    if (!user) return null;
                    const role = (perm.role || 'READER') as Role;
                    const isOwner = role === 'OWNER';

                    const isCurrentUser = user.id === currentUserId;
                    const displayName = isCurrentUser ? `${user.name} (You)` : user.name;

                    return (
                      <div key={perm.id || user.id} className="flex items-center justify-between py-2 group">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-10 w-10 ring-1 ring-border/40">
                            {user.avatar ? (
                              <AvatarImage src={user.avatar} alt={user.name} />
                            ) : null}
                            <AvatarFallback className={`${getAvatarColor(user.name)} text-white text-sm font-medium`}>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[15px] text-foreground font-normal truncate">{displayName}</span>
                        </div>

                        {isOwner ? (
                          <span className="text-[15px] text-muted-foreground/70 px-3 font-normal">Owner</span>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[14px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-normal">
                                {RoleLabel[role]}
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] rounded-lg shadow-md">
                              <DropdownMenuItem onClick={() => handleUpdateRole(user.id, 'EDITOR')} className="py-2.5">
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium text-sm">Editor</span>
                                </div>
                                {role === 'EDITOR' && <Check className="h-4 w-4 ml-2 text-blue-600" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRole(user.id, 'READER')} className="py-2.5">
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium text-sm">Viewer</span>
                                </div>
                                {role === 'READER' && <Check className="h-4 w-4 ml-2 text-blue-600" />}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive py-2.5"
                                onClick={() => handleRemoveAccess(user.id)}
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

          {/* General Access */}
          <div className="pt-1">
            <h3 className="text-[13px] font-medium text-black mb-3.5">General access</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10">
                  {generalAccess === 'domain' ? (
                    <Users className="h-5 w-5 text-black" />
                  ) : (
                    <User className="h-5 w-5 text-black" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-[15px] font-normal text-foreground flex items-center gap-1 hover:underline text-left">
                        {generalAccess === 'domain' ? `Anyone at ${companyName}` : 'Restricted'}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[240px]">
                      <DropdownMenuItem onClick={() => setGeneralAccess('restricted')}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Restricted</span>
                          <span className="text-xs text-muted-foreground">Only people with access can open with the link</span>
                        </div>
                        {generalAccess === 'restricted' && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setGeneralAccess('domain')}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">Anyone at {companyName}</span>
                          <span className="text-xs text-muted-foreground">Anyone in your organization can find and view</span>
                        </div>
                        {generalAccess === 'domain' && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-[13px] text-muted-foreground/60">
                    {generalAccess === 'domain'
                      ? 'Can find and view this Collection'
                      : 'Only added people can access'}
                  </span>
                </div>
              </div>

              {generalAccess !== 'restricted' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[14px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-normal">
                      {RoleLabel[generalAccessRole]}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[140px] rounded-lg shadow-md">
                    <DropdownMenuItem onClick={() => setGeneralAccessRole('READER')} className="py-2">
                      <span className="flex-1 font-medium text-sm">Viewer</span>
                      {generalAccessRole === 'READER' && <Check className="h-4 w-4 ml-2 text-blue-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGeneralAccessRole('EDITOR')} className="py-2">
                      <span className="flex-1 font-medium text-sm">Editor</span>
                      {generalAccessRole === 'EDITOR' && <Check className="h-4 w-4 ml-2 text-blue-600" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 flex items-center justify-between border-t border-border/30 bg-background">
          <Button variant="outline" className="gap-2 rounded-none h-9 text-[14px] font-normal border-border/50 hover:bg-muted/40" onClick={handleCopyLink}>
            <LinkIcon className="h-4 w-4" />
            Copy link
          </Button>
          <Button className="rounded-lg px-6 h-9 text-[14px] font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

