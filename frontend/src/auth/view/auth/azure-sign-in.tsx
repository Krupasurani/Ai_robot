import { useState } from 'react';
import microsoftAzureIcon from '@iconify-icons/mdi/microsoft-azure';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingState from '@/components/ui/loader';

import { Iconify } from 'src/components/iconify';

interface AzureAdSignInProps {
  email: string;
}

export default function AzureAdSignIn({ email }: AzureAdSignInProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAzureLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Initialize Entra ID OAuth flow
      window.location.href = `/api/auth/azure/login?email=${encodeURIComponent(email)}`;
    } catch (err) {
      setError('Failed to initialize Entra ID sign in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleAzureLogin}
        disabled={loading}
      >
        <Iconify icon={microsoftAzureIcon} className="mr-2" />
        <LoadingState loading={loading}>Continue with Entra ID</LoadingState>
      </Button>
    </div>
  );
}
