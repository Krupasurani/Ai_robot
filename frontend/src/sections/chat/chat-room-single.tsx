import type { IChatParticipant } from 'src/types/chat';

import { Phone, Mail, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar, AvatarImage, AvatarFallback } from 'src/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'src/components/ui/collapsible';
import { Button } from 'src/components/ui/button';
import { useBoolean } from 'src/hooks/use-boolean';

type Props = {
  participant: IChatParticipant;
};

export function ChatRoomSingle({ participant }: Props) {
  const collapse = useBoolean(true);

  const renderInfo = (
    <div className="flex flex-col items-center py-5">
      <Avatar className="w-24 h-24 mb-2">
        <AvatarImage src={participant?.avatarUrl} alt={participant?.name} />
        <AvatarFallback>{participant?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>
      <p className="text-base font-semibold">{participant?.name}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{participant?.role}</p>
    </div>
  );

  const renderContact = (
    <div className="px-2 py-2.5 space-y-2">
      {[
        { icon: MapPin, value: participant?.address, id: 'location' },
        { icon: Phone, value: participant?.phoneNumber, id: 'phone' },
        { icon: Mail, value: participant?.email, id: 'email' },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="flex flex-row items-start gap-1 text-sm break-all">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span>{item.value}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {renderInfo}

      <Collapsible open={collapse.value} onOpenChange={collapse.onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-between text-xs font-medium uppercase h-10 px-2.5 rounded-none',
              'bg-muted/50 hover:bg-muted',
              'text-muted-foreground'
            )}
          >
            Information
            {collapse.value ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>{renderContact}</CollapsibleContent>
      </Collapsible>
    </>
  );
}
