import { z } from 'zod';
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  File,
  Upload,
  Info,
  CheckCircle2,
  Shield,
  Link2,
  Key,
  FileText,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InputField } from '@/components/ui/input-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { Separator } from '@/components/ui/separator';
import { useAuthConfig, useUpdateAuthConfig } from '../hooks/use-auth-config';
import type { SamlSsoConfig } from '../utils/auth-configuration-service';

interface SamlSsoAuthFormProps {
  onValidationChange: (isValid: boolean) => void;
  onSaveSuccess?: () => void;
}

export interface SamlSsoAuthFormRef {
  handleSave: () => Promise<boolean>;
}

const samlSsoSchema = z.object({
  entryPoint: z
    .string()
    .min(1, { message: 'Entry Point URL is required' })
    .refine((val) => val.startsWith('https://'), {
      message: 'Entry Point URL should start with https://',
    }),
  certificate: z
    .string()
    .min(1, { message: 'Certificate is required' })
    .refine(
      (val) =>
        val.includes('-----BEGIN CERTIFICATE-----') &&
        val.includes('-----END CERTIFICATE-----'),
      {
        message: 'Certificate must include BEGIN and END markers',
      }
    ),
  emailKey: z.string().optional(),
  entityId: z.string().optional(),
  logoutUrl: z.string().optional(),
});

type SamlSsoFormData = z.infer<typeof samlSsoSchema>;

