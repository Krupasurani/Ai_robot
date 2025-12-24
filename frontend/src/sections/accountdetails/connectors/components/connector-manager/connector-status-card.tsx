import React from 'react';

import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { isNoneAuthType } from '../../utils/auth';
import type { Connector } from '../../types/types';

interface ConnectorStatusCardProps {
  connector: Connector;
  isAuthenticated: boolean;
  isEnablingWithFilters: boolean;
  onToggle: (enabled: boolean) => void;
  hideAuthenticate?: boolean;
}

const ConnectorStatusCard: React.FC<ConnectorStatusCardProps> = ({
  connector,
  isAuthenticated,
  isEnablingWithFilters,
  onToggle,
  hideAuthenticate,
}) => {
  const isConfigured = connector.isConfigured || false;
  const isActive = connector.isActive || false;
  const authType = (connector.authType || '').toUpperCase();
  const isOauth = authType === 'OAUTH';
  const canEnable = isActive
    ? true
    : isOauth
      ? hideAuthenticate
        ? isConfigured
        : isAuthenticated
      : isConfigured;
  const enableBlocked = !isActive && !canEnable;

  const getTooltipMessage = () => {
    if (!isActive && !canEnable) {
      if (isOauth) {
        return hideAuthenticate
          ? `${connector.name} needs to be configured before it can be enabled`
          : `Authenticate ${connector.name} before enabling`;
      }
      return `${connector.name} needs to be configured before it can be enabled`;
    }
    return '';
  };

  return (
    <Card
      className={cn(
        'p-5 rounded-xl border relative transition-all duration-200',
        'hover:border-primary/40 hover:shadow-md',
        isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-transparent'
      )}
    >
      {/* Status Dot */}
      {isActive && (
        <div className="absolute top-3 right-3 size-1.5 rounded-full bg-green-500 shadow-[0_0_0_2px_hsl(var(--background))]" />
      )}

      {/* Connector Info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="size-12 flex items-center justify-center bg-primary/10 border border-primary/20 rounded-xl">
          <img
            src={connector.iconPath}
            alt={connector.name}
            width={24}
            height={24}
            className="object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/assets/icons/connectors/default.svg';
            }}
          />
        </div>

        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground mb-0.5">{connector.name}</h3>

          <div className="flex items-center gap-1 flex-wrap">
            <p className="text-xs text-muted-foreground">{connector.appGroup}</p>

            <div className="size-0.75 rounded-full bg-muted-foreground/40" />

            {!isNoneAuthType(connector.authType) && (
              <>
                <Badge variant="secondary" className="h-5 text-[0.6875rem] font-medium border">
                  {connector.authType.split('_').join(' ')}
                </Badge>
              </>
            )}

            {connector.supportsRealtime && (
              <>
                <div className="size-0.75 rounded-full bg-muted-foreground/40" />
                <Badge
                  variant="secondary"
                  className="h-5 text-[0.6875rem] font-medium border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                >
                  Real-time
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Control */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold mb-1">Connector Status</p>
            <p className="text-xs text-muted-foreground">
              {isActive
                ? 'Active and syncing data'
                : isEnablingWithFilters
                  ? 'Setting up filters...'
                  : isConfigured
                    ? 'Configured but inactive'
                    : 'Needs configuration'}
            </p>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => {
                    if (checked && !canEnable) {
                      // Block enabling if prerequisites not met
                      return;
                    }
                    onToggle(checked);
                  }}
                  disabled={!isActive && !canEnable}
                />
              </div>
            </TooltipTrigger>
            {enableBlocked && (
              <TooltipContent>
                <p>{getTooltipMessage()}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </Card>
  );
};

export default ConnectorStatusCard;
