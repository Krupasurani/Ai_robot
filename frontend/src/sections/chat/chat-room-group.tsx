import type { IChatParticipant } from 'src/types/chat';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

import { Avatar, AvatarImage, AvatarFallback } from 'src/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'src/components/ui/collapsible';
import { Button } from 'src/components/ui/button';
import { useBoolean } from 'src/hooks/use-boolean';
import { ChatRoomParticipantDialog } from './chat-room-participant-dialog';

type Props = {
  participants: IChatParticipant[];
};

export function ChatRoomGroup({ participants }: Props) {
  const collapse = useBoolean(true);
  const [selected, setSelected] = useState<IChatParticipant | null>(null);

  const handleOpen = useCallback((participant: IChatParticipant) => {
    setSelected(participant);
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
  }, []);

  const totalParticipants = participants.length;

  const renderList = (
    <>
      {participants.map((participant) => (
        <button
          key={participant.id}
          type="button"
          onClick={() => handleOpen(participant)}
          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded-md transition-colors"
        >
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={participant.avatarUrl} alt={participant.name} />
              <AvatarFallback>{participant.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'absolute bottom-0 right-0 w-3 h-3 border-2 border-background rounded-full',
                participant.status === 'online' && 'bg-green-500',
                participant.status === 'alway' && 'bg-yellow-500',
                participant.status === 'busy' && 'bg-red-500',
                participant.status === 'offline' && 'bg-gray-400'
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{participant.name}</p>
            <p className="text-xs text-muted-foreground truncate">{participant.role}</p>
          </div>
        </button>
      ))}
    </>
  );

  return (
    <>
      <Collapsible open={collapse.value} onOpenChange={collapse.onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            disabled={!totalParticipants}
            className={cn(
              'w-full justify-between text-xs font-medium uppercase h-10 px-2.5 rounded-none',
              'bg-muted/50 hover:bg-muted',
              'text-muted-foreground',
              !totalParticipants && 'opacity-50 cursor-not-allowed'
            )}
          >
            {`In room (${totalParticipants})`}
            {collapse.value ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-2 py-1">{renderList}</div>
        </CollapsibleContent>
      </Collapsible>

      {selected && (
        <ChatRoomParticipantDialog participant={selected} open={!!selected} onClose={handleClose} />
      )}
    </>
  );
}
