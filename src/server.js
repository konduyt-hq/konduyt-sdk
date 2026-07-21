/**
 * Konduyt Server SDK v1.1.0
 *
 * For use in server-side environments ONLY (Node.js, Python, etc.)
 * Requires a SECRET key (sk_live_... or sk_test_...).
 * NEVER use this in browser code or expose your secret key to clients.
 *
 * Capabilities:
 *   payments  — list, refund, reconcile
 *   customers — create, list, get
 *   people    — create, list, get, update (employees, contractors, affiliates)
 *   payroll   — draft, calculate, validate, submit (NO execution — dashboard only)
 *   tax       — calculate, report
 *   webhooks  — create, list, delete
 *
 * See ARCHITECTURE.md for the full capability boundary.
 * See: https://konduyt.dev/docs/sdk/server
 */
'use strict'

const API_BASE = 'https://konduyt-api.onrender.com'

function request(method, path, body, secretKey) {
  const fetch = typeof globalThis.fetch === 'function'
    ? globalThis.fetch
    : (() => { try { return require('node-fetch') } catch { throw new Error('Install node-fetch or use Node 18+') } })()

  return fetch(API_BASE + path, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${secretKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || e.message || 'Request failed') })
    return res.json()
  })
}

class PaymentsNamespace {
  constructor(key) { this._key = key }

  /** List transactions with optional filters */
  list(projectId, options = {}) {
    const q = new URLSearchParams(options).toString()
    return request('GET', `/transactions/${projectId}/list${q ? '?' + q : ''}`, null, this._key)
  }

  /** Issue a refund for a completed transaction */
  refund(projectId, transactionId) {
    return request('POST', `/transactions/${projectId}/refund/${transactionId}`, {}, this._key)
  }

  /** Get transaction summary for a project */
  summary(projectId) {
    return request('GET', `/transactions/${projectId}/summary`, null, this._key)
  }
}

class CustomersNamespace {
  constructor(key) { this._key = key }

  list(projectId)           { return request('GET',  `/transactions/${projectId}/customers`, null, this._key) }
  get(projectId, customerId){ return request('GET',  `/customers/${customerId}`, null, this._key) }
  create(projectId, data)   { return request('POST', `/customers/${projectId}`, data, this._key) }
}

class PeopleNamespace {
  /**
   * People management — server-side only.
   * Employees, contractors, freelancers, and affiliates.
   * Contains sensitive personal and payment data.
   * Never available via publishable key.
   */
  constructor(key) { this._key = key }

  list(projectId)            { return request('GET',   `/people/${projectId}/people`, null, this._key) }
  get(projectId, personId)   { return request('GET',   `/people/${projectId}/people/${personId}`, null, this._key) }
  create(projectId, data)    { return request('POST',  `/people/${projectId}/people`, data, this._key) }
  update(projectId, personId, data) { return request('PATCH', `/people/${projectId}/people/${personId}`, data, this._key) }
}

class PayrollNamespace {
  /**
   * Payroll preparation — server-side only.
   *
   * The SDK can prepare and submit payroll for human approval.
   * Execution ALWAYS requires human approval in the Konduyt dashboard.
   *
   * There is no .run() or .execute() method.
   * Code prepares payroll. Humans approve payroll.
   */
  constructor(key) { this._key = key }

  /** Create a payroll draft for a given period */
  draft(projectId, data) {
    return request('POST', `/people/${projectId}/payroll/draft`, data, this._key)
  }

  /** Calculate salaries, deductions, and taxes for a draft */
  calculate(projectId, draftId) {
    return request('POST', `/people/${projectId}/payroll/${draftId}/calculate`, {}, this._key)
  }

  /** Validate a payroll draft — checks for errors before submission */
  validate(projectId, draftId) {
    return request('POST', `/people/${projectId}/payroll/${draftId}/validate`, {}, this._key)
  }

  /**
   * Submit a validated payroll draft for human approval.
   * After submission, a reviewer must approve it in the Konduyt dashboard
   * before any payments are executed.
   */
  submit(projectId, draftId) {
    return request('POST', `/people/${projectId}/payroll/${draftId}/submit`, {}, this._key)
  }

  /** List payroll runs (history) */
  list(projectId) {
    return request('GET', `/people/${projectId}/payroll/runs`, null, this._key)
  }

  // run()     — does not exist. Dashboard only.
  // execute() — does not exist. Dashboard only.
}

class TaxNamespace {
  constructor(key) { this._key = key }

  /** Calculate tax for a given amount and jurisdiction */
  calculate(data) {
    return request('POST', '/tax/calculate', data, this._key)
  }

  /** Get tax summary for a project */
  report(projectId) {
    return request('GET', `/tax/${projectId}/report`, null, this._key)
  }
}

class WebhooksNamespace {
  constructor(key) { this._key = key }

  list(projectId)          { return request('GET',    `/webhooks/${projectId}/list`, null, this._key) }
  create(projectId, data)  { return request('POST',   `/webhooks/${projectId}/endpoints`, data, this._key) }
  delete(projectId, id)    { return request('DELETE', `/webhooks/${projectId}/endpoints/${id}`, null, this._key) }
}

class KonduytServer {
  constructor(config) {
    if (!config?.secretKey) throw new Error('KonduytServer: secretKey is required')
    if (config.secretKey.startsWith('pk_'))
      throw new Error('KonduytServer: use a secret key (sk_...), not a publishable key. See ARCHITECTURE.md.')

    this._key = config.secretKey
    this._sandbox = config.secretKey.startsWith('sk_test_')

    // Namespaces
    this.payments  = new PaymentsNamespace(this._key)
    this.customers = new CustomersNamespace(this._key)
    this.people    = new PeopleNamespace(this._key)
    this.payroll   = new PayrollNamespace(this._key)
    this.tax       = new TaxNamespace(this._key)
    this.webhooks  = new WebhooksNamespace(this._key)
  }

  /** Get provider health for a project */
  providerHealth(projectId) {
    return request('GET', `/intelligence/${projectId}/health`, null, this._key)
  }

  /** Explain why Konduyt chose a particular provider for a transaction */
  explainDecision(projectId, transactionId) {
    return request('GET', `/intelligence/${projectId}/explain/${transactionId}`, null, this._key)
  }

  /** Simulate routing for a currency without making a real charge */
  simulateRouting(projectId, options = {}) {
    const q = new URLSearchParams(options).toString()
    return request('GET', `/intelligence/${projectId}/simulate?${q}`, null, this._key)
  }
}

module.exports = { KonduytServer }
