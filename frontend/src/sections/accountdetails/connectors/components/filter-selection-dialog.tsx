import { Check, X, Filter } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { ConnectorApiService } from '../services/api';
import type { Connector } from '../types/types';

interface FilterSelectionDialogProps {
  connector: Connector;
  filterOptions: any;
  onClose: () => void;
  onSave: (filters: any) => void;
  isEnabling?: boolean;
}

const FilterSelectionDialog: React.FC<FilterSelectionDialogProps> = ({
  connector,
  filterOptions,
  onClose,
  onSave,
  isEnabling = false,
}) => {
  const [selectedFilters, setSelectedFilters] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize with empty selections
    const initialFilters: any = {};

    if (filterOptions.folders) {
      initialFilters.folders = [];
    }
    if (filterOptions.fileTypes) {
      initialFilters.fileTypes = [];
    }
    if (filterOptions.labels) {
      initialFilters.labels = [];
    }
    if (filterOptions.channels) {
      initialFilters.channels = [];
    }

    setSelectedFilters(initialFilters);
  }, [filterOptions]);

  const handleFilterChange = (filterType: string, value: any) => {
    setSelectedFilters((prev: any) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Save the selected filters to the backend
      await ConnectorApiService.saveConnectorFilters(connector.name, selectedFilters);

      // Call the onSave callback
      onSave(selectedFilters);

      onClose();
    } catch (saveError) {
      console.error('Error saving filters:', saveError);
      setError('Failed to save filters. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleFilterItem = (filterType: string, itemId: string) => {
    const current = selectedFilters[filterType] || [];
    const newValue = current.includes(itemId)
      ? current.filter((id: string) => id !== itemId)
      : [...current, itemId];
    handleFilterChange(filterType, newValue);
  };

  const renderFolderSelector = () => {
    if (!filterOptions.folders || filterOptions.folders.length === 0) return null;

    const selected = selectedFilters.folders || [];

    return (
      <div className="space-y-2 mb-4">
        <Label className="text-sm font-medium">Select Folders</Label>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selected.map((value: string) => {
              const folder = filterOptions.folders.find((f: any) => f.id === value);
              return (
                <Badge key={value} variant="secondary" className="text-xs">
                  {folder?.name || value}
                </Badge>
              );
            })}
          </div>
        )}
        <ScrollArea className="h-32 border rounded-md p-2">
          <div className="space-y-2">
            {filterOptions.folders.map((folder: any) => (
              <div key={folder.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`folder-${folder.id}`}
                  checked={selected.includes(folder.id)}
                  onCheckedChange={() => toggleFilterItem('folders', folder.id)}
                />
                <label htmlFor={`folder-${folder.id}`} className="text-sm cursor-pointer flex-1">
                  {folder.name}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderFileTypeSelector = () => {
    if (!filterOptions.fileTypes || filterOptions.fileTypes.length === 0) return null;

    const selected = selectedFilters.fileTypes || [];

    return (
      <div className="space-y-2 mb-4">
        <Label className="text-sm font-medium">Select File Types</Label>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selected.map((value: string) => {
              const fileType = filterOptions.fileTypes.find((ft: any) => ft.value === value);
              return (
                <Badge key={value} variant="secondary" className="text-xs">
                  {fileType?.label || value}
                </Badge>
              );
            })}
          </div>
        )}
        <ScrollArea className="h-32 border rounded-md p-2">
          <div className="space-y-2">
            {filterOptions.fileTypes.map((fileType: any) => (
              <div key={fileType.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`filetype-${fileType.value}`}
                  checked={selected.includes(fileType.value)}
                  onCheckedChange={() => toggleFilterItem('fileTypes', fileType.value)}
                />
                <label
                  htmlFor={`filetype-${fileType.value}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {fileType.label}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderLabelSelector = () => {
    if (!filterOptions.labels || filterOptions.labels.length === 0) return null;

    const selected = selectedFilters.labels || [];

    return (
      <div className="space-y-2 mb-4">
        <Label className="text-sm font-medium">Select {connector.name} Labels</Label>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selected.map((value: string) => {
              const label = filterOptions.labels.find((l: any) => l.id === value);
              return (
                <Badge key={value} variant="secondary" className="text-xs">
                  {label?.name || value}
                </Badge>
              );
            })}
          </div>
        )}
        <ScrollArea className="h-32 border rounded-md p-2">
          <div className="space-y-2">
            {filterOptions.labels.map((label: any) => (
              <div key={label.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`label-${label.id}`}
                  checked={selected.includes(label.id)}
                  onCheckedChange={() => toggleFilterItem('labels', label.id)}
                />
                <label htmlFor={`label-${label.id}`} className="text-sm cursor-pointer flex-1">
                  {label.name}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderChannelSelector = () => {
    if (!filterOptions.channels || filterOptions.channels.length === 0) return null;

    const selected = selectedFilters.channels || [];

    return (
      <div className="space-y-2 mb-4">
        <Label className="text-sm font-medium">Select {connector.name} Channels</Label>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selected.map((value: string) => {
              const channel = filterOptions.channels.find((c: any) => c.id === value);
              return (
                <Badge key={value} variant="secondary" className="text-xs">
                  {channel?.name || value}
                </Badge>
              );
            })}
          </div>
        )}
        <ScrollArea className="h-32 border rounded-md p-2">
          <div className="space-y-2">
            {filterOptions.channels.map((channel: any) => (
              <div key={channel.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`channel-${channel.id}`}
                  checked={selected.includes(channel.id)}
                  onCheckedChange={() => toggleFilterItem('channels', channel.id)}
                />
                <label htmlFor={`channel-${channel.id}`} className="text-sm cursor-pointer flex-1">
                  {channel.name}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const getDialogTitle = () => {
    const baseTitle = `Select ${connector.name} Filters`;
    return isEnabling ? `Enable ${connector.name} - ${baseTitle}` : baseTitle;
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Filter className="size-6" />
            <DialogTitle className="text-lg font-semibold">{getDialogTitle()}</DialogTitle>
          </div>
          <DialogDescription>
            Select the filters you want to apply to this connector.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {renderFolderSelector()}
            {renderFileTypeSelector()}
            {renderLabelSelector()}
            {renderChannelSelector()}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="size-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Check className="size-4 mr-2" />
            {saving
              ? isEnabling
                ? 'Enabling...'
                : 'Saving...'
              : isEnabling
                ? 'Enable & Save Filters'
                : 'Save Filters'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilterSelectionDialog;
