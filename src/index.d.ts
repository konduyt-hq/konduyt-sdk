/**
 * Konduyt SDK — TypeScript Definitions
 * https://konduyt.dev
 */

export interface KonduytConfig {
  /** Your publishable key (pk_live_... or pk_test_...) */
  publishableKey: string
}

export interface RecommendOptions {
  currency?: string
  country?:  string
  amount?:   number
}

export interface RecommendResult {
  recommended:  string | null
  name:         string
  reason:       string
  explanation:  string[]
  score:        number
  fee:          number | null
  success_rate: number | null
  latency_ms:   number | null
  features:     string[]
  note:         string
  alternatives: Array<{
    vendor:           string
    score:            number
    supported:        boolean
    rejection_reason: string | null
  }>
}

export interface CheckoutTheme {
  color?:      string
  logo?:       string
  brandName?:  string
  buttonText?: string
}

export interface CheckoutOptions {
  amount:    number
  currency?: string
  theme?:    CheckoutTheme
  metadata?: Record<string, unknown>
}

export interface ChargeOptions {
  amount:    number
  currency?: string
  vendor?:   string
  customer?: { email?: string; phone?: string }
  metadata?: Record<string, unknown>
}

export interface TaxOptions {
  amount:       number
  currency:     string
  jurisdiction: string
}

export interface TaxJurisdiction {
  name:             string
  abbreviation:     string
  rate:             number
  amount_owed:      number
  filing_deadline:  string
  where_to_pay:     string
}

export interface TaxResult {
  total_owed:   number
  currency:     string
  jurisdiction: string
  taxes:        TaxJurisdiction[]
}

export interface TransactionResult {
  status:            'success' | 'failed' | 'pending' | 'refunded'
  transaction_id:    string
  amount:            number
  currency:          string
  vendor:            string
  vendor_reference?: string
  tax?:              TaxResult
  decision?: {
    reason:       string
    score:        number
    alternatives: Array<{ vendor: string; score: number }>
  }
  error?: {
    code:    string
    message: string
  }
}

/** All events emitted by the Konduyt SDK */
export type KonduytEventMap = {
  'checkout.opened':   { amount: number; currency: string }
  'checkout.closed':   { reason: 'dismissed' | 'error'; error?: string }
  'payment.started':   { amount: number; currency: string; vendor?: string }
  'payment.success':   TransactionResult
  'payment.completed': TransactionResult
  'payment.failed':    { error: { code?: string; message: string }; vendor?: string }
  'provider.changed':  { from: string; to: string; reason: string }
  'tax.calculated':    TaxResult
  'recommend.ready':   RecommendResult
}

export declare class Konduyt {
  constructor(config: KonduytConfig)

  /**
   * Ask Konduyt which payment provider it recommends for this currency and why.
   * Returns full explanation with fee, success rate, latency, and alternatives.
   *
   * @example
   * const rec = await konduyt.recommend({ currency: 'KES' })
   * console.log(rec.recommended)   // 'mpesa'
   * console.log(rec.reason)        // '99.1% success rate · 1.50% fee'
   * console.log(rec.explanation)   // ['99.1% success rate', '1.50% fee', '8000ms avg settlement']
   */
  recommend(options?: RecommendOptions): Promise<RecommendResult>

  /**
   * Launch the Konduyt checkout sheet.
   * Providers are ranked by Konduyt's intelligence — best option first.
   * Shows the reason for each recommendation in the UI.
   */
  checkout(options: CheckoutOptions): Promise<TransactionResult | null>

  /**
   * Low-level charge without UI.
   * Use this when you have built your own payment form.
   */
  charge(options: ChargeOptions): Promise<TransactionResult>

  /**
   * Calculate tax obligations for a transaction.
   * Returns the amount owed, filing deadline, and step-by-step guidance.
   */
  tax(options: TaxOptions): Promise<TaxResult>

  /**
   * Check the current status of a transaction.
   */
  status(transactionId: string): Promise<TransactionResult>

  /**
   * Register a handler for a Konduyt event.
   * Returns `this` for chaining.
   *
   * @example
   * konduyt
   *   .on('payment.success', txn => db.save(txn))
   *   .on('payment.failed',  err => alert(err.error.message))
   *   .on('tax.calculated',  tax => showTaxBanner(tax.total_owed))
   *   .on('provider.changed', e => console.log('switched to', e.to))
   */
  on<K extends keyof KonduytEventMap>(
    event:   K,
    handler: (data: KonduytEventMap[K]) => void
  ): this

  /**
   * Remove a handler. If no handler provided, removes all handlers for the event.
   */
  off<K extends keyof KonduytEventMap>(
    event:    K,
    handler?: (data: KonduytEventMap[K]) => void
  ): this
}

export default Konduyt
