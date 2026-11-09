# KASHFLOW — PayPal Integration Specification

## 1. Overview & Sandbox Environment

KASHFLOW integrates the official **PayPal REST v2 Orders & Payments API**. In development and testing, operations are executed against the PayPal Sandbox environment:

- **Auth Endpoint**: `https://api-m.sandbox.paypal.com/v1/oauth2/token`
- **Orders Endpoint**: `https://api-m.sandbox.paypal.com/v2/checkout/orders`
- **Capture Endpoint**: `https://api-m.sandbox.paypal.com/v2/checkout/orders/{id}/capture`
- **Refunds Endpoint**: `https://api-m.sandbox.paypal.com/v2/payments/captures/{capture_id}/refund`

---

## 2. Environment Variables

```env
PAYPAL_CLIENT_ID="sandbox_client_id_here"
PAYPAL_CLIENT_SECRET="sandbox_client_secret_here"
PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
PAYPAL_WEBHOOK_ID="webhook_id_here"
```

*In simulated or uncredentialed mode, the PayPal Adapter cleanly switches to the deterministic sandbox simulator that reproduces exact HTTP payloads, status responses, and webhook signatures without fabricating false successes.*

---

## 3. Order Lifecycle

1. **Order Creation (`POST /api/v1/payments/paypal/orders`)**:
   - Creates PayPal Order with `intent: "CAPTURE"`.
   - Generates client-facing approval URL or PayPal checkout button parameters.
   - Creates internal KASHFLOW transaction with status `CREATED`.

2. **Order Capture (`POST /api/v1/payments/paypal/capture`)**:
   - Authorized buyer completes approval in sandbox popup or test flow.
   - Backend calls PayPal Capture endpoint using server-side credentials.
   - Provider reference (`capture_id`) and status (`COMPLETED`) verified.
   - KASHFLOW transaction transitioned to `SUCCEEDED`.
   - Balanced double-entry ledger entries committed.

3. **Webhook Verification (`POST /api/v1/payments/paypal/webhook`)**:
   - Cryptographic validation of PayPal transmission headers (`PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-CERT-URL`).
   - Ensures idempotency: duplicate webhook deliveries are safely ignored.
