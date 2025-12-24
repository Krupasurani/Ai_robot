import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Users as UsersIcon,
  Trash2,
  UserPlus,
  MoreHorizontal,
  AlertTriangle,
  Edit,
  Loader2,
  UserCog,
  Filter,
  ChevronDown,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { CONFIG } from 'src/config-global';
import { cn } from '@/utils/cn';
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
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdmin } from 'src/context/AdminContext';

import { setCounts, decrementUserCount } from '../../../store/userAndGroupsSlice';
import { allGroups, removeUser, getUserIdFromToken, getAllUsersWithGroups } from '../utils';
import { AddUserModal } from './components/add-user-modal';
import { AddUsersToGroupsModal } from './components/add-users-to-groups-modal';

import type { GroupUser, AppUserGroup } from '../types/group-details';

interface UsersProps {
  freeSeats: number | null;
}

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
const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

// Function to get avatar color based on name
const getAvatarColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + (acc * 32 - acc), 0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const Users = ({ freeSeats }: UsersProps) => {
  const [users, setUsers] = useState<GroupUser[]>([]);
  const [groups, setGroups] = useState<AppUserGroup[]>([]);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [isAddUsersToGroupsModalOpen, setIsAddUsersToGroupsModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<GroupUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAdmin } = useAdmin();

  const noSeatsAvailable = freeSeats !== null && freeSeats <= 0;

  useEffect(() => {
    const fetchUsersAndGroups = async () => {
      setLoading(true);
      try {
        const orgId = await getUserIdFromToken();
        setUserId(orgId);
        const response = await getAllUsersWithGroups();
        const groupsData = await allGroups();
        const loggedInUsers = response.filter(
          (user) => user?.email !== null && user.fullName && user.hasLoggedIn === true
        );
        const pendingUsers = response.filter((user) => user.hasLoggedIn === false);

        dispatch(
          setCounts({
            usersCount: loggedInUsers.length,
            groupsCount: groupsData.length,
            invitesCount: pendingUsers.length,
          })
        );
        setUsers(loggedInUsers);
        setGroups(groupsData);
      } catch (error) {
        // Error handling
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndGroups();
    // eslint-disable-next-line
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        (user?.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesGroup =
        !selectedGroupFilter ||
        user.groups.some((group) => group._id === selectedGroupFilter || group.name === selectedGroupFilter);

      return matchesSearch && matchesGroup;
    });
  }, [users, searchTerm, selectedGroupFilter]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleDeleteUser = async (deleteUserId: string): Promise<void> => {
    try {
      await removeUser(deleteUserId);
      const updatedUsers = await getAllUsersWithGroups();
      const loggedInUsers = updatedUsers.filter((user) => user.email !== null && user.fullName);
      setUsers(loggedInUsers);
      dispatch(decrementUserCount());
      toast.success('User removed successfully');
    } catch (error: any) {
      toast.error(error?.errorMessage || 'Failed to remove user');
    }
  };

  const handleUsersAdded = async (message?: string) => {
    try {
      const updatedUsers = await getAllUsersWithGroups();
      const loggedInUsers = updatedUsers.filter((user) => user?.email !== '' && user?.fullName);
      setUsers(loggedInUsers);
      if (message) {
        toast.error(message);
      } else {
        toast.success('Users added to groups successfully');
      }
    } catch (error) {
      // Error handling
    }
  };

  const handleUsersInvited = async (message?: string) => {
    try {
      const updatedUsers = await getAllUsersWithGroups();
      const loggedInUsers = updatedUsers.filter((user) => user.email !== null && user.fullName);
      setUsers(loggedInUsers);
      if (message && message !== 'Invite sent successfully') {
        toast.error(message);
      } else {
        toast.success(message || 'Users invited successfully');
      }
    } catch (error) {
      // Error handling
    }
  };

  const handleConfirmRemoveUser = () => {
    if (selectedUser && selectedUser._id) {
      handleDeleteUser(selectedUser._id);
    }
    setIsConfirmDialogOpen(false);
    setSelectedUser(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGroupFilter(null);
    setPage(0);
  };

  const hasActiveFilters = searchTerm || selectedGroupFilter;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar - Thero Style */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users"
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

          {/* Filter Dropdowns */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-dashed">
                <Filter className="mr-2 h-3.5 w-3.5" />
                All filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {(searchTerm ? 1 : 0) + (selectedGroupFilter ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={clearFilters} disabled={!hasActiveFilters}>
                Clear all filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Group Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Group
                {selectedGroupFilter && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    1
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuCheckboxItem
                checked={!selectedGroupFilter}
                onCheckedChange={() => {
                  setSelectedGroupFilter(null);
                  setPage(0);
                }}
              >
                All groups
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {groups.map((group) => (
                <DropdownMenuCheckboxItem
                  key={group._id}
                  checked={selectedGroupFilter === group._id}
                  onCheckedChange={() => {
                    setSelectedGroupFilter(group._id === selectedGroupFilter ? null : group._id);
                    setPage(0);
                  }}
                >
                  {group.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddUsersToGroupsModalOpen(true)}
            className="h-9"
          >
            <UserCog className="mr-2 h-4 w-4" />
            Add to group
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    onClick={() => setIsAddUserModalOpen(true)}
                    disabled={noSeatsAvailable}
                    className="h-9"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite user
                  </Button>
                </span>
              </TooltipTrigger>
              {noSeatsAvailable && (
                <TooltipContent>
                  <p>No free licenses available</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Users Table - Thero Style */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="h-11 text-xs font-medium text-muted-foreground">Name</TableHead>
              <TableHead className="h-11 text-xs font-medium text-muted-foreground">Groups</TableHead>
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
                              {user.fullName || 'Unnamed User'}
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
                              <p className="font-medium truncate">{user.fullName || 'Unnamed User'}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {user.email || 'No email'}
                              </p>
                            </div>
                          </div>
                          {user.groups && user.groups.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Groups</p>
                              <div className="flex flex-wrap gap-1">
                                {user.groups.map((group, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {group.name || 'Unnamed Group'}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link
                              to={
                                user._id === userId
                                  ? '/account/company-settings/personal-profile'
                                  : `/account/company-settings/user-profile/${user._id}`
                              }
                            >
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              View profile
                            </Link>
                          </Button>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.groups.length > 0 ? (
                        <>
                          {user.groups.slice(0, 2).map((group, index) => (
                            <Badge key={index} variant="secondary" className="text-xs font-normal">
                              {group.name}
                            </Badge>
                          ))}
                          {user.groups.length > 2 && (
                            <Badge variant="outline" className="text-xs font-normal">
                              +{user.groups.length - 2}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No groups</span>
                      )}
                    </div>
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
                            if (!user._id) return;
                            if (user._id === userId) {
                              navigate('/account/personal/profile');
                            } else {
                              navigate(`/account/company-settings/user-profile/${user._id}`);
                            }
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit profile
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
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-32">
                  <div className="flex flex-col items-center justify-center text-center">
                    <UsersIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="font-medium text-sm">No users found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasActiveFilters
                        ? 'Try adjusting your filters'
                        : 'Invite users to get started'}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                        Clear filters
                      </Button>
                    )}
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
            Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
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

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              Remove user
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove <strong>{selectedUser?.fullName || 'this user'}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemoveUser}>
              Remove user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <AddUserModal
        open={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        groups={groups}
        onUsersAdded={handleUsersInvited}
        freeSeats={freeSeats}
      />

      <AddUsersToGroupsModal
        open={isAddUsersToGroupsModalOpen}
        onClose={() => setIsAddUsersToGroupsModalOpen(false)}
        onUsersAdded={handleUsersAdded}
        allUsers={users}
        groups={groups}
      />
    </div>
  );
};

export default Users;
