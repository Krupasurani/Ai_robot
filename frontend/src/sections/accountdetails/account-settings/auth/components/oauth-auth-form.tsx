import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Info, ExternalLink, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/cn';

import { OAuthIcon } from './icons/auth-provider-icons';
import {
  getOAuthConfig,
  type OAuthConfig,
  updateOAuthConfig,
} from '../utils/auth-configuration-service';

const OAuthConfigSchema = zod.object({
  providerName: zod.string().min(1, { message: 'Provider name is required' }),
  clientId: zod.string().min(1, { message: 'Client ID is required' }),
  clientSecret: zod.string().optional(),
  authorizationUrl: zod
    .string()
    .url({ message: 'Please enter a valid URL' })
    .optional()
    .or(zod.literal('')),
  tokenEndpoint: zod
    .string()
    .url({ message: 'Please enter a valid URL' })
    .optional()
    .or(zod.literal('')),
  userInfoEndpoint: zod
    .string()
    .url({ message: 'Please enter a valid URL' })
    .optional()
    .or(zod.literal('')),
  scope: zod.string().optional(),
  redirectUri: zod
    .string()
    .url({ message: 'Please enter a valid URL' })
    .optional()
    .or(zod.literal('')),
});

type OAuthConfigFormData = zod.infer<typeof OAuthConfigSchema>;

interface OAuthAuthFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OAuthAuthForm({ open, onClose, onSuccess }: OAuthAuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<OAuthConfigFormData>({
    resolver: zodResolver(OAuthConfigSchema),
    mode: 'onChange',
    defaultValues: {
      providerName: '',
      clientId: '',
      clientSecret: '',
      authorizationUrl: '',
      tokenEndpoint: '',
      userInfoEndpoint: '',
      scope: 'openid email profile',
      redirectUri: '',
    },
  });

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);

      getOAuthConfig()
        .then((config: OAuthConfig) => {
          if (config) {
            setValue('providerName', config.providerName || '');
            setValue('clientId', config.clientId || '');
            setValue('clientSecret', config.clientSecret || '');
            setValue('authorizationUrl', config.authorizationUrl || '');
            setValue('tokenEndpoint', config.tokenEndpoint || '');
            setValue('userInfoEndpoint', config.userInfoEndpoint || '');
            setValue('scope', config.scope || 'openid email profile');
            setValue('redirectUri', config.redirectUri || '');
          }
        })
        .catch((err) => {
          console.error('Error loading OAuth configuration:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, setValue]);

  const onSubmit = async (data: OAuthConfigFormData) => {
    setSaving(true);
    setError(null);

    try {
      const configData: OAuthConfig = {
        providerName: data.providerName,
        clientId: data.clientId,
        clientSecret: data.clientSecret || undefined,
        authorizationUrl: data.authorizationUrl || undefined,
        tokenEndpoint: data.tokenEndpoint || undefined,
        userInfoEndpoint: data.userInfoEndpoint || undefined,
        scope: data.scope || 'openid email profile',
        redirectUri: data.redirectUri || undefined,
      };

      await updateOAuthConfig(configData);
      toast.success('OAuth configuration saved successfully');

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(handleClose, 500);
    } catch (err) {
      setError('Failed to save OAuth configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      reset();
      setError(null);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border space-y-0">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-muted">
              <OAuthIcon className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg font-semibold">Configure OAuth Provider</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Set up a generic OAuth 2.0 provider for authentication
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Setup Instructions */}
                <Card className="p-4 rounded-xl border-primary/20 bg-primary/5">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-primary/10">
                      <Info className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">Setup Instructions</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure your OAuth 2.0 provider by entering the credentials and endpoints
                        from your identity provider&apos;s developer console.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Basic Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Basic Settings</h4>

                  <div className="space-y-2">
                    <Label htmlFor="providerName" className="text-sm font-medium">
                      Provider Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="providerName"
                      {...register('providerName')}
                      placeholder="e.g., Custom OAuth Provider"
                      className={cn(
                        'h-11',
                        errors.providerName && 'border-destructive'
                      )}
                    />
                    {errors.providerName && (
                      <p className="text-xs text-destructive">{errors.providerName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-sm font-medium">
                      Client ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="clientId"
                      {...register('clientId')}
                      placeholder="Your OAuth client ID"
                      className={cn('h-11', errors.clientId && 'border-destructive')}
                    />
                    {errors.clientId && (
                      <p className="text-xs text-destructive">{errors.clientId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientSecret" className="text-sm font-medium">
                      Client Secret
                    </Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      {...register('clientSecret')}
                      placeholder="Your OAuth client secret"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional if your provider doesn&apos;t require it
                    </p>
                  </div>
                </div>

                {/* Endpoints */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Endpoints</h4>

                  <div className="space-y-2">
                    <Label htmlFor="authorizationUrl" className="text-sm font-medium">
                      Authorization URL
                    </Label>
                    <Input
                      id="authorizationUrl"
                      {...register('authorizationUrl')}
                      placeholder="https://provider.com/oauth/authorize"
                      className={cn('h-11', errors.authorizationUrl && 'border-destructive')}
                    />
                    {errors.authorizationUrl && (
                      <p className="text-xs text-destructive">{errors.authorizationUrl.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tokenEndpoint" className="text-sm font-medium">
                      Token Endpoint
                    </Label>
                    <Input
                      id="tokenEndpoint"
                      {...register('tokenEndpoint')}
                      placeholder="https://provider.com/oauth/token"
                      className={cn('h-11', errors.tokenEndpoint && 'border-destructive')}
                    />
                    {errors.tokenEndpoint && (
                      <p className="text-xs text-destructive">{errors.tokenEndpoint.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userInfoEndpoint" className="text-sm font-medium">
                      User Info Endpoint
                    </Label>
                    <Input
                      id="userInfoEndpoint"
                      {...register('userInfoEndpoint')}
                      placeholder="https://provider.com/oauth/userinfo"
                      className={cn('h-11', errors.userInfoEndpoint && 'border-destructive')}
                    />
                    {errors.userInfoEndpoint && (
                      <p className="text-xs text-destructive">{errors.userInfoEndpoint.message}</p>
                    )}
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Additional Settings</h4>

                  <div className="space-y-2">
                    <Label htmlFor="scope" className="text-sm font-medium">
                      Scope
                    </Label>
                    <Input
                      id="scope"
                      {...register('scope')}
                      placeholder="openid email profile"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Space-separated OAuth scopes</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="redirectUri" className="text-sm font-medium">
                      Redirect URI
                    </Label>
                    <Input
                      id="redirectUri"
                      {...register('redirectUri')}
                      placeholder="https://yourapp.com/auth/oauth/callback"
                      className={cn('h-11', errors.redirectUri && 'border-destructive')}
                    />
                    {errors.redirectUri && (
                      <p className="text-xs text-destructive">{errors.redirectUri.message}</p>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={!isValid || saving || loading}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
