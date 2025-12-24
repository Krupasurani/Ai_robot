import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useMemo, useState, useEffect } from 'react';
import { Loader2, Info } from 'lucide-react';
import { useTranslate } from '@/locales';

import axios from 'src/utils/axios';

import {
  PlatformHeader,
  FileUploadSection,
  FeatureFlagsSection,
  EmailTemplateSection,
} from './components';

type FeatureFlagInfo = {
  key: string;
  label: string;
  description?: string;
  defaultEnabled?: boolean;
};

type EmailTemplateSettings = {
  enabled: boolean;
  subject: string;
  markdown: string;
  updatedAt?: string;
  updatedBy?: {
    name?: string;
    email?: string;
  };
};

type PlatformSettingsData = {
  fileUploadMaxSizeBytes: number;
  featureFlags: Record<string, boolean>;
  systemEmailTemplate: EmailTemplateSettings;
};

const DEFAULT_EMAIL_TEMPLATE: Omit<EmailTemplateSettings, 'updatedAt' | 'updatedBy'> = {
  enabled: false,
  subject: 'You have a new notification from Thero',
  markdown: [
    '## Hello there,',
    '',
    'Use this Markdown editor to shape the tone and structure of the emails that go out to your users when you invite them to the platform.',
    '',
    '- Explain why they are receiving the message',
    '- Highlight next steps or links (for example: [Open the platform]({{link}}))',
    '- Close with a warm signature',
    '',
    'Need liquid-style variables? The same fields used in the default invite (e.g., `{{invitee}}`, `{{orgName}}`, `{{link}}`) can be referenced here.',
    '',
    'Thanks!',
    '',
    '**The Thero Team**',
  ].join('\n'),
};

const DEFAULTS: PlatformSettingsData = {
  fileUploadMaxSizeBytes: 30 * 1024 * 1024,
  featureFlags: {},
  systemEmailTemplate: { ...DEFAULT_EMAIL_TEMPLATE },
};

const EMAIL_TEMPLATE_CHAR_LIMIT = 8000;

const toTemplateSettings = (
  template?: Partial<EmailTemplateSettings> | null
): EmailTemplateSettings => ({
  enabled: !!template?.enabled,
  subject:
    typeof template?.subject === 'string' && template.subject.trim()
      ? template.subject.trim()
      : DEFAULT_EMAIL_TEMPLATE.subject,
  markdown:
    typeof template?.markdown === 'string' && template.markdown.trim()
      ? template.markdown
      : DEFAULT_EMAIL_TEMPLATE.markdown,
  updatedAt: typeof template?.updatedAt === 'string' ? template.updatedAt : undefined,
  updatedBy:
    template?.updatedBy && typeof template.updatedBy === 'object'
      ? {
          name:
            typeof template.updatedBy.name === 'string' && template.updatedBy.name.trim()
              ? template.updatedBy.name.trim()
              : undefined,
          email:
            typeof template.updatedBy.email === 'string' && template.updatedBy.email.trim()
              ? template.updatedBy.email.trim()
              : undefined,
        }
      : undefined,
});

