import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import {
  File,
  ArrowLeft,
  Loader2,
  Upload,
  Info,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputField } from '@/components/ui/input-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { useAdmin } from '@/context/AdminContext';
import { useAuthContext } from '@/auth/hooks';
import { useAuthConfig, useUpdateAuthConfig } from '../hooks/use-auth-config';
import type { SamlSsoConfig } from '../utils/auth-configuration-service';

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

const SamlSsoConfigPage = () => {
  const navigate = useNavigate();
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { isAdmin } = useAdmin();
  const { user } = useAuthContext();
  const accountType = user?.accountType;

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

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error('Please correct the form errors');
      return;
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
    } catch (error) {
      toast.error('Failed to save SAML configuration');
    }
  };

  const handleBack = () => {
    if (isAdmin && accountType === 'business') {
      navigate('/account/company-settings/settings/authentication');
      return;
    }
    if (isAdmin && accountType === 'individual') {
      navigate('/account/individual/settings/authentication');
      return;
    }
    toast.error('No access to the saml settings');
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10">
                <Shield className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">SAML SSO Configuration</h1>
                <p className="text-sm text-muted-foreground">
                  Configure Single Sign-On with your identity provider
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoadingConfig ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <FormProvider {...form}>
            <div className="space-y-6">
              {/* Step 1: Upload XML */}
              <Card className="rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      1
                    </div>
                    <CardTitle className="text-base">Upload IdP Metadata</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50',
                      xmlFile && 'border-emerald-500/30 bg-emerald-500/5'
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    {xmlFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        <p className="text-sm font-medium text-foreground">{xmlFile.name}</p>
                        <p className="text-xs text-muted-foreground">File uploaded successfully</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-foreground mb-1">
                          Drag and drop your IdP metadata XML file here
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
                        <Button variant="outline" size="sm" asChild>
                          <label className="cursor-pointer">
                            <File className="mr-2 h-4 w-4" />
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
                </CardContent>
              </Card>

              {/* Step 2: Entry Point */}
              <Card className="rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      2
                    </div>
                    <CardTitle className="text-base">SSO Configuration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InputField
                    control={control}
                    name="entryPoint"
                    label="Entry Point (SSO URL)"
                    placeholder="https://idp.example.com/sso/saml"
                    description="The Single Sign-On URL from your Identity Provider"
                    required
                  />

                  <InputField
                    control={control}
                    name="emailKey"
                    label="Email Attribute Key"
                    placeholder="nameID"
                    description="The attribute containing the user's email (default: nameID)"
                  />
                </CardContent>
              </Card>

              {/* Step 3: Certificate */}
              <Card className="rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      3
                    </div>
                    <CardTitle className="text-base">Identity Provider Certificate</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <TextareaField
                    control={control}
                    name="certificate"
                    label="X.509 Certificate"
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    description="Paste the X.509 certificate provided by your IdP"
                    required
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Alert className="flex-1 mr-4 rounded-xl border-border bg-muted/30">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <AlertDescription className="text-sm">
                    Need help?{' '}
                    <a
                      href="https://docs.thero.com/auth/saml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View the documentation
                    </a>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-3 shrink-0">
                  <Button variant="outline" onClick={handleBack}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!isValid || updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </FormProvider>
        )}
      </div>
    </div>
  );
};

export default SamlSsoConfigPage;
