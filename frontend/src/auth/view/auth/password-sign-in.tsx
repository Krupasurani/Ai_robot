import { z as zod } from 'zod';
import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingState from '@/components/ui/loader';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Mail, AlertTriangleIcon } from 'lucide-react';
import { InputField } from '@/components/ui/input-field';
import { PasswordField } from '@/components/ui/password-field';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { Form } from 'src/components/hook-form';
import { useAuthContext } from 'src/auth/hooks';
import { signInWithPassword } from 'src/auth/context/jwt';

// Schema for sign in
const SignInSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  password: zod.string().min(1, { message: 'Password is required!' }),
});

type SignInSchemaType = zod.infer<typeof SignInSchema>;

interface ErrorResponse {
  errorMessage: string;
}

// Response type for authentication
interface AuthResponse {
  status?: string;
  nextStep?: number;
  allowedMethods?: string[];
  authProviders?: Record<string, any>;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

interface PasswordSignInProps {
  email: string;
  onNextStep?: (response: AuthResponse) => void;
  onAuthComplete?: () => void;
  onForgotPassword: () => void;
  redirectPath?: string;
}

export default function PasswordSignIn({
  email,
  onNextStep,
  onAuthComplete,
  onForgotPassword,
  redirectPath = paths.dashboard.root,
}: PasswordSignInProps) {
  const router = useRouter();
  const { checkUserSession } = useAuthContext();
  const [isProcessing, setIsProcessing] = useState(false);

  const methods = useForm<SignInSchemaType>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: email || '',
      password: '',
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = methods;

  // Update email field when email prop changes
  useEffect(() => {
    if (email) {
      setValue('email', email);
    }
  }, [email, setValue]);

  const onSubmit = async (data: SignInSchemaType) => {
    setIsProcessing(true);
    try {
      const response = await signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Check the response
      if (response) {
        if (response.nextStep && response.allowedMethods && response.allowedMethods.length > 0) {
          // We need to go to the next authentication step
          if (onNextStep) {
            onNextStep(response);
          }
        } else if (response.accessToken && response.refreshToken) {
          // Authentication is complete, proceed with login
          await checkUserSession?.();
          // router.refresh();
          if (onAuthComplete) {
            onAuthComplete();
          } else {
            // Navigate to specified redirect path after successful login
            router.push('/');
          }
        } else {
          // Unexpected response format
          setError('root.serverError', {
            type: 'server',
            message: 'Unexpected response from the server. Please try again.',
          });
        }
      }
    } catch (error) {
      const errorMessage =
        typeof error === 'string' ? error : (error as ErrorResponse)?.errorMessage;

      setError('root.serverError', {
        type: 'server',
        message: errorMessage || 'Authentication failed. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full rounded-sm">
      <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <div className={cn('flex flex-col gap-2 ')}>
          {/* Show server error if any */}
          {errors.root?.serverError && (
            <Alert variant="destructive" className="bg-red-500/10 relative">
              <AlertTriangleIcon />
              <AlertTitle> {errors.root.serverError.message}</AlertTitle>
            </Alert>
          )}

          {/* Email field (disabled as it's already provided) */}
          <InputField
            control={methods.control}
            name="email"
            label="Email address"
            type="email"
            disabled
            IconComponent={Mail}
            className="mb-2"
          />

          {/* Password field with forgot password link */}
          <div>
            <PasswordField
              control={methods.control}
              name="password"
              label="Password"
              placeholder="*********"
              autoFocus
              required
              className="mb-1"
            />
            <Button
              variant="link"
              type="button"
              onClick={onForgotPassword}
              className="mt-1 p-0 m-0 inline-block cursor-pointer hover:no-underline"
              tabIndex={0}
              role="button"
            >
              <p className="text-sm text-primary hover:text-primary/90">Forgot Password?</p>
            </Button>
          </div>

          {/* Submit button */}
          <Button
            // loading={isSubmitting || isProcessing}
            type="submit"
          >
            <LoadingState loading={isSubmitting || isProcessing}>Continue</LoadingState>
          </Button>
        </div>
      </Form>
    </div>
  );
}
