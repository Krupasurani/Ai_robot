import React from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Database } from 'lucide-react';

import { getKBIcon } from '../utils/kb-icon';

import type { KnowledgeBase } from '../types/kb';

interface KBGridProps {
  knowledgeBases: KnowledgeBase[];
  onOpen: (kb: KnowledgeBase) => void;
  onEdit: (kb: KnowledgeBase) => void;
  onDelete: (kb: KnowledgeBase) => void;
  onShowDetails?: (kb: KnowledgeBase) => void;
  loading: boolean;
}

export default function KBGrid({
  knowledgeBases,
  onOpen,
  onEdit,
  onDelete,
  onShowDetails,
  loading,
}: KBGridProps) {
  if (loading && knowledgeBases.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (knowledgeBases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Knowledge Bases</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Create your first knowledge base to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {knowledgeBases.map((kb, index) => {
        const kbIcon = getKBIcon(kb.name);
        const updatedDate = new Date(kb.updatedAtTimestamp);
        return (
          <div
            key={kb.id}
            className="group rounded-lg border border-border bg-card hover:border-border transition-colors overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onOpen(kb)}
              className="w-full text-left p-4"
              aria-label={`Open knowledge base ${kb.name}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {kb.icon ? (
                    <span className="text-lg">{kb.icon}</span>
                  ) : (
                    <Icon icon={kbIcon} fontSize={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm truncate mb-1">{kb.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {updatedDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 px-4 pb-4 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onShowDetails?.(kb)}
                aria-label={`Details for ${kb.name}`}
              >
                Details
              </Button>
              {kb.userRole !== 'READER' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => onEdit(kb)}
                    aria-label={`Edit ${kb.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive"
                    onClick={() => onDelete(kb)}
                    aria-label={`Delete ${kb.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
