import axios, { AxiosError, Method } from 'axios';
import crypto from 'node:crypto';
import { injectable } from 'inversify';
import { AppConfig } from '../../tokens_manager/config/config';
import {
  BadRequestError,
  InternalServerError,
} from '../../../libs/errors/http.errors';

export interface LicenseOverview {
  id: string;
  orgId: string;
  planId?: string;
  planName?: string;
  seatsTotal: number;
  seatsUsed: number;
  seatsAvailable: number;
  status: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSubscriptionPayload {
  priceId?: string;
  seatsTotal: number;
}

export interface InvoiceItem {
  id: string;
  stripeInvoiceId: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  hostedInvoiceUrl?: string;
  pdf?: string;
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
}

export interface PaginatedInvoices {
  items: InvoiceItem[];
  total: number;
}

interface LicenseRequestOptions {
  authToken?: string;
}

@injectable()
export class LicenseHttpService {
  private readonly apiKey?: string;

  private readonly hmacSecret?: string;

  constructor(private readonly appConfig: AppConfig) {
    this.apiKey = appConfig.licenseBackendApiKey;
    this.hmacSecret = appConfig.licenseBackendHmacSecret;
  }

  private get baseUrl(): string {
    return this.appConfig.licenseBackend.replace(/\/+$/, '');
  }

  async getOverview(orgId: string, options?: LicenseRequestOptions): Promise<LicenseOverview> {
    try {
      return await this.request<LicenseOverview>(
        'GET',
        `/api/v1/billing/${orgId}/license`,
        undefined,
        options,
      );
    } catch (error) {
      this.handleAxiosError(error, 'Failed to fetch license overview');
    }
  }

  async updateSubscription(
    orgId: string,
    payload: UpdateSubscriptionPayload,
    options?: LicenseRequestOptions,
  ): Promise<LicenseOverview> {
    try {
      return await this.request<LicenseOverview>(
        'POST',
        `/api/v1/billing/${orgId}/license/seats`,
        {
          seatsTotal: payload.seatsTotal,
          priceId: payload.priceId,
        },
        options,
      );
    } catch (error) {
      this.handleAxiosError(error, 'Failed to update license subscription');
    }
  }

  async ensureSeat(
    orgId: string,
    userId: string,
    userEmail: string,
    options?: LicenseRequestOptions,
  ): Promise<void> {
    try {
      await this.request(
        'POST',
        `/api/v1/billing/${orgId}/license/assign`,
        {
          userId,
          userEmail,
        },
        options,
      );
    } catch (error) {
      this.handleAxiosError(error, 'Failed to assign license seat');
    }
  }

  async releaseSeat(orgId: string, userId: string, options?: LicenseRequestOptions): Promise<void> {
    try {
      await this.request(
        'DELETE',
        `/api/v1/billing/${orgId}/license/users/${userId}`,
        undefined,
        options,
      );
    } catch (error) {
      this.handleAxiosError(error, 'Failed to release license seat');
    }
  }

  async getInvoices(orgId: string, options?: LicenseRequestOptions): Promise<PaginatedInvoices> {
    try {
      return await this.request<PaginatedInvoices>(
        'GET',
        `/api/v1/billing/${orgId}/invoices`,
        undefined,
        options,
      );
    } catch (error) {
      this.handleAxiosError(error, 'Failed to fetch invoices');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  private handleAxiosError(error: unknown, defaultMessage: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status;
      const code = axiosError.response?.data?.code;
      const message =
        (axiosError.response?.data as any)?.message || axiosError.message;

      if (status === 409 && code === 'NO_FREE_LICENSES') {
        throw new BadRequestError('NO_FREE_LICENSES');
      }

      throw new InternalServerError(
        `${defaultMessage}: ${message || 'Unexpected error'}`,
      );
    }

    throw new InternalServerError(defaultMessage);
  }

  private async request<T>(
    method: Method,
    path: string,
    payload?: any,
    options?: LicenseRequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.buildHeaders(payload, options?.authToken);
    const config = {
      method,
      url,
      timeout: 10000,
      headers,
      data: payload,
    } as any;
    if (method === 'GET' || method === 'DELETE') {
      delete config.data;
    }
    const response = await axios.request<T>(config);
    return response.data;
  }

  private buildHeaders(payload?: any, authToken?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (authToken) {
      headers.Authorization = authToken;
      return headers;
    }

    if (!this.apiKey || !this.hmacSecret) {
      throw new InternalServerError('License server credentials are not configured');
    }

    const nonce = crypto.randomUUID();
    const timestamp = Date.now().toString();
    const bodyString = payload ? JSON.stringify(payload) : '';
    const signature = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(`${this.apiKey}${nonce}${timestamp}${bodyString}`)
      .digest('hex');

    headers['X-API-Key'] = this.apiKey;
    headers['X-Nonce'] = nonce;
    headers['X-Timestamp'] = timestamp;
    headers['X-Body-HMAC'] = signature;

    return headers;
  }
}


