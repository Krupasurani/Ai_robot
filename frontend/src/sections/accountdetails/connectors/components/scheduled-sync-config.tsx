import React, { useState, useEffect } from 'react';

import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ScheduledConfig } from '../types/types';

interface ScheduledSyncConfigProps {
  value: ScheduledConfig;
  onChange: (value: ScheduledConfig) => void;
  disabled?: boolean;
}

// Simplified timezone options
const TIMEZONES = [
  { name: 'UTC', displayName: 'UTC' },
  { name: 'America/New_York', displayName: 'Eastern Time' },
  { name: 'America/Chicago', displayName: 'Central Time' },
  { name: 'America/Denver', displayName: 'Mountain Time' },
  { name: 'America/Los_Angeles', displayName: 'Pacific Time' },
  { name: 'Europe/London', displayName: 'GMT' },
  { name: 'Europe/Paris', displayName: 'CET' },
  { name: 'Asia/Tokyo', displayName: 'JST' },
  { name: 'Asia/Shanghai', displayName: 'CST' },
  { name: 'Asia/Kolkata', displayName: 'IST' },
  { name: 'Australia/Sydney', displayName: 'AET' },
];

// Simplified interval options
const INTERVAL_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '1 day' },
  { value: 10080, label: '1 week' },
];

const ScheduledSyncConfig: React.FC<ScheduledSyncConfigProps> = ({
  value = {},
  onChange,
  disabled = false,
}) => {
  const [localValue, setLocalValue] = useState<ScheduledConfig>({
    intervalMinutes: 60,
    timezone: 'UTC',
    ...value,
  });

  // Initialize from existing data when value changes (only interval and timezone supported)
  useEffect(() => {
    if (value) {
      setLocalValue({
        intervalMinutes: value.intervalMinutes || 60,
        timezone: value.timezone || 'UTC',
      });
    }
  }, [value]);

  // Propagate interval and timezone to parent when changed
  useEffect(() => {
    // Debounce calculation
    const timeoutId = setTimeout(() => {
      onChange({
        intervalMinutes: localValue.intervalMinutes,
        timezone: localValue.timezone,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localValue, onChange]);

  const handleFieldChange = (field: string, newValue: any) => {
    setLocalValue((prev: ScheduledConfig) => ({
      ...prev,
      [field]: newValue,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timezone */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timezone</Label>
          <Select
            value={localValue.timezone}
            onValueChange={(val) => handleFieldChange('timezone', val)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.name} value={tz.name}>
                  {tz.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sync Interval */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sync Interval</Label>
          <Select
            value={String(localValue.intervalMinutes)}
            onValueChange={(val) => handleFieldChange('intervalMinutes', Number(val))}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {`Sync every ${INTERVAL_OPTIONS.find((opt) => opt.value === localValue.intervalMinutes)?.label || '1 hour'} in ${TIMEZONES.find((tz) => tz.name === localValue.timezone)?.displayName || 'UTC'}`}
        </p>
      </div>

      {/* Information Alert */}
      <Alert variant="default" className="rounded-lg">
        <AlertDescription className="text-sm leading-relaxed">
          Scheduled syncs will run automatically at the specified intervals. All times are
          calculated based on the selected timezone.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ScheduledSyncConfig;
