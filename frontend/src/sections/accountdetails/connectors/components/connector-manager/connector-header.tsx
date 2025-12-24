import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAccountType } from 'src/hooks/use-account-type';
import type { Connector } from '../../types/types';

interface ConnectorHeaderProps {
  connector: Connector;
  loading: boolean;
  isDeleting?: boolean;
  onRefresh: () => void;
  onDelete?: () => Promise<void>;
}

const ConnectorHeader: React.FC<ConnectorHeaderProps> = ({
  connector,
  loading,
  isDeleting = false,
  onRefresh,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { isBusiness, loading: accountTypeLoading } = useAccountType();
  const isActive = connector.isActive || false;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleBack = () => {
    if (accountTypeLoading) return; // Avoid navigation until account type is known
    const basePath = isBusiness
      ? '/account/company-settings/settings/connector'
      : '/account/individual/settings/connector';
    navigate(basePath);
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="p-4 border-b border-border bg-background">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            disabled={accountTypeLoading}
            className="text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </Button>

          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <img
              src={connector.iconPath}
              alt={connector.name}
              width={20}
              height={20}
              className="object-contain"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Connector Management</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Manage your {connector.appGroup} integrations
              {isActive && (
                <Badge
                  variant="secondary"
                  className="h-5 text-[0.6875rem] font-semibold border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
                >
                  Active
                </Badge>
              )}
            </p>
          </div>

          <div className="flex-1" />

          <Button variant="outline" onClick={onRefresh} disabled={loading || isDeleting}>
            <RefreshCw className={loading ? 'size-4 mr-2 animate-spin' : 'size-4 mr-2'} />
            Refresh
          </Button>

          {onDelete && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                  disabled={loading || isDeleting}
                >
                  <Trash2 className={isDeleting ? 'size-4 mr-2 animate-spin' : 'size-4 mr-2'} />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Connector</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the <strong>{connector.name}</strong> connector?
                    This action will permanently remove:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All synced records and files</li>
                      <li>All indexed data and embeddings</li>
                      <li>The connector configuration</li>
                    </ul>
                    <p className="mt-2 font-medium text-destructive">
                      This action cannot be undone.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Connector'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectorHeader;
