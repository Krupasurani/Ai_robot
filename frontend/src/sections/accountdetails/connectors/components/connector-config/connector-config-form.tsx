import React from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';

import { useAccountType } from 'src/hooks/use-account-type';

import AuthSection from './auth-section';
import SyncSection from './sync-section';
import ConfigStepper from './config-stepper';
import { isNoneAuthType } from '../../utils/auth';
import { useConnectorConfig } from '../../hooks/use-connector-config';

import type { Connector, ConnectorConfig } from '../../types/types';

interface StepContentProps {
  isNoAuthType: boolean;
  activeStep: number;
  connector: Connector;
  connectorConfig: ConnectorConfig | null;
  formData: {
    auth: Record<string, any>;
    sync: Record<string, any>;
  };
  formErrors: {
    auth: Record<string, string>;
    sync: Record<string, string>;
  };
  conditionalDisplay: Record<string, boolean>;
  accountTypeLoading: boolean;
  isBusiness: boolean;
  adminEmail: string;
  adminEmailError: string | null;
  selectedFile: File | null;
  fileName: string | null;
  fileError: string | null;
  jsonData: Record<string, any> | null;
  onFieldChange: (section: string, fieldName: string, value: any) => void;
  onAdminEmailChange: (email: string) => void;
  onFileUpload: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  saving: boolean;
}

const StepContent: React.FC<StepContentProps> = ({
  isNoAuthType,
  activeStep,
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
  onFieldChange,
  onAdminEmailChange,
  onFileUpload,
  onFileChange,
  fileInputRef,
  saving,
}) => {
  if (isNoAuthType) {
    return (
      <SyncSection
        connectorConfig={connectorConfig}
        formData={formData.sync}
        formErrors={formErrors.sync}
        onFieldChange={onFieldChange}
        saving={saving}
      />
    );
  }

  switch (activeStep) {
    case 0:
      return (
        <AuthSection
          connector={connector}
          connectorConfig={connectorConfig}
          formData={formData.auth}
          formErrors={formErrors.auth}
          conditionalDisplay={conditionalDisplay}
          accountTypeLoading={accountTypeLoading}
          isBusiness={isBusiness}
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
          onFieldChange={onFieldChange}
        />
      );
    case 1:
      return (
        <SyncSection
          connectorConfig={connectorConfig}
          formData={formData.sync}
          formErrors={formErrors.sync}
          onFieldChange={onFieldChange}
          saving={saving}
        />
      );
    default:
      return null;
  }
};

interface ConnectorConfigFormProps {
  connector: Connector;
  onClose: () => void;
  onSuccess?: () => void;
}

const ConnectorConfigForm: React.FC<ConnectorConfigFormProps> = ({
  connector,
  onClose,
  onSuccess,
}) => {
  const { isBusiness, isIndividual, loading: accountTypeLoading } = useAccountType();

  const {
    // State
    connectorConfig,
    loading,
    saving,
    activeStep,
    formData,
    formErrors,
    saveError,
    conditionalDisplay,
    
    // Business OAuth state
    adminEmail,
    adminEmailError,
    selectedFile,
    fileName,
    fileError,
    jsonData,

    // Actions
    handleFieldChange,
    handleNext,
    handleBack,
    handleSave,
    handleFileSelect,
    handleFileUpload,
    handleFileChange,
    handleAdminEmailChange,
    validateAdminEmail,
    isBusinessGoogleOAuthValid,
    fileInputRef,
  } = useConnectorConfig({ connector, onClose, onSuccess });

  // Skip auth step if authType is 'NONE'
  const isNoAuthType = isNoneAuthType(connector.authType);
  const steps = isNoAuthType ? ['Sync Settings'] : ['Authentication', 'Sync Settings'];

  if (loading) {
      return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
      );
    }

        return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex flex-row items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold mb-1">
                Configure {connector.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Configure authentication and sync settings for {connector.name}
              </DialogDescription>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs h-5 px-2">
                  {connector.appGroup}
                </Badge>
                {!isNoneAuthType(connector.authType) && (
                  <Badge variant="outline" className="text-xs h-5 px-2">
                    {connector.authType.split('_').join(' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-0 overflow-auto flex-1">
          {saveError && (
            <Alert variant="destructive" className="m-6 mb-0 rounded-xl">
              <AlertTitle className="font-semibold text-sm">Configuration Error</AlertTitle>
              <AlertDescription className="text-xs">{saveError}</AlertDescription>
            </Alert>
          )}

          <div className="p-6">
            <ConfigStepper activeStep={activeStep} steps={steps} />
            <StepContent
              isNoAuthType={isNoAuthType}
              activeStep={activeStep}
            connector={connector}
            connectorConfig={connectorConfig}
              formData={formData}
              formErrors={formErrors}
            conditionalDisplay={conditionalDisplay}
            accountTypeLoading={accountTypeLoading}
            isBusiness={isBusiness}
            adminEmail={adminEmail}
            adminEmailError={adminEmailError}
            selectedFile={selectedFile}
            fileName={fileName}
            fileError={fileError}
            jsonData={jsonData}
              onFieldChange={handleFieldChange}
            onAdminEmailChange={handleAdminEmailChange}
            onFileUpload={handleFileUpload}
            onFileChange={handleFileChange}
            fileInputRef={fileInputRef}
            saving={saving}
          />
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-border/10 bg-background/30 backdrop-blur-sm flex-shrink-0">
          <div className="flex gap-3 w-full justify-end">
            <Button onClick={onClose} disabled={saving} variant="outline" className="font-semibold">
            Cancel
          </Button>

          {!isNoAuthType && activeStep > 0 && (
            <Button
              onClick={handleBack}
              disabled={saving}
                variant="outline"
                className="font-semibold"
            >
              Back
            </Button>
          )}

          {!isNoAuthType && activeStep < 1 ? (
            <Button
                variant="default"
              onClick={handleNext}
              disabled={saving}
                className="font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Next
            </Button>
          ) : (
            <Button
                variant="default"
              onClick={handleSave}
              disabled={saving}
                className="font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
            </Button>
          )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectorConfigForm;
