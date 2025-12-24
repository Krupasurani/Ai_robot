import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Separator } from '@/components/ui/separator';

import { CONFIG } from 'src/config-global';

import {
  LicenseHeader,
  PlanOverviewCard,
  LicenseUsageCard,
  PaymentMethodCard,
  InvoicesSection,
} from 'src/sections/accountdetails/account-settings/license/components';
import {
  MOCK_LICENSE,
  MOCK_PAYMENT_METHOD,
  MOCK_INVOICES,
} from 'src/sections/accountdetails/account-settings/license/mock-data';
import type { LicenseOverview } from 'src/sections/accountdetails/account-settings/license/types';

const metadata = { title: `License & Billing | Dashboard - ${CONFIG.appName}` };

export default function LicenseBillingPage() {
  const [license, setLicense] = useState<LicenseOverview>(MOCK_LICENSE);

  const handleUpdateSeats = (newTotal: number) => {
    setLicense((prev) => ({
      ...prev,
      seatsTotal: newTotal,
    }));
  };

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <div className="min-h-full bg-background">
        {/* Header */}
        <LicenseHeader status={license.status} planName={license.planName} />

        {/* Main Content */}
        <div className="mx-auto max-w-4xl px-6 py-8">
          {/* Plan Overview Section */}
          <section>
            <PlanOverviewCard license={license} />
          </section>

          <Separator className="my-8 bg-border/50" />

          {/* Two Column Layout */}
          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <LicenseUsageCard license={license} onUpdateSeats={handleUpdateSeats} />
            </div>
            <div>
              <PaymentMethodCard paymentMethod={MOCK_PAYMENT_METHOD} />
            </div>
          </section>

          <Separator className="my-8 bg-border/50" />

          {/* Invoices Section */}
          <section>
            <InvoicesSection invoices={MOCK_INVOICES} />
          </section>

          {/* Help Section */}
          <div className="mt-12 border-t border-border/50 pt-8">
            <p className="font-roboto text-sm text-muted-foreground">
              Questions about billing?{' '}
              <a
                href="mailto:billing@workspace-ai.com"
                className="text-primary hover:underline"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
