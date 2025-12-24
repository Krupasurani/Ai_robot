import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Image } from '@/components/custom/image';
import { uploadClasses } from './classes';
import { RejectionFiles } from './components/rejection-files';
import type { UploadProps } from './types';

export function UploadAvatar({
  error,
  value,
  disabled,
  helperText,
  className,
  ...other
}: UploadProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    multiple: false,
    disabled,
    accept: { 'image/*': [] },
    ...other,
  });

  const hasFile = !!value;
  const hasError = isDragReject || !!error;
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (typeof value === 'string') {
      setPreview(value);
    } else if (value instanceof File) {
      setPreview(URL.createObjectURL(value));
    }
  }, [value]);

  const renderPreview = hasFile && (
    <Image alt="avatar" src={preview} className="h-full w-full rounded-full object-cover" />
  );

  const renderPlaceholder = (
    <div
      className={cn(
        'upload-placeholder absolute inset-0 z-[9] flex flex-col items-center justify-center gap-1 rounded-full',
        'bg-muted/10 text-muted-foreground transition-opacity',
        'hover:opacity-70',
        hasError && 'bg-destructive/10 text-destructive',
        hasFile && 'z-[9] opacity-0 bg-black/60 text-white',
        hasFile && 'group-hover:opacity-100'
      )}
    >
      <Camera className="h-8 w-8" />
      <span className="text-xs">{hasFile ? 'Update photo' : 'Upload photo'}</span>
    </div>
  );

  const renderContent = (
    <div className="relative h-full w-full overflow-hidden rounded-full">
      {renderPreview}
      {renderPlaceholder}
    </div>
  );

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          uploadClasses.uploadBox,
          'group m-auto h-36 w-36 cursor-pointer overflow-hidden rounded-full border border-dashed p-1',
          'border-border/20 transition-opacity',
          isDragActive && 'opacity-70',
          disabled && 'pointer-events-none opacity-50',
          hasError && 'border-destructive',
          hasFile && hasError && 'bg-destructive/10',
          className
        )}
      >
        <input {...getInputProps()} />

        {renderContent}
      </div>

      {helperText && <div className="mt-2 text-sm text-muted-foreground">{helperText}</div>}

      <RejectionFiles files={fileRejections} />
    </>
  );
}
