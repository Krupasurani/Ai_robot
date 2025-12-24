import { Loader2, HelpCircle, ExternalLink, BookOpen, Check, Shield } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';

import { useTranslate } from '@/locales';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/cn';

import { getAuthProviderIcon } from './icons/auth-provider-icons';
import OAuthAuthForm from './oauth-auth-form';
import GoogleAuthForm from './google-auth-form';
import SmtpConfigForm from './smtp-config-form';
import AzureAdAuthForm from './azureAd-auth-form';
import MicrosoftAuthForm from './microsoft-auth-form';
import SamlSsoAuthForm from './saml-sso-auth-form';

import type { GoogleAuthFormRef } from './google-auth-form';
import type { SmtpConfigFormRef } from './smtp-config-form';
import type { AzureAdAuthFormRef } from './azureAd-auth-form';
import type { MicrosoftAuthFormRef } from './microsoft-auth-form';
import type { SamlSsoAuthFormRef } from './saml-sso-auth-form';

export type AnyFormRef =
  | GoogleAuthFormRef
  | MicrosoftAuthFormRef
  | AzureAdAuthFormRef
  | SmtpConfigFormRef
  | SamlSsoAuthFormRef;

interface ConfigureMethodDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  methodType: string | null;
}

// Setup guide content for each method
const SETUP_GUIDES: Record<
  string,
  {
    steps: Array<{
      title: string;
      content: React.ReactNode;
    }>;
    docUrl: string;
    docLabel: string;
  }
> = {
  google: {
    steps: [
      {
        title: 'Create OAuth Client',
        content: (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Go to the Google Cloud Console and create a new OAuth 2.0 Client ID:
            </p>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Google Cloud Console
            </a>
          </div>
        ),
      },
      {
        title: 'Configure Consent Screen',
        content: (
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Set application type to &quot;Web application&quot;</li>
            <li>Configure OAuth consent screen if not done</li>
            <li>Add your domain to authorized domains</li>
          </ul>
        ),
      },
      {
        title: 'Add Redirect URI',
        content: (
          <p className="text-sm text-muted-foreground">
            Copy the Redirect URI from the form and add it to the &quot;Authorized redirect URIs&quot; in your Google Cloud Console.
          </p>
        ),
      },
      {
        title: 'Copy Client ID',
        content: (
          <p className="text-sm text-muted-foreground">
            After creating the OAuth client, copy the Client ID and paste it in the form.
          </p>
        ),
      },
    ],
    docUrl: 'https://docs.thero.com/auth/google',
    docLabel: 'Google SSO Guide',
  },
  microsoft: {
    steps: [
      {
        title: 'Register Application',
        content: (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Go to Azure Portal and register a new application:
            </p>
            <a
              href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Azure App Registrations
            </a>
          </div>
        ),
      },
      {
        title: 'Configure Platform',
        content: (
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Add &quot;Web&quot; platform under Authentication</li>
            <li>Add the Redirect URI from the form</li>
            <li>Enable &quot;ID tokens&quot; under Implicit grant</li>
          </ul>
        ),
      },
      {
        title: 'Get Credentials',
        content: (
          <p className="text-sm text-muted-foreground">
            Find the Client ID and Tenant ID in the &quot;Overview&quot; section of your registered app.
          </p>
        ),
      },
    ],
    docUrl: 'https://docs.thero.com/auth/microsoft',
    docLabel: 'Microsoft SSO Guide',
  },
  azureAd: {
    steps: [
      {
        title: 'Register Enterprise App',
        content: (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Go to Azure Portal and register an Enterprise Application:
            </p>
            <a
              href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Azure Active Directory
            </a>
          </div>
        ),
      },
      {
        title: 'Configure Authentication',
        content: (
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Add &quot;Web&quot; platform under Authentication</li>
            <li>Configure the Redirect URI</li>
            <li>Set supported account types</li>
          </ul>
        ),
      },
      {
        title: 'Create Client Secret',
        content: (
          <p className="text-sm text-muted-foreground">
            Under &quot;Certificates &amp; secrets&quot;, create a new client secret and save it securely.
          </p>
        ),
      },
      {
        title: 'Get App Credentials',
        content: (
          <p className="text-sm text-muted-foreground">
            Copy the Application (client) ID, Directory (tenant) ID, and the client secret.
          </p>
        ),
      },
    ],
    docUrl: 'https://docs.thero.com/auth/azure-ad',
    docLabel: 'Azure AD Guide',
  },
  samlSso: {
    steps: [
      {
        title: 'Get IdP Metadata',
        content: (
          <p className="text-sm text-muted-foreground">
            Download the SAML metadata XML file from your Identity Provider (Okta, OneLogin, Azure AD, etc.).
          </p>
        ),
      },
      {
        title: 'Upload or Enter Details',
        content: (
          <p className="text-sm text-muted-foreground">
            Either upload the XML file to auto-fill, or manually enter the SSO URL, Entity ID, and Certificate.
          </p>
        ),
      },
      {
        title: 'Configure Your IdP',
        content: (
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Add our ACS URL to your IdP</li>
            <li>Set NameID format to email</li>
            <li>Map user attributes as needed</li>
          </ul>
        ),
      },
      {
        title: 'Test Connection',
        content: (
          <p className="text-sm text-muted-foreground">
            After saving, test the SSO login to ensure everything is configured correctly.
          </p>
        ),
      },
    ],
    docUrl: 'https://docs.thero.com/auth/saml',
    docLabel: 'SAML SSO Guide',
  },
  smtp: {
    steps: [
      {
        title: 'Get SMTP Credentials',
        content: (
          <p className="text-sm text-muted-foreground">
            Obtain SMTP server details from your email provider (Gmail, SendGrid, Mailgun, etc.).
          </p>
        ),
      },
      {
        title: 'Configure Server',
        content: (
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Enter SMTP host and port</li>
            <li>Choose encryption (TLS/SSL)</li>
            <li>Add authentication credentials</li>
          </ul>
        ),
      },
      {
        title: 'Set Sender Email',
        content: (
          <p className="text-sm text-muted-foreground">
            Configure the &quot;From&quot; email address that will appear in OTP and notification emails.
          </p>
        ),
      },
      {
        title: 'Test Email',
        content: (
          <p className="text-sm text-muted-foreground">
            Send a test email to verify the configuration is working correctly.
          </p>
        ),
      },
    ],
    docUrl: 'https://docs.thero.com/settings/smtp',
    docLabel: 'SMTP Setup Guide',
  },
};

