import React from 'react';
import { User, Shield, CalendarClock, Database } from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import type { KnowledgeBase } from '../types/kb';

interface KBDetailsDrawerProps {
  kb: KnowledgeBase | null;
  open: boolean;
  onClose: () => void;
}

export default function KBDetailsDrawer({ kb, open, onClose }: KBDetailsDrawerProps) {
  const chartData = React.useMemo(() => {
    if (!kb?.metrics?.queries7d) {
      return Array.from({ length: 7 }, (_, i) => ({
        day: `Day ${i + 1}`,
        queries: (i + 1) * 2,
      }));
    }

    const queries7d = kb.metrics?.queries7d || 0;
    return Array.from({ length: 7 }, (_, i) => ({
      day: `Day ${i + 1}`,
      queries: Math.max(0, Math.round(queries7d / 7 + (i - 3) * 2)),
    }));
  }, [kb?.metrics?.queries7d]);

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'WRITER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] sm:max-w-[500px] p-0 overflow-y-auto"
      >
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="text-lg font-semibold">Knowledge Base Details</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            View detailed information about the knowledge base
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {!kb ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">No item selected</p>
              <p className="text-xs text-muted-foreground">
                Select a knowledge base to view its details
              </p>
            </div>
          ) : (
            <>
              {/* Header Section */}
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">{kb.name}</h3>
                <p className="text-xs font-mono text-muted-foreground break-all">{kb.id}</p>
              </div>

              <Separator />

              {/* Info Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Ownership Card */}
                <Card className="border-border">
                  <CardHeader className="pb-2.5 px-4 pt-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Ownership
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Role:</span>
                      <Badge variant={getRoleBadgeVariant(kb.userRole)} className="text-xs">
                        {kb.userRole || '—'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Visibility Card */}
                <Card className="border-border">
                  <CardHeader className="pb-2.5 px-4 pt-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Visibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <p className="text-sm text-foreground">{(kb as any).visibility || '—'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Timestamps Card - Full Width */}
              <Card className="border-border">
                <CardHeader className="pb-2.5 px-4 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Timestamps
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(kb.updatedAtTimestamp)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(kb.createdAtTimestamp)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Queries Chart Card - Full Width */}
              <Card className="border-border">
                <CardHeader className="pb-2.5 px-4 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Queries (7 days)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="h-[180px] sm:h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="queries"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
