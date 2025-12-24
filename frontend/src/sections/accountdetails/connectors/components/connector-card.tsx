import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import boltIcon from '@iconify-icons/mdi/bolt';
import settingsIcon from '@iconify-icons/mdi/settings';
import plusCircleIcon from '@iconify-icons/mdi/plus-circle';
import checkCircleIcon from '@iconify-icons/mdi/check-circle';
import clockCircleIcon from '@iconify-icons/mdi/clock-outline';

import { Iconify } from 'src/components/iconify';

import { isNoneAuthType } from '../utils/auth';

import type { Connector } from '../types/types';

interface ConnectorCardProps {
  connector: Connector;
}

const ConnectorCard = ({ connector }: ConnectorCardProps) => {
  const navigate = useNavigate();
  const [isConfigFormOpen, setIsConfigFormOpen] = useState(false);

  const connectorImage = connector.iconPath;
  

  const {isActive} = connector;
  const {isConfigured} = connector;

  const getStatusConfig = () => {
    if (isActive) {
      return {
        label: 'Active',
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
        icon: checkCircleIcon,
      };
    }
    if (isConfigured) {
      return {
        label: 'Configured',
        color: 'text-amber-700 dark:text-amber-300',
        bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
        icon: clockCircleIcon,
      };
    }
    return {
      label: 'Setup Required',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/40 border-border',
      icon: settingsIcon,
    };
  };

  const statusConfig = getStatusConfig();

  const getActionConfig = () => {
    if (isActive) {
      return {
        text: 'Manage',
        icon: settingsIcon,
        variant: 'secondary' as const,
      };
    }
    if (isConfigured) {
      return {
        text: 'Manage',
        icon: settingsIcon,
        variant: 'secondary' as const,
      };
    }
    return {
      text: 'Configure',
      icon: plusCircleIcon,
      variant: 'primary' as const,
    };
  };

  const actionConfig = getActionConfig();

  const configureConnector = () => {
    navigate(`${connector.name}`);
  };

  const handleConfigFormClose = () => {
    setIsConfigFormOpen(false);
  };

  const handleConfigSuccess = () => {
    setIsConfigFormOpen(false);
    // Optionally refresh the connector data or show success message
    navigate(`${connector.name}`);
  };

  return (
    <div
      className="group relative flex h-full cursor-pointer flex-col rounded-2xl border border-border bg-background p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
      onClick={() => configureConnector()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') configureConnector();
      }}
      aria-label={`${connector.name} connector card`}
    >
      {isActive && (
        <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-green-500 ring-2 ring-background" />
      )}

      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="connector-avatar flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/40 transition-transform group-hover:scale-105">
            <img
              src={connectorImage}
              alt={connector.name}
              width={24}
              height={24}
              className="object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = connector.iconPath || '/assets/icons/connectors/default.svg';
              }}
            />
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold leading-none">{connector.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{connector.appGroup}</div>
          </div>
        </div>

        {/* Status */}
        <div className="flex justify-center">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
          >
            <Iconify icon={statusConfig.icon} width={13} height={13} />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* Features */}
        <div className="flex min-h-5 items-center justify-center gap-1.5">
          {!isNoneAuthType(connector.authType) && (
            <span className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {connector.authType.split('_').join(' ')}
            </span>
          )}
          {connector.supportsRealtime && (
            <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
              <Iconify icon={boltIcon} width={10} height={10} />
              Real-time
            </span>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1 w-1 rounded-full ${
                isConfigured ? 'bg-amber-500' : 'bg-muted-foreground/50'
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {isConfigured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1 w-1 rounded-full ${
                isActive ? 'bg-green-500' : 'bg-muted-foreground/50'
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Action */}
        <button
          type="button"
          className={`mt-auto inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
            actionConfig.variant === 'primary'
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            configureConnector();
          }}
          aria-label={`${actionConfig.text} ${connector.name}`}
        >
          <Iconify icon={actionConfig.icon} width={16} height={16} />
          {actionConfig.text}
        </button>
      </div>
    </div>
  );
};

export default ConnectorCard;