import type { Icon as IconifyIcon } from '@iconify/react';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import closeIcon from '@iconify-icons/mdi/close';
import gmailIcon from '@iconify-icons/mdi/gmail';
import fileIcon from '@iconify-icons/mdi/file-outline';
import emailIcon from '@iconify-icons/mdi/email-outline';
import filterMenuIcon from '@iconify-icons/mdi/filter-menu';
import googleDriveIcon from '@iconify-icons/mdi/google-drive';
import filterRemoveIcon from '@iconify-icons/mdi/filter-remove';
import filterVariantIcon from '@iconify-icons/mdi/filter-variant';
import userCheckIcon from '@iconify-icons/mdi/account-check-outline';
import closeCircleIcon from '@iconify-icons/mdi/close-circle-outline';
import cloudUploadIcon from '@iconify-icons/mdi/cloud-upload-outline';
import cloudConnectorIcon from '@iconify-icons/mdi/cloud-sync-outline';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  UploadCloud,
  Cloud,
  UserCheck,
  Loader2,
  Circle,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileWarning,
  TimerOff,
} from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/utils/cn';

import type { Modules } from './types/modules';
import type { Departments } from './types/departments';
import type { SearchTagsRecords } from './types/search-tags';
import type { RecordCategories } from './types/record-categories';
import type { Filters, KnowledgeBaseSideBarProps } from './types/knowledge-base';

// Status icon components mapping (lucide-react)
const statusIconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  NOT_STARTED: Circle,
  IN_PROGRESS: Clock,
  FAILED: AlertCircle,
  COMPLETED: CheckCircle2,
  FILE_TYPE_NOT_SUPPORTED: FileWarning,
  AUTO_INDEX_OFF: TimerOff,
};

// Helper function to format labels
const formatLabel = (label: string): string => {
  if (!label) return '';
  if (label === 'AUTO_INDEX_OFF') return 'Manual Sync';
  return label
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
};

// Helper function to create empty filters object
const createEmptyFilters = (): Filters => ({
  indexingStatus: [],
  department: [],
  moduleId: [],
  searchTags: [],
  appSpecificRecordType: [],
  recordTypes: [],
  origin: [],
  status: [],
  connectors: [],
  app: [],
  permissions: [],
});

// Status color mapping
const statusColors: Record<string, string> = {
  NOT_STARTED: '#9e9e9e',
  IN_PROGRESS: '#2196f3',
  FAILED: '#f44336',
  COMPLETED: '#4caf50',
  FILE_TYPE_NOT_SUPPORTED: '#ff9800',
  AUTO_INDEX_OFF: '#757575',
};

