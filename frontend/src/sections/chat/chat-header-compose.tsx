import type { IChatParticipant } from 'src/types/chat';

import React, { useState, useCallback, useEffect, useMemo } from 'react';

import MultipleSelector, {
  type MultipleSelectorRef,
  type Option,
} from 'src/components/ui/multi-select';
import { Avatar, AvatarImage, AvatarFallback } from 'src/components/ui/avatar';

type Props = {
  contacts: IChatParticipant[];
  onAddRecipients: (selected: IChatParticipant[]) => void;
  recipients?: IChatParticipant[]; // Optional prop to sync with parent state
};

export function ChatHeaderCompose({ contacts, onAddRecipients, recipients = [] }: Props) {
  const selectorRef = React.useRef<MultipleSelectorRef>(null);
  const [selected, setSelected] = useState<IChatParticipant[]>([]);

  // Sync local state with parent recipients prop when it changes
  useEffect(() => {
    if (recipients.length === 0 && selected.length > 0) {
      // Parent cleared recipients, reset local state
      setSelected([]);
      selectorRef.current?.reset();
    }
  }, [recipients.length, selected.length]);

  const handleAddRecipients = useCallback(
    (newSelected: IChatParticipant[]) => {
      setSelected(newSelected);
      onAddRecipients(newSelected);
    },
    [onAddRecipients]
  );

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo(
    () =>
      contacts.map((contact) => ({
        value: contact.id,
        label: contact.name,
        avatar: contact.avatarUrl,
      })),
    [contacts]
  );

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(() => selected.map((s) => ({ value: s.id, label: s.name })), [selected]);

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm font-semibold text-foreground mr-2">To:</p>
      <div className="min-w-[320px] md:min-w-[320px] flex-grow md:flex-grow-0">
        <MultipleSelector
          ref={selectorRef}
          value={value}
          onChange={(newValue: Option[]) => {
            const newSelected = newValue
              .map((v: Option) => contacts.find((c) => c.id === v.value))
              .filter(Boolean) as IChatParticipant[];
            handleAddRecipients(newSelected);
          }}
          options={options}
          placeholder="+ Recipients"
          emptyIndicator={
            <p className="text-center text-sm text-muted-foreground">No contacts found</p>
          }
          badgeClassName="bg-secondary text-secondary-foreground"
          renderOptionLabel={(option: Option) => {
            const avatar = option.avatar as string | undefined;
            return (
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatar} alt={option.label} />
                  <AvatarFallback>{option.label?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <span>{option.label}</span>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
