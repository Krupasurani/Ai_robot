import type { IChatMessage, IChatParticipant } from 'src/types/chat';
import { ScrollArea } from 'src/components/ui/scroll-area';
import { Progress } from 'src/components/ui/progress';
import { Lightbox, useLightBox } from 'src/components/lightbox';

import { ChatMessageItem } from './chat-message-item';
import { useMessagesScroll } from './hooks/use-messages-scroll';

type Props = {
  loading: boolean;
  messages: IChatMessage[];
  participants: IChatParticipant[];
};

export function ChatMessageList({ messages = [], participants, loading }: Props) {
  const { messagesEndRef } = useMessagesScroll(messages);

  const slides = messages
    .filter((message) => message.contentType === 'image')
    .map((message) => ({ src: message.body }));

  const lightbox = useLightBox(slides);

  if (loading) {
    return (
      <div className="flex-1 relative">
        <Progress className="absolute top-0 left-0 w-full h-0.5 rounded-none" />
      </div>
    );
  }

  return (
    <>
      <ScrollArea ref={messagesEndRef} className="px-3 pt-5 pb-3 flex-1">
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            participants={participants}
            onOpenLightbox={() => lightbox.onOpen(message.body)}
          />
        ))}
      </ScrollArea>

      <Lightbox
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />
    </>
  );
}
