import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { AnimateAvatar } from '@/components/animate';

export type AccountButtonProps = React.ComponentProps<typeof Button> & {
  photoURL: string;
  displayName: string;
};

export function AccountButton({ photoURL, displayName, className, ...other }: AccountButtonProps) {
  const initials = displayName?.charAt(0).toUpperCase() || 'U';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-10 w-10 rounded-full p-0 transition-shadow hover:shadow-md', className)}
      {...other}
    >
      <AnimateAvatar
        width={40}
        slotProps={{
          avatar: {
            src: photoURL,
            alt: displayName,
            className: 'border-2 border-background',
          },
          overlay: {
            border: 2,
            spacing: 0,
            color: `conic-gradient(
              hsl(var(--primary)), 
              hsl(var(--warning)), 
              hsl(var(--primary))
            )`,
          },
        }}
      >
        {initials}
      </AnimateAvatar>
    </Button>
  );
}
