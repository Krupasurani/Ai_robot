import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';
import { signOut } from '@/auth/context/jwt';
import { useAuthContext } from '@/auth/hooks';
import { useRouter, usePathname } from '@/routes/hooks';
import { useTheme } from '@/theme/theme-provider';
import { LogOut, ChevronsUpDown, Sun, Moon, Monitor } from 'lucide-react';
import { useAccountMenu } from '@/layouts/config-nav-account';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSidebar, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/drop-down-menu';

export function NavUser() {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  const { theme, setTheme } = useTheme();
  const { checkUserSession, user } = useAuthContext();
  const accountMenuItems = useAccountMenu();

  const userInitial = useMemo(() => {
    return (
      user?.displayName?.charAt(0).toUpperCase() || user?.fullName?.charAt(0).toUpperCase() || 'U'
    );
  }, [user]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      await checkUserSession?.();

      router.refresh();
    } catch (error) {
      toast.error('Unable to logout!');
    }
  }, [checkUserSession, router]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <Avatar className="rounded-full size-9 bg-sidebar border-2 border-sidebar-border/50 ring-2 ring-primary/20 shadow-sm">
                <AvatarImage 
                  src={user?.photoURL} 
                  alt={user?.fullName} 
                  className="object-cover" 
                  loading="eager"
                />
                <AvatarFallback className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-sidebar-foreground font-semibold text-xs">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col justify-center group-data-[collapsible=icon]:hidden min-w-0 ml-1">
                <span className="truncate font-semibold text-sm text-sidebar-foreground text-left">
                  {user?.fullName || user?.displayName}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left">
                <Avatar className="size-12 rounded-full ring-2 ring-primary/20 shadow-sm">
                  <AvatarImage 
                    src={user?.photoURL} 
                    alt={user?.fullName} 
                    className="object-cover" 
                    loading="eager"
                  />
                  <AvatarFallback className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 font-semibold text-base">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-semibold text-sm">{user?.fullName || user?.displayName}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <div className="flex items-center gap-2">
                  {theme === 'light' ? (
                    <Sun className="size-4" />
                  ) : theme === 'dark' ? (
                    <Moon className="size-4" />
                  ) : (
                    <Monitor className="size-4" />
                  )}
                  <span>Theme</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
                >
                  <DropdownMenuRadioItem value="light" className="cursor-pointer" hideIndicator>
                    <Sun className="size-4" />
                    <span>Light</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark" className="cursor-pointer" hideIndicator>
                    <Moon className="size-4" />
                    <span>Dark</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system" className="cursor-pointer" hideIndicator>
                    <Monitor className="size-4" />
                    <span>System</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {accountMenuItems.map((option, idx) => {
                const rootLabel = pathname.includes('/dashboard') ? 'Home' : 'Dashboard';
                // const rootHref = pathname.includes('/dashboard') ? '/' : paths.dashboard.root;
                // const isActive = pathname === (option.label === 'Home' ? rootHref : option.href);

                return (
                  <DropdownMenuItem key={idx} onClick={() => router.push(option.href)}>
                    {option.icon}
                    {option.label === 'Home' ? rootLabel : option.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
