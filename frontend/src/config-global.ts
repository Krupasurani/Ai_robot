import { paths } from 'src/routes/paths';

import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  assetsDir: string;
  backendUrl: string;
  notificationBackendUrl: string;
  authUrl: string;
  iamUrl: string;
  auth: {
    method: 'jwt';
    skip: boolean;
    redirectPath: string;
  };
  aiBackend: string;
};

// ----------------------------------------------------------------------

// Use relative URLs when accessing through ngrok or non-localhost origins
// This allows the Vite proxy to handle API requests
const isProxiedOrigin = typeof window !== 'undefined' &&
  !window.location.hostname.includes('localhost') &&
  !window.location.hostname.includes('127.0.0.1');

const getBaseUrl = (envVar: string | undefined): string => {
  if (isProxiedOrigin) return '';
  return envVar ?? '';
};

export const CONFIG: ConfigValue = {
  appName: 'Thero',
  appVersion: packageJson.version,
  backendUrl: getBaseUrl(import.meta.env.VITE_BACKEND_URL),
  notificationBackendUrl: getBaseUrl(import.meta.env.VITE_NOTIFICATION_BACKEND_URL),
  authUrl: getBaseUrl(import.meta.env.VITE_AUTH_URL),
  assetsDir: import.meta.env.VITE_ASSETS_DIR ?? '',
  iamUrl: getBaseUrl(import.meta.env.VITE_IAM_URL),
  aiBackend: getBaseUrl(import.meta.env.VITE_AI_BACKEND),
  /**
   * Auth
   * @method jwt
   */
  auth: {
    method: 'jwt',
    skip: false,
    redirectPath: paths.dashboard.root,
  },
};
