import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';

import { ConnectorApiService } from './services/api';
import { IntegrationListView } from './components/integration-list-view';

import type { Connector } from './types/types';

const Connectors = () => {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchConnectors = async () => {
      try {
        const fetchedConnectors = await ConnectorApiService.getConnectors();
        setConnectors(fetchedConnectors);
      } catch (error) {
        toast.error('Failed to fetch connectors');
      } finally {
        setLoading(false);
      }
    };
    fetchConnectors();
  }, []);

  return <IntegrationListView connectors={connectors} loading={loading} />;
};

export default Connectors;
