# Konduyt SDK

**One integration. Every payment. Everywhere.**

The Konduyt SDK unifies Stripe, PayPal, M-Pesa, Flutterwave, Razorpay and many others behind a single line of code — with tax calculation built in.

## Quick start

### JavaScript (CDN — no npm needed)

```html
<script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>
<script>
  const konduyt = new Konduyt({ publishableKey: 'pk_live_...' })

  konduyt.checkout({
    amount: 2000,
    currency: 'KES',
    theme: { color: '#FF5C35', buttonText: 'Pay now' }
  })

  konduyt.on('payment.success', (txn) => {
    console.log('Paid!', txn.transaction_id)
  })

  konduyt.on('payment.failed', (txn) => {
    console.error('Failed', txn.error.message)
  })
</script>
```

### Python

```bash
pip install konduyt
```

```python
from konduyt import Konduyt

kd = Konduyt(secret_key='sk_live_...')
result = kd.charge(amount=2000, currency='KES', vendor='mpesa', phone='+254712345678')
print(result.status)
```

### PHP

```bash
composer require konduyt/sdk
```

```php
$konduyt = new Konduyt\Client(['secret_key' => 'sk_live_...']);
$result  = $konduyt->charge(['amount' => 2000, 'currency' => 'KES']);
```

### Kotlin (Android)

```gradle
implementation 'dev.konduyt:sdk:1.0.0'
```

```kotlin
val kd = Konduyt(publishableKey = "pk_live_...")
kd.checkout(amount = 2000, currency = "KES") { result ->
    println(result.status)
}
```

### Dart (Flutter)

```yaml
dependencies:
  konduyt: ^1.0.0
```

```dart
final kd = Konduyt(publishableKey: 'pk_live_...');
final result = await kd.charge(amount: 2000, currency: 'KES');
```

## Webhook events

```javascript
konduyt.on('payment.success',  (txn) => { /* save to db, redirect */ })
konduyt.on('payment.failed',   (txn) => { /* show error to user */ })
konduyt.on('payment.refunded', (txn) => { /* update records */ })
```

## Tax calculation

```javascript
const tax = await konduyt.tax({ amount: 2000, currency: 'KES', jurisdiction: 'KE' })
console.log(tax.total_owed)    // amount owed
console.log(tax.where_to_pay)  // itax.kra.go.ke
console.log(tax.deadline)      // 20th of following month
```

## Supported payment methods

| Provider | Region |
|---|---|
| Stripe | Global cards |
| PayPal | Global |
| M-Pesa | East Africa |
| Flutterwave | Africa |
| Razorpay | India |
| GrabPay | Southeast Asia |
| PIX | Brazil |
| + many others | — |

## Pricing

**Local — Free forever.** One jurisdiction, unlimited vendors, full SDK.

**Global — $49/month per project.** Unlimited jurisdictions, cross-border reconciliation, multi-currency reporting.

[Get started at konduyt.dev →](https://konduyt.dev)

## License

MIT
