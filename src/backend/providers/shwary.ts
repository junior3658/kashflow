/**
 * Shwary Mobile Money adapter.
 *
 * The only live endpoint implemented here is the DRC collection endpoint
 * explicitly present in the integration sample supplied for this project:
 * POST /api/v1/merchants/payment[/sandbox]/DRC
 *
 * Payout and merchant-balance endpoints are deliberately not guessed.
 */

export type ShwaryMode = 'sandbox' | 'production';

export interface ShwaryEncashmentParams {
  amountCents: number;
  currency: 'CDF';
  customerPhone: string;
  operator?: 'vodacom' | 'airtel' | 'orange';
  reference?: string;
}

export interface ShwaryCollectionResult {
  requestId: string;
  status: 'PENDING_PROVIDER_CONFIRMATION';
  mode: ShwaryMode;
  providerResponse: unknown;
  message: string;
}

export class ShwaryAdapter {
  private readonly merchantId = process.env.SHWARY_MERCHANT_ID;
  private readonly merchantKey = process.env.SHWARY_MERCHANT_KEY;
  private readonly baseUrl = (process.env.SHWARY_BASE_URL || 'https://api.shwary.com').replace(/\/+$/, '');
  private readonly callbackUrl = process.env.SHWARY_CALLBACK_URL;
  private readonly mode: ShwaryMode = process.env.SHWARY_MODE === 'production' ? 'production' : 'sandbox';

  isConfigured(): boolean {
    return Boolean(this.merchantId && this.merchantKey && this.callbackUrl);
  }

  getCapabilities() {
    const configured = this.isConfigured();
    return {
      encashment: {
        supported: true,
        integrationReady: configured,
        mode: this.mode,
        country: 'DRC',
        currency: 'CDF',
        endpointDocumented: true,
      },
      b2cPayouts: {
        supported: true,
        integrationReady: false,
        status: 'BLOCKED_MISSING_ENDPOINT_SPEC',
        note: 'Merchant capability was reported, but the supplied integration sample does not document the payout endpoint or payload.',
      },
      merchantBalance: {
        supported: true,
        integrationReady: false,
        status: 'BLOCKED_MISSING_ENDPOINT_SPEC',
        note: 'Merchant balance capability was reported, but the supplied integration sample does not document its endpoint or response schema.',
      },
      reusedCollectedFunds: {
        supported: false,
        status: 'UNCONFIRMED_BOUNDARY',
        note: 'Do not use collected funds to finance payouts until Shwary confirms settlement and reuse permissions in writing.',
      },
    };
  }

  async requestEncashment(params: ShwaryEncashmentParams): Promise<ShwaryCollectionResult> {
    if (!this.isConfigured()) {
      throw new Error('Shwary is not configured. Set SHWARY_MERCHANT_ID and SHWARY_MERCHANT_KEY on the server. Set SHWARY_CALLBACK_URL to a public HTTPS callback endpoint.');
    }

    if (params.currency !== 'CDF') {
      throw new Error('The supplied Shwary integration sample documents the DRC collection flow in CDF only.');
    }

    if (!Number.isSafeInteger(params.amountCents) || params.amountCents <= 0 || params.amountCents % 100 !== 0) {
      throw new Error('Shwary sample expects a positive whole-number amount. Decimal CDF amounts are not supported by this adapter.');
    }

    const phone = params.customerPhone.replace(/[\s()-]/g, '');
    if (!/^\+243[0-9]{9}$/.test(phone)) {
      throw new Error('Invalid DRC phone number. Use international format +243 followed by 9 digits.');
    }

    const sandboxPath = this.mode === 'sandbox' ? '/sandbox' : '';
    const url = `${this.baseUrl}/api/v1/merchants/payment${sandboxPath}/DRC`;
    const payload: Record<string, unknown> = {
      amount: params.amountCents / 100,
      clientPhoneNumber: phone,
      callbackUrl: this.callbackUrl!,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-merchant-id': this.merchantId!,
        'x-merchant-key': this.merchantKey!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await response.text();
    let providerResponse: unknown;
    try {
      providerResponse = responseText ? JSON.parse(responseText) : null;
    } catch {
      providerResponse = { raw: responseText.slice(0, 2000) };
    }

    if (!response.ok) {
      // Never include request headers or credentials in provider error messages.
      throw new Error(`Shwary collection request failed (HTTP ${response.status}). Check merchant configuration and provider response in secure server logs.`);
    }

    // The supplied sample does not define a verifiable response schema or callback
    // signature contract. Therefore HTTP 2xx means "request accepted", not "paid".
    return {
      requestId: `shwary_req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'PENDING_PROVIDER_CONFIRMATION',
      mode: this.mode,
      providerResponse,
      message: 'Collection request accepted by the API. Await verified provider confirmation before crediting a wallet or marking the transaction successful.',
    };
  }

  async executePayout(): Promise<never> {
    throw new Error('Shwary B2C payout is not enabled: the supplied documentation does not specify its endpoint, payload or response contract.');
  }

  async getMerchantBalance(): Promise<never> {
    throw new Error('Shwary merchant balance retrieval is not enabled: the supplied documentation does not specify its endpoint or response contract.');
  }
}

export const shwaryAdapter = new ShwaryAdapter();
