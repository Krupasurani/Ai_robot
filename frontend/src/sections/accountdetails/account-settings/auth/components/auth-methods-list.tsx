import { useState, useEffect } from 'react';
import { Settings, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslate } from '@/locales';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { AuthMethodCard } from './auth-method-card';
import { StatusBadge } from './status-badge';
import { SmtpIcon } from './icons/auth-provider-icons';

import {
  getOAuthConfig,
  getSamlSsoConfig,
  getAzureAuthConfig,
  getGoogleAuthConfig,
  getMicrosoftAuthConfig,
} from '../utils/auth-configuration-service';

// Types
interface AuthMethod {
  type: string;
  enabled: boolean;
}

interface AuthMethodsListProps {
  authMethods: AuthMethod[];
  handleToggleMethod: (type: string) => void;
  handleConfigureMethod: (type: string) => void;
  isEditing: boolean;
  isLoading: boolean;
  smtpConfigured: boolean;
  configUpdated?: number;
}

interface ConfigStatus {
  google: boolean;
  microsoft: boolean;
  azureAd: boolean;
  samlSso: boolean;
  oauth: boolean;
}

export function AuthMethodsList({
  authMethods,
  handleToggleMethod,
  handleConfigureMethod,
  isEditing,
  isLoading,
  smtpConfigured,
  configUpdated = 0,
}: AuthMethodsListProps) {
  const { t } = useTranslate('settings');

  // Auth methods configuration
  const AUTH_METHODS_CONFIG = [
    {
      type: 'otp',
      title: t('auth.methods.otp.title'),
      description: t('auth.methods.otp.description'),
      configurable: false,
      requiresSmtp: true,
      requiresConfig: false,
    },
    {
      type: 'password',
      title: t('auth.methods.password.title'),
      description: t('auth.methods.password.description'),
      configurable: false,
      requiresSmtp: false,
      requiresConfig: false,
    },
    {
      type: 'google',
      title: t('auth.methods.google.title'),
      description: t('auth.methods.google.description'),
      configurable: true,
      requiresSmtp: false,
      requiresConfig: true,
    },
    {
      type: 'microsoft',
      title: t('auth.methods.microsoft.title'),
      description: t('auth.methods.microsoft.description'),
      configurable: true,
      requiresSmtp: false,
      requiresConfig: true,
    },
    {
      type: 'azureAd',
      title: t('auth.methods.azureAd.title'),
      description: t('auth.methods.azureAd.description'),
      configurable: true,
      requiresSmtp: false,
      requiresConfig: true,
    },
    {
      type: 'samlSso',
      title: t('auth.methods.samlSso.title'),
      description: t('auth.methods.samlSso.description'),
      configurable: true,
      requiresSmtp: false,
      requiresConfig: true,
    },
    {
      type: 'oauth',
      title: t('auth.methods.oauth.title'),
      description: t('auth.methods.oauth.description'),
      configurable: true,
      requiresSmtp: false,
      requiresConfig: true,
    },
  ];

  const [configStatus, setConfigStatus] = useState<ConfigStatus>({
    google: false,
    microsoft: false,
    azureAd: false,
    samlSso: false,
    oauth: false,
  });
  const [checkingConfigs, setCheckingConfigs] = useState(true);

  // Check authentication configurations on mount
  useEffect(() => {
    const checkConfigurations = async () => {
      setCheckingConfigs(true);
      try {
        const results = await Promise.allSettled([
          getGoogleAuthConfig(),
          getMicrosoftAuthConfig(),
          getAzureAuthConfig(),
          getSamlSsoConfig(),
          getOAuthConfig(),
        ]);

        setConfigStatus({
          google:
            results[0].status === 'fulfilled' &&
            results[0].value &&
            !!results[0].value.clientId,
          microsoft:
            results[1].status === 'fulfilled' &&
            results[1].value &&
            !!results[1].value.clientId &&
            !!results[1].value.tenantId,
          azureAd:
            results[2].status === 'fulfilled' &&
            results[2].value &&
            !!results[2].value.clientId &&
            !!results[2].value.tenantId,
          samlSso:
            results[3].status === 'fulfilled' &&
            results[3].value &&
            !!results[3].value.emailKey &&
            !!results[3].value.certificate,
          oauth:
            results[4].status === 'fulfilled' &&
            results[4].value &&
            !!results[4].value.clientId &&
            !!results[4].value.providerName,
        });
      } catch (error) {
        console.error('Error checking configurations:', error);
      } finally {
        setCheckingConfigs(false);
      }
    };

    checkConfigurations();
  }, [configUpdated]);

  // Get config status for a method
  const isMethodConfigured = (type: string): boolean => {
    switch (type) {
      case 'google':
        return configStatus.google;
      case 'microsoft':
        return configStatus.microsoft;
      case 'azureAd':
        return configStatus.azureAd;
      case 'samlSso':
        return configStatus.samlSso;
      case 'oauth':
        return configStatus.oauth;
      case 'password':
      case 'otp':
        return true; // These don't need configuration
      default:
        return false;
    }
  };

  // Handle method selection with validation
  const handleSelectMethod = (type: string) => {
    if (!isEditing) {
      toast.error(t('auth.enable_edit_mode'));
      return;
    }

    const methodConfig = AUTH_METHODS_CONFIG.find((m) => m.type === type);

    // Check SMTP requirement
    if (methodConfig?.requiresSmtp && !smtpConfigured) {
      toast.error(t('auth.requires_smtp_error', { title: methodConfig.title }));
      return;
    }

    // Check if configured
    if (methodConfig?.requiresConfig && !isMethodConfigured(type)) {
      toast.error(t('auth.please_configure_first', { title: methodConfig.title }));
      handleConfigureMethod(type);
      return;
    }

    handleToggleMethod(type);
  };

  // Get the active method
  const activeMethod = authMethods.find((m) => m.enabled);

  // Separate methods into groups
  const configuredMethods = AUTH_METHODS_CONFIG.filter((method) => {
    if (method.requiresConfig) {
      return isMethodConfigured(method.type);
    }
    if (method.requiresSmtp) {
      return smtpConfigured;
    }
    return true;
  });

  const unconfiguredMethods = AUTH_METHODS_CONFIG.filter((method) => {
    if (method.requiresConfig) {
      return !isMethodConfigured(method.type);
    }
    if (method.requiresSmtp) {
      return !smtpConfigured;
    }
    return false;
  });

  // Loading skeleton
  if (isLoading || checkingConfigs) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[140px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Configured / Ready Methods */}
      {configuredMethods.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <StatusBadge status="configured" showIcon={false} />
            <span className="text-sm text-muted-foreground">
              {t(configuredMethods.length !== 1 ? 'auth.methods_ready_plural' : 'auth.methods_ready', {
                count: configuredMethods.length,
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {configuredMethods.map((method) => {
              const currentMethod = authMethods.find((m) => m.type === method.type);
              const isSelected = currentMethod?.enabled || false;

              return (
                <AuthMethodCard
                  key={method.type}
                  type={method.type}
                  title={method.title}
                  description={method.description}
                  isSelected={isSelected}
                  isConfigured={true}
                  isEnabled={isSelected}
                  requiresConfig={method.requiresConfig}
                  requiresSmtp={method.requiresSmtp}
                  smtpConfigured={smtpConfigured}
                  disabled={!isEditing}
                  onSelect={() => handleSelectMethod(method.type)}
                  onConfigure={() => handleConfigureMethod(method.type)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Unconfigured Methods */}
      {unconfiguredMethods.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <StatusBadge status="requires-setup" showIcon={false} />
            <span className="text-sm text-muted-foreground">
              {t(
                unconfiguredMethods.length !== 1
                  ? 'auth.methods_require_setup_plural'
                  : 'auth.methods_require_setup',
                {
                  count: unconfiguredMethods.length,
                }
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {unconfiguredMethods.map((method) => {
              const currentMethod = authMethods.find((m) => m.type === method.type);
              const isSelected = currentMethod?.enabled || false;

              return (
                <AuthMethodCard
                  key={method.type}
                  type={method.type}
                  title={method.title}
                  description={method.description}
                  isSelected={isSelected}
                  isConfigured={false}
                  isEnabled={isSelected}
                  requiresConfig={method.requiresConfig}
                  requiresSmtp={method.requiresSmtp}
                  smtpConfigured={smtpConfigured}
                  disabled={!isEditing}
                  onSelect={() => handleSelectMethod(method.type)}
                  onConfigure={() => handleConfigureMethod(method.type)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Server Configuration Section */}
      <div className="space-y-3 pt-6 border-t border-border/50">
        <h3 className="text-sm font-medium text-foreground">{t('auth.server_configuration')}</h3>

        <Card
          className={cn(
            'group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer',
            'hover:border-border hover:bg-accent/5',
            smtpConfigured
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/30 bg-amber-500/5'
          )}
          onClick={() => handleConfigureMethod('smtp')}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-12 h-12 flex items-center justify-center rounded-xl',
                  smtpConfigured ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                )}
              >
                <SmtpIcon className="h-8 w-8" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{t('auth.methods.smtp.title')}</span>
                  <StatusBadge status={smtpConfigured ? 'configured' : 'requires-setup'} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('auth.methods.smtp.description')}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              {t('auth.configure')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AuthMethodsList;
