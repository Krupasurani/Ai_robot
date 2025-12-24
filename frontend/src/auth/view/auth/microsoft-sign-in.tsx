import { useState } from 'react';
import microsoftIcon from '@iconify-icons/mdi/microsoft';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingState from '@/components/ui/loader';

import { Iconify } from 'src/components/iconify';

interface MicrosoftSignInProps {
  email: string;
}

export default function MicrosoftSignIn({ email }: MicrosoftSignInProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Initialize Microsoft OAuth flow
      window.location.href = `/api/auth/microsoft/login?email=${encodeURIComponent(email)}`;
    } catch (err) {
      setError('Failed to initialize Microsoft sign in. Please try again.');
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
        onClick={handleMicrosoftLogin}
        disabled={loading}
      >
        <Iconify icon={microsoftIcon} className="mr-2" />
        <LoadingState loading={loading}>Continue with Microsoft</LoadingState>
      </Button>
    </div>
  );
}
