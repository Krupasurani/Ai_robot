import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

import { uploadClasses } from './classes';
import type { UploadProps } from './types';

export function UploadBox({ placeholder, error, disabled, className, ...other }: UploadProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    disabled,
    ...other,
  });

  const hasError = isDragReject || error;

  return (
    <div
      {...getRootProps()}
      className={cn(
        uploadClasses.uploadBox,
        'flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed',
        'bg-muted/10 text-muted-foreground',
        'transition-opacity hover:opacity-70',
        isDragActive && 'opacity-70',
        disabled && 'pointer-events-none opacity-50',
        hasError && 'border-destructive bg-destructive/10 text-destructive',
        className
      )}
    >
      <input {...getInputProps()} />

      {placeholder || <UploadIcon className="h-7 w-7" />}
    </div>
  );
}
