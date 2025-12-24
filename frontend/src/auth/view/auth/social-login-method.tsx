import React from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import MicrosoftLoginButton from 'src/auth/components/microsoft-login-button';
import OAuthSignIn from './oauth-sign-in';

interface AuthStep {
  step: number;
  methods: string[];
  authProviders: Record<string, any>;
}

interface SocialConfig {
  google?: {
    icon: any;
    label: string;
    color: string;
  };
  microsoft?: {
    icon: any;
    label: string;
    color: string;
  };
  azureAd?: {
    icon: any;
    label: string;
    color: string;
  };
  oauth?: {
    icon: string;
    label: string;
    color: string;
  };
}

interface SocialLoginMethodProps {
  method: string;
  currentStep: AuthStep | null;
  emailFromStore: string;
  socialConfig: SocialConfig;
  onGoogleSuccess: (response: any) => void;
  onMsalSuccess: (response: any) => void;
  onOAuthSuccess: (credentials: { accessToken?: string; idToken?: string }) => void;
  onError: (errorMessage: string) => void;
}

export const SocialLoginMethod: React.FC<SocialLoginMethodProps> = ({
  method,
  currentStep,
  emailFromStore,
  socialConfig,
  onGoogleSuccess,
  onMsalSuccess,
  onOAuthSuccess,
  onError,
}) => {
  const config = socialConfig[method as keyof typeof socialConfig];

  if (method === 'google') {
    const clientId = currentStep?.authProviders?.google?.clientId;

    if (!clientId) {
      return null;
    }

    return (
      <GoogleOAuthProvider key={method} clientId={clientId}>
        <div className="w-full">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => {
              onError('Google login failed. Please try again.');
            }}
            useOneTap
            type="standard"
            theme="outline"
            size="large"
            width="100%"
            logo_alignment="center"
            shape="rectangular"
            text="continue_with"
          />
        </div>
      </GoogleOAuthProvider>
    );
  }

  if (method === 'microsoft' || method === 'azureAd') {
    // Get the appropriate client ID and authority from providers
    let clientId;
    let authority;

    if (method === 'microsoft') {
      clientId = currentStep?.authProviders?.microsoft?.clientId;
      authority =
        currentStep?.authProviders?.microsoft?.authority ||
        'https://login.microsoftonline.com/common';
    } else {
      // azureAd
      clientId = currentStep?.authProviders?.azuread?.clientId;
      authority =
        currentStep?.authProviders?.azureAd?.authority ||
        'https://login.microsoftonline.com/common';
    }

    if (!clientId) {
      return null;
    }

    return (
      <MicrosoftLoginButton
        key={method}
        config={config as any}
        method={method}
        clientId={clientId}
        authority={authority}
        onSuccess={async (response) => {
          await onMsalSuccess(response);
        }}
        onError={onError}
      />
    );
  }

  if (method === 'oauth') {
    const oauthConfig = currentStep?.authProviders?.oauth;

    if (!oauthConfig) {
      return null;
    }

    return (
      <OAuthSignIn
        key={method}
        email={emailFromStore}
        authConfig={oauthConfig}
        onSuccess={onOAuthSuccess}
        onError={onError}
      />
    );
  }

  return null;
};
