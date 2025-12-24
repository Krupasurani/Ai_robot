import React from 'react';
import {
  Key,
  Code,
  User,
  Info,
  BookOpen,
  Settings,
  Shield,
  ExternalLink,
  FileText,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { FieldRenderer } from '../field-renderers';
import BusinessOAuthSection from './business-oauth-section';
import { shouldShowElement } from '../../utils/conditional-display';

import type { Connector, ConnectorConfig } from '../../types/types';

interface AuthSectionProps {
  connector: Connector;
  connectorConfig: ConnectorConfig | null;
  formData: Record<string, any>;
  formErrors: Record<string, string>;
  conditionalDisplay: Record<string, boolean>;
  accountTypeLoading: boolean;
  isBusiness: boolean;

  // Business OAuth props
  adminEmail: string;
  adminEmailError: string | null;
  selectedFile: File | null;
  fileName: string | null;
  fileError: string | null;
  jsonData: Record<string, any> | null;
  onAdminEmailChange: (email: string) => void;
  onFileUpload: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFieldChange: (section: string, fieldName: string, value: any) => void;
}

const AuthSection: React.FC<AuthSectionProps> = ({
  connector,
  connectorConfig,
  formData,
  formErrors,
  conditionalDisplay,
  accountTypeLoading,
  isBusiness,
  adminEmail,
  adminEmailError,
  selectedFile,
  fileName,
  fileError,
  jsonData,
  onAdminEmailChange,
  onFileUpload,
  onFileChange,
  fileInputRef,
  onFieldChange,
}) => {
  if (!connectorConfig) return null;
  const { auth } = connectorConfig.config;

  // Guard against missing auth config
  if (!auth || !auth.schema || !auth.schema.fields) return null;
  let { documentationLinks } = connectorConfig.config;
  // Simplified helper function for business OAuth support
  const customGoogleBusinessOAuth = (connectorParam: Connector, accountType: string): boolean =>
    accountType === 'business' &&
    connectorParam.appGroup === 'Google Workspace' &&
    connectorParam.authType === 'OAUTH';
  const theroDocumentationUrl =
    documentationLinks?.find((link) => link.type === 'thero')?.url ||
    `https://docs.thero.com/connectors/overview`;

  documentationLinks = documentationLinks?.filter((link) => link.type !== 'thero');

  return (
    <div className="flex flex-col gap-6">
      {/* Documentation Alert */}
      <Alert className="rounded-xl border-info/20 bg-info/5">
        <Info className="h-4 w-4 text-info" />
        <AlertDescription className="text-sm leading-relaxed">
          Refer to{' '}
          <a
            href={theroDocumentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            our documentation
          </a>{' '}
          for setup instructions.
        </AlertDescription>
      </Alert>

      {/* Redirect URI Info - Conditionally displayed */}
      {((auth.displayRedirectUri && auth.redirectUri !== '') ||
        (auth.conditionalDisplay &&
          Object.keys(auth.conditionalDisplay).length > 0 &&
          shouldShowElement(auth.conditionalDisplay, 'redirectUri', formData))) && (
        <Card className="p-5 rounded-xl border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
              <Info className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-primary mb-2">Redirect URI</h4>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {connector.name === 'OneDrive'
                  ? 'Use this URL when configuring your Azure AD App registration.'
                  : `Use this URL when configuring your ${connector.name} OAuth2 App.`}
              </p>
              <div className="relative p-4 rounded-lg border border-border/15 bg-muted/80 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/30" />
                <code className="text-xs font-mono text-primary dark:text-primary-light break-all select-all cursor-text leading-relaxed block">
                  {`${window.location.origin}/${auth.redirectUri}`}
                </code>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Documentation Links - Compact Visual Guide */}
      {documentationLinks && documentationLinks.length > 0 && (
        <Card className="p-4 rounded-xl border-info/20 bg-info/5">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-md bg-info/10 flex items-center justify-center mt-0.5">
              <BookOpen className="h-3 w-3 text-info" />
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-semibold text-info mb-2">Setup Documentation</h4>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Follow these guides to complete your {connector.name} integration setup.
              </p>

              <div className="flex flex-col gap-2">
                {documentationLinks.map((link, index) => (
                  <div
                    key={index}
                    onClick={() => window.open(link.url, '_blank')}
                    className="p-3 rounded-lg border border-border/20 bg-card cursor-pointer flex items-center justify-between transition-all hover:border-info/30 hover:bg-info/5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-info/10 flex items-center justify-center flex-shrink-0">
                        {link.type === 'setup' ? (
                          <Settings className="h-2.5 w-2.5 text-info" />
                        ) : link.type === 'api' ? (
                          <Code className="h-2.5 w-2.5 text-info" />
                        ) : (
                          <FileText className="h-2.5 w-2.5 text-info" />
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-foreground leading-tight">
                          {link.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {link.type === 'setup'
                            ? 'Setup guide'
                            : link.type === 'api'
                              ? 'API reference'
                              : 'Documentation'}
                        </p>
                      </div>
                    </div>

                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Account Type Loading */}
      {accountTypeLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Business OAuth Section */}
      {!accountTypeLoading &&
        customGoogleBusinessOAuth(connector, isBusiness ? 'business' : 'individual') && (
          <BusinessOAuthSection
            adminEmail={adminEmail}
            adminEmailError={adminEmailError}
            selectedFile={selectedFile}
            fileName={fileName}
            fileError={fileError}
            jsonData={jsonData}
            onAdminEmailChange={onAdminEmailChange}
            onFileUpload={onFileUpload}
            onFileChange={onFileChange}
            fileInputRef={fileInputRef}
          />
        )}

      {/* Form Fields */}
      <Card className="p-5 rounded-xl border-border/30">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-1 rounded-md bg-muted flex items-center justify-center">
            {auth.type === 'OAUTH' ? (
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            ) : auth.type === 'API_TOKEN' ? (
              <Key className="h-3.5 w-3.5 text-muted-foreground" />
            ) : auth.type === 'USERNAME_PASSWORD' ? (
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-0.5">
              {auth.type === 'OAUTH'
                ? 'OAuth2 Credentials'
                : auth.type === 'API_TOKEN'
                  ? 'API Credentials'
                  : auth.type === 'USERNAME_PASSWORD'
                    ? 'Login Credentials'
                    : 'Authentication Settings'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your {connector.name} authentication details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {auth.schema.fields.map((field) => {
            // Check if field should be displayed based on conditional display rules
            let shouldShow = true; // Default to showing the field

            // If there's a conditional display rule for this field, evaluate it
            if (auth.conditionalDisplay && auth.conditionalDisplay[field.name]) {
              shouldShow = shouldShowElement(auth.conditionalDisplay, field.name, formData);
            }

            // Hide client_id and client_secret fields for business OAuth
            const isBusinessOAuthField =
              customGoogleBusinessOAuth(connector, isBusiness ? 'business' : 'individual') &&
              (field.name === 'clientId' || field.name === 'clientSecret');

            if (!shouldShow || isBusinessOAuthField) return null;

            return (
              <div key={field.name} className="col-span-1">
                <FieldRenderer
                  field={field}
                  value={formData[field.name]}
                  onChange={(value) => onFieldChange('auth', field.name, value)}
                  error={formErrors[field.name]}
                />
              </div>
            );
          })}

          {auth.customFields.map((field) => {
            // Check if custom field should be displayed based on conditional display rules
            const shouldShow =
              !auth.conditionalDisplay ||
              !auth.conditionalDisplay[field.name] ||
              shouldShowElement(auth.conditionalDisplay, field.name, formData);

            // Hide client_id and client_secret fields for business OAuth
            const isBusinessOAuthField =
              customGoogleBusinessOAuth(connector, isBusiness ? 'business' : 'individual') &&
              (field.name === 'clientId' || field.name === 'clientSecret');

            if (!shouldShow || isBusinessOAuthField) return null;

            return (
              <div key={field.name} className="col-span-1">
                <FieldRenderer
                  field={field}
                  value={formData[field.name]}
                  onChange={(value) => onFieldChange('auth', field.name, value)}
                  error={formErrors[field.name]}
                />
              </div>
            );
          })}

          {/* Render conditionally displayed fields that might not be in schema */}
          {auth.conditionalDisplay &&
            Object.keys(auth.conditionalDisplay).map((fieldName) => {
              // Skip if field is already rendered in schema or custom fields
              const isInSchema = auth.schema.fields.some((f) => f.name === fieldName);
              const isInCustomFields = auth.customFields.some((f) => f.name === fieldName);

              if (isInSchema || isInCustomFields) return null;

              // Check if this conditional field should be shown
              const shouldShow = shouldShowElement(auth.conditionalDisplay, fieldName, formData);
              if (!shouldShow) return null;

              // Create a basic field definition for conditional fields
              const conditionalField = {
                name: fieldName,
                displayName:
                  fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1'),
                fieldType: 'TEXT' as const,
                required: false,
                placeholder: `Enter ${fieldName}`,
                description: `Enter ${fieldName}`,
                defaultValue: '',
                validation: {},
                isSecret: false,
              };

              return (
                <div key={fieldName} className="col-span-1">
                  <FieldRenderer
                    field={conditionalField}
                    value={formData[fieldName]}
                    onChange={(value) => onFieldChange('auth', fieldName, value)}
                    error={formErrors[fieldName]}
                  />
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
};

export default AuthSection;
