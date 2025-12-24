import type { IChatParticipant } from 'src/types/chat';

import phoneIcon from '@iconify-icons/solar/phone-bold';
import closeIcon from '@iconify-icons/mingcute/close-line';
import locationIcon from '@iconify-icons/mingcute/location-fill';
import chatIcon from '@iconify-icons/solar/chat-round-dots-bold';
import fluentMailIcon from '@iconify-icons/fluent/mail-24-filled';
import vidCamIcon from '@iconify-icons/solar/videocamera-record-bold';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Iconify } from 'src/components/iconify';

type Props = {
  open: boolean;
  onClose: () => void;
  participant: IChatParticipant;
};

export function ChatRoomParticipantDialog({ participant, open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="flex flex-row items-start justify-between space-y-0 px-4 pt-4">
          <DialogTitle className="sr-only">Participant details</DialogTitle>
          <div className="flex items-center gap-3">
            <Avatar className="h-24 w-24">
              {participant.avatarUrl && (
                <AvatarImage src={participant.avatarUrl} alt={participant.name} />
              )}
              <AvatarFallback className="text-lg font-semibold">
                {participant.name?.charAt(0).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-xs font-medium text-primary">{participant.role}</p>
              <p className="text-sm font-semibold text-foreground">{participant.name}</p>
              {participant.address && (
                <div className="flex items-start text-[11px] text-muted-foreground">
                  <Iconify
                    icon={locationIcon}
                    width={14}
                    className="mr-1 mt-[2px] flex-shrink-0 text-muted-foreground"
                  />
                  <span className="line-clamp-2">{participant.address}</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <Iconify icon={closeIcon} width={16} />
          </Button>
        </DialogHeader>

        <DialogContent className="border-0 px-4 pb-4 pt-2">
          <div className="flex gap-2 pt-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20"
            >
              <Iconify width={18} icon={phoneIcon} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md bg-sky-500/10 text-sky-600 hover:bg-sky-500/20"
            >
              <Iconify width={18} icon={chatIcon} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
            >
              <Iconify width={18} icon={fluentMailIcon} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md bg-violet-500/10 text-violet-600 hover:bg-violet-500/20"
            >
              <Iconify width={18} icon={vidCamIcon} />
            </Button>
          </div>
        </DialogContent>
      </DialogContent>
    </Dialog>
  );
}
