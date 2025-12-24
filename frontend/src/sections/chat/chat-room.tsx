import { cn } from '@/utils/cn';

import type { IChatParticipant, IChatConversation } from 'src/types/chat';

import { ScrollArea } from 'src/components/ui/scroll-area';
import { Sheet, SheetContent } from 'src/components/ui/sheet';
import { ChatRoomGroup } from './chat-room-group';
import { ChatRoomSkeleton } from './chat-skeleton';
import { ChatRoomSingle } from './chat-room-single';
import { ChatRoomAttachments } from './chat-room-attachments';
import type { UseNavCollapseReturn } from './hooks/use-collapse-nav';

const NAV_WIDTH = 280;

type Props = {
  loading: boolean;
  participants: IChatParticipant[];
  collapseNav: UseNavCollapseReturn;
  messages: IChatConversation['messages'];
};

export function ChatRoom({ collapseNav, participants, messages, loading }: Props) {
  const { collapseDesktop, openMobile, onCloseMobile } = collapseNav;

  const group = participants.length > 1;
  const attachments = messages.map((msg) => msg.attachments).flat(1) || [];

  const renderContent = loading ? (
    <ChatRoomSkeleton />
  ) : (
    <ScrollArea>
      <div>
        {group ? (
          <ChatRoomGroup participants={participants} />
        ) : (
          <ChatRoomSingle participant={participants[0]} />
        )}

        <ChatRoomAttachments attachments={attachments} />
      </div>
    </ScrollArea>
  );

  return (
    <>
      <div
        className={cn(
          'min-h-0 flex-1 flex flex-col border-l border-border transition-all duration-200',
          'hidden lg:flex',
          collapseDesktop && 'w-0 overflow-hidden',
          !collapseDesktop && `w-${NAV_WIDTH}`
        )}
      >
        {!collapseDesktop && renderContent}
      </div>

      <Sheet open={openMobile} onOpenChange={(open) => (!open ? onCloseMobile() : undefined)}>
        <SheetContent side="right" className="w-[320px] p-0">
          {renderContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
