import React from 'react';
import { RefreshCcw, BookOpen, Clock, MoreVertical, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FieldRenderer } from '../field-renderers';
import ScheduledSyncConfig from '../scheduled-sync-config';

import type { ConnectorConfig } from '../../types/types';

interface SyncSectionProps {
  connectorConfig: ConnectorConfig | null;
  formData: Record<string, any>;
  formErrors: Record<string, string>;
  onFieldChange: (section: string, fieldName: string, value: any) => void;
  saving: boolean;
}

const SyncSection: React.FC<SyncSectionProps> = ({
  connectorConfig,
  formData,
  formErrors,
  onFieldChange,
  saving,
}) => {
  if (!connectorConfig) return null;

  const { sync } = connectorConfig.config;

  // Guard against missing sync config
  if (!sync || !sync.supportedStrategies) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Sync Strategy */}
      <Card className="p-5 rounded-xl border-border/30">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-1 rounded-md bg-muted flex items-center justify-center">
            <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-0.5">Sync Strategy</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose how data will be synchronized from {connectorConfig.name}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sync-strategy" className="text-sm font-medium">
            Select Sync Strategy
          </Label>
          <Select
            value={formData.selectedStrategy || sync.supportedStrategies[0] || ''}
            onValueChange={(value) => onFieldChange('sync', 'selectedStrategy', value)}
            disabled={saving}
          >
            <SelectTrigger id="sync-strategy" className="w-full">
              <SelectValue placeholder="Select sync strategy" />
            </SelectTrigger>
            <SelectContent>
              {sync.supportedStrategies.map((strategy) => (
                <SelectItem key={strategy} value={strategy}>
                  {strategy.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Scheduled Sync Configuration */}
      {formData.selectedStrategy === 'SCHEDULED' && (
        <Card className="p-5 rounded-xl border-border/30">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-1 rounded-md bg-muted flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-0.5">
                Scheduled Sync Settings
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure synchronization interval and timezone
              </p>
            </div>
          </div>
          <ScheduledSyncConfig
            value={formData.scheduledConfig || {}}
            onChange={(value) => onFieldChange('sync', 'scheduledConfig', value)}
            disabled={saving}
          />
        </Card>
      )}

      {/* Additional Sync Settings */}
      {sync.customFields.length > 0 && (
        <Card className="p-5 rounded-xl border-border/30">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-1 rounded-md bg-muted flex items-center justify-center">
              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-0.5">Additional Settings</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure advanced sync options
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {sync.customFields.map((field) => (
              <div key={field.name} className="col-span-1">
                <FieldRenderer
                  field={field}
                  value={formData[field.name]}
                  onChange={(value) => onFieldChange('sync', field.name, value)}
                  error={formErrors[field.name]}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sync Strategy Info */}
      <Alert className="rounded-xl border-info/20 bg-info/5">
        <AlertDescription className="text-sm leading-relaxed">
          {sync.supportedStrategies.includes('WEBHOOK') &&
            'Webhook: Real-time updates when data changes. '}
          {sync.supportedStrategies.includes('SCHEDULED') &&
            'Scheduled: Periodic sync at regular intervals. '}
          {sync.supportedStrategies.includes('MANUAL') && 'Manual: On-demand sync when triggered. '}
          {sync.supportedStrategies.includes('REALTIME') &&
            'Real-time: Continuous sync for live updates.'}
        </AlertDescription>
      </Alert>

      {/* Documentation Links - Compact Visual Guide */}
      {connectorConfig.config.documentationLinks &&
        connectorConfig.config.documentationLinks.length > 0 && (
          <Card className="p-4 rounded-xl border-info/20 bg-info/5">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-md bg-info/10 flex items-center justify-center mt-0.5">
                <BookOpen className="h-3 w-3 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-info uppercase tracking-wider mb-2">
                  Documentation & Resources
                </h4>
                <div className="flex flex-col gap-2">
                  {connectorConfig.config.documentationLinks.map((link, index) => (
                    <div
                      key={index}
                      onClick={() => window.open(link.url, '_blank')}
                      className="p-3 rounded-lg bg-info/10 border border-info/30 cursor-pointer transition-all hover:bg-info/20 hover:border-info/40 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-foreground flex-1 min-w-0">
                          {link.title}
                        </p>
                        <div className="flex items-center gap-1 text-info">
                          <span className="text-[10px] font-medium uppercase tracking-wider">
                            {link.type}
                          </span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
    </div>
  );
};

export default SyncSection;