export function ConfigureMethodDialog({
  open,
  onClose,
  onSave,
  methodType,
}: ConfigureMethodDialogProps) {
  const { t } = useTranslate('settings');

  // Method configurations
  const METHOD_CONFIG: Record<
    string,
    {
      title: string;
      description: string;
      accentColor: string;
    }
  > = {
    google: {
      title: t('auth.methods.google.title'),
      description: t('auth.methods.google.dialog_desc'),
      accentColor: 'bg-red-500/10 text-red-600',
    },
    microsoft: {
      title: t('auth.methods.microsoft.title'),
      description: t('auth.methods.microsoft.dialog_desc'),
      accentColor: 'bg-blue-500/10 text-blue-600',
    },
    azureAd: {
      title: t('auth.methods.azureAd.title'),
      description: t('auth.methods.azureAd.dialog_desc'),
      accentColor: 'bg-sky-500/10 text-sky-600',
    },
    samlSso: {
      title: t('auth.methods.samlSso.title'),
      description: t('auth.methods.samlSso.dialog_desc'),
      accentColor: 'bg-orange-500/10 text-orange-600',
    },
    oauth: {
      title: t('auth.methods.oauth.title'),
      description: t('auth.methods.oauth.dialog_desc'),
      accentColor: 'bg-purple-500/10 text-purple-600',
    },
    smtp: {
      title: t('auth.methods.smtp.title'),
      description: t('auth.methods.smtp.description'),
      accentColor: 'bg-emerald-500/10 text-emerald-600',
    },
  };

  const [isValid, setIsValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOAuthForm, setShowOAuthForm] = useState(false);

  const googleFormRef = useRef<GoogleAuthFormRef>(null);
  const microsoftFormRef = useRef<MicrosoftAuthFormRef>(null);
  const azureAdFormRef = useRef<AzureAdAuthFormRef>(null);
  const smtpFormRef = useRef<SmtpConfigFormRef>(null);
  const samlSsoFormRef = useRef<SamlSsoAuthFormRef>(null);

  const methodConfig = methodType ? METHOD_CONFIG[methodType] : null;
  const Icon = methodType ? getAuthProviderIcon(methodType) : null;
  const setupGuide = methodType ? SETUP_GUIDES[methodType] : null;

  // Handle OAuth special case
  useEffect(() => {
    if (open && methodType === 'oauth') {
      setShowOAuthForm(true);
    } else {
      setShowOAuthForm(false);
    }
  }, [open, methodType]);

  const handleValidationChange = (valid: boolean) => {
    setIsValid(valid);
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    let currentRef: React.RefObject<AnyFormRef> | null = null;

    switch (methodType) {
      case 'google':
        currentRef = googleFormRef;
        break;
      case 'microsoft':
        currentRef = microsoftFormRef;
        break;
      case 'azureAd':
        currentRef = azureAdFormRef;
        break;
      case 'smtp':
        currentRef = smtpFormRef;
        break;
      case 'samlSso':
        currentRef = samlSsoFormRef;
        break;
      default:
        currentRef = null;
    }

    if (currentRef?.current?.handleSave) {
      const result = await currentRef.current.handleSave();
      if (result !== false) {
        onSave();
      }
    }
    setIsSaving(false);
  };

  const handleFormSaveSuccess = () => {
    onSave();
  };

  const handleOAuthSuccess = () => {
    setShowOAuthForm(false);
    onSave();
  };

  const handleOAuthClose = () => {
    setShowOAuthForm(false);
    onClose();
  };

  return (
    <>
      {/* OAuth form as separate dialog */}
      <OAuthAuthForm
        open={showOAuthForm}
        onClose={handleOAuthClose}
        onSuccess={handleOAuthSuccess}
      />

      <Sheet open={open && methodType !== 'oauth'} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-[900px] flex flex-col p-0 gap-0">
          {methodConfig && Icon && (
            <>
              {/* Header */}
              <SheetHeader className="px-6 py-5 border-b border-border/60 space-y-0 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className={cn('p-3 rounded-xl', methodConfig.accentColor)}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-lg font-semibold">
                      {t('auth.dialog.configure_title', { title: methodConfig.title })}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {methodConfig.description}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              {/* Content Area with Sidebar */}
              <div className="flex flex-1 min-h-0">
                {/* Main Form Content */}
                <ScrollArea className="flex-1 border-r border-border/60">
                  <div className="px-6 py-6">
                    {methodType === 'google' && (
                      <GoogleAuthForm
                        onValidationChange={handleValidationChange}
                        onSaveSuccess={handleFormSaveSuccess}
                        ref={googleFormRef}
                      />
                    )}

                    {methodType === 'microsoft' && (
                      <MicrosoftAuthForm
                        onValidationChange={handleValidationChange}
                        onSaveSuccess={handleFormSaveSuccess}
                        ref={microsoftFormRef}
                      />
                    )}

                    {methodType === 'azureAd' && (
                      <AzureAdAuthForm
                        onValidationChange={handleValidationChange}
                        onSaveSuccess={handleFormSaveSuccess}
                        ref={azureAdFormRef}
                      />
                    )}

                    {methodType === 'smtp' && (
                      <SmtpConfigForm
                        onValidationChange={handleValidationChange}
                        onSaveSuccess={handleFormSaveSuccess}
                        ref={smtpFormRef}
                      />
                    )}

                    {methodType === 'samlSso' && (
                      <SamlSsoAuthForm
                        onValidationChange={handleValidationChange}
                        onSaveSuccess={handleFormSaveSuccess}
                        ref={samlSsoFormRef}
                      />
                    )}
                  </div>
                </ScrollArea>

                {/* Setup Guide Sidebar */}
                {setupGuide && (
                  <div className="w-[280px] flex-shrink-0 bg-muted/30">
                    <ScrollArea className="h-full">
                      <div className="p-5">
                        {/* Guide Header */}
                        <div className="flex items-center gap-2 mb-5">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <HelpCircle className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">
                            Setup Guide
                          </h3>
                        </div>

                        {/* Steps */}
                        <div className="space-y-4">
                          {setupGuide.steps.map((step, index) => (
                            <div key={index} className="relative">
                              <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-foreground mb-1">
                                    {step.title}
                                  </h4>
                                  {step.content}
                                </div>
                              </div>
                              {index < setupGuide.steps.length - 1 && (
                                <div className="absolute left-[9px] top-7 bottom-0 w-[2px] bg-border -mb-1 h-[calc(100%-12px)]" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Documentation Link */}
                        <Separator className="my-5" />
                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                          <div className="flex items-start gap-2.5">
                            <BookOpen className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-foreground mb-1">
                                Need more help?
                              </p>
                              <a
                                href={setupGuide.docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                {setupGuide.docLabel}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Footer */}
              <SheetFooter className="px-6 py-4 border-t border-border/60 bg-muted/30 flex-shrink-0">
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs text-muted-foreground">
                    {isValid ? (
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        Configuration is valid
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Fill in all required fields
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                      {t('auth.cancel')}
                    </Button>
                    <Button onClick={handleSaveClick} disabled={!isValid || isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('auth.saving')}
                        </>
                      ) : (
                        t('auth.dialog.save_configuration')
                      )}
                    </Button>
                  </div>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default ConfigureMethodDialog;
