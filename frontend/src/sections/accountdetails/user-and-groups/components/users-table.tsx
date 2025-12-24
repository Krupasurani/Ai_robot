import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import type { GroupUser } from '../../types/group-details';

export type UsersTableProps = {
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  rows: GroupUser[];
  page: number;
  rowsPerPage: number;
  onChangePage: (page: number) => void;
  onInviteUser: () => void;
  onAddToGroup: () => void;
  onRemoveUser: (userId: string) => void;
  onOpenActions?: (event: React.MouseEvent<HTMLElement>, userId: string) => void;
};

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

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + (acc * 32 - acc), 0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function UsersTable(props: UsersTableProps) {
  const {
    loading = false,
    search,
    onSearchChange,
    rows,
    page,
    rowsPerPage,
    onChangePage,
    onInviteUser,
    onAddToGroup,
    onRemoveUser,
    onOpenActions,
  } = props;

  const paged = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Search and Action Bar - Thero Style */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={loading}
            placeholder="Search users"
            className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddToGroup} disabled={loading} className="h-9">
            <Users className="mr-2 h-4 w-4" />
            Add to group
          </Button>
          <Button size="sm" onClick={onInviteUser} disabled={loading} className="h-9">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite user
          </Button>
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
            {paged.length > 0 ? (
              paged.map((user) => (
                <TableRow
                  key={user._id}
                  className="hover:bg-muted/50 transition-colors border-b last:border-0"
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={user._id}
                        fullName={user.fullName}
                        hasPhoto={user.hasPhoto}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
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
                    {onOpenActions ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => onOpenActions(e, user._id || '')}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    ) : (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onAddToGroup()}>
                            Add to groups
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onRemoveUser(user._id || '')}
                            className="text-destructive focus:text-destructive"
                          >
                            Remove user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-32">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="font-medium text-sm">No users found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search ? 'Try adjusting your search' : 'Invite users to get started'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Thero Style */}
      {rows.length > rowsPerPage && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChangePage(page - 1)}
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
                  onClick={() => onChangePage(pageNum)}
                  className="h-8 w-8 p-0"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChangePage(page + 1)}
              disabled={page >= totalPages - 1}
              className="h-8 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersTable;
