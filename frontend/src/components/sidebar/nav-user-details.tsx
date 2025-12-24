import { cn } from '@/utils/cn';
import { PanelRight } from 'lucide-react';
import { useSidebar, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Logo } from '../custom/logo';

export function TeamSwitcher() {
  const { open, toggleSidebar } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center justify-center px-1 py-0.5">
        <div className={cn('w-full flex items-center relative rounded-sm gap-0 justify-between')}>
          <Logo isSingle={!open} className="mx-auto" />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'flex items-center justify-center transition-all duration-300',
              open
                ? 'opacity-100 scale-100 pointer-events-auto flex'
                : 'opacity-0 scale-90 pointer-events-none hidden'
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSidebar();
            }}
            tabIndex={open ? 0 : -1}
            aria-label="Toggle Sidebar"
            type="button"
          >
            <PanelRight size={20} className={cn('text-muted-foreground cursor-pointer')} />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
