# Konduyt SDK — Architecture Decisions

> This document captures permanent architectural decisions for the Konduyt SDK.
> Before adding any new SDK method, check this document first.
> If your feature touches payroll execution, people management, or secret operations — it belongs in the Server SDK only.

---

## Decision 1 — Two SDK modes. One boundary.

The SDK has two separate modes with a hard capability boundary between them.

```
Client SDK  (publishable key: pk_live_... / pk_test_...)
Server SDK  (secret key:      sk_live_... / sk_test_...)
```

This is not a preference. It is a security boundary.

A publishable key is safe to embed in browser code, mobile apps, and frontend JavaScript.
A secret key must never leave your server.

---

## Decision 2 — Client SDK capabilities (publishable key)

The Client SDK handles only customer-facing payment interactions.

**Allowed:**
- `konduyt.checkout()` — launch the payment sheet
- `konduyt.recommend()` — get provider recommendation for a currency
- `konduyt.status(txnId)` — check a transaction status
- `konduyt.on()` / `konduyt.off()` — event handlers

**Never allowed in the Client SDK:**
- Tax calculations
- Creating or managing customers
- Creating or managing people (employees, contractors)
- Any payroll operation
- Refunds (money movement without customer initiation)
- Listing transactions
- Webhook management
- Any operation that reads sensitive business data

**Why:** A publishable key is embedded in client code that anyone can read.
If sensitive operations were available via publishable key, any visitor to your site
could enumerate your customers, read your financials, or trigger payroll actions.

---

## Decision 3 — Server SDK capabilities (secret key)

The Server SDK runs exclusively in backend code (Node.js, Python, etc.)
where the secret key is protected by environment variables.

**Allowed:**
- Everything in the Client SDK
- `konduyt.payments.list()` — list and filter transactions
- `konduyt.payments.refund()` — issue refunds
- `konduyt.customers.create()` / `.list()` / `.get()`
- `konduyt.people.create()` / `.list()` / `.get()` / `.update()`
- `konduyt.payroll.draft()` — create a payroll draft
- `konduyt.payroll.calculate()` — calculate salaries, deductions, taxes
- `konduyt.payroll.validate()` — validate a draft before submission
- `konduyt.payroll.submit()` — submit for human approval in dashboard
- `konduyt.tax.calculate()` — full tax calculation
- `konduyt.tax.report()` — generate tax reports
- `konduyt.webhooks.create()` / `.list()` / `.delete()`

---

## Decision 4 — Payroll execution is dashboard-only

`konduyt.payroll.run()` does not exist and will not be added to the SDK.

**Why:**

Payroll touches real money going to real people.
A bug in a loop calling `.run()` could send incorrect payments to hundreds of employees
before anyone notices. There is no undo for a wrong bank transfer.

**The correct model:**

```
Code prepares payroll.
Humans approve payroll.
Dashboard executes payroll.
```

The SDK can do everything up to submission. Execution requires a human in the dashboard.

**What the SDK supports:**

```javascript
// Server SDK — prepare and submit for approval
const draft = await konduyt.payroll.draft({ period: '2026-07', people: [...] })
const calc  = await konduyt.payroll.calculate(draft.id)
const valid = await konduyt.payroll.validate(draft.id)
await konduyt.payroll.submit(draft.id)  // sends to dashboard for human approval
// Execution happens in the Konduyt dashboard after human review
```

**Future (enterprise only, not yet):**
When enterprise customers require automated payroll with proper controls
(approval policies, amount limits, dual authorization, full audit trails),
a `.execute()` method may be introduced with strict safeguards.
That decision will be made when we have enterprise customers who need it.

---

## Decision 5 — People management is server-side only

People (employees, contractors, freelancers, affiliates) contain sensitive data:
names, payment details, salary information, tax identifiers.

Creating, inviting, or modifying people records must only happen via the Server SDK.
The Client SDK has no people-related methods.

**Why:** People data is not customer-facing. It is internal business data.
Exposing people management via publishable key would mean any frontend code
could enumerate your employee list or modify payroll records.

---

## Decision 6 — Product boundaries

**KONDUYTbuild** is payment infrastructure.
The SDK's primary focus. Accept payments, manage payment flows, webhooks, provider intelligence.

**KONDUYTpayroll** is a financial operations platform.
Employee management, payroll calculation, tax compliance, approval workflows.
The SDK supports preparation only. Execution is dashboard-only.

**KONDUYTcreator** extends payment collection.
Payment links, supporter management, subscription handling.
All creator-facing flows use the Client SDK via checkout and payment links.

---

## What to check before adding a new SDK method

Ask these questions in order:

1. **Does it move money without customer initiation?**
   → Server SDK only. Never Client SDK.

2. **Does it read or write internal business data (employees, financials, tax)?**
   → Server SDK only.

3. **Does it execute payroll?**
   → Not in SDK at all. Dashboard only.

4. **Is it a customer-facing payment interaction?**
   → Client SDK is appropriate.

5. **Is it a backend automation or data operation?**
   → Server SDK only.

If in doubt, put it in the Server SDK.
The Client SDK should stay minimal — it is a surface that runs in untrusted environments.

---

## Key permission comparison

| Capability | Client SDK | Server SDK |
|---|---|---|
| Checkout | ✓ | ✓ |
| Provider recommendation | ✓ | ✓ |
| Transaction status | ✓ | ✓ |
| List transactions | ✗ | ✓ |
| Refunds | ✗ | ✓ |
| Customer management | ✗ | ✓ |
| People management | ✗ | ✓ |
| Tax calculation | ✗ | ✓ |
| Payroll draft/calculate | ✗ | ✓ |
| Payroll submission | ✗ | ✓ |
| Payroll execution | ✗ | ✗ (dashboard only) |
| Webhook management | ✗ | ✓ |

---

*Last updated: July 2026*
*These decisions should be revisited when Konduyt has enterprise customers with verified compliance controls.*
