// Enhanced AgentsManagement component with template edit/delete management
import type { Agent, AgentTemplate, AgentFilterOptions } from 'src/types/agent';

import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  X,
  Plus,
  Search,
  Pencil,
  Trash2,
  Database,
  Sparkles,
  ShieldCheck,
  MoreVertical,
  FolderKanban,
  MessageCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/drop-down-menu';

import { paths } from 'src/routes/paths';

import AgentApiService from './services/api';
import TemplateBuilder from './components/template-builder';
import TemplateSelector from './components/template-selector';
import { sortAgents, filterAgents, formatTimestamp } from './utils/agent';
import AgentPermissionsDialog from './components/agent-builder/agent-permissions-dialog';

interface AgentsManagementProps {
  onAgentSelect?: (agent: Agent) => void;
}

const AgentsManagement: React.FC<AgentsManagementProps> = ({ onAgentSelect }) => {
  const navigate = useNavigate();

  // State management
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog states
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AgentTemplate | null>(null);

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  // Delete confirmation dialogs
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; agent: Agent | null }>({
    open: false,
    agent: null,
  });

  const [deleteTemplateDialog, setDeleteTemplateDialog] = useState<{
    open: boolean;
    template: AgentTemplate | null;
  }>({
    open: false,
    template: null,
  });

  // Permissions dialog state
  const [permissionsDialog, setPermissionsDialog] = useState<{ open: boolean; agent: Agent | null }>({
    open: false,
    agent: null,
  });

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await AgentApiService.getAgents();
      setAgents(response || []);
      setError(null);
    } catch (err) {
      setError('Failed to load agents');
      console.error('Error loading agents:', err);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await AgentApiService.getTemplates();
      setTemplates(response || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setTemplates([]);
    }
  }, []);

  // Load data
  useEffect(() => {
    loadAgents();
    loadTemplates();
  }, [loadAgents, loadTemplates]);

  // Filter and sort agents with safe array handling
  const filteredAndSortedAgents = useMemo(() => {
    if (!Array.isArray(agents)) {
      return [];
    }

    const filters: AgentFilterOptions = {
      searchQuery,
      tags: selectedTags,
    };

    const filtered = filterAgents(agents, filters);
    return sortAgents(filtered, sortBy, sortOrder);
  }, [agents, searchQuery, selectedTags, sortBy, sortOrder]);

  // Get all available tags with safe array handling
  const availableTags = useMemo(() => {
    if (!Array.isArray(agents)) {
      return [];
    }

    const tags = new Set<string>();
    agents.forEach((agent) => {
      if (Array.isArray(agent.tags)) {
        agent.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [agents]);

  // Agent Event handlers
  const handleCreateAgent = useCallback(async (agent: Agent) => {
    setAgents((prev) => (Array.isArray(prev) ? [agent, ...prev] : [agent]));
    setSelectedTemplate(null);
  }, []);

  const handleEditAgent = useCallback(
    (agent: Agent) => {
      navigate(paths.dashboard.agent.edit(agent._key));
    },
    [navigate]
  );

  const handleDeleteAgent = useCallback(async (agent: Agent) => {
    try {
      await AgentApiService.deleteAgent(agent._key);
      setAgents((prev) => (Array.isArray(prev) ? prev.filter((a) => a._key !== agent._key) : []));
      setDeleteDialog({ open: false, agent: null });
    } catch (err) {
      setError('Failed to delete agent');
      console.error('Error deleting agent:', err);
    }
  }, []);

  const handleChatWithAgent = useCallback(
    (agent: Agent) => {
      navigate(`/agents/${agent._key}`);
    },
    [navigate]
  );

  // Template Event handlers
  const handleCreateTemplate = useCallback(async (template: AgentTemplate) => {
    setTemplates((prev) => (Array.isArray(prev) ? [template, ...prev] : [template]));
    setShowTemplateBuilder(false);
    setEditingTemplate(null);
  }, []);

  const handleEditTemplate = useCallback((template: AgentTemplate) => {
    setEditingTemplate(template);
    setShowTemplateBuilder(true);
    setShowTemplateSelector(false);
  }, []);

  const handleDeleteTemplate = useCallback((template: AgentTemplate) => {
    setDeleteTemplateDialog({ open: true, template });
    setShowTemplateSelector(false);
  }, []);

  const confirmDeleteTemplate = useCallback(async (template: AgentTemplate) => {
    try {
      await AgentApiService.deleteTemplate(template._key);
      setTemplates((prev) =>
        Array.isArray(prev) ? prev.filter((t) => t._key !== template._key) : []
      );
      setDeleteTemplateDialog({ open: false, template: null });
    } catch (err) {
      setError('Failed to delete template');
      console.error('Error deleting template:', err);
    }
  }, []);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>, agent: Agent) => {
    setAnchorEl(event.currentTarget);
    setActiveAgent(agent);
  }, []);

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActiveAgent(null);
  };

  const handleOpenPermissions = useCallback((agent: Agent) => {
    setPermissionsDialog({ open: true, agent });
    handleMenuClose();
  }, []);

  const handleTemplateSelect = useCallback(
    (template: AgentTemplate) => {
      setSelectedTemplate(template);
      setShowTemplateSelector(false);
      navigate(paths.dashboard.agent.new);
    },
    [navigate]
  );

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
  }, []);

  const renderAgentCard = useCallback(
    (agent: Agent) => {
      if (!agent || !agent._key) {
        return null;
      }

      return (
        <Card
          key={agent._key}
          className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border/60 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-sm font-semibold">
                {agent.name || 'Unnamed Agent'}
              </CardTitle>
              <CardDescription className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {formatTimestamp(agent.updatedAtTimestamp || new Date().toISOString())}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 p-4">
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {agent.description || 'No description available'}
            </p>

            {Array.isArray(agent.tags) && agent.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {agent.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-border/60 px-1.5 py-0 text-[10px] font-medium"
                  >
                    {tag}
                  </Badge>
                ))}
                {agent.tags.length > 3 && (
                  <Badge
                    variant="outline"
                    className="border-dashed border-border/60 px-1.5 py-0 text-[10px] text-muted-foreground"
                  >
                    +{agent.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 gap-1 rounded-lg border-primary/40 text-xs font-medium text-primary"
                onClick={() => handleChatWithAgent(agent)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 gap-1 rounded-lg border-border/60 text-xs font-medium"
                onClick={() => handleEditAgent(agent)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground"
                    aria-label="More agent actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/60">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Agent actions
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleEditAgent(agent)}
                    className="cursor-pointer text-xs"
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit Agent
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleChatWithAgent(agent)}
                    className="cursor-pointer text-xs"
                  >
                    <MessageCircle className="mr-2 h-3.5 w-3.5" />
                    Start Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenPermissions(agent)}
                    className="cursor-pointer text-xs"
                  >
                    <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                    Permissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteDialog({ open: true, agent })}
                    className="cursor-pointer text-xs text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      );
    },
    [handleChatWithAgent, handleEditAgent, handleOpenPermissions]
  );

  return (
    <section className="flex h-[calc(100vh-4rem)] flex-col rounded-2xl border border-border/60 bg-card shadow-sm">
      <header className="border-b border-border/60 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <FolderKanban className="h-4 w-4" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Agent Repository
              </h1>
            </div>
            <p className="ml-10 text-sm text-muted-foreground">
              Manage and deploy your AI agents
              {Array.isArray(agents) && agents.length > 0 && (
                <span className="ml-1">
                  • {agents.length} agent{agents.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="w-full max-w-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="h-9 pl-8 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search agents"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-2.5 inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {Array.isArray(filteredAndSortedAgents) ? filteredAndSortedAgents.length : 0} of{' '}
                  {Array.isArray(agents) ? agents.length : 0} results
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 rounded-lg text-xs"
                onClick={() => setShowTemplateBuilder(true)}
              >
                <Database className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Template</span>
              </Button>
              <Button
                size="sm"
                className="gap-1 rounded-lg text-xs"
                onClick={() => navigate(paths.dashboard.agent.new)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Agent</span>
              </Button>
            </div>
          </div>
        </div>

        {Array.isArray(availableTags) && availableTags.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px]',
                      active
                        ? 'border-secondary bg-secondary text-secondary-foreground'
                        : 'border-border/70 bg-background text-muted-foreground hover:border-secondary/60'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
            {error && (
              <Alert variant="destructive" className="rounded-2xl border-destructive/40">
                <AlertTitle>Unable to load agents</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {Array.isArray(filteredAndSortedAgents) ? filteredAndSortedAgents.length : 0} agent
                {(Array.isArray(filteredAndSortedAgents) ? filteredAndSortedAgents.length : 0) !==
                1
                  ? 's'
                  : ''}{' '}
                found
              </span>
              {(searchQuery || selectedTags.length > 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground"
                  onClick={handleClearSearch}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-40 rounded-2xl border border-border/60 bg-muted/40 p-4 animate-pulse"
                  >
                    <div className="mb-3 h-4 w-32 rounded-md bg-muted/80" />
                    <div className="mb-2 h-3 w-40 rounded-md bg-muted/60" />
                    <div className="mb-2 h-3 w-28 rounded-md bg-muted/60" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-6 w-16 rounded-full bg-muted/70" />
                      <div className="h-6 w-12 rounded-full bg-muted/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !Array.isArray(filteredAndSortedAgents) ||
              filteredAndSortedAgents.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 p-10 text-center text-muted-foreground">
                <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
                <h2 className="mb-1 text-lg font-medium text-foreground">
                  {searchQuery || selectedTags.length > 0
                    ? 'No agents found'
                    : 'No agents in repository'}
                </h2>
                <p className="mb-4 text-sm">
                  {searchQuery || selectedTags.length > 0
                    ? 'Try adjusting your search criteria or filters.'
                    : 'Create your first AI agent to get started with automation.'}
                </p>
                {!searchQuery && !selectedTags.length && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1 rounded-lg"
                    onClick={() => navigate(paths.dashboard.agent.new)}
                  >
                    <Plus className="h-4 w-4" />
                    Create New Agent
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedAgents.map(renderAgentCard).filter(Boolean)}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({
            open,
            agent: open ? prev.agent : null,
          }))
        }
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                &quot;{deleteDialog.agent?.name}&quot;
              </span>
              ? This action cannot be undone and will remove all associated conversations and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => setDeleteDialog({ open: false, agent: null })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-lg"
              onClick={() => deleteDialog.agent && handleDeleteAgent(deleteDialog.agent)}
            >
              Delete Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTemplateDialog.open}
        onOpenChange={(open) =>
          setDeleteTemplateDialog((prev) => ({
            open,
            template: open ? prev.template : null,
          }))
        }
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete template{' '}
              <span className="font-semibold text-foreground">
                &quot;{deleteTemplateDialog.template?.name}&quot;
              </span>
              ? This action cannot be undone and will remove the template permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => setDeleteTemplateDialog({ open: false, template: null })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-lg"
              onClick={() =>
                deleteTemplateDialog.template &&
                confirmDeleteTemplate(deleteTemplateDialog.template)
              }
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateBuilder
        open={showTemplateBuilder}
        onClose={() => {
          setShowTemplateBuilder(false);
          setEditingTemplate(null);
        }}
        onSuccess={handleCreateTemplate}
        editingTemplate={editingTemplate}
      />

      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
        onEdit={handleEditTemplate}
        onDelete={handleDeleteTemplate}
        templates={Array.isArray(templates) ? templates : []}
      />

      <AgentPermissionsDialog
        open={permissionsDialog.open}
        onClose={() => setPermissionsDialog({ open: false, agent: null })}
        agentId={permissionsDialog.agent?._key || ''}
        agentName={permissionsDialog.agent?.name || ''}
      />
    </section>
  );
};

export default AgentsManagement;
