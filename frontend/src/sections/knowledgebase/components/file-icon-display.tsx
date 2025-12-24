import React from 'react';
import { getRecordIcon } from './file-type-icons';

interface FileIconDisplayProps {
  extension?: string;
  type: string;
  mimeType?: string;
  recordType?: string;
  origin?: string;
  size?: number;
  className?: string;
}

/**
 * Component to display file/folder icon with appropriate color
 */
export const FileIconDisplay: React.FC<FileIconDisplayProps> = ({
  extension,
  type,
  mimeType,
  recordType,
  origin,
  size = 26,
  className,
}) => {
  // Map type to recordType if not provided
  const effectiveRecordType = recordType || (type === 'folder' ? 'FOLDER' : 'FILE');

  const IconComponent = getRecordIcon(
    effectiveRecordType,
    extension,
    mimeType,
    origin
  );

  return (
    <IconComponent
      size={size}
      className={className}
    />
  );
};
