import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Sun,
  Moon,
  Monitor,
  Languages,
  Palette,
  Settings2,
  LayoutGrid,
  Check,
} from 'lucide-react';
import axios from 'src/utils/axios';
import { webSocketService } from 'src/services/websocket.service';
import { allLangs, useTranslate, type LanguageValue } from 'src/locales';
import { useTheme } from 'src/theme/theme-provider';
import { useSettingsContext } from 'src/components/settings';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  label: string;
  description: string;
  icon: React.ReactNode;
};

export default function PreferencesSettings() {
  const { t: tNavbar } = useTranslate('navbar');
  const { t, currentLang, onChangeLang } = useTranslate('settings');
  const settings = useSettingsContext();
  const { theme, setTheme } = useTheme();

  const themeOptions: ThemeOption[] = [
    {
      value: 'light',
      label: t('preferences.themes.light'),
      description: t('preferences.themes.light_desc'),
      icon: <Sun className="h-5 w-5" />,
    },
    {
      value: 'dark',
      label: t('preferences.themes.dark'),
      description: t('preferences.themes.dark_desc'),
      icon: <Moon className="h-5 w-5" />,
    },
    {
      value: 'system',
      label: t('preferences.themes.system'),
      description: t('preferences.themes.system_desc'),
      icon: <Monitor className="h-5 w-5" />,
    },
  ];

  const handleLanguageChange = useCallback(
    (value: string) => {
      onChangeLang(value as LanguageValue);
      toast.success(t('preferences.language_updated'));
    },
    [onChangeLang, t]
  );

  const handleCompactLayoutChange = useCallback(
    (checked: boolean) => {
      const val = Boolean(checked);
      settings.onUpdateField('compactLayout', val);

      // Persist org-wide and notify via websocket
      const payload = { appSettings: { compactLayout: val } };
      axios
        .post('/api/v1/configurationManager/appSettings', payload)
        .then(() => {
          toast.success(t('preferences.preferences_saved'));
          webSocketService.emit('appSettingsUpdated', payload);
        })
        .catch(() => {
          toast.error(t('preferences.failed_save'));
        });
    },
    [settings, t]
  );

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {tNavbar('pages.applicationPreferences.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tNavbar('pages.applicationPreferences.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Appearance Card */}
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
              <Palette className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t('preferences.appearance')}</h2>
              <p className="text-xs text-muted-foreground">
                {t('preferences.appearance_desc')}
              </p>
            </div>
          </div>
          <div className="p-6">
            <Label className="text-sm font-medium text-foreground mb-3 block">{t('preferences.theme')}</Label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                    'hover:border-primary/50 hover:bg-muted/50',
                    theme === option.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/50 bg-background'
                  )}
                >
                  {theme === option.value && (
                    <div className="absolute top-2 right-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
                      theme === option.value
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {option.icon}
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        theme === option.value ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Language & Region Card */}
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
              <Languages className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t('preferences.lang_region')}</h2>
              <p className="text-xs text-muted-foreground">
                {t('preferences.lang_region_desc')}
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">{t('preferences.display_lang')}</Label>
                <Select value={currentLang.value} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder={t('preferences.select_lang')} />
                  </SelectTrigger>
                  <SelectContent>
                    {allLangs.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{lang.label}</span>
                          <span className="text-xs text-muted-foreground">({lang.countryCode})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('preferences.lang_info')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Display Options Card */}
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
              <LayoutGrid className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t('preferences.display_options')}</h2>
              <p className="text-xs text-muted-foreground">{t('preferences.display_options_desc')}</p>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Compact Layout Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border/50">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('preferences.compact_layout')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('preferences.compact_layout_desc')}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.compactLayout}
                  onCheckedChange={handleCompactLayoutChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
