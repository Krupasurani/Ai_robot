import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/locales';
import { StatusBadge } from './status-badge';
import { getAuthProviderIcon } from './icons/auth-provider-icons';
import { cn } from '@/utils/cn';

interface AuthMethodsHeaderProps {
  authMethods: Array<{
    type: string;
    enabled: boolean;
  }>;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  handleSaveChanges: () => void;
  handleCancelEdit: () => void;
  isLoading: boolean;
}

export function AuthMethodsHeader({
  authMethods,
  isEditing,
  setIsEditing,
  handleSaveChanges,
  handleCancelEdit,
  isLoading,
}: AuthMethodsHeaderProps) {
  const { t } = useTranslate('settings');
  const enabledMethod = authMethods.find((m) => m.enabled);
  const Icon = enabledMethod ? getAuthProviderIcon(enabledMethod.type) : null;

  // Method display names
  const methodNames: Record<string, string> = {
    password: t('auth.methods.password.title'),
    otp: t('auth.methods.otp.title'),
    google: t('auth.methods.google.title'),
    microsoft: t('auth.methods.microsoft.title'),
    azureAd: t('auth.methods.azureAd.title'),
    samlSso: t('auth.methods.samlSso.title'),
    oauth: t('auth.methods.oauth.title'),
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Active Method Display */}
      <div className="flex items-center gap-4">
        {enabledMethod && Icon && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20">
            <Icon className="h-6 w-6" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">{t('auth.active_method')}</span>
              <span className="text-sm font-medium text-foreground">
                {methodNames[enabledMethod.type] || enabledMethod.type}
              </span>
            </div>
            <StatusBadge status="active" className="ml-2" />
          </div>
        )}

        {!enabledMethod && (
          <div className="px-4 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <span className="text-sm text-amber-600 dark:text-amber-400">
              {t('auth.no_active_method')}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            {t('auth.edit')}
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isLoading}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {t('auth.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveChanges}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.saving')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t('auth.save_changes')}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthMethodsHeader;
