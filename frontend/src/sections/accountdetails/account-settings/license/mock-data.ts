import type { BillingData, Invoice, LicenseOverview, PaymentMethod } from './types';

// Helper to generate dates
const getDateString = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

export const MOCK_LICENSE: LicenseOverview = {
  planName: 'Workspace AI Pro',
  planTier: 'pro',
  billingCycle: 'monthly',
  pricePerSeat: 29,
  currency: 'EUR',
  seatsTotal: 25,
  seatsUsed: 18,
  status: 'active',
  nextBillingDate: getDateString(14),
};

export const MOCK_PAYMENT_METHOD: PaymentMethod = {
  type: 'card',
  last4: '4242',
  brand: 'Visa',
  expiryMonth: 12,
  expiryYear: 2026,
};

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_2024_001',
    date: getDateString(-2),
    description: 'Workspace AI Pro - December 2024',
    amount: 52200,
    currency: 'EUR',
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv_2024_002',
    date: getDateString(-32),
    description: 'Workspace AI Pro - November 2024',
    amount: 52200,
    currency: 'EUR',
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv_2024_003',
    date: getDateString(-62),
    description: 'Workspace AI Pro - October 2024',
    amount: 46400,
    currency: 'EUR',
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv_2024_004',
    date: getDateString(-92),
    description: 'Workspace AI Pro - September 2024',
    amount: 46400,
    currency: 'EUR',
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv_2024_005',
    date: getDateString(-122),
    description: 'Workspace AI Pro - August 2024',
    amount: 43500,
    currency: 'EUR',
    status: 'paid',
    pdfUrl: '#',
  },
];

export const MOCK_BILLING_DATA: BillingData = {
  license: MOCK_LICENSE,
  paymentMethod: MOCK_PAYMENT_METHOD,
  invoices: MOCK_INVOICES,
};




