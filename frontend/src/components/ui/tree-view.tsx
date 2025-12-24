import * as React from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Collapsible, CollapsibleContent } from './collapsible';
import { Button } from './button';

export interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: Record<string, any>;
}

interface TreeViewProps {
  nodes: TreeNode[];
  onNodeSelect?: (node: TreeNode) => void;
  selectedNodeId?: string;
  expandedNodeIds?: string[];
  defaultExpandedNodeIds?: string[];
  className?: string;
  level?: number;
}

export function TreeView({
  nodes,
  onNodeSelect,
  selectedNodeId,
  expandedNodeIds,
  defaultExpandedNodeIds = [],
  className,
  level = 0,
}: TreeViewProps) {
  const [internalExpanded, setInternalExpanded] = React.useState<Set<string>>(
    new Set(defaultExpandedNodeIds)
  );

  const isExpanded = (nodeId: string) => {
    if (expandedNodeIds) {
      return expandedNodeIds.includes(nodeId);
    }
    return internalExpanded.has(nodeId);
  };

  const toggleExpand = (nodeId: string) => {
    if (expandedNodeIds) {
      // Controlled mode - don't update internal state
      return;
    }
    setInternalExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const hasChildren = (node: TreeNode) => node.children && node.children.length > 0;

  return (
    <div className={cn('flex flex-col', className)}>
      {nodes.map((node) => {
        const expanded = isExpanded(node.id);
        const selected = selectedNodeId === node.id;
        const hasChildrenNodes = hasChildren(node);

        return (
          <div key={node.id} className="flex flex-col">
            <div className="flex items-center gap-1.5">
              {/* Expand/Collapse Button */}
              {hasChildrenNodes ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={() => toggleExpand(node.id)}
                >
                  {expanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </Button>
              ) : (
                <div className="w-6 shrink-0" />
              )}

              {/* Node Content */}
              <button
                type="button"
                onClick={() => onNodeSelect?.(node)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors flex-1 text-left',
                  'hover:bg-secondary hover:text-secondary-foreground',
                  selected && 'bg-primary text-primary-foreground font-medium',
                  !selected && 'text-foreground'
                )}
                style={{ paddingLeft: `${level * 1.5}rem` }}
              >
                {node.icon ||
                  (hasChildrenNodes ? (
                    expanded ? (
                      <FolderOpen className="size-4 shrink-0" />
                    ) : (
                      <Folder className="size-4 shrink-0" />
                    )
                  ) : (
                    <File className="size-4 shrink-0" />
                  ))}
                <span className="truncate">{node.label}</span>
              </button>

              {/* Children */}
              {hasChildrenNodes && (
                <Collapsible open={expanded} onOpenChange={() => toggleExpand(node.id)}>
                  <CollapsibleContent className="ml-6">
                    <TreeView
                      nodes={node.children || []}
                      onNodeSelect={onNodeSelect}
                      selectedNodeId={selectedNodeId}
                      expandedNodeIds={expandedNodeIds}
                      level={level + 1}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
