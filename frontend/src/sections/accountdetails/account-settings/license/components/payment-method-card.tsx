import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslate } from '@/locales';
import { Pencil } from 'lucide-react';

import type { PaymentMethod, PaymentMethodType } from '../types';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod | null;
}

export function PaymentMethodCard({ paymentMethod }: PaymentMethodCardProps) {
  const { t } = useTranslate('settings');

  const cardBrandDisplay: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'Amex',
  };

  const paymentTypeLabel: Record<PaymentMethodType, string> = {
    card: t('license.payment.credit_card'),
    bank_transfer: t('license.payment.bank_transfer'),
    invoice: t('license.payment.invoice'),
  };

  if (!paymentMethod) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-roboto text-lg font-medium text-foreground">{t('license.payment.title')}</h2>
          <p className="font-roboto text-sm text-muted-foreground">
            {t('license.payment.no_method')}
          </p>
        </div>
        <Button className="font-roboto" size="sm">
          {t('license.payment.add_method')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="font-roboto text-lg font-medium text-foreground">{t('license.payment.title')}</h2>
          <p className="font-roboto text-sm text-muted-foreground">
            {paymentTypeLabel[paymentMethod.type]}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 font-roboto text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          {t('license.payment.edit')}
        </Button>
      </div>

      <Separator className="bg-border/50" />

      {/* Card Details */}
      {paymentMethod.type === 'card' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Simple card icon SVG */}
              <svg
                className="h-8 w-12 text-muted-foreground"
                viewBox="0 0 48 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="1"
                  y="1"
                  width="46"
                  height="30"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <rect x="1" y="8" width="46" height="6" fill="currentColor" opacity="0.15" />
                <rect x="6" y="20" width="12" height="2" rx="1" fill="currentColor" opacity="0.4" />
                <rect x="6" y="24" width="8" height="2" rx="1" fill="currentColor" opacity="0.4" />
              </svg>
              <div>
                <p className="font-roboto text-sm font-medium text-foreground">
                  {paymentMethod.brand && cardBrandDisplay[paymentMethod.brand.toLowerCase()]
                    ? cardBrandDisplay[paymentMethod.brand.toLowerCase()]
                    : paymentMethod.brand}{' '}
                  •••• {paymentMethod.last4}
                </p>
                {paymentMethod.expiryMonth && paymentMethod.expiryYear && (
                  <p className="font-roboto text-xs text-muted-foreground">
                    {t('license.payment.expires', {
                      date: `${String(paymentMethod.expiryMonth).padStart(2, '0')}/${String(paymentMethod.expiryYear).slice(-2)}`,
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentMethod.type === 'bank_transfer' && (
        <p className="font-roboto text-sm text-muted-foreground">
          {t('license.payment.bank_transfer_info')}
        </p>
      )}

      {paymentMethod.type === 'invoice' && (
        <p className="font-roboto text-sm text-muted-foreground">
          {t('license.payment.invoice_info')}
        </p>
      )}
    </div>
  );
}


