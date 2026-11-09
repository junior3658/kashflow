# KASHFLOW — Shwary Mobile Money Integration Boundary

## 1. Documented Capabilities & Current Boundary

**Shwary** is a regional mobile money and payments aggregation gateway operating predominantly in Central Africa (Democratic Republic of Congo / CDF and USD corridors).

### Confirmed Capabilities
1. **Encashment (C2B / Inbound Collection)**: Verified available. Users initiate collection from mobile money wallets (Vodacom M-Pesa, Airtel Money, Orange Money).
2. **B2C Payouts (Outbound Disbursement)**: Verified available. Merchants trigger payouts to individual mobile money numbers.
3. **Merchant Balance Consultation**: Verified available. Retrieval of current available and pending balances.

### Unconfirmed / Boundary Limitations
- **Reuse of Collected Funds**: **UNKNOWN / UNVERIFIED**. It is not established whether collected customer funds can be directly disbursed for B2C payouts without intermediary banking settlement.
- **Architectural Boundary Rule**: KASHFLOW explicitly quarantines Shwary collections in transit accounts (`1060 Shwary Transit Account`) and does NOT assume automatic balance reuse until official settlement clearance is confirmed.

---

## 2. API Contract & Adapter

```typescript
export interface ShwaryProviderConfig {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

export interface ShwaryEncashmentRequest {
  amount: number;
  currency: 'USD' | 'CDF';
  customerPhone: string;
  operator: 'vodacom' | 'airtel' | 'orange';
  reference: string;
}
```

*When live API credentials are not provisioned in the current environment, the Shwary Adapter operates in transparent Sandbox mode with strict validation of phone formats and currency constraints.*
