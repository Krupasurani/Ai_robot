import React from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { X } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import type { AgentBuilderNotificationPanelProps } from '../../types/agent';

const AgentBuilderNotificationPanel: React.FC<AgentBuilderNotificationPanelProps> = ({
  error,
  success,
  onErrorClose,
  onSuccessClose,
}) => (
  <>
    {/* Error Notification */}
    <AnimatePresence>
      {error && (
        <m.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-[2000] max-w-md"
        >
          <Alert variant="destructive" className="rounded-lg shadow-lg">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span className="flex-1">{error}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={onErrorClose}
                className="h-6 w-6 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </m.div>
      )}
    </AnimatePresence>

    {/* Success Notification */}
    <AnimatePresence>
      {success && (
        <m.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-[2000] max-w-md"
        >
          <Alert className="rounded-lg shadow-lg border-green-500/20 bg-green-500/10">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span className="flex-1 text-green-600 dark:text-green-400">{success}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={onSuccessClose}
                className="h-6 w-6 shrink-0 hover:bg-green-500/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </m.div>
      )}
    </AnimatePresence>
  </>
);

export default AgentBuilderNotificationPanel;
