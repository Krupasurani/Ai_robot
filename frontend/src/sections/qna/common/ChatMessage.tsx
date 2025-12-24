import { cn } from '@/utils/cn';
import React, { useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Markdown } from '@/components/markdown/markdown';
import { Bot, Copy, User, Wrench, RefreshCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export type ChatMessageModel = {
  id: string;
  role: ChatRole;
  content: string;
  isStreaming?: boolean;
  isRegenerating?: boolean;
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
};

type ChatMessageProps = {
  message: ChatMessageModel;
  onCopy?: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  showRegenerate?: boolean;
  className?: string;
};

function RoleIcon({ role }: { role: ChatRole }) {
  if (role === 'assistant') return <Bot className="h-4 w-4" />;
  if (role === 'tool') return <Wrench className="h-4 w-4" />;
  return <User className="h-4 w-4" />;
}

function MessageActions({
  onCopyClick,
  onRegenerateClick,
  showRegenerate,
}: {
  onCopyClick: () => void;
  onRegenerateClick?: () => void;
  showRegenerate?: boolean;
}) {
  return (
    <div className="absolute -top-3 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCopyClick} aria-label="Copy">
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
        {showRegenerate && onRegenerateClick ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onRegenerateClick}
                aria-label="Regenerate"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate</TooltipContent>
          </Tooltip>
        ) : null}
      </TooltipProvider>
    </div>
  );
}

function ToolCallDetails({
  toolName,
  toolArgs,
  toolResult,
}: {
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
}) {
  if (!toolName && !toolArgs && !toolResult) return null;
  return (
    <Card className="mt-2 border-dashed">
      <CardContent className="p-3 text-xs space-y-2">
        {toolName ? <div className="font-medium">Tool: {toolName}</div> : null}
        {toolArgs ? (
          <pre className="whitespace-pre-wrap break-words bg-muted/40 rounded-md p-2 overflow-x-auto">
{JSON.stringify(toolArgs, null, 2)}
          </pre>
        ) : null}
        {toolResult ? (
          <pre className="whitespace-pre-wrap break-words bg-muted/40 rounded-md p-2 overflow-x-auto">
{JSON.stringify(toolResult, null, 2)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onCopy,
  onRegenerate,
  showRegenerate,
  className,
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const onCopyClick = () => {
    const text = message.content || '';
    if (onCopy) onCopy(text);
    else if (navigator?.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  };

  const onRegenerateClick = () => {
    if (onRegenerate) onRegenerate(message.id);
  };

  const content = useMemo(() => message.content || '', [message.content]);

  return (
    <div
      className={cn(
        'group w-full flex',
        isUser ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      {!isUser ? (
        <div className="mr-3 mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RoleIcon role={message.role} />
        </div>
      ) : null}

      <div
        ref={bubbleRef}
        className={cn(
          'relative max-w-[90%] md:max-w-[75%] xl:max-w-[65%] rounded-2xl shadow-sm p-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card text-card-foreground border border-border rounded-tl-sm',
          'transition-all',
        )}
      >
        <MessageActions
          onCopyClick={onCopyClick}
          onRegenerateClick={isAssistant ? onRegenerateClick : undefined}
          showRegenerate={!!showRegenerate && isAssistant}
        />

        {isAssistant || message.role === 'tool' || message.role === 'system' ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown>{content}</Markdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-base">{content}</div>
        )}

        {message.role === 'tool' ? (
          <ToolCallDetails
            toolName={message.toolName}
            toolArgs={message.toolArgs}
            toolResult={message.toolResult}
          />
        ) : null}
      </div>
    </div>
  );
};

export default ChatMessage;


