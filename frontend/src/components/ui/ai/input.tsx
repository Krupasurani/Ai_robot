'use client';

import type { ComponentProps, KeyboardEventHandler, MutableRefObject, Ref } from 'react';

import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRef, Children, useEffect, useCallback, forwardRef } from 'react';
import { XIcon, SendIcon, SquareIcon, Loader2Icon } from 'lucide-react';

type UseAutoResizeTextareaProps = {
  minHeight: number;
  maxHeight?: number;
};

const useAutoResizeTextarea = ({ minHeight, maxHeight }: UseAutoResizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
};

export type AIInputTextareaProps = ComponentProps<typeof Textarea> & {
  minHeight?: number;
  maxHeight?: number;
};

export const AIInputTextarea = forwardRef<HTMLTextAreaElement, AIInputTextareaProps>(
  (
    {
      onChange,
      className,
      placeholder = 'What would you like to know?',
      minHeight = 48,
      maxHeight = 164,
      ...props
    },
    ref: Ref<HTMLTextAreaElement>
  ) => {
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
      minHeight,
      maxHeight,
    });

    const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const { form } = e.currentTarget;
        if (form) {
          form.requestSubmit();
        }
      }
    };

    return (
      <Textarea
        className={cn(
          'w-full resize-none rounded-none border-none p-2 shadow-none outline-none ring-0',
          'bg-transparent dark:bg-transparent',
          'focus-visible:ring-0',
          'overflow-y-auto',
          className
        )}
        name="message"
        onChange={(e) => {
          adjustHeight();
          onChange?.(e);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={(node) => {
          // keep internal auto-resize ref in sync
          // eslint-disable-next-line no-param-reassign
          (textareaRef as MutableRefObject<HTMLTextAreaElement | null>).current = node;

          // forward ref to consumers
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }
        }}
        {...props}
      />
    );
  }
);

AIInputTextarea.displayName = 'AIInputTextarea';

// Unified button component for input actions
export type AIInputButtonProps = ComponentProps<typeof Button>;
export const AIInputButton = forwardRef<HTMLButtonElement, AIInputButtonProps>(
  ({ variant = 'ghost', className, size, ...props }, ref) => {
    const newSize = (size ?? Children.count(props.children) > 1) ? 'default' : 'icon';

    return (
      <Button
        ref={ref}
        className={cn(
          'shrink-0 gap-1.5 rounded-lg',
          variant === 'ghost' && 'text-muted-foreground',
          newSize === 'default' && 'px-3',
          className
        )}
        size={newSize}
        type="button"
        variant={variant}
        {...props}
      />
    );
  }
);

AIInputButton.displayName = 'AIInputButton';

// Submit button with status icons
export type AIInputSubmitProps = ComponentProps<typeof Button> & {
  status?: 'submitted' | 'streaming' | 'ready' | 'error';
};

export const AIInputSubmit = ({
  className,
  variant = 'ghost',
  size = 'icon',
  status,
  children,
  ...props
}: AIInputSubmitProps) => {
  let Icon = <SendIcon />;

  if (status === 'submitted') {
    Icon = <Loader2Icon className="animate-spin" />;
  }

  if (status === 'streaming') {
    Icon = <SquareIcon />;
  }

  if (status === 'error') {
    Icon = <XIcon />;
  }

  return (
    <Button
      className={cn('gap-1.5 rounded-3xl', className)}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};
