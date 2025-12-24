import React, { useState, useRef, useEffect } from 'react';

import type { ContextRef } from './chat-input';

type ContextType = 'kb' | 'project' | 'record' | 'app' | 'user';

const AnimatedPlaceholder = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    let index = 0;
    setDisplayText('');
    intervalRef.current = setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));
      if (index >= text.length && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 45);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text]);

  return (
    <span className="text-left text-lg sm:text-base font-normal tracking-tight transition-all duration-300 text-muted-foreground">
      {displayText}
    </span>
  );
};

interface MentionBubbleOverlayProps {
  message: string;
  selectedContext: ContextRef[];
  placeholderText: string;
  onMessageChange: (message: string) => void;
  onHasTextChange: (hasText: boolean) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export const MentionBubbleOverlay = React.memo<MentionBubbleOverlayProps>(
  ({ message, selectedContext, placeholderText, onMessageChange, onHasTextChange, inputRef }) => {
    type Match = {
      start: number;
      end: number;
      label: string;
      type: ContextType;
      id: string;
      occurrenceIndex: number;
    };

    const content: React.ReactNode[] = [];
    const text = message || '';
    const matches: Match[] = [];
    const byLabel = new Map<string, { type: ContextType; id: string }>();

    selectedContext.forEach((c) => {
      if (!byLabel.has(c.label)) byLabel.set(c.label, { type: c.type, id: c.id });
    });

    byLabel.forEach((meta, label) => {
      const token = `@${label}`;
      let from = 0;
      let occ = 0;
      let idx = text.indexOf(token, from);
      while (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + token.length,
          label,
          type: meta.type,
          id: meta.id,
          occurrenceIndex: occ,
        });
        from = idx + token.length;
        occ += 1;
        if (occ > 2000) break;
        idx = text.indexOf(token, from);
      }
    });

    matches.sort((a, b) => a.start - b.start || b.end - a.end);

    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.start < cursor) return;
      if (m.start > cursor) content.push(text.slice(cursor, m.start));
      const bubbleKey = `${m.type}-${m.id}-${m.label}-${i}`;
      content.push(
        <span
          key={bubbleKey}
          className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-xs font-medium bg-primary/10 text-primary border border-primary/20 align-baseline"
        >
          <span>{m.label}</span>
          <button
            type="button"
            className="mention-remove pointer-events-auto text-primary hover:text-primary/80"
            onMouseDown={(ev) => ev.stopPropagation()}
            onClick={(ev) => {
              ev.preventDefault();
              const token = `@${m.label}`;
              let pos = -1;
              let from = 0;
              let occ = 0;
              let cutStart = -1;
              pos = text.indexOf(token, from);
              while (pos !== -1) {
                if (occ === m.occurrenceIndex) {
                  cutStart = pos;
                  break;
                }
                from = pos + token.length;
                occ += 1;
                pos = text.indexOf(token, from);
              }
              if (cutStart >= 0) {
                const next = `${text.slice(0, cutStart)}${text.slice(cutStart + token.length)}`;
                onMessageChange(next);
                onHasTextChange(!!next.trim());
                requestAnimationFrame(() => inputRef.current?.focus());
              }
            }}
            aria-label={`Remove @${m.label}`}
          >
            ×
          </button>
        </span>
      );
      cursor = m.end;
    });

    if (cursor < text.length) content.push(text.slice(cursor));

    if (text.length === 0) {
      return (
        <div className="flex h-full items-center pl-[2px]">
          <AnimatedPlaceholder text={placeholderText} />
        </div>
      );
    }

    return <>{content}</>;
  }
);

MentionBubbleOverlay.displayName = 'MentionBubbleOverlay';
