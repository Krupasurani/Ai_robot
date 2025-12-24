import type { ChatHeaderProps } from 'src/types/chat-bot';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslate } from 'src/locales';

const ChatHeader = ({ isDrawerOpen, onDrawerOpen }: ChatHeaderProps) => {
  const { t } = useTranslate('navbar');

  return (
    <div className="flex items-center p-4 border-b border-border bg-card min-h-[64px]">
      {!isDrawerOpen && (
        <Button
          onClick={onDrawerOpen}
          variant="ghost"
          size="icon"
          className="mr-2 text-muted-foreground hover:text-primary transition-all hover:scale-110"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <h2 className="text-lg font-semibold text-foreground">{t('navigation.assistant')}</h2>
    </div>
  );
};

export default ChatHeader;
