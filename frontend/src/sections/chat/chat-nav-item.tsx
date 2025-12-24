import type { IChatConversation } from 'src/types/chat';

import { useCallback } from 'react';
import { cn } from '@/utils/cn';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { useResponsive } from 'src/hooks/use-responsive';
import { fToNow } from 'src/utils/format-time';
import { clickConversation } from 'src/actions/chat';
import { useAuthContext } from 'src/auth/hooks';
import { Avatar, AvatarImage, AvatarFallback } from 'src/components/ui/avatar';
import { Badge } from 'src/components/ui/badge';
import { getNavItem } from './utils/get-nav-item';

type Props = {
  selected: boolean;
  collapse: boolean;
  onCloseMobile: () => void;
  conversation: IChatConversation;
};

export function ChatNavItem({ selected, collapse, conversation, onCloseMobile }: Props) {
  const { user } = useAuthContext();
  const mdUp = useResponsive('up', 'md');
  const router = useRouter();

  const { group, displayName, displayText, participants, lastActivity, hasOnlineInGroup } =
    getNavItem({ conversation, currentUserId: `${user?.id}` });

  const singleParticipant = participants[0];

  const { name, avatarUrl, status } = singleParticipant;

  const handleClickConversation = useCallback(async () => {
    try {
      if (!mdUp) {
        onCloseMobile();
      }

      await clickConversation(conversation.id);

      router.push(`${paths.dashboard.chat}?id=${conversation.id}`);
    } catch (error) {
      console.error(error);
    }
  }, [conversation.id, mdUp, onCloseMobile, router]);

  const renderGroup = (
    <div className="relative w-12 h-12">
      <div className="flex -space-x-2">
        {participants.slice(0, 2).map((participant) => (
          <Avatar key={participant.id} className="w-12 h-12 border-2 border-background">
            <AvatarImage alt={participant.name} src={participant.avatarUrl} />
            <AvatarFallback>{participant.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      {hasOnlineInGroup && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
      )}
    </div>
  );

  const renderSingle = (
    <div className="relative w-12 h-12">
      <Avatar className="w-12 h-12">
        <AvatarImage alt={name} src={avatarUrl} />
        <AvatarFallback>{name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>
      {status && status !== 'offline' && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 border-2 border-background rounded-full',
            status === 'online' && 'bg-green-500',
            status === 'alway' && 'bg-yellow-500',
            status === 'busy' && 'bg-red-500'
          )}
        />
      )}
    </div>
  );

  return (
    <li className="flex">
      <button
        type="button"
        onClick={handleClickConversation}
        className={cn(
          'w-full py-1.5 px-2.5 gap-2 flex items-center rounded-lg transition-colors',
          'hover:bg-secondary/50',
          selected && 'bg-secondary'
        )}
      >
        <div className="relative">
          {group ? renderGroup : renderSingle}
          {!collapse && conversation.unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1"
            >
              {conversation.unreadCount}
            </Badge>
          )}
        </div>

        {!collapse && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p
                className={cn(
                  'text-xs truncate',
                  conversation.unreadCount
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground'
                )}
              >
                {displayText}
              </p>
            </div>

            <div className="flex flex-col items-end self-stretch">
              <p className="text-xs text-muted-foreground mb-1.5 truncate">
                {fToNow(lastActivity)}
              </p>

              {!!conversation.unreadCount && <div className="w-2 h-2 bg-primary rounded-full" />}
            </div>
          </>
        )}
      </button>
    </li>
  );
}
