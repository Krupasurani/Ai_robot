import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import checkIcon from '@iconify-icons/mdi/check';
import errorIcon from '@iconify-icons/mdi/error';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import axios from 'src/utils/axios';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

export default function ConnectorOAuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { connectorName } = useParams<{ connectorName: string }>();
  const { user } = useAuthContext();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const oauthError = searchParams.get('error');

        // Validate connector name from URL params
        if (!connectorName) {
          throw new Error('No connector name found in URL');
        }

        // Handle OAuth errors
        if (oauthError) {
          throw new Error(`OAuth error: ${oauthError}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        if (!state) {
          throw new Error('No state parameter received');
        }

        setMessage('Processing OAuth authentication...');

        // Call Node.js backend to handle OAuth callback
        const response = await axios.get(
          `${CONFIG.backendUrl}/api/v1/connectors/${connectorName}/oauth/callback?code=${code}&state=${state}&error=${oauthError}`,
          {
            params: {
              baseUrl: window.location.origin,
            },
          }
        );

        // Prefer JSON redirectUrl for client-side navigation (prevents CORS on redirects)
        if (response?.data?.redirectUrl) {
          const {redirectUrl} = response.data;
          setStatus('success');
          setMessage('OAuth authentication successful! Redirecting...');
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 500);
          return;
        }

        // If not a JSON redirect, handle as normal response
        const responseData = response.data || {};

        // Success - redirect to connector settings page
        setStatus('success');
        setMessage('OAuth authentication successful! Redirecting to connector page...');

        // Determine redirect path based on account type
        const isBusiness = user?.accountType === 'business' || user?.accountType === 'organization';
        const basePath = isBusiness
          ? '/account/company-settings/settings/connector'
          : '/account/individual/settings/connector';
        const redirectPath = `${basePath}/${connectorName}`;

        // Redirect after a short delay
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'OAuth authentication failed');
        setMessage('OAuth authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate, user, connectorName]);

  const handleRetry = () => {
    // Redirect back to connector settings
    const isBusiness = user?.accountType === 'business' || user?.accountType === 'organization';
    const basePath = isBusiness
      ? '/account/company-settings/settings/connector'
      : '/account/individual/settings/connector';
    if (connectorName) {
      navigate(`${basePath}/${connectorName}`, { replace: true });
    } else {
      navigate(basePath, { replace: true });
    }
  };

  const handleGoToConnector = () => {
    if (connectorName) {
      const isBusiness = user?.accountType === 'business' || user?.accountType === 'organization';
      const basePath = isBusiness
        ? '/account/company-settings/settings/connector'
        : '/account/individual/settings/connector';
      navigate(`${basePath}/${connectorName}`, { replace: true });
    }
  };

  return (
    <div className="flex w-full justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-[32px] border border-border/70 bg-white/80 px-6 py-12 text-center shadow-2xl backdrop-blur-lg dark:bg-card/80">
          {status === 'processing' && (
            <>
              <div className="mb-6 flex items-center justify-center">
                <div className="h-20 w-20 rounded-full border-[6px] border-border/50 border-t-primary/80 animate-spin" />
                <span className="sr-only">Processing authentication</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {message || 'Processing OAuth authentication...'}
              </p>
              <p className="mt-3 text-base text-muted-foreground">
                Please wait while we complete your authentication...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl">
                <Iconify icon={checkIcon} width={40} height={40} />
              </div>
              <p className="text-2xl font-semibold text-emerald-500">Authentication Successful!</p>
              <p className="mt-3 text-base text-muted-foreground">{message}</p>
              {connectorName && (
                <Button className="mt-6" onClick={handleGoToConnector}>
                  Go to {connectorName} Settings
                </Button>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive text-white shadow-xl">
                <Iconify icon={errorIcon} width={40} height={40} />
              </div>
              <p className="text-2xl font-semibold text-destructive">Authentication Failed</p>
              <div className="mt-4 w-full rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-left text-sm text-destructive">
                {error || 'OAuth authentication failed. Please try again.'}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={handleRetry}>
                  Back to Connectors
                </Button>
                {connectorName && (
                  <Button onClick={handleGoToConnector}>
                    Try Again
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
