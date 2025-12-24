import React from 'react';
import { Search, X, RefreshCw, Edit2, Trash2, Users, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';

interface Permission {
  _id: string;
  _key: string;
  entity_id: string;
  entity_key: string;
  entity_name: string;
  entity_email?: string;
  entity_type: 'USER' | 'TEAM';
  role: string;
  created_at: number;
  updated_at: number;
}

interface CurrentAccessListProps {
  permissions: Permission[];
  filteredPermissions: Permission[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onEdit: (permission: Permission) => void;
  onDelete: (permission: Permission) => void;
  loading: boolean;
  loadingPermissions: boolean;
  getInitials: (name: string) => string;
  getAvatarColor: (name: string) => string;
  getRoleDisplayName: (role: string) => string;
}

export function CurrentAccessList({
  permissions,
  filteredPermissions,
  searchQuery,
  onSearchChange,
  onRefresh,
  onEdit,
  onDelete,
  loading,
  loadingPermissions,
  getInitials,
  getAvatarColor,
  getRoleDisplayName,
}: CurrentAccessListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">
          Current Access ({filteredPermissions.length}
          {searchQuery && filteredPermissions.length !== permissions.length
            ? ` of ${permissions.length}`
            : ''}
          )
        </h3>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={loadingPermissions || loading}
                className="size-9"
              >
                <RefreshCw
                  className={`size-4 ${loadingPermissions || loading ? 'animate-spin' : ''}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {searchQuery && filteredPermissions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Found {filteredPermissions.length} result{filteredPermissions.length !== 1 ? 's' : ''} for
          &quot;{searchQuery}&quot;
        </p>
      )}

      {loadingPermissions ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : permissions.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <p className="text-sm text-muted-foreground">No users or teams have access yet.</p>
        </Card>
      ) : filteredPermissions.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <p className="text-sm text-muted-foreground">No permissions match your search.</p>
          <p className="text-xs text-muted-foreground mt-1">Try different search terms.</p>
        </Card>
      ) : (
        <ScrollArea className="h-[280px] rounded-lg border">
          <div className="p-2">
            {filteredPermissions.map((permission, index) => (
              <React.Fragment key={permission._key}>
                <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors">
                  <Avatar
                    className="size-9"
                    style={{ backgroundColor: getAvatarColor(permission.entity_name) }}
                  >
                    <AvatarFallback className="text-xs font-semibold">
                      {permission.entity_type === 'TEAM' ? (
                        <Users className="size-4.5" />
                      ) : (
                        getInitials(permission.entity_name)
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {permission.entity_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="h-4.5 px-1.5 text-[0.65rem] font-medium">
                        {permission.entity_type}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="h-4.5 px-1.5 text-[0.65rem] font-medium bg-info/10 text-info border-info/20"
                      >
                        {getRoleDisplayName(permission.role)}
                      </Badge>
                      {permission.entity_email && (
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {permission.entity_email}
                        </p>
                      )}
                    </div>
                  </div>

                  {permission.role !== 'OWNER' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(permission)}
                            disabled={loading}
                            className="size-7 hover:bg-warning/10 hover:text-warning"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Permission</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(permission)}
                            disabled={loading}
                            className="size-7 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove Access</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
                {index < filteredPermissions.length - 1 && <Separator className="my-1 mx-2" />}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
