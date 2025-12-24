import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';

import type { Filters } from './types/knowledge-base';

type Props = {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  className?: string;
};

const appOptions = [
  { value: 'local', label: 'Local KB' },
  { value: 'DRIVE', label: 'Google Drive' },
  { value: 'GMAIL', label: 'Gmail' },
  { value: 'SLACK', label: 'Slack' },
  { value: 'TEAMS', label: 'Microsoft Teams' },
];

const departmentOptions = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
];

const moduleOptions = [
  { value: 'users', label: 'User Management' },
  { value: 'kb', label: 'Knowledge Base' },
  { value: 'analytics', label: 'Analytics' },
];

const recordTypeOptions = [
  { value: 'FILE', label: 'Files' },
  { value: 'FAQ', label: 'FAQs' },
  { value: 'MAIL', label: 'Emails' },
];

export default function KnowledgeSearchFilters({ filters, onFilterChange, className }: Props) {
  const apply = (key: keyof Filters, next: string[]) => onFilterChange({ ...filters, [key]: next });

  const toggleValue = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const clearAll = () =>
    onFilterChange({
      ...filters,
      department: [],
      moduleId: [],
      appSpecificRecordType: [],
      app: [],
    });

  const renderGroup = (
    title: string,
    key: keyof Filters,
    options: { value: string; label: string }[],
    current: string[] | undefined
  ) => (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="grid gap-1">
        {options.map((opt) => {
          const checked = (current || []).includes(opt.value);
          const id = `filter-${String(key)}-${opt.value}`;
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={() => apply(key, toggleValue(current || [], opt.value))}
              />
              <label htmlFor={id} className="text-sm cursor-pointer">
                {opt.label}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn('p-2 space-y-3', className)}>
      <div className="px-2">
        <h3 className="text-sm font-medium text-muted-foreground">Refine results</h3>
      </div>
      <Card>
        <CardContent className="p-3 space-y-4">
          {renderGroup('Apps', 'app', appOptions, filters.app)}
          <Separator />
          {renderGroup('Departments', 'department', departmentOptions, filters.department)}
          <Separator />
          {renderGroup('Modules', 'moduleId', moduleOptions, filters.moduleId)}
          <Separator />
          {renderGroup('Record types', 'appSpecificRecordType', recordTypeOptions, filters.appSpecificRecordType)}

          <div className="pt-1">
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={clearAll}>
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
