import type { AuthState } from 'src/store/authSlice';
import type { AuthResponse } from 'src/auth/context/jwt';

import { z as zod } from 'zod';
import { cn } from '@/utils/cn';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { InputField } from '@/components/ui/input-field';
import { Form } from '@/components/ui/form';
// Import specific icons
import googleIcon from '@iconify-icons/mdi/google';
import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingState from '@/components/ui/loader';
import { useDispatch, useSelector } from 'react-redux';
import microsoftIcon from '@iconify-icons/mdi/microsoft';
import { Card, CardContent } from '@/components/ui/card';
import shieldAccountIcon from '@iconify-icons/mdi/shield-account';
import passwordIcon from '@iconify-icons/mdi/form-textbox-password';
import microsoftAzureIcon from '@iconify-icons/mdi/microsoft-azure';
import cellphoneMessageIcon from '@iconify-icons/mdi/cellphone-message';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { ErrorType, withErrorHandling } from 'src/utils/axios';
import { setEmail } from 'src/store/authSlice';
import { Iconify } from 'src/components/iconify';
import { useAuthContext } from 'src/auth/hooks';
import {
  sendOtp,
  OrgExists,
  authInitConfig,
  forgotPassword,
  SignInWithOAuth,
  SignInWithGoogle,
  SignInWithAzureAd,
  SignInWithMicrosoft,
} from 'src/auth/context/jwt';

import OtpSignIn from './otp-sign-in';
import SamlSignIn from './saml-sign-in';
import PasswordSignIn from './password-sign-in';
import { SocialLoginMethod } from './social-login-method';

interface RootState {
  auth: AuthState;
}

interface LazyOtpSignInProps {
  email: string;
  onNextStep?: (response: any) => void;
  onAuthComplete?: () => void;
  onForgotPassword?: () => void;
  [key: string]: any; // For other props
}

// Schema for initial email validation
const InitialSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
});

type InitialSchemaType = zod.infer<typeof InitialSchema>;

interface AuthStep {
  step: number;
  methods: string[];
  authProviders: Record<string, any>;
}

// Tab configuration
const tabConfig = {
  password: {
    icon: passwordIcon,
    label: 'Password',
    component: PasswordSignIn,
  },
  otp: {
    icon: cellphoneMessageIcon,
    label: 'OTP',
    component: LazyOtpSignIn,
  },
  samlSso: {
    icon: shieldAccountIcon,
    label: 'SSO',
    component: SamlSignIn,
  },
};

