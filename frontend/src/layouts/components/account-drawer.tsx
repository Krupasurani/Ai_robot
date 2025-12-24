import React, { useState, useEffect, useCallback } from 'react';
import { Settings, User, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';
import { useAdmin } from 'src/context/AdminContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { AnimateAvatar } from 'src/components/animate';
import { getOrgLogo, getOrgIdFromToken } from 'src/sections/accountdetails/utils';
import { useAuthContext } from 'src/auth/hooks';
import { AccountButton } from './account-button';
import { SignOutButton } from './sign-out-button';

// Base account menu items
const baseAccountItems = [
  {
    label: 'Manage my profile',
    href: '/account/personal/profile',
    icon: <User className="h-5 w-5" />,
  },
];

// Company settings menu item (only for business accounts)
const companySettingsItem = {
  label: 'Company Settings',
  href: '/account/company-settings/profile',
  icon: <Settings className="h-5 w-5" />,
};

export type AccountDrawerProps = React.ComponentProps<typeof Button> & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function AccountDrawer({ data = [], className, ...other }: AccountDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthContext();
  const { isAdmin } = useAdmin();

  const [open, setOpen] = useState(false);
  const [menuItems, setMenuItems] = useState(data);
  const [customLogo, setCustomLogo] = useState<string | null>('');
  const isBusiness =
    user?.accountType === 'business' ||
    user?.accountType === 'organization' ||
    user?.role === 'business';

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const orgId = await getOrgIdFromToken();
        if (isBusiness) {
          const logoUrl = await getOrgLogo(orgId);
          setCustomLogo(logoUrl);
        }
      } catch (err) {
        console.error(err, 'error in fetching logo');
      }
    };
    fetchLogo();
  }, [isBusiness]);

  // Build menu items when user data changes
  useEffect(() => {
    // If data is provided through props, use it
    if (data && data.length > 0) {
      setMenuItems(data);
      return;
    }

    // Otherwise build based on account type
    const items = [...baseAccountItems];

    // Only show Company Settings to business users who are also admins
    if (isBusiness && isAdmin) {
      items.push(companySettingsItem);
    }

    setMenuItems(items);
  }, [data, isBusiness, isAdmin]);

  const handleOpenDrawer = useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  const handleClickItem = useCallback(
    (path: string) => {
      handleCloseDrawer();
      router.push(path);
    },
    [handleCloseDrawer, router]
  );

  const renderAvatar = (
    <AnimateAvatar
      width={86}
      slotProps={{
        avatar: { src: user?.photoURL, alt: user?.displayName },
        overlay: {
          border: 2,
          spacing: 2.5,
          color: `conic-gradient(
            hsl(var(--primary)), 
            hsl(var(--warning)), 
            hsl(var(--primary))
          )`,
        },
      }}
    >
      {user?.displayName?.charAt(0).toUpperCase() || user?.fullName?.charAt(0).toUpperCase() || 'U'}
    </AnimateAvatar>
  );

  return (
    <>
      <AccountButton
        onClick={handleOpenDrawer}
        photoURL={customLogo || user?.photoURL}
        displayName={user?.fullName}
        className={className}
        {...other}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[300px] p-0">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
            onClick={handleCloseDrawer}
          >
            <X className="h-4 w-4" />
          </Button>

          <ScrollArea className="h-full">
            <div className="flex flex-col items-center pt-9 pb-2">
              {renderAvatar}

              <h3 className="mt-2.5 text-base font-semibold tracking-wide truncate max-w-full px-4">
                {user?.fullName || user?.displayName}
              </h3>

              <p className="text-sm text-muted-foreground mt-0.5 opacity-85 truncate max-w-full px-4">
                {user?.email}
              </p>

              {/* Show account type if available */}
              {user?.accountType && (
                <Label
                  className={cn(
                    'mt-1.5 px-2 py-1 text-[0.7rem] font-medium uppercase tracking-wider rounded',
                    user.accountType === 'business' || user.accountType === 'organization'
                      ? 'bg-primary/8 text-primary dark:bg-primary/16 dark:text-primary'
                      : 'bg-info/8 text-info dark:bg-info/16 dark:text-info'
                  )}
                >
                  {user.accountType === 'business' || user.accountType === 'organization'
                    ? 'Business Account'
                    : 'Individual Account'}
                </Label>
              )}
            </div>

            <div className="px-2 mt-1">
              <Separator className="my-2 opacity-20 border-dashed" />

              <div className="space-y-0.5">
                {menuItems.map((option) => {
                  const rootLabel = pathname.includes('/dashboard') ? 'Home' : 'Dashboard';
                  const rootHref = pathname.includes('/dashboard') ? '/' : paths.dashboard.root;
                  const isActive = pathname === (option.label === 'Home' ? rootHref : option.href);

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() =>
                        handleClickItem(option.label === 'Home' ? rootHref : option.href)
                      }
                      className={cn(
                        'w-full h-11 rounded-md mb-0.5 px-3 flex items-center transition-all',
                        isActive
                          ? 'bg-primary/8 text-primary dark:bg-primary/16'
                          : 'text-muted-foreground hover:bg-secondary',
                        'hover:text-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center w-8 h-8 mr-1.5 rounded',
                          isActive
                            ? 'bg-primary/12 dark:bg-primary/24'
                            : 'bg-secondary/40 dark:bg-secondary/20'
                        )}
                      >
                        {React.cloneElement(option.icon as React.ReactElement, {
                          className: cn(
                            'h-5 w-5',
                            isActive ? 'text-primary' : 'text-muted-foreground opacity-70'
                          ),
                        })}
                      </div>

                      <span className={cn('text-sm flex-1', isActive && 'font-semibold')}>
                        {option.label === 'Home' ? rootLabel : option.label}
                      </span>

                      {option.info && (
                        <Label className="ml-1 text-[0.65rem] h-[18px] text-destructive">
                          {option.info}
                        </Label>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>

          <div className="p-2.5 mt-1 border-t border-border">
            <SignOutButton onClose={handleCloseDrawer} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