const SamlSsoAuthForm = forwardRef<SamlSsoAuthFormRef, SamlSsoAuthFormProps>(
  ({ onValidationChange, onSaveSuccess }, ref) => {
    const [xmlFile, setXmlFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const { data: config, isLoading: isLoadingConfig } = useAuthConfig('samlSso');
    const updateMutation = useUpdateAuthConfig('samlSso');

    const form = useForm<SamlSsoFormData>({
      resolver: zodResolver(samlSsoSchema),
      mode: 'onChange',
      defaultValues: {
        entryPoint: '',
        certificate: '',
        emailKey: 'nameID',
        entityId: '',
        logoutUrl: '',
      },
    });

    const { control, reset, setValue, formState } = form;
    const isValid = formState.isValid;

    useEffect(() => {
      onValidationChange(isValid);
    }, [isValid, onValidationChange]);

    useEffect(() => {
      if (config) {
        reset({
          entryPoint: config.entryPoint || '',
          certificate: config.certificate || '',
          emailKey: config.emailKey || 'nameID',
          entityId: config.entityId || '',
          logoutUrl: config.logoutUrl || '',
        });
      }
    }, [config, reset]);

    const parseXmlFile = useCallback(
      (content: string) => {
        try {
          let fieldsUpdated = false;

          // Extract Entry Point URL
          const ssoRegexPatterns = [
            /<md:SingleSignOnService[^>]*?Location="([^"]+)"[^>]*?>/i,
            /<SingleSignOnService[^>]*?Location="([^"]+)"[^>]*?>/i,
            /<[^:>]*:SingleSignOnService[^>]*?Location="([^"]+)"[^>]*?>/i,
          ];

          const ssoMatch = ssoRegexPatterns
            .map((pattern) => content.match(pattern))
            .find((match) => match && match[1]);

          if (ssoMatch && ssoMatch[1]) {
            setValue('entryPoint', ssoMatch[1], { shouldValidate: true });
            fieldsUpdated = true;
          }

          // Extract Certificate
          const certRegexPatterns = [
            /<ds:X509Certificate>([\s\S]*?)<\/ds:X509Certificate>/i,
            /<X509Certificate>([\s\S]*?)<\/X509Certificate>/i,
            /<[^:>]*:X509Certificate>([\s\S]*?)<\/[^:>]*:X509Certificate>/i,
          ];

          const certMatch = certRegexPatterns
            .map((pattern) => content.match(pattern))
            .find((match) => match && match[1]);

          if (certMatch && certMatch[1]) {
            const certContent = certMatch[1].trim().replace(/\s+/g, '');
            const formattedCert = `-----BEGIN CERTIFICATE-----
${Array.from({ length: Math.ceil(certContent.length / 64) })
  .map((_, i) => certContent.substring(i * 64, (i + 1) * 64))
  .join('\n')}
-----END CERTIFICATE-----`;

            setValue('certificate', formattedCert, { shouldValidate: true });
            fieldsUpdated = true;
          }

          // Extract Entity ID
          const entityIdRegexPatterns = [
            /entityID="([^"]+)"/i,
            /<md:EntityDescriptor[^>]*?entityID="([^"]+)"[^>]*?>/i,
            /<EntityDescriptor[^>]*?entityID="([^"]+)"[^>]*?>/i,
          ];

          const entityIdMatch = entityIdRegexPatterns
            .map((pattern) => content.match(pattern))
            .find((match) => match && match[1]);

          if (entityIdMatch && entityIdMatch[1]) {
            setValue('entityId', entityIdMatch[1]);
            fieldsUpdated = true;
          }

          if (fieldsUpdated) {
            toast.success('XML metadata parsed successfully');
          } else {
            toast.error('Could not extract fields from XML');
          }
        } catch (err) {
          toast.error('Failed to parse XML file');
        }
      },
      [setValue]
    );

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        setXmlFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            parseXmlFile(content);
          }
        };
        reader.readAsText(file);
      }
    };

    const handleDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.xml')) {
          setXmlFile(file);

          const reader = new FileReader();
          reader.onload = (ev) => {
            const content = ev.target?.result as string;
            if (content) {
              parseXmlFile(content);
            }
          };
          reader.readAsText(file);
        } else {
          toast.error('Please drop a valid XML file');
        }
      },
      [parseXmlFile]
    );

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    useImperativeHandle(
      ref,
      () => ({
        handleSave: async (): Promise<boolean> => {
          const isFormValid = await form.trigger();
          if (!isFormValid) {
            toast.error('Please correct the form errors');
            return false;
          }

          try {
            const formData = form.getValues();
            const payload: SamlSsoConfig = {
              entryPoint: formData.entryPoint,
              certificate: formData.certificate,
              emailKey: formData.emailKey || 'nameID',
              entityId: formData.entityId,
              logoutUrl: formData.logoutUrl,
            };

            await updateMutation.mutateAsync(payload);
            toast.success('SAML configuration saved successfully');

            if (onSaveSuccess) {
              onSaveSuccess();
            }

            return true;
          } catch (error) {
            toast.error('Failed to save SAML configuration');
            return false;
          }
        },
      }),
      [form, updateMutation, onSaveSuccess]
    );

    if (isLoadingConfig) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <FormProvider {...form}>
        <div className="space-y-6">
          {/* Step 1: Upload XML Metadata */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                1
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Upload IdP Metadata (Optional)
              </h3>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              Upload your Identity Provider&apos;s metadata XML file to auto-fill the configuration, or enter the details manually below.
            </p>

            <div
              className={cn(
                'ml-10 border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent/5',
                xmlFile && 'border-emerald-500/30 bg-emerald-500/5'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {xmlFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">{xmlFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Metadata imported successfully
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={() => setXmlFile(null)}
                  >
                    Upload different file
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-foreground mb-1">
                    Drag and drop your IdP metadata XML
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">or click to browse</p>
                  <Button variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <File className="mr-2 h-3.5 w-3.5" />
                      Choose File
                      <input
                        type="file"
                        accept=".xml"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </Button>
                </>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Step 2: SSO Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                2
              </div>
              <h3 className="text-sm font-semibold text-foreground">SSO Configuration</h3>
            </div>

            <div className="ml-10 space-y-4">
              <InputField
                control={control}
                name="entryPoint"
                label="Entry Point (SSO URL)"
                placeholder="https://idp.example.com/sso/saml"
                description="The Single Sign-On URL from your Identity Provider"
                required
                IconComponent={Link2}
              />

              <InputField
                control={control}
                name="emailKey"
                label="Email Attribute Key"
                placeholder="nameID"
                description="The SAML attribute containing the user's email address (default: nameID)"
                IconComponent={Key}
              />

              <InputField
                control={control}
                name="entityId"
                label="Entity ID (Optional)"
                placeholder="https://idp.example.com/entity"
                description="The Entity ID of your Identity Provider"
                IconComponent={Shield}
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Step 3: Certificate */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                3
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Identity Provider Certificate
              </h3>
            </div>

            <div className="ml-10">
              <TextareaField
                control={control}
                name="certificate"
                label="X.509 Certificate"
                placeholder={`-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----`}
                description="Paste the X.509 certificate provided by your Identity Provider"
                required
                rows={6}
              />
            </div>
          </div>

          {/* Documentation Link */}
          <Card className="p-4 rounded-xl border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="text-sm font-medium text-foreground">Need help?</h4>
                <p className="text-sm text-muted-foreground">
                  Check our documentation for detailed setup instructions for popular identity providers like Okta, Azure AD, and OneLogin.
                </p>
                <a
                  href="https://docs.thero.com/auth/saml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View SAML Setup Guide
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </Card>

          {updateMutation.isPending && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </FormProvider>
    );
  }
);

SamlSsoAuthForm.displayName = 'SamlSsoAuthForm';

export default SamlSsoAuthForm;
