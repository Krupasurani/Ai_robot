import { z } from 'zod';
import { Hash, Info, Loader2, ExternalLink } from 'lucide-react';
import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { InputField } from '@/components/ui/input-field';

import axios from '@/utils/axios';
import { CopyField } from './copy-field';
import { useAuthConfig, useUpdateAuthConfig } from '../hooks/use-auth-config';

interface GoogleAuthFormProps {
  onValidationChange: (isValid: boolean) => void;
  onSaveSuccess?: () => void;
}

export interface GoogleAuthFormRef {
  handleSave: () => Promise<boolean>;
}

const googleAuthSchema = z.object({
  clientId: z
    .string()
    .min(1, { message: 'Client ID is required' })
    .min(8, { message: 'Client ID appears to be too short' }),
});

type GoogleAuthFormData = z.infer<typeof googleAuthSchema>;

const API_ENDPOINTS = {
  FRONTEND_URL: '/api/v1/configurationManager/frontendPublicUrl',
};

const getRedirectUris = async () => {
  const currentRedirectUri = `${window.location.origin}/auth/google/callback`;

  try {
    const response = await axios.get(API_ENDPOINTS.FRONTEND_URL);
    const frontendBaseUrl = response.data.url || '';
    const frontendUrl = frontendBaseUrl.endsWith('/')
      ? `${frontendBaseUrl}auth/google/callback`
      : `${frontendBaseUrl}/auth/google/callback`;

    return {
      currentRedirectUri,
      recommendedRedirectUri: frontendUrl,
      frontendBaseUrl,
      urisMismatch: currentRedirectUri !== frontendUrl,
    };
  } catch (error) {
    return {
      currentRedirectUri,
      recommendedRedirectUri: currentRedirectUri,
      frontendBaseUrl: window.location.origin,
      urisMismatch: false,
    };
  }
};

const GoogleAuthForm = forwardRef<GoogleAuthFormRef, GoogleAuthFormProps>(
  ({ onValidationChange, onSaveSuccess }, ref) => {
    const { data: config, isLoading: isLoadingConfig } = useAuthConfig('google');
    const updateMutation = useUpdateAuthConfig('google');

    const { data: redirectUris } = useQuery({
      queryKey: ['frontendPublicUrl'],
      queryFn: getRedirectUris,
      staleTime: 1000 * 60 * 10, // 10 minutes
    });

    const form = useForm<GoogleAuthFormData>({
      resolver: zodResolver(googleAuthSchema),
      mode: 'onChange',
      defaultValues: {
        clientId: '',
      },
    });

    const { control, reset, formState } = form;
    const isValid = formState.isValid;

    useEffect(() => {
      onValidationChange(isValid);
    }, [isValid, onValidationChange]);

    useEffect(() => {
      if (config) {
        reset({
          clientId: config.clientId || '',
        });
      }
    }, [config, reset]);

    useImperativeHandle(
      ref,
      () => ({
        handleSave: async (): Promise<boolean> => {
          const isValid = await form.trigger();
          if (!isValid) {
            toast.error('Please correct the form errors');
            return false;
          }

          try {
            const formData = form.getValues();
            await updateMutation.mutateAsync({
              clientId: formData.clientId,
            });

            toast.success('Google authentication configured successfully');

            if (onSaveSuccess) {
              onSaveSuccess();
            }

            return true;
          } catch (error) {
            toast.error('Failed to save configuration');
            return false;
          }
        },
      }),
      [form, updateMutation, onSaveSuccess]
    );

    const recommendedRedirectUri =
      redirectUris?.recommendedRedirectUri || `${window.location.origin}/auth/google/callback`;

    if (isLoadingConfig) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <FormProvider {...form}>
        <div className="space-y-6">
          {/* Setup Instructions */}
          <Card className="p-4 rounded-xl border-primary/20 bg-primary/5">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-primary/10">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-sm font-medium text-foreground">Setup Instructions</h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>
                      Go to the{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Google Cloud Console
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Create a new OAuth 2.0 Client ID</li>
                    <li>Add the redirect URI and authorized origin below</li>
                    <li>Copy the Client ID and paste it below</li>
                  </ol>
                </div>
              </div>
            </div>
          </Card>

          {/* Redirect URIs */}
          <div className="space-y-4">
            <CopyField label="Redirect URI" value={recommendedRedirectUri} />

            <CopyField
              label="Authorized JavaScript Origin"
              value={redirectUris?.frontendBaseUrl || window.location.origin}
            />
          </div>

          {/* URI Mismatch Warning */}
          {redirectUris?.urisMismatch && (
            <Alert variant="default" className="rounded-xl border-amber-500/30 bg-amber-500/5">
              <AlertDescription className="text-sm text-amber-600 dark:text-amber-400">
                <p className="font-medium mb-1">Redirect URI mismatch detected</p>
                <p className="text-xs">
                  Current: {redirectUris.currentRedirectUri}
                  <br />
                  Configured: {redirectUris.recommendedRedirectUri}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Client ID Input */}
          <InputField
            control={control}
            name="clientId"
            label="Client ID"
            placeholder="Enter your Google OAuth Client ID"
            description="The client ID from your Google OAuth credentials"
            required
            IconComponent={Hash}
          />

          {/* Documentation Link */}
          <Alert className="rounded-xl border-border bg-muted/30">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm">
              Need help?{' '}
              <a
                href="https://docs.thero.com/auth/google"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View the documentation
              </a>
            </AlertDescription>
          </Alert>

          {updateMutation.isPending && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </FormProvider>
    );
  }
);

GoogleAuthForm.displayName = 'GoogleAuthForm';

export default GoogleAuthForm;
