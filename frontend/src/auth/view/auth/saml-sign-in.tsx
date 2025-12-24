import { useState } from 'react';
import LoadingState from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CONFIG } from 'src/config-global';
import { SESSION_TOKEN_KEY } from 'src/auth/context/jwt';

interface SamlSignInProps {
  email: string;
}

export default function SamlSignIn({ email }: SamlSignInProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSamlLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Redirect to SAML entry point
      const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
      window.location.href = `${CONFIG.authUrl}/api/v1/saml/signIn?email=${email}&sessionToken=${sessionToken}`;
    } catch (err) {
      setError('Failed to initialize SSO. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        Continue to sign in with your organization&apos;s SSO provider
      </p>

      <Button className="w-full" size="lg" onClick={handleSamlLogin} disabled={loading}>
        <LoadingState loading={loading}>Continue with SSO</LoadingState>
      </Button>
    </div>
  );
}
