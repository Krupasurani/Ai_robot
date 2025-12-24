import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PromptTemplate } from '@/api/prompt-library';

interface DeletePromptDialogProps {
  prompt: PromptTemplate | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function DeletePromptDialog({
  prompt,
  onClose,
  onConfirm,
  isLoading,
}: DeletePromptDialogProps) {
  return (
    <AlertDialog open={Boolean(prompt)} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete prompt?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The prompt{' '}
            <span className="font-semibold text-foreground">{prompt?.title}</span> will be removed
            from your library.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting�' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
