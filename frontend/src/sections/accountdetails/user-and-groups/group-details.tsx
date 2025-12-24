import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  Search,
  UserPlus,
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  MoreHorizontal,
  UserMinus,
  Loader2,
  Edit,
  Settings,
} from 'lucide-react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { toast } from 'sonner';
import { CONFIG } from 'src/config-global';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useAdmin } from 'src/context/AdminContext';

import {
  fetchAllUsers,
  fetchGroupDetails,
  getUserIdFromToken,
  removeUserFromGroup,
  getAllUsersWithGroups,
} from '../utils';
import { EditGroupModal } from './components/edit-group-modal';
import { AddUsersToGroupModal } from './components/add-users-to-group-modal';

import type { AppUser, GroupUser, AppUserGroup } from '../types/group-details';

// Avatar colors array (Thero-inspired color palette)
const AVATAR_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
];

// Get initials from full name
const getInitials = (fullName: string | null | undefined) => {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Get avatar color based on name
const getAvatarColor = (name: string | null | undefined) => {
  if (!name) return AVATAR_COLORS[0];
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + (acc * 32 - acc), 0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Get group color
const getGroupColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + (acc * 32 - acc), 0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Get group initials
const getGroupInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function GroupDetails() {
  const navigate = useNavigate();

  const [group, setGroup] = useState<AppUserGroup | null>(null);
  const [groupUsers, setGroupUsers] = useState<AppUser[]>([]);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddUsersModalOpen, setIsAddUsersModalOpen] = useState<boolean>(false);
  const [newUsers, setNewUsers] = useState<GroupUser[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isAdmin } = useAdmin();

  const location = useLocation();
  const pathSegments = location?.pathname?.split('/') || [];
  const groupId = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;

  const filterGroupUsers = (users: AppUser[], groupUserIds: string[]): AppUser[] =>
    users.filter((user: AppUser) => groupUserIds.includes(user._id));

  const filteredUsers = useMemo(() => {
    return groupUsers.filter(
      (user) =>
        (user?.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [groupUsers, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const orgId = await getUserIdFromToken();
        setUserId(orgId);
        const groupData = await fetchGroupDetails(groupId);
        const allUsers = await fetchAllUsers();

        const loggedInUsers = allUsers.filter((user) => user?.email !== null);
        const filteredUsersList = filterGroupUsers(loggedInUsers, groupData.users);
        const response = await getAllUsersWithGroups();
        setNewUsers(response);
        setGroup(groupData);
        setGroupUsers(filteredUsersList);
      } catch (error: any) {
        toast.error(error?.errorMessage || 'Error fetching group data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  const handleConfirmRemoveUser = () => {
    if (selectedUser) {
      handleDeleteUser(selectedUser._id);
    }
    setIsConfirmDialogOpen(false);
    setSelectedUser(null);
  };

  const handleUsersAdded = async () => {
    try {
      const groupData = await fetchGroupDetails(groupId);
      const allUsers = await fetchAllUsers();
      const loggedInUsers = allUsers.filter((user) => user?.email !== null);
      const filteredUsersList = filterGroupUsers(loggedInUsers, groupData.users);
      setGroupUsers(filteredUsersList);
    } catch (error) {
      // Error handling
    }
  };

  const handleDeleteUser = async (deleteUserId: string) => {
    try {
      await removeUserFromGroup(deleteUserId, groupId);
      setGroupUsers((prevGroupUsers) => prevGroupUsers.filter((user) => user._id !== deleteUserId));
      toast.success('User removed from group');
    } catch (error: any) {
      toast.error(error?.errorMessage || 'Error removing user');
    }
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading group...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 font-medium">Group not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The group you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/account/company-settings/groups')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to groups
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Header - Thero Style */}
      <div className="px-6 pt-6 pb-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm mb-4" aria-label="breadcrumb">
          <RouterLink
            to="/account/company-settings/groups"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Groups
          </RouterLink>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{group.name}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              className="h-12 w-12 text-lg"
              style={{ backgroundColor: getGroupColor(group.name) }}
            >
              <AvatarFallback className="text-white font-medium">
                {getGroupInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs font-normal">
                  {groupUsers.length} {groupUsers.length === 1 ? 'member' : 'members'}
                </Badge>
                {group.type && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {group.type === 'custom' ? 'Custom' : group.type}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddUsersModalOpen(true)} className="h-9">
              <UserPlus className="mr-2 h-4 w-4" />
              Add members
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="h-9">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Search Bar */}
        {groupUsers.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {groupUsers.length === 0 && (
          <div className="rounded-lg border bg-card py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium text-sm">No members in this group</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add users to this group to manage their permissions together
              </p>
              <Button size="sm" onClick={() => setIsAddUsersModalOpen(true)} className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" />
                Add members
              </Button>
            </div>
          </div>
        )}

        {/* Members Table - Thero Style */}
        {groupUsers.length > 0 && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="h-11 text-xs font-medium text-muted-foreground">
                      Member
                    </TableHead>
                    <TableHead className="h-11 text-xs font-medium text-muted-foreground w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <TableRow
                        key={user._id}
                        className="hover:bg-muted/50 transition-colors border-b last:border-0"
                      >
                        <TableCell className="py-3">
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <div className="flex items-center gap-3 cursor-pointer">
                                <UserAvatar
                                  userId={user._id}
                                  fullName={user.fullName}
                                  hasPhoto={user.hasPhoto}
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {user.fullName || 'Invited User'}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email || 'No email'}
                                  </p>
                                </div>
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-72" align="start">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <UserAvatar
                                    userId={user._id}
                                    fullName={user.fullName}
                                    hasPhoto={user.hasPhoto}
                                    className="h-12 w-12"
                                    fallbackClassName="text-base"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">
                                      {user.fullName || 'Invited User'}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {user.email || 'No email'}
                                    </p>
                                  </div>
                                </div>
                                {user.designation && (
                                  <p className="text-sm text-muted-foreground">{user.designation}</p>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    if (user._id === userId) {
                                      navigate('/account/personal/profile');
                                    } else {
                                      navigate(`/account/company-settings/user-profile/${user._id}`);
                                    }
                                  }}
                                >
                                  <Edit className="mr-2 h-3.5 w-3.5" />
                                  View profile
                                </Button>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </TableCell>
                        <TableCell className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => {
                                  if (user._id === userId) {
                                    navigate('/account/company-settings/personal-profile');
                                  } else {
                                    navigate(`/account/company-settings/user-profile/${user._id}`);
                                  }
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                View profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={!isAdmin}
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsConfirmDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-32">
                        <div className="flex flex-col items-center justify-center text-center">
                          <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="font-medium text-sm">No members found</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Try adjusting your search
                          </p>
                          <Button variant="link" size="sm" onClick={() => setSearchTerm('')} className="mt-2">
                            Clear search
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination - Thero Style */}
            {filteredUsers.length > rowsPerPage && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of{' '}
                  {filteredUsers.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangePage(page - 1)}
                    disabled={page === 0}
                    className="h-8 px-3"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum = i;
                    if (totalPages > 5) {
                      if (page < 3) {
                        pageNum = i;
                      } else if (page > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleChangePage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangePage(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="h-8 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Users Modal */}
      <AddUsersToGroupModal
        open={isAddUsersModalOpen}
        onClose={() => setIsAddUsersModalOpen(false)}
        onUsersAdded={handleUsersAdded}
        allUsers={newUsers}
        group={groupId}
      />

      {/* Edit Group Modal */}
      <EditGroupModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        groupId={groupId}
        groupName={group.name}
      />

      {/* Confirmation Dialog - Thero Style */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              Remove member
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove{' '}
              <strong>{selectedUser?.fullName || 'this user'}</strong> from{' '}
              <strong>{group.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemoveUser}>
              Remove member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
