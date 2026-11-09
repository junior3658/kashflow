# KASHFLOW — Financial Core & Double-Entry Ledger

## 1. Principles

1. **Double-Entry Invariant**: Every transaction is represented by at least one debit and one credit entry such that:
   $$\sum \text{Debits} = \sum \text{Credits}$$
2. **Immutability**: Posted ledger entries can never be modified or deleted. Erroneous postings are corrected through explicit, auditable reversal entries.
3. **Decimal Precision**: All currency amounts are handled with exact precision (calculated in base-10 cents or integer micro-units) to eliminate IEEE 754 floating-point rounding errors.
4. **Separation of Balances**:
   - **External Provider Balance**: Verified balance confirmed directly by an external provider API (e.g. PayPal sandbox balance, Shwary merchant account).
   - **Internal Accounting Ledger Balance**: Sum of all debits and credits settled in the KASHFLOW ledger.
   - **Estimated / Pending Balance**: Accounting balance adjusted for in-flight/pending transactions.
   - **Simulated Crypto Balance**: Explicitly labeled virtual asset balance held in the educational simulation desk.

---

## 2. Standard Chart of Accounts

| Account Code | Account Name | Type | Normal Balance | Description |
| :--- | :--- | :--- | :--- | :--- |
| `1010` | User Available Cash (USD) | Asset | Debit | User's tracked internal funds |
| `1020` | User Available Cash (EUR) | Asset | Debit | Euro wallet funds |
| `1030` | User Available Cash (CDF) | Asset | Debit | Congolese Franc wallet funds |
| `1050` | PayPal Transit Account | Asset | Debit | Funds held in transit during PayPal settlement |
| `1060` | Shwary Transit Account | Asset | Debit | Funds queued with mobile money gateway |
| `2010` | User Liability Deposit Account | Liability | Credit | Obligation to personal/business wallet holder |
| `4010` | Platform Fee Revenue | Revenue | Credit | Transaction and exchange processing fees earned |
| `5010` | Payment Gateway Expense | Expense | Debit | Provider processing fees paid to rails |

---

## 3. Transaction State Machine

```
                   +-------------+
                   |   CREATED   | (Draft created with quote)
                   +------+------+
                          |
                          v
                   +-------------+
                   |   PENDING   | (Awaiting user confirmation)
                   +------+------+
                          |
             +------------+------------+
             | User Confirms           | User Aborts
             v                         v
      +-------------+           +-------------+
      | PROCESSING  |           |  CANCELLED  |
      +------+------+           +-------------+
             |
     +-------+-------+
     |               |
     v               v
+-----------+  +-----------+
| SUCCEEDED |  |  FAILED   |
+-----+-----+  +-----------+
      |
      | (Optional Refund Request)
      v
+-----------+
| REFUNDED  |
+-----------+
```

### State Machine Rules
- Transitions must be strictly sequential.
- Only transactions in `SUCCEEDED` status generate permanent postings to the active ledger.
- A `REFUNDED` transaction creates an exact inverse double-entry transaction referencing the original `transaction_id`.
- Idempotency keys are checked at the `CREATED` boundary; repeated submissions with the same key return the existing record and state without initiating duplicate provider calls or ledger postings.
