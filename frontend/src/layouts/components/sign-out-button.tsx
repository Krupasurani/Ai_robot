import { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';

import { useRouter } from 'src/routes/hooks';
import { toast } from 'sonner';
import { useAuthContext } from 'src/auth/hooks';
import { signOut as jwtSignOut } from 'src/auth/context/jwt/action';

const signOut = jwtSignOut;

export type SignOutButtonProps = React.ComponentProps<typeof Button> & {
  onClose?: () => void;
};

export function SignOutButton({ onClose, className, ...other }: SignOutButtonProps) {
  const router = useRouter();
  const { checkUserSession } = useAuthContext();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      await checkUserSession?.();
      onClose?.();
      router.refresh();
    } catch (error) {
      toast.error('Unable to logout!');
    }
  }, [checkUserSession, onClose, router]);

  return (
    <Button
      variant="destructive"
      className={cn(
        'w-full h-12 rounded-sm font-semibold text-sm',
        'bg-destructive/10 text-destructive hover:bg-destructive/20',
        'border border-destructive/20 hover:border-destructive/30',
        'transition-all duration-200',
        isHovered && 'shadow-sm -translate-y-0.5',
        className
      )}
      onClick={handleLogout}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...other}
    >
      <div className="flex items-center gap-3">
        <m.div
          animate={{ x: isHovered ? -3 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <LogOut className="h-5 w-5" />
        </m.div>
        <m.span
          animate={{ x: isHovered ? -3 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          Sign Out
        </m.span>
      </div>
    </Button>
  );
}
