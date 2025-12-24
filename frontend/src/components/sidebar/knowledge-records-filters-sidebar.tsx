import type { Filters } from '@/sections/knowledgebase/types/knowledge-base';

import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/context/AdminContext';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useState, useEffect, useCallback } from 'react';
import {
  SidebarGroup,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';

function parseFiltersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);

  const parse = (key: keyof Filters): string[] => {
    const values: string[] = [];
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
    indexingStatus: parse('indexingStatus'),
    recordTypes: parse('recordTypes'),
    origin: parse('origin'),
    connectors: parse('connectors'),
    permissions: parse('permissions'),
    freshness: parse('freshness'),
  } as Filters;
}

function writeFiltersToUrl(next: Filters) {
  const url = new URL(window.location.href);
  const keys: (keyof Filters)[] = [
    'indexingStatus',
    'recordTypes',
    'origin',
    'connectors',
    'permissions',
    'freshness',
  ];

  keys.forEach((key) => {
    url.searchParams.delete(String(key));
    const values = (next[key] || []) as string[];
    if (values.length > 0) {
      url.searchParams.set(String(key), values.join(','));
    }
  });

  window.history.replaceState({}, '', url.toString());
  window.dispatchEvent(new Event('popstate'));
}

const RECORD_TYPE_OPTIONS = [
  { value: 'FILE', label: 'Documents' },
  { value: 'MAIL', label: 'Emails' },
  { value: 'FAQ', label: 'FAQ / Q&A' },
] as const;

const ORIGIN_OPTIONS = [
  { value: 'UPLOAD', label: 'Knowledge base' },
  { value: 'CONNECTOR', label: 'Connected apps' },
] as const;

const CONNECTOR_OPTIONS = [
  { value: 'GMAIL', label: 'Gmail' },
  { value: 'DRIVE', label: 'Google Drive' },
] as const;

const PERMISSION_OPTIONS = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'WRITER', label: 'Writer' },
  { value: 'READER', label: 'Reader' },
  { value: 'COMMENTER', label: 'Commenter' },
  { value: 'ORGANIZER', label: 'Organizer' },
  { value: 'FILEORGANIZER', label: 'File organizer' },
] as const;

export default function KnowledgeRecordsFiltersSidebar() {
  const { isAdmin } = useAdmin();
  const [filters, setFilters] = useState<Filters>(() => parseFiltersFromUrl());

  useEffect(() => {
    const handle = () => setFilters(parseFiltersFromUrl());
    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, []);

  const apply = useCallback(
    (key: keyof Filters, values: string[]) => {
      const next = { ...filters, [key]: values } as Filters;
      setFilters(next);
      writeFiltersToUrl(next);
    },
    [filters]
  );

  const toggleValue = (arr: string[] | undefined, value: string) =>
    (arr || []).includes(value)
      ? (arr || []).filter((v) => v !== value)
      : [...(arr || []), value];

  const clearAll = useCallback(() => {
    const empty: Filters = {
      indexingStatus: [],
      recordTypes: [],
      origin: [],
      connectors: [],
      permissions: [],
    };
    setFilters(empty);
    writeFiltersToUrl(empty);
  }, []);

  const activeCount =
    (filters.indexingStatus || []).length +
    (filters.recordTypes || []).length +
    (filters.origin || []).length +
    (filters.connectors || []).length +
    (filters.permissions || []).length +
    (filters.freshness || []).length;

  const renderGroup = (
    title: string,
    key: keyof Filters,
    options: { value: string; label: string }[],
    current: string[] | undefined
  ) => (
    <div className="pb-2">
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <div className="text-[11px] font-medium tracking-wide text-muted-foreground/80">
          {title}
        </div>
      </div>
      <div className="flex flex-col">
        {options.map((opt) => {
          const id = `kr-${String(key)}-${opt.value}`;
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
              <span className="truncate text-xs">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="flex items-center justify-between px-2 pt-2 pb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Record Filters</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
            {activeCount}
          </span>
        )}
      </SidebarGroupLabel>
      <SidebarGroupContent className="px-0 py-0">
        {/* Status – für Endnutzer nur einfacher Toggle „nur verfügbare Inhalte“ */}
        <div className="pb-2">
          <div className="flex items-center justify-between px-2 pt-2 pb-1">
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground/80">
              Status
            </div>
          </div>
          <div className="flex flex-col">
            <Label
              htmlFor="available-content-only"
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Checkbox
                id="available-content-only"
                checked={(filters.indexingStatus || []).includes('COMPLETED')}
                onCheckedChange={() =>
                  apply(
                    'indexingStatus',
                    (filters.indexingStatus || []).includes('COMPLETED') ? [] : ['COMPLETED']
                  )
                }
              />
              <span className="truncate text-xs">Only available content</span>
            </Label>
          </div>
        </div>

        {renderGroup(
          'Content type',
          'recordTypes',
          RECORD_TYPE_OPTIONS as any,
          filters.recordTypes
        )}
        {renderGroup('Source', 'origin', ORIGIN_OPTIONS as any, filters.origin)}

        {/* „Apps“ / Connectors – nur für Admins sichtbar */}
        {isAdmin &&
          renderGroup('Apps', 'connectors', CONNECTOR_OPTIONS as any, filters.connectors)}

        {/* Permissions – nur für Admins */}
        {isAdmin &&
          renderGroup(
            'Permissions',
            'permissions',
            PERMISSION_OPTIONS as any,
            filters.permissions
          )}

        {/* Aktualität – clientseitiger Filter nach Updated-Timestamp */}
        <div className="pb-2">
          <div className="flex items-center justify-between px-2 pt-2 pb-1">
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground/80">
              Recency
            </div>
          </div>
          <div className="flex flex-col">
            {[
              { value: '7d', label: 'Updated in last 7 days' },
              { value: '30d', label: 'Updated in last 30 days' },
              { value: 'older', label: 'Older than 30 days' },
            ].map((opt) => {
              const id = `kr-freshness-${opt.value}`;
              const current = filters.freshness || [];
              const checked = current.includes(opt.value);
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
                    onCheckedChange={() => apply('freshness', toggleValue(current, opt.value))}
                  />
                  <span className="truncate text-xs">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="px-2 pt-1 pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start text-[11px] text-muted-foreground"
            onClick={clearAll}
          >
            Reset filters
          </Button>
        </div>
      </SidebarGroupContent>
      <SidebarSeparator className="mx-2" />
    </SidebarGroup>
  );
}


