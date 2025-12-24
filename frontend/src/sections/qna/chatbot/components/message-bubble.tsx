import type { FormattedMessage } from 'src/types/chat-bot';

import React from 'react';
import ChatMessage, {
  type ChatMessageModel,
} from '@/sections/qna/common/ChatMessage';

type MessageBubbleProps = {
  message: FormattedMessage;
  onCopy?: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  showRegenerate?: boolean;
  className?: string;
};

function mapToChatMessageModel(msg: FormattedMessage): ChatMessageModel {
  const role =
    msg.type === 'user' ? 'user' : msg.type === 'bot' ? 'assistant' : 'system';
  return {
    id: msg.id,
    role,
    content: msg.content ?? '',
    isStreaming: msg.id?.startsWith?.('streaming-') ?? false,
    isRegenerating: false,
  };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCopy,
  onRegenerate,
  showRegenerate,
  className,
}) => {
  const model = mapToChatMessageModel(message);
  return (
    <ChatMessage
      message={model}
      onCopy={onCopy}
      onRegenerate={onRegenerate}
      showRegenerate={showRegenerate}
      className={className}
    />
  );
};

export default MessageBubble;


