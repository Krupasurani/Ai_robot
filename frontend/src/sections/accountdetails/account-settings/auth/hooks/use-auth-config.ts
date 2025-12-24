import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGoogleAuthConfig,
  getAzureAuthConfig,
  getMicrosoftAuthConfig,
  getSamlSsoConfig,
  getOAuthConfig,
  updateGoogleAuthConfig,
  updateAzureAuthConfig,
  updateMicrosoftAuthConfig,
  updateSamlSsoConfig,
  updateOAuthConfig,
  type GoogleAuthConfig,
  type AzureAuthConfig,
  type MicrosoftAuthConfig,
  type SamlSsoConfig,
  type OAuthConfig,
} from '../utils/auth-configuration-service';

export type AuthConfigType = 'google' | 'azureAd' | 'microsoft' | 'samlSso' | 'oauth';

type AuthConfigMap = {
  google: GoogleAuthConfig;
  azureAd: AzureAuthConfig;
  microsoft: MicrosoftAuthConfig;
  samlSso: SamlSsoConfig;
  oauth: OAuthConfig;
};

const QUERY_KEYS = {
  google: ['authConfig', 'google'] as const,
  azureAd: ['authConfig', 'azureAd'] as const,
  microsoft: ['authConfig', 'microsoft'] as const,
  samlSso: ['authConfig', 'samlSso'] as const,
  oauth: ['authConfig', 'oauth'] as const,
};

/**
 * Hook to fetch authentication configuration
 */
export function useAuthConfig<T extends AuthConfigType>(type: T) {
  return useQuery({
    queryKey: QUERY_KEYS[type],
    queryFn: async (): Promise<AuthConfigMap[T] | null> => {
      switch (type) {
        case 'google':
          return getGoogleAuthConfig() as Promise<AuthConfigMap[T] | null>;
        case 'azureAd':
          return getAzureAuthConfig() as Promise<AuthConfigMap[T] | null>;
        case 'microsoft':
          return getMicrosoftAuthConfig() as Promise<AuthConfigMap[T] | null>;
        case 'samlSso':
          return getSamlSsoConfig() as Promise<AuthConfigMap[T] | null>;
        case 'oauth':
          return getOAuthConfig() as Promise<AuthConfigMap[T] | null>;
        default:
          throw new Error(`Unknown auth config type: ${type}`);
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update authentication configuration
 */
export function useUpdateAuthConfig<T extends AuthConfigType>(type: T) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: AuthConfigMap[T]): Promise<void> => {
      switch (type) {
        case 'google':
          await updateGoogleAuthConfig(config as GoogleAuthConfig);
          break;
        case 'azureAd':
          await updateAzureAuthConfig(config as AzureAuthConfig);
          break;
        case 'microsoft':
          await updateMicrosoftAuthConfig(config as MicrosoftAuthConfig);
          break;
        case 'samlSso':
          await updateSamlSsoConfig(config as SamlSsoConfig);
          break;
        case 'oauth':
          await updateOAuthConfig(config as OAuthConfig);
          break;
        default:
          throw new Error(`Unknown auth config type: ${type}`);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch the config
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS[type] });
      // Also invalidate the general auth config list
      queryClient.invalidateQueries({ queryKey: ['authConfig'] });
    },
  });
}
