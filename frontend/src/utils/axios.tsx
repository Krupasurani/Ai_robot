import type { ReactNode } from 'react';
import type { AxiosRequestConfig } from 'axios';

import axios from 'axios';
import React, { useMemo, useEffect, useContext, useCallback, createContext } from 'react';
import { toast } from 'sonner';

import { CONFIG } from 'src/config-global';
import { STORAGE_KEY, SESSION_TOKEN_KEY } from 'src/auth/context/jwt/constant';

// Error types for better classification
export enum ErrorType {
  SERVER_ERROR = 'SERVER_ERROR', // 5xx errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', // 401, 403 errors
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 400 errors with validation issues
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR', // 404 errors
  NETWORK_ERROR = 'NETWORK_ERROR', // Connection issues
  TIMEOUT_ERROR = 'TIMEOUT_ERROR', // Request timeout
  UNKNOWN_ERROR = 'UNKNOWN_ERROR', // Fallback for other errors
}

// Standardized error response
export interface ProcessedError {
  type: ErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
  retry?: boolean; // Flag indicating if this error can be retried
}

// Context for error handling and snackbar
interface ErrorContextType {
  showError: (message: string) => void;
}

const ErrorContext = createContext<ErrorContextType | null>(null);

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

// Create axios instance with config
const axiosInstance = axios.create({ baseURL: CONFIG.backendUrl });

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem(STORAGE_KEY);
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken && !config.headers['x-session-token']) {
      config.headers['x-session-token'] = sessionToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced error handling in interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Default error structure
    const processedError: ProcessedError = {
      type: ErrorType.UNKNOWN_ERROR,
      message:
        error?.response?.data?.error?.message || 'Something went wrong. Please try again later.',
      retry: false,
    };

    // Axios error with response from server
    if (axios.isAxiosError(error)) {
      // Connection or timeout errors (no response)
      if (!error.response) {
        if (error.code === 'ECONNABORTED') {
          processedError.type = ErrorType.TIMEOUT_ERROR;
          processedError.message = 'Request timed out. Please try again.';
          processedError.retry = true;
        } else if (error.message && error.message.includes('Network Error')) {
          processedError.type = ErrorType.NETWORK_ERROR;
          processedError.message =
            'Unable to connect to server. Please check your internet connection.';
          processedError.retry = true;
        }
      }
      // Server responded with an error status
      else if (error.response) {
        processedError.statusCode = error.response.status;

        // Set message, code and details from response if available
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            processedError.message = error.response.data;
          } else {
            const data = error.response.data as any;
            if (data.error?.code) {
              processedError.code = data.error.code;
            }
            // Prefer metadata.detail for logs
            if (data.error?.metadata?.detail) {
              processedError.message = data.error.metadata.detail;
            } else if (data.error?.message) {
              processedError.message = data.error.message;
            } else if (data.detail) {
              // RFC7807-style ProblemDetails
              processedError.message = data.detail;
            }
            // Store additional details if available
            if (data.error) {
              processedError.details = data.error;
            }
            if (processedError.code === 'NO_FREE_LICENSES') {
              processedError.type = ErrorType.VALIDATION_ERROR;
              processedError.message =
                processedError.message ||
                'No free licenses available. Please increase your seat allocation.';
            }
          }
        }

        // Categorize by status code
        if (error.response.status >= 500) {
          processedError.type = ErrorType.SERVER_ERROR;
          processedError.message =
            processedError.message || 'The server encountered an error. Please try again later.';
          processedError.retry = true;
        } else if (error.response.status === 401) {
          processedError.type = ErrorType.AUTHENTICATION_ERROR;
          processedError.message =
            processedError.message || 'Authentication failed. Please sign in again.';
        } else if (error.response.status === 403) {
          // 403 can be either auth/permission error or feature flag (beta) restriction
          processedError.type = ErrorType.AUTHENTICATION_ERROR;
          // Use the detailed message from backend if available (beta access messages are descriptive)
          processedError.message =
            processedError.message || 'Access denied. Please check your permissions or settings.';
        } else if (error.response.status === 404) {
          processedError.type = ErrorType.NOT_FOUND_ERROR;
          processedError.message =
            processedError.message || 'The requested resource was not found.';
        } else if (error.response.status === 400) {
          processedError.type = ErrorType.VALIDATION_ERROR;
          processedError.message =
            processedError.message || 'Invalid input data. Please check and try again.';
        }
      }
    }
    // Handle non-axios errors
    else if (error instanceof Error) {
      processedError.message = error.message;
    }

    const getErrorTranslationKey = (err: ProcessedError): string => {
      if (err.code) {
        return `errors.backend.${err.code}`;
      }
      switch (err.type) {
        case ErrorType.TIMEOUT_ERROR:
          return 'errors.network.timeout';
        case ErrorType.NETWORK_ERROR:
          return 'errors.network.general';
        case ErrorType.AUTHENTICATION_ERROR:
          return 'errors.auth.general';
        case ErrorType.NOT_FOUND_ERROR:
          return 'errors.generic.not_found';
        case ErrorType.VALIDATION_ERROR:
          return 'errors.validation.general';
        case ErrorType.SERVER_ERROR:
          return 'errors.generic.server';
        default:
          return 'errors.generic.unknown';
      }
    };

    // Try to show error in snackbar if ErrorContext is available
    try {
      const errorContext = window.__errorContext;
      if (errorContext && errorContext.showError) {
        const key = getErrorTranslationKey(processedError);
        // Prefer localized UI message; fall back to English backend message for logs
        const localized = (window as any).i18next?.t
          ? (window as any).i18next.t(key)
          : processedError.message;
        errorContext.showError(localized || processedError.message);
      }
    } catch (e) {
      console.error('Failed to show error in snackbar:', e);
    }

    return Promise.reject(processedError);
  }
);

// Error provider component that provides toast functionality
export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const showError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const contextValue = useMemo(() => ({ showError }), [showError]);

  // Make error handler available globally
  useEffect(() => {
    window.__errorContext = contextValue;
    return () => {
      delete window.__errorContext;
    };
  }, [contextValue]);

  return <ErrorContext.Provider value={contextValue}>{children}</ErrorContext.Provider>;
};

export default axiosInstance;

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];
    const res = await axiosInstance.get(url, { ...config });
    return res.data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

export const endpoints = {
  chat: '/api/chat',
  kanban: '/api/kanban',
  calendar: '/api/calendar',
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/sign-in',
    signUp: '/api/auth/sign-up',
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list: '/api/product/list',
    details: '/api/product/details',
    search: '/api/product/search',
  },
};

// Helper function to wrap API calls with error handling
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  errorCallback?: (error: ProcessedError) => void
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    // Error is already processed by our interceptor
    if (errorCallback && (error as ProcessedError).type) {
      errorCallback(error as ProcessedError);
    }
    throw error;
  }
}
