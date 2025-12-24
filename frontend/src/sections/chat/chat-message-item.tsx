import type { IChatMessage, IChatParticipant } from 'src/types/chat';

import replyIcon from '@iconify-icons/solar/reply-bold';
import smilingFaceIcon from '@iconify-icons/eva/smiling-face-fill';
import trashBinIcon from '@iconify-icons/solar/trash-bin-trash-bold';
import { fToNow } from 'src/utils/format-time';

import { Avatar, AvatarImage, AvatarFallback } from 'src/components/ui/avatar';
import { Button } from 'src/components/ui/button';
import { Iconify } from 'src/components/iconify';
import { useAuthContext } from 'src/auth/hooks';
import { getMessage } from './utils/get-message';
import { cn } from '@/utils/cn';

type Props = {
  message: IChatMessage;
  participants: IChatParticipant[];
  onOpenLightbox: (value: string) => void;
};

export function ChatMessageItem({ message, participants, onOpenLightbox }: Props) {
  const { user } = useAuthContext();

  const { me, senderDetails, hasImage } = getMessage({
    message,
    participants,
    currentUserId: `${user?.id}`,
  });

  const { firstName, avatarUrl } = senderDetails;

  const { body, createdAt } = message;

  if (!message.body) {
    return null;
  }

  return (
    <div className={`flex flex-row ${me ? 'justify-end' : ''} mb-5`}>
      {!me && (
        <Avatar className="w-8 h-8 mr-2">
          <AvatarImage alt={firstName} src={avatarUrl} />
          <AvatarFallback>{firstName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col', me ? 'items-end' : 'items-start')}>
        <p className={cn('text-xs text-muted-foreground mb-1 truncate', !me ? 'mr-auto' : '')}>
          {!me && `${firstName}, `}
          {fToNow(createdAt)}
        </p>

        <div className="relative flex flex-row items-center group hover:[&_.message-actions]:opacity-100">
          <div
            className={cn(
              `p-1.5 min-w-[48px] max-w-[320px] rounded-md text-sm`,
              hasImage
                ? 'p-0 bg-transparent'
                : me
                  ? 'text-gray-800 bg-primary/20 dark:bg-primary/30'
                  : 'bg-muted'
            )}
          >
            {hasImage ? (
              <img
                alt="attachment"
                src={body}
                onClick={() => onOpenLightbox(body)}
                className="w-[400px] h-auto rounded-xl cursor-pointer object-cover aspect-[16/11] hover:opacity-90"
              />
            ) : (
              body
            )}
          </div>
          <div
            className={cn(
              'message-actions flex flex-row pt-0.5 left-0 opacity-0 top-full absolute transition-opacity duration-200',
              me ? 'right-0 left-auto' : ''
            )}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Iconify icon={replyIcon} width={16} />
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Iconify icon={smilingFaceIcon} width={16} />
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Iconify icon={trashBinIcon} width={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
