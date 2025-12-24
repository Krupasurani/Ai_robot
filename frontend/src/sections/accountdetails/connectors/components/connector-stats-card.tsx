import { useState } from 'react';
import { RefreshCw, Clock, Clock4, FileX, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

import axios from 'src/utils/axios';

import { useConnectors } from '../context';

interface IndexingStatusStats {
  NOT_STARTED: number;
  IN_PROGRESS: number;
  COMPLETED: number;
  FAILED: number;
  FILE_TYPE_NOT_SUPPORTED: number;
  AUTO_INDEX_OFF: number;
}

interface BasicStats {
  total: number;
  indexing_status: IndexingStatusStats;
}

interface RecordTypeStats {
  record_type: string;
  total: number;
  indexing_status: IndexingStatusStats;
}

interface KnowledgeBaseStats {
  kb_id: string;
  kb_name: string;
  total: number;
  indexing_status: IndexingStatusStats;
  by_record_type: RecordTypeStats[];
}

export interface ConnectorStatsData {
  org_id: string;
  connector: string;
  origin: 'UPLOAD' | 'CONNECTOR';
  stats: BasicStats;
  by_record_type: RecordTypeStats[];
  knowledge_bases?: KnowledgeBaseStats[];
}

// Helper function to get connector data dynamically
const getConnectorData = (connectorName: string, allConnectors: any[]) => {
  const connector = allConnectors.find(
    (c) => c.name.toUpperCase() === connectorName.toUpperCase() || c.name === connectorName
  );

  return {
    displayName: connector?.name || connectorName,
    iconPath: connector?.iconPath || '/assets/icons/connectors/default.svg',
    appGroup: connector?.appGroup || '',
  };
};

export const ConnectorStatsCard = ({
  connector,
  showActions = true,
}: {
  connector: ConnectorStatsData;
  showActions?: boolean;
}): JSX.Element => {
  const [isReindexing, setIsReindexing] = useState<boolean>(false);
  const [isResyncing, setIsResyncing] = useState<boolean>(false);

  // Get connector data from the hook
  const { activeConnectors, inactiveConnectors } = useConnectors();
  const allConnectors = [...activeConnectors, ...inactiveConnectors];

  const { connector: connectorName, stats } = connector;
  const { total, indexing_status } = stats;

  // Get dynamic connector data
  const connectorData = getConnectorData(connectorName, allConnectors);
  const { displayName } = connectorData;
  const iconName = connectorData.iconPath;

  const percentComplete =
    total > 0 ? Math.round(((indexing_status.COMPLETED || 0) / total) * 100) : 0;
  const isComplete = percentComplete === 100;
  const failedCount = indexing_status.FAILED || 0;
  const canShowSync = showActions;
  const canShowReindex = failedCount > 0;

  const handleReindex = async (): Promise<void> => {
    try {
      setIsReindexing(true);
      await axios.post('/api/v1/knowledgeBase/reindex-all/connector', { app: connectorName });
      toast.success(`Reindexing started for ${displayName}`);
    } catch (error) {
      toast.error(`Failed to reindex documents for ${displayName}`);
    } finally {
      setTimeout(() => setIsReindexing(false), 1000);
    }
  };

  const handleResync = async (): Promise<void> => {
    try {
      setIsResyncing(true);
      await axios.post('/api/v1/knowledgeBase/resync/connector', { connectorName });
      toast.success(`Resync started for ${displayName}`);
    } catch (error) {
      toast.error(`Failed to resync ${displayName}`);
    } finally {
      setTimeout(() => setIsResyncing(false), 1000);
    }
  };

  const statusItems = [
    {
      label: 'Indexed',
      count: indexing_status.COMPLETED || 0,
      icon: CheckCircle2,
      tooltip: 'Indexed Records',
      key: 'completed',
    },
    {
      label: 'Failed',
      count: indexing_status.FAILED || 0,
      icon: AlertCircle,
      tooltip: 'Failed Records',
      key: 'failed',
    },
    {
      label: 'In Progress',
      count: indexing_status.IN_PROGRESS || 0,
      icon: Clock4,
      tooltip: 'In Progress Records',
      key: 'inProgress',
    },
    {
      label: 'Not Started',
      count: indexing_status.NOT_STARTED || 0,
      icon: Clock,
      tooltip: 'Not Started Records',
      key: 'notStarted',
    },
  ] as const;

  const optionalStatusItems = [
    ...(indexing_status.FILE_TYPE_NOT_SUPPORTED > 0
      ? [
          {
            label: 'Unsupported',
            count: indexing_status.FILE_TYPE_NOT_SUPPORTED,
            icon: FileX,
            tooltip: 'Unsupported File Types',
            key: 'unsupported' as const,
          },
        ]
      : []),
    ...(indexing_status.AUTO_INDEX_OFF > 0
      ? [
          {
            label: 'Manual Sync',
            count: indexing_status.AUTO_INDEX_OFF,
            icon: FileX,
            tooltip: 'Auto Index Off',
            key: 'autoIndexOff' as const,
          },
        ]
      : []),
  ];

  const allStatusItems = [...statusItems, ...optionalStatusItems];

  return (
    <Card className="h-full flex flex-col rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      {/* Header */}
      <div className="py-4 px-5 flex items-center border-b border-border bg-muted/30">
        <Avatar className="size-8 rounded-md mr-3 bg-muted/50">
          <AvatarImage src={iconName} alt={displayName} className="object-contain p-1.5" />
        </Avatar>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-tight mb-0.5">
            {displayName}
          </h3>
          <p className="text-xs text-muted-foreground font-normal">
            {total.toLocaleString()} records
          </p>
        </div>
        {isComplete ? (
          <Badge
            variant="secondary"
            className="ml-auto px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider border"
          >
            Synced
          </Badge>
        ) : (
          <div className="ml-auto size-2 rounded-full bg-muted-foreground/40 shadow-sm" />
        )}
      </div>

      {/* Content */}
      <div className="px-5 pt-4 pb-5 flex flex-col flex-1 relative">
        {/* Progress Section */}
        <div className="flex items-center mb-6 pb-6 border-b border-border">
          <div className="relative flex items-center justify-center mr-5 size-10.5">
            {percentComplete < 100 ? (
              <Loader2 className="size-10.5 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="size-10.5 text-green-500" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-foreground">{`${percentComplete}%`}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-1 leading-tight">
              Indexing Progress
            </p>
            <p className="text-[0.7rem] text-muted-foreground font-normal flex items-center">
              <span className="font-semibold mr-0.5">
                {indexing_status.COMPLETED.toLocaleString()}
              </span>
              <span className="mx-0.5">/</span>
              <span>{total.toLocaleString()} records indexed</span>
            </p>
          </div>
        </div>

        {/* Status Grid */}
        <div
          className={cn(
            'grid gap-2 mb-6',
            allStatusItems.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          )}
        >
          {allStatusItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={`status-${item.key}`}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center bg-muted/50 rounded-md py-3 px-2 border border-border h-full justify-center transition-colors hover:bg-muted cursor-default">
                    <Icon className="size-4 text-muted-foreground mb-2 opacity-90" />
                    <p className="text-sm font-semibold text-foreground mb-0.5 leading-tight">
                      {item.count.toLocaleString()}
                    </p>
                    <p className="text-[0.675rem] text-muted-foreground text-center font-normal">
                      {item.label}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{item.tooltip}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Actions */}
        {(canShowSync || canShowReindex) && (
          <div className="mt-auto flex justify-center w-full gap-3 pt-4 border-t border-border">
            {canShowSync && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleResync}
                disabled={isResyncing}
                className="h-7.5 text-xs font-medium rounded-md min-w-[90px] px-3"
              >
                {isResyncing ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Syncing
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Sync
                  </>
                )}
              </Button>
            )}
            {canShowReindex && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReindex}
                disabled={isReindexing}
                className="h-7.5 text-xs font-medium rounded-md min-w-[120px] px-3"
              >
                {isReindexing ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Indexing
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Reindex Failed
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
