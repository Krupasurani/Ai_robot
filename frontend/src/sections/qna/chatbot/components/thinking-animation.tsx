import React from 'react';
import { cn } from '@/utils/cn';

interface ThinkingAnimationProps {
  text?: string;
  isLoadingConversation?: boolean;
  isRegnerating?: boolean;
}

const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  text = 'Thinking',
  isLoadingConversation,
  isRegnerating,
}) => (
  <div className="flex items-center gap-1">
    <h2 className="text-sm text-muted-foreground font-semibold">{text}</h2>

    <div className="flex items-end h-[18px] ml-0.5">
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full bg-muted-foreground/60 dark:bg-muted-foreground/87',
          'inline-block mx-0.5',
          'animate-wave-bounce'
        )}
      />
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full bg-muted-foreground/60 dark:bg-muted-foreground/87',
          'inline-block mx-0.5',
          'animate-wave-bounce delay-[150ms]'
        )}
      />
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full bg-muted-foreground/60 dark:bg-muted-foreground/87',
          'inline-block mx-0.5',
          'animate-wave-bounce delay-[300ms]'
        )}
      />
    </div>
  </div>
);

export default ThinkingAnimation;
