import React, { useState } from 'react';
import { TrashIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import LoadingState from '@/components/ui/loader';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

import axios from 'src/utils/axios';

interface DeleteRecordDialogProps {
  open: boolean;
  onClose: () => void;
  recordId: string;
  recordName: string;
  onRecordDeleted: () => void;
}

const DeleteRecordDialog = ({
  open,
  onClose,
  recordId,
  recordName,
  onRecordDeleted,
}: DeleteRecordDialogProps) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState<string>('');

  const handleConfirmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmText(event.target.value);
  };

  const isDeleteDisabled = confirmText !== recordName;

  const handleDelete = async () => {
    if (isDeleteDisabled) return;

    setIsDeleting(true);
    setError(null);

    try {
      await axios.delete(`/api/v1/knowledgeBase/record/${recordId}`);
      onRecordDeleted();
      onClose();
    } catch (err) {
      console.error('Error deleting record:', err);
      setError(err.response?.data?.message || 'Failed to delete the record. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      setConfirmText('');
      onClose();
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(opens) => {
        if (!opens) handleClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader className="p-3 flex flex-row gap-2">
          <TrashIcon className="w-5 h-5 text-destructive" />
          <h6 className="font-medium text-foreground">Delete Record</h6>
        </AlertDialogHeader>
        <Separator />
        <AlertDialogDescription className="p-3 w-full">
          <p className="text-[15px] mb-1 text-foreground">
            Are you sure you want to delete <strong>{recordName}</strong>? This action cannot be
            undone.
          </p>
          <span className="text-muted-foreground mt-1">
            All data associated with this record will be permanently removed from the system. This
            includes any documents, files, metadata, and relationships.
          </span>
          <div className="mt-3">
            <p className="font-medium mb-1 pt-2">
              Type <strong className="text-destructive">{recordName}</strong> to confirm deletion:
            </p>
            <Input
              value={confirmText}
              onChange={handleConfirmChange}
              placeholder={`Type "${recordName}" to confirm`}
              className="mt-4 p-3 h-12"
              // error={confirmText !== '' && confirmText !== recordName}
              disabled={isDeleting}
            />
          </div>
          {error && (
            <Alert variant="destructive" className="mt-2 w-full">
              {error}
            </Alert>
          )}
        </AlertDialogDescription>
        <AlertDialogFooter className="p-3">
          <AlertDialogCancel asChild disabled={isDeleting}>
            <Button variant="outline" className="text-foreground">
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button
            variant="secondary"
            onClick={handleDelete}
            disabled={isDeleteDisabled || isDeleting}
            className="rounded-sm font-medium not-italic border bg-destructive hover:bg-destructive/80 text-destructive-foreground"
          >
            <LoadingState loading={isDeleting}>Delete Record</LoadingState>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteRecordDialog;
