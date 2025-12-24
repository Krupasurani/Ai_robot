import { m } from 'framer-motion';
import { cn } from '@/utils/cn';
import { varBounce, varContainer } from 'src/components/animate';

export type RoleBasedGuardProp = {
  className?: string;
  currentRole: string;
  hasContent?: boolean;
  acceptRoles: string[];
  children: React.ReactNode;
};

export function RoleBasedGuard({
  className,
  children,
  hasContent,
  currentRole,
  acceptRoles,
}: RoleBasedGuardProp) {
  if (typeof acceptRoles !== 'undefined' && !acceptRoles.includes(currentRole)) {
    if (!hasContent) {
      return null;
    }

    return (
      <m.div
        className={cn('mx-auto max-w-screen-xl px-4 py-10 text-center', className)}
        variants={varContainer()}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <m.div variants={varBounce().in}>
          <h1 className="mb-4 text-3xl font-semibold">Permission denied</h1>
        </m.div>

        <m.div variants={varBounce().in}>
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </m.div>
      </m.div>
    );
  }

  return <>{children}</>;
}
