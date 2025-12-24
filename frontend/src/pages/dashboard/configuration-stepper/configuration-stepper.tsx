import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingState from '@/components/ui/loader';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';
import { Stepper } from '@/components/ui/stepper';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import { useAuthContext } from 'src/auth/hooks';
import { storageTypes } from './types';
import SmtpConfigStep from './smtp-config';
import StorageConfigStep from './storage-config';
import MultiLlmConfigStep from './multi-llm-config';
import ConnectorConfigStep from './connector-config';
import UrlConfigStep from './internal-services-stepper';
import type { UrlFormValues } from './internal-services-stepper';
import type {
  LlmRole,
  ProviderType,
  LlmFormValues,
  SmtpFormValues,
  StorageFormValues,
  MultiLlmFormValues,
  ConnectorFormValues,
} from './types';

const steps: string[] = ['AI Models', 'Storage', 'Public URLs', 'Connector', 'SMTP'];

type AiModelBucket = 'llm' | 'slm' | 'reasoning' | 'multiModal' | 'deepresearch';

const ROLE_TO_BUCKET_MAP: Record<LlmRole, AiModelBucket> = {
  llm: 'llm',
  slm: 'slm',
  reasoning: 'reasoning',
  multimodal: 'multiModal',
  deepresearch: 'deepresearch',
};

const BUCKET_TO_ROLE_MAP: Record<AiModelBucket, LlmRole> = {
  llm: 'llm',
  slm: 'slm',
  reasoning: 'reasoning',
  multiModal: 'multimodal',
  deepresearch: 'deepresearch',
};

const FORM_PROVIDER_TO_API_MAP: Record<string, string> = {
  openai: 'openAI',
  azure: 'azureOpenAI',
  openAICompatible: 'openAICompatible',
  gemini: 'gemini',
  anthropic: 'anthropic',
};

const API_PROVIDER_TO_FORM_MAP: Record<string, ProviderType> = {
  openAI: 'openai',
  azureOpenAI: 'azure',
  openAICompatible: 'openAICompatible',
  gemini: 'gemini',
  anthropic: 'anthropic',
};

interface BackendModelConfiguration {
  provider?: string;
  configuration?: {
    apiKey?: string;
    model?: string;
    endpoint?: string;
    deploymentName?: string;
    temperature?: number;
  };
  role?: LlmRole;
  isMultimodal?: boolean;
  isReasoning?: boolean;
  [key: string]: any;
}

type AiModelsConfigResponse = Partial<
  Record<AiModelBucket | 'embedding' | 'ocr', BackendModelConfiguration[]>
>;

interface AiModelPayloadEntry {
  provider: string;
  configuration: Record<string, any>;
  isMultimodal?: boolean;
  isReasoning?: boolean;
  isDefault?: boolean;
}

type AiModelsRequestPayload = Record<AiModelBucket | 'embedding' | 'ocr', AiModelPayloadEntry[]>;

const toFormProviderType = (provider?: string): ProviderType => {
  if (!provider) {
    return 'openai';
  }
  return API_PROVIDER_TO_FORM_MAP[provider] || 'openAICompatible';
};

const convertBackendModelToFormValue = (
  model: BackendModelConfiguration,
  fallbackRole: LlmRole
): LlmFormValues => {
  const provider = toFormProviderType(model.provider);
  const configuration = model.configuration || {};
  const base = {
    apiKey: configuration.apiKey || '',
    model: configuration.model || '',
    temperature: typeof configuration.temperature === 'number' ? configuration.temperature : 0.4,
    role: (model.role as LlmRole) || fallbackRole,
  };

  if (provider === 'azure') {
    return {
      modelType: 'azure',
      endpoint: configuration.endpoint || '',
      deploymentName: configuration.deploymentName || '',
      ...base,
    };
  }

  if (provider === 'openAICompatible') {
    return {
      modelType: 'openAICompatible',
      endpoint: configuration.endpoint || '',
      ...base,
    };
  }

  return {
    modelType: provider,
    ...base,
  };
};

const extractLlmConfigsFromResponse = (data?: AiModelsConfigResponse | null): LlmFormValues[] => {
  if (!data) {
    return [];
  }

  const configs: LlmFormValues[] = [];
  (['llm', 'slm', 'reasoning', 'multiModal', 'deepresearch'] as AiModelBucket[]).forEach(
    (bucket) => {
      const entries = data[bucket];
      if (Array.isArray(entries)) {
        entries.forEach((entry) => {
          configs.push(convertBackendModelToFormValue(entry, BUCKET_TO_ROLE_MAP[bucket]));
        });
      }
    }
  );

  return configs;
};

const createEmptyAiModelPayload = (): AiModelsRequestPayload => ({
  llm: [],
  slm: [],
  reasoning: [],
  multiModal: [],
  deepresearch: [],
  embedding: [],
  ocr: [],
});

