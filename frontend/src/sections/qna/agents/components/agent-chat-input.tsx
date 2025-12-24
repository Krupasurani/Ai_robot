import type { Connector } from 'src/sections/accountdetails/connectors/types/types';

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import {
  Cog,
  Plus,
  Wrench,
  X,
  Check,
  Search,
  ArrowUp,
  Database,
  ChevronDown,
  Sparkles,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { cn } from '@/utils/cn';

import type { KnowledgeBase } from '../services/api';

export interface Model {
  provider: string;
  modelName: string;
}

export interface ChatMode {
  id: string;
  name: string;
  description: string;
}

export type ChatInputProps = {
  onSubmit: (
    message: string,
    modelKey?: string,
    modelName?: string,
    chatMode?: string,
    selectedTools?: string[],
    selectedKBs?: string[],
    selectedApps?: string[]
  ) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  selectedModel: Model | null;
  selectedChatMode: ChatMode | null;
  onModelChange: (model: Model) => void;
  onChatModeChange: (mode: ChatMode) => void;
  availableModels: Model[];
  availableKBs: KnowledgeBase[];
  agent?: any;
  activeConnectors: Connector[];
};

// Define chat modes with compact styling
const CHAT_MODES: ChatMode[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Standard responses',
  },
  {
    id: 'quick',
    name: 'Quick',
    description: 'Fast responses with minimal context',
  },
];

interface ToolOption {
  id: string; // This will be app_name.tool_name format
  label: string;
  displayName: string;
  app_name: string;
  tool_name: string;
  description: string;
}

interface KBOption {
  id: string; // This will be the KB ID
  name: string;
  description?: string;
}

interface AppOption {
  id: string; // This will be the app name
  name: string;
  displayName: string;
}

