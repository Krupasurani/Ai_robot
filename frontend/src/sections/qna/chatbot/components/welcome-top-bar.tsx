import { Button } from '@/components/ui/button';
import { Settings, Plus } from 'lucide-react';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { useAuthContext } from 'src/auth/hooks';
import { useMemo } from 'react';

export const WelcomeTopBar = () => {
  const router = useRouter();
  const { user } = useAuthContext();

  const isBusiness = useMemo(
    () =>
      user?.accountType === 'business' ||
      user?.accountType === 'organization' ||
      user?.accountType === 'company',
    [user?.accountType]
  );

  // Determine account type and settings path
  const settingsPath = isBusiness
    ? '/account/company-settings/settings/authentication'
    : '/account/individual/settings/authentication';

  return (
    <div className="flex items-center justify-end gap-2 px-4 py-1 flex-shrink-0 bg-background">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground shadow-none"
        onClick={() => {
          router.push(settingsPath);
        }}
      >
        <Settings className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground shadow-none"
        onClick={() => {
          router.push(`${paths.dashboard.promptLibrary.root}?create=true`);
        }}
      >
        <Plus className="h-4 w-4" />
        Create Prompt
      </Button>
    </div>
  );
};
