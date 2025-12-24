import React from 'react';
import { RefreshCw } from 'lucide-react';
import { RecordActionButton } from './record-action-button';

const getReindexButtonText = (status: string): string => {
  switch (status) {
    case 'FAILED':
      return 'Retry Indexing';
    case 'FILE_TYPE_NOT_SUPPORTED':
      return 'File Not Supported';
    case 'AUTO_INDEX_OFF':
      return 'Enable Indexing';
    case 'NOT_STARTED':
      return 'Start Indexing';
    default:
      return 'Reindex';
  }
};

const getReindexTooltip = (status: string): string => {
  switch (status) {
    case 'FAILED':
      return 'Document indexing failed. Click to retry.';
    case 'FILE_TYPE_NOT_SUPPORTED':
      return 'This file type is not supported for indexing';
    case 'AUTO_INDEX_OFF':
      return 'Document indexing is turned off';
    case 'NOT_STARTED':
      return 'Document indexing has not started yet';
    case 'IN_PROGRESS':
      return 'Document is currently being indexed';
    case 'COMPLETED':
      return 'Document has been successfully indexed. Click to reindex.';
    default:
      return 'Reindex document to update search indexes';
  }
};

interface RecordReindexButtonProps {
  indexingStatus: string;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const RecordReindexButton: React.FC<RecordReindexButtonProps> = ({
  indexingStatus,
  onClick,
  disabled = false,
  compact = false,
}) => {
  const isFailed = indexingStatus === 'FAILED';
  const variant = isFailed ? 'outline' : 'outline';
  const className = isFailed
    ? 'border-amber-500 text-amber-600 hover:border-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950/20'
    : '';

  return (
    <RecordActionButton
      icon={RefreshCw}
      label={compact && indexingStatus !== 'FAILED' ? 'Sync' : getReindexButtonText(indexingStatus)}
      onClick={onClick}
      variant={variant}
      disabled={disabled}
      tooltip={getReindexTooltip(indexingStatus)}
      className={className}
      compact={compact}
    />
  );
};
