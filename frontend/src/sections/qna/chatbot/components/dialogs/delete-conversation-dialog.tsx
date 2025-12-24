import { AlertTriangleIcon } from 'lucide-react';
import LoadingState from '@/components/ui/loader';
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

interface DeleteConversationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const DeleteConversationDialog = ({
  open,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConversationDialogProps) => (
  <AlertDialog open={open} onOpenChange={!isDeleting ? onClose : undefined}>
    <AlertDialogContent className="backdrop-blur-3xl dark:bg-red-200/5 bg-[#f5f5f5] shadow-md dark:border-red-100/20 ">
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-red-500 dark:text-white">
          <AlertTriangleIcon className="w-4 h-4" />
          Are you absolutely sure?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-black/85 dark:text-white/85">
          <p>
            This action cannot be undone. This will permanently delete your conversation and remove
            your data from our servers.
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="cursor-pointer text-black dark:text-white">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="dark:bg-white/80 dark:text-black bg-red-500/80 text-white hover:bg-red-500/90 hover:text-white cursor-pointer"
          disabled={isDeleting}
        >
          <LoadingState loading={isDeleting}>Delete</LoadingState>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeleteConversationDialog;
