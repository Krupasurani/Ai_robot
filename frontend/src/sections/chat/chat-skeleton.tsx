import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

type ChatSkeletonProps = {
  className?: string;
};

export function ChatNavItemSkeleton({
  className,
  amount = 6,
}: ChatSkeletonProps & { amount?: number }) {
  return (
    <>
      {Array.from({ length: amount }).map((_, index) => (
        <div key={index} className={cn('flex items-center gap-3 px-2.5 py-1.5', className)}>
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-2.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}

export function ChatHeaderSkeleton({ className }: ChatSkeletonProps) {
  return (
    <div className={cn('flex w-full items-center', className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="mx-2 flex flex-1 flex-col gap-1">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-10" />
      </div>
      <Skeleton className="h-7 w-7 rounded-full" />
      <Skeleton className="mx-1 h-7 w-7 rounded-full" />
      <Skeleton className="mr-1 h-7 w-7 rounded-full" />
    </div>
  );
}

export function ChatRoomSkeleton({ className }: ChatSkeletonProps) {
  return (
    <div className={cn('flex flex-1 pt-5', className)}>
      <div className="mx-auto flex flex-col items-center gap-2">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-2 h-2.5 w-2/3" />
        <Skeleton className="mb-4 h-2.5 w-1/3" />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
