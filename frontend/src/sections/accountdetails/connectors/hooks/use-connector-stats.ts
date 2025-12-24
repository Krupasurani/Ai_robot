import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'src/utils/axios';

export interface IndexingStatusStats {
  NOT_STARTED: number;
  IN_PROGRESS: number;
  COMPLETED: number;
  FAILED: number;
  FILE_TYPE_NOT_SUPPORTED: number;
  AUTO_INDEX_OFF: number;
}

export interface BasicStats {
  total: number;
  indexing_status: IndexingStatusStats;
}

export interface RecordTypeStats {
  record_type: string;
  total: number;
  indexing_status: IndexingStatusStats;
}

export interface KnowledgeBaseStats {
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

interface ConnectorStatsResponse {
  success: boolean;
  message?: string;
  data: ConnectorStatsData | null;
}

interface UseConnectorStatsOptions {
  connectorName?: string;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseConnectorStatsReturn {
  stats: ConnectorStatsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch stats for a single connector
 */
export function useConnectorStats({
  connectorName,
  refreshInterval = 0,
  enabled = true,
}: UseConnectorStatsOptions): UseConnectorStatsReturn {
  const [stats, setStats] = useState<ConnectorStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchStatsRef = useRef<(() => Promise<void>) | null>(null);

  const fetchStats = useCallback(async () => {
    if (!connectorName || !enabled || !isMounted.current) return;

    try {
      setLoading(true);
      const apiUrl =
        connectorName === 'KNOWLEDGE_BASE' || connectorName === 'KB'
          ? '/api/v1/knowledgeBase/stats/KB'
          : `/api/v1/knowledgeBase/stats/${connectorName}`;

      const response = await axios.get<ConnectorStatsResponse>(apiUrl);

      if (!isMounted.current) return;

      if (response.data.success && response.data.data) {
        setStats(response.data.data);
        setError(null);
      } else {
        setStats(null);
        setError(response.data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error(`Failed to fetch stats for ${connectorName}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStats(null);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [connectorName, enabled]);

  // Keep ref updated with latest fetchStats function
  fetchStatsRef.current = fetchStats;

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    isMounted.current = true;
    
    // Clear any existing interval first to prevent multiple intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Skip initial fetch if connectorName is not provided or disabled
    if (!connectorName || !enabled) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchStats();

    // Set up interval if specified
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (isMounted.current && fetchStatsRef.current) {
          fetchStatsRef.current();
        }
      }, refreshInterval);
    }

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Depend on primitive values instead of fetchStats to prevent unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorName, enabled, refreshInterval]);

  return { stats, loading, error, refresh };
}

interface UseMultipleConnectorStatsOptions {
  connectorNames: string[];
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseMultipleConnectorStatsReturn {
  statsMap: Record<string, ConnectorStatsData>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch stats for multiple connectors
 */
export function useMultipleConnectorStats({
  connectorNames,
  refreshInterval = 0,
  enabled = true,
}: UseMultipleConnectorStatsOptions): UseMultipleConnectorStatsReturn {
  const [statsMap, setStatsMap] = useState<Record<string, ConnectorStatsData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchAllStatsRef = useRef<(() => Promise<void>) | null>(null);

  const fetchAllStats = useCallback(async () => {
    if (!enabled || connectorNames.length === 0 || !isMounted.current) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const responses = await Promise.all(
        connectorNames.map(async (name) => {
          try {
            const apiUrl =
              name === 'KNOWLEDGE_BASE' || name === 'KB'
                ? '/api/v1/knowledgeBase/stats/KB'
                : `/api/v1/knowledgeBase/stats/${name}`;

            const response = await axios.get<ConnectorStatsResponse>(apiUrl);
            if (response.data.success && response.data.data) {
              return { name, data: response.data.data };
            }
            return { name, data: null };
          } catch (err) {
            console.error(`Failed to fetch stats for ${name}:`, err);
            return { name, data: null };
          }
        })
      );

      if (!isMounted.current) return;

      const newStatsMap: Record<string, ConnectorStatsData> = {};
      responses.forEach(({ name, data }) => {
        if (data) {
          newStatsMap[name.toUpperCase()] = data;
        }
      });

      setStatsMap(newStatsMap);
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Failed to fetch connector stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [connectorNames, enabled]);

  // Keep ref updated with latest fetchAllStats function
  fetchAllStatsRef.current = fetchAllStats;

  const refresh = useCallback(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  useEffect(() => {
    isMounted.current = true;
    
    // Clear any existing interval first to prevent multiple intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Skip initial fetch if no connectors or disabled
    if (!enabled || connectorNames.length === 0) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchAllStats();

    // Set up interval if specified
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (isMounted.current && fetchAllStatsRef.current) {
          fetchAllStatsRef.current();
        }
      }, refreshInterval);
    }

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Depend on primitive values instead of fetchAllStats to prevent unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorNames.join(','), enabled, refreshInterval]);

  return { statsMap, loading, error, refresh };
}
