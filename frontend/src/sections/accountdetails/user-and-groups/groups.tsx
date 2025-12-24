import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Info,
  Plus,
  Search,
  X,
  Trash2,
  AlertTriangle,
  Users as UsersIcon,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Label } from '@/components/ui/label';
import { Form } from '@/components/ui/form';
import { InputField } from '@/components/ui/input-field';

import { useAdmin } from 'src/context/AdminContext';

import { allGroups, createGroup, deleteGroup } from '../utils';
import { decrementGroupCount, incrementGroupCount } from '../../../store/userAndGroupsSlice';

import type { AppUserGroup } from '../types/group-details';

const CreateGroupSchema = zod.object({
  name: zod.string().min(1, { message: 'Group name is required!' }),
  type: zod.string().default('custom'),
});

type CreateGroupFormData = zod.infer<typeof CreateGroupSchema>;

// Group colors array (Thero-inspired color palette)
const GROUP_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
];

// Function to get a consistent color for groups
const getGroupColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + (acc * 32 - acc), 0);
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
};

// Get initials from group name
const getGroupInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Groups() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [groups, setGroups] = useState<AppUserGroup[]>([]);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage] = useState<number>(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGroup, setSelectedGroup] = useState<AppUserGroup | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  const methods = useForm<CreateGroupFormData>({
    resolver: zodResolver(CreateGroupSchema),
    defaultValues: {
      name: '',
      type: 'custom',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = methods;

  useEffect(() => {
    const loadGroups = async () => {
      setLoading(true);
      try {
        const data = await allGroups();
        const sortedGroups = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setGroups(sortedGroups);
      } catch (error: any) {
        toast.error(error?.errorMessage || 'Failed to load groups');
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  const totalPages = Math.ceil(filteredGroups.length / rowsPerPage);
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleCloseCreateModal = (): void => {
    setIsCreateModalOpen(false);
    reset();
  };

  const handleDeleteGroup = async (groupId: string): Promise<void> => {
    try {
      await deleteGroup(groupId);
      setGroups((prevGroups) => prevGroups.filter((group) => group._id !== groupId));
      dispatch(decrementGroupCount());
      toast.success('Group deleted successfully');
    } catch (error: any) {
      toast.error(error?.errorMessage || 'Failed to delete group');
    }
  };

  const onSubmit = async (data: CreateGroupFormData): Promise<void> => {
    try {
      await createGroup(data);
      const updatedGroups = await allGroups();
      const sortedGroups = [...updatedGroups].sort((a, b) => a.name.localeCompare(b.name));
      setGroups(sortedGroups);
      dispatch(incrementGroupCount());
      handleCloseCreateModal();
      toast.success('Group created successfully');
    } catch (error: any) {
      toast.error(error?.errorMessage || 'Failed to create group');
    }
  };

  const handleConfirmRemoveGroup = (): void => {
    if (selectedGroup) {
      handleDeleteGroup(selectedGroup._id);
    }
    setIsConfirmDialogOpen(false);
    setSelectedGroup(null);
  };

  const handleViewGroup = (group: AppUserGroup): void => {
    navigate(`/account/company-settings/groups/${group._id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading groups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Action Bar - Thero Style */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups"
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

        {/* Action Button */}
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="h-9">
          <Plus className="mr-2 h-4 w-4" />
          Create group
        </Button>
      </div>

      {/* Groups Table - Thero Style */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="h-11 text-xs font-medium text-muted-foreground">Group</TableHead>
              <TableHead className="h-11 text-xs font-medium text-muted-foreground">Members</TableHead>
              <TableHead className="h-11 text-xs font-medium text-muted-foreground w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGroups.length > 0 ? (
              paginatedGroups.map((group) => (
                <TableRow
                  key={group._id}
                  className="hover:bg-muted/50 transition-colors border-b last:border-0 cursor-pointer"
                  onClick={() => handleViewGroup(group)}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-9 w-9 text-sm"
                        style={{ backgroundColor: getGroupColor(group.name) }}
                      >
                        <AvatarFallback className="text-white font-medium text-xs">
                          {getGroupInitials(group.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.type === 'custom' ? 'Custom group' : group.type}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {group.users.length} {group.users.length === 1 ? 'member' : 'members'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => handleViewGroup(group)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View group
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={!isAdmin}
                          onClick={() => {
                            setSelectedGroup(group);
                            setIsConfirmDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete group
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
                    <p className="font-medium text-sm">No groups found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchTerm ? 'Try adjusting your search' : 'Create a group to get started'}
                    </p>
                    {!searchTerm && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-2"
                      >
                        Create your first group
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
      {filteredGroups.length > rowsPerPage && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredGroups.length)} of{' '}
            {filteredGroups.length}
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

      {/* Create Group Dialog - Thero Style */}
      <Dialog open={isCreateModalOpen} onOpenChange={handleCloseCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UsersIcon className="h-5 w-5 text-primary" />
              </div>
              Create new group
            </DialogTitle>
            <DialogDescription>
              Groups help you organize users and manage permissions more efficiently.
            </DialogDescription>
          </DialogHeader>

          <Form {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group name</Label>
                <InputField
                  control={methods.control}
                  name="name"
                  label="Group name"
                  placeholder="e.g. Marketing Team"
                />
              </div>

              <Alert className="border-blue-500/20 bg-blue-500/5">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm text-muted-foreground">
                  After creating the group, you can add users and configure permissions.
                </AlertDescription>
              </Alert>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={handleCloseCreateModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create group'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog - Thero Style */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              Delete group
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <strong>{selectedGroup?.name}</strong>? This will
              remove all users from this group. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemoveGroup}>
              Delete group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
