import { toast } from 'sonner';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ShowToastArgs = {
  initialText: string;
  onSave: (text: string) => Promise<void>;
  onCancel?: () => void;
  durationMs?: number;
};

type MemorySuggestionCardProps = {
  toastId: any;
  initialText: string;
  onSave: (text: string) => Promise<void>;
  onCancel?: () => void;
};

const MemorySuggestionCard: React.FC<MemorySuggestionCardProps> = ({ toastId, initialText, onSave, onCancel }) => {
  const [text, setText] = useState<string>(initialText);
  const [saving, setSaving] = useState(false);

  const dismiss = () => {
    try {
      (toast as any).dismiss?.(toastId);
    } catch (err) {
      // swallow error from toast dismiss; log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('toast dismiss failed', err);
      }
    }
  };

  return (
    <div
      className="pointer-events-auto flex flex-col gap-2 p-4 rounded-lg bg-white text-black dark:bg-zinc-900 dark:text-white
                 border border-black/10 dark:border-white/10 shadow-xl w-full sm:w-[560px] max-w-[96vw]
                 max-h-[70vh] overflow-auto"
      role="dialog"
      aria-label="Projekt-Memory vorschlagen"
    >
      <div className="text-sm font-medium">Projekt-Memory vorschlagen</div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="text-sm resize-y min-h-[70px] max-h-[40vh]"
        rows={4}
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            try { onCancel?.(); } finally { dismiss(); }
          }}
        >
          Abbrechen
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving || !text.trim()}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(text.trim());
              toast.success('Projekt-Memory gespeichert');
              dismiss();
            } catch (e: any) {
              toast.error(e?.message || 'Konnte Memory nicht speichern');
            } finally {
              setSaving(false);
            }
          }}
        >
          Speichern
        </Button>
      </div>
    </div>
  );
};

export function showMemorySuggestionToast({ initialText, onSave, onCancel, durationMs = 15000 }: ShowToastArgs) {
  return toast.custom(
    (t: any) => (
      <MemorySuggestionCard toastId={t} initialText={initialText} onSave={onSave} onCancel={onCancel} />
    ),
    {
      duration: durationMs,
      // Position oben rechts, Card ist viewport-begrenzt
      position: 'top-right' as any,
    }
  );
}


