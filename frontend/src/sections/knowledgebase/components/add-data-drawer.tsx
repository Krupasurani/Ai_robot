import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Plus, Loader2, Database, FileText, Sparkles } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import UploadManager from '../upload-manager';
import { KnowledgeBaseAPI } from '../services/api';
import type { KnowledgeBase } from '../types/kb';

export interface AddDataDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
  kbOptions: KnowledgeBase[];
  onKbListRefresh?: () => void;
}

type DrawerStep = 'kb-select' | 'upload';

interface CreateKBForm {
  name: string;
  description: string;
}

export default function AddDataDrawer({
  open,
  onOpenChange,
  onUploadSuccess,
  kbOptions,
  onKbListRefresh,
}: AddDataDrawerProps) {
  const { isAdmin } = useAdmin();
  const [step, setStep] = useState<DrawerStep>('kb-select');
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateKBForm>({ name: '', description: '' });
  const [creatingKb, setCreatingKb] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Filter KBs based on admin status
  const visibleKbOptions = useMemo(() => {
    if (isAdmin) {
      // Admins see all KBs
      return kbOptions;
    }
    // Normal users see only KBs where they have permissions
    return kbOptions.filter(
      (kb) =>
        kb.userRole &&
        ['OWNER', 'WRITER', 'READER', 'EDITOR', 'COMMENTER', 'ORGANIZER'].includes(
          kb.userRole.toUpperCase()
        )
    );
  }, [kbOptions, isAdmin]);

  // Auto-select first or default KB on open
  useEffect(() => {
    if (open && !selectedKbId) {
      if (visibleKbOptions.length === 0) {
        setShowCreateForm(true);
      } else {
        const defaultKb = visibleKbOptions.find((kb) => kb.name?.toLowerCase?.() === 'default');
        setSelectedKbId(defaultKb?.id || visibleKbOptions[0]?.id || null);
      }
    }
  }, [open, visibleKbOptions, selectedKbId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('kb-select');
      setSelectedKbId(null);
      setShowCreateForm(false);
      setCreateForm({ name: '', description: '' });
      setCreateError(null);
      setCreatingKb(false);
    }
  }, [open]);

  const handleCreateKb = useCallback(async () => {
    if (!createForm.name.trim()) {
      setCreateError('Knowledge Base name is required');
      return;
    }

    setCreatingKb(true);
    setCreateError(null);

    try {
      const newKb = await KnowledgeBaseAPI.createKnowledgeBase(createForm.name);
      setSelectedKbId(newKb.id);
      setShowCreateForm(false);
      setCreateForm({ name: '', description: '' });
      if (onKbListRefresh) onKbListRefresh();
      setStep('upload');
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create knowledge base');
    } finally {
      setCreatingKb(false);
    }
  }, [createForm.name, onKbListRefresh]);

  const handleUploadSuccess = useCallback(async () => {
    onOpenChange(false);
    if (onUploadSuccess) await onUploadSuccess();
  }, [onOpenChange, onUploadSuccess]);

  const getSelectedKbLabel = () => {
    if (!selectedKbId) return 'Select a Knowledge Base';
    const kb = kbOptions.find((k) => k.id === selectedKbId);
    if (!kb) return selectedKbId;

    const isDefault = kb.name?.toLowerCase?.() === 'default';
    return `${kb.name}${isDefault ? ' (System)' : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        {step === 'kb-select' ? (
          <>
            <DialogHeader className="p-6 border-b border-border">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight mb-2">
                    Add Data to Knowledge Base
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                    Choose an existing knowledge base or create a new one, then upload your
                    documents to get started.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
              {/* KB Selection */}
              {!showCreateForm && visibleKbOptions.length > 0 && (
                <div className="space-y-3">
                  <Label htmlFor="kb-select" className="text-sm font-medium text-foreground">
                    Select Knowledge Base
                  </Label>
                  <Select value={selectedKbId || ''} onValueChange={setSelectedKbId}>
                    <SelectTrigger id="kb-select" className="h-11 w-full">
                      <SelectValue placeholder="Choose a Knowledge Base" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleKbOptions.map((kb) => {
                        const isDefault = kb.name?.toLowerCase?.() === 'default';
                        return (
                          <SelectItem key={kb.id} value={kb.id} className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Database className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium">{kb.name}</span>
                              {isDefault && (
                                <Badge variant="outline" className="ml-1 text-xs font-normal">
                                  System
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Create KB Form */}
              {showCreateForm && (
                <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            Create New Knowledge Base
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Set up a new knowledge base for your documents
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowCreateForm(false);
                          setCreateError(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-6">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="kb-name"
                        className="text-sm font-medium text-foreground gap-0"
                      >
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="kb-name"
                        aria-label="Knowledge base name"
                        placeholder="e.g., Marketing KB, Product Docs, Support Articles"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        className="h-11"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Choose a descriptive name for your knowledge base
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="kb-description"
                        className="text-sm font-medium text-foreground gap-0"
                      >
                        Description
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="kb-description"
                        aria-label="Knowledge base description"
                        placeholder="What is this knowledge base for?"
                        value={createForm.description}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, description: e.target.value })
                        }
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Add a brief description to help others understand its purpose
                      </p>
                    </div>

                    {createError && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription className="text-sm">{createError}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!showCreateForm && visibleKbOptions.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Database className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    No knowledge bases available
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Get started by creating your first knowledge base. You can organize your
                    documents and make them searchable.
                  </p>
                  <Button type="button" onClick={() => setShowCreateForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Knowledge Base
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="p-6 border-t border-border bg-muted/30 gap-3">
              {!showCreateForm && visibleKbOptions.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(true)}
                  className="gap-2 sm:mr-auto"
                >
                  <Plus className="w-4 h-4" />
                  New Knowledge Base
                </Button>
              )}
              {showCreateForm && (
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateError(null);
                    }}
                    className="flex-1 sm:flex-initial"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateKb}
                    disabled={creatingKb || !createForm.name.trim()}
                    className="flex-1 sm:flex-initial gap-2"
                  >
                    {creatingKb && <Loader2 className="w-4 h-4 animate-spin" />}
                    {creatingKb ? 'Creating...' : 'Create Knowledge Base'}
                  </Button>
                </div>
              )}
              {selectedKbId && !showCreateForm && (
                <Button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="gap-2 min-w-[120px]"
                >
                  Continue
                  <FileText className="w-4 h-4" />
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="px-8 pt-8 pb-6 border-b border-border">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight mb-2">
                    Upload Data
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                    Saving to:{' '}
                    <Badge variant="outline" className="font-normal gap-1.5">
                      <Database className="w-3 h-3" />
                      {getSelectedKbLabel()}
                    </Badge>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-8 py-6">
              {selectedKbId && (
                <UploadManager
                  open
                  onClose={() => {
                    setStep('kb-select');
                  }}
                  knowledgeBaseId={selectedKbId}
                  folderId={undefined}
                  onUploadSuccess={handleUploadSuccess}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
