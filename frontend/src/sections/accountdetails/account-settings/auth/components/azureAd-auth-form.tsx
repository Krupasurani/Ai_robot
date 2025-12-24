import { z } from 'zod';
import { Hash, Globe, Info, Loader2, ExternalLink } from 'lucide-react';
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

interface AzureAdAuthFormProps {
  onValidationChange: (isValid: boolean) => void;
  onSaveSuccess?: () => void;
}

export interface AzureAdAuthFormRef {
  handleSave: () => Promise<boolean>;
}

const azureAdAuthSchema = z.object({
  clientId: z
    .string()
    .min(1, { message: 'Application ID is required' })
    .min(8, { message: 'Application ID appears to be too short' }),
  tenantId: z
    .string()
    .min(1, { message: 'Tenant ID is required' })
    .min(4, { message: 'Tenant ID appears to be too short' }),
});

type AzureAdAuthFormData = z.infer<typeof azureAdAuthSchema>;

const getRedirectUris = async () => {
  const currentRedirectUri = `${window.location.origin}/auth/microsoft/callback`;

  try {
    const response = await axios.get(`/api/v1/configurationManager/frontendPublicUrl`);
    const frontendBaseUrl = response.data.url;
    const frontendUrl = frontendBaseUrl.endsWith('/')
      ? `${frontendBaseUrl}auth/microsoft/callback`
      : `${frontendBaseUrl}/auth/microsoft/callback`;

    return {
      currentRedirectUri,
      recommendedRedirectUri: frontendUrl,
      urisMismatch: currentRedirectUri !== frontendUrl,
    };
  } catch (error) {
    return {
      currentRedirectUri,
      recommendedRedirectUri: currentRedirectUri,
      urisMismatch: false,
    };
  }
};

const AzureAdAuthForm = forwardRef<AzureAdAuthFormRef, AzureAdAuthFormProps>(
  ({ onValidationChange, onSaveSuccess }, ref) => {
    const { data: config, isLoading: isLoadingConfig } = useAuthConfig('azureAd');
    const updateMutation = useUpdateAuthConfig('azureAd');

    const { data: redirectUris } = useQuery({
      queryKey: ['frontendPublicUrl', 'azureAd'],
      queryFn: getRedirectUris,
      staleTime: 1000 * 60 * 10, // 10 minutes
    });

    const form = useForm<AzureAdAuthFormData>({
      resolver: zodResolver(azureAdAuthSchema),
      mode: 'onChange',
      defaultValues: {
        tenantId: 'common',
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
          tenantId: config.tenantId || 'common',
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
              tenantId: formData.tenantId,
            });

            toast.success('Entra ID authentication configured successfully');

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
      redirectUris?.recommendedRedirectUri || `${window.location.origin}/auth/microsoft/callback`;

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
                        href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Azure Portal
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Register a new application or select existing</li>
                    <li>Add the redirect URI below to your app</li>
                    <li>Copy Application ID and Directory ID</li>
                  </ol>
                </div>
              </div>
            </div>
          </Card>

          {/* Redirect URI */}
          <CopyField label="Redirect URI" value={recommendedRedirectUri} />

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

          {/* Form Fields */}
          <div className="space-y-4">
            <InputField
              control={control}
              name="clientId"
              label="Application (Client) ID"
              placeholder="Enter your Entra Application ID"
              description="The Application (client) ID from your Entra ID app registration"
              required
              IconComponent={Hash}
            />

            <InputField
              control={control}
              name="tenantId"
              label="Directory (Tenant) ID"
              placeholder="Enter your Tenant ID or 'common'"
              description="Use 'common' for multi-tenant or your specific Entra tenant ID"
              required
              IconComponent={Globe}
            />
          </div>

          {/* Documentation Link */}
          <Alert className="rounded-xl border-border bg-muted/30">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm">
              Need help?{' '}
              <a
                href="https://docs.thero.com/auth/microsoft-azureAd"
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

AzureAdAuthForm.displayName = 'AzureAdAuthForm';

export default AzureAdAuthForm;
