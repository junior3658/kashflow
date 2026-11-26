/**
 * PayPal adapter boundary.
 *
 * The current project has no verified PayPal OAuth/order/capture integration or
 * webhook verification contract. Every operation fails closed until those
 * official specifications and the complete persistence/reconciliation flow are
 * implemented. No placeholder credentials or simulated provider success are used.
 */

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

export class PayPalSandboxAdapter {
  async createOrder(_params: {
    amountCents: number;
    currency: Currency;
    description: string;
    customId?: string;
  }): Promise<never> {
    throw new Error('PayPal order creation is disabled: no verified OAuth and official order API integration is configured.');
  }

  async captureOrder(_orderId: string): Promise<never> {
    throw new Error('PayPal capture is disabled until order ownership, verified capture records, idempotency and atomic ledger settlement are implemented.');
  }

  async verifyWebhookSignature(_headers: {
    transmissionId?: string;
    timestamp?: string;
    webhookId?: string;
    signature?: string;
    certUrl?: string;
  }, _body: unknown): Promise<{ isValid: false; reason: string }> {
    return {
      isValid: false,
      reason: 'PayPal webhook signature verification is not implemented; the event is rejected.',
    };
  }
}

export const paypalAdapter = new PayPalSandboxAdapter();
