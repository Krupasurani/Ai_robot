import React, { useState, useEffect } from 'react';
import { Brain, Folder } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditKnowledgeBaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, icon?: string) => Promise<void>;
  currentName: string;
  currentIcon?: string;
  loading?: boolean;
}

interface EditFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  currentName: string;
  loading?: boolean;
}

export const EditKnowledgeBaseDialog: React.FC<EditKnowledgeBaseDialogProps> = ({
  open,
  onClose,
  onSubmit,
  currentName,
  currentIcon,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📚');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(currentName);
      setIcon(currentIcon || '📚');
      setError('');
    }
  }, [open, currentName, currentIcon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Knowledge base name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Knowledge base name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Knowledge base name must be less than 100 characters');
      return;
    }

    if (trimmedName === currentName && icon === currentIcon) {
      onClose();
      return;
    }

    try {
      await onSubmit(trimmedName, icon);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update knowledge base');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 text-primary">
              <Brain className="size-4" />
            </div>
            <span>Edit Knowledge Base</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Update the name and icon of your knowledge base. This will be visible to all users with access.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-kb-icon" className="text-sm font-medium">
                  Icon
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-12 rounded-lg bg-muted border-2 border-border text-2xl">
                    {icon}
                  </div>
                  <Input
                    id="edit-kb-icon"
                    placeholder="Enter emoji..."
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    disabled={loading}
                    maxLength={10}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose an emoji to represent this knowledge base
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-kb-name" className="text-sm font-medium">
                  Knowledge Base Name
                </Label>
                <Input
                  id="edit-kb-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'edit-kb-error' : 'edit-kb-help'}
                />
                {error ? (
                  <p id="edit-kb-error" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : (
                  <p id="edit-kb-help" className="text-sm text-muted-foreground">
                    Enter a descriptive name for your knowledge base
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || (name.trim() === currentName && icon === currentIcon)}>
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const EditFolderDialog: React.FC<EditFolderDialogProps> = ({
  open,
  onClose,
  onSubmit,
  currentName,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError('');
    }
  }, [open, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Folder name is required');
      return;
    }

    if (trimmedName.length < 1) {
      setError('Folder name must be at least 1 character');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Folder name must be less than 100 characters');
      return;
    }

    if (trimmedName === currentName) {
      onClose();
      return;
    }

    try {
      await onSubmit(trimmedName);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update folder');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 text-primary">
              <Folder className="size-4.5" />
            </div>
            <span>Edit Folder</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Update the name of your folder. This will be visible to all users with access.
            </p>

            <div className="space-y-2">
              <Label htmlFor="edit-folder-name" className="text-sm font-medium">
                Folder Name
              </Label>
              <Input
                id="edit-folder-name"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                aria-invalid={!!error}
                aria-describedby={error ? 'edit-folder-error' : 'edit-folder-help'}
              />
              {error ? (
                <p id="edit-folder-error" className="text-sm text-destructive">
                  {error}
                </p>
              ) : (
                <p id="edit-folder-help" className="text-sm text-muted-foreground">
                  Enter a descriptive name for your folder
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || name.trim() === currentName}>
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
