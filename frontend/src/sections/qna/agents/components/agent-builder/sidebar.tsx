import { Icon } from '@iconify/react';
import React, { useMemo, useState } from 'react';
// Brand icons - keep from iconify
import jiraIcon from '@iconify-icons/logos/jira';
import notionIcon from '@iconify-icons/logos/notion';
import slackIcon from '@iconify-icons/logos/slack-icon';
import confluenceIcon from '@iconify-icons/logos/confluence';
import googleGmailIcon from '@iconify-icons/logos/google-gmail';
import googleDriveIcon from '@iconify-icons/logos/google-drive';
import googleDocsIcon from '@iconify-icons/logos/google';
import googleMeetIcon from '@iconify-icons/logos/google-meet';
import googleWorkspaceIcon from '@iconify-icons/logos/google-icon';
import googleCalendarIcon from '@iconify-icons/logos/google-calendar';
import microsoftOnedriveIcon from '@iconify-icons/logos/microsoft-onedrive';
// Lucide icons for UI elements
import {
  Send,
  Cpu,
  X,
  Reply,
  Mail,
  Equal,
  Upload,
  Github,
  Search,
  Calendar,
  Download,
  Divide,
  Bot,
  Cloud,
  Paperclip,
  MailOpen,
  Database,
  Calculator,
  Triangle,
  Package,
  Bug,
  GitPullRequest,
  Settings,
  Grid3x3,
  ChevronDown,
  SendHorizontal,
  Zap,
  ChevronRight,
  CalendarPlus,
  GitCommit,
  GitBranch,
  Clock,
  Pencil,
  Trash2,
  Folder,
  MessageSquare,
  User,
  Download as DownloadIcon,
  Hash,
  PlusCircle,
  FolderPlus,
  List as ListIcon,
  UserPlus,
  XCircle,
  MinusCircle,
  FileText,
  Share2,
  Folders,
  ArrowRightCircle,
  Files,
  ArrowLeftRight,
  Edit,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useIsMobile } from '@/hooks/use-mobile';

// Utility functions
import { normalizeDisplayName } from '../../utils/agent';
import { useConnectors } from '../../../../accountdetails/connectors/context';

interface NodeTemplate {
  type: string;
  label: string;
  description: string;
  icon: any;
  defaultConfig: Record<string, any>;
  inputs: string[];
  outputs: string[];
  category: 'inputs' | 'llm' | 'tools' | 'knowledge' | 'outputs' | 'agent';
}

interface FlowBuilderSidebarProps {
  sidebarOpen: boolean;
  nodeTemplates: NodeTemplate[];
  loading: boolean;
  sidebarWidth: number;
}

