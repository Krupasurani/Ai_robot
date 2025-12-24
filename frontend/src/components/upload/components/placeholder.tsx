import { cn } from '@/utils/cn';

type UploadPlaceholderProps = {
  className?: string;
};

export function UploadPlaceholder({ className }: UploadPlaceholderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      <div className="flex flex-col gap-1">
        <h6 className="text-lg font-semibold">Drop or select file</h6>
        <p className="text-sm text-muted-foreground">
          Drop files here or click to
          <span className="mx-0.5 text-primary underline">browse</span>
          through your machine.
        </p>
      </div>
    </div>
  );
}
