import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { uploadClasses } from '../classes';

import type { SingleFilePreviewProps } from '../types';

export function SingleFilePreview({ file, className, ...other }: SingleFilePreviewProps) {
  const fileName = typeof file === 'string' ? file : file.name;
  const previewUrl = typeof file === 'string' ? file : URL.createObjectURL(file);

  return (
    <div
      className={cn(uploadClasses.uploadSinglePreview, 'absolute inset-0 p-1', className)}
      {...other}
    >
      <img alt={fileName} src={previewUrl} className="h-full w-full rounded-md object-cover" />
    </div>
  );
}

type DeleteButtonProps = {
  className?: string;
  onClick?: () => void;
};

export function DeleteButton({ className, onClick }: DeleteButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'absolute right-4 top-4 z-[9] h-8 w-8',
        'bg-black/70 text-white/80 hover:bg-black/50',
        className
      )}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
