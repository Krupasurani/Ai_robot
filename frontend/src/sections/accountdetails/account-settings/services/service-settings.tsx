import { useState, useEffect, useCallback } from 'react';
import {
  ServerCog,
  Globe,
  Link2,
  Webhook,
  Bell,
  Settings2,
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { useTranslate } from '@/locales';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card';

import ServiceConfigSheet from './components/service-config-sheet';
import axios from 'src/utils/axios';

// Types
type ServiceStatus = 'healthy' | 'degraded' | 'offline' | 'unknown';

interface ServiceHealth {
  id: string;
  name: string;
  status: ServiceStatus;
  lastChecked?: string;
}

interface InternalService {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  configured: boolean;
}

export default function ServiceSettings() {
  const { t } = useTranslate('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [configSheetOpen, setConfigSheetOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [serviceUrls, setServiceUrls] = useState<Record<string, string>>({});

  // Internal services configuration
  const INTERNAL_SERVICES: InternalService[] = [
    {
      id: 'frontendPublicUrl',
      icon: Globe,
      title: t('services.internal.frontendPublicUrl.title'),
      description: t('services.internal.frontendPublicUrl.short_desc'),
      color: '#3B82F6',
      configured: false,
    },
    {
      id: 'connectorPublicUrl',
      icon: Link2,
      title: t('services.internal.connectorPublicUrl.title'),
      description: t('services.internal.connectorPublicUrl.short_desc'),
      color: '#8B5CF6',
      configured: false,
    },
  ];

  const [services, setServices] = useState<InternalService[]>(INTERNAL_SERVICES);

  // Status indicator component
  const StatusIndicator = ({ status }: { status: ServiceStatus }) => {
    const statusConfig = {
      healthy: {
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        label: t('services.status.healthy'),
      },
      degraded: {
        icon: AlertCircle,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        label: t('services.status.degraded'),
      },
      offline: {
        icon: XCircle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-500/10',
        label: t('services.status.offline'),
      },
      unknown: {
        icon: AlertCircle,
        color: 'text-slate-500',
        bg: 'bg-slate-50 dark:bg-slate-500/10',
        label: t('services.status.unknown'),
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase',
          config.bg,
          config.color
        )}
      >
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
    );
  };

  // System health state
  const [systemHealth, setSystemHealth] = useState<ServiceHealth[]>([
    { id: 'api', name: 'API Server', status: 'unknown' },
    { id: 'connector', name: 'Connector Service', status: 'unknown' },
    { id: 'query', name: 'Search Engine', status: 'unknown' },
  ]);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    systemAlerts: true,
    maintenanceNotifications: true,
    securityAlerts: true,
  });

  // API settings
  const [apiSettings, setApiSettings] = useState({
    rateLimitEnabled: true,
    requestsPerMinute: 60,
  });

  // Webhook settings
  const [webhookSettings, setWebhookSettings] = useState({
    enabled: false,
    url: '',
  });

  // Fetch service configurations
  const fetchServiceConfigs = useCallback(async () => {
    try {
      const [frontendRes, connectorRes] = await Promise.allSettled([
        axios.get('/api/v1/configurationManager/frontendPublicUrl'),
        axios.get('/api/v1/configurationManager/connectorPublicUrl'),
      ]);

      const urls: Record<string, string> = {};
      const updatedServices = [...INTERNAL_SERVICES];

      if (frontendRes.status === 'fulfilled' && frontendRes.value.data?.url) {
        urls.frontendPublicUrl = frontendRes.value.data.url;
        const idx = updatedServices.findIndex((s) => s.id === 'frontendPublicUrl');
        if (idx !== -1) updatedServices[idx] = { ...updatedServices[idx], configured: true };
      }

      if (connectorRes.status === 'fulfilled' && connectorRes.value.data?.url) {
        urls.connectorPublicUrl = connectorRes.value.data.url;
        const idx = updatedServices.findIndex((s) => s.id === 'connectorPublicUrl');
        if (idx !== -1) updatedServices[idx] = { ...updatedServices[idx], configured: true };
      }

      setServiceUrls(urls);
      setServices(updatedServices);
    } catch (error) {
      console.error('Failed to fetch service configs:', error);
    }
  }, [t]);

  // Check system health
  const checkSystemHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Check Node.js BFF (API Server)
      // 2. Check Python Services (Connector & Query)
      const [infraRes, servicesRes] = await Promise.allSettled([
        axios.get('/api/v1/health'),
        axios.get('/api/v1/health/services'),
      ]);

      const updatedHealth: ServiceHealth[] = [
        {
          id: 'api',
          name: 'API Server',
          status: infraRes.status === 'fulfilled' ? 'healthy' : 'offline',
          lastChecked: new Date().toISOString(),
        },
        {
          id: 'connector',
          name: 'Connector Service',
          status:
            servicesRes.status === 'fulfilled' &&
            (servicesRes.value as any).data?.services?.connector === 'healthy'
              ? 'healthy'
              : servicesRes.status === 'fulfilled' &&
                (servicesRes.value as any).data?.services?.connector === 'unhealthy'
              ? 'degraded'
              : 'offline',
          lastChecked: new Date().toISOString(),
        },
        {
          id: 'query',
          name: 'Search Engine',
          status:
            servicesRes.status === 'fulfilled' &&
            (servicesRes.value as any).data?.services?.query === 'healthy'
              ? 'healthy'
              : servicesRes.status === 'fulfilled' &&
                (servicesRes.value as any).data?.services?.query === 'unhealthy'
              ? 'degraded'
              : 'offline',
          lastChecked: new Date().toISOString(),
        },
      ];

      setSystemHealth(updatedHealth);
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth((prev) =>
        prev.map((s) => ({
          ...s,
          status: 'offline' as ServiceStatus,
          lastChecked: new Date().toISOString(),
        }))
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchServiceConfigs(), checkSystemHealth()]);
      setIsLoading(false);
    };
    init();
  }, [fetchServiceConfigs, checkSystemHealth]);

  // Handle service configuration
  const handleConfigureService = (serviceId: string) => {
    setSelectedService(serviceId);
    setConfigSheetOpen(true);
  };

  // Handle service config save
  const handleSaveServiceConfig = async () => {
    await fetchServiceConfigs();
    setConfigSheetOpen(false);
    setSelectedService(null);
    // Toast is shown by the sheet component
  };

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    toast.success(t('services.messages.notification_updated'));
  };

  // Handle API settings toggle
  const handleApiToggle = () => {
    setApiSettings((prev) => ({
      ...prev,
      rateLimitEnabled: !prev.rateLimitEnabled,
    }));
    toast.success(t('services.messages.api_settings_updated'));
  };

  // Handle webhook toggle
  const handleWebhookToggle = () => {
    setWebhookSettings((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
    toast.success(t('services.messages.webhook_updated'));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 space-y-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
            <ServerCog className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('services.title')}
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
          {t('services.description')}
        </p>
      </div>

      <div className="space-y-10">
        {/* Infrastructure Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Activity className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              {t('services.infrastructure')}
            </h2>
          </div>

          <div className="grid gap-6">
            {/* System Health Card */}
            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                      <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t('services.system_health')}</CardTitle>
                      <CardDescription className="text-xs">
                        {t('services.system_health_desc')}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={checkSystemHealth}
                    disabled={isRefreshing}
                    className="h-8 gap-2 text-slate-500 hover:text-slate-900"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                    {t('services.refresh')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {systemHealth.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {service.name}
                        </p>
                        {service.lastChecked && (
                          <p className="text-[11px] text-slate-400">
                            {t('services.last_check')}: {new Date(service.lastChecked).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                      <StatusIndicator status={service.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Public URLs Card */}
            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('services.public_endpoints')}</CardTitle>
                    <CardDescription className="text-xs">
                      {t('services.public_endpoints_desc')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {services.map((service) => {
                    const Icon = service.icon;
                    const configuredUrl = serviceUrls[service.id];

                    return (
                      <button
                        key={service.id}
                        onClick={() => handleConfigureService(service.id)}
                        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="flex items-center justify-center w-10 h-10 rounded-xl"
                            style={{ backgroundColor: `${service.color}10` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: service.color }} />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {service.title}
                              </p>
                              {service.configured && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-0 text-[10px] px-1.5 h-4"
                                >
                                  {t('services.configured')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                              {configuredUrl || service.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Integrations & API Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Webhook className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              {t('services.integrations_api')}
            </h2>
          </div>

          <div className="grid gap-6">
            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-white dark:bg-slate-950">
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {/* Webhooks Toggle */}
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-500/10">
                        <Webhook className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {t('services.event_webhooks')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t('services.event_webhooks_desc')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={webhookSettings.enabled}
                      onCheckedChange={handleWebhookToggle}
                    />
                  </div>

                  {/* API Rate Limiting */}
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10">
                        <Settings2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {t('services.api_rate_limiting')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t('services.current_limit_rate', { count: apiSettings.requestsPerMinute })}
                        </p>
                      </div>
                    </div>
                    <Switch checked={apiSettings.rateLimitEnabled} onCheckedChange={handleApiToggle} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {webhookSettings.enabled && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-blue-800 dark:text-blue-300 text-sm">
                  {t('services.webhook_api_info')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Monitoring & Notifications Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Bell className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              {t('services.monitoring')}
            </h2>
          </div>

          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-white dark:bg-slate-950">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[
                  {
                    key: 'systemAlerts' as const,
                    title: t('services.system_alerts'),
                    description: t('services.system_alerts_desc'),
                    icon: Activity,
                    color: 'text-rose-600 dark:text-rose-400',
                    bg: 'bg-rose-50 dark:bg-rose-500/10',
                  },
                  {
                    key: 'maintenanceNotifications' as const,
                    title: t('services.maintenance'),
                    description: t('services.maintenance_desc'),
                    icon: Settings2,
                    color: 'text-violet-600 dark:text-violet-400',
                    bg: 'bg-violet-50 dark:bg-violet-500/10',
                  },
                  {
                    key: 'securityAlerts' as const,
                    title: t('services.security'),
                    description: t('services.security_desc'),
                    icon: Bell,
                    color: 'text-indigo-600 dark:text-indigo-400',
                    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
                  },
                ].map((notification) => (
                  <div
                    key={notification.key}
                    className="flex items-center justify-between p-6 hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn('p-2.5 rounded-xl', notification.bg)}>
                        <notification.icon className={cn('h-5 w-5', notification.color)} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings[notification.key]}
                      onCheckedChange={() => handleNotificationToggle(notification.key)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Footer */}
        <div className="flex items-center justify-center pt-4">
          <a
            href="https://docs.thero.com/services"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-sm font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            {t('services.view_docs')}
          </a>
        </div>
      </div>

      {/* Service Configuration Sheet */}
      <ServiceConfigSheet
        open={configSheetOpen}
        onOpenChange={setConfigSheetOpen}
        serviceId={selectedService}
        onSave={handleSaveServiceConfig}
      />
    </div>
  );
}