const mapFormProviderToApiProvider = (provider: string): string =>
  FORM_PROVIDER_TO_API_MAP[provider] || FORM_PROVIDER_TO_API_MAP.openAICompatible;

const buildAiModelsPayload = (configs: LlmFormValues[]): AiModelsRequestPayload => {
  const payload = createEmptyAiModelPayload();
  const bucketCounts: Record<AiModelBucket, number> = {
    llm: 0,
    slm: 0,
    reasoning: 0,
    multiModal: 0,
    deepresearch: 0,
  };

  configs.forEach((config) => {
    const role = config.role || 'llm';
    const bucket = ROLE_TO_BUCKET_MAP[role] || 'llm';
    const apiProvider = mapFormProviderToApiProvider(config.modelType);

    const configuration: Record<string, any> = {
      apiKey: config.apiKey,
      model: config.model,
      temperature: typeof config.temperature === 'number' ? config.temperature : 0.4,
    };

    if (config.modelType === 'azure') {
      configuration.endpoint = config.endpoint;
      configuration.deploymentName = config.deploymentName;
    }

    if (config.modelType === 'openAICompatible') {
      configuration.endpoint = config.endpoint;
    }

    payload[bucket].push({
      provider: apiProvider,
      configuration,
      isDefault: bucket === 'llm' ? bucketCounts[bucket] === 0 : false,
      isMultimodal: bucket === 'multiModal',
      isReasoning: bucket === 'reasoning',
    });

    bucketCounts[bucket] += 1;
  });

  return payload;
};

// API base URLs
const API_BASE_URL = '/api/v1/configurationManager';
const ORG_API_BASE_URL = '/api/v1/org';

interface ConfigurationStepperProps {
  open: boolean;
  onClose: () => void;
}

