/**
 * PayPal REST v2 adapter.
 * Real OAuth, order creation, capture and remote webhook verification.
 * Provider capture is NOT the same thing as KASHFLOW ledger settlement.
 */
import { randomUUID } from 'node:crypto';
import { Currency } from '../types';

export interface PayPalOrderResponse {
  orderId: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  amount: number;
  currency: Currency;
  approvalUrl: string;
}
export interface PayPalCaptureResponse {
  captureId: string;
  status: 'COMPLETED' | 'DECLINED' | 'FAILED' | 'PENDING';
  amount: number;
  currency: Currency;
  createTime: string;
}
type PayPalJson = Record<string, any>;

export class PayPalAdapter {
  private readonly clientId = process.env.PAYPAL_CLIENT_ID;
  private readonly clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  private readonly baseUrl = (process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com').replace(/\\/+$/, '');
  private readonly webhookId = process.env.PAYPAL_WEBHOOK_ID;
  private accessToken?: string;
  private tokenExpiresAt = 0;

  isConfigured(): boolean {
    if (!this.clientId || !this.clientSecret) return false;
    try {
      const url = new URL(this.baseUrl);
      return url.protocol === 'https:' && ['api-m.sandbox.paypal.com', 'api-m.paypal.com'].includes(url.hostname);
    } catch { return false; }
  }

  getCapabilities() {
    return {
      configured: this.isConfigured(),
      mode: this.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
      orderCreation: this.isConfigured(),
      capture: this.isConfigured(),
      webhookVerification: this.isConfigured() && Boolean(this.webhookId),
      walletSettlement: false,
      note: 'Provider API connectivity is separate from KASHFLOW ledger settlement. A capture is not credited to a wallet until ownership, amount, currency and provider status are verified and durably posted.',
    };
  }

  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) throw new Error('PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on the server and use the official sandbox or live API host.');
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30_000) return this.accessToken;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ({})) as PayPalJson;
    if (!response.ok || typeof payload.access_token !== 'string') {
      throw new Error(`PayPal OAuth failed (HTTP ${response.status}). Check API credentials and account access.`);
    }
    this.accessToken = payload.access_token;
    this.tokenExpiresAt = Date.now() + Math.max(60, Number(payload.expires_in) || 300) * 1000;
    return this.accessToken;
  }

  private async request(path: string, init: RequestInit = {}): Promise<PayPalJson> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) },
      signal: init.signal || AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({})) as PayPalJson;
    if (!response.ok) {
      const issue = typeof payload.name === 'string' ? payload.name : 'provider_error';
      throw new Error(`PayPal request failed (HTTP ${response.status}; ${issue}).`);
    }
    return payload;
  }

  async createOrder(params: {
    amountCents: number; currency: Currency; description: string; customId?: string;
    returnUrl?: string; cancelUrl?: string; requestId?: string;
  }): Promise<PayPalOrderResponse> {
    if (!Number.isSafeInteger(params.amountCents) || params.amountCents <= 0) throw new Error('PayPal amount must be a positive integer in minor currency units.');
    if (!['USD', 'EUR'].includes(params.currency)) throw new Error('PayPal checkout currently supports USD and EUR only. CDF is not supported.');
    const returnUrl = params.returnUrl || process.env.PAYPAL_RETURN_URL;
    const cancelUrl = params.cancelUrl || process.env.PAYPAL_CANCEL_URL;
    if (!returnUrl || !cancelUrl) throw new Error('Set PAYPAL_RETURN_URL and PAYPAL_CANCEL_URL to public HTTPS application URLs.');
    for (const candidate of [returnUrl, cancelUrl]) {
      if (new URL(candidate).protocol !== 'https:') throw new Error('PayPal return and cancel URLs must use HTTPS.');
    }

    const payload = await this.request('/v2/checkout/orders', {
      method: 'POST',
      headers: { 'PayPal-Request-Id': params.requestId || randomUUID() },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          ...(params.customId ? { custom_id: params.customId.slice(0, 127) } : {}),
          description: params.description.slice(0, 127),
          amount: { currency_code: params.currency, value: (params.amountCents / 100).toFixed(2) },
        }],
        application_context: { return_url: returnUrl, cancel_url: cancelUrl, user_action: 'PAY_NOW' },
      }),
    });
    const approval = Array.isArray(payload.links) ? payload.links.find((link: any) => link.rel === 'approve' || link.rel === 'payer-action') : undefined;
    if (!payload.id || !approval?.href) throw new Error('PayPal returned an incomplete order response.');
    return { orderId: payload.id, status: payload.status, amount: params.amountCents, currency: params.currency, approvalUrl: approval.href };
  }

  async captureOrder(orderId: string): Promise<PayPalCaptureResponse> {
    if (!orderId || !/^[A-Z0-9-]{8,64}$/i.test(orderId)) throw new Error('Invalid PayPal order ID.');
    const payload = await this.request(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST', headers: { 'PayPal-Request-Id': randomUUID() }, body: '{}',
    });
    const capture = payload.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture?.id || !capture?.amount?.currency_code || !capture?.amount?.value) {
      throw new Error('PayPal capture response is missing the capture identifier or monetary details.');
    }
    const amount = Number(capture.amount.value);
    const amountCents = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountCents) || Math.abs(amount * 100 - amountCents) > 0.000001) throw new Error('PayPal returned an invalid capture amount.');
    const status = capture.status === 'COMPLETED' ? 'COMPLETED' : capture.status === 'PENDING' ? 'PENDING' : capture.status === 'DECLINED' ? 'DECLINED' : 'FAILED';
    return { captureId: capture.id, status, amount: amountCents, currency: capture.amount.currency_code as Currency, createTime: capture.create_time || new Date().toISOString() };
  }

  async verifyWebhookSignature(headers: {
    transmissionId?: string; timestamp?: string; webhookId?: string; signature?: string; certUrl?: string; authAlgo?: string;
  }, body: PayPalJson): Promise<{ isValid: boolean; reason?: string }> {
    if (!this.webhookId) return { isValid: false, reason: 'PAYPAL_WEBHOOK_ID is not configured.' };
    if (!headers.transmissionId || !headers.timestamp || !headers.signature || !headers.certUrl || !headers.authAlgo) {
      return { isValid: false, reason: 'Required PayPal transmission headers are missing.' };
    }
    try {
      const result = await this.request('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: headers.authAlgo, cert_url: headers.certUrl, transmission_id: headers.transmissionId,
          transmission_sig: headers.signature, transmission_time: headers.timestamp,
          webhook_id: this.webhookId, webhook_event: body,
        }),
      });
      return result.verification_status === 'SUCCESS' ? { isValid: true } : { isValid: false, reason: 'PayPal rejected the webhook signature.' };
    } catch {
      return { isValid: false, reason: 'PayPal webhook verification service could not be reached.' };
    }
  }
}
export const paypalAdapter = new PayPalAdapter();
