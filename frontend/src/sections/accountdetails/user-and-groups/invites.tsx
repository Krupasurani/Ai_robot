import { useDispatch } from 'react-redux';
import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Mail,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
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
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAdmin } from 'src/context/AdminContext';

import { removeUser, resendInvite, getAllUsersWithGroups } from '../utils';
import { setInviteCount, decrementInvitesCount } from '../../../store/userAndGroupsSlice';

import type { GroupUser } from '../types/group-details';

interface InvitesProps {
  freeSeats: number | null;
}

export default function Invites({ freeSeats }: InvitesProps) {
  const [users, setUsers] = useState<GroupUser[]>([]);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string | null;
    email: string;
    action: 'resend' | 'remove';
  }>({
    open: false,
    userId: null,
    email: '',
    action: 'resend',
  });

  const dispatch = useDispatch();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    const fetchUsers = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const response: GroupUser[] = await getAllUsersWithGroups();
        const pendingUsers = response.filter((user) => user.hasLoggedIn === false);
        dispatch(setInviteCount(pendingUsers.length));
        setUsers(pendingUsers);
      } catch (error) {
        // Error handling
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [dispatch]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleConfirmAction = async (): Promise<void> => {
    const { userId, action } = confirmDialog;

    if (!userId) return;
    setIsActionLoading(true);
    try {
      if (action === 'resend') {
        await resendInvite(userId);
        toast.success('Invitation resent successfully');
      } else {
        await removeUser(userId);
        setUsers(users.filter((user) => user?._id !== userId));
        dispatch(decrementInvitesCount());
        toast.success('Invitation removed successfully');
      }
    } catch (error: any) {
      toast.error(error?.errorMessage || 'An error occurred');
    } finally {
      setIsActionLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const handleCloseConfirm = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading invitations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* License Warning */}
      {freeSeats !== null && freeSeats <= 0 && (
        <Alert className="border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            No free licenses available. Increase your seat allocation to invite additional teammates.
          </AlertDescription>
        </Alert>
      )}

      {/* Search Bar - Thero Style */}
      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email"
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

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="rounded-lg border bg-card py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-medium text-sm">No pending invitations</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {searchTerm
                ? 'No invitations match your search'
                : 'All invitations have been accepted or there are no pending invites'}
            </p>
            {searchTerm && (
              <Button variant="link" size="sm" onClick={() => setSearchTerm('')} className="mt-2">
                Clear search
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Invitations Table - Thero Style */}
      {filteredUsers.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="h-11 text-xs font-medium text-muted-foreground">
                  Email
                </TableHead>
                <TableHead className="h-11 text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="h-11 text-xs font-medium text-muted-foreground">
                  Groups
                </TableHead>
                <TableHead className="h-11 text-xs font-medium text-muted-foreground w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow
                  key={user._id}
                  className="hover:bg-muted/50 transition-colors border-b last:border-0"
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={user._id}
                        fullName={user.email}
                        hasPhoto={user.hasPhoto}
                      />
                      <span className="font-medium text-sm truncate">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.groups && user.groups.length > 0 ? (
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
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          disabled={!isAdmin}
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              userId: user._id || '',
                              email: user.email,
                              action: 'resend',
                            })
                          }
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend invite
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={!isAdmin}
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              userId: user._id || '',
                              email: user.email,
                              action: 'remove',
                            })
                          }
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove invite
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

      {/* Confirmation Dialog - Thero Style */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCloseConfirm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  confirmDialog.action === 'resend' ? 'bg-primary/10' : 'bg-destructive/10'
                }`}
              >
                {confirmDialog.action === 'resend' ? (
                  <Mail className="h-5 w-5 text-primary" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
              </div>
              {confirmDialog.action === 'resend' ? 'Resend invitation' : 'Remove invitation'}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {confirmDialog.action === 'resend' ? (
                <>
                  Are you sure you want to resend the invitation to{' '}
                  <strong>{confirmDialog.email}</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to remove the invitation for{' '}
                  <strong>{confirmDialog.email}</strong>? This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={handleCloseConfirm} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              variant={confirmDialog.action === 'resend' ? 'default' : 'destructive'}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {confirmDialog.action === 'resend' ? 'Resending...' : 'Removing...'}
                </>
              ) : confirmDialog.action === 'resend' ? (
                'Resend invite'
              ) : (
                'Remove invite'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
