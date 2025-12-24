import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/cn';
import type { Connector } from '../types/types';

interface AddIntegrationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allConnectors: Connector[];
}

// Connectors to exclude from selection (handled by Drive connector or not implemented)
const EXCLUDED_CONNECTORS = ['Docs', 'Forms', 'Meet', 'Slides', 'Sheets'];

// Simple category definitions
const CATEGORIES = [
    { id: 'all', name: 'All' },
    { id: 'productivity', name: 'Productivity' },
    { id: 'communication', name: 'Communication' },
    { id: 'storage', name: 'Storage' },
    { id: 'development', name: 'Development' },
    { id: 'documentation', name: 'Documentation' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

// Groups that should be clustered (shown with collapsible header)
const CLUSTERED_GROUPS = ['Google Workspace', 'Microsoft', 'Atlassian'];

// App group display order and icons (only for clustered groups)
const APP_GROUP_CONFIG: Record<string, { order: number; icon: string; displayName: string }> = {
    'Google Workspace': { order: 1, icon: '/assets/icons/connectors/google.svg', displayName: 'Google Workspace' },
    'Microsoft': { order: 2, icon: '/assets/icons/platforms/ic-m365.svg', displayName: 'Microsoft 365' },
    'Atlassian': { order: 3, icon: '/assets/icons/connectors/atlassian.svg', displayName: 'Atlassian' },
};

// Get normalized app group for a connector
const getNormalizedAppGroup = (connector: Connector): string => {
    const group = connector.appGroup || 'Other';
    // Normalize Microsoft groups
    if (group.toLowerCase().includes('microsoft') || 
        ['OneDrive', 'SharePoint', 'Outlook', 'Teams'].some(m => connector.name.includes(m))) {
        return 'Microsoft';
    }
    return group;
};

// Check if a connector belongs to a clustered group
const isClusteredConnector = (connector: Connector): boolean => {
    const group = getNormalizedAppGroup(connector);
    return CLUSTERED_GROUPS.includes(group);
};

// Map connector to category
const getConnectorCategory = (connector: Connector): CategoryId => {
    const name = connector.name.toLowerCase();
    const categories = connector.appCategories?.map(c => c.toLowerCase()) || [];

    // Storage
    if (name.includes('drive') || name.includes('dropbox') || name.includes('onedrive') ||
        name.includes('sharepoint') || name.includes('box') || name.includes('s3') ||
        name.includes('samba') || categories.includes('storage')) {
        return 'storage';
    }

    // Communication
    if (name.includes('slack') || name.includes('teams') || name.includes('outlook') ||
        name.includes('gmail') || name.includes('discord') || name.includes('zoom') ||
        categories.includes('communication') || categories.includes('email')) {
        return 'communication';
    }

    // Development
    if (name.includes('github') || name.includes('gitlab') || name.includes('bitbucket') ||
        name.includes('jira') || categories.includes('development')) {
        return 'development';
    }

    // Documentation
    if (name.includes('confluence') || name.includes('notion') || name.includes('bookstack') ||
        name.includes('wiki') || categories.includes('documentation')) {
        return 'documentation';
    }

    // Productivity (Calendar, Project Management, ServiceNow)
    if (name.includes('calendar') || name.includes('asana') || name.includes('trello') ||
        name.includes('linear') || name.includes('clickup') || name.includes('servicenow') ||
        categories.includes('productivity') || categories.includes('project')) {
        return 'productivity';
    }

    return 'productivity'; // Default to productivity instead of 'other'
};

// Group connectors by app group
interface ConnectorGroup {
    name: string;
    displayName: string;
    icon: string;
    connectors: Connector[];
    order: number;
}

export const AddIntegrationDialog: React.FC<AddIntegrationDialogProps> = ({
    open,
    onOpenChange,
    allConnectors,
}) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Filter connectors - exclude certain connectors and apply search/category
    const filteredConnectors = useMemo(() => {
        // First, filter out excluded connectors
        let filtered = allConnectors.filter(
            (connector) => !EXCLUDED_CONNECTORS.includes(connector.name)
        );

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (connector) =>
                    connector.name.toLowerCase().includes(query) ||
                    connector.appGroup?.toLowerCase().includes(query) ||
                    connector.appCategories?.some((cat) => cat.toLowerCase().includes(query))
            );
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(
                (connector) => getConnectorCategory(connector) === selectedCategory
            );
        }

        // Sort alphabetically
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [allConnectors, searchQuery, selectedCategory]);

    // Separate clustered and standalone connectors
    const { clusteredGroups, standaloneConnectors } = useMemo(() => {
        const groups: Record<string, Connector[]> = {};
        const standalone: Connector[] = [];
        
        filteredConnectors.forEach((connector) => {
            if (isClusteredConnector(connector)) {
                const groupName = getNormalizedAppGroup(connector);
                if (!groups[groupName]) {
                    groups[groupName] = [];
                }
                groups[groupName].push(connector);
            } else {
                standalone.push(connector);
            }
        });

        // Convert groups to array and sort by order
        const clustered: ConnectorGroup[] = Object.entries(groups)
            .map(([name, connectors]) => {
                const config = APP_GROUP_CONFIG[name] || { 
                    order: 100, 
                    icon: '/assets/icons/connectors/default.svg',
                    displayName: name 
                };
                return {
                    name,
                    displayName: config.displayName,
                    icon: config.icon,
                    connectors: connectors.sort((a, b) => a.name.localeCompare(b.name)),
                    order: config.order,
                };
            })
            .sort((a, b) => a.order - b.order);

        return { 
            clusteredGroups: clustered, 
            standaloneConnectors: standalone.sort((a, b) => a.name.localeCompare(b.name))
        };
    }, [filteredConnectors]);

    // Count connectors per category (excluding filtered connectors)
    const categoryCounts = useMemo(() => {
        const availableConnectors = allConnectors.filter(
            (connector) => !EXCLUDED_CONNECTORS.includes(connector.name)
        );
        const counts: Record<string, number> = { all: availableConnectors.length };
        availableConnectors.forEach((connector) => {
            const category = getConnectorCategory(connector);
            counts[category] = (counts[category] || 0) + 1;
        });
        return counts;
    }, [allConnectors]);

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            return next;
        });
    };

    const handleConnectorSelect = (connector: Connector) => {
        onOpenChange(false);
        setSearchQuery('');
        setSelectedCategory('all');
        navigate(`${connector.name}`);
    };

    const handleClose = () => {
        onOpenChange(false);
        setSearchQuery('');
        setSelectedCategory('all');
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-h-[85vh] max-w-2xl gap-0 p-0 font-roboto">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="text-lg font-semibold">Add App</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Connect your apps to search across all your tools
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search apps..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 pl-10 pr-10 bg-muted/50"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                type="button"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="px-6 pb-4">
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((category) => {
                            const count = categoryCounts[category.id] || 0;
                            const isActive = selectedCategory === category.id;

                            if (category.id !== 'all' && count === 0) return null;

                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                    )}
                                    type="button"
                                >
                                    <span>{category.name}</span>
                                    <span className={cn(
                                        'text-xs',
                                        isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Connector List - Clustered Groups + Standalone */}
                <ScrollArea className="h-[400px]">
                    <div className="p-4">
                        {filteredConnectors.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center">
                                <p className="text-sm font-medium text-foreground">No apps found</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Try a different search term
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Clustered Groups (Atlassian, Google Workspace, Microsoft) */}
                                {clusteredGroups.map((group) => (
                                    <div key={group.name} className="space-y-2">
                                        {/* Group Header */}
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(group.name)}
                                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex h-6 w-6 items-center justify-center">
                                                <img
                                                    src={group.icon}
                                                    alt={group.displayName}
                                                    className="h-5 w-5 object-contain"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/assets/icons/connectors/default.svg';
                                                    }}
                                                />
                                            </div>
                                            <span className="font-semibold text-sm text-foreground flex-1 text-left">
                                                {group.displayName}
                                            </span>
                                            <span className="text-xs text-muted-foreground mr-1">
                                                {group.connectors.length}
                                            </span>
                                            {collapsedGroups.has(group.name) ? (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </button>

                                        {/* Group Connectors */}
                                        {!collapsedGroups.has(group.name) && (
                                            <div className="grid grid-cols-2 gap-2 pl-2">
                                                {group.connectors.map((connector) => (
                                                    <button
                                                        key={connector._key || connector.name}
                                                        onClick={() => handleConnectorSelect(connector)}
                                                        className={cn(
                                                            'relative flex items-center gap-3 p-3 rounded-lg border border-border',
                                                            'bg-background hover:bg-muted/50 hover:border-border/80',
                                                            'transition-colors text-left',
                                                            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                                                        )}
                                                        type="button"
                                                    >
                                                        {/* Icon */}
                                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
                                                            <img
                                                                src={connector.iconPath}
                                                                alt={connector.name}
                                                                className="h-5 w-5 object-contain"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.src = '/assets/icons/connectors/default.svg';
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm text-foreground truncate">
                                                                    {connector.name}
                                                                </span>
                                                                {connector.isConfigured && (
                                                                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Standalone Connectors (no group header) */}
                                {standaloneConnectors.length > 0 && (
                                    <div className="space-y-2">
                                        {clusteredGroups.length > 0 && (
                                            <div className="px-2 py-1.5">
                                                <span className="font-semibold text-sm text-foreground">
                                                    Other Apps
                                                </span>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            {standaloneConnectors.map((connector) => (
                                                <button
                                                    key={connector._key || connector.name}
                                                    onClick={() => handleConnectorSelect(connector)}
                                                    className={cn(
                                                        'relative flex items-center gap-3 p-3 rounded-lg border border-border',
                                                        'bg-background hover:bg-muted/50 hover:border-border/80',
                                                        'transition-colors text-left',
                                                        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                                                    )}
                                                    type="button"
                                                >
                                                    {/* Icon */}
                                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
                                                        <img
                                                            src={connector.iconPath}
                                                            alt={connector.name}
                                                            className="h-5 w-5 object-contain"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src = '/assets/icons/connectors/default.svg';
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm text-foreground truncate">
                                                                {connector.name}
                                                            </span>
                                                            {connector.isConfigured && (
                                                                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="border-t border-border px-6 py-3">
                    <p className="text-xs text-muted-foreground text-center">
                        {categoryCounts.all} apps available
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};
