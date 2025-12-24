import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Key, Lock, Shield, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordField } from '@/components/ui/password-field';
import { Form } from '@/components/ui/form';
import { useRouter } from 'src/routes/hooks';
import { resetPassword } from '../../context/jwt';

export const ResetPasswordSchema = zod
  .object({
    newPassword: zod
      .string()
      .min(6, { message: 'Password must be at least 6 characters!' })
      .nonempty({ message: 'New Password is required!' }),
    confirmNewPassword: zod
      .string()
      .min(6, { message: 'Password must be at least 6 characters!' })
      .nonempty({ message: 'Confirm New Password is required!' }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  });

type ResetPasswordSchemaType = zod.infer<typeof ResetPasswordSchema>;

interface ErrorResponse {
  errorMessage: string;
}

export default function ResetPassword() {
  const location = useLocation();
  const router = useRouter();
  const navigate = useNavigate();

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isValidRoute, setIsValidRoute] = useState<boolean>(true);

  // Extract token from URL (query params or hash)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let token = params.get('token');

    // Check if token is in hash fragment
    if (!token && location.hash) {
      // Handle format like #token=xyz
      if (location.hash.includes('token=')) {
        token = location.hash.split('token=')[1];

        // Remove any additional hash parameters if present
        if (token.includes('&')) {
          token = token.split('&')[0];
        }
      }
    }

    if (token) {
      setResetToken(token);
      setIsValidRoute(true);
    } else {
      setIsValidRoute(false);
      setErrorMsg(
        'Password reset token is missing. This page is only accessible from a password reset email link.'
      );
    }
  }, [location]);

  const form = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });
  const { handleSubmit } = form;

  const onSubmit = async (data: ResetPasswordSchemaType): Promise<void> => {
    try {
      if (!resetToken) {
        setErrorMsg('Password reset token is missing. Please use the link from your email.');
        return;
      }

      setIsSubmitting(true);
      const { newPassword } = data;

      await resetPassword({ token: resetToken, newPassword });

      // Show success message
      setErrorMsg('');
      setSuccessMsg('Password has been reset successfully. Redirecting to login...');

      // Redirect after a short delay
      setTimeout(() => {
        router.replace('/auth/sign-in');
      }, 2000);
    } catch (error) {
      setErrorMsg(
        typeof error === 'string'
          ? error
          : (error as ErrorResponse).errorMessage || 'Failed to reset password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToSignIn = () => {
    navigate('/auth/sign-in');
  };

  return (
    <Card className="w-full max-w-[480px] mx-auto mt-4 backdrop-blur-xs dark:bg-card bg-neutral-100">
      <CardContent className="pt-5 pb-5">
        <div className="mb-5 text-center">
          <h1 className="mb-1 font-bold text-4xl dark:text-white text-black">Reset Password</h1>
          <p className="text-sm font-medium text-muted-foreground">
            {isValidRoute
              ? 'Please enter your new password below'
              : 'This page is only accessible from a password reset email link'}
          </p>
        </div>

        {!!errorMsg && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        {!!successMsg && (
          <Alert className="mb-3">
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        {!isValidRoute ? (
          <div className="text-center mt-3">
            <p className="text-sm text-muted-foreground mb-3">
              If you need to reset your password, please return to the sign-in page and use the
              &quot;Forgot Password&quot; option.
            </p>
            <Button className="w-full h-12" size="lg" onClick={handleNavigateToSignIn}>
              <LogIn className="mr-2 h-4 w-4" />
              Go to Sign In
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <PasswordField
                control={form.control}
                name="newPassword"
                label="New Password"
                autoFocus
                IconComponent={Lock}
              />

              <PasswordField
                control={form.control}
                name="confirmNewPassword"
                label="Confirm New Password"
                IconComponent={Shield}
              />

              <Button
                type="submit"
                className="w-full h-12 mt-2"
                size="lg"
                disabled={isSubmitting || !resetToken}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Reset Password
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
