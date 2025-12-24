export type PlanTier = 'starter' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'trial' | 'canceled' | 'past_due';
export type PaymentMethodType = 'card' | 'bank_transfer' | 'invoice';
export type InvoiceStatus = 'paid' | 'open' | 'pending' | 'failed';

export interface LicenseOverview {
  planName: string;
  planTier: PlanTier;
  billingCycle: BillingCycle;
  pricePerSeat: number;
  currency: string;
  seatsTotal: number;
  seatsUsed: number;
  status: SubscriptionStatus;
  nextBillingDate: string;
  trialEndsAt?: string;
}

export interface PaymentMethod {
  type: PaymentMethodType;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  pdfUrl?: string;
}

export interface BillingData {
  license: LicenseOverview;
  paymentMethod: PaymentMethod | null;
  invoices: Invoice[];
}




