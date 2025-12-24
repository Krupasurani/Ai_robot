import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { Connector } from '../types/types';

interface ConnectorDeleteButtonProps {
    connector: Connector;
    isDeleting: boolean;
    onDelete: () => Promise<void>;
    disabled?: boolean;
}

export const ConnectorDeleteButton: React.FC<ConnectorDeleteButtonProps> = ({
    connector,
    isDeleting,
    onDelete,
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        await onDelete();
        setOpen(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"
                    disabled={disabled || isDeleting}
                >
                    <Trash2 className={isDeleting ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                    {isDeleting ? 'Deleting...' : 'Delete Connector'}
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
    );
};


