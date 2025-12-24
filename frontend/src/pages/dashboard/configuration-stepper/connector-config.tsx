import { z } from 'zod';
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail,
  AlertTriangle,
  Trash2,
  FileText,
  Info,
  Upload,
  CloudUpload,
  AlertCircle,
  UserCog,
  Lock,
  CheckCircle2,
} from 'lucide-react';

import axios from 'src/utils/axios';
import { Button } from '@/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Scrollbar } from '@/components/custom/scrollbar';
import { useAuthContext } from 'src/auth/hooks';
import type { ConnectorFormValues } from './types';

const getCurrentRedirectUri = () => {
  const currentUrl = new URL(window.location.href);
  currentUrl.hash = '';
  currentUrl.search = '';
  const currentUri = currentUrl.toString();
  const currentRedirectUri = currentUri.endsWith('/')
    ? `${currentUri}account/individual/settings/connector/googleWorkspace`
    : `${currentUri}/account/individual/settings/connector/googleWorkspace`;

  return currentRedirectUri;
};
const getRedirectUris = async () => {
  // Get the current window URL without hash and search parameters

  const currentWindowLocation = getCurrentRedirectUri();

  // Get the frontend URL from the backend
  try {
    const response = await axios.get(`/api/v1/configurationManager/frontendPublicUrl`);
    const frontendBaseUrl = response.data.url;
    // Ensure the URL ends with a slash if needed
    const frontendUrl = frontendBaseUrl.endsWith('/')
      ? `${frontendBaseUrl}account/individual/settings/connector/googleWorkspace`
      : `${frontendBaseUrl}/account/individual/settings/connector/googleWorkspace`;

    return {
      currentWindowLocation,
      recommendedRedirectUri: frontendUrl,
      urisMismatch: currentWindowLocation !== frontendUrl,
    };
  } catch (error) {
    console.error('Error fetching frontend URL:', error);
    return {
      currentWindowLocation,
      recommendedRedirectUri: currentWindowLocation,
      urisMismatch: false,
    };
  }
};

// Updated schema for business accounts to include admin email field
const businessConnectorSchema = z.object({
  googleWorkspace: z.object({
    serviceCredentials: z.string().min(1, 'Service credentials are required'),
    clientId: z.string().optional(),
    clientEmail: z.string().optional(),
    privateKey: z.string().optional(),
    projectId: z.string().optional(),
    adminEmail: z.string().email('Invalid email address').min(1, 'Admin email is required'),
    enableRealTimeUpdates: z.boolean().optional(),
    topicName: z.string().optional(),
  }),
});

const individualConnectorSchema = z.object({
  googleWorkspace: z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required'),
    enableRealTimeUpdates: z.boolean().optional(),
    topicName: z.string().optional(),
  }),
});

// Constants remain unchanged
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/json'];
const ALLOWED_FILE_EXTENSIONS = ['.json'];

interface ConnectorConfigStepProps {
  onSubmit: (data: ConnectorFormValues, file: File | null) => void;
  onSkip: () => void;
  initialValues: ConnectorFormValues | null;
  initialFile: File | null;
  setMessage: (message: string) => void;
}

