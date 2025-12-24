import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';

import { uploadClasses } from './classes';
import { UploadPlaceholder } from './components/placeholder';
import { RejectionFiles } from './components/rejection-files';
import { MultiFilePreview } from './components/preview-multi-file';
import { DeleteButton, SingleFilePreview } from './components/preview-single-file';

import type { UploadProps } from './types';

export function Upload({
  value,
  error,
  disabled,
  onDelete,
  onUpload,
  onRemove,
  thumbnail,
  helperText,
  onRemoveAll,
  className,
  multiple = false,
  ...other
}: UploadProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    multiple,
    disabled,
    ...other,
  });

  const isArray = Array.isArray(value) && multiple;

  const hasFile = !isArray && !!value;

  const hasFiles = isArray && !!value.length;

  const hasError = isDragReject || !!error;

  const renderMultiPreview = hasFiles && (
    <>
      <MultiFilePreview files={value} thumbnail={thumbnail} onRemove={onRemove} className="my-3" />

      {(onRemoveAll || onUpload) && (
        <div className="flex justify-end gap-1.5">
          {onRemoveAll && (
            <Button type="button" variant="outline" size="sm" onClick={onRemoveAll}>
              Remove all
            </Button>
          )}

          {onUpload && (
            <Button type="button" size="sm" onClick={onUpload}>
              <UploadIcon className="mr-2 h-4 w-4" />
              Upload
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className={cn(uploadClasses.upload, 'relative w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative cursor-pointer overflow-hidden rounded-md border border-dashed outline-none',
          'bg-muted/10 transition-all',
          'hover:opacity-70',
          isDragActive && 'opacity-70',
          disabled && 'pointer-events-none opacity-50',
          hasError && 'border-destructive bg-destructive/10 text-destructive',
          hasFile ? 'py-[28%]' : 'p-5'
        )}
      >
        <input {...getInputProps()} />

        {/* Single file */}
        {hasFile ? <SingleFilePreview file={value as File} /> : <UploadPlaceholder />}
      </div>

      {/* Single file */}
      {hasFile && <DeleteButton onClick={onDelete} />}

      {helperText && (
        <p className={cn('px-2 text-sm', error && 'text-destructive')}>{helperText}</p>
      )}

      <RejectionFiles files={fileRejections} />

      {/* Multi files */}
      {renderMultiPreview}
    </div>
  );
}