export default function KnowledgeBaseSideBar({
  filters,
  onFilterChange,
  openSidebar = true,
  onToggleSidebar,
}: KnowledgeBaseSideBarProps) {
  const [open, setOpen] = useState<boolean>(true);
  const [departments, setDepartments] = useState<Departments[]>([]);
  const [recordCategories, setRecordCategories] = useState<RecordCategories[]>([]);
  const [modules, setModules] = useState<Modules[]>([]);
  const [tags, setTags] = useState<SearchTagsRecords[]>([]);

  // Initialize expanded sections with all sections collapsed except status
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    status: true,
    recordType: false,
    origin: false,
    connector: false,
    permissions: false,
    departments: false,
    modules: false,
    tags: false,
    categories: false,
  });

  // Add a ref to track if filter operation is in progress
  const isFilterChanging = useRef(false);
  // Add a loading state for filter changes
  const [isLoading, setIsLoading] = useState(false);
  // Keep local copy of filters to prevent UI flicker during updates
  const [localFilters, setLocalFilters] = useState<Filters>(filters || createEmptyFilters());

  // Store previous filters for comparison
  const prevFiltersRef = useRef<Filters | null>(null);

  // Smoothly manage content appearance
  const [showCollapsedContent, setShowCollapsedContent] = useState(!openSidebar);
  const [showExpandedContent, setShowExpandedContent] = useState(openSidebar);

  // Record type icon mapping
  const recordTypeIcons = React.useMemo<
    Record<string, React.ComponentProps<typeof IconifyIcon>['icon']>
  >(
    () => ({
      FILE: fileIcon,
      MAIL: emailIcon,
    }),
    []
  );

  // Origin icon mapping
  const originIcons = React.useMemo<
    Record<string, React.ComponentProps<typeof IconifyIcon>['icon']>
  >(
    () => ({
      UPLOAD: cloudUploadIcon,
      CONNECTOR: cloudConnectorIcon,
    }),
    []
  );

  // Connector icon mapping
  const connectorIcons = React.useMemo<
    Record<string, React.ComponentProps<typeof IconifyIcon>['icon']>
  >(
    () => ({
      GMAIL: gmailIcon,
      DRIVE: googleDriveIcon,
    }),
    []
  );

  // Permission icon mapping
  const permissionIcons = React.useMemo<
    Record<string, React.ComponentProps<typeof IconifyIcon>['icon']>
  >(
    () => ({
      READER: userCheckIcon,
      OWNER: userCheckIcon,
      WRITER: userCheckIcon,
      COMMENTER: userCheckIcon,
      FILEORGANIZER: userCheckIcon,
      ORGANIZER: userCheckIcon,
    }),
    []
  );

  const toggleInProgress = useRef(false);

  // Ensure filters have arrays for all properties
  useEffect(() => {
    // Initialize filters with empty arrays for all properties if they don't exist
    const normalizedFilters: Filters = { ...createEmptyFilters() };

    // Copy values from props if they exist and are arrays
    if (filters) {
      Object.keys(normalizedFilters).forEach((key) => {
        const filterKey = key as keyof Filters;
        if (filters[filterKey] && Array.isArray(filters[filterKey])) {
          normalizedFilters[filterKey] = [...filters[filterKey]!];
        }
      });
    }

    setLocalFilters(normalizedFilters);
    prevFiltersRef.current = JSON.parse(JSON.stringify(normalizedFilters));
  }, [filters]);

  // Use memo to cache active filter counts
  const activeCounts = useMemo(() => {
    const counts: Record<keyof Filters, number> = {
      indexingStatus: 0,
      department: 0,
      moduleId: 0,
      searchTags: 0,
      appSpecificRecordType: 0,
      recordTypes: 0,
      origin: 0,
      status: 0,
      connectors: 0,
      app: 0,
      permissions: 0,
      kb: 0,
      freshness: 0,
    };

    // Calculate counts from local filters to prevent UI flicker
    Object.entries(localFilters).forEach(([key, values]) => {
      counts[key as keyof Filters] = Array.isArray(values) ? values.length : 0;
    });

    return counts;
  }, [localFilters]);

  // Use memo to cache total active filter count
  const totalActiveFilterCount = useMemo(
    () => Object.values(activeCounts).reduce((acc, count) => acc + count, 0),
    [activeCounts]
  );

  // Update local filters when props change, with added stability mechanism
  useEffect(() => {
    if (!filters) return;

    // Create a normalized version of the incoming filters
    const normalizedFilters: Filters = { ...createEmptyFilters() };

    // Copy all filter values, ensuring they are arrays
    Object.keys(normalizedFilters).forEach((key) => {
      const filterKey = key as keyof Filters;
      if (filters[filterKey] && Array.isArray(filters[filterKey])) {
        normalizedFilters[filterKey] = [...filters[filterKey]!];
      }
    });

    // Compare with prev filters to avoid unnecessary updates
    if (
      !prevFiltersRef.current ||
      JSON.stringify(prevFiltersRef.current) !== JSON.stringify(normalizedFilters)
    ) {
      // Only update if there's a real change
      setLocalFilters(normalizedFilters);
      prevFiltersRef.current = JSON.parse(JSON.stringify(normalizedFilters));
    }
  }, [filters]);

  // Sync internal state with prop
  useEffect(() => {
    setOpen(openSidebar);

    // Manage content visibility with a slight delay for smooth transitions
    if (openSidebar) {
      setShowCollapsedContent(false);
      setTimeout(() => setShowExpandedContent(true), 100);
    } else {
      setShowExpandedContent(false);
      setTimeout(() => setShowCollapsedContent(true), 100);
    }
  }, [openSidebar]);

  const handleDrawerToggle = () => {
    const newOpenState = !open;
    setOpen(newOpenState);

    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const toggleSection = React.useCallback((section: string) => {
    // Prevent multiple toggles from happening simultaneously
    if (toggleInProgress.current) return;

    // Set flag to indicate toggle is in progress
    toggleInProgress.current = true;

    // Use functional state update to get the most current state
    setExpandedSections((prevSections) => {
      // Create a fresh copy to avoid any state mutations
      const updatedSections = { ...prevSections };

      // Toggle only the specific section that was clicked
      updatedSections[section] = !prevSections[section];

      // Return the new object with only the requested section changed
      return updatedSections;
    });

    // Reset the toggle flag after a short delay
    setTimeout(() => {
      toggleInProgress.current = false;
    }, 50);
  }, []);

  // Fix for the handleFilterChange function to isolate filter types completely
  const handleFilterChange = React.useCallback(
    (filterType: keyof Filters, value: string) => {
      // If a filter operation is already in progress, return to prevent flickering
      if (isFilterChanging.current) return;

      // Set the flag to indicate a filter operation is in progress
      isFilterChanging.current = true;
      // Show loading indicator
      setIsLoading(true);

      // Create a new copy of the current filters to avoid reference issues
      const updatedLocalFilters = JSON.parse(JSON.stringify(localFilters)) as Filters;

      // Ensure the filter property exists and is an array
      if (!Array.isArray(updatedLocalFilters[filterType])) {
        updatedLocalFilters[filterType] = [];
      }

      // Get the current array for this filter type
      const currentValues = updatedLocalFilters[filterType];

      // Check if value exists in the array
      const valueIndex = currentValues.indexOf(value);

      // Toggle the value
      if (valueIndex === -1) {
        // Value doesn't exist, so add it
        updatedLocalFilters[filterType] = [...currentValues, value];
      } else {
        // Value exists, so remove it
        updatedLocalFilters[filterType] = [
          ...currentValues.slice(0, valueIndex),
          ...currentValues.slice(valueIndex + 1),
        ];
      }

      // Update local state immediately for responsive UI
      setLocalFilters(updatedLocalFilters);

      // Use requestAnimationFrame to batch UI updates
      requestAnimationFrame(() => {
        // Update parent without causing a re-render of this component
        // Pass a deep copy to avoid reference issues
        onFilterChange(JSON.parse(JSON.stringify(updatedLocalFilters)));

        // Reset the flag and loading state after a short delay
        setTimeout(() => {
          isFilterChanging.current = false;
          setIsLoading(false);
        }, 300);
      });
    },
    [localFilters, onFilterChange]
  );

  // Get filter item names by IDs
  const getFilterName = (type: keyof Filters, id: string): string => {
    switch (type) {
      case 'department':
        return departments.find((d) => d._id === id)?.name || id;
      case 'moduleId':
        return modules.find((m) => m._id === id)?.name || id;
      case 'searchTags':
        return tags.find((t) => t._id === id)?.name || id;
      case 'appSpecificRecordType':
        return recordCategories.find((c) => c._id === id)?.name || id;
      case 'indexingStatus':
      case 'recordTypes':
      case 'origin':
      case 'connectors':
      case 'permissions':
        return formatLabel(id);
      default:
        return id;
    }
  };

  // Clear a specific filter
  const clearFilter = (type: keyof Filters, value: string) => {
    // If a filter operation is already in progress, return
    if (isFilterChanging.current) return;

    isFilterChanging.current = true;
    setIsLoading(true);

    // Create deep copies to avoid mutations
    const updatedLocalFilters = JSON.parse(JSON.stringify(localFilters));

    // Ensure the property exists and is an array
    if (!Array.isArray(updatedLocalFilters[type])) {
      updatedLocalFilters[type] = [];
    } else {
      // Filter out the value to remove
      updatedLocalFilters[type] = updatedLocalFilters[type].filter(
        (item: string) => item !== value
      );
    }

    // Update local state
    setLocalFilters(updatedLocalFilters);

    // Send to parent component
    requestAnimationFrame(() => {
      onFilterChange(JSON.parse(JSON.stringify(updatedLocalFilters)));

      setTimeout(() => {
        isFilterChanging.current = false;
        setIsLoading(false);
      }, 300);
    });
  };

  // Clear all filters
  const clearAllFilters = React.useCallback(() => {
    // If a filter operation is already in progress, return
    if (isFilterChanging.current) return;

    isFilterChanging.current = true;
    setIsLoading(true);

    // Create an empty filters object
    const emptyFilters = createEmptyFilters();

    // Update local state immediately
    setLocalFilters(emptyFilters);

    requestAnimationFrame(() => {
      onFilterChange(JSON.parse(JSON.stringify(emptyFilters)));

      setTimeout(() => {
        isFilterChanging.current = false;
        setIsLoading(false);
      }, 300);
    });
  }, [onFilterChange]);

  // Improved handleCollapsedFilterClick with better section handling
  const handleCollapsedFilterClick = React.useCallback(
    (sectionId: string, filterType: keyof Filters) => {
      // If drawer is closed, open it first
      if (!open) {
        setOpen(true);
        if (onToggleSidebar) {
          onToggleSidebar();
        }

        // After drawer opens, expand only the section clicked
        // Use setTimeout to ensure state updates happen in sequence
        setTimeout(() => {
          setExpandedSections((prevSections) => ({
            ...prevSections,
            [sectionId]: true,
          }));
        }, 100);
      } else {
        // If drawer is already open, just toggle the section
        toggleSection(sectionId);
      }
    },
    [open, onToggleSidebar, toggleSection]
  );

  // Generate active filters view
  const renderActiveFilters = () => {
    if (totalActiveFilterCount === 0) return null;

    return (
      <div className="p-3 mb-6 flex flex-wrap gap-2 bg-background/50 rounded-md border border-border/50 relative">
        <div className="w-full flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-primary">
            Active Filters ({totalActiveFilterCount})
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-auto px-2 py-1 text-xs font-medium text-primary hover:text-primary"
          >
            <Icon icon={closeCircleIcon} className="mr-1 size-3" />
            Clear All
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(localFilters).map(([type, values]) =>
            (values || []).map((value: string) => (
              <Badge
                key={`${type}-${value}`}
                variant="outline"
                className="h-6 text-xs font-medium rounded px-2 border-primary/15 text-primary hover:bg-primary/12 hover:border-primary/30 transition-colors"
              >
                {getFilterName(type as keyof Filters, value)}
                <button
                  onClick={() => clearFilter(type as keyof Filters, value)}
                  className="ml-1.5 hover:text-primary"
                >
                  <Icon icon={closeIcon} className="size-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>
    );
  };

  // Filter section for Record Types
  const RecordTypeFilterSection = useMemo(
    () => (
      <div className="rounded-md mb-2 overflow-hidden">
        <Collapsible
          open={expandedSections.recordType || false}
          onOpenChange={() => toggleSection('recordType')}
        >
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                'px-4 py-3 flex items-center justify-between cursor-pointer rounded-md transition-colors',
                expandedSections.recordType
                  ? 'bg-primary/5 hover:bg-primary/8'
                  : 'hover:bg-primary/8'
              )}
            >
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <FileText
                  className={cn(
                    'size-5',
                    expandedSections.recordType ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                Record Type
                {activeCounts.recordTypes > 0 && (
                  <Badge
                    variant="default"
                    className="ml-1 h-[18px] min-w-[18px] text-[0.7rem] px-1"
                  >
                    {activeCounts.recordTypes}
                  </Badge>
                )}
              </div>
              {expandedSections.recordType ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-2 max-h-[260px] overflow-auto">
              <div className="space-y-1">
                {['FILE', 'MAIL'].map((type) => {
                  const isChecked = (localFilters.recordTypes || []).includes(type);

                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2 py-1.5 -ml-2 hover:opacity-90"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleFilterChange('recordTypes', type)}
                        className="size-4"
                      />
                      <Label className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2">
                        <Icon
                          icon={recordTypeIcons[type]}
                          className="size-4 text-muted-foreground"
                        />
                        {formatLabel(type)}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    ),
    [
      expandedSections.recordType,
      activeCounts.recordTypes,
      localFilters.recordTypes,
      handleFilterChange,
      recordTypeIcons,
      toggleSection,
    ]
  );

  // Filter section for Origin
  const OriginFilterSection = useMemo(
    () => (
      <div className="rounded-md mb-2 overflow-hidden">
        <Collapsible
          open={expandedSections.origin || false}
          onOpenChange={() => toggleSection('origin')}
        >
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                'px-4 py-3 flex items-center justify-between cursor-pointer rounded-md transition-colors',
                expandedSections.origin ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-primary/8'
              )}
            >
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <UploadCloud
                  className={cn(
                    'size-5',
                    expandedSections.origin ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                Origin
                {activeCounts.origin > 0 && (
                  <Badge
                    variant="default"
                    className="ml-1 h-[18px] min-w-[18px] text-[0.7rem] px-1"
                  >
                    {activeCounts.origin}
                  </Badge>
                )}
              </div>
              {expandedSections.origin ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-2 max-h-[260px] overflow-auto">
              <div className="space-y-1">
                {['UPLOAD', 'CONNECTOR'].map((origin) => {
                  const isChecked = (localFilters.origin || []).includes(origin);

                  return (
                    <div
                      key={origin}
                      className="flex items-center gap-2 py-1.5 -ml-2 hover:opacity-90"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleFilterChange('origin', origin)}
                        className="size-4"
                      />
                      <Label className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2">
                        <Icon icon={originIcons[origin]} className="size-4 text-muted-foreground" />
                        {origin === 'UPLOAD' ? 'Local Upload' : 'Connector'}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    ),
    [
      expandedSections.origin,
      activeCounts.origin,
      localFilters.origin,
      handleFilterChange,
      originIcons,
      toggleSection,
    ]
  );

  // Filter section for Connectors
  const ConnectorFilterSection = useMemo(
    () => (
      <div className="rounded-md mb-2 overflow-hidden">
        <Collapsible
          open={expandedSections.connector || false}
          onOpenChange={() => toggleSection('connector')}
        >
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                'px-4 py-3 flex items-center justify-between cursor-pointer rounded-md transition-colors',
                expandedSections.connector
                  ? 'bg-primary/5 hover:bg-primary/8'
                  : 'hover:bg-primary/8'
              )}
            >
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <Cloud
                  className={cn(
                    'size-5',
                    expandedSections.connector ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                Connectors
                {activeCounts.connectors > 0 && (
                  <Badge
                    variant="default"
                    className="ml-1 h-[18px] min-w-[18px] text-[0.7rem] px-1"
                  >
                    {activeCounts.connectors}
                  </Badge>
                )}
              </div>
              {expandedSections.connector ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-2 max-h-[260px] overflow-auto">
              <div className="space-y-1">
                {['GMAIL', 'DRIVE'].map((connector) => {
                  const isChecked = (localFilters.connectors || []).includes(connector);

                  return (
                    <div
                      key={connector}
                      className="flex items-center gap-2 py-1.5 -ml-2 hover:opacity-90"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleFilterChange('connectors', connector)}
                        className="size-4"
                      />
                      <Label className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2">
                        <Icon
                          icon={connectorIcons[connector]}
                          className="size-4 text-muted-foreground"
                        />
                        {connector}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    ),
    [
      expandedSections.connector,
      activeCounts.connectors,
      localFilters.connectors,
      handleFilterChange,
      connectorIcons,
      toggleSection,
    ]
  );

  // Filter section for Permissions
  const PermissionsFilterSection = useMemo(
    () => (
      <div className="rounded-md mb-2 overflow-hidden">
        <Collapsible
          open={expandedSections.permissions || false}
          onOpenChange={() => toggleSection('permissions')}
        >
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                'px-4 py-3 flex items-center justify-between cursor-pointer rounded-md transition-colors',
                expandedSections.permissions
                  ? 'bg-primary/5 hover:bg-primary/8'
                  : 'hover:bg-primary/8'
              )}
            >
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <UserCheck
                  className={cn(
                    'size-5',
                    expandedSections.permissions ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                Permissions
                {activeCounts.permissions > 0 && (
                  <Badge
                    variant="default"
                    className="ml-1 h-[18px] min-w-[18px] text-[0.7rem] px-1"
                  >
                    {activeCounts.permissions}
                  </Badge>
                )}
              </div>
              {expandedSections.permissions ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-2 max-h-[260px] overflow-auto">
              <div className="space-y-1">
                {['READER', 'WRITER', 'OWNER', 'COMMENTER', 'ORGANIZER', 'FILEORGANIZER'].map(
                  (permission) => {
                    const isChecked = (localFilters.permissions || []).includes(permission);

                    return (
                      <div
                        key={permission}
                        className="flex items-center gap-2 py-1.5 -ml-2 hover:opacity-90"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleFilterChange('permissions', permission)}
                          className="size-4"
                        />
                        <Label className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2">
                          <Icon
                            icon={permissionIcons[permission]}
                            className="size-4 text-muted-foreground"
                          />
                          {formatLabel(permission)}
                        </Label>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    ),
    [
      expandedSections.permissions,
      activeCounts.permissions,
      localFilters.permissions,
      handleFilterChange,
      permissionIcons,
      toggleSection,
    ]
  );

  // Collapsed sidebar content with memoization
  const CollapsedContent = useMemo(
    () => (
      <div
        className={cn(
          'flex flex-col items-center pt-4 transition-opacity duration-200',
          showCollapsedContent ? 'opacity-100' : 'opacity-0'
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCollapsedFilterClick('status', 'indexingStatus')}
              className="mb-4 hover:scale-105 active:scale-95 transition-transform"
            >
              <Badge variant="default" className={activeCounts.indexingStatus > 0 ? '' : 'hidden'}>
                {activeCounts.indexingStatus}
              </Badge>
              <Icon icon={filterVariantIcon} className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Status Filters</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCollapsedFilterClick('recordType', 'recordTypes')}
              className="mb-4 hover:scale-105 active:scale-95 transition-transform"
            >
              <Badge variant="default" className={activeCounts.recordTypes > 0 ? '' : 'hidden'}>
                {activeCounts.recordTypes}
              </Badge>
              <Icon icon={fileIcon} className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Record Type Filters</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCollapsedFilterClick('origin', 'origin')}
              className="mb-4 hover:scale-105 active:scale-95 transition-transform"
            >
              <Badge variant="default" className={activeCounts.origin > 0 ? '' : 'hidden'}>
                {activeCounts.origin}
              </Badge>
              <Icon icon={cloudUploadIcon} className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Origin Filters</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCollapsedFilterClick('connector', 'connectors')}
              className="mb-4 hover:scale-105 active:scale-95 transition-transform"
            >
              <Badge variant="default" className={activeCounts.connectors > 0 ? '' : 'hidden'}>
                {activeCounts.connectors}
              </Badge>
              <Icon icon={cloudConnectorIcon} className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Connector Filters</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCollapsedFilterClick('permissions', 'permissions')}
              className="mb-4 hover:scale-105 active:scale-95 transition-transform"
            >
              <Badge variant="default" className={activeCounts.permissions > 0 ? '' : 'hidden'}>
                {activeCounts.permissions}
              </Badge>
              <Icon icon={userCheckIcon} className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Permission Filters</TooltipContent>
        </Tooltip>

        {totalActiveFilterCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearAllFilters}
                className="mt-4 bg-destructive/10 hover:bg-destructive/20 hover:scale-105 active:scale-95 transition-transform"
              >
                <Icon icon={filterRemoveIcon} className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Clear All Filters</TooltipContent>
          </Tooltip>
        )}
      </div>
    ),
    [
      showCollapsedContent,
      activeCounts,
      totalActiveFilterCount,
      clearAllFilters,
      handleCollapsedFilterClick,
    ]
  );

  // Filter section component - memoize for better performance
  const StatusFilterSection = useMemo(
    () => (
      <div className="rounded-md mb-2 overflow-hidden">
        <Collapsible
          open={expandedSections.status || false}
          onOpenChange={() => toggleSection('status')}
        >
          <CollapsibleTrigger asChild>
            <div
              className={cn(
                'px-4 py-3 flex items-center justify-between cursor-pointer rounded-md transition-colors',
                expandedSections.status ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-primary/8'
              )}
            >
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <Filter
                  className={cn(
                    'size-5',
                    expandedSections.status ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                Status
                {activeCounts.indexingStatus > 0 && (
                  <Badge
                    variant="default"
                    className="ml-1 h-[18px] min-w-[18px] text-[0.7rem] px-1"
                  >
                    {activeCounts.indexingStatus}
                  </Badge>
                )}
              </div>
              {expandedSections.status ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-2 max-h-[260px] overflow-auto">
              <div className="space-y-1">
                {[
                  'NOT_STARTED',
                  'IN_PROGRESS',
                  'FAILED',
                  'COMPLETED',
                  'FILE_TYPE_NOT_SUPPORTED',
                  'AUTO_INDEX_OFF',
                ].map((status) => {
                  const isChecked = (localFilters.indexingStatus || []).includes(status);
                  const StatusIcon = statusIconComponents[status] || Circle;

                  return (
                    <div
                      key={status}
                      className="flex items-center gap-2 py-1.5 -ml-2 hover:opacity-90"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleFilterChange('indexingStatus', status)}
                        className="size-4"
                      />
                      <Label className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2">
                        <StatusIcon
                          className={cn('size-4', `text-${statusColors[status] || '#9e9e9e'}`)}
                        />
                        {status === 'AUTO_INDEX_OFF' ? 'Manual Sync' : formatLabel(status)}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    ),
    [
      expandedSections.status,
      activeCounts.indexingStatus,
      localFilters.indexingStatus,
      statusColors,
      handleFilterChange,
      toggleSection,
    ]
  );

  return (
    <div
      className={cn(
        'fixed left-0 top-[50px] h-[calc(100vh-50px)] flex-shrink-0 whitespace-nowrap box-border transition-all duration-300 bg-background shadow-md z-40',
        open ? `w-[280px]` : 'w-[60px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 min-h-16 relative">
        {open ? (
          <>
            <div className="flex items-center gap-2 text-base font-semibold text-primary">
              <Icon icon={filterMenuIcon} className="size-5" />
              Filters
            </div>

            {/* Clean loading indicator in header */}
            <AnimatePresence>
              {isLoading && (
                <m.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-2.5 right-2.5 z-[100] flex items-center justify-center rounded-full p-0.5 bg-background/80 shadow-sm"
                >
                  <Loader2 className="size-4 animate-spin text-primary" />
                </m.div>
              )}
            </AnimatePresence>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDrawerToggle}
                  className="size-8 text-muted-foreground hover:scale-105 active:scale-95 transition-transform"
                >
                  <ChevronLeft className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse sidebar</TooltipContent>
            </Tooltip>

            {/* Status indicator bar at the bottom of header */}
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-opacity duration-200',
                isLoading ? 'opacity-100 animate-pulse' : 'opacity-0'
              )}
            />
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDrawerToggle}
                  className="mx-auto text-primary hover:scale-105 active:scale-95 transition-transform"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>

            {/* Status indicator for collapsed state */}
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-opacity duration-200',
                isLoading ? 'opacity-100 animate-pulse' : 'opacity-0'
              )}
            />
          </>
        )}
      </div>

      {!open ? (
        CollapsedContent
      ) : (
        <div
          className={cn(
            'w-full relative transition-opacity duration-200',
            showExpandedContent ? 'opacity-100' : 'opacity-0'
          )}
        >
          <ScrollArea className="h-[calc(100vh-110px)] px-3 py-4">
            {/* All filter sections have been removed */}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
