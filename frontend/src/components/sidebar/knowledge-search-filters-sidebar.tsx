import type { Filters } from '@/sections/knowledgebase/types/knowledge-base';

import { cn } from '@/utils/cn';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useState, useEffect, useCallback } from 'react';
import {
  SidebarGroup,
  SidebarSeparator,
  SidebarGroupContent,
} from '@/components/ui/sidebar';

function parseFiltersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  const parse = (key: keyof Filters): string[] => {
    const values: string[] = [];
    // Support repeated params and comma-separated values
    const repeated = params.getAll(String(key));
    if (repeated.length > 0) {
      repeated.forEach((v) => values.push(...v.split(',').filter(Boolean)));
    } else {
      const single = params.get(String(key));
      if (single) values.push(...single.split(',').filter(Boolean));
    }
    return Array.from(new Set(values));
  };

  return {
    app: parse('app'),
    department: parse('department'),
    moduleId: parse('moduleId'),
    appSpecificRecordType: parse('appSpecificRecordType'),
  } as Filters;
}

function writeFiltersToUrl(next: Filters) {
  const url = new URL(window.location.href);
  const keys: (keyof Filters)[] = ['app', 'department', 'moduleId', 'appSpecificRecordType'];
  keys.forEach((key) => {
    url.searchParams.delete(String(key));
    const values = (next[key] || []) as string[];
    if (values.length > 0) {
      // use comma separated single param for brevity
      url.searchParams.set(String(key), values.join(','));
    }
  });
  window.history.replaceState({}, '', url.toString());
  // Notify listeners (page) that filters changed
  window.dispatchEvent(new Event('popstate'));
}

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

export default function KnowledgeSearchFiltersSidebar() {
  const [filters, setFilters] = useState<Filters>(() => parseFiltersFromUrl());

  useEffect(() => {
    const handle = () => setFilters(parseFiltersFromUrl());
    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, []);

  const apply = useCallback((key: keyof Filters, values: string[]) => {
    const next = { ...filters, [key]: values } as Filters;
    setFilters(next);
    writeFiltersToUrl(next);
  }, [filters]);

  const toggleValue = (arr: string[] | undefined, value: string) =>
    (arr || []).includes(value) ? (arr || []).filter((v) => v !== value) : [ ...(arr || []), value ];

  const renderGroup = (
    title: string,
    key: keyof Filters,
    options: { value: string; label: string }[],
    current: string[] | undefined
  ) => (
    <div className="pb-2">
      <div className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/80">
        {title}
      </div>
      <div className="flex flex-col">
        {options.map((opt) => {
          const id = `ks-${String(key)}-${opt.value}`;
          const checked = (current || []).includes(opt.value);
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={() => apply(key, toggleValue(current, opt.value))}
              />
              <span className="truncate">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupContent className="px-0 py-0">
        {renderGroup('Apps', 'app', appOptions, filters.app)}
        {renderGroup('Departments', 'department', departmentOptions, filters.department)}
        {renderGroup('Modules', 'moduleId', moduleOptions, filters.moduleId)}
        {renderGroup('Record types', 'appSpecificRecordType', recordTypeOptions, filters.appSpecificRecordType)}
      </SidebarGroupContent>
      <SidebarSeparator className="mx-2" />
    </SidebarGroup>
  );
}


