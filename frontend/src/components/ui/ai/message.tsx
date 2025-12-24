import { cn } from '@/utils/cn';
import React, { type ComponentProps, type HTMLAttributes } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export type AIMessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant';
};

export const AIMessage = ({ className, from, ...props }: AIMessageProps) => (
  <div
    className={cn(
      'group flex w-full items-end justify-end gap-2 py-4',
      from === 'user' ? 'is-user' : 'is-assistant flex-row-reverse justify-end',
      '[&>div]:max-w-[80%]',
      className
    )}
    {...props}
  />
);

export type AIMessageContentProps = HTMLAttributes<HTMLDivElement>;

export const AIMessageContent = ({ children, className, ...props }: AIMessageContentProps) => (
  <div
    className={cn(
      'flex flex-col gap-2 rounded-lg px-4 py-3 text-sm',
      // subtle border for both themes
      'border border-zinc-200 dark:border-zinc-800',
      // assistant default (muted neutral)
      'bg-muted text-foreground',
      // user variant in neutral scale
      'group-[.is-user]:bg-zinc-100 group-[.is-user]:text-zinc-900',
      'dark:group-[.is-user]:bg-zinc-800 dark:group-[.is-user]:text-zinc-100',
      className
    )}
    {...props}
  >
    <div className="is-user:dark">{children}</div>
  </div>
);

export type AIMessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const AIMessageAvatar = ({ src, name, className, ...props }: AIMessageAvatarProps) => (
  <Avatar className={cn('size-8', className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || 'ME'}</AvatarFallback>
  </Avatar>
);
