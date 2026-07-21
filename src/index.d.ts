/**
 * Konduyt SDK — TypeScript Definitions
 *
 * Two SDKs, one boundary:
 *   KonduytClient — browser/mobile, publishable key
 *   KonduytServer — server only, secret key
 *
 * See ARCHITECTURE.md for the full capability matrix.
 */

// ── Shared types ──────────────────────────────────────────────────────────────

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
  alternatives: Array<{ vendor: string; score: number; supported: boolean; rejection_reason: string | null }>
}

export interface TransactionResult {
  status:           'success' | 'failed' | 'pending' | 'refunded'
  transaction_id:   string
  amount:           number
  currency:         string
  vendor:           string
  vendor_reference?: string
  decision?: { reason: string; score: number; alternatives: unknown[] }
  error?: { code?: string; message: string }
}

export interface TaxJurisdiction {
  name:            string
  abbreviation:    string
  rate:            number
  amount_owed:     number
  filing_deadline: string
  where_to_pay:    string
}

export interface TaxResult {
  total_owed:   number
  currency:     string
  jurisdiction: string
  taxes:        TaxJurisdiction[]
}

export interface ProviderHealth {
  vendor:        string
  name:          string
  success_rate:  number
  avg_latency_ms: number
  total_txns:    number
  typical_fee_pct: number
  supported_currencies: string[]
  status:        string
}

// ── Event map ─────────────────────────────────────────────────────────────────

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

// ── Client SDK (publishable key) ──────────────────────────────────────────────

export interface KonduytClientConfig {
  /** Publishable key: pk_live_... or pk_test_... — safe for browser use */
  publishableKey: string
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

export declare class KonduytClient {
  constructor(config: KonduytClientConfig)

  /** Ask which provider Konduyt recommends for this currency and why */
  recommend(options?: { currency?: string; country?: string; amount?: number }): Promise<RecommendResult>

  /** Launch the Konduyt checkout sheet */
  checkout(options: CheckoutOptions): Promise<TransactionResult | null>

  /** Check transaction status */
  status(transactionId: string): Promise<TransactionResult>

  /** Register an event handler. Returns this for chaining. */
  on<K extends keyof KonduytEventMap>(event: K, handler: (data: KonduytEventMap[K]) => void): this

  /** Remove an event handler */
  off<K extends keyof KonduytEventMap>(event: K, handler?: (data: KonduytEventMap[K]) => void): this
}

/** Backward-compatible alias */
export declare const Konduyt: typeof KonduytClient

// ── Server SDK (secret key) ───────────────────────────────────────────────────

export interface KonduytServerConfig {
  /** Secret key: sk_live_... or sk_test_... — NEVER use in browser code */
  secretKey: string
}

export declare class PaymentsNamespace {
  list(projectId: string, options?: Record<string, string>): Promise<{ total: number; transactions: TransactionResult[] }>
  refund(projectId: string, transactionId: string): Promise<{ status: string; transaction_id: string }>
  summary(projectId: string): Promise<{ vendors: unknown[]; tax_summary: unknown[] }>
}

export declare class CustomersNamespace {
  list(projectId: string): Promise<unknown[]>
  get(projectId: string, customerId: string): Promise<unknown>
  create(projectId: string, data: Record<string, unknown>): Promise<unknown>
}

export declare class PeopleNamespace {
  /**
   * Server-side only. Contains sensitive personal and payment data.
   * Never available via publishable key.
   */
  list(projectId: string): Promise<unknown[]>
  get(projectId: string, personId: string): Promise<unknown>
  create(projectId: string, data: Record<string, unknown>): Promise<unknown>
  update(projectId: string, personId: string, data: Record<string, unknown>): Promise<unknown>
}

export declare class PayrollNamespace {
  /**
   * Payroll preparation only. No execution via SDK.
   * Code prepares payroll. Humans approve in dashboard. Dashboard executes.
   */
  draft(projectId: string, data: Record<string, unknown>): Promise<unknown>
  calculate(projectId: string, draftId: string): Promise<unknown>
  validate(projectId: string, draftId: string): Promise<unknown>
  submit(projectId: string, draftId: string): Promise<unknown>
  list(projectId: string): Promise<unknown[]>
  // run()     — does not exist. Dashboard only.
  // execute() — does not exist. Dashboard only.
}

export declare class TaxNamespace {
  calculate(data: { amount: number; currency: string; jurisdiction: string }): Promise<TaxResult>
  report(projectId: string): Promise<unknown>
}

export declare class WebhooksNamespace {
  list(projectId: string): Promise<unknown[]>
  create(projectId: string, data: Record<string, unknown>): Promise<unknown>
  delete(projectId: string, id: string): Promise<unknown>
}

export declare class KonduytServer {
  constructor(config: KonduytServerConfig)

  readonly payments:  PaymentsNamespace
  readonly customers: CustomersNamespace
  readonly people:    PeopleNamespace
  readonly payroll:   PayrollNamespace
  readonly tax:       TaxNamespace
  readonly webhooks:  WebhooksNamespace

  providerHealth(projectId: string): Promise<ProviderHealth[]>
  explainDecision(projectId: string, transactionId: string): Promise<unknown>
  simulateRouting(projectId: string, options?: Record<string, string>): Promise<unknown>
}
