import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface ConnectorLoadingSkeletonProps {
  showStats?: boolean;
}

const ConnectorLoadingSkeleton: React.FC<ConnectorLoadingSkeletonProps> = ({
  showStats = true,
}) => {
  return (
    <div className="container mx-auto py-4">
      <div className="rounded-lg border border-border bg-background overflow-hidden relative">
        {/* Header Skeleton */}
        <div className="p-4 border-b border-border bg-background">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-2/5" />
                <Skeleton className="h-5 w-3/5" />
              </div>
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-4 space-y-4">
          {/* Main Content Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Main Connector Card Skeleton */}
            <div className="md:col-span-8">
              <Card className="p-5 rounded-xl border">
                {/* Connector Info Skeleton */}
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-7 w-1/3" />
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-5 w-1/4" />
                      <Skeleton className="size-0.75 rounded-full" />
                      <Skeleton className="h-5 w-15 rounded-md" />
                      <Skeleton className="size-0.75 rounded-full" />
                      <Skeleton className="h-5 w-18 rounded-md" />
                    </div>
                  </div>
                </div>

                {/* Status Control Skeleton */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-2/5" />
                      <Skeleton className="h-4 w-3/5" />
                    </div>
                    <Skeleton className="h-8.5 w-14.5 rounded-full" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Actions Sidebar Skeleton */}
            <div className="md:col-span-4 space-y-3">
              {/* Quick Actions Skeleton */}
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </CardContent>
              </Card>

              {/* Connection Status Skeleton */}
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-3/5" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-1.5 rounded-full" />
                      <Skeleton className="h-4 w-2/5" />
                    </div>
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-1.5 rounded-full" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <Skeleton className="h-4 w-1/5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Info Alert Skeleton */}
          <Skeleton className="h-15 rounded-lg" />

          {/* Statistics Section Skeleton */}
          {showStats && (
            <div>
              <Skeleton className="h-6 w-2/5 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((_, index) => (
                  <Card key={index} className="p-4 rounded-xl border">
                    <Skeleton className="h-4 w-3/5 mb-2" />
                    <Skeleton className="h-6 w-2/5" />
                    <Skeleton className="h-3.5 w-4/5 mt-1" />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectorLoadingSkeleton;
