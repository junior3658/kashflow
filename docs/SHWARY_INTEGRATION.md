# KASHFLOW — Shwary Mobile Money Integration

## 1. Source and scope

This implementation is based on the Shwary integration sample supplied with the project. The sample documents one concrete endpoint:

- **DRC collection / encashment**
- Sandbox: `POST https://api.shwary.com/api/v1/merchants/payment/sandbox/DRC`
- Production: `POST https://api.shwary.com/api/v1/merchants/payment/DRC`

The sample documents these headers:

- `x-merchant-id`: merchant UUID
- `x-merchant-key`: merchant secret
- `Content-Type: application/json`

And this JSON payload:

```json
{
  "amount": 100,
  "clientPhoneNumber": "+243XXXXXXXXX",
  "callbackUrl": "https://your-public-domain.example/api/callback"
}
```

The supplied sample's form labels the amount as CDF and converts it to an integer. Accordingly, the current KASHFLOW adapter restricts this documented DRC collection flow to positive whole-number CDF amounts and DRC phone numbers in international format. The sample does not specify an operator field, so KASHFLOW does not invent or send one.

## 2. Implemented in KASHFLOW

- Server-side Shwary HTTP client in `src/backend/providers/shwary.ts`.
- Sandbox by default; production path requires explicit configuration.
- Merchant credentials are read only from server environment variables.
- Request timeout and HTTP error handling.
- Credentials are never returned to the browser or included in provider error messages.
- API route: `POST /api/v1/payments/shwary/encashment`.
- Capabilities endpoint: `GET /api/v1/payments/shwary/capabilities`.

A successful HTTP response is treated as **request accepted / awaiting provider confirmation**, not as proof that the customer completed the USSD approval or that funds settled. KASHFLOW therefore does not credit a wallet or post a successful ledger transaction from the collection request response.

## 3. Environment variables

Configure these values in a local, untracked `.env` file or in your hosting provider's secret manager:

```env
SHWARY_MERCHANT_ID=
SHWARY_MERCHANT_KEY=
SHWARY_BASE_URL=https://api.shwary.com
SHWARY_MODE=sandbox
SHWARY_CALLBACK_URL=
```

- `SHWARY_MODE=sandbox` is the default.
- Use `SHWARY_MODE=production` only after Shwary has enabled production access.
- Production mode requires a public HTTPS `SHWARY_CALLBACK_URL`.
- Never commit `.env`, merchant IDs/keys, PayPal secrets or any other credentials.

## 4. API request example

```http
POST /api/v1/payments/shwary/encashment
Content-Type: application/json
```

```json
{
  "amount": 100,
  "currency": "CDF",
  "phone": "+243XXXXXXXXX"
}
```

The backend responds with HTTP `202 Accepted` when Shwary returns a successful HTTP status. The response status is `PENDING_PROVIDER_CONFIRMATION`. This is deliberately not `SUCCEEDED`.

## 5. Capabilities reported by the merchant

The merchant account has reported these capabilities:

| Capability | Merchant capability | KASHFLOW integration status |
|---|---|---|
| Encashment / collection | Confirmed | Endpoint implemented from supplied sample |
| B2C payouts | Confirmed | Blocked until official endpoint, request and response schema are supplied |
| Merchant balance | Confirmed | Blocked until official endpoint and response schema are supplied |
| Reuse of collected funds for payouts | Unknown | Not assumed or enabled |

The uploaded sample does not document B2C payout or merchant-balance endpoints. KASHFLOW intentionally does not guess URLs, payload fields, status codes or response schemas. The adapter reports these capabilities as not yet integration-ready.

Collected funds must remain separate from payout liquidity until Shwary confirms settlement and reuse permissions in writing.

## 6. Callback and settlement safety

The supplied sample contains a callback URL field, but it does not describe callback authentication, signature headers, event schema, retry behavior or event identifiers.

Therefore:
- Do not treat an incoming callback as trusted solely because it reaches the endpoint.
- Do not mark a transaction `SUCCEEDED` based on an unsigned callback.
- Do not credit an internal wallet until a documented and independently verifiable provider confirmation has been implemented.
- Before production settlement, obtain Shwary's callback signature specification and reconciliation procedure.

## 7. Remaining information required from Shwary

To complete the remaining mobile-money workflows, obtain official documentation for:

1. B2C payout endpoint, HTTP method, headers, payload, accepted operators/currencies, response schema and error codes.
2. Merchant balance endpoint and exact available/pending balance response fields.
3. Collection status inquiry endpoint or authenticated callback signature specification.
4. Provider transaction/reference identifiers and idempotency support.
5. Settlement timing and written permission (or prohibition) for reusing collected funds for payouts.
6. Production base URL, IP allowlisting requirements, rate limits and timeout/retry guidance.

Until those details are received, only the documented DRC collection request is enabled.
