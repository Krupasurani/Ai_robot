import React from 'react';
import { Badge } from '@/components/ui/badge';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ContextRef } from './chat-input';
import { useTranslate } from '@/locales/use-locales';

interface ContextChipsProps {
  selectedContext: ContextRef[];
  onRemove: (index: number) => void;
}

export const ContextChips = React.memo<ContextChipsProps>(({ selectedContext, onRemove }) => {
  const { t } = useTranslate('navbar');

  if (selectedContext.length === 0) return null;

  return (
    <div className="mb-2">
      <span className="block text-xs text-muted-foreground mb-1">{t('chatInput.context')}</span>
      <div className="flex flex-wrap gap-1">
        <AnimatePresence>
          {selectedContext.map((ref, idx) => (
            <m.div
              key={`${ref.type}-${ref.id}-${idx}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Badge
                variant="secondary"
                className="h-6 px-2 text-xs font-medium cursor-pointer bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
              >
                <span className="mr-1">{`${ref.type.toUpperCase()}: ${ref.label}`}</span>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="ml-1 hover:opacity-70"
                  aria-label="Remove context"
                >
                  <X size={14} />
                </button>
              </Badge>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

ContextChips.displayName = 'ContextChips';
