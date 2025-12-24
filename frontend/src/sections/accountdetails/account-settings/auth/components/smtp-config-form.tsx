import { z } from 'zod';
import { Info, Lock, Mail, Server, User, Radio, Loader2 } from 'lucide-react';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { InputField } from '@/components/ui/input-field';
import { PasswordField } from '@/components/ui/password-field';

import axios from 'src/utils/axios';

interface SmtpConfigFormProps {
  onValidationChange: (isValid: boolean) => void;
  onSaveSuccess?: () => void;
}

export interface SmtpConfigFormRef {
  handleSave: () => Promise<boolean>;
}

const smtpConfigSchema = z.object({
  host: z.string().min(1, { message: 'SMTP host is required' }),
  port: z
    .number()
    .int()
    .min(1, { message: 'Port must be at least 1' })
    .max(65535, { message: 'Port must be at most 65535' }),
  fromEmail: z
    .string()
    .min(1, { message: 'From email is required' })
    .email({ message: 'Please enter a valid email address' }),
  username: z.string().optional(),
  password: z.string().optional(),
});

type SmtpConfigFormData = z.infer<typeof smtpConfigSchema>;

const SmtpConfigForm = forwardRef<SmtpConfigFormRef, SmtpConfigFormProps>(
  ({ onValidationChange, onSaveSuccess }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<SmtpConfigFormData>({
      resolver: zodResolver(smtpConfigSchema),
      mode: 'onChange',
      defaultValues: {
        host: '',
        port: 587,
        username: '',
        password: '',
        fromEmail: '',
      },
    });

    const { control, reset, formState } = form;
    const isValid = formState.isValid;

    useEffect(() => {
      onValidationChange(isValid);
    }, [isValid, onValidationChange]);

    useImperativeHandle(
      ref,
      () => ({
        handleSave: async (): Promise<boolean> => {
          setIsSaving(true);

          try {
            const isValid = await form.trigger();
            if (!isValid) {
              toast.error('Please correct the form errors');
              return false;
            }

            const formData = form.getValues();
            const payload = {
              host: formData.host,
              port: formData.port,
              fromEmail: formData.fromEmail,
              username: formData.username,
              password: formData.password,
            };

            await axios.post('/api/v1/configurationManager/smtpConfig', payload);

            toast.success('SMTP configuration saved successfully');

            if (onSaveSuccess) {
              onSaveSuccess();
            }

            return true;
          } catch (error) {
            toast.error('Failed to save SMTP configuration');
            return false;
          } finally {
            setIsSaving(false);
          }
        },
      }),
      [form, onSaveSuccess]
    );

    useEffect(() => {
      const fetchConfig = async () => {
        setIsLoading(true);
        try {
          const response = await axios.get('/api/v1/configurationManager/smtpConfig');

          if (response.data) {
            const { host, port, username, password, fromEmail } = response.data;

            reset({
              host: host || '',
              port: typeof port === 'string' ? parseInt(port, 10) : port || 587,
              username: username || '',
              password: password || '',
              fromEmail: fromEmail || '',
            });
          }
        } catch (error) {
          console.error('Failed to load SMTP configuration');
        } finally {
          setIsLoading(false);
        }
      };

      fetchConfig();
    }, [reset]);

    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <FormProvider {...form}>
        <div className="space-y-6">
          {/* Info Card */}
          <Card className="p-4 rounded-xl border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Why SMTP?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  SMTP is required for email-based features like OTP authentication, password
                  reset, and notifications. Configure your email server details below.
                </p>
              </div>
            </div>
          </Card>

          {/* Server Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Server Settings</h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <InputField
                  control={control}
                  name="host"
                  label="SMTP Host"
                  placeholder="e.g., smtp.gmail.com"
                  description="The hostname of your SMTP server"
                  required
                  IconComponent={Server}
                />
              </div>

              <div className="md:col-span-4">
                <InputField
                  control={control}
                  name="port"
                  label="Port"
                  placeholder="587"
                  description="Common: 25, 465, 587"
                  type="number"
                  required
                  IconComponent={Radio}
                />
              </div>
            </div>
          </div>

          {/* Sender Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Sender Settings</h4>

            <InputField
              control={control}
              name="fromEmail"
              label="From Email Address"
              placeholder="noreply@yourcompany.com"
              description="The email address that will appear as the sender"
              type="email"
              required
              IconComponent={Mail}
            />
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Authentication (Optional)</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                control={control}
                name="username"
                label="Username"
                placeholder="Enter SMTP username"
                description="For SMTP authentication"
                IconComponent={User}
              />

              <PasswordField
                control={control}
                name="password"
                label="Password"
                placeholder="Enter SMTP password"
                helperText="For SMTP authentication"
                IconComponent={Lock}
              />
            </div>
          </div>

          {/* Documentation Link */}
          <Alert className="rounded-xl border-border bg-muted/30">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm">
              Need help?{' '}
              <a
                href="https://docs.thero.com/smtp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View the documentation
              </a>
            </AlertDescription>
          </Alert>

          {isSaving && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </FormProvider>
    );
  }
);

SmtpConfigForm.displayName = 'SmtpConfigForm';

export default SmtpConfigForm;
