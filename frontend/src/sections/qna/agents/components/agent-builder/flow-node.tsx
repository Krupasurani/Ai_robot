import React, { useState, useEffect, useCallback } from 'react';
import { Handle, Position, useStore, useReactFlow } from '@xyflow/react';
import {
  Cog,
  Settings,
  Wrench,
  Brain,
  Pencil,
  Database,
  FileText,
  X,
  Cloud,
  Info,
  Package,
  MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/utils/cn';

import { formattedProvider, normalizeDisplayName } from '../../utils/agent';

interface FlowNodeData extends Record<string, unknown> {
  id: string;
  type: string;
  label: string;
  config: Record<string, any>;
  description?: string;
  icon?: any;
  inputs?: string[];
  outputs?: string[];
  isConfigured?: boolean;
}

interface FlowNodeProps {
  data: FlowNodeData;
  selected: boolean;
}

const FlowNode: React.FC<FlowNodeProps> = ({ data, selected }) => {
  const storeNodes = useStore((s) => s.nodes);
  const storeEdges = useStore((s) => s.edges);
  const { setNodes } = useReactFlow();
  const [lastClickTime, setLastClickTime] = useState(0);

  // Editing state
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [systemPromptValue, setSystemPromptValue] = useState(
    data.config?.systemPrompt || 'You are a helpful assistant.'
  );
  const [startMessageValue, setStartMessageValue] = useState(
    data.config?.startMessage || 'Hello! How can I help you today?'
  );
  const [descriptionValue, setDescriptionValue] = useState(
    data.config?.description || 'AI agent for task automation and assistance'
  );

  const updateNodeConfig = useCallback(
    (key: string, value: string) => {
      setNodes((nodes: any[]) =>
        nodes.map((node: any) =>
          node.id === data.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: {
                    ...node.data.config,
                    [key]: value,
                  },
                },
              }
            : node
        )
      );
    },
    [data.id, setNodes]
  );

  const handlePromptDialogOpen = useCallback(() => {
    setSystemPromptValue(data.config?.systemPrompt || 'You are a helpful assistant.');
    setStartMessageValue(data.config?.startMessage || 'Hello! How can I help you today?');
    setDescriptionValue(data.config?.description || 'AI agent for task automation and assistance');
    setPromptDialogOpen(true);
  }, [data.config?.systemPrompt, data.config?.startMessage, data.config?.description]);

  const handlePromptDialogSave = useCallback(() => {
    updateNodeConfig('systemPrompt', systemPromptValue);
    updateNodeConfig('startMessage', startMessageValue);
    updateNodeConfig('description', descriptionValue);
    setPromptDialogOpen(false);
  }, [systemPromptValue, startMessageValue, descriptionValue, updateNodeConfig]);

  const handlePromptDialogCancel = useCallback(() => {
    setSystemPromptValue(data.config?.systemPrompt || 'You are a helpful assistant.');
    setStartMessageValue(data.config?.startMessage || 'Hello! How can I help you today?');
    setDescriptionValue(data.config?.description || 'AI agent for task automation and assistance');
    setPromptDialogOpen(false);
  }, [data.config?.systemPrompt, data.config?.startMessage, data.config?.description]);

  // Sync local state with node data changes
  useEffect(() => {
    setSystemPromptValue(data.config?.systemPrompt || 'You are a helpful assistant.');
  }, [data.config?.systemPrompt]);

  useEffect(() => {
    setStartMessageValue(data.config?.startMessage || 'Hello! How can I help you today?');
  }, [data.config?.startMessage]);

  useEffect(() => {
    setDescriptionValue(data.config?.description || 'AI agent for task automation and assistance');
  }, [data.config?.description]);

  const connectedNodesByHandle = React.useMemo(() => {
    if (data.type !== 'agent-core') return {} as Record<string, any[]>;
    const incoming = storeEdges.filter((e) => e.target === data.id);
    const map: Record<string, any[]> = { input: [], actions: [], knowledge: [], llms: [] };
    incoming.forEach((e: any) => {
      const sourceNode = storeNodes.find((n) => n.id === e.source) as any;
      if (sourceNode) {
        const handle = e.targetHandle || 'input';
        if (!map[handle]) map[handle] = [];
        map[handle].push(sourceNode.data);
      }
    });
    return map;
  }, [data.id, data.type, storeEdges, storeNodes]);

  // Enhanced Agent node
  if (data.type === 'agent-core') {
    return (
      <div
        className={cn(
          'w-[420px] min-h-[650px] rounded-3xl bg-background border cursor-pointer',
          'transition-all duration-300 relative overflow-visible backdrop-blur-md',
          'hover:-translate-y-0.5 hover:shadow-lg',
          selected
            ? 'border-2 border-primary shadow-lg shadow-primary/10'
            : 'border border-border shadow-sm shadow-foreground/5'
        )}
        onClick={(e) => {
          // Prevent rapid clicks
          const now = Date.now();
          if (now - lastClickTime < 300) return;
          setLastClickTime(now);
          e.stopPropagation();
        }}
      >
        {/* Header - Thero-inspired clean design */}
        <div className="p-6 pb-4 border-b border-border/50 rounded-t-3xl relative bg-background">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-md flex items-center justify-center shadow-md bg-gradient-to-br from-primary to-primary/80">
                <Brain className="h-4.5 w-4.5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-foreground tracking-tight">Agent</h3>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePromptDialogOpen}
              className="h-6 w-6 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:scale-105 transition-all duration-200"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground font-medium flex-1">
            Define the agent&apos;s instructions, then enter a task to complete using tools.
          </p>
        </div>

        {/* Agent Configuration Section */}
        <div className="px-6 py-4 border-b border-border/50 bg-background">
          {/* System Prompt */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1">
                <FileText className="h-3 w-3 text-primary" />
                System Prompt
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border border-border/50 min-h-[60px] max-h-[80px] overflow-auto transition-all duration-200 ease-in-out hover:bg-muted hover:border-border">
              <p className="text-xs text-foreground font-medium leading-tight whitespace-pre-wrap break-words">
                {data.config?.systemPrompt || 'You are a helpful assistant.'}
              </p>
            </div>
          </div>

          {/* Starting Message */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                <MessageSquare className="h-3 w-3" />
                Starting Message
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg border border-border/50 min-h-[40px] max-h-[60px] overflow-auto transition-colors">
              <p className="text-xs text-foreground font-medium leading-relaxed whitespace-pre-wrap break-words">
                {data.config?.startMessage || 'Hello! How can I help you today?'}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                <Info className="h-3 w-3" />
                Description
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg border border-border/50 min-h-[40px] max-h-[60px] overflow-auto transition-colors">
              <p className="text-xs text-foreground font-medium leading-relaxed whitespace-pre-wrap break-words">
                {data.config?.description || 'AI agent for task automation and assistance'}
              </p>
            </div>
          </div>
        </div>

        {/* Content with improved spacing */}
        <div className="p-5">
          {/* Model Provider Section */}
          <div className="mb-5">
            <h4 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
              Model Provider
            </h4>
            <div className="p-3 bg-muted rounded-lg border border-border/50 relative transition-colors hover:bg-muted/80 hover:border-border">
              <Handle
                type="target"
                position={Position.Left}
                id="llms"
                style={{
                  top: '50%',
                  left: -7,
                  background:
                    'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
                  width: 14,
                  height: 14,
                  border: '2px solid hsl(var(--background))',
                  borderRadius: '50%',
                  boxShadow: '0 2px 8px hsl(var(--primary) / 0.4)',
                  zIndex: 10,
                }}
              />
              {connectedNodesByHandle.llms?.length > 0 ? (
                <div>
                  {connectedNodesByHandle.llms.slice(0, 2).map((llmNode, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 ${index > 0 ? 'mt-3' : ''}`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-primary flex items-center justify-center shadow-md shadow-cyan-500/30">
                        <Brain className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {formattedProvider(llmNode.config?.provider || 'LLM Provider')}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {llmNode.config?.modelName || llmNode.label}
                        </p>
                      </div>
                    </div>
                  ))}
                  {connectedNodesByHandle.llms.length > 2 && (
                    <Badge
                      variant="outline"
                      className="mt-2 h-[22px] text-[0.7rem] font-semibold bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:scale-105 transition-all"
                    >
                      +{connectedNodesByHandle.llms.length - 2} more
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No model connected</p>
              )}
            </div>
          </div>
          {/* Knowledge Section */}
          <div className="mb-5">
            <h4 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
              Knowledge
            </h4>
            <div className="p-3 bg-muted rounded-lg border border-border/50 relative transition-colors hover:bg-muted/80 hover:border-border">
              <Handle
                type="target"
                position={Position.Left}
                id="knowledge"
                style={{
                  top: '50%',
                  left: -7,
                  background:
                    'linear-gradient(135deg, hsl(var(--warning)) 0%, hsl(25 95% 53%) 100%)',
                  width: 14,
                  height: 14,
                  border: '2px solid hsl(var(--background))',
                  borderRadius: '50%',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                  zIndex: 10,
                }}
              />
              {connectedNodesByHandle.knowledge?.length > 0 ? (
                <div>
                  {connectedNodesByHandle.knowledge.slice(0, 2).map((knowledgeNode, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 ${index > 0 ? 'mt-3' : ''}`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-warning to-amber-500 flex items-center justify-center shadow-md shadow-warning/30">
                        <Database className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {knowledgeNode.config?.kbName ||
                            knowledgeNode.config?.appName ||
                            knowledgeNode.label}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {knowledgeNode.type.startsWith('kb-')
                            ? 'Knowledge Base'
                            : knowledgeNode.type.startsWith('knowledge-hub')
                              ? 'Knowledge Hub'
                              : 'Knowledge'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {connectedNodesByHandle.knowledge.length > 2 && (
                    <Badge
                      variant="outline"
                      className="mt-2 h-[22px] text-[0.7rem] font-semibold bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:scale-105 transition-all"
                    >
                      +{connectedNodesByHandle.knowledge.length - 2} more
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No knowledge connected</p>
              )}
            </div>
          </div>
          {/* Actions/Tools Section */}
          <div className="mb-5">
            <h4 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
              Actions
            </h4>
            <div className="p-3 bg-muted rounded-lg border border-border/50 relative transition-colors hover:bg-muted/80 hover:border-border">
              <Handle
                type="target"
                position={Position.Left}
                id="actions"
                style={{
                  top: '50%',
                  left: -7,
                  background: 'linear-gradient(135deg, hsl(var(--info)) 0%, hsl(188 94% 43%) 100%)',
                  width: 14,
                  height: 14,
                  border: '2px solid hsl(var(--background))',
                  borderRadius: '50%',
                  boxShadow: '0 2px 8px rgba(6, 182, 212, 0.4)',
                  zIndex: 10,
                }}
              />
              {connectedNodesByHandle.actions?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {connectedNodesByHandle.actions.slice(0, 3).map((actionNode, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="h-6 text-[0.7rem] font-semibold bg-cyan-500/10 dark:bg-cyan-500/90 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500 hover:scale-105 transition-all px-2"
                    >
                      {actionNode.label.length > 12
                        ? `${actionNode.label.slice(0, 12)}...`
                        : actionNode.label}
                    </Badge>
                  ))}
                  {connectedNodesByHandle.actions.length > 3 && (
                    <Badge
                      variant="outline"
                      className="h-6 text-[0.7rem] font-semibold bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:scale-105 transition-all px-2"
                    >
                      +{connectedNodesByHandle.actions.length - 3}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No actions connected</p>
              )}
            </div>
          </div>
          {/* Input Section */}
          <div className="mb-5">
            <h4 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
              Input
            </h4>
            <div className="p-3 bg-muted rounded-lg border border-border/50 relative transition-colors hover:bg-muted/80 hover:border-border">
              <Handle
                type="target"
                position={Position.Left}
                id="input"
                style={{
                  top: '50%',
                  left: -7,
                  background:
                    'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270 91% 65%) 100%)',
                  width: 14,
                  height: 14,
                  border: '2px solid hsl(var(--background))',
                  borderRadius: '50%',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                  zIndex: 10,
                }}
              />
              {connectedNodesByHandle.input?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {connectedNodesByHandle.input.slice(0, 2).map((inputNode, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="h-6 text-[0.7rem] font-semibold bg-purple-500/10 dark:bg-purple-500/80 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 hover:border-purple-500 hover:scale-105 transition-all px-2"
                    >
                      {inputNode.label.length > 12
                        ? `${inputNode.label.slice(0, 12)}...`
                        : inputNode.label}
                    </Badge>
                  ))}
                  {connectedNodesByHandle.input.length > 2 && (
                    <Badge
                      variant="outline"
                      className="h-6 text-[0.7rem] font-semibold bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:scale-105 transition-all px-2"
                    >
                      +{connectedNodesByHandle.input.length - 2}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Receiving input</p>
              )}
            </div>
          </div>
          {/* Response Section */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
              Response
            </h4>
            <div className="p-3 bg-muted rounded-lg border border-border/50 relative transition-colors hover:bg-muted/80 hover:border-border">
              <Handle
                type="source"
                position={Position.Right}
                id="response"
                style={{
                  top: '50%',
                  right: -7,
                  background:
                    'linear-gradient(135deg, hsl(var(--success)) 0%, hsl(142 76% 36%) 100%)',
                  width: 14,
                  height: 14,
                  border: '2px solid hsl(var(--background))',
                  borderRadius: '50%',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  zIndex: 10,
                }}
              />
              <p className="text-sm text-muted-foreground italic">Agent response</p>
            </div>
          </div>
        </div>

        {/* Prompt Configuration Dialog with consistent styling */}
        <Dialog
          open={promptDialogOpen}
          onOpenChange={(isOpen) => !isOpen && handlePromptDialogCancel()}
        >
          <DialogContent className="max-w-2xl p-0">
            <DialogTitle className="flex items-center justify-between p-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="font-medium text-base m-0">Configure Agent Prompts</h3>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={handlePromptDialogCancel}
                className="h-8 w-8"
                aria-label="close"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogTitle>

            <div className="px-6 pt-6 pb-0">
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Define the agent&apos;s behavior and initial greeting message for users.
                </p>

                <div className="mb-6">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    System Prompt
                  </label>
                  <Textarea
                    rows={4}
                    value={systemPromptValue}
                    onChange={(e) => setSystemPromptValue(e.target.value)}
                    placeholder="Define the agent's role, capabilities, and behavior instructions..."
                    className="rounded-lg"
                  />
                </div>

                <div className="mb-6">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Description
                  </label>
                  <Textarea
                    rows={2}
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    placeholder="Enter a brief description for the agent's behavior..."
                    className="rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Starting Message
                  </label>
                  <Textarea
                    rows={2}
                    value={startMessageValue}
                    onChange={(e) => setStartMessageValue(e.target.value)}
                    placeholder="Enter the agent's greeting message to users..."
                    className="rounded-lg"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t border-border bg-muted/50">
              <Button variant="outline" onClick={handlePromptDialogCancel}>
                Cancel
              </Button>
              <Button onClick={handlePromptDialogSave}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Enhanced standard nodes - dynamic sizing based on type
  const getNodeDimensions = () => {
    if (data.type.startsWith('tool-group-')) {
      // Tool group nodes need more space for bundle info
      return { width: 320, minHeight: 190 };
    }
    if (data.type.startsWith('tool-')) {
      // Individual tools need space for descriptions
      return { width: 300, minHeight: 180 };
    }
    if (data.type.startsWith('app-')) {
      // App memory nodes need space for app info
      return { width: 300, minHeight: 175 };
    }
    if (data.type === 'kb-group') {
      // Knowledge base group nodes
      return { width: 310, minHeight: 185 };
    }
    if (data.type.startsWith('kb-')) {
      // Individual KB nodes need extra space
      return { width: 290, minHeight: 170 };
    }
    if (data.type.startsWith('llm-')) {
      // LLM nodes need space for model details
      return { width: 285, minHeight: 165 };
    }
    // Default size for other nodes
    return { width: 280, minHeight: 160 };
  };

  const { width, minHeight } = getNodeDimensions();

  return (
    <div
      className={cn(
        'relative w-[280px] min-h-[160px] rounded-3xl cursor-pointer',
        'transition-all duration-300 ease-in-out overflow-visible backdrop-blur-md',
        'hover:-translate-y-0.5 hover:shadow-lg',
        selected
          ? 'border-2 border-primary shadow-lg shadow-primary/10'
          : 'border border-border shadow-sm shadow-foreground/5'
      )}
      style={{ width, minHeight }}
      onClick={(e) => {
        // Prevent rapid clicks
        const now = Date.now();
        if (now - lastClickTime < 300) return;
        setLastClickTime(now);
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="p-5 border-b border-border/50 bg-gradient-to-br from-muted/80 to-background rounded-t-xl relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-primary flex items-center justify-center shadow-md shadow-cyan-500/30">
              {data.icon ? (
                <Wrench className="h-3.5 w-3.5 text-white" />
              ) : (
                <Wrench className="h-3.5 w-3.5 text-white" />
              )}
            </div>
            <h3 className="text-base font-bold text-foreground leading-tight tracking-tight">
              {normalizeDisplayName(data.label)}
            </h3>
          </div>
        </div>
        {data.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-2 font-medium break-words line-clamp-3">
            {data.description}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Tool Group Section for grouped tool nodes */}
        {data.type.startsWith('tool-group-') && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
              <Package className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              Tool Bundle
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border/50 transition-colors min-h-[45px] hover:bg-muted/80 hover:border-border">
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                {data.config?.appDisplayName || data.config?.appName || 'Tool Group'}
              </p>
              <p className="text-[0.65rem] text-muted-foreground font-medium mt-1">
                {data.config?.tools?.length || 0} tools available
              </p>
            </div>
          </div>
        )}

        {/* Actions Section for individual tools */}
        {data.type.startsWith('tool-') && !data.type.startsWith('tool-group-') && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
              <Cog className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              Tool Details
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border/50 transition-colors min-h-[45px] hover:bg-muted/80 hover:border-border">
              <p className="text-xs text-foreground font-semibold leading-relaxed break-words line-clamp-2">
                {normalizeDisplayName(data.label)}
              </p>
              {data.config?.appName && (
                <p className="text-[0.65rem] text-muted-foreground font-medium mt-1 capitalize">
                  {data.config.appName.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* App Memory Section for app memory nodes */}
        {data.type.startsWith('app-') && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
              <Cloud className="h-3 w-3 text-warning" />
              App
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border/50 transition-colors min-h-[45px] hover:bg-muted/80 hover:border-border">
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                {data.config?.appDisplayName || data.label}
              </p>
            </div>
          </div>
        )}

        {/* App Memory Group Section */}
        {data.type === 'app-group' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
              <Cloud className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              Apps
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border/50 transition-colors min-h-[45px] hover:bg-muted/80 hover:border-border">
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                Connected Applications
              </p>
              <p className="text-[0.65rem] text-muted-foreground font-medium mt-1">
                {data.config?.apps?.length || 0} apps available
              </p>
            </div>
          </div>
        )}

        {/* Knowledge Base Group Section */}
        {data.type === 'kb-group' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
              <Database className="h-3 w-3 text-warning" />
              Knowledge Base Group
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border/50 transition-colors min-h-[45px] hover:bg-muted/80 hover:border-border">
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                All Knowledge Bases
              </p>
              <p className="text-[0.65rem] text-muted-foreground font-medium mt-1">
                {data.config?.knowledgeBases?.length || 0} KBs available
              </p>
            </div>
          </div>
        )}

        {/* Memory/KB Section for individual memory nodes */}
        {data.type.startsWith('kb-') && !data.type.startsWith('kb-group') && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
              <Database className="h-3 w-3 text-warning" />
              Knowledge Base
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border/50 transition-colors min-h-[45px] hover:bg-muted/80 hover:border-border">
              <p className="text-xs text-foreground font-semibold leading-relaxed break-words line-clamp-2">
                {data.config?.kbName || data.config?.name || data.label}
              </p>
            </div>
          </div>
        )}

        {/* LLM Details for LLM nodes */}
        {data.type.startsWith('llm-') && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
              <Brain className="h-3 w-3 text-primary" />
              Model Details
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border/50 transition-colors min-h-[45px] hover:bg-muted/80 hover:border-border">
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                {formattedProvider(data.config?.provider || 'AI Provider')}
              </p>
            </div>
          </div>
        )}

        {/* Toolset Badge */}
        <div className="flex justify-end">
          <Badge
            variant="outline"
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500/10 to-primary/10 border-cyan-500/20 rounded-lg text-[0.7rem] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider transition-all hover:from-cyan-500/20 hover:to-primary/20 hover:border-cyan-500 hover:scale-105 hover:shadow-md hover:shadow-cyan-500/30"
          >
            Toolset
            <Settings className="h-3 w-3" />
          </Badge>
        </div>
      </div>

      {/* Enhanced Input Handles */}
      {data.inputs?.map((input, index) => (
        <Handle
          key={`input-${index}`}
          type="target"
          position={Position.Left}
          id={input}
          style={{
            top: `${45 + index * 25}%`,
            left: -7,
            background: 'linear-gradient(135deg, hsl(var(--info)) 0%, hsl(var(--primary)) 100%)',
            width: 14,
            height: 14,
            border: '2px solid hsl(var(--background))',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(6, 182, 212, 0.4)',
            zIndex: 10,
            transition: 'all 0.2s ease',
          }}
        />
      ))}

      {/* Enhanced Output Handles */}
      {data.outputs?.map((output, index) => (
        <Handle
          key={`output-${index}`}
          type="source"
          position={Position.Right}
          id={output}
          style={{
            top: `${45 + index * 25}%`,
            right: -7,
            background: 'linear-gradient(135deg, hsl(var(--success)) 0%, hsl(142 76% 36%) 100%)',
            width: 14,
            height: 14,
            border: '2px solid hsl(var(--background))',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
            zIndex: 10,
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  );
};

export default FlowNode;
