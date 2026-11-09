/**
 * KASHFLOW Provider Routing Engine
 * Dynamically evaluates payment corridors, fees, provider capabilities, and currency support.
 */

import { Currency, TransactionType } from '../types';
import { shwaryAdapter } from './shwary';

export interface ProviderRouteOption {
  provider: 'PAYPAL' | 'SHWARY' | 'INTERNAL' | 'EXCHANGE_DESK';
  name: string;
  description: string;
  estimatedFeeCents: number;
  totalDebitCents: number;
  settlementTime: string;
  isAvailable: boolean;
  unavailabilityReason?: string;
  isRecommended?: boolean;
}

export class ProviderRouter {
  static getRouteOptions(params: {
    type: TransactionType;
    amountCents: number;
    currency: Currency;
    destinationType?: 'BANK' | 'MOBILE_MONEY' | 'PAYPAL' | 'INTERNAL_WALLET';
  }): ProviderRouteOption[] {
    const options: ProviderRouteOption[] = [];

    // 1. Shwary Mobile Money (Dominant for CDF and DRC USD)
    const isShwaryEligible = params.currency === 'CDF' || params.currency === 'USD';
    const shwaryFee = Math.round(params.amountCents * 0.015); // 1.5%
    options.push({
      provider: 'SHWARY',
      name: 'Shwary Mobile Money (M-Pesa / Airtel / Orange)',
      description: 'Direct mobile wallet push and instant phone disbursements',
      estimatedFeeCents: shwaryFee,
      totalDebitCents: params.amountCents + shwaryFee,
      settlementTime: 'Instant (~15 seconds)',
      isAvailable: isShwaryEligible,
      unavailabilityReason: isShwaryEligible ? undefined : 'Shwary rails only support USD and CDF.',
      isRecommended: params.currency === 'CDF' || params.destinationType === 'MOBILE_MONEY',
    });

    // 2. PayPal Rails (Dominant for global USD and EUR)
    const isPayPalEligible = params.currency === 'USD' || params.currency === 'EUR';
    const paypalFee = Math.round(params.amountCents * 0.029) + 30; // 2.9% + $0.30
    options.push({
      provider: 'PAYPAL',
      name: 'PayPal Global Payments (Cards & Wallet)',
      description: 'Global credit/debit card checkout and PayPal balance transfer',
      estimatedFeeCents: paypalFee,
      totalDebitCents: params.amountCents + paypalFee,
      settlementTime: 'Instant to 1 business day',
      isAvailable: isPayPalEligible,
      unavailabilityReason: isPayPalEligible ? undefined : 'PayPal rails do not support Congolese Francs (CDF).',
      isRecommended: params.currency === 'EUR' || params.destinationType === 'PAYPAL',
    });

    // 3. Internal Ledger P2P / Multi-Tenant
    options.push({
      provider: 'INTERNAL',
      name: 'KASHFLOW Internal Ledger',
      description: 'Zero-fee instant transfer to any verified KASHFLOW user or organization account',
      estimatedFeeCents: 0,
      totalDebitCents: params.amountCents,
      settlementTime: 'Immediate (Atomic Ledger)',
      isAvailable: true,
      isRecommended: params.destinationType === 'INTERNAL_WALLET',
    });

    return options;
  }
}