const FlowBuilderSidebar: React.FC<FlowBuilderSidebarProps> = ({
  sidebarOpen,
  nodeTemplates,
  loading,
  sidebarWidth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Input / Output': true,
    Agents: false,
    'LLM Models': false,
    Knowledge: false,
    Tools: true,
    'Vector Stores': false,
  });
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});

  // Get connector data from the hook
  const { activeConnectors } = useConnectors();
  const allConnectors = [...activeConnectors];

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return nodeTemplates;

    const query = searchQuery.toLowerCase();
    return nodeTemplates.filter(
      (template) =>
        template.label.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        (template.defaultConfig?.appName &&
          template.defaultConfig.appName.toLowerCase().includes(query))
    );
  }, [nodeTemplates, searchQuery]);

  // Normalize app names for better display
  const normalizeAppName = (appName: string): string => {
    const nameMap: Record<string, string> = {
      calculator: 'Calculator',
      gmail: 'Gmail',
      google_calendar: 'Google Calendar',
      google_drive: 'Google Drive',
      confluence: 'Confluence',
      github: 'GitHub',
      jira: 'Jira',
      slack: 'Slack',
      google_drive_enterprise: 'Google Drive Enterprise',
      calendar: 'Calendar',
    };

    return (
      nameMap[appName] ||
      appName
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  };

  // Get app-level tool nodes (tool-group-* nodes)
  const appToolNodes = useMemo(
    () =>
      filteredTemplates.filter((t) => t.category === 'tools' && t.type.startsWith('tool-group-')),
    [filteredTemplates]
  );

  // Group individual tools by app name for dropdown
  const groupedByApp = useMemo(() => {
    const individualTools = filteredTemplates.filter(
      (t) =>
        t.category === 'tools' && t.type.startsWith('tool-') && !t.type.startsWith('tool-group-')
    );
    const grouped: Record<string, NodeTemplate[]> = {};

    individualTools.forEach((template) => {
      const appName = template.defaultConfig?.appName || 'Other';
      const displayName = normalizeAppName(appName);

      if (!grouped[displayName]) {
        grouped[displayName] = [];
      }
      grouped[displayName].push(template);
    });

    return grouped;
  }, [filteredTemplates]);

  // Get memory-related nodes for Memory section
  const kbGroupNode = useMemo(
    () => filteredTemplates.find((t) => t.type === 'kb-group'),
    [filteredTemplates]
  );

  const appKnowledgeGroupNode = useMemo(
    () => filteredTemplates.find((t) => t.type === 'app-group'),
    [filteredTemplates]
  );

  const individualKBs = useMemo(
    () =>
      filteredTemplates.filter(
        (t) => t.category === 'knowledge' && t.type.startsWith('kb-') && t.type !== 'kb-group'
      ),
    [filteredTemplates]
  );

  const individualAppKnowledge = useMemo(
    () =>
      filteredTemplates.filter(
        (t) => t.category === 'knowledge' && t.type.startsWith('app-') && t.type !== 'app-group'
      ),
    [filteredTemplates]
  );

  const handleCategoryToggle = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const handleAppToggle = (appName: string) => {
    setExpandedApps((prev) => ({
      ...prev,
      [appName]: !prev[appName],
    }));
  };

  // Unified component rendering for consistency
  const renderDraggableItem = (
    template: NodeTemplate,
    isSubItem = false,
    sectionType?: 'tools' | 'apps' | 'kbs'
  ) => {
    // Get the appropriate icon based on the item type
    let itemIcon = template.icon;
    let isDynamicIcon = false;

    if (sectionType === 'apps' && template.defaultConfig?.appName) {
      const appIcon = getAppKnowledgeIcon(template.defaultConfig.appName);
      if (appIcon === 'dynamic-icon') {
        isDynamicIcon = true;
        // Find the connector for dynamic icon
        const connector = allConnectors.find(
          (c) =>
            c.name.toUpperCase() === template.defaultConfig.appName.toUpperCase() ||
            c.name === template.defaultConfig.appName
        );
        itemIcon = connector?.iconPath || '/assets/icons/connectors/default.svg';
      } else {
        if (
          typeof appIcon === 'string' ||
          appIcon.toString().includes('/assets/icons/connectors/')
        ) {
          isDynamicIcon = true;
        }
        itemIcon = appIcon;
      }
    } else if (sectionType === 'tools' && template.defaultConfig?.appName) {
      itemIcon = getToolIcon(template.type, template.defaultConfig.appName);
    }

    // Generic string-path icon support
    if (!isDynamicIcon && typeof itemIcon === 'string') {
      isDynamicIcon = true;
    }

    return (
      <div
        key={template.type}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('application/reactflow', template.type);
        }}
        className={cn(
          'py-1.5 px-4 cursor-grab rounded-md mx-1 my-0.5 transition-colors',
          isSubItem
            ? 'pl-11 ml-3 border border-border/30 bg-background/80'
            : 'border border-border/50',
          sectionType === 'apps' && 'hover:bg-primary/5 hover:border-primary/20',
          sectionType === 'kbs' && 'hover:bg-warning/5 hover:border-warning/20',
          !sectionType && 'hover:bg-primary/5 hover:border-primary/20',
          'active:cursor-grabbing'
        )}
      >
        <div className="flex items-center gap-3 w-full">
          {isDynamicIcon ? (
            <img
              src={itemIcon}
              alt={template.label}
              className={cn('object-contain', isSubItem ? 'w-4 h-4' : 'w-4.5 h-4.5')}
              onError={(e) => {
                e.currentTarget.src = '/assets/icons/connectors/default.svg';
              }}
            />
          ) : (
            <Icon
              icon={itemIcon}
              className={cn('text-muted-foreground/70', isSubItem ? 'w-4 h-4' : 'w-4.5 h-4.5')}
            />
          )}
          <span
            className={cn(
              'flex-1 leading-relaxed text-foreground font-normal',
              isSubItem ? 'text-[0.85rem]' : 'text-sm'
            )}
          >
            {normalizeDisplayName(template.label)}
          </span>
        </div>
      </div>
    );
  };

  const renderExpandableGroup = (
    groupLabel: string,
    groupIcon: any,
    itemCount: number,
    isExpanded: boolean,
    onToggle: () => void,
    dragType?: string
  ) => (
    <div
      draggable={!!dragType}
      onDragStart={
        dragType
          ? (event) => {
              event.dataTransfer.setData('application/reactflow', dragType);
            }
          : undefined
      }
      onClick={onToggle}
      className={cn(
        'py-2 px-4 pl-6 rounded-xl mx-2 mb-1 border border-border/50 transition-colors',
        dragType ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        'hover:bg-muted/50 hover:border-border'
      )}
    >
      <div className="flex items-center gap-3 w-full">
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {typeof groupIcon === 'string' &&
        groupIcon.toString().includes('assets/icons/connectors/') ? (
          <img
            src={groupIcon}
            alt={groupLabel}
            className="w-4.5 h-4.5 object-contain"
            onError={(e) => {
              e.currentTarget.src = '/assets/icons/connectors/default.svg';
            }}
          />
        ) : (
          <Icon icon={groupIcon} className="w-4.5 h-4.5 text-muted-foreground" />
        )}
        <span className="flex-1 text-sm text-foreground font-medium">{groupLabel}</span>
        <Badge variant="outline" className="text-[0.7rem] font-medium px-1.5 py-0.5 h-5">
          {itemCount}
        </Badge>
      </div>
    </div>
  );

  const renderDropdownContent = (items: NodeTemplate[], sectionType?: 'tools' | 'apps' | 'kbs') => (
    <div className="relative pl-8 before:content-[''] before:absolute before:left-8 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary/20 before:rounded-sm">
      <div className="py-1 space-y-0.5">
        {items.map((item) => renderDraggableItem(item, true, sectionType))}
      </div>
    </div>
  );

  const categoryConfig = [
    {
      name: 'Input / Output',
      icon: ArrowLeftRight,
      categories: ['inputs', 'outputs'],
    },
    {
      name: 'Agents',
      icon: Bot,
      categories: ['agent'],
    },
    {
      name: 'LLM Models',
      icon: Cpu,
      categories: ['llm'],
    },
    {
      name: 'Knowledge',
      icon: Database,
      categories: ['knowledge'],
    },
    {
      name: 'Tools',
      icon: Zap,
      categories: ['tools'],
    },
    {
      name: 'Vector Stores',
      icon: Triangle,
      categories: ['vector'],
    },
  ];

  const getAppIcon = (appName: string) => {
    const iconMap: Record<string, any> = {
      Calculator: Calculator,
      Gmail: googleGmailIcon,
      'Google Calendar': googleCalendarIcon,
      'Google Drive': googleDriveIcon,
      Confluence: confluenceIcon,
      GitHub: Github,
      Jira: jiraIcon,
      Slack: slackIcon,
      'Google Drive Enterprise': googleDriveIcon,
      Calendar: Calendar,
      Drive: googleDriveIcon,
      Docs: googleDocsIcon,
      Meet: googleMeetIcon,
      Notion: '/assets/icons/platforms/ic-notion.svg',
      Onedrive: '/assets/icons/platforms/ic-onedrive.svg',
      Sharepointonline: '/assets/icons/platforms/ic-sharepoint.svg',
      Outlook: '/assets/icons/platforms/ic-outlook.svg',
      Discord: '/assets/icons/connectors/discord.svg',
      Linear: '/assets/icons/connectors/linear.svg',
      LinkedIn: '/assets/icons/connectors/linkedin.svg',
      Dropbox: '/assets/icons/platforms/ic-dropbox.svg',
      Freshdesk: '/assets/icons/connectors/freshdesk.svg',
      Zendesk: '/assets/icons/connectors/zendesk.svg',
      Posthog: '/assets/icons/connectors/posthog.svg',
      Box: '/assets/icons/connectors/box.svg',
      Bookstack: '/assets/icons/connectors/bookstack.svg',
      Azureblob: '/assets/icons/connectors/azureblob.svg',
      Airtable: '/assets/icons/connectors/airtable.svg',
      Evernote: '/assets/icons/connectors/evernote.svg',
      S3: '/assets/icons/connectors/s3.svg',
      Github: '/assets/icons/connectors/github.svg',
      Gitlab: '/assets/icons/connectors/gitlab.svg',
    };
    return iconMap[appName] || Grid3x3;
  };

  const getAppKnowledgeIcon = (appName: string) => {
    // First try to find the connector in our dynamic data
    const connector = allConnectors.find(
      (c) => c.name.toUpperCase() === appName.toUpperCase() || c.name === appName
    );

    if (connector && connector.iconPath) {
      // Return a placeholder that will be replaced with img tag in renderDraggableItem
      return 'dynamic-icon';
    }

    // Fallback to hardcoded icons for backward compatibility
    const iconMap: Record<string, any> = {
      SLACK: slackIcon,
      GMAIL: googleGmailIcon,
      GOOGLE_DRIVE: googleDriveIcon,
      GOOGLE_WORKSPACE: googleWorkspaceIcon,
      ONEDRIVE: microsoftOnedriveIcon,
      JIRA: jiraIcon,
      CONFLUENCE: confluenceIcon,
      GITHUB: Github,
      Slack: slackIcon,
      Gmail: googleGmailIcon,
      OneDrive: '/assets/icons/platforms/ic-onedrive.svg',
      Jira: jiraIcon,
      Confluence: confluenceIcon,
      GitHub: Github,
      Calculator: Calculator,
      'Google Drive': googleDriveIcon,
      'Google Workspace': googleWorkspaceIcon,
      Calendar: Calendar,
      Drive: googleDriveIcon,
      Docs: googleDocsIcon,
      Meet: googleMeetIcon,
      Notion: notionIcon,
      Onedrive: '/assets/icons/platforms/ic-onedrive.svg',
      Sharepoint: '/assets/icons/platforms/ic-sharepoint.svg',
      Outlook: '/assets/icons/platforms/ic-outlook.svg',
    };

    return iconMap[appName] || Cloud;
  };

  const getToolIcon = (toolType: string, appName: string) => {
    // Normalize toolType to handle both dot notation and underscore notation
    const normalizedType = toolType.toLowerCase();

    // Gmail specific icons
    if (appName === 'Gmail') {
      if (normalizedType.includes('reply')) return Reply;
      if (normalizedType.includes('send')) return Send;
      if (normalizedType.includes('draft')) return Edit;
      if (normalizedType.includes('search')) return Search;
      if (normalizedType.includes('details') || normalizedType.includes('get')) return MailOpen;
      if (normalizedType.includes('attachment')) return Paperclip;
      if (normalizedType.includes('compose')) return Edit;
      return Mail;
    }

    // Google Calendar specific icons
    if (appName === 'Google Calendar') {
      if (normalizedType.includes('create') || normalizedType.includes('add')) return CalendarPlus;
      if (normalizedType.includes('update') || normalizedType.includes('edit')) return Calendar;
      if (normalizedType.includes('delete') || normalizedType.includes('remove')) return X;
      if (normalizedType.includes('get') || normalizedType.includes('list')) return Calendar;
      if (normalizedType.includes('event')) return Clock;
      return Calendar;
    }

    // Jira specific icons
    if (appName === 'Jira') {
      if (normalizedType.includes('create')) return PlusCircle;
      if (normalizedType.includes('update') || normalizedType.includes('edit')) return Pencil;
      if (normalizedType.includes('delete')) return Trash2;
      if (normalizedType.includes('search')) return Search;
      if (normalizedType.includes('comment')) return MessageSquare;
      if (normalizedType.includes('assign')) return UserPlus;
      if (normalizedType.includes('transition')) return ArrowRightCircle;
      if (normalizedType.includes('issue')) return Bug;
      return jiraIcon;
    }

    // Slack specific icons
    if (appName === 'Slack') {
      if (normalizedType.includes('send') || normalizedType.includes('message'))
        return SendHorizontal;
      if (normalizedType.includes('channel')) return Hash;
      if (normalizedType.includes('search')) return Search;
      if (normalizedType.includes('user') || normalizedType.includes('info')) return User;
      if (normalizedType.includes('create')) return PlusCircle;
      return slackIcon;
    }

    // GitHub specific icons
    if (appName === 'GitHub') {
      if (normalizedType.includes('repo') || normalizedType.includes('repository')) return Folder;
      if (normalizedType.includes('issue')) return Bug;
      if (normalizedType.includes('pull') || normalizedType.includes('pr')) return GitPullRequest;
      if (normalizedType.includes('commit')) return GitCommit;
      if (normalizedType.includes('branch')) return GitBranch;
      if (normalizedType.includes('create')) return PlusCircle;
      if (normalizedType.includes('search')) return Search;
      return Github;
    }

    // Google Drive specific icons
    if (appName.includes('Google Drive')) {
      if (normalizedType.includes('upload')) return Upload;
      if (normalizedType.includes('download')) return Download;
      if (normalizedType.includes('create') && normalizedType.includes('folder')) return FolderPlus;
      if (normalizedType.includes('delete')) return Trash2;
      if (normalizedType.includes('list') || normalizedType.includes('get')) return Files;
      if (normalizedType.includes('share')) return Share2;
      if (normalizedType.includes('folder')) return Folder;
      return googleDriveIcon;
    }

    // Confluence specific icons
    if (appName === 'Confluence') {
      if (normalizedType.includes('create') || normalizedType.includes('add')) return PlusCircle;
      if (normalizedType.includes('update') || normalizedType.includes('edit')) return Pencil;
      if (normalizedType.includes('delete')) return Trash2;
      if (normalizedType.includes('search')) return Search;
      if (normalizedType.includes('page')) return FileText;
      if (normalizedType.includes('space')) return Folders;
      return confluenceIcon;
    }

    // Calculator specific icons
    if (appName === 'Calculator') {
      if (normalizedType.includes('add') || normalizedType.includes('plus')) return PlusCircle;
      if (normalizedType.includes('subtract') || normalizedType.includes('minus'))
        return MinusCircle;
      if (normalizedType.includes('multiply') || normalizedType.includes('times')) return XCircle;
      if (normalizedType.includes('divide')) return Divide;
      if (normalizedType.includes('calculate')) return Equal;
      return Calculator;
    }

    // Default icons based on common actions
    if (normalizedType.includes('send')) return Send;
    if (normalizedType.includes('create') || normalizedType.includes('add')) return PlusCircle;
    if (normalizedType.includes('update') || normalizedType.includes('edit')) return Pencil;
    if (normalizedType.includes('delete') || normalizedType.includes('remove')) return Trash2;
    if (normalizedType.includes('search') || normalizedType.includes('find')) return Search;
    if (normalizedType.includes('get') || normalizedType.includes('fetch')) return DownloadIcon;
    if (normalizedType.includes('list') || normalizedType.includes('all')) return ListIcon;

    // Default fallback
    return Settings;
  };

  const isMobile = useIsMobile();

  // Sidebar content component (reusable for both desktop and mobile)
  const SidebarContentInner = () => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 flex items-center justify-center">
            <Package className="w-5 h-5 text-foreground" />
          </div>
          <h2 className="font-semibold text-base text-foreground flex-1">Components</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-9 h-9 rounded-xl',
              'bg-muted/50 border-border',
              'hover:bg-muted/80 hover:border-border/80',
              'focus-visible:bg-background focus-visible:border-border',
              'text-sm text-foreground placeholder:text-muted-foreground/70'
            )}
          />
          {searchQuery && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-[0.7rem] text-muted-foreground/80">/{searchQuery}</p>
        )}
      </div>

      {/* Sidebar Content */}
      <div className="overflow-auto h-[calc(100%-140px)] min-h-0 overflow-x-hidden">
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div>
            {/* Main Categories */}
            {categoryConfig.map((config) => {
              let categoryTemplates = filteredTemplates.filter((t) =>
                config.categories.includes(t.category)
              );

              // For Tools category, only show app-level tool groups
              if (config.name === 'Tools') {
                categoryTemplates = appToolNodes;
              }

              const isExpanded = expandedCategories[config.name];
              const hasItems = categoryTemplates.length > 0;
              const IconComponent = config.icon;

              return (
                <div key={config.name}>
                  <button
                    onClick={() => handleCategoryToggle(config.name)}
                    className="w-full py-2 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 w-full">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <IconComponent className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-sm text-foreground font-medium text-left">
                        {config.name}
                      </span>
                    </div>
                  </button>

                  <Collapsible open={isExpanded}>
                    <CollapsibleContent>
                      {config.name === 'Tools' ? (
                        <div className="pl-0">
                          {Object.entries(groupedByApp).map(([appName, tools]) => {
                            const isAppExpanded = expandedApps[appName];
                            const appGroup = appToolNodes.find(
                              (node) => node.defaultConfig?.appDisplayName === appName
                            );

                            return (
                              <div key={appName}>
                                {renderExpandableGroup(
                                  appName,
                                  getAppIcon(appName),
                                  tools.length,
                                  isAppExpanded,
                                  () => handleAppToggle(appName),
                                  appGroup?.type
                                )}
                                <Collapsible open={isAppExpanded}>
                                  <CollapsibleContent>
                                    {renderDropdownContent(tools, 'tools')}
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            );
                          })}
                        </div>
                      ) : config.name === 'LLM Models' ? (
                        <div className="py-0 space-y-0.5">
                          {categoryTemplates.map((template) => renderDraggableItem(template))}
                        </div>
                      ) : config.name === 'Knowledge' ? (
                        <div className="pl-0">
                          {/* App Memory group with dropdown */}
                          {appKnowledgeGroupNode && (
                            <>
                              {renderExpandableGroup(
                                appKnowledgeGroupNode.label,
                                appKnowledgeGroupNode.icon,
                                individualAppKnowledge.length,
                                expandedApps.app,
                                () => handleAppToggle('app'),
                                appKnowledgeGroupNode.type
                              )}
                              <Collapsible open={expandedApps.app}>
                                <CollapsibleContent>
                                  {renderDropdownContent(individualAppKnowledge, 'apps')}
                                </CollapsibleContent>
                              </Collapsible>
                            </>
                          )}

                          {/* Knowledge Bases group with dropdown */}
                          {kbGroupNode && (
                            <>
                              {renderExpandableGroup(
                                kbGroupNode.label,
                                kbGroupNode.icon,
                                individualKBs.length,
                                expandedApps['knowledge-bases'],
                                () => handleAppToggle('knowledge-bases'),
                                kbGroupNode.type
                              )}
                              <Collapsible open={expandedApps['knowledge-bases']}>
                                <CollapsibleContent>
                                  {renderDropdownContent(individualKBs, 'kbs')}
                                </CollapsibleContent>
                              </Collapsible>
                            </>
                          )}

                          {/* Other memory components that aren't apps or KBs */}
                          {categoryTemplates
                            .filter((t) => !t.type.startsWith('kb-') && !t.type.startsWith('app-'))
                            .map((template) => renderDraggableItem(template))}
                        </div>
                      ) : hasItems ? (
                        <div className="py-0 space-y-0.5">
                          {categoryTemplates.map((template) => renderDraggableItem(template))}
                        </div>
                      ) : (
                        <div className="pl-8 py-2">
                          <p className="text-[0.75rem] text-muted-foreground/60 italic">
                            No components available
                          </p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // Mobile: Use Sheet component
  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={() => {}}>
        <SheetContent
          side="left"
          className={cn(
            'w-full sm:w-[400px] p-0 flex flex-col overflow-hidden',
            'bg-background border-r border-border'
          )}
          style={{ width: sidebarWidth }}
        >
          <div className="w-full h-full flex flex-col overflow-hidden">
            <SidebarContentInner />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use regular sidebar (part of layout)
  return (
    <div
      className={cn(
        'flex-shrink-0 relative h-full overflow-x-hidden transition-all duration-300',
        sidebarOpen ? 'w-full' : 'w-0'
      )}
    >
      <div className="w-full h-full border-r border-border bg-background relative overflow-hidden flex flex-col">
        <SidebarContentInner />
      </div>
    </div>
  );
};

export default FlowBuilderSidebar;
