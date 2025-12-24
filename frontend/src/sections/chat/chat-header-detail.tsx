import type { IChatParticipant } from 'src/types/chat';

import { useCallback, useState } from 'react';
import {
  Phone,
  Video,
  MoreVertical,
  BellOff,
  Ban,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';

import { Avatar, AvatarImage, AvatarFallback } from 'src/components/ui/avatar';
import { Button } from 'src/components/ui/button';
import { Separator } from 'src/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from 'src/components/ui/popover';
import { useResponsive } from 'src/hooks/use-responsive';
import { fToNow } from 'src/utils/format-time';

import { ChatHeaderSkeleton } from './chat-skeleton';
import type { UseNavCollapseReturn } from './hooks/use-collapse-nav';

type Props = {
  loading: boolean;
  participants: IChatParticipant[];
  collapseNav: UseNavCollapseReturn;
};

export function ChatHeaderDetail({ collapseNav, participants, loading }: Props) {
  const [open, setOpen] = useState(false);

  const lgUp = useResponsive('up', 'lg');

  const group = participants.length > 1;

  const singleParticipant = participants[0];

  const { collapseDesktop, onCollapseDesktop, onOpenMobile } = collapseNav;

  const handleToggleNav = useCallback(() => {
    if (lgUp) {
      onCollapseDesktop();
    } else {
      onOpenMobile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lgUp]);

  const renderGroup = (
    <div className="flex -space-x-2">
      {participants.slice(0, 3).map((participant) => (
        <Avatar key={participant.id} className="w-8 h-8 border-2 border-background">
          <AvatarImage src={participant.avatarUrl} alt={participant.name} />
          <AvatarFallback>{participant.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
      ))}
      {participants.length > 3 && (
        <Avatar className="w-8 h-8 border-2 border-background">
          <AvatarFallback className="text-xs">+{participants.length - 3}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );

  const renderSingle = (
    <div className="flex flex-row items-center gap-2">
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={singleParticipant?.avatarUrl} alt={singleParticipant?.name} />
          <AvatarFallback>{singleParticipant?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 border-2 border-background rounded-full',
            singleParticipant?.status === 'online' && 'bg-green-500',
            singleParticipant?.status === 'alway' && 'bg-yellow-500',
            singleParticipant?.status === 'busy' && 'bg-red-500',
            singleParticipant?.status === 'offline' && 'bg-gray-400'
          )}
        />
      </div>

      <div className="flex flex-col">
        <p className="text-sm font-semibold">{singleParticipant?.name}</p>
        <p className="text-xs text-muted-foreground">
          {singleParticipant?.status === 'offline'
            ? fToNow(singleParticipant?.lastActivity)
            : singleParticipant?.status &&
              singleParticipant.status.charAt(0).toUpperCase() + singleParticipant.status.slice(1)}
        </p>
      </div>
    </div>
  );

  if (loading) {
    return <ChatHeaderSkeleton />;
  }

  return (
    <>
      {group ? renderGroup : renderSingle}

      <div className="flex flex-row flex-grow justify-end gap-1">
        <Button variant="ghost" size="icon">
          <Phone className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon">
          <Video className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={handleToggleNav}>
          {collapseDesktop ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <div className="py-1">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-secondary rounded-md transition-colors"
                onClick={() => setOpen(false)}
              >
                <BellOff className="h-4 w-4" />
                Hide notifications
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-secondary rounded-md transition-colors"
                onClick={() => setOpen(false)}
              >
                <Ban className="h-4 w-4" />
                Block
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-secondary rounded-md transition-colors"
                onClick={() => setOpen(false)}
              >
                <AlertTriangle className="h-4 w-4" />
                Report
              </button>

              <Separator className="border-dashed my-1" />

              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-secondary rounded-md transition-colors text-destructive"
                onClick={() => setOpen(false)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
