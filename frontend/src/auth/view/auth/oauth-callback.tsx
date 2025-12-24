import { Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Alert } from '@/components/ui/alert';

import { CONFIG } from 'src/config-global';

export default function OAuthCallback() {
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const oauthError = urlParams.get('error');

        if (oauthError) {
          throw new Error(`OAuth error: ${oauthError}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        if (!state) {
          throw new Error('No state parameter received');
        }

        // Parse and validate state parameter
        let stateData;
        try {
          stateData = JSON.parse(atob(state));
        } catch {
          throw new Error('Invalid state parameter');
        }

        const { email, provider } = stateData;

        if (!email || !provider || typeof email !== 'string' || typeof provider !== 'string') {
          throw new Error('Invalid state data');
        }

        // Exchange code for tokens
        const requestBody = {
          code,
          email,
          provider,
          redirectUri: `${window.location.origin}/auth/oauth/callback`,
        };

        const response = await fetch(`${CONFIG.backendUrl}/api/v1/userAccount/oauth/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to exchange authorization code for tokens: ${response.status} - ${errorText}`
          );
        }

        const tokens = await response.json();

        // Send tokens to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'OAUTH_SUCCESS',
              accessToken: tokens.access_token,
            },
            window.location.origin
          );
        }

        // Close the popup
        window.close();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth authentication failed');

        // Send error to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'OAUTH_ERROR',
              error: err instanceof Error ? err.message : 'OAuth authentication failed',
            },
            window.location.origin
          );
        }
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="mb-4 max-w-[400px] flex items-center justify-between">
          <span>{error}</span>
          <button
            className="ml-4 text-gray-500 hover:text-gray-800 dark:hover:text-white focus:outline-none"
            onClick={() => window.close()}
            aria-label="Close"
            type="button"
          >
            X
          </button>
        </Alert>
        <span className="text-sm dark:text-gray-300 text-gray-400">You can close this window</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader className="animate-spin mb-2 w-8 h-8 grayscale-25" />
      <p
        className="text-base font-normal leading-6 text-black dark:text-gray-200 m-0"
      >
        Processing OAuth authentication...
      </p>
      <p
        className="text-sm font-normal leading-[1.43] text-black/60 dark:text-gray-400 mt-2 mb-0"
      >
        Please wait while we complete your sign-in
      </p>
    </div>
  );
}
