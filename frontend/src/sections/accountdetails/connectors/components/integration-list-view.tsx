import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, CheckCircle2, Loader2, Circle, ChevronDown, Activity, CircleDot, Info, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddIntegrationDialog } from './add-integration-dialog';
import { useMultipleConnectorStats } from '../hooks/use-connector-stats';
import type { Connector } from '../types/types';

interface IntegrationListViewProps {
    connectors: Connector[];
    loading?: boolean;
}

export const IntegrationListView: React.FC<IntegrationListViewProps> = ({
    connectors,
    loading = false,
}) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [visibilitySettings, setVisibilitySettings] = useState<Record<string, string>>({});
    const [sortConfig, setSortConfig] = useState<{
        key: 'name' | 'crawl' | 'content' | 'documents' | 'visibility';
        direction: 'asc' | 'desc';
    } | null>(null);

    const filteredConnectors = connectors.filter(
        (connector) =>
            connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            connector.appGroup.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const displayConnectors = filteredConnectors.filter((c) => c.isConfigured);

    // Get connector names for fetching stats
    const configuredConnectorNames = useMemo(
        () => displayConnectors.filter(c => c.isConfigured).map((c) => c.name.toUpperCase().replace(/\s+/g, '_')),
        [displayConnectors]
    );

    // Fetch stats for all configured connectors
    const { statsMap, loading: statsLoading } = useMultipleConnectorStats({
        connectorNames: configuredConnectorNames,
        refreshInterval: 30000, // Refresh every 30 seconds
        enabled: configuredConnectorNames.length > 0,
    });

    // Helper to get document count for a connector
    const getDocumentCount = (connector: Connector): number => {
        const connectorKey = connector.name.toUpperCase().replace(/\s+/g, '_');
        const stats = statsMap[connectorKey];
        return stats?.stats?.total ?? 0;
    };

    const sortedConnectors = useMemo(() => {
        const sorted = [...displayConnectors];
        if (!sortConfig) return sorted;

        return sorted.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'crawl':
                case 'content': {
                    // Map status to a numeric value for sorting: Enabled (2), Disabled (1), N/A (0)
                    const getStatusValue = (c: Connector) => {
                        if (c.isActive) return 2;
                        if (c.isConfigured) return 1;
                        return 0;
                    };
                    aValue = getStatusValue(a);
                    bValue = getStatusValue(b);
                    break;
                }
                case 'documents':
                    aValue = getDocumentCount(a);
                    bValue = getDocumentCount(b);
                    break;
                case 'visibility':
                    aValue = visibilitySettings[a._key || a.name] || 'off';
                    bValue = visibilitySettings[b._key || b.name] || 'off';
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [displayConnectors, sortConfig, statsMap, visibilitySettings]);

    const handleSort = (key: 'name' | 'crawl' | 'content' | 'documents' | 'visibility') => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                if (prev.direction === 'asc') {
                    return { key, direction: 'desc' };
                }
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (key: 'name' | 'crawl' | 'content' | 'documents' | 'visibility') => {
        if (sortConfig?.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
        }
        return sortConfig.direction === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4 text-primary" />
        ) : (
            <ArrowDown className="ml-2 h-4 w-4 text-primary" />
        );
    };

    const getCrawlStatusBadge = (connector: Connector) => {
        if (connector.isActive) {
            return (
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground/70">Enabled</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium text-foreground/70">Disabled</span>
            </div>
        );
    };

    const getContentStatusBadge = (connector: Connector) => {
        if (connector.isActive) {
            return (
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground/70">Synced</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                <span className="text-sm font-medium text-foreground/70">Job in progress</span>
            </div>
        );
    };

    const getVisibilityBadge = (connectorKey: string) => {
        const visibility = visibilitySettings[connectorKey] || 'off';

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-2 font-roboto">
                        {visibility === 'all' && <span className="text-sm">On for all</span>}
                        {visibility === 'test' && <span className="text-sm">Test group only</span>}
                        {visibility === 'off' && <span className="text-sm text-gray-500">Off</span>}
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-roboto">
                    <DropdownMenuItem onClick={() => setVisibilitySettings({ ...visibilitySettings, [connectorKey]: 'all' })}>
                        On for all
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVisibilitySettings({ ...visibilitySettings, [connectorKey]: 'test' })}>
                        Test group only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVisibilitySettings({ ...visibilitySettings, [connectorKey]: 'off' })}>
                        Off
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <div className="flex h-full w-full flex-col bg-background font-roboto">
            {/* Header */}
            <div className="border-b border-border/60 bg-background px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="max-w-[70%]">
                        <h1 className="text-2xl font-semibold text-foreground">Apps</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Thero works best when you can search across all the tools you and your team use every day.
                            Connect your existing tools and manage the ones you&apos;ve added to Thero below.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search apps"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 pl-10 font-roboto"
                            />
                        </div>
                        <Button
                            onClick={() => setIsAddDialogOpen(true)}
                            className="gap-2 bg-primary font-medium hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            Add app
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : displayConnectors.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-center">
                        <p className="text-lg font-medium text-foreground">No apps found.</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Try searching for a different app or click &quot;Add app&quot; to connect your first integration.
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/60 hover:bg-transparent">
                                <TableHead 
                                    className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center">
                                        App {getSortIcon('name')}
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary"
                                    onClick={() => handleSort('crawl')}
                                >
                                    <div className="flex items-center">
                                        Crawl {getSortIcon('crawl')}
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary"
                                    onClick={() => handleSort('content')}
                                >
                                    <div className="flex items-center">
                                        Content crawling {getSortIcon('content')}
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary"
                                    onClick={() => handleSort('documents')}
                                >
                                    <div className="flex items-center">
                                        Documents {getSortIcon('documents')}
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary"
                                    onClick={() => handleSort('visibility')}
                                >
                                    <div className="flex items-center">
                                        Search results {getSortIcon('visibility')}
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedConnectors.map((connector) => (
                                <TableRow
                                    key={connector._key || connector.name}
                                    className="cursor-pointer border-border/60 hover:bg-muted/50"
                                    onClick={() => navigate(`${connector.name}`)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
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
                                            <span className="font-medium text-foreground">{connector.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getCrawlStatusBadge(connector)}</TableCell>
                                    <TableCell>{getContentStatusBadge(connector)}</TableCell>
                                    <TableCell>
                                        <span className="font-medium text-foreground">
                                            {statsLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            ) : (
                                                getDocumentCount(connector).toLocaleString()
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        {getVisibilityBadge(connector._key || connector.name)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Add Integration Dialog */}
            <AddIntegrationDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                allConnectors={connectors}
            />
        </div>
    );
};
