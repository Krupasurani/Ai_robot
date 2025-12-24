import * as React from 'react';
import { cn } from '@/utils/cn';
import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type ReasoningProps = React.ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
};

export const Reasoning = ({
  className,
  isStreaming = false,
  open: openProp,
  onOpenChange,
  children,
  ...rest
}: ReasoningProps) => {
  const [open, setOpen] = React.useState<boolean>(Boolean(isStreaming));

  React.useEffect(() => {
    // Auto-open when streaming starts, and close when it ends (if user didn't pin open)
    setOpen(Boolean(isStreaming));
  }, [isStreaming]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Collapsible
      open={openProp ?? open}
      onOpenChange={handleOpenChange}
      className={cn('w-full', className)}
      {...rest}
    >
      {children}
    </Collapsible>
  );
};

type ReasoningTriggerProps = React.ComponentProps<typeof CollapsibleTrigger> & {
  title?: string;
};

export const ReasoningTrigger = ({ title = 'Reasoning', className, ...rest }: ReasoningTriggerProps) => (
  <CollapsibleTrigger asChild {...rest}>
    <Button variant="outline" size="sm" className={cn('gap-1', className)}>
      <Brain className="h-3.5 w-3.5" /> {title}
    </Button>
  </CollapsibleTrigger>
);

export const ReasoningContent = ({ className, children, ...rest }: React.ComponentProps<typeof CollapsibleContent>) => (
  <CollapsibleContent
    className={cn(
      'mt-2 rounded-md border px-3 py-2 text-sm text-muted-foreground dark:text-zinc-300 bg-muted/40 dark:bg-muted/20',
      className,
    )}
    {...rest}
  >
    <div className="whitespace-pre-wrap leading-relaxed">{children}</div>
  </CollapsibleContent>
);


