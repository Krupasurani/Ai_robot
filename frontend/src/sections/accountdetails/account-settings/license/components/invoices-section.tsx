import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/locales';
import { Separator } from '@/components/ui/separator';
import { Download, ExternalLink } from 'lucide-react';

import type { Invoice, InvoiceStatus } from '../types';

interface InvoicesSectionProps {
  invoices: Invoice[];
}

export function InvoicesSection({ invoices }: InvoicesSectionProps) {
  const { t, currentLang } = useTranslate('settings');

  const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
    paid: {
      label: t('license.invoices.status.paid'),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    open: {
      label: t('license.invoices.status.open'),
      className: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    pending: {
      label: t('license.invoices.status.pending'),
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    failed: {
      label: t('license.invoices.status.failed'),
      className: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    },
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currentLang.value, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(currentLang.value, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="font-roboto text-lg font-medium text-foreground">{t('license.invoices.title')}</h2>
          <p className="font-roboto text-sm text-muted-foreground">
            {t('license.invoices.billing_history')}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 font-roboto text-muted-foreground hover:text-foreground">
          {t('license.invoices.view_all')}
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>

      <Separator className="bg-border/50" />

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-roboto text-sm text-muted-foreground">{t('license.invoices.no_invoices')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {invoices.map((invoice, index) => {
            const status = statusConfig[invoice.status];
            return (
              <div key={invoice.id}>
                <div className="group flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    {/* Simple document icon */}
                    <svg
                      className="h-5 w-5 text-muted-foreground"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <path
                        d="M12 2v4h4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6 10h8M6 14h5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div>
                      <p className="font-roboto text-sm font-medium text-foreground">
                        {formatDate(invoice.date)}
                      </p>
                      <p className="font-roboto text-xs text-muted-foreground">
                        {invoice.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className={cn('font-roboto text-xs font-normal', status.className)}
                    >
                      {status.label}
                    </Badge>
                    <span className="w-24 text-right font-roboto text-sm font-medium text-foreground">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </span>
                    {invoice.pdfUrl ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        asChild
                      >
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" strokeWidth={1.5} />
                        </a>
                      </Button>
                    ) : (
                      <div className="h-8 w-8" />
                    )}
                  </div>
                </div>
                {index < invoices.length - 1 && <Separator className="bg-border/30" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
