import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputField } from '@/components/ui/input-field';
import { PasswordField } from '@/components/ui/password-field';
import LoadingState from '@/components/ui/loader';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { Form } from 'src/components/hook-form';
import { signUp } from '../../context/jwt';
import { useAuthContext } from '../../hooks';
import { SignUpTerms } from '../../components/sign-up-terms';
import { Link } from 'react-router-dom';

export const SignUpSchema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
});

export function JwtSignUpView() {
  const { checkUserSession } = useAuthContext();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string>('');

  const defaultValues = {
    firstName: 'Hello',
    lastName: 'Friend',
    email: 'hello@gmail.com',
    password: '@demo1',
  };

  const methods = useForm({
    resolver: zodResolver(SignUpSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      await checkUserSession?.();
      router.refresh();
    } catch (error) {
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  return (
    <>
      <div className="flex flex-col gap-3 mb-8 whitespace-pre-line text-center md:text-left">
        <h2 className="text-2xl font-semibold">Get started absolutely free</h2>
        <p className="text-sm text-muted-foreground">
          {`Already have an account? `}
          <Button variant="link" asChild className="p-0 h-auto font-normal">
            <Link to={paths.auth.jwt.signIn}>Sign in</Link>
          </Button>
        </p>
      </div>

      {!!errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
            <InputField
              control={control}
              name="firstName"
              label="First name"
              placeholder="Enter your first name"
              required
              IconComponent={User}
              className="flex-1"
            />
            <InputField
              control={control}
              name="lastName"
              label="Last name"
              placeholder="Enter your last name"
              required
              IconComponent={User}
              className="flex-1"
            />
          </div>

          <InputField
            control={control}
            name="email"
            label="Email address"
            type="email"
            placeholder="Enter your email"
            required
            IconComponent={Mail}
            autoComplete="email"
          />

          <PasswordField
            control={control}
            name="password"
            label="Password"
            placeholder="6+ characters"
            required
          />

          <Button type="submit" size="lg" className="w-full rounded-sm" disabled={isSubmitting}>
            <LoadingState loading={isSubmitting}>Create account</LoadingState>
          </Button>
        </div>
      </Form>

      <SignUpTerms />
    </>
  );
}