// Custom Lazy OTP component that prevents auto-sending on mount
function LazyOtpSignIn({ email, ...otherProps }: LazyOtpSignInProps) {
  const [sendOtpClicked, setSendOtpClicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasAttemptedSend = useRef(false);

  if (!sendOtpClicked) {
    return (
      <div className="w-full text-center">
        <Alert className="mb-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <AlertDescription>
            Click the button below to receive a one-time password via email
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-2 text-destructive hover:text-destructive/80"
                aria-label="Close"
              >
                ×
              </button>
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          className="w-full mt-2"
          disabled={loading}
          onClick={() => {
            // Prevent multiple clicks/calls
            if (loading || hasAttemptedSend.current) return;

            setLoading(true);
            hasAttemptedSend.current = true;

            // Send OTP when the user explicitly requests it
            sendOtp({ email })
              .then(() => {
                setSendOtpClicked(true);
              })
              .catch((err) => {
                console.error('Error sending OTP:', err);
                setError('Failed to send OTP. Please try again.');
                hasAttemptedSend.current = false;
              })
              .finally(() => {
                setLoading(false);
              });
          }}
        >
          <LoadingState loading={loading}>Send OTP</LoadingState>
        </Button>
      </div>
    );
  }

  // To prevent the OtpSignIn from automatically sending another OTP,
  // we modify the props to pass an initialOtpSent flag
  return <OtpSignIn email={email} {...otherProps} initialOtpSent />;
}

// Social login configuration
const socialConfig = {
  google: {
    icon: googleIcon,
    label: 'Continue with Google',
    color: '#DB4437',
  },
  microsoft: {
    icon: microsoftIcon,
    label: 'Continue with Microsoft',
    color: '#00A4EF',
  },
  azureAd: {
    icon: microsoftAzureIcon,
    label: 'Continue with Entra ID',
    color: '#0078D4',
  },
  oauth: {
    icon: 'mdi:key-variant',
    label: 'Continue with OAuth',
    color: '#6366F1',
  },
};

export const AuthenticationView = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [authSteps, setAuthSteps] = useState<AuthStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedTabs, setSelectedTabs] = useState<number[]>([0, 0]); // Track selected tab for each step
  const emailFromStore = useSelector((state: RootState) => state.auth.email);
  const { checkUserSession } = useAuthContext();
  const navigate = useNavigate();

  // Prevent components from auto-initializing when steps change
  const componentMountRef = useRef(false);

  const methods = useForm<InitialSchemaType>({
    resolver: zodResolver(InitialSchema),
    defaultValues: {
      email: emailFromStore || '',
    },
  });

  const { handleSubmit } = methods;

  // Get current authentication step
  const currentStep = authSteps[currentStepIndex] || null;
  const selectedTab = selectedTabs[currentStepIndex] || 0;

  // Initial authentication configuration
  const onSubmit = async (data: InitialSchemaType) => {
    setLoading(true);
    setError('');
    try {
      const response = await authInitConfig(data.email);
      if (response) {
        // Initialize first auth step
        const newStep: AuthStep = {
          step: response.currentStep,
          methods: response.allowedMethods,
          authProviders: response.authProviders || {},
        };

        setAuthSteps([newStep]);
        setCurrentStepIndex(0);
        setSelectedTabs([0, 0]); // Reset tab selections
        dispatch(setEmail(data.email));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  // Handle the next step in MFA
  const handleNextAuthStep = (response: AuthResponse) => {
    if (response.nextStep !== undefined && response.allowedMethods) {
      // Create a new auth step
      const newStep: AuthStep = {
        step: response.nextStep,
        methods: response.allowedMethods,
        authProviders: response.authProviders || {},
      };

      // Add the new step to our steps array
      setAuthSteps((prev) => [...prev, newStep]);
      setCurrentStepIndex((prev) => prev + 1);

      // Reset our component mount ref for the new step
      componentMountRef.current = false;
    }
  };

  // Handle successful authentication
  const handleAuthComplete = () => {
    checkUserSession?.();
    // router.push('/');
    navigate('/');
  };

  // Handle Google login success
  const handleGoogleLoginSuccess = async (response: any) => {
    try {
      const { credential } = response;
      if (!credential) {
        throw new Error('No credential received from Google');
      }

      setLoading(true);
      const authResponse = await SignInWithGoogle({ credential });

      // Check if this is the final step
      if (authResponse.accessToken && authResponse.refreshToken) {
        handleAuthComplete();
      } else if (authResponse.nextStep !== undefined) {
        handleNextAuthStep(authResponse);
      }
    } catch (err) {
      console.error('Google login failed', err);
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Microsoft/Azure login success
  const handleMsalLoginSuccess = async (response: any) => {
    try {
      const { credential, method } = response;
      if (!credential) {
        throw new Error(`No credential received from ${method}`);
      }

      setLoading(true);
      let authResponse;

      if (method === 'microsoft') {
        authResponse = await SignInWithMicrosoft(credential);
      } else {
        // azureAd
        authResponse = await SignInWithAzureAd(credential);
      }

      // Check if this is the final step
      if (authResponse.accessToken && authResponse.refreshToken) {
        handleAuthComplete();
      } else if (authResponse.nextStep !== undefined) {
        handleNextAuthStep(authResponse);
      }
    } catch (err) {
      console.error('Microsoft/Azure login failed', err);
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth login success
  const handleOAuthLoginSuccess = async (credentials: {
    accessToken?: string;
    idToken?: string;
  }) => {
    try {
      if (!credentials.accessToken && !credentials.idToken) {
        throw new Error('No credentials received from OAuth provider');
      }

      setLoading(true);
      const authResponse = await SignInWithOAuth(credentials);

      // Check if this is the final step
      if (authResponse.accessToken && authResponse.refreshToken) {
        handleAuthComplete();
      } else if (authResponse.nextStep !== undefined) {
        handleNextAuthStep(authResponse);
      }
    } catch (err) {
      console.error('OAuth login failed', err);
      setError('OAuth authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    // Update the selected tab for the current step
    const newSelectedTabs = [...selectedTabs];
    newSelectedTabs[currentStepIndex] = newValue;
    setSelectedTabs(newSelectedTabs);

    // Reset component mount ref when a new tab is selected
    componentMountRef.current = false;
  };

  const handleBack = () => {
    // Always go back to email form
    setAuthSteps([]);
    setCurrentStepIndex(0);
    setSelectedTabs([0, 0]);
    componentMountRef.current = false;
  };

  const handleForgotPassword = () => {
    // Attempt to use email from store; if missing, try to read current form value
    const fallbackEmail = (methods.getValues && methods.getValues('email')) || '';
    const email = emailFromStore || fallbackEmail;

    // Make sure we have an email address
    if (!email) {
      setError('Email address is required to reset password.');
      return;
    }

    // Show loading indicator
    setLoading(true);

    // Use the withErrorHandling wrapper for consistent error processing
    withErrorHandling(
      async () => {
        await forgotPassword({ email });

        // Show success message
        toast.success('Password reset instructions have been sent to your email.');
      },
      (processedError) => {
        // Handle specific error types
        if (
          processedError.type === ErrorType.NETWORK_ERROR ||
          processedError.type === ErrorType.TIMEOUT_ERROR
        ) {
          setError(
            'Network error. Unable to connect to server. Please check your internet connection.'
          );
        } else if (processedError.type === ErrorType.VALIDATION_ERROR) {
          setError(processedError.message || 'Please provide a valid email address.');
        } else {
          setError(
            processedError.message || 'Failed to send password reset email. Please try again later.'
          );
        }
      }
    ).finally(() => {
      setLoading(false);
    });
  };

  // Track when components have mounted to prevent re-initializing
  useEffect(() => {
    if (currentStep) {
      componentMountRef.current = true;
    }
  }, [currentStep, selectedTab]);

  useEffect(() => {
    const checkOrgExists = async () => {
      try {
        const response = await OrgExists();
        if (response.exists === false) {
          toast.error('Set up account to continue');
          navigate('/auth/sign-up');
        }
        // If org exists, stay on sign-in page (no need to navigate to current page)
      } catch (err) {
        console.error('Error checking if organization exists:', err);
        // On API error, show error message but stay on sign-in page
        // User can manually navigate to sign-up if this is a fresh setup
        setError(
          'Unable to connect to server. If this is a new installation, please go to /auth/sign-up to set up your account.'
        );
      }
    };

    checkOrgExists();
    // eslint-disable-next-line
  }, []);

  // Initial email form
  if (authSteps.length === 0) {
    return (
      <Card
        className={cn(
          'w-full max-w-[450px] mx-auto mt-4 backdrop-blur-xs bg-background',
          error && 'border border-red-500'
        )}
      >
        <CardContent className="py-5">
          <div className="mb-5 text-center">
            <h1 className="mb-1 font-bold text-4xl text-foreground">Welcome</h1>

            <p className="mb-1 text-sm font-medium text-foreground">
              Sign in to continue to your account
            </p>
          </div>
          <Form {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <InputField
                control={methods.control}
                name="email"
                label="Email address"
                type="email"
                placeholder="m@example.com"
                autoFocus
                className="mb-5"
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full font-bold cursor-pointer bg-primary text-primary-foreground"
              >
                <LoadingState loading={loading}>Continue</LoadingState>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  if (!currentStep) {
    return null;
  }

  // Split methods into tabs and social logins
  const tabMethods = currentStep.methods.filter((method) =>
    ['password', 'otp', 'samlSso'].includes(method)
  );

  const socialMethods = currentStep.methods.filter((method) =>
    ['google', 'microsoft', 'azureAd', 'oauth'].includes(method)
  );

  return (
    <Card className="w-full max-w-[480px] mx-auto mt-4 backdrop-blur-xs bg-background">
      <CardContent className="p-2">
        {/* Header with back button */}
        <div className="flex items-center mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleBack}
                variant="ghost"
                className="mr-2 text-primary hover:bg-muted rounded-lg cursor-pointer"
              >
                <ChevronLeft size={24} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="shadow">Back</TooltipContent>
          </Tooltip>

          <div>
            <h6 className="font-semibold">Sign in</h6>
            <span className="text-primary mt-0.5 text-xs">{emailFromStore}</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-2 text-destructive hover:text-destructive/80"
                aria-label="Close"
              >
                ×
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tab-based Authentication UI - Both steps use the same UI pattern */}
        {tabMethods.length > 0 && (
          <>
            {/* Tab navigation - Always show tabs if methods exist */}
            <Tabs
              value={selectedTab.toString()}
              onValueChange={(value) => handleTabChange(null as any, parseInt(value, 10))}
              className="mb-4"
            >
              <TabsList
                className={cn('grid w-full', `grid-cols-[repeat(${tabMethods.length},1fr)]`)}
              >
                {tabMethods.map((method, index) => {
                  const config = tabConfig[method as keyof typeof tabConfig];
                  return (
                    <TabsTrigger
                      key={method}
                      value={index.toString()}
                      className="flex items-center gap-1.5"
                    >
                      <Iconify icon={config.icon} width={22} />
                      {config.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Authentication component */}
              {tabMethods.map((method, index) => {
                const config = tabConfig[method as keyof typeof tabConfig];
                const Component = config.component;
                return (
                  <TabsContent key={method} value={index.toString()}>
                    {Component && (
                      <div className="relative">
                        <Component
                          email={emailFromStore}
                          onNextStep={handleNextAuthStep}
                          onAuthComplete={handleAuthComplete}
                          onForgotPassword={handleForgotPassword}
                        />
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}

        {/* Social login buttons */}
        {socialMethods.length > 0 && (
          <>
            {tabMethods.length > 0 && (
              <div className="my-4">
                <Separator>
                  <span className="px-2 text-sm text-muted-foreground">OR</span>
                </Separator>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {socialMethods.map((method) => (
                <SocialLoginMethod
                  key={method}
                  method={method}
                  currentStep={currentStep}
                  emailFromStore={emailFromStore}
                  socialConfig={socialConfig}
                  onGoogleSuccess={handleGoogleLoginSuccess}
                  onMsalSuccess={handleMsalLoginSuccess}
                  onOAuthSuccess={handleOAuthLoginSuccess}
                  onError={setError}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

LazyOtpSignIn.propTypes = {
  email: PropTypes.string.isRequired,
};
