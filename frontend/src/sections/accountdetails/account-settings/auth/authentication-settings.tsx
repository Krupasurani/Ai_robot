import { useState, useEffect } from 'react';
import { Info, Loader2, AlertTriangle, ExternalLink, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslate } from '@/locales';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import axios from 'src/utils/axios';

import { AuthMethodsList } from './components/auth-methods-list';
import { AuthMethodsHeader } from './components/auth-methods-header';
import { ConfigureMethodDialog } from './components/configure-method-dialog';
import { validateOtpConfiguration, validateSingleMethodSelection } from './utils/validations';

import type { AuthMethod } from './utils/validations';

// API schema for validation
const AUTH_METHOD_TYPES = ['password', 'otp', 'google', 'microsoft', 'azureAd', 'samlSso', 'oauth'];

const AuthenticationSettings: React.FC = () => {
  const { t } = useTranslate('settings');
  const [authMethods, setAuthMethods] = useState<AuthMethod[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [currentConfigMethod, setCurrentConfigMethod] = useState<string | null>(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);

  // Fetch auth methods from API
  useEffect(() => {
    fetchAuthMethods();
    checkSmtpConfiguration();
    // eslint-disable-next-line
  }, []);

  // Check if SMTP is configured for OTP validation
  const checkSmtpConfiguration = async () => {
    try {
      const response = await axios.get('/api/v1/configurationManager/smtpConfig');
      setSmtpConfigured(!!response.data?.host && !!response.data?.fromEmail);
    } catch (err) {
      setSmtpConfigured(false);
    }
  };

  const fetchAuthMethods = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/v1/orgAuthConfig/authMethods');
      const { data } = response;

      const enabledMethodTypes = new Set<string>();
      data.authMethods.forEach((method: any) => {
        method.allowedMethods.forEach((allowedMethod: any) => {
          enabledMethodTypes.add(allowedMethod.type);
        });
      });

      const allMethods = AUTH_METHOD_TYPES.map((type) => ({
        type,
        enabled: enabledMethodTypes.has(type),
      }));

      setAuthMethods(allMethods);
    } catch (err) {
      setError(t('auth.failed_load'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const enabledMethods = authMethods.filter((method) => method.enabled);

      if (!validateSingleMethodSelection(enabledMethods)) {
        setError(t('auth.only_one_method'));
        toast.error(t('auth.only_one_method'));
        setIsLoading(false);
        return;
      }

      if (!validateOtpConfiguration(enabledMethods, smtpConfigured)) {
        setError(t('auth.otp_requires_smtp'));
        toast.error(t('auth.otp_requires_smtp'));
        setIsLoading(false);
        return;
      }

      const payload = {
        authMethod: [
          {
            order: 1,
            allowedMethods: enabledMethods.map(({ type }) => ({ type })),
          },
        ],
      };

      await axios.post('/api/v1/orgAuthConfig/updateAuthMethod', payload);

      toast.success(t('auth.updated_success'));
      setIsEditing(false);
      fetchAuthMethods();
    } catch (err) {
      setError(t('auth.failed_save_retry'));
      toast.error(t('auth.failed_save'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle toggling auth methods - allow only one active method
  const handleToggleMethod = (type: string) => {
    setAuthMethods((prev) => {
      const method = prev.find((m) => m.type === type);
      const enabledCount = prev.filter((m) => m.enabled).length;

      if (method?.enabled && enabledCount === 1) {
        return prev;
      }

      if (!method?.enabled) {
        return prev.map((m) => ({
          ...m,
          enabled: m.type === type,
        }));
      }

      return prev.map((m) => ({
        ...m,
        enabled: m.type === type ? !m.enabled : m.enabled,
      }));
    });
  };

  // Handle opening the configure dialog
  const handleConfigureMethod = (type: string) => {
    setCurrentConfigMethod(type);
    setConfigureDialogOpen(true);
  };

  // Handle save in configure dialog
  const handleSaveConfiguration = () => {
    if (currentConfigMethod === 'smtp') {
      checkSmtpConfiguration();
    }

    setConfigureDialogOpen(false);
    setCurrentConfigMethod(null);

    if (isEditing) {
      setIsEditing(false);
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    fetchAuthMethods();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {t('auth.title')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('auth.description')}
                </p>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" asChild>
            <a
              href="https://docs.thero.com/auth"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('auth.documentation')}
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Banner */}
        <Alert className="rounded-xl border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground/80">
            {t('auth.only_one_method_banner')}
          </AlertDescription>
        </Alert>

        {/* Active Method Card */}
        <Card className="relative overflow-hidden rounded-xl border shadow-sm">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          <div className="p-5">
            <AuthMethodsHeader
              authMethods={authMethods}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              handleSaveChanges={handleSaveChanges}
              handleCancelEdit={handleCancelEdit}
              isLoading={isLoading}
            />
          </div>
        </Card>

        {/* Authentication Methods Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">{t('auth.select_method')}</h2>
          </div>

          <AuthMethodsList
            authMethods={authMethods}
            handleToggleMethod={handleToggleMethod}
            handleConfigureMethod={handleConfigureMethod}
            isEditing={isEditing}
            isLoading={isLoading}
            smtpConfigured={smtpConfigured}
          />
        </div>
      </div>

      {/* Configure Method Dialog */}
      <ConfigureMethodDialog
        open={configureDialogOpen}
        onClose={() => setConfigureDialogOpen(false)}
        onSave={handleSaveConfiguration}
        methodType={currentConfigMethod}
      />
    </div>
  );
};

export default AuthenticationSettings;