const ConfigurationStepper: React.FC<ConfigurationStepperProps> = ({ open, onClose }) => {
  const { user } = useAuthContext();
  const accountType = user?.accountType || 'individual';

  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string>('');
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);

  // Use a ref to track if onboarding status has been updated
  // This prevents redundant API calls
  const statusUpdated = useRef<boolean>(false);

  // Track which steps are being skipped
  const [skipSteps, setSkipSteps] = useState<{
    storage: boolean;
    connector: boolean;
    publicUrls: boolean;
    smtp: boolean;
  }>({
    storage: false,
    connector: false,
    publicUrls: false,
    smtp: false,
  });

  // State to hold form values from each step
  const [llmValues, setLlmValues] = useState<MultiLlmFormValues | null>(null);
  const [storageValues, setStorageValues] = useState<StorageFormValues | null>(null);
  const [connectorValues, setConnectorValues] = useState<ConnectorFormValues | null>(null);
  const [urlValues, setUrlValues] = useState<UrlFormValues | null>(null);
  const [smtpValues, setSmtpValues] = useState<SmtpFormValues | null>(null);
  const [serviceCredentialsFile, setServiceCredentialsFile] = useState<File | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');

  const loadInitialLlmConfig = useCallback(async () => {
    try {
      const response = await axios.get<AiModelsConfigResponse>(`${API_BASE_URL}/aiModelsConfig`);
      const parsedConfigs = extractLlmConfigsFromResponse(response.data);
      if (parsedConfigs.length > 0) {
        setLlmValues({ llmConfigs: parsedConfigs });
      } else {
        setLlmValues(null);
      }
    } catch (error) {
      console.error('Failed to load AI model configuration:', error);
      setLlmValues(null);
    }
  }, []);

  // Reset state when dialog is opened
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setSubmissionSuccess(false);
      setSubmissionError('');
      setLlmValues(null);
      // Reset the statusUpdated flag when dialog opens
      statusUpdated.current = false;
      // Reset skip states
      setSkipSteps({
        storage: false,
        publicUrls: false,
        connector: false,
        smtp: false,
      });

      loadInitialLlmConfig();
    }
  }, [open, loadInitialLlmConfig]);

  // Function to update onboarding status via API, only if not already updated
  // This function should ONLY be called when explicitly needed via button clicks
  const updateOnboardingStatus = async (status: 'configured' | 'skipped'): Promise<void> => {
    if (statusUpdated.current) {
      return;
    }

    await axios.put(`${ORG_API_BASE_URL}/onboarding-status`, { status });
    statusUpdated.current = true;
  };

  // Intercept the close action - ONLY update status if explicitly canceling via button
  const handleCloseWithStatus = async () => {
    try {
      setIsSubmitting(true);
      if (llmValues && llmValues.llmConfigs.length > 0) {
        await submitAllConfigurations(undefined, { requireLlm: false });
      }
      await updateOnboardingStatus('skipped');
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  // This is called when the user clicks the X or clicks outside the dialog
  // We should NOT update the status in this case
  const handleCloseNoStatus = () => {
    // Just close without updating status
    onClose();
  };

  const handleSkipStep = (step: 'storage' | 'publicUrls' | 'connector' | 'smtp'): void => {
    // Mark the step as skipped
    setSkipSteps((prev) => ({ ...prev, [step]: true }));

    if (step === 'publicUrls') {
      setUrlValues(null);
    }
    // If skipping storage, set default local storage values
    if (step === 'storage') {
      const defaultLocalStorage: StorageFormValues = {
        storageType: storageTypes.LOCAL,
        mountName: '',
        baseUrl: '',
      };
      setStorageValues(defaultLocalStorage);
    }

    // If this is the last step (SMTP), submit all configurations
    if (step === 'smtp' && activeStep === steps.length - 1) {
      submitAllConfigurations();
    } else {
      // Otherwise, move to the next step
      setActiveStep((prevActiveStep) => Math.min(prevActiveStep + 1, steps.length - 1));
    }
  };
  // Update the handleNext function in ConfigurationStepper.tsx
  const handleNext = async (): Promise<void> => {
    if (activeStep === 0) {
      setActiveStep(1);
      return;
    }

    // For Storage step (now step 1)
    if (activeStep === 1) {
      // If already marked as skipped, just go to the next step
      if (skipSteps.storage) {
        setActiveStep(2);
        return;
      }

      // If we already have storage values, just go to the next step
      if (storageValues) {
        setActiveStep(2);
        return;
      }

      // Otherwise, try to submit the form or skip
      const storageFormSubmitted = await submitStorageForm();
      if (!storageFormSubmitted) {
        // Storage is not required, so skip if invalid
        handleSkipStep('storage');
        return;
      }
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      // If already marked as skipped, just go to the next step
      if (skipSteps.publicUrls) {
        setActiveStep(3);
        return;
      }

      // If we already have URL values, just go to the next step
      if (urlValues) {
        setActiveStep(3);
        return;
      }

      // Otherwise, try to submit the form or skip
      const urlFormSubmitted = await submitUrlForm();
      if (!urlFormSubmitted) {
        // URL is not required, so skip if invalid
        handleSkipStep('publicUrls');
        return;
      }
      setActiveStep(3);
    }
    // For Connector step (now step 3)
    if (activeStep === 3) {
      // If already marked as skipped, just go to the next step
      if (skipSteps.connector) {
        setActiveStep(4);
        return;
      }

      // If we already have connector values, just go to the next step
      if (connectorValues) {
        setActiveStep(4);
        return;
      }

      // Otherwise, try to submit the form or skip
      const connectorFormSubmitted = await submitConnectorForm();
      if (!connectorFormSubmitted) {
        handleSkipStep('connector');
        return;
      }
      setActiveStep(4);
    }
  };

  const handleBack = (): void => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleLlmSubmit = (data: MultiLlmFormValues): void => {
    setLlmValues(data);

    setTimeout(() => {
      if (activeStep === steps.length - 1) {
        submitAllConfigurations();
      } else {
        handleNext();
      }
    }, 0);
  };

  // Handle storage step submission
  const handleStorageSubmit = (data: StorageFormValues): void => {
    setStorageValues(data);
    setSkipSteps((prev) => ({ ...prev, storage: false })); // Ensure it's marked as not skipped

    // Give time for state to update before moving to next step
    setTimeout(() => {
      // If this is the last step (shouldn't happen normally, but just in case)
      if (activeStep === steps.length - 1) {
        submitAllConfigurations();
      } else {
        handleNext();
      }
    }, 0);
  };

  const handleUrlSubmit = async (data: UrlFormValues): Promise<void> => {
    try {
      setIsSubmitting(true);

      // Remove trailing slashes from URLs
      const processedData = {
        ...data,
        frontendUrl: data.frontendUrl?.endsWith('/')
          ? data.frontendUrl.slice(0, -1)
          : data.frontendUrl,
        connectorUrl: data.connectorUrl?.endsWith('/')
          ? data.connectorUrl.slice(0, -1)
          : data.connectorUrl,
      };

      // Save the processed URL data to state
      setUrlValues(processedData);
      setSkipSteps((prev) => ({ ...prev, publicUrls: false }));

      // Only add frontendUrl to payload if it exists and is not empty
      if (processedData.frontendUrl && processedData.frontendUrl.trim() !== '') {
        await axios.post(`${API_BASE_URL}/frontendPublicUrl`, { url: processedData.frontendUrl });
      }

      // Only add connectorUrl to payload if it exists and is not empty
      if (processedData.connectorUrl && processedData.connectorUrl.trim() !== '') {
        await axios.post(`${API_BASE_URL}/connectorPublicUrl`, { url: processedData.connectorUrl });
      }

      // Show success message
      toast.success('URL configuration saved successfully');
    } catch (error: any) {
      console.error('Error saving URL configuration:', error);
      setSubmissionError(error.response?.data?.message || 'Failed to save URL configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectorSubmit = (data: ConnectorFormValues, file: File | null): void => {
    setConnectorValues(data);
    setServiceCredentialsFile(file);
    setSkipSteps((prev) => ({ ...prev, connector: false })); // Ensure it's marked as not skipped
    if (data.googleWorkspace.adminEmail) {
      setAdminEmail(data.googleWorkspace.adminEmail);
    }

    // Give time for state to update before moving to next step
    setTimeout(() => {
      // If this is the last step (shouldn't happen normally, but just in case)
      if (activeStep === steps.length - 1) {
        submitAllConfigurations();
      } else {
        handleNext();
      }
    }, 0);
  };

  const handleSmtpSubmit = (data: SmtpFormValues): void => {
    setSmtpValues(data);
    setSkipSteps((prev) => ({ ...prev, smtp: false })); // Ensure it's marked as not skipped

    // When the last step is completed, submit all configurations
    // Give time for state to update before submitting
    setTimeout(() => {
      submitAllConfigurations(data);
    }, 0);
  };

  const submitLlmForm = async (): Promise<boolean> => {
    try {
      if (typeof (window as any).submitMultiLlmForm === 'function') {
        const result = await Promise.resolve((window as any).submitMultiLlmForm());
        await new Promise((resolve) => setTimeout(resolve, 100));
        return result === true;
      }
      return false;
    } catch (error) {
      console.error('Error validating LLM form:', error);
      return false;
    }
  };

  // Submit Storage form programmatically
  const submitStorageForm = async (): Promise<boolean> => {
    try {
      // Method 1: Use the window method
      if (typeof (window as any).submitStorageForm === 'function') {
        const result = await Promise.resolve((window as any).submitStorageForm());
        // Wait for state to update
        await new Promise((resolve) => setTimeout(resolve, 100));
        return result === true; // Ensure it's explicitly true
      }

      // Method 2: Find and click the submit button
      const storageSubmitButton = document.querySelector(
        '#storage-config-form button[type="submit"]'
      );

      if (storageSubmitButton) {
        (storageSubmitButton as HTMLButtonElement).click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Check validation status
        const formValid =
          typeof (window as any).isStorageFormValid === 'function'
            ? await Promise.resolve((window as any).isStorageFormValid())
            : false;
        return formValid === true;
      }

      return false;
    } catch (error) {
      console.error('Error validating storage form:', error);
      return false;
    }
  };
  const submitUrlForm = async (): Promise<boolean> => {
    try {
      // Method 1: Use the window method
      if (typeof (window as any).submitUrlForm === 'function') {
        const result = await Promise.resolve((window as any).submitUrlForm());
        // Wait for state to update
        await new Promise((resolve) => setTimeout(resolve, 100));
        return result === true; // Ensure it's explicitly true
      }

      return false;
    } catch (error) {
      console.error('Error validating URL form:', error);
      return false;
    }
  };

  // Submit Connector form programmatically
  const submitConnectorForm = async (): Promise<boolean> => {
    try {
      // Method 1: Use the window method
      if (typeof (window as any).submitConnectorForm === 'function') {
        const result = await Promise.resolve((window as any).submitConnectorForm());
        // Wait for state to update
        await new Promise((resolve) => setTimeout(resolve, 100));
        return result === true; // Ensure it's explicitly true
      }

      // Method 2: Find and click the submit button
      const connectorSubmitButton = document.querySelector('#connector-form-submit-button');

      if (connectorSubmitButton) {
        (connectorSubmitButton as HTMLButtonElement).click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        return !!connectorValues;
      }

      return false;
    } catch (error) {
      console.error('Error validating connector form:', error);
      return false;
    }
  };

  const saveLlmConfigurations = async (config: MultiLlmFormValues): Promise<void> => {
    const payload = buildAiModelsPayload(config.llmConfigs);
    if (!payload.llm || payload.llm.length === 0) {
      throw new Error('At least one primary LLM configuration is required.');
    }

    if (!payload.embedding) {
      payload.embedding = [];
    }

    if (!payload.ocr) {
      payload.ocr = [];
    }

    await axios.post(`${API_BASE_URL}/aiModelsConfig`, payload);
  };

  // Submit all configurations at once
  const submitAllConfigurations = async (
    smtpData?: SmtpFormValues,
    options?: { requireLlm?: boolean }
  ): Promise<void> => {
    try {
      const requireLlm = options?.requireLlm ?? true;
      setIsSubmitting(true);
      setSubmissionError('');
      setSubmissionSuccess(false);

      // If storage is skipped and no storage values, set default local storage
      if (skipSteps.storage && !storageValues) {
        const defaultLocalStorage: StorageFormValues = {
          storageType: storageTypes.LOCAL,
        };
        setStorageValues(defaultLocalStorage);
      }

      const apiCalls: Promise<unknown>[] = [];

      if (llmValues && llmValues.llmConfigs.length > 0) {
        apiCalls.push(saveLlmConfigurations(llmValues));
      } else if (requireLlm) {
        setSubmissionError('Please configure at least one AI model before completing setup.');
        setIsSubmitting(false);
        return;
      }

      toast.info('Saving configuration, this may take few seconds.');

      // Prepare Storage config API call
      if (storageValues) {
        // Prepare the payload based on storage type
        let storageConfig: any = {
          storageType: storageValues.storageType,
        };

        switch (storageValues.storageType) {
          case storageTypes.S3:
            // S3 fields are all required
            storageConfig = {
              ...storageConfig,
              s3AccessKeyId: storageValues.s3AccessKeyId,
              s3SecretAccessKey: storageValues.s3SecretAccessKey,
              s3Region: storageValues.s3Region,
              s3BucketName: storageValues.s3BucketName,
            };
            break;

          case storageTypes.AZURE_BLOB:
            // Add required Azure fields
            storageConfig = {
              ...storageConfig,
              accountName: storageValues.accountName,
              accountKey: storageValues.accountKey,
              containerName: storageValues.containerName,
            };

            // Set default values first, then override if custom values provided
            storageConfig.endpointProtocol = 'https';
            storageConfig.endpointSuffix = 'core.windows.net';

            // Only add optional fields if they have values
            if (storageValues.endpointProtocol && storageValues.endpointProtocol.trim() !== '') {
              storageConfig.endpointProtocol = storageValues.endpointProtocol;
            }

            if (storageValues.endpointSuffix && storageValues.endpointSuffix.trim() !== '') {
              storageConfig.endpointSuffix = storageValues.endpointSuffix;
            }
            break;

          case storageTypes.LOCAL:
            // Only add optional fields if they have values
            if (storageValues.mountName && storageValues.mountName.trim() !== '') {
              storageConfig.mountName = storageValues.mountName;
            }

            if (storageValues.baseUrl && storageValues.baseUrl.trim() !== '') {
              storageConfig.baseUrl = storageValues.baseUrl;
            }
            break;

          default:
            // This shouldn't happen as storageType is validated by the form
            // Use a type assertion to handle the potentially unknown storage type
            console.warn(
              `Unknown storage type: ${(storageValues as any).storageType}, using default config`
            );
            break;
        }

        apiCalls.push(
          axios.post(`${API_BASE_URL}/storageConfig`, storageConfig, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );
      }

      // Prepare Google Workspace config API call if not skipped and has values
      if (!skipSteps.connector && connectorValues) {
        if (accountType === 'business') {
          // Business account with file upload
          if (serviceCredentialsFile) {
            const formData = new FormData();
            formData.append('googleWorkspaceCredentials', serviceCredentialsFile);
            formData.append('adminEmail', adminEmail);
            formData.append('fileChanged', 'true');

            // Add real-time updates configuration
            if (connectorValues.googleWorkspace?.enableRealTimeUpdates !== undefined) {
              formData.append(
                'enableRealTimeUpdates',
                String(connectorValues.googleWorkspace.enableRealTimeUpdates)
              );
            }

            // Add topic name if real-time updates are enabled
            if (
              connectorValues.googleWorkspace?.enableRealTimeUpdates &&
              connectorValues.googleWorkspace?.topicName &&
              connectorValues.googleWorkspace.topicName.trim() !== ''
            ) {
              formData.append('topicName', connectorValues.googleWorkspace.topicName);
            }

            if (connectorValues.googleWorkspace?.serviceCredentials) {
              // If we have parsed data from the file, only include non-empty fields
              const serviceAccount: any = {};

              // Only add fields with values
              const gwValues = connectorValues.googleWorkspace;

              if (gwValues.clientId && gwValues.clientId.trim() !== '') {
                serviceAccount.clientId = gwValues.clientId;
              }

              if (gwValues.clientEmail && gwValues.clientEmail.trim() !== '') {
                serviceAccount.clientEmail = gwValues.clientEmail;
              }

              if (gwValues.privateKey && gwValues.privateKey.trim() !== '') {
                serviceAccount.privateKey = gwValues.privateKey;
              }

              if (gwValues.projectId && gwValues.projectId.trim() !== '') {
                serviceAccount.projectId = gwValues.projectId;
              }

              // Only append if we have at least one field
              if (Object.keys(serviceAccount).length > 0) {
                formData.append('serviceAccount', JSON.stringify(serviceAccount));
              }
            }

            apiCalls.push(
              axios.post(
                `${CONFIG.backendUrl}/api/v1/connectors/credentials?service=googleWorkspace`,
                formData,
                {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                }
              )
            );
          }
        } else if (
          connectorValues.googleWorkspace?.clientId ||
          connectorValues.googleWorkspace?.clientSecret
        ) {
          // Individual account with manual entry or file upload (that populated form fields)
          const payload: any = {};
          const gwValues = connectorValues.googleWorkspace;

          // Only add fields with values
          if (gwValues.clientId && gwValues.clientId.trim() !== '') {
            payload.clientId = gwValues.clientId;
          }

          if (gwValues.clientSecret && gwValues.clientSecret.trim() !== '') {
            payload.clientSecret = gwValues.clientSecret;
          }

          // Add real-time updates configuration
          if (gwValues.enableRealTimeUpdates !== undefined) {
            payload.enableRealTimeUpdates = gwValues.enableRealTimeUpdates;
          }

          // Add topic name if real-time updates are enabled
          if (
            gwValues.enableRealTimeUpdates &&
            gwValues.topicName &&
            gwValues.topicName.trim() !== ''
          ) {
            payload.topicName = gwValues.topicName;
          }

          // Only make the API call if we have at least one field
          if (Object.keys(payload).length > 0) {
            apiCalls.push(
              axios.post(`${API_BASE_URL}/connectors/googleWorkspaceOauthConfig`, payload, {
                headers: {
                  'Content-Type': 'application/json',
                },
              })
            );
          }
        }
      }

      // Prepare SMTP config API call if not skipped and has values
      const finalSmtpData = smtpData || smtpValues;
      if (!skipSteps.smtp && finalSmtpData) {
        // Create base config with required fields
        const smtpConfig: any = {
          host: finalSmtpData.host,
          port: Number(finalSmtpData.port),
          fromEmail: finalSmtpData.fromEmail,
        };

        // Only add optional fields if they have values
        if (finalSmtpData.username && finalSmtpData.username.trim() !== '') {
          smtpConfig.username = finalSmtpData.username;
        }

        if (finalSmtpData.password && finalSmtpData.password.trim() !== '') {
          smtpConfig.password = finalSmtpData.password;
        }

        apiCalls.push(axios.post(`${API_BASE_URL}/smtpConfig`, smtpConfig));
      }

      // Execute all API calls in parallel
      if (apiCalls.length > 0) {
        await Promise.all(apiCalls);
        // Update onboarding status to 'configured' - explicitly calling after successful submission
        await updateOnboardingStatus('configured');

        setSubmissionSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
        // setSnackbar({

        toast.success(`Configuration completed`);
      } else {
        // Should not happen anymore since LLM is required
        setSubmissionError('No configurations were set. Please configure at least one service.');
      }
    } catch (error: any) {
      setSubmissionError(
        error.response?.data?.message || 'An error occurred while saving configurations'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // // Handler for skipping the entire configuration
  // const handleSkipConfiguration = async (): Promise<void> => {
  //   try {
  //     setIsSubmitting(true);

  //     if (!isLlmConfigured) {
  //       setSubmissionError('LLm configuration is mandatory');
  //       setIsSubmitting(false);
  //       return;
  //     }
  //     // Update onboarding status to 'skipped' - explicitly calling when user clicks Skip Configuration
  //     await updateOnboardingStatus('skipped');

  //     setSubmissionSuccess(true);
  //     setTimeout(() => {
  //       onClose();
  //     }, 2000);
  //   } catch (error) {
  //     setSubmissionError('Failed to skip the configuration process. Please try again.');
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const handleContinueWithValidation = async () => {
    // Clear any previous error messages
    setSubmissionError('');

    switch (activeStep) {
      case 0: {
        const llmSuccess = await submitLlmForm();
        if (!llmSuccess || !llmValues || llmValues.llmConfigs.length === 0) {
          setSubmissionError('Please configure at least one AI model to continue.');
          return;
        }
        setActiveStep(1);
        break;
      }
      case 1: {
        // Storage step
        // IMPORTANT: Reset the skip state when user tries to continue
        if (skipSteps.storage) {
          setSkipSteps((prev) => ({ ...prev, storage: false }));
        }

        const storageSuccess = await submitStorageForm();
        if (!storageSuccess) {
          setSubmissionError(
            'All required fields for storage must be filled correctly. If you don\'t want to configure storage, please use the "Skip" button.'
          );
          return;
        }

        setActiveStep(2);
        break;
      }

      case 2: {
        // Public URLs step
        if (skipSteps.publicUrls) {
          setSkipSteps((prev) => ({ ...prev, publicUrls: false }));
        }

        const hasUrlInput =
          typeof (window as any).hasUrlInput === 'function' ? (window as any).hasUrlInput() : false;

        if (hasUrlInput) {
          const urlSuccess = await submitUrlForm();
          if (!urlSuccess) {
            setSubmissionError('Please complete all required URL fields or use the "Skip" button.');
            return;
          }
        } else {
          setSubmissionError(
            'Please use the "Skip" button if you don\'t want to configure public URLs.'
          );
          return;
        }

        setActiveStep(3);
        break;
      }
      case 3: {
        // Connector step
        if (skipSteps.connector) {
          setSkipSteps((prev) => ({ ...prev, connector: false }));
        }

        const hasConnectorInput =
          typeof (window as any).hasConnectorInput === 'function'
            ? (window as any).hasConnectorInput()
            : false;

        if (hasConnectorInput) {
          const connectorSuccess = await submitConnectorForm();
          if (!connectorSuccess) {
            setSubmissionError(
              'Please complete all required fields for Google Workspace configuration. If you don\'t want to configure Google Workspace, use the "Skip" button.'
            );
            return;
          }
        } else {
          setSubmissionError(
            'Please use the "Skip" button if you don\'t want to configure Google Workspace.'
          );
          return;
        }

        setActiveStep(4);
        break;
      }

      case 4: {
        // SMTP step (final)
        if (skipSteps.smtp) {
          setSkipSteps((prev) => ({ ...prev, smtp: false }));
        }

        const hasSmtpInput =
          typeof (window as any).hasSmtpInput === 'function'
            ? (window as any).hasSmtpInput()
            : false;

        if (hasSmtpInput) {
          const isValid = await Promise.resolve((window as any).submitSmtpForm());
          if (!isValid) {
            setSubmissionError(
              'Please complete all required SMTP fields or use the "Skip SMTP" button.'
            );
            return;
          }
        } else {
          setSubmissionError(
            'Please use the "Skip SMTP" button if you don\'t want to configure SMTP.'
          );
          return;
        }

        await submitAllConfigurations();
        break;
      }

      default:
        break;
    }
  };

  const renderStepContent = (step: number): React.ReactNode => {
    switch (step) {
      case 0:
        return (
          <MultiLlmConfigStep
            onSubmit={handleLlmSubmit}
            onSkip={() => {}}
            initialValues={llmValues}
          />
        );

      case 1:
        return (
          <StorageConfigStep
            onSubmit={handleStorageSubmit}
            onSkip={() => handleSkipStep('storage')}
            initialValues={storageValues}
          />
        );
      case 2:
        return (
          <UrlConfigStep
            onSubmit={handleUrlSubmit}
            onSkip={() => handleSkipStep('publicUrls')}
            initialValues={urlValues}
          />
        );
      case 3:
        return (
          <ConnectorConfigStep
            onSubmit={handleConnectorSubmit}
            onSkip={() => handleSkipStep('connector')}
            initialValues={connectorValues}
            initialFile={serviceCredentialsFile}
            setMessage={(message) => toast.error(message)}
          />
        );
      case 4:
        return (
          <SmtpConfigStep
            onSubmit={handleSmtpSubmit}
            onSkip={() => handleSkipStep('smtp')}
            isSubmitting={isSubmitting}
            initialValues={smtpValues}
          />
        );
      default:
        return null;
    }
  };

  const renderFooterButtons = () => {
    if (submissionSuccess) {
      return null; // No buttons needed when submission is successful
    }

    // Determine if the Continue/Complete Setup button should be enabled
    const primaryButtonEnabled = () => {
      // If submitting, always disable
      if (isSubmitting) return false;

      // Always enable to allow validation on click
      return true;
    };

    return (
      <>
        {/* Cancel button - only show after first step */}
        {activeStep > 0 && (
          <Button
            variant="outline"
            onClick={handleCloseWithStatus}
            disabled={isSubmitting}
            className="mr-2 text-foreground"
          >
            Cancel
          </Button>
        )}
        {/* Back button - only show if not on first step */}
        {activeStep > 0 && (
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
            className="mr-2 text-foreground"
          >
            Back
          </Button>
        )}
        {/* Skip button - only show for intermediate steps (not first, not last) */}
        {activeStep > 0 && activeStep < steps.length - 1 && (
          <Button
            variant="outline"
            onClick={() => {
              // Make it very clear this is for using default settings
              switch (activeStep) {
                case 1:
                  handleSkipStep('storage');
                  break;
                case 2:
                  handleSkipStep('publicUrls');
                  break;
                case 3:
                  handleSkipStep('connector');
                  break;
                default:
                  break;
              }
            }}
            disabled={isSubmitting}
            className="mr-2 text-foreground"
          >
            Skip
          </Button>
        )}
        {/* Skip button for last step - changed to "Skip SMTP" for clarity */}
        {activeStep === steps.length - 1 && (
          <Button
            variant="outline"
            onClick={() => handleSkipStep('smtp')}
            disabled={isSubmitting}
            className="mr-2 text-foreground"
          >
            Skip SMTP
          </Button>
        )}
        {/* Primary action button */}

        <Button
          variant="outline"
          onClick={handleContinueWithValidation}
          disabled={!primaryButtonEnabled()}
          className=" text-foreground"
        >
          <LoadingState loading={isSubmitting} className="w-fit">
            {isSubmitting
              ? 'Saving...'
              : activeStep === steps.length - 1
                ? 'Complete Setup'
                : 'Continue'}
          </LoadingState>
        </Button>
      </>
    );
  };

  // Get the completion status for the stepper
  const getStepStatus = (stepIndex: number): 'completed' | 'active' | undefined => {
    if (activeStep === stepIndex) return 'active';

    // Mark steps as completed if either they're done or skipped
    if (stepIndex < activeStep) {
      switch (stepIndex) {
        case 0:
          return llmValues ? 'completed' : undefined;
        case 1:
          return skipSteps.storage || storageValues ? 'completed' : undefined;
        case 2:
          return skipSteps.publicUrls || urlValues ? 'completed' : undefined;
        case 3:
          return skipSteps.connector || connectorValues ? 'completed' : undefined;
        case 4:
          return skipSteps.smtp || smtpValues ? 'completed' : undefined;
        default:
          return undefined;
      }
    }

    return undefined;
  };

  // const handleManualSubmit = async () => {
  //   try {
  //     // Verify LLM is configured - required
  //     if (!llmValues) {
  //       setSubmissionError('LLM configuration is required.');
  //       return;
  //     }

  //     // If we're on the SMTP step
  //     if (activeStep === 3) {
  //       // IMPORTANT: Reset the skip state if continuing
  //       if (skipSteps.smtp) {
  //         setSkipSteps((prev) => ({ ...prev, smtp: false }));
  //       }

  //       // Check if there's any input in the SMTP form
  //       const hasSmtpInput =
  //         typeof (window as any).hasSmtpInput === 'function'
  //           ? (window as any).hasSmtpInput()
  //           : false;

  //       if (hasSmtpInput) {
  //         // If there's any input, validate ALL fields
  //         const isValid = await Promise.resolve((window as any).submitSmtpForm());
  //         if (!isValid) {
  //           setSubmissionError(
  //             'Please complete all required SMTP fields or use the "Skip SMTP Configuration" button.'
  //           );
  //           return;
  //         }
  //       } else {
  //         // No input - force using the Skip button
  //         setSubmissionError(
  //           'Please use the "Skip SMTP Configuration" button if you don\'t want to configure SMTP.'
  //         );
  //         return;
  //       }
  //     }

  //     // All validations passed, submit configurations
  //     await submitAllConfigurations();
  //   } catch (error) {
  //     console.error('Error in form submission:', error);
  //     setSubmissionError('An error occurred during validation. Please try again.');
  //   }
  // };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCloseNoStatus();
        }
      }}
    >
      <AlertDialogContent className="!max-w-4xl w-[95vw] max-h-[95vh] overflow-hidden bg-background">
        <AlertDialogHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <AlertDialogTitle className="text-xl font-semibold">
            System Configuration
          </AlertDialogTitle>
          {activeStep >= 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseWithStatus}
              disabled={isSubmitting}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </AlertDialogHeader>

        <ScrollArea className="max-h-[70vh] px-1">
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            steps={steps}
            getStepStatus={getStepStatus}
            renderStepLabel={(label, index) => (
              <span className="text-sm font-medium">
                {label}
                {skipSteps.storage && index === 1 && (
                  <span className="ml-1 text-xs text-muted-foreground">(Skipped)</span>
                )}
                {skipSteps.publicUrls && index === 2 && (
                  <span className="ml-1 text-xs text-muted-foreground">(Skipped)</span>
                )}
                {skipSteps.connector && index === 3 && (
                  <span className="ml-1 text-xs text-muted-foreground">(Skipped)</span>
                )}
                {skipSteps.smtp && index === 4 && (
                  <span className="ml-1 text-xs text-muted-foreground">(Skipped)</span>
                )}
              </span>
            )}
          />

          {submissionSuccess ? (
            <Alert className="mt-4">
              <AlertDescription>Configuration saved successfully.</AlertDescription>
            </Alert>
          ) : (
            <>
              {submissionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription className="flex items-center justify-between">
                    <span>{submissionError}</span>
                    <button
                      onClick={() => setSubmissionError('')}
                      className="ml-2 text-destructive hover:text-destructive/80"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              {renderStepContent(activeStep)}
            </>
          )}
        </ScrollArea>

        <AlertDialogFooter className="pt-4 border-t">{renderFooterButtons()}</AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfigurationStepper;
