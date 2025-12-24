import type { IChatParticipant, IChatConversations } from 'src/types/chat';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, UserPlus, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { useResponsive } from 'src/hooks/use-responsive';
import { today } from 'src/utils/format-time';
import { createConversation } from 'src/actions/chat';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import { Sheet, SheetContent } from 'src/components/ui/sheet';
import { ScrollArea } from 'src/components/ui/scroll-area';

import { useAuthContext } from 'src/auth/hooks';
import { ChatNavItem } from './chat-nav-item';
import { ChatNavAccount } from './chat-nav-account';
import { ChatNavItemSkeleton } from './chat-skeleton';
import { ChatNavSearchResults } from './chat-nav-search-results';
import { initialConversation } from './utils/initial-conversation';
import type { UseNavCollapseReturn } from './hooks/use-collapse-nav';

const NAV_WIDTH = 320;

const NAV_COLLAPSE_WIDTH = 96;

type Props = {
  loading: boolean;
  selectedConversationId: string;
  contacts: IChatParticipant[];
  collapseNav: UseNavCollapseReturn;
  conversations: IChatConversations;
};

export function ChatNav({
  loading,
  contacts,
  collapseNav,
  conversations,
  selectedConversationId,
}: Props) {
  const router = useRouter();
  const mdUp = useResponsive('up', 'md');
  const { user } = useAuthContext();

  const {
    openMobile,
    onOpenMobile,
    onCloseMobile,
    onCloseDesktop,
    collapseDesktop,
    onCollapseDesktop,
  } = collapseNav;

  const [searchContacts, setSearchContacts] = useState<{
    query: string;
    results: IChatParticipant[];
  }>({
    query: '',
    results: [],
  });

  const myContact = useMemo(
    () => ({
      id: `${user?.id}`,
      role: `${user?.role}`,
      email: `${user?.email}`,
      address: `${user?.address}`,
      name: `${user?.displayName}`,
      lastActivity: today(),
      avatarUrl: `${user?.photoURL}`,
      phoneNumber: `${user?.phoneNumber}`,
      status: 'online' as 'online' | 'offline' | 'alway' | 'busy',
    }),
    [user]
  );

  useEffect(() => {
    if (!mdUp) {
      onCloseDesktop();
    }
  }, [onCloseDesktop, mdUp]);

  const handleToggleNav = useCallback(() => {
    if (mdUp) {
      onCollapseDesktop();
    } else {
      onCloseMobile();
    }
  }, [mdUp, onCloseMobile, onCollapseDesktop]);

  const handleClickCompose = useCallback(() => {
    if (!mdUp) {
      onCloseMobile();
    }
    router.push(paths.dashboard.chat);
  }, [mdUp, onCloseMobile, router]);

  const handleSearchContacts = useCallback(
    (inputValue: string) => {
      setSearchContacts((prevState) => ({ ...prevState, query: inputValue }));

      if (inputValue) {
        const results = contacts.filter((contact) =>
          contact.name.toLowerCase().includes(inputValue)
        );

        setSearchContacts((prevState) => ({ ...prevState, results }));
      }
    },
    [contacts]
  );

  const searchRef = useRef<HTMLDivElement>(null);

  const handleClickAwaySearch = useCallback(() => {
    setSearchContacts({ query: '', results: [] });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        handleClickAwaySearch();
      }
    };

    if (searchContacts.query) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [searchContacts.query, handleClickAwaySearch]);

  const handleClickResult = useCallback(
    async (result: IChatParticipant) => {
      handleClickAwaySearch();

      const linkTo = (id: string) => router.push(`${paths.dashboard.chat}?id=${id}`);

      try {
        // Check if the conversation already exists
        if (conversations.allIds.includes(result.id)) {
          linkTo(result.id);
          return;
        }

        // Find the recipient in contacts
        const recipient = contacts.find((contact) => contact.id === result.id);
        if (!recipient) {
          console.error('Recipient not found');
          return;
        }

        // Prepare conversation data
        const { conversationData } = initialConversation({
          recipients: [recipient],
          me: myContact,
        });

        // Create a new conversation
        const res = await createConversation(conversationData);

        if (!res || !res.conversation) {
          console.error('Failed to create conversation');
        }

        // Navigate to the new conversation
        linkTo(res.conversation.id);
      } catch (error) {
        console.error('Error handling click result:', error);
      }
    },
    [contacts, conversations.allIds, handleClickAwaySearch, myContact, router]
  );

  const renderContent = (
    <>
      <div className="flex flex-row items-center justify-center p-2.5 pb-0">
        {!collapseDesktop && (
          <>
            <ChatNavAccount />
            <div className="flex-grow" />
          </>
        )}

        <Button variant="ghost" size="icon" onClick={handleToggleNav}>
          {collapseDesktop ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {!collapseDesktop && (
          <Button variant="ghost" size="icon" onClick={handleClickCompose}>
            <UserPlus className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="p-2.5 pt-0">
        {!collapseDesktop && (
          <div ref={searchRef} className="mt-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchContacts.query}
                onChange={(event) => handleSearchContacts(event.target.value)}
                placeholder="Search contacts..."
                className="pl-9"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <ChatNavItemSkeleton />
      ) : (
        <ScrollArea className="pb-1">
          {searchContacts.query && !!conversations.allIds.length ? (
            <ChatNavSearchResults
              query={searchContacts.query}
              results={searchContacts.results}
              onClickResult={handleClickResult}
            />
          ) : (
            <nav>
              <ul>
                {conversations.allIds.map((conversationId) => (
                  <ChatNavItem
                    key={conversationId}
                    collapse={collapseDesktop}
                    conversation={conversations.byId[conversationId]}
                    selected={conversationId === selectedConversationId}
                    onCloseMobile={onCloseMobile}
                  />
                ))}
              </ul>
            </nav>
          )}
        </ScrollArea>
      )}
    </>
  );

  return (
    <>
      <Button
        onClick={onOpenMobile}
        className="md:hidden absolute top-[84px] left-0 z-[9] w-8 h-8 rounded-l-none rounded-r-xl shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
      >
        <Users className="h-4 w-4" />
      </Button>

      <div
        className={cn(
          'min-h-0 flex-1 flex flex-col border-r border-border transition-all duration-200',
          'hidden md:flex',
          collapseDesktop ? `w-${NAV_COLLAPSE_WIDTH}` : `w-${NAV_WIDTH}`
        )}
      >
        {renderContent}
      </div>

      <Sheet open={openMobile} onOpenChange={(open) => (!open ? onCloseMobile() : onOpenMobile())}>
        <SheetContent side="left" className="w-[320px] p-0">
          {renderContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
