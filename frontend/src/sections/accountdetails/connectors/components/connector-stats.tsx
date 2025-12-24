import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import axios from 'src/utils/axios';
import { ConnectorStatsCard } from './connector-stats-card';

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

// For individual Knowledge Base details
interface KnowledgeBaseStats {
  kb_id: string;
  kb_name: string;
  total: number;
  indexing_status: IndexingStatusStats;
  by_record_type: RecordTypeStats[];
}

// Main connector stats data structure
interface ConnectorStatsData {
  org_id: string;
  connector: string; // "KNOWLEDGE_BASE" or specific connector name like "GOOGLE_DRIVE"
  origin: 'UPLOAD' | 'CONNECTOR';
  stats: BasicStats;
  by_record_type: RecordTypeStats[];
  knowledge_bases?: KnowledgeBaseStats[]; // Only present for Knowledge Base queries
}

interface ConnectorStatsResponse {
  success: boolean;
  message?: string; // Present when success is false
  data: ConnectorStatsData | null;
}

interface ConnectorStatisticsProps {
  title?: string;
  connectorNames?: string[] | string; // Can be a single connector name or an array of names
  showUploadTab?: boolean; // Control whether to show the upload tab
  refreshInterval?: number; // Interval in milliseconds for auto-refresh
  showActions?: boolean; // Whether to show action buttons in cards
}

/**
 * ConnectorStatistics Component
 * Displays performance statistics for each connector in a grid layout
 */
const ConnectorStatistics = ({
  title = 'Stats per app',
  connectorNames = [],
  showUploadTab = true,
  refreshInterval = 0, // Default to no auto-refresh
  showActions = true,
}: ConnectorStatisticsProps): JSX.Element => {
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [connectorStats, setConnectorStats] = useState<ConnectorStatsData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Create a ref to track if component is mounted
  const isMounted = useRef<boolean>(true);

  // Create a ref for the interval ID
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create a ref to store the latest fetch function
  const fetchConnectorStatsRef = useRef<((isManualRefresh?: boolean) => Promise<void>) | null>(null);

  // Normalize connector names with stable identity across renders
  const normalizedUpperNames = useMemo(() => {
    const list = Array.isArray(connectorNames)
      ? connectorNames
      : connectorNames
        ? [connectorNames]
        : [];
    return list
      .map((n) => String(n).trim())
      .filter((n) => n.length > 0)
      .map((n) => n);
  }, [connectorNames]);

  // Stable key built from content, not reference
  const namesKey = useMemo(
    () => Array.from(new Set(normalizedUpperNames)).sort().join(','),
    [normalizedUpperNames]
  );

  // Function to fetch connector statistics - Updated for new API structure
  const fetchConnectorStats = useCallback(
    async (isManualRefresh = false): Promise<void> => {
      if (!isMounted.current) return;

      try {
        setLoading(true);
        if (isManualRefresh) setRefreshing(true);

        // Get list of connectors to fetch
        // Build the list of connectors to fetch. Only include KB by default
        // when no connectors are specified and showUploadTab is true.
        const connectorsToFetch = namesKey
          ? namesKey.split(',').filter((n) => n.length > 0)
          : showUploadTab
            ? ['KNOWLEDGE_BASE']
            : [];

        const responses = await Promise.all(
          connectorsToFetch.map(async (name) => {
            try {
              const key = name;
              const apiUrl =
                key === 'KNOWLEDGE_BASE' || key === 'UPLOAD'
                  ? '/api/v1/knowledgeBase/stats/KB'
                  : `/api/v1/knowledgeBase/stats/${key}`;
              const response = await axios.get<ConnectorStatsResponse>(apiUrl);
              if (!isMounted.current) return null;
              return response.data.success && response.data.data ? response.data.data : null;
            } catch (connectorError) {
              console.error(`Failed to fetch stats for ${name}:`, connectorError);
              return null;
            }
          })
        );

        const fetchedStats: ConnectorStatsData[] = responses.filter((r): r is ConnectorStatsData =>
          Boolean(r)
        );

        // Sort connectors by total records (descending)
        const sortedConnectors = fetchedStats.sort((a, b) => b.stats.total - a.stats.total);
        setConnectorStats(sortedConnectors);
        setError(null);
      } catch (err) {
        if (!isMounted.current) return;

        console.error('Error fetching connector statistics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setConnectorStats([]);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setInitialLoading(false);
          if (isManualRefresh) {
            setTimeout(() => {
              setRefreshing(false);
            }, 500);
          }
        }
      }
    },
    [namesKey, showUploadTab]
  );

  // Keep ref updated with latest fetchConnectorStats function
  fetchConnectorStatsRef.current = fetchConnectorStats;

  // Function to handle manual refresh
  const handleRefresh = (): void => {
    fetchConnectorStats(true);
  };

  // Set up initial fetch and auto-refresh
  useEffect(() => {
    // Make sure isMounted is true at the start
    isMounted.current = true;

    // Clear any existing interval first to prevent multiple intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Perform initial fetch
    fetchConnectorStats();

    // Set up auto-refresh if interval is specified
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (isMounted.current && fetchConnectorStatsRef.current) {
          fetchConnectorStatsRef.current();
        }
      }, refreshInterval);
    }

    // Cleanup function to clear interval and prevent state updates after unmount
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Depend on primitive values instead of fetchConnectorStats to prevent unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey, showUploadTab, refreshInterval]);

  // If initial loading and no data yet, show centered spinner
  if (initialLoading && !connectorStats.length) {
    return (
      <Card className="overflow-hidden border rounded-lg shadow-sm min-h-[120px]">
        <div className="flex justify-center items-center min-h-[120px] w-full py-6">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <CardContent className="p-2 sm:p-3">
      {/* Grid of Connector Cards */}
      {error ? (
        <Alert variant="destructive" className="rounded-lg border">
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : connectorStats.length === 0 ? (
        <Alert variant="default" className="rounded-lg border">
          <AlertTitle>No Records Found</AlertTitle>
          <AlertDescription>
            {namesKey
              ? `No data found for the specified connector${namesKey.includes(',') ? 's' : ''}: ${namesKey}`
              : 'No connectors connected. Add a connector or upload files to get started.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {connectorStats.map((stat, index) => (
            <div key={`${stat.connector}-${index}`}>
              <ConnectorStatsCard connector={stat} showActions={showActions} />
            </div>
          ))}
        </div>
      )}

      {/* Loading Indicator for Refreshes */}
      {loading && !initialLoading && !refreshing && (
        <div className="py-4 px-5 flex justify-center mt-4">
          <Loader2 className="size-5.5 animate-spin text-primary" />
        </div>
      )}
    </CardContent>
  );
};

export default ConnectorStatistics;
