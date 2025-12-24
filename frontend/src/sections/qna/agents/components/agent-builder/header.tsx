import React, { useState } from 'react';
import { Home, Menu, Save, Share2, X, Sparkles, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/utils/cn';
import AgentPermissionsDialog from './agent-permissions-dialog';

import type { AgentBuilderHeaderProps } from '../../types/agent';

const AgentBuilderHeader: React.FC<AgentBuilderHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  agentName,
  setAgentName,
  saving,
  onSave,
  onClose,
  editingAgent,
  originalAgentName,
  templateDialogOpen,
  setTemplateDialogOpen,
  templatesLoading,
  agentId,
}) => {
  const [shareAgentDialogOpen, setShareAgentDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'px-2 sm:px-4 md:px-6 py-3 border-b border-border/10',
        'bg-background/80 backdrop-blur-xl',
        'flex items-center gap-2 sm:gap-3 md:gap-4',
        'flex-shrink-0 min-h-[56px] sm:min-h-[64px]',
        'sticky top-0 z-[1200] shadow-sm'
      )}
    >
      {/* Sidebar Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'h-8 w-8 sm:h-9 sm:w-9 rounded-lg',
              'border-border/20 bg-background/50',
              'hover:bg-primary/8 hover:border-primary/30 hover:text-primary',
              'transition-all duration-200'
            )}
          >
            <Menu className={cn('h-4 w-4 sm:h-5 sm:w-5')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Breadcrumbs - Hidden on mobile */}
      {!isMobile && (
        <nav className="ml-1 flex items-center gap-1 text-sm">
          <button
            onClick={onClose}
            className="flex items-center gap-1 font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Agents
          </button>
          <span className="text-muted-foreground mx-1">›</span>
          <div className="flex items-center gap-1 font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Flow Builder
          </div>
        </nav>
      )}

      {/* Mobile Status Indicator */}
      {isMobile && (
        <Badge variant="outline" className="h-6 text-xs font-semibold">
          {editingAgent ? 'Editing' : 'Creating'}
        </Badge>
      )}

      <div className="flex-1" />

      {/* Agent Name Input - Responsive width */}
      <div className="relative">
        <Input
          value={agentName || ''}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder={isMobile ? 'Agent name...' : 'Enter agent name...'}
          className={cn(
            'w-[150px] sm:w-[200px] md:w-[280px] lg:w-[320px]',
            'rounded-lg bg-background/60 backdrop-blur-sm',
            'border-border/15 hover:bg-background/80 hover:border-primary/30',
            'focus-visible:bg-background focus-visible:border-primary'
          )}
        />
      </div>

      <div className="flex-1" />

      {/* Action Buttons - Responsive layout */}
      <div className="flex items-center gap-2">
        {/* Template Button - Hidden on mobile */}
        {!isMobile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplateDialogOpen(true)}
                disabled={saving || templatesLoading}
                className={cn(
                  'h-9 px-3 md:px-4 rounded-lg text-[0.8125rem] font-medium',
                  'border-border/20 bg-background/50 text-muted-foreground',
                  'hover:bg-primary/8 hover:border-primary/30 hover:text-primary',
                  'transition-all duration-200'
                )}
              >
                {templatesLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {templatesLoading ? 'Loading...' : 'Template'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Use Template</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Share Button */}
        {editingAgent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareAgentDialogOpen(true)}
                disabled={saving || templatesLoading}
                className={cn(
                  'h-9 px-3 md:px-4 rounded-lg text-[0.8125rem] font-medium',
                  'border-border/20 bg-background/50 text-muted-foreground',
                  'hover:bg-primary/8 hover:border-primary/30 hover:text-primary',
                  'transition-all duration-200'
                )}
              >
                <Share2 className="h-4 w-4 mr-2" />
                {!isMobile && 'Share'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share Agent</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Main Action Buttons */}
        <div className="flex items-center">
          {/* Cancel/Close Button */}
          {editingAgent && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className={cn(
                'h-9 px-3 md:px-4 rounded-l-lg rounded-r-none text-[0.8125rem] font-medium',
                'border-r-0 bg-muted/50 text-muted-foreground',
                'hover:bg-destructive/10 hover:text-destructive',
                'transition-all duration-200'
              )}
            >
              <X className="h-3.5 w-3.5 mr-2" />
              {!isMobile && 'Cancel'}
            </Button>
          )}

          {/* Save/Update Button */}
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving || !agentName}
            className={cn(
              'h-9 px-3 md:px-6 rounded-r-lg text-[0.8125rem] font-semibold',
              editingAgent
                ? 'rounded-l-lg bg-warning hover:bg-warning/90'
                : 'bg-primary hover:bg-primary/90',
              'text-white shadow-md hover:shadow-lg',
              'disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none',
              'transition-all duration-200'
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isMobile
              ? saving
                ? '...'
                : editingAgent
                  ? 'Update'
                  : 'Save'
              : saving
                ? editingAgent
                  ? 'Updating...'
                  : 'Saving...'
                : editingAgent
                  ? 'Update Agent'
                  : 'Save Agent'}
          </Button>
        </div>
      </div>

      {/* Permissions Dialog */}
      <AgentPermissionsDialog
        open={shareAgentDialogOpen}
        onClose={() => setShareAgentDialogOpen(false)}
        agentId={agentId || ''}
        agentName={agentName}
      />
    </div>
  );
};

export default AgentBuilderHeader;
