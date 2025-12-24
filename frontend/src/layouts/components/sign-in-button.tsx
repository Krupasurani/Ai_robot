import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RouterLink } from 'src/routes/components';
import { CONFIG } from 'src/config-global';
import { cn } from '@/utils/cn';

export function SignInButton({ className, ...other }: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" className={cn(className)} asChild {...other}>
      <RouterLink href={CONFIG.auth.redirectPath}>Sign in</RouterLink>
    </Button>
  );
}
