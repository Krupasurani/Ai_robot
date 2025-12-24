import React from 'react';
import {
  RefreshCw,
  Clock,
  Clock4,
  FileX,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils/cn';
import axios from 'src/utils/axios';
import { useConnectorStats, type ConnectorStatsData } from '../hooks/use-connector-stats';

interface ConnectorDetailStatsProps {
  connectorName: string;
  className?: string;
}

/**
 * Detailed stats component for a single connector
 * Shows indexing progress, status breakdown, and actions
 */
export const ConnectorDetailStats: React.FC<ConnectorDetailStatsProps> = ({
  connectorName,
  className,
}) => {
  const [isReindexing, setIsReindexing] = React.useState(false);
  const [isResyncing, setIsResyncing] = React.useState(false);

  // Memoize the connector name transformation to prevent unnecessary re-renders
  const normalizedConnectorName = React.useMemo(
    () => connectorName.toUpperCase().replace(/\s+/g, '_'),
    [connectorName]
  );

  const { stats, loading, error, refresh } = useConnectorStats({
    connectorName: normalizedConnectorName,
    refreshInterval: 30000,
  });

  const handleReindex = async () => {
    try {
      setIsReindexing(true);
      await axios.post('/api/v1/knowledgeBase/reindex-all/connector', {
        app: connectorName.toUpperCase().replace(/\s+/g, '_'),
      });
      toast.success(`Reindexing started for ${connectorName}`);
      setTimeout(refresh, 2000);
    } catch (err) {
      toast.error(`Failed to reindex documents for ${connectorName}`);
    } finally {
      setTimeout(() => setIsReindexing(false), 1000);
    }
  };

  const handleResync = async () => {
    try {
      setIsResyncing(true);
      await axios.post('/api/v1/knowledgeBase/resync/connector', {
        connectorName: connectorName.toUpperCase().replace(/\s+/g, '_'),
      });
      toast.success(`Resync started for ${connectorName}`);
      setTimeout(refresh, 2000);
    } catch (err) {
      toast.error(`Failed to resync ${connectorName}`);
    } finally {
      setTimeout(() => setIsResyncing(false), 1000);
    }
  };

  if (loading) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No indexing data available yet.</p>
            <p className="text-xs mt-1">Data will appear after the first sync completes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { total, indexing_status } = stats.stats;
  const percentComplete = total > 0 ? Math.round(((indexing_status.COMPLETED || 0) / total) * 100) : 0;
  const failedCount = indexing_status.FAILED || 0;

  const statusItems = [
    {
      label: 'Indexed',
      count: indexing_status.COMPLETED || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      label: 'Failed',
      count: indexing_status.FAILED || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: 'In Progress',
      count: indexing_status.IN_PROGRESS || 0,
      icon: Clock4,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Not Started',
      count: indexing_status.NOT_STARTED || 0,
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-800/30',
    },
  ];

  // Add optional status items
  if (indexing_status.FILE_TYPE_NOT_SUPPORTED > 0) {
    statusItems.push({
      label: 'Unsupported',
      count: indexing_status.FILE_TYPE_NOT_SUPPORTED,
      icon: FileX,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    });
  }

  if (indexing_status.AUTO_INDEX_OFF > 0) {
    statusItems.push({
      label: 'Auto-Index Off',
      count: indexing_status.AUTO_INDEX_OFF,
      icon: FileX,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    });
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Indexing Statistics
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
          <div className="flex-1">
            <p className="text-2xl font-bold text-foreground">
              {total.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total Documents</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-2xl font-bold text-foreground">{percentComplete}%</p>
            <p className="text-sm text-muted-foreground">Indexed</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Indexing Progress</span>
            <span className="font-medium">
              {(indexing_status.COMPLETED || 0).toLocaleString()} / {total.toLocaleString()}
            </span>
          </div>
          <Progress value={percentComplete} className="h-2" />
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-default transition-colors hover:bg-muted/50',
                      item.bgColor
                    )}
                  >
                    <Icon className={cn('h-5 w-5', item.color)} />
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {item.count.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{item.label} Documents</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResync}
            disabled={isResyncing}
            className="flex-1"
          >
            {isResyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Resync
              </>
            )}
          </Button>
          {failedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReindex}
              disabled={isReindexing}
              className="flex-1"
            >
              {isReindexing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reindexing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reindex Failed ({failedCount})
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectorDetailStats;