export default function PlatformSettings() {
  const { t } = useTranslate('settings');
  const [settings, setSettings] = useState<PlatformSettingsData>(DEFAULTS);
  const [originalSettings, setOriginalSettings] = useState<PlatformSettingsData>(DEFAULTS);
  const [availableFlags, setAvailableFlags] = useState<FeatureFlagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSizeInput, setFileSizeInput] = useState('');
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [templateTab, setTemplateTab] = useState<'write' | 'preview'>('write');

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const [settingsRes, flagsRes] = await Promise.all([
          axios.get('/api/v1/configurationManager/platform/settings'),
          axios.get('/api/v1/configurationManager/platform/feature-flags/available'),
        ]);

        if (!mounted) return;

        const fileSize =
          Number(settingsRes.data?.fileUploadMaxSizeBytes) || DEFAULTS.fileUploadMaxSizeBytes;
        const loadedSettings: PlatformSettingsData = {
          fileUploadMaxSizeBytes: fileSize,
          featureFlags: settingsRes.data?.featureFlags || {},
          systemEmailTemplate: toTemplateSettings(settingsRes.data?.systemEmailTemplate),
        };

        setSettings(loadedSettings);
        setOriginalSettings({
          fileUploadMaxSizeBytes: loadedSettings.fileUploadMaxSizeBytes,
          featureFlags: { ...loadedSettings.featureFlags },
          systemEmailTemplate: { ...loadedSettings.systemEmailTemplate },
        });
        setAvailableFlags(flagsRes.data?.flags || []);
        setFileSizeInput(String(Math.round(fileSize / (1024 * 1024))));
        setError(null);
      } catch (err: any) {
        if (mounted) {
          setError(err?.response?.data?.message || err?.message || t('platform.failed_load'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [t]);

  const maxMb = useMemo(
    () => Math.round(settings.fileUploadMaxSizeBytes / (1024 * 1024)),
    [settings.fileUploadMaxSizeBytes]
  );

  const hasChanges = useMemo(() => {
    if (settings.fileUploadMaxSizeBytes !== originalSettings.fileUploadMaxSizeBytes) {
      return true;
    }
    if (
      settings.systemEmailTemplate.enabled !== originalSettings.systemEmailTemplate.enabled ||
      settings.systemEmailTemplate.subject !== originalSettings.systemEmailTemplate.subject ||
      settings.systemEmailTemplate.markdown !== originalSettings.systemEmailTemplate.markdown
    ) {
      return true;
    }

    const currentKeys = Object.keys(settings.featureFlags);
    const originalKeys = Object.keys(originalSettings.featureFlags);

    if (currentKeys.length !== originalKeys.length) return true;
    return currentKeys.some(
      (key) => !!settings.featureFlags[key] !== !!originalSettings.featureFlags[key]
    );
  }, [settings, originalSettings]);

  const handleFileSizeChange = (value: string) => {
    setFileSizeInput(value);
    const mb = Number(value);

    if (!Number.isFinite(mb) || mb < 1) {
      setFileSizeError(t('platform.positive_number_error'));
      return;
    }

    setFileSizeError(null);
    setSettings((prev) => ({ ...prev, fileUploadMaxSizeBytes: mb * 1024 * 1024 }));
  };

  const handleFileSizeBlur = () => {
    const mb = Number(fileSizeInput);

    if (!Number.isFinite(mb) || mb < 1) {
      setFileSizeInput(String(maxMb));
      setFileSizeError(null);
      return;
    }

    setSettings((prev) => ({ ...prev, fileUploadMaxSizeBytes: mb * 1024 * 1024 }));
  };

  const handleToggleFlag = (key: string, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      featureFlags: { ...prev.featureFlags, [key]: enabled },
    }));
  };

  const updateTemplate = (patch: Partial<EmailTemplateSettings>) => {
    setSettings((prev) => ({
      ...prev,
      systemEmailTemplate: { ...prev.systemEmailTemplate, ...patch },
    }));
  };

  const handleResetTemplate = () => {
    updateTemplate({
      subject: DEFAULT_EMAIL_TEMPLATE.subject,
      markdown: DEFAULT_EMAIL_TEMPLATE.markdown,
    });
    setTemplateTab('write');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await axios.post('/api/v1/configurationManager/platform/settings', settings);
      toast.success(t('platform.success'));
      setOriginalSettings({
        fileUploadMaxSizeBytes: settings.fileUploadMaxSizeBytes,
        featureFlags: { ...settings.featureFlags },
        systemEmailTemplate: { ...settings.systemEmailTemplate },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('platform.failed_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-muted/30">
      {/* Sticky Header */}
      <PlatformHeader
        hasChanges={hasChanges}
        saving={saving}
        loading={loading}
        error={error}
        onSave={handleSave}
        onDismissError={() => setError(null)}
      />

      {/* Main Content */}
      <div className="relative mx-auto max-w-4xl px-6 py-8">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">{t('platform.loading')}</p>
            </div>
          </div>
        )}

        {/* Section Cards */}
        <div className={cn('space-y-6', loading && 'pointer-events-none opacity-40')}>
          {/* File Upload Section */}
          <FileUploadSection
            fileSizeInput={fileSizeInput}
            fileSizeError={fileSizeError}
            maxMb={maxMb}
            loading={loading}
            onFileSizeChange={handleFileSizeChange}
            onFileSizeBlur={handleFileSizeBlur}
          />

          {/* Feature Flags Section */}
          <FeatureFlagsSection
            availableFlags={availableFlags}
            featureFlags={settings.featureFlags}
            loading={loading}
            onToggleFlag={handleToggleFlag}
          />

          {/* Email Template Section */}
          <EmailTemplateSection
            template={settings.systemEmailTemplate}
            charLimit={EMAIL_TEMPLATE_CHAR_LIMIT}
            loading={loading}
            templateTab={templateTab}
            onTemplateTabChange={setTemplateTab}
            onUpdateTemplate={updateTemplate}
            onResetTemplate={handleResetTemplate}
          />

          {/* Info Card */}
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Info className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('platform.about_title')}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('platform.about_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
