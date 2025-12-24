import { useState } from 'react';
import googleIcon from '@iconify-icons/mdi/google';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingState from '@/components/ui/loader';

import { Iconify } from 'src/components/iconify';

interface GoogleSignInProps {
  email: string;
}

export default function GoogleSignIn({ email }: GoogleSignInProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const authUrl = `/auth/login/google?email=${encodeURIComponent(email)}`;
      const popupWidth = 500;
      const popupHeight = 600;
      const left = window.screen.width / 2 - popupWidth / 2;
      const top = window.screen.height / 2 - popupHeight / 2;

      const popup = window.open(
        authUrl,
        'Google Sign In',
        `width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=no,scrollbars=yes,status=no`
      );

      if (!popup) {
        throw new Error('Popup blocked! Please enable popups for this site.');
      }

      // Monitor the popup for closure
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          setLoading(false);
        }
      }, 1000);
    } catch (err) {
      setError('Failed to initialize Google sign-in. Please try again.');
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
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <Iconify icon={googleIcon} className="mr-2" />
        <LoadingState loading={loading}>Continue with Google</LoadingState>
      </Button>
    </div>
  );
}
