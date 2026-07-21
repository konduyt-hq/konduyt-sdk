# Konduyt SDK

One integration. Every payment. Everywhere.

The Konduyt SDK is the public interface to the Konduyt Money Intelligence Engine.
Developers write business actions. Konduyt decides which provider to use, routes intelligently, handles retries, and explains every decision.

---

## Two SDKs. One boundary.

| | Client SDK | Server SDK |
|---|---|---|
| **Key type** | Publishable key (`pk_...`) | Secret key (`sk_...`) |
| **Environment** | Browser, mobile, frontend | Node.js, server only |
| **Checkout** | ✓ | — |
| **Provider recommendation** | ✓ | — |
| **Transaction status** | ✓ | ✓ |
| **List transactions** | ✗ | ✓ |
| **Refunds** | ✗ | ✓ |
| **Customer management** | ✗ | ✓ |
| **People management** | ✗ | ✓ |
| **Tax calculation** | ✗ | ✓ |
| **Payroll (draft/calculate/submit)** | ✗ | ✓ |
| **Payroll execution** | ✗ | ✗ (dashboard only) |
| **Webhooks** | ✗ | ✓ |

> Payroll execution is dashboard-only by design. Code prepares payroll. Humans approve payroll.
> See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full decision record.

---

## Client SDK

```html
<script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>
<script>
  const konduyt = new KonduytClient({ publishableKey: 'pk_live_...' })

  // Ask which provider Konduyt recommends and why
  const rec = await konduyt.recommend({ currency: 'KES' })
  console.log(rec.recommended)  // 'mpesa'
  console.log(rec.reason)       // '99.1% success rate · 1.50% fee · 8000ms avg'

  // Launch the checkout sheet — providers ranked by intelligence
  await konduyt
    .on('payment.success', txn  => console.log('Paid:', txn.transaction_id))
    .on('payment.failed',  err  => console.error('Failed:', err.error.message))
    .on('provider.changed', e  => console.log('Switched to', e.to))
    .on('tax.calculated',  tax => console.log('Tax owed:', tax.total_owed))
    .checkout({ amount: 2000, currency: 'KES', theme: { brandName: 'My Store' } })
</script>
```

### Events

| Event | When |
|---|---|
| `checkout.opened` | Checkout sheet shown |
| `checkout.closed` | Checkout sheet dismissed |
| `payment.started` | User confirmed payment |
| `payment.success` | Payment completed |
| `payment.failed` | Payment failed |
| `provider.changed` | Konduyt switched providers |
| `tax.calculated` | Tax computed for transaction |
| `recommend.ready` | Recommendation available |

---

## Server SDK

```javascript
const { KonduytServer } = require('@konduyt/sdk/server')
// or: import { KonduytServer } from '@konduyt/sdk/server'

const konduyt = new KonduytServer({ secretKey: process.env.KONDUYT_SECRET_KEY })

// List transactions
const txns = await konduyt.payments.list(projectId, { status: 'success', limit: '50' })

// Issue a refund
await konduyt.payments.refund(projectId, transactionId)

// Calculate tax
const tax = await konduyt.tax.calculate({ amount: 50000, currency: 'KES', jurisdiction: 'KE' })

// People management (server only)
const person = await konduyt.people.create(projectId, {
  name:    'Jane Doe',
  role:    'contractor',
  vendor:  'mpesa',
  amount:  15000,
  currency: 'KES',
})

// Payroll — prepare and submit for human approval
const draft = await konduyt.payroll.draft(projectId, { period: '2026-07', people: [person.id] })
const calc  = await konduyt.payroll.calculate(projectId, draft.id)
const valid = await konduyt.payroll.validate(projectId, draft.id)
await konduyt.payroll.submit(projectId, draft.id)
// → A reviewer approves in the Konduyt dashboard before payments execute
```

---

## Provider Intelligence

Konduyt selects the best provider automatically. The recommendation is always explainable.

```javascript
// Client SDK
const rec = await konduyt.recommend({ currency: 'NGN' })
// {
//   recommended: 'paystack',
//   reason:      '97.8% success rate · 1.50% fee · 4000ms avg',
//   score:       0.891,
//   fee:         0.015,
//   alternatives: [{ vendor: 'flutterwave', score: 0.874, ... }]
// }

// Server SDK
const health = await konduyt.providerHealth(projectId)
const why    = await konduyt.explainDecision(projectId, transactionId)
```

---

## Installation

```bash
npm install @konduyt/sdk
```

Or via CDN:
```html
<script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>
```

---

## Architecture

The SDK is organized around business capabilities, not payment providers.

Write `konduyt.checkout()` not `konduyt.stripeCheckout()`.
Providers are implementation details. Business capabilities are the public API.

Read [ARCHITECTURE.md](./ARCHITECTURE.md) before adding new SDK methods.

---

## Links

- [Documentation](https://konduyt.dev/docs)
- [Dashboard](https://konduyt.dev/dashboard)
- [Architecture decisions](./ARCHITECTURE.md)
- [GitHub](https://github.com/konduyt-hq)
