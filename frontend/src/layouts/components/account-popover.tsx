import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';
import { useAuthContext } from 'src/auth/hooks';
import { AccountButton } from './account-button';
import { SignOutButton } from './sign-out-button';

export type AccountPopoverProps = React.ComponentProps<typeof AccountButton> & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function AccountPopover({
  data = [],
  className,
  photoURL,
  displayName,
  ...other
}: AccountPopoverProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);

  const handleClickItem = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const rootLabel = pathname.includes('/dashboard') ? 'Home' : 'Dashboard';
  const rootHref = pathname.includes('/dashboard') ? '/' : paths.dashboard.root;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AccountButton
          photoURL={photoURL ?? user?.photoURL ?? ''}
          displayName={displayName ?? user?.displayName ?? ''}
          className={className}
          {...other}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="end">
        <div className="p-4 pb-3">
          <h4 className="text-sm font-semibold truncate">{user?.displayName}</h4>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
        </div>

        <Separator className="border-dashed" />

        <div className="p-1 my-1">
          {data.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => handleClickItem(option.label === 'Home' ? rootHref : option.href)}
              className="w-full flex items-center gap-3 py-2 px-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer text-left"
            >
              <div className="shrink-0 [&_svg]:w-6 [&_svg]:h-6">{option.icon}</div>
              <span className="flex-1">{option.label === 'Home' ? rootLabel : option.label}</span>
              {option.info && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {option.info}
                </Badge>
              )}
            </button>
          ))}
        </div>

        <Separator className="border-dashed" />

        <div className="p-1">
          <SignOutButton
            onClose={() => setOpen(false)}
            className="w-full justify-start text-left"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
