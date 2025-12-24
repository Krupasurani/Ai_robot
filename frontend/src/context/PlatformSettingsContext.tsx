import React, { useMemo, useState, useEffect, useContext, createContext } from 'react';

import axios from 'src/utils/axios';

import { useAuthContext } from 'src/auth/hooks';


type PlatformSettings = {
  fileUploadMaxSizeBytes: number;
  featureFlags: Record<string, boolean>;
  systemEmailTemplate: {
    enabled: boolean;
    subject: string;
    markdown: string;
  };
};

type PlatformSettingsContextValue = {
  settings: PlatformSettings | null;
  loading: boolean;
  error: string | null;
};

const PlatformSettingsContext = createContext<PlatformSettingsContextValue | undefined>(undefined);

type PlatformSettingsProviderProps = {
  children: React.ReactNode;
};

export const PlatformSettingsProvider: React.FC<PlatformSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { authenticated } = useAuthContext();

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      if (!authenticated) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await axios.get('/api/v1/configurationManager/platform/settings');
        if (cancelled) return;

        const data = response.data ?? {};
        const template =
          data?.systemEmailTemplate && typeof data.systemEmailTemplate === 'object'
            ? data.systemEmailTemplate
            : {};
        const sanitizeTemplate = (): PlatformSettings['systemEmailTemplate'] => ({
          enabled: !!template.enabled,
          subject:
            typeof template.subject === 'string' && template.subject.trim()
              ? template.subject.trim()
              : 'You have a new notification from Thero',
          markdown:
            typeof template.markdown === 'string' && template.markdown.trim()
              ? template.markdown
              : [
                  '## Hello there,',
                  '',
                  'Customize this Markdown to match your brand voice and add links such as {{link}}.',
                  '',
                  '**The Thero Team**',
                ].join('\n'),
        });

        const nextSettings: PlatformSettings = {
          fileUploadMaxSizeBytes:
            typeof data.fileUploadMaxSizeBytes === 'number' && data.fileUploadMaxSizeBytes > 0
              ? data.fileUploadMaxSizeBytes
              : 30 * 1024 * 1024,
          featureFlags:
            data.featureFlags && typeof data.featureFlags === 'object' ? data.featureFlags : {},
          systemEmailTemplate: sanitizeTemplate(),
        };

        setSettings(nextSettings);
      } catch (err: any) {
        if (cancelled) return;
        const message =
          err?.response?.data?.message || err?.message || 'Failed to load platform settings';
        setError(message);
        setSettings(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
    }),
    [settings, loading, error]
  );

  return (
    <PlatformSettingsContext.Provider value={value}>{children}</PlatformSettingsContext.Provider>
  );
};

export const usePlatformSettings = (): PlatformSettingsContextValue => {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) {
    throw new Error('usePlatformSettings must be used within a PlatformSettingsProvider');
  }
  return ctx;
};

export const usePlatformFeatureFlag = (key: string): boolean | undefined => {
  const { settings, loading } = usePlatformSettings();

  if (loading) {
    return undefined;
  }

  return !!settings?.featureFlags?.[key];
};




