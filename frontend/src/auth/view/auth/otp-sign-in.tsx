import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';
import { sendOtp, VerifyOtp } from 'src/auth/context/jwt';
import LoadingState from '@/components/ui/loader';

// Schema for OTP
const OtpSchema = zod.object({
  otp: zod
    .string()
    .min(1, { message: 'OTP is required!' })
    .length(6, { message: 'OTP must be 6 digits!' })
    .regex(/^\d+$/, { message: 'OTP must contain only numbers!' }),
});

type OtpSchemaType = zod.infer<typeof OtpSchema>;

interface ErrorResponse {
  errorMessage: string;
}

interface OtpSignInProps {
  email: string;
  initialOtpSent?: boolean; // Flag to indicate OTP was already sent
  onNextStep?: (response: any) => void;
  onAuthComplete?: () => void;
  redirectPath?: string;
  className?: string;
}

export default function OtpSignIn({
  email,
  initialOtpSent = false,
  onNextStep,
  onAuthComplete,
  redirectPath = paths.dashboard.root,
  className,
}: OtpSignInProps) {
  const router = useRouter();
  const { checkUserSession } = useAuthContext();

  const [countdown, setCountdown] = useState(60);
  const [otpSent, setOtpSent] = useState(initialOtpSent);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingInitial, setSendingInitial] = useState(false);
  const initialSendAttempted = useRef(initialOtpSent);

  const form = useForm<OtpSchemaType>({
    resolver: zodResolver(OtpSchema),
    defaultValues: {
      otp: '',
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = form;

  // Send OTP only once on component mount and only if not already sent
  useEffect(() => {
    // Only try to send OTP if we haven't tried already and initialOtpSent is false
    if (!initialSendAttempted.current && !otpSent && !sendingInitial && !initialOtpSent) {
      const sendInitialOtp = async () => {
        initialSendAttempted.current = true;
        setSendingInitial(true);
        try {
          await sendOtp({ email });
          setOtpSent(true);
        } catch (error) {
          setError('root.serverError', {
            type: 'server',
            message: 'Failed to send OTP. Please try again.',
          });
        } finally {
          setSendingInitial(false);
        }
      };

      sendInitialOtp();
    }
  }, [email, otpSent, setError, sendingInitial, initialOtpSent]);

  // Countdown timer after sending OTP
  useEffect(() => {
    if (otpSent && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined; // Explicit return for when the condition isn't met
  }, [otpSent, countdown]);

  const handleResendOtp = async () => {
    if (resending) return;

    setResending(true);
    try {
      await sendOtp({ email });
      setOtpSent(true);
      setCountdown(60);
    } catch (error) {
      setError('root.serverError', {
        type: 'server',
        message: 'Failed to resend OTP. Please try again.',
      });
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async (data: OtpSchemaType) => {
    if (verifying) return;

    setVerifying(true);
    try {
      const response = await VerifyOtp({
        email,
        otp: data.otp,
      });

      // Check the response
      if (response && response.nextStep !== undefined && onNextStep) {
        // We need to move to the next authentication step
        onNextStep(response);
      } else {
        // Authentication is complete
        await checkUserSession?.();
        // router.refresh();
        if (onAuthComplete) {
          onAuthComplete();
        } else {
          // Navigate to specified redirect path after successful login
          router.push('/');
        }
      }
    } catch (error) {
      const errorMessage =
        typeof error === 'string' ? error : (error as ErrorResponse)?.errorMessage;

      setError('root.serverError', {
        type: 'server',
        message: errorMessage || 'OTP verification failed. Please try again.',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Show server error if any */}
          {errors.root?.serverError && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.serverError.message}</AlertDescription>
            </Alert>
          )}

          {/* OTP sent confirmation */}
          <Alert>
            <AlertDescription>
              {sendingInitial ? (
                'Sending one-time password to your email...'
              ) : (
                <>
                  A one-time password has been sent to your email address: <strong>{email}</strong>
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* OTP input field */}
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enter 6-digit OTP</FormLabel>
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    disabled={sendingInitial}
                    {...field}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Resend OTP option */}
          <div className="flex justify-center mt-1">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">Resend OTP in {countdown} seconds</p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendOtp}
                disabled={resending || sendingInitial}
              >
                <LoadingState loading={resending}>Resend OTP</LoadingState>
              </Button>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || verifying || sendingInitial}
          >
            <LoadingState loading={isSubmitting || verifying || sendingInitial}>
              Verify OTP
            </LoadingState>
          </Button>
        </form>
      </Form>
    </div>
  );
}