// Utility function to normalize names
const normalizeDisplayName = (name: string): string =>
  name
    .split('_')
    .map((word) => {
      const upperWord = word.toUpperCase();
      if (
        [
          'ID',
          'URL',
          'API',
          'UI',
          'DB',
          'AI',
          'ML',
          'KB',
          'PDF',
          'CSV',
          'JSON',
          'XML',
          'HTML',
          'CSS',
          'JS',
          'GCP',
          'AWS',
        ].includes(upperWord)
      ) {
        return upperWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

const AgentChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  isLoading,
  disabled = false,
  placeholder = 'Type your message...',
  selectedModel,
  selectedChatMode,
  onModelChange,
  onChatModeChange,
  availableModels,
  availableKBs,
  agent,
  activeConnectors,
}) => {
  const [localValue, setLocalValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasText, setHasText] = useState(false);

  // Persistent selected items - these will remain selected throughout the conversation
  const [selectedTools, setSelectedTools] = useState<string[]>([]); // app_name.tool_name format
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]); // KB IDs
  const [selectedApps, setSelectedApps] = useState<string[]>([]); // App names
  const [initialized, setInitialized] = useState(false);

  // Dialog states
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [toolSearchTerm, setToolSearchTerm] = useState('');
  const [kbSearchTerm, setKbSearchTerm] = useState('');
  const [appSearchTerm, setAppSearchTerm] = useState('');

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set defaults for model and chat mode
  useEffect(() => {
    if (!selectedChatMode && CHAT_MODES.length > 0) {
      onChatModeChange(CHAT_MODES[0]);
    }
    if (!selectedModel && availableModels.length > 0) {
      onModelChange(availableModels[0]);
    }
  }, [selectedChatMode, onChatModeChange, selectedModel, availableModels, onModelChange]);

  // Initialize selections from agent defaults (only once)
  useEffect(() => {
    if (agent && !initialized) {
      // Initialize with agent's default tools
      if (agent.tools && Array.isArray(agent.tools)) {
        setSelectedTools([...agent.tools]);
      }

      // Initialize with agent's default KBs
      if (agent.kb && Array.isArray(agent.kb)) {
        setSelectedKBs([...agent.kb]);
      }

      // Initialize with agent's default apps
      if (agent.apps && Array.isArray(agent.apps)) {
        setSelectedApps([...agent.apps]);
      }

      setInitialized(true);
      console.log('Initialized selections from agent:', {
        tools: agent.tools,
        kb: agent.kb,
        apps: agent.apps,
      });
    }
  }, [agent, initialized]);

  // Convert agent tools to tool options
  const agentToolOptions: ToolOption[] = useMemo(() => {
    if (!agent?.tools) return [];

    return agent.tools.map((toolId: string) => {
      const [app_name, tool_name] = toolId.split('.');
      return {
        id: toolId, // Keep full app_name.tool_name format for API
        label: toolId,
        displayName: `${normalizeDisplayName(app_name || '')} • ${normalizeDisplayName(tool_name || '')}`,
        app_name: app_name || '',
        tool_name: tool_name || '',
        description: `${normalizeDisplayName(app_name || '')} ${normalizeDisplayName(tool_name || '')} tool`,
      };
    });
  }, [agent?.tools]);

  // Convert available KBs to KB options (filter by agent's KB list)
  const agentKBOptions: KBOption[] = useMemo(() => {
    if (!agent?.kb || !availableKBs) return [];

    return availableKBs
      .filter((kb) => agent.kb.includes(kb.id))
      .map((kb) => ({
        id: kb.id, // Use KB ID for API
        name: kb.name,
        description: `Knowledge Base: ${kb.name}`,
      }));
  }, [availableKBs, agent?.kb]);

  // Convert agent apps to app options
  const agentAppOptions: AppOption[] = useMemo(() => {
    if (!agent?.apps) return [];

    return agent.apps.map((appName: string) => ({
      id: appName, // Use app name for API
      name: appName,
      displayName: normalizeDisplayName(appName),
    }));
  }, [agent?.apps]);

  // All available apps for autocomplete
  const allAppOptions: AppOption[] = activeConnectors.map((app) => ({
    id: app.name, // Use app name for API
    name: app.name,
    displayName: normalizeDisplayName(app.name),
  }));

  // Filtered options
  const filteredTools = useMemo(() => {
    if (!toolSearchTerm) return agentToolOptions;
    return agentToolOptions.filter(
      (tool) =>
        tool.displayName.toLowerCase().includes(toolSearchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(toolSearchTerm.toLowerCase())
    );
  }, [agentToolOptions, toolSearchTerm]);

  const filteredKBs = useMemo(() => {
    if (!kbSearchTerm) return agentKBOptions;
    return agentKBOptions.filter(
      (kb) =>
        kb.name.toLowerCase().includes(kbSearchTerm.toLowerCase()) ||
        (kb.description && kb.description.toLowerCase().includes(kbSearchTerm.toLowerCase()))
    );
  }, [agentKBOptions, kbSearchTerm]);

  const filteredApps = useMemo(() => {
    const appsToFilter = agentAppOptions.length > 0 ? agentAppOptions : allAppOptions;
    if (!appSearchTerm) return appsToFilter;
    return appsToFilter.filter(
      (app) =>
        app.displayName.toLowerCase().includes(appSearchTerm.toLowerCase()) ||
        app.name.toLowerCase().includes(appSearchTerm.toLowerCase())
    );
  }, [agentAppOptions, allAppOptions, appSearchTerm]);

  const autoResizeTextarea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(inputRef.current.scrollHeight, 40), 100);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = e.target;
      setLocalValue(value);
      setHasText(!!value.trim());

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(autoResizeTextarea, 50);
    },
    [autoResizeTextarea]
  );

  const handleSubmit = useCallback(async () => {
    const trimmedValue = localValue.trim();
    if (!trimmedValue || isLoading || isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clear only the input text, keep all selections persistent
      setLocalValue('');
      setHasText(false);

      if (inputRef.current) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = '40px';
          }
        }, 50);
      }

      console.log('Submitting with persistent selections:', {
        tools: selectedTools,
        kbs: selectedKBs,
        apps: selectedApps,
        chatMode: selectedChatMode?.id,
      });
      // Pass the persistent selected items with correct IDs/names for API
      await onSubmit(
        trimmedValue,
        selectedModel?.modelName,
        selectedModel?.modelName,
        selectedChatMode?.id,
        selectedTools,
        selectedKBs,
        selectedApps
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setLocalValue(trimmedValue);
      setHasText(true);
    } finally {
      setIsSubmitting(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [
    localValue,
    isLoading,
    isSubmitting,
    disabled,
    onSubmit,
    selectedModel,
    selectedChatMode,
    selectedTools, // These remain persistent
    selectedKBs, // These remain persistent
    selectedApps, // These remain persistent
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleModelSelect = (model: Model) => {
    onModelChange(model);
  };

  const handleChatModeSelect = (mode: ChatMode) => {
    onChatModeChange(mode);
    console.log('Chat mode changed to:', mode.id);
  };

  // Toggle functions - using the correct IDs for API - these are persistent
  const handleToolToggle = (toolId: string) => {
    setSelectedTools((prev) => {
      const newSelection = prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId];
      console.log('Tools selection updated:', newSelection);
      return newSelection;
    });
  };

  const handleKBToggle = (kbId: string) => {
    setSelectedKBs((prev) => {
      const newSelection = prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId];
      console.log('KBs selection updated:', newSelection);
      return newSelection;
    });
  };

  const handleAppToggle = (appId: string) => {
    setSelectedApps((prev) => {
      const newSelection = prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId];
      console.log('Apps selection updated:', newSelection);
      return newSelection;
    });
  };

  const handleDialogClose = () => {
    setSelectionDialogOpen(false);
    setDialogTab(0);
    setToolSearchTerm('');
    setKbSearchTerm('');
    setAppSearchTerm('');
  };

  // Reset all selections to agent defaults
  const handleResetToDefaults = useCallback(() => {
    if (agent) {
      setSelectedTools(agent.tools ? [...agent.tools] : []);
      setSelectedKBs(agent.kb ? [...agent.kb] : []);
      setSelectedApps(agent.apps ? [...agent.apps] : []);
      console.log('Reset selections to agent defaults');
    }
  }, [agent]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    setSelectedTools([]);
    setSelectedKBs([]);
    setSelectedApps([]);
    console.log('Cleared all selections');
  }, []);

  const isInputDisabled = disabled || isSubmitting || isLoading;
  const canSubmit = hasText && !isInputDisabled;
  const totalSelectedItems = selectedTools.length + selectedKBs.length + selectedApps.length;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="p-1 w-full max-w-[800px] mx-auto">
        {/* Main Input Container */}
        <Card
          className={cn(
            'flex flex-col rounded-2xl border transition-all duration-200',
            'bg-muted/50 hover:border-border/80 hover:shadow-md',
            'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10'
          )}
        >
          {/* Text Input Area */}
          <div className="px-4 py-2 flex items-end gap-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                placeholder={placeholder}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                value={localValue}
                disabled={isInputDisabled}
                className={cn(
                  'w-full border-none outline-none bg-transparent',
                  'text-sm leading-relaxed min-h-[20px] max-h-[80px]',
                  'resize-none overflow-y-auto cursor-text',
                  'font-sans text-foreground',
                  isInputDisabled && 'opacity-60'
                )}
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="icon"
              className={cn(
                'h-8 w-8 rounded-full transition-all',
                canSubmit
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Bottom Bar - Chat Modes & Controls */}
          <div className="px-4 py-1 flex items-center justify-between border-t border-border/50">
            {/* Chat Mode Buttons */}
            <div className="flex gap-2">
              {CHAT_MODES.map((mode) => (
                <Button
                  key={mode.id}
                  onClick={() => handleChatModeSelect(mode)}
                  size="sm"
                  variant={selectedChatMode?.id === mode.id ? 'default' : 'outline'}
                  className={cn(
                    'h-6 text-[0.7rem] font-medium rounded-full gap-1',
                    selectedChatMode?.id === mode.id && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  {mode.name}
                </Button>
              ))}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              {/* Resources Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    {totalSelectedItems > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.65rem]">
                        {totalSelectedItems > 99 ? '99+' : totalSelectedItems}
                      </Badge>
                    )}
                    <Button
                      onClick={() => setSelectionDialogOpen(true)}
                      size="icon"
                      variant="outline"
                      className={cn(
                        'h-7 w-7',
                        totalSelectedItems > 0 && 'bg-primary/10 border-primary text-primary'
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add tools, knowledge & apps</p>
                </TooltipContent>
              </Tooltip>

              {/* Model Selector */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-[0.7rem] font-medium gap-1"
                      >
                        {selectedModel?.modelName?.slice(0, 16) || 'Model'}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[200px] max-h-[240px]">
                      <div className="p-2">
                        <p className="px-2 pb-1 text-xs text-muted-foreground">AI Models</p>
                        <Separator className="mb-1" />
                        {availableModels.map((model) => (
                          <DropdownMenuItem
                            key={`${model.provider}-${model.modelName}`}
                            onClick={() => handleModelSelect(model)}
                            className={cn(
                              'rounded-md mb-1 py-1',
                              selectedModel?.modelName === model.modelName && 'bg-accent'
                            )}
                          >
                            <div>
                              <p className="text-xs font-medium">{model.modelName}</p>
                              <p className="text-[0.65rem] text-muted-foreground">
                                {normalizeDisplayName(model.provider)}
                              </p>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Model: {selectedModel?.modelName || 'Select'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </Card>
      </div>

      {/* Compact Resources Selection Dialog */}
      <Dialog open={selectionDialogOpen} onOpenChange={(isOpen) => !isOpen && handleDialogClose()}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogTitle className="flex items-center justify-between p-6 pb-2">
            <h3 className="text-lg font-semibold">Select Resources</h3>
            <Button size="icon" variant="ghost" onClick={handleDialogClose} className="h-8 w-8">
              <X className="h-4.5 w-4.5" />
            </Button>
          </DialogTitle>

          <div className="px-6 pb-4 flex-1 overflow-auto">
            {/* Tabs for different resource types */}
            <Tabs
              value={dialogTab.toString()}
              onValueChange={(value) => setDialogTab(parseInt(value))}
              className="mb-4"
            >
              <TabsList className="w-full">
                <TabsTrigger value="0" className="flex-1 gap-1.5 text-xs">
                  <Wrench className="h-4 w-4" />
                  Tools {selectedTools.length > 0 ? `(${selectedTools.length})` : ''}
                </TabsTrigger>
                <TabsTrigger value="1" className="flex-1 gap-1.5 text-xs">
                  <Database className="h-4 w-4" />
                  Knowledge {selectedKBs.length > 0 ? `(${selectedKBs.length})` : ''}
                </TabsTrigger>
                <TabsTrigger value="2" className="flex-1 gap-1.5 text-xs">
                  <Cog className="h-4 w-4" />
                  Apps {selectedApps.length > 0 ? `(${selectedApps.length})` : ''}
                </TabsTrigger>
              </TabsList>

              {/* Tools Tab */}
              <TabsContent value="0">
                {agentToolOptions.length > 0 ? (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search tools..."
                        value={toolSearchTerm}
                        onChange={(e) => setToolSearchTerm(e.target.value)}
                        className="pl-9 h-8"
                      />
                    </div>

                    <div className="max-h-[300px] overflow-auto space-y-2">
                      {filteredTools.map((tool) => (
                        <div
                          key={tool.id}
                          onClick={() => handleToolToggle(tool.id)}
                          className={cn(
                            'p-3 cursor-pointer border rounded-md transition-colors',
                            selectedTools.includes(tool.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary hover:bg-primary/5'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{tool.displayName}</p>
                              <p className="text-[0.65rem] text-muted-foreground truncate">
                                {tool.description}
                              </p>
                            </div>
                            {selectedTools.includes(tool.id) && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      No tools configured for this agent
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Knowledge Bases Tab */}
              <TabsContent value="1">
                {agentKBOptions.length > 0 ? (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search knowledge bases..."
                        value={kbSearchTerm}
                        onChange={(e) => setKbSearchTerm(e.target.value)}
                        className="pl-9 h-8"
                      />
                    </div>

                    <div className="max-h-[300px] overflow-auto space-y-2">
                      {filteredKBs.map((kb) => (
                        <div
                          key={kb.id}
                          onClick={() => handleKBToggle(kb.id)}
                          className={cn(
                            'p-3 cursor-pointer border rounded-md transition-colors',
                            selectedKBs.includes(kb.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary hover:bg-primary/5'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{kb.name}</p>
                              {kb.description && (
                                <p className="text-[0.65rem] text-muted-foreground truncate">
                                  {kb.description}
                                </p>
                              )}
                            </div>
                            {selectedKBs.includes(kb.id) && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      No knowledge bases configured for this agent
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Applications Tab */}
              <TabsContent value="2">
                {agentAppOptions.length > 0 ? (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search applications..."
                        value={appSearchTerm}
                        onChange={(e) => setAppSearchTerm(e.target.value)}
                        className="pl-9 h-8"
                      />
                    </div>

                    <div className="max-h-[300px] overflow-auto space-y-2">
                      {filteredApps.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => handleAppToggle(app.id)}
                          className={cn(
                            'p-3 cursor-pointer border rounded-md transition-colors',
                            selectedApps.includes(app.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary hover:bg-primary/5'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Cog className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{app.displayName}</p>
                              <p className="text-[0.65rem] text-muted-foreground truncate">
                                {app.name}
                              </p>
                            </div>
                            {selectedApps.includes(app.id) && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      No apps configured. Add from available apps:
                    </p>

                    <Command className="mb-4">
                      <CommandInput placeholder="Search and add applications..." />
                      <CommandList>
                        <CommandEmpty>No apps found.</CommandEmpty>
                        {allAppOptions.map((option) => (
                          <CommandItem key={option.id} onSelect={() => handleAppToggle(option.id)}>
                            <div>
                              <p className="text-xs font-medium">{option.displayName}</p>
                              <p className="text-[0.65rem] text-muted-foreground">{option.name}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>

                    {selectedApps.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedApps.map((appId) => {
                          const app = allAppOptions.find((a) => a.id === appId);
                          return (
                            <Badge
                              key={appId}
                              variant="outline"
                              className="h-5 text-[0.65rem] gap-1"
                            >
                              {app?.displayName || appId}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => handleAppToggle(appId)}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="px-6 pb-4 pt-2">
            <p className="text-xs text-muted-foreground flex-1">
              {totalSelectedItems} items selected
            </p>
            <Button onClick={handleDialogClose} size="sm" className="rounded-lg">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgentChatInput;
