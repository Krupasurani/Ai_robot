import React from 'react';
import { ConnectorSetupView } from '../connector-setup-view';

interface ConnectorManagerProps {
  showStats?: boolean;
}

const ConnectorManager: React.FC<ConnectorManagerProps> = ({ showStats = true }) => (
  <ConnectorSetupView showStats={showStats} />
);

export default ConnectorManager;

