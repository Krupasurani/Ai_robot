import { X } from 'lucide-react';
import { fData } from 'src/utils/format-number';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { uploadClasses } from '../classes';
import { fileData } from '../utils';

import type { MultiFilePreviewProps } from '../types';

function FileThumbnail({ file, className, ...props }: any) {
  const data = fileData(file);
  const previewUrl = typeof file === 'string' ? file : URL.createObjectURL(file);

  return (
    <div className={cn('relative overflow-hidden rounded border', className)} {...props}>
      <img src={previewUrl} alt={data.name} className="h-full w-full object-cover" />
    </div>
  );
}

export function MultiFilePreview({
  onRemove,
  lastNode,
  thumbnail,
  slotProps,
  firstNode,
  files = [],
  className,
}: MultiFilePreviewProps) {
  const renderFirstNode = firstNode && (
    <li className={cn(thumbnail && 'inline-flex')}>{firstNode}</li>
  );

  const renderLastNode = lastNode && <li className={cn(thumbnail && 'inline-flex')}>{lastNode}</li>;

  return (
    <ul
      className={cn(
        uploadClasses.uploadMultiPreview,
        'flex gap-1',
        thumbnail ? 'flex-row flex-wrap' : 'flex-col',
        className
      )}
    >
      {renderFirstNode}

      {files.map((file) => {
        const { name, size } = fileData(file);

        if (thumbnail) {
          return (
            <li key={name} className="inline-flex">
              <FileThumbnail
                tooltip
                imageView
                file={file}
                onRemove={() => onRemove?.(file)}
                className="h-20 w-20 border border-border/20"
                slotProps={{ icon: { width: 36, height: 36 } }}
                {...slotProps?.thumbnail}
              />
            </li>
          );
        }

        return (
          <li
            key={name}
            className="flex items-center gap-1.5 rounded-md border border-border/20 px-1.5 py-1"
          >
            <FileThumbnail file={file} {...slotProps?.thumbnail} />

            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">{fData(size)}</span>
            </div>

            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onRemove(file)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </li>
        );
      })}

      {renderLastNode}
    </ul>
  );
}