const ConnectorConfigStep: React.FC<ConnectorConfigStepProps> = ({
  onSubmit,
  onSkip,
  initialValues,
  initialFile,
  setMessage,
}) => {
  const [redirectUris, setRedirectUris] = useState<{
    currentWindowLocation: string;
    recommendedRedirectUri: string;
    urisMismatch: boolean;
  } | null>(null);
  const { user } = useAuthContext();
  const accountType = user?.accountType || 'individual';

  const [serviceCredentialsFile, setServiceCredentialsFile] = useState<File | null>(null);
  const [parsedJsonData, setParsedJsonData] = useState<any>(null);
  const [credentialsError, setCredentialsError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [formPartiallyFilled, setFormPartiallyFilled] = useState<boolean>(false);
  const [validationAttempted, setValidationAttempted] = useState<boolean>(false);
  const [webhookBaseUrl, setWebhookBaseUrl] = useState('');
  const [enableRealTimeUpdates, setEnableRealTimeUpdates] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [topicNameError, setTopicNameError] = useState<string | null>(null);
  // Form for business accounts (file upload with extracted fields)
  const businessForm = useForm<any>({
    resolver: zodResolver(businessConnectorSchema),
    mode: 'onChange',
    defaultValues: {
      googleWorkspace: {
        serviceCredentials: '',
        clientId: '',
        clientEmail: '',
        privateKey: '',
        projectId: '',
        adminEmail: '',
        enableRealTimeUpdates: false,
        topicName: '',
      },
    },
  });

  // Form for individual accounts (always visible)
  const individualForm = useForm<any>({
    resolver: zodResolver(individualConnectorSchema),
    mode: 'onChange',
    defaultValues: {
      googleWorkspace: {
        clientId: '',
        clientSecret: '',
        redirectUri: redirectUris?.recommendedRedirectUri || getCurrentRedirectUri(),
        enableRealTimeUpdates: false,
        topicName: '',
      },
    },
  });
  useEffect(() => {
    const fetchConnectorUrl = async () => {
      try {
        // You need to implement or import a getConnectorPublicUrl function
        // that matches your API structure
        const response = await axios.get('/api/v1/configurationManager/connectorPublicUrl');
        if (response.data?.url) {
          setWebhookBaseUrl(response.data.url);
        }
      } catch (error) {
        console.error('Failed to load connector URL', error);
        // Fallback to window location
        setWebhookBaseUrl(window.location.origin);
      }
    };

    fetchConnectorUrl();
  }, []);
  // First useEffect to fetch redirect URIs and update form
  useEffect(() => {
    const initializeForm = async () => {
      // Get redirect URIs info
      const uris = await getRedirectUris();
      setRedirectUris(uris);

      // Update the existing individualForm with the new redirectUri
      individualForm.setValue(
        'googleWorkspace.redirectUri',
        uris?.recommendedRedirectUri || getCurrentRedirectUri()
      );
    };

    initializeForm();
  }, [individualForm]);

  const handleRealTimeUpdatesChange = (checked: boolean) => {
    setEnableRealTimeUpdates(checked);

    if (checked && (!topicName || topicName.trim() === '')) {
      setTopicNameError('Topic name is required when real-time updates are enabled');
    } else {
      setTopicNameError(null);
    }

    // Update the form value but without validation concerns
    if (accountType === 'business') {
      businessForm.setValue('googleWorkspace.enableRealTimeUpdates', checked);
    } else {
      individualForm.setValue('googleWorkspace.enableRealTimeUpdates', checked);
    }
  };

  const handleTopicNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setTopicName(name);
    if (name && name.trim() !== '') {
      setTopicNameError(null);
    } else if (enableRealTimeUpdates) {
      setTopicNameError('Topic name is required when real-time updates are enabled');
    }

    // Update the form value
    if (accountType === 'business') {
      businessForm.setValue('googleWorkspace.topicName', name);
    } else {
      individualForm.setValue('googleWorkspace.topicName', name);
    }
  };

  // 4. Initialize from initial values if needed
  useEffect(() => {
    if (initialValues?.googleWorkspace) {
      if ('enableRealTimeUpdates' in initialValues.googleWorkspace) {
        setEnableRealTimeUpdates(!!initialValues.googleWorkspace.enableRealTimeUpdates);
      }

      if (initialValues.googleWorkspace.topicName) {
        setTopicName(initialValues.googleWorkspace.topicName);
      }
    }
  }, [initialValues]);
  // Determine which form to use based on account type
  const { handleSubmit, formState, control, watch, getValues } =
    accountType === 'business' ? businessForm : individualForm;

  const { isValid } = formState;

  // Watch form fields to determine if partially filled
  const formValues = watch();

  // Function to check if the form has any user input
  const hasAnyInput = useCallback((): boolean => {
    if (accountType === 'business') {
      // For business accounts, check admin email and file
      const values = getValues().googleWorkspace;
      const { adminEmail } = values;
      return (adminEmail && adminEmail.trim() !== '') || serviceCredentialsFile !== null;
    }
    // For individual accounts, check client ID and secret
    const values = getValues().googleWorkspace;
    return (
      (values.clientId && values.clientId.trim() !== '') ||
      (values.clientSecret && values.clientSecret.trim() !== '')
    );
  }, [accountType, getValues, serviceCredentialsFile]);

  // Check if the form is partially filled but not completely valid
  useEffect(() => {
    setFormPartiallyFilled(hasAnyInput() && !isValid);
  }, [formValues, isValid, hasAnyInput]);

  // Second useEffect to initialize form with initial values and file
  useEffect(() => {
    if (initialValues) {
      if (accountType === 'business') {
        businessForm.reset(initialValues);
      } else {
        individualForm.reset(initialValues);
      }
    }
    if (initialFile) {
      setServiceCredentialsFile(initialFile);
      setParsedJsonData(true);
    }
  }, [initialValues, initialFile, accountType, businessForm, individualForm]);

  // Extract data from uploaded JSON for individual users
  const extractIndividualDataFromJson = useCallback(
    (jsonData: any) => {
      try {
        console.log('Parsing individual JSON data:', jsonData);

        // Web application credentials format
        if (jsonData.web) {
          const clientId = jsonData.web.client_id;
          const clientSecret = jsonData.web.client_secret;

          if (clientId && clientSecret) {
            individualForm.setValue('googleWorkspace.clientId', clientId, { shouldValidate: true });
            individualForm.setValue('googleWorkspace.clientSecret', clientSecret, {
              shouldValidate: true,
            });

            return true;
          }
        }

        // Try installed application format
        if (jsonData.installed) {
          const clientId = jsonData.installed.client_id;
          const clientSecret = jsonData.installed.client_secret;

          if (clientId && clientSecret) {
            individualForm.setValue('googleWorkspace.clientId', clientId, { shouldValidate: true });
            individualForm.setValue('googleWorkspace.clientSecret', clientSecret, {
              shouldValidate: true,
            });

            return true;
          }
        }

        // Try direct properties (less common but possible)
        const clientId = jsonData.clientId || jsonData.client_id;
        const clientSecret = jsonData.clientSecret || jsonData.client_secret;

        if (clientId && clientSecret) {
          individualForm.setValue('googleWorkspace.clientId', clientId, { shouldValidate: true });
          individualForm.setValue('googleWorkspace.clientSecret', clientSecret, {
            shouldValidate: true,
          });

          return true;
        }

        setMessage('Could not find client ID and client secret in the JSON file');
        return false;
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        setMessage('Failed to extract data from JSON file');
        return false;
      }
    },
    [individualForm, setMessage]
  );

  // Extract data from uploaded JSON for business users
  const extractBusinessDataFromJson = useCallback(
    (jsonData: any) => {
      try {
        // Store the full parsed JSON for later use
        setParsedJsonData(jsonData);

        // Extract required fields
        businessForm.setValue('googleWorkspace.clientId', jsonData.client_id || '', {
          shouldValidate: true,
        });
        businessForm.setValue('googleWorkspace.clientEmail', jsonData.client_email || '', {
          shouldValidate: true,
        });
        businessForm.setValue('googleWorkspace.privateKey', jsonData.private_key || '', {
          shouldValidate: true,
        });
        businessForm.setValue('googleWorkspace.projectId', jsonData.project_id || '', {
          shouldValidate: true,
        });

        return true;
      } catch (error) {
        setMessage('Failed to extract JSON data');
        return false;
      }
    },
    // eslint-disable-next-line
    [businessForm]
  );

  // Expose submit method to parent component
  useEffect(() => {
    (window as any).submitConnectorForm = async () => {
      // Always set validation flag when Continue is clicked
      if (initialFile && serviceCredentialsFile) {
        return true;
      }
      setValidationAttempted(true);

      // Check if form is empty - users must explicitly use Skip
      const isEmpty = !hasAnyInput();
      if (isEmpty) {
        setMessage(
          'Please use the "Skip Google Workspace" button if you don\'t want to configure Google Workspace.'
        );
        return false;
      }

      // For business accounts
      if (accountType === 'business') {
        const { adminEmail } = businessForm.getValues().googleWorkspace;

        // Check for admin email
        if (!adminEmail || adminEmail.trim() === '') {
          setMessage('Admin email is required for business accounts');
          return false;
        }

        // Check for valid admin email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
          setMessage('Please enter a valid admin email address');
          return false;
        }

        // Check for credentials file
        if (!serviceCredentialsFile) {
          setMessage('Service credentials file is required for business accounts');
          return false;
        }

        // Check if we have the required data extracted from JSON
        if (!parsedJsonData) {
          setMessage('Invalid or incomplete service credentials file');
          return false;
        }

        // Run form validation
        const isFormValid = await businessForm.trigger();
        if (!isFormValid) {
          setMessage('Please complete all required fields for Google Workspace configuration.');
          return false;
        }

        // All validations passed for business account
        handleSubmit((data) => {
          onSubmit(data, serviceCredentialsFile);
        })();
        return true;
      }

      // For individual accounts
      if (accountType === 'individual') {
        const values = individualForm.getValues().googleWorkspace;

        if (!values.clientId || values.clientId.trim() === '') {
          setMessage('Client ID is required');
          return false;
        }

        if (!values.clientSecret || values.clientSecret.trim() === '') {
          setMessage('Client Secret is required');
          return false;
        }

        // Run form validation
        const isFormValid = await individualForm.trigger();
        if (!isFormValid) {
          setMessage('Please complete all required fields for Google Workspace configuration.');
          return false;
        }

        // All validations passed for individual account
        handleSubmit((data) => {
          onSubmit(data, serviceCredentialsFile);
        })();
        return true;
      }

      // Should never reach here, but just in case
      setMessage('Please complete all required fields for Google Workspace configuration.');
      return false;
    };

    // Add a method to check if the form has any input - useful for the parent component
    (window as any).hasConnectorInput = () => hasAnyInput();

    // Method to directly skip without validation
    (window as any).skipConnectorForm = () => {
      onSkip();
      return true;
    };

    return () => {
      delete (window as any).submitConnectorForm;
      delete (window as any).hasConnectorInput;
      delete (window as any).skipConnectorForm;
    };
  }, [
    accountType,
    businessForm,
    individualForm,
    serviceCredentialsFile,
    handleSubmit,
    onSubmit,
    parsedJsonData,
    setMessage,
    hasAnyInput,
    onSkip,
    initialFile,
  ]);

  // Validate file type using both extension and MIME type
  const validateFileType = useCallback((file: File): boolean => {
    // Check file extension
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const isValidExtension = ALLOWED_FILE_EXTENSIONS.includes(fileExtension);

    // Check MIME type (more reliable than extension)
    const isValidMimeType = ALLOWED_FILE_TYPES.includes(file.type);

    // For JSON files, we need to be more forgiving with MIME types as they can vary
    // Some systems might report "text/plain" or other MIME types for JSON
    const isJsonFile = fileExtension === '.json';

    return isValidExtension && (isValidMimeType || isJsonFile);
  }, []);

  // Process the selected file
  const processFile = useCallback(
    (file: File): void => {
      setIsProcessing(true);
      setCredentialsError('');

      // Check file size
      if (file.size > FILE_SIZE_LIMIT) {
        setCredentialsError(
          `File is too large. Maximum size is ${FILE_SIZE_LIMIT / (1024 * 1024)} MB.`
        );
        setIsProcessing(false);
        return;
      }

      // Check file type
      if (!validateFileType(file)) {
        setCredentialsError('Only JSON files are supported. Please select a valid JSON file.');
        setIsProcessing(false);
        return;
      }

      setServiceCredentialsFile(file);
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target && typeof e.target.result === 'string') {
          try {
            // Validate JSON structure
            const jsonData = JSON.parse(e.target.result);

            if (accountType === 'business') {
              // Business account validation
              if (!jsonData.client_id || !jsonData.client_email || !jsonData.private_key) {
                throw new Error('Missing required fields in service account credentials file');
              }

              // Store the raw JSON content
              businessForm.setValue('googleWorkspace.serviceCredentials', e.target.result, {
                shouldValidate: true,
              });

              // Extract fields for business
              extractBusinessDataFromJson(jsonData);
            } else if (!extractIndividualDataFromJson(jsonData)) {
              // Individual account handling - using else if
              throw new Error('Missing required fields in the JSON file (clientId, clientSecret)');
            }

            setIsProcessing(false);
          } catch (error: any) {
            setCredentialsError(
              `Invalid JSON format: ${error.message || 'The file does not contain valid JSON data.'}`
            );
            setServiceCredentialsFile(null);
            setParsedJsonData(null);
            setIsProcessing(false);
          }
        }
      };

      reader.onerror = () => {
        setCredentialsError('Error reading file. Please try again.');
        setServiceCredentialsFile(null);
        setParsedJsonData(null);
        setIsProcessing(false);
      };

      reader.readAsText(file);
    },
    [
      validateFileType,
      accountType,
      extractIndividualDataFromJson,
      businessForm,
      extractBusinessDataFromJson,
    ]
  );

  // Handle file selection from input
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCredentialsError('');
      const { files } = event.target;

      if (files && files[0]) {
        processFile(files[0]);
      }
      // Reset the file input to ensure onChange fires even if the same file is selected again
      event.target.value = '';
    },
    [processFile]
  );

  const handleFormSubmit = useCallback(
    (data: any) => {
      setValidationAttempted(true);

      if (enableRealTimeUpdates && (!topicName || topicName.trim() === '')) {
        setTopicNameError('Topic name is required when real-time updates are enabled');
        setMessage(
          'Please provide a Google Pub/Sub topic name when real-time updates are enabled.'
        );
        return;
      }
      if (formPartiallyFilled) {
        setMessage('Please complete all required fields or use the "Skip Google Workspace" button');
        return;
      }

      if (accountType === 'business') {
        if (serviceCredentialsFile && parsedJsonData) {
          onSubmit(data, serviceCredentialsFile);
        } else {
          setMessage('Service credentials file is required for business accounts');
        }
      } else {
        // Individual account validation
        if (!data.googleWorkspace.clientId || data.googleWorkspace.clientId.trim() === '') {
          setMessage('Client ID is required');
          return;
        }

        if (!data.googleWorkspace.clientSecret || data.googleWorkspace.clientSecret.trim() === '') {
          setMessage('Client Secret is required');
          return;
        }

        onSubmit(data, serviceCredentialsFile);
      }
    },
    [
      accountType,
      onSubmit,
      serviceCredentialsFile,
      parsedJsonData,
      formPartiallyFilled,
      setMessage,
      enableRealTimeUpdates,
      topicName,
    ]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const { files } = e.dataTransfer;
      if (files.length > 1) {
        setCredentialsError('Please drop only one file.');
        return;
      }

      if (files && files[0]) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  // Remove file handler
  const handleRemoveFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setServiceCredentialsFile(null);
      setParsedJsonData(null);

      if (accountType === 'business') {
        businessForm.setValue('googleWorkspace.serviceCredentials', '', { shouldValidate: true });
        businessForm.setValue('googleWorkspace.clientId', '');
        businessForm.setValue('googleWorkspace.clientEmail', '');
        businessForm.setValue('googleWorkspace.privateKey', '');
        businessForm.setValue('googleWorkspace.projectId', '');
      }
      // For individual accounts, we keep the form values to allow manual editing
    },
    [accountType, businessForm]
  );

  // Direct form submission handler
  const onFormSubmit = (data: ConnectorFormValues) => {
    handleFormSubmit(data);
  };

  return (
    <form
      id="connector-config-form"
      onSubmit={handleSubmit(onFormSubmit)}
      noValidate
      className={cn(
        'h-full flex flex-col rounded-2xl overflow-hidden bg-background border border-border shadow-sm'
      )}
    >
      <Scrollbar className="p-6 sm:p-8 pb-4 sm:pb-6 h-full">
        {/* Header with logo */}
        <div className="flex items-center space-x-6 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted border border-border flex-shrink-0">
            <svg width={28} height={28} viewBox="0 0 24 24" className="text-primary">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Google Workspace
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {accountType === 'business'
                ? 'Upload your service account credentials and set admin email'
                : 'Configure your OAuth credentials'}
            </p>
          </div>
        </div>

        {/* Information alert explaining requirements */}
        <div className="mb-4">
          <div className="bg-muted border border-border rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info size={20} className="text-primary" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-foreground">
                  {accountType === 'business'
                    ? 'To configure Google Workspace for business accounts, you need to provide both an admin email and upload a service credentials file.'
                    : 'To configure Google Workspace, you need to provide both Client ID and Client Secret.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Business account admin email field */}
        {accountType === 'business' && (
          <div className="space-y-4 mb-6">
            <Controller
              name="googleWorkspace.adminEmail"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <Label
                    htmlFor="admin-email"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Admin Email Address
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={20} className="text-muted-foreground" />
                    </div>
                    <Input
                      {...field}
                      id="admin-email"
                      type="email"
                      placeholder="e.g., admin@yourdomain.com"
                      className={`pl-10 ${validationAttempted && fieldState.error ? 'border-red-300 bg-red-50' : ''}`}
                    />
                  </div>
                  {validationAttempted && fieldState.error ? (
                    <p className="mt-1 text-xs text-destructive">{fieldState.error.message}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Required - Admin email for your Google Workspace
                    </p>
                  )}
                </div>
              )}
            />
          </div>
        )}

        {/* Individual account form fields */}
        {accountType === 'individual' && redirectUris?.urisMismatch && (
          <div className="bg-muted border border-border rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle size={20} className="text-primary" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-foreground mb-2">
                  Redirect URI mismatch detected! Using the recommended URI from backend
                  configuration.
                </p>
                <p className="text-xs text-muted-foreground">
                  Current window location: {redirectUris.currentWindowLocation}
                </p>
                <p className="text-xs text-muted-foreground">
                  Recommended redirect URI: {redirectUris.recommendedRedirectUri}
                </p>
              </div>
            </div>
          </div>
        )}
        {accountType === 'individual' && (
          <>
            <div className="mb-6 p-4 rounded-lg bg-muted border border-border flex items-start gap-2">
              <Info size={20} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm text-foreground">
                  <span className="font-medium text-primary">Redirect URI:</span>{' '}
                  {redirectUris?.recommendedRedirectUri}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <Controller
                name="googleWorkspace.clientId"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <Label
                      htmlFor="client-id"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Client ID
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserCog size={20} className="text-muted-foreground" />
                      </div>
                      <Input
                        {...field}
                        id="client-id"
                        type="text"
                        placeholder="e.g., 969340771549-75fn6kuu6p4oapk45ibrc5acpps.com"
                        className={`pl-10 ${validationAttempted && fieldState.error ? 'border-red-300 bg-red-50' : ''}`}
                      />
                    </div>
                    {validationAttempted && fieldState.error ? (
                      <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        Required - Client ID from Google Developer Console
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                name="googleWorkspace.clientSecret"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <Label
                      htmlFor="client-secret"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Client Secret
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={20} className="text-muted-foreground" />
                      </div>
                      <Input
                        {...field}
                        id="client-secret"
                        type="password"
                        placeholder="e.g., GOCSPX-1234abcdef"
                        className={`pl-10 ${validationAttempted && fieldState.error ? 'border-red-300 bg-red-50' : ''}`}
                      />
                    </div>
                    {validationAttempted && fieldState.error ? (
                      <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        Required - Client Secret from Google Developer Console
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </>
        )}

        {/* File Upload UI */}
        <div className="mt-0 mb-4 flex-grow">
          {accountType === 'individual' && (
            <div className="flex items-center space-x-3 mb-8">
              <div className="flex-grow border-t border-border" />
              <span className="px-3 py-1 text-xs font-semibold tracking-wide border border-border text-muted-foreground rounded-lg">
                OR UPLOAD CREDENTIALS
              </span>
              <div className="flex-grow border-t border-border" />
            </div>
          )}

          <div
            className={cn(
              'relative border-2 border-dashed rounded-xl h-52 sm:h-56 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-200 mx-0 sm:mx-1 mt-1 mb-6 sm:mb-8',
              isDragging
                ? 'border-primary bg-muted'
                : serviceCredentialsFile
                  ? 'border-border bg-muted'
                  : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-muted hover:shadow-md',
              isProcessing && 'cursor-wait'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !isProcessing && document.getElementById('file-upload-input')?.click()}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (!isProcessing && (e.key === 'Enter' || e.key === ' ')) {
                document.getElementById('file-upload-input')?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Processing file...
                </p>
              </div>
            ) : !serviceCredentialsFile ? (
              <>
                <div
                  className={cn(
                    'flex items-center justify-center w-15 h-15 rounded-full mb-6 transition-all duration-200 bg-muted border border-border',
                    isDragging && 'scale-105'
                  )}
                >
                  {isDragging ? (
                    <Upload size={32} className="text-primary transition-transform duration-200" />
                  ) : (
                    <CloudUpload
                      size={32}
                      className="text-muted-foreground transition-transform duration-200"
                    />
                  )}
                </div>
                <h3
                  className={cn(
                    'text-lg font-semibold mb-1',
                    isDragging ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {isDragging
                    ? 'Drop file here'
                    : accountType === 'business'
                      ? 'Upload service credentials'
                      : 'Upload JSON credentials'}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">or click to browse files</p>
                <div className="px-3 py-1 rounded-md bg-muted border border-border flex items-center">
                  <Info size={14} className="text-primary mr-1" />
                  <span className="text-xs font-medium text-primary">
                    Only .json files supported (max 5MB)
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-3 w-full">
                <div className="flex items-center justify-center w-13 h-13 rounded-full bg-muted border border-border mb-2">
                  <CheckCircle2 size={28} className="text-primary" />
                </div>

                <div className="px-4 py-2 rounded-lg bg-background border border-border shadow-sm flex items-center max-w-full">
                  <FileText size={20} className="text-primary flex-shrink-0 mr-2" />
                  <span className="text-sm font-medium truncate">
                    {serviceCredentialsFile.name}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {(serviceCredentialsFile.size / 1024).toFixed(1)} KB
                </p>

                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  onClick={handleRemoveFile}
                >
                  <Trash2 size={18} className="mr-1" />
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="border border-border rounded-lg p-6 bg-muted/40">
            <div className="flex items-start mb-3">
              <Label htmlFor="realtime-updates-checkbox" className="flex items-center">
                <Checkbox
                  id="realtime-updates-checkbox"
                  checked={enableRealTimeUpdates}
                  onCheckedChange={handleRealTimeUpdatesChange}
                  className="mr-3 w-5 h-5"
                />
                <span className="text-sm font-semibold text-foreground">
                  Enable Real-time Gmail Updates
                </span>
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4 pl-8">
              By enabling this feature, you will receive real-time updates for new emails in your
              Google Workspace. This requires a valid Google Pub/Sub topic name.
            </p>
            {enableRealTimeUpdates && (
              <div className="pl-8">
                <div className="p-4 mb-3 rounded-lg bg-muted border border-border flex items-start gap-2">
                  <Info size={20} className="text-primary mt-0.5" />
                  <p className="text-sm text-foreground">
                    When creating your Pub/Sub topic, set the endpoint URL as{' '}
                    <span className="font-bold">{webhookBaseUrl}/gmail/webhook</span>
                  </p>
                </div>
                <Label
                  htmlFor="topic-name"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Google Pub/Sub Topic Name
                </Label>
                <Input
                  id="topic-name"
                  type="text"
                  value={topicName}
                  onChange={handleTopicNameChange}
                  placeholder="projects/your-project/topics/your-topic"
                  className={`${topicNameError ? 'border-red-300 bg-red-50' : ''} mb-2`}
                />
                {topicNameError && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{topicNameError}</p>
                )}
                {!topicNameError && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Enter the Google Pub/Sub topic that will receive Gmail notifications
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Validation messages */}
        {validationAttempted && !isValid && hasAnyInput() && (
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 shadow-sm flex items-start">
            <AlertCircle size={22} className="text-destructive mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {accountType === 'business'
                  ? 'Google Workspace configuration requires both admin email and service credentials file.'
                  : 'Google Workspace configuration requires both Client ID and Client Secret.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please complete all required fields or use the Skip button to bypass Google
                Workspace configuration.
              </p>
            </div>
          </div>
        )}

        {/* Warning for partially filled forms */}
        {formPartiallyFilled && (
          <div className="mb-4 p-4 rounded-lg bg-muted border-l-4 border-primary shadow-sm flex items-start">
            <AlertTriangle size={22} className="text-primary mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-foreground">
              Please complete all required fields or use the Skip button. Partial configuration is
              not allowed.
            </p>
          </div>
        )}

        {credentialsError && (
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 border-l-4 border-destructive shadow-sm flex items-start">
            <AlertCircle size={22} className="text-destructive mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-destructive">{credentialsError}</p>
          </div>
        )}

        {/* Hidden file input */}
        <input
          id="file-upload-input"
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        {/* Hidden submit button for programmatic submission */}
        <Button type="submit" className="hidden" id="connector-form-submit-button">
          Submit
        </Button>
      </Scrollbar>
    </form>
  );
};

export default ConnectorConfigStep;
