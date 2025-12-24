import React from 'react';
import { X, AlertTriangle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import NodeConfigDialog from './node-config-dialog';

import type { AgentBuilderDialogManagerProps } from '../../types/agent';

const AgentBuilderDialogManager: React.FC<AgentBuilderDialogManagerProps> = ({
  selectedNode,
  configDialogOpen,
  onConfigDialogClose,
  onNodeConfig,
  onDeleteNode,
  deleteDialogOpen,
  onDeleteDialogClose,
  nodeToDelete,
  onConfirmDelete,
  edgeDeleteDialogOpen,
  onEdgeDeleteDialogClose,
  edgeToDelete,
  onConfirmEdgeDelete,
  deleting,
  nodes,
}) => {
  // Delete Node Confirmation Dialog
  const DeleteConfirmDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    nodeId: string | null;
  }> = ({ open, onClose, onConfirm, nodeId }) => {
    const node = nodes.find((n) => n.id === nodeId);

    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md p-0">
          <DialogTitle className="flex items-center justify-between p-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-medium text-base m-0">Delete Node</h3>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              disabled={deleting}
              className="h-8 w-8"
              aria-label="close"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>

          <div className="px-6 pt-6 pb-0">
            <div className="mb-6">
              <p className="text-sm leading-relaxed text-foreground">
                Are you sure you want to delete the{' '}
                <strong className="font-semibold">{node?.data.label || 'selected'}</strong> node?
                This will also remove all connections to and from this node.
              </p>

              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  ⚠️ This action cannot be undone
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border bg-muted/50">
            <Button variant="outline" onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Edge Delete Confirmation Dialog
  const EdgeDeleteConfirmDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    edge: any;
  }> = ({ open, onClose, onConfirm, edge }) => {
    const sourceNode = nodes.find((n) => n.id === edge?.source);
    const targetNode = nodes.find((n) => n.id === edge?.target);

    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md p-0">
          <DialogTitle className="flex items-center justify-between p-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-warning/10 text-warning">
                <Link2 className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-medium text-base m-0">Delete Connection</h3>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              disabled={deleting}
              className="h-8 w-8"
              aria-label="close"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>

          <div className="px-6 pt-6 pb-0">
            <div className="mb-6">
              <p className="text-sm leading-relaxed text-foreground">
                Are you sure you want to delete the connection between{' '}
                <strong className="font-semibold">{sourceNode?.data.label || edge?.source}</strong>{' '}
                and{' '}
                <strong className="font-semibold">{targetNode?.data.label || edge?.target}</strong>?
              </p>

              <Alert className="mt-4 border-warning/20 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="font-medium text-warning">
                  💡 This will break the data flow between these components
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border bg-muted/50">
            <Button variant="outline" onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={onConfirm}
              disabled={deleting}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              {deleting ? 'Deleting...' : 'Delete Connection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      {/* Node Configuration Modal */}
      <NodeConfigDialog
        node={selectedNode}
        open={configDialogOpen}
        onClose={onConfigDialogClose}
        onSave={onNodeConfig}
        onDelete={onDeleteNode}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={onDeleteDialogClose}
        onConfirm={onConfirmDelete}
        nodeId={nodeToDelete}
      />

      {/* Edge Delete Confirmation Dialog */}
      <EdgeDeleteConfirmDialog
        open={edgeDeleteDialogOpen}
        onClose={onEdgeDeleteDialogClose}
        onConfirm={onConfirmEdgeDelete}
        edge={edgeToDelete}
      />
    </>
  );
};

export default AgentBuilderDialogManager;
