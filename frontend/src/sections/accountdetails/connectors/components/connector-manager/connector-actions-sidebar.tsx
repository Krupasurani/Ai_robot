import React from 'react';
import { Key, Play, Pause, RefreshCw, Settings2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';

import type { Connector } from '../../types/types';

interface ConnectorActionsSidebarProps {
  connector: Connector;
  isAuthenticated: boolean;
  loading: boolean;
  onAuthenticate: () => void;
  onConfigure: () => void;
  onRefresh: () => void;
  onToggle: (enabled: boolean) => void;
  hideAuthenticate?: boolean;
}

const ConnectorActionsSidebar: React.FC<ConnectorActionsSidebarProps> = ({
  connector,
  isAuthenticated,
  loading,
  onAuthenticate,
  onConfigure,
  onRefresh,
  onToggle,
  hideAuthenticate,
}) => {
  const isConfigured = connector.isConfigured || false;
  const isActive = connector.isActive || false;
  const authType = (connector.authType || '').toUpperCase();
  const isOauth = authType === 'OAUTH';
  // If authenticate is hidden (admin consent or business service-account flow), enabling should rely on configuration
  const canEnable = isActive
    ? true
    : isOauth
      ? hideAuthenticate
        ? isConfigured
        : isAuthenticated
      : isConfigured;

  return (
    <div className="space-y-3">
      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(connector.authType || '').toUpperCase() === 'OAUTH' && !hideAuthenticate && (
            <Button
              variant={isAuthenticated ? 'default' : 'default'}
              className="w-full justify-start h-9 text-xs font-medium"
              onClick={onAuthenticate}
              disabled={loading || isAuthenticated}
            >
              <Key className="size-3.5 mr-2" />
              {isAuthenticated ? 'Authenticated' : 'Authenticate'}
            </Button>
          )}

          <Button
            variant={!isConfigured ? 'default' : 'outline'}
            className="w-full justify-start h-9 text-xs font-medium"
            onClick={onConfigure}
          >
            <Settings2 className="size-3.5 mr-2" />
            {!isConfigured ? 'Configure Now' : 'Configure Settings'}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-9 text-xs font-medium"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-3.5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 mr-2" />
            )}
            {loading ? 'Refreshing...' : 'Refresh Status'}
          </Button>

          {isConfigured && (
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start h-9 text-xs font-medium',
                isActive
                  ? 'border-warning text-warning hover:bg-warning/10'
                  : 'border-green-500 text-green-600 dark:text-green-400 hover:bg-green-500/10'
              )}
              onClick={() => onToggle(!isActive)}
              disabled={!isActive && !canEnable}
            >
              {isActive ? <Pause className="size-3.5 mr-2" /> : <Play className="size-3.5 mr-2" />}
              {isActive ? 'Disable' : 'Enable'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Connection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'size-1.5 rounded-full',
                  isConfigured ? 'bg-warning' : 'bg-muted-foreground/40'
                )}
              />
              <p className="text-xs text-muted-foreground">Configuration</p>
            </div>
            <p
              className={cn(
                'text-xs font-medium',
                isConfigured ? 'text-warning' : 'text-muted-foreground'
              )}
            >
              {isConfigured ? 'Complete' : 'Required'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'size-1.5 rounded-full',
                  isActive ? 'bg-green-500' : 'bg-muted-foreground/40'
                )}
              />
              <p className="text-xs text-muted-foreground">Connection</p>
            </div>
            <p
              className={cn(
                'text-xs font-medium',
                isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              )}
            >
              {isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectorActionsSidebar;
