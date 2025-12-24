import { cn } from '@/utils/cn';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';

type ChatContainerProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  composer?: React.ReactNode;
  className?: string;
  onScrollTopReached?: () => void;
  onScrollBottomReached?: () => void;
  autoScroll?: boolean;
};

const ChatContainer: React.FC<ChatContainerProps> = ({
  children,
  header,
  composer,
  className,
  onScrollTopReached,
  onScrollBottomReached,
  autoScroll = true,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const tailRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const handleScroll = useCallback(() => {
    if (!viewportRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    const isNearTop = scrollTop < 120;
    setShouldAutoScroll(isNearBottom);
    if (isNearTop && onScrollTopReached) onScrollTopReached();
    if (isNearBottom && onScrollBottomReached) onScrollBottomReached();
  }, [onScrollBottomReached, onScrollTopReached]);

  useEffect(() => {
    if (!autoScroll || !shouldAutoScroll) return;
    if (!tailRef.current) return;
    const el = tailRef.current;
    requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }, [children, autoScroll, shouldAutoScroll]);

  const headerNode = useMemo(() => header, [header]);
  const composerNode = useMemo(() => composer, [composer]);

  return (
    <div className={cn('relative flex h-full w-full flex-col', className)}>
      {headerNode ? <div className="shrink-0">{headerNode}</div> : null}
      <ScrollArea
        ref={viewportRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 w-full p-3"
      >
        <div className="flex w-full flex-1 flex-col gap-2">
          {children}
          <div ref={tailRef} className="h-px w-full" />
        </div>
      </ScrollArea>
      {composerNode ? (
        <div className="sticky bottom-0 left-0 right-0 w-full bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/30 border-t">
          <div className="mx-auto w-full max-w-4xl p-3">{composerNode}</div>
        </div>
      ) : null}
    </div>
  );
};

export default ChatContainer;


