/**
 * Get background color for indexing status badge
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return '#22c55e'; // Green
    case 'IN_PROGRESS':
      return '#3b82f6'; // Blue
    case 'FAILED':
      return '#ef4444'; // Red
    case 'NOT_STARTED':
      return '#6b7280'; // Gray
    case 'FILE_TYPE_NOT_SUPPORTED':
      return '#f59e0b'; // Amber/Orange
    case 'AUTO_INDEX_OFF':
      return '#8b5cf6'; // Purple
    default:
      return '#6b7280'; // Gray
  }
};

/**
 * Get human-readable label for indexing status
 */
export const getStatusLabel = (status: string): string => {
  if (!status) return '';

  switch (status) {
    case 'FILE_TYPE_NOT_SUPPORTED':
      return 'Not Supported';
    case 'AUTO_INDEX_OFF':
      return 'Manual Sync';
    case 'NOT_STARTED':
      return 'Not Started';
    case 'IN_PROGRESS':
      return 'In Progress';
    default:
      return status
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
};
