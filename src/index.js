/**
 * Konduyt SDK v1.1.0
 * One integration. Every payment. Everywhere.
 * https://konduyt.dev
 *
 * Methods:
 *   konduyt.recommend(options)  — ask Konduyt which provider to use and why
 *   konduyt.checkout(options)   — launch the Konduyt checkout sheet
 *   konduyt.charge(options)     — low-level charge (no UI)
 *   konduyt.tax(options)        — calculate tax obligations
 *   konduyt.status(txnId)       — check transaction status
 *   konduyt.on(event, handler)  — register event handler
 *
 * Events:
 *   checkout.opened     — checkout sheet was shown
 *   checkout.closed     — checkout sheet was dismissed
 *   payment.started     — user confirmed payment, request in flight
 *   payment.success     — payment completed successfully
 *   payment.failed      — payment failed (includes error details)
 *   payment.completed   — alias for payment.success (kept for compat)
 *   provider.changed    — Konduyt switched providers during retry
 *   tax.calculated      — tax was calculated (includes amounts and guidance)
 *   recommend.ready     — recommendation result available
 */
;(function (global) {
  'use strict'

  const API_BASE = 'https://konduyt-api.onrender.com'

  // ── Utilities ──────────────────────────────────────────────────────────────

  function request(method, path, body, headers = {}) {
    return fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.detail || e.message || 'Request failed') })
      return res.json()
    })
  }

  function injectCSS(css) {
    if (document.getElementById('konduyt-styles')) return
    const style = document.createElement('style')
    style.id = 'konduyt-styles'
    style.textContent = css
    document.head.appendChild(style)
  }

  function formatMoney(amount, currency) {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
    } catch {
      return currency + ' ' + amount.toFixed(2)
    }
  }

  // ── Checkout UI ────────────────────────────────────────────────────────────

  const CHECKOUT_CSS = `
    .kd-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      animation: kd-fade-in 0.18s ease;
    }
    @keyframes kd-fade-in { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
    .kd-sheet {
      width: 100%; max-width: 380px;
      background: #FFFFFF; border-radius: 18px; overflow: hidden;
      box-shadow: 0 40px 100px rgba(0,0,0,0.35);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .kd-header {
      padding: 18px 20px 14px; border-bottom: 1px solid #F0F0F0;
      display: flex; align-items: center; justify-content: space-between;
    }
    .kd-brand { display: flex; align-items: center; gap: 10px; }
    .kd-logo-img { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; }
    .kd-logo-placeholder {
      width: 28px; height: 28px; border-radius: 6px;
      background: var(--kd-accent, #FF5C35); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .kd-brand-name { font-size: 15px; font-weight: 600; color: #111; }
    .kd-amount { font-size: 15px; font-weight: 700; color: #111; }
    .kd-close { font-size: 22px; color: #BBB; background: none; border: none; cursor: pointer; line-height: 1; padding: 2px; }
    .kd-close:hover { color: #333; }
    .kd-body { padding: 18px 20px; }
    .kd-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #AAA; margin-bottom: 10px; }
    .kd-option {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border: 2px solid #EEEEEE;
      border-radius: 12px; cursor: pointer; margin-bottom: 8px;
      transition: border-color 0.15s, background 0.15s;
      position: relative;
    }
    .kd-option:hover { border-color: #DDD; background: #FAFAFA; }
    .kd-option.selected { border-color: var(--kd-accent, #FF5C35); background: #FFF8F6; }
    .kd-option-icon { font-size: 22px; width: 36px; text-align: center; flex-shrink: 0; }
    .kd-option-info { flex: 1; min-width: 0; }
    .kd-option-name { font-size: 14px; font-weight: 600; color: #111; }
    .kd-option-sub { font-size: 11px; color: #888; margin-top: 2px; }
    .kd-option-reason { font-size: 11px; color: #22C55E; font-weight: 600; margin-top: 3px; }
    .kd-option-savings { font-size: 11px; font-weight: 600; color: #22C55E; }
    .kd-badge {
      font-size: 10px; font-weight: 700; color: #fff;
      background: var(--kd-accent, #FF5C35);
      padding: 2px 7px; border-radius: 100px;
      white-space: nowrap; flex-shrink: 0;
    }
    .kd-btn {
      width: 100%; padding: 14px;
      background: var(--kd-accent, #FF5C35);
      color: #fff; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 600; cursor: pointer;
      margin-top: 6px; transition: opacity 0.15s;
      letter-spacing: 0.01em;
    }
    .kd-btn:hover { opacity: 0.88; }
    .kd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .kd-footer { text-align: center; padding: 8px 20px 16px; font-size: 11px; color: #CCC; }
    .kd-footer a { color: var(--kd-accent, #FF5C35); text-decoration: none; }
    .kd-error { font-size: 13px; color: #EF4444; background: #FEF2F2; border-radius: 8px; padding: 10px 14px; margin-top: 10px; }
  `

  function buildCheckoutUI({ amount, currency, vendors, theme, onSelect, onClose }) {
    injectCSS(CHECKOUT_CSS)

    const accent = theme.color || '#FF5C35'
    document.documentElement.style.setProperty('--kd-accent', accent)

    const overlay = document.createElement('div')
    overlay.className = 'kd-overlay'

    const sheet = document.createElement('div')
    sheet.className = 'kd-sheet'

    // Header
    const header = document.createElement('div')
    header.className = 'kd-header'

    const brand = document.createElement('div')
    brand.className = 'kd-brand'

    if (theme.logo) {
      const img = document.createElement('img')
      img.src = theme.logo; img.className = 'kd-logo-img'; img.alt = ''
      brand.appendChild(img)
    } else {
      const p = document.createElement('div')
      p.className = 'kd-logo-placeholder'
      p.textContent = (theme.brandName || 'K')[0].toUpperCase()
      brand.appendChild(p)
    }

    const name = document.createElement('div')
    name.className = 'kd-brand-name'
    name.textContent = theme.brandName || 'Checkout'
    brand.appendChild(name)

    const amountEl = document.createElement('div')
    amountEl.className = 'kd-amount'
    amountEl.textContent = formatMoney(amount, currency)

    const closeBtn = document.createElement('button')
    closeBtn.className = 'kd-close'
    closeBtn.innerHTML = '&times;'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.onclick = () => { overlay.remove(); onClose?.() }

    header.appendChild(brand)
    header.appendChild(amountEl)
    header.appendChild(closeBtn)

    // Body
    const body = document.createElement('div')
    body.className = 'kd-body'

    const lbl = document.createElement('div')
    lbl.className = 'kd-label'
    lbl.textContent = 'Choose how to pay'
    body.appendChild(lbl)

    let selected = vendors[0]?.id
    const optionEls = {}

    vendors.forEach((v, i) => {
      const opt = document.createElement('div')
      opt.className = 'kd-option' + (i === 0 ? ' selected' : '')
      opt.dataset.id = v.id
      optionEls[v.id] = opt

      const icon = document.createElement('div')
      icon.className = 'kd-option-icon'
      icon.textContent = v.icon || '💳'

      const info = document.createElement('div')
      info.className = 'kd-option-info'

      const optName = document.createElement('div')
      optName.className = 'kd-option-name'
      optName.textContent = v.name

      const sub = document.createElement('div')
      sub.className = 'kd-option-sub'
      sub.textContent = formatMoney(v.effective_amount || amount, currency)
      if (v.savings) {
        const savings = document.createElement('span')
        savings.className = 'kd-option-savings'
        savings.textContent = ` · saves ${formatMoney(v.savings, currency)}`
        sub.appendChild(savings)
      }

      info.appendChild(optName)
      info.appendChild(sub)

      // Show recommendation reason for the top option
      if (i === 0 && v.reason) {
        const reason = document.createElement('div')
        reason.className = 'kd-option-reason'
        reason.textContent = '● ' + v.reason
        info.appendChild(reason)
      }

      opt.appendChild(icon)
      opt.appendChild(info)

      if (i === 0) {
        const badge = document.createElement('span')
        badge.className = 'kd-badge'
        badge.textContent = 'Best choice'
        opt.appendChild(badge)
      }

      opt.onclick = () => {
        Object.values(optionEls).forEach(e => e.classList.remove('selected'))
        opt.classList.add('selected')
        selected = v.id
        btn.textContent = theme.buttonText || `Pay with ${v.name}`
      }

      body.appendChild(opt)
    })

    // Pay button
    const btn = document.createElement('button')
    btn.className = 'kd-btn'
    btn.textContent = theme.buttonText || `Pay with ${vendors[0]?.name}`
    btn.onclick = async () => {
      btn.disabled = true
      btn.textContent = 'Processing…'
      try {
        await onSelect(selected)
      } catch (err) {
        btn.disabled = false
        btn.textContent = theme.buttonText || `Pay with ${vendors[0]?.name}`
        const errEl = document.createElement('div')
        errEl.className = 'kd-error'
        errEl.textContent = err.message || 'Payment failed. Please try again.'
        body.appendChild(errEl)
        setTimeout(() => errEl.remove(), 5000)
      }
    }
    body.appendChild(btn)

    // "Optimized by Konduyt" footer
    const footer = document.createElement('div')
    footer.className = 'kd-footer'
    footer.innerHTML = 'Optimized by <a href="https://konduyt.dev" target="_blank" rel="noopener">Konduyt</a>'

    sheet.appendChild(header)
    sheet.appendChild(body)
    sheet.appendChild(footer)
    overlay.appendChild(sheet)
    document.body.appendChild(overlay)

    overlay.addEventListener('click', e => {
      if (e.target === overlay) { overlay.remove(); onClose?.() }
    })
  }

  // ── Konduyt Class ──────────────────────────────────────────────────────────

  class Konduyt {
    constructor(config) {
      if (!config?.publishableKey) throw new Error('Konduyt: publishableKey is required')
      this._key      = config.publishableKey
      this._sandbox  = config.publishableKey.startsWith('pk_test_')
      this._handlers = {}

      if (this._sandbox) {
        console.info('[Konduyt] Running in sandbox mode. No real payments will be processed.')
      }
    }

    /**
     * Ask Konduyt which payment provider it recommends for a given currency
     * and why. Returns full explanation with fee, success rate, and alternatives.
     *
     * @example
     * const rec = await konduyt.recommend({ currency: 'KES' })
     * console.log(rec.recommended)   // 'mpesa'
     * console.log(rec.reason)        // '99.1% success rate · 1.50% fee · 8000ms avg'
     * console.log(rec.alternatives)  // [{ vendor: 'stripe', reason: 'Higher fee' }]
     */
    async recommend(options = {}) {
      const { currency = 'KES', country = '', amount = null } = options

      const res = await request('POST', '/checkout/recommend', {
        publishable_key: this._key,
        currency,
        country,
        amount,
      })

      this._emit('recommend.ready', res)

      return res
    }

    /**
     * Launch the Konduyt checkout sheet.
     * Konduyt selects and ranks providers automatically.
     * Shows reason why each provider is recommended.
     */
    async checkout(options = {}) {
      const { amount, currency = 'USD', theme = {}, metadata } = options

      if (!amount || amount <= 0) throw new Error('Konduyt: amount must be a positive number')

      this._emit('checkout.opened', { amount, currency })

      let session
      try {
        session = await request('POST', '/checkout/init', {
          amount,
          currency,
          publishable_key: this._key,
          metadata,
        })
      } catch (err) {
        this._emit('checkout.closed', { reason: 'error', error: err.message })
        throw err
      }

      return new Promise((resolve, reject) => {
        buildCheckoutUI({
          amount,
          currency,
          vendors: session.vendors,
          theme,
          onSelect: async (vendorId) => {
            this._emit('payment.started', { amount, currency, vendor: vendorId })

            try {
              const charge = await request('POST', '/checkout/charge', {
                session_id:      session.session_id,
                vendor:          vendorId,
                publishable_key: this._key,
              })

              if (charge.tax) {
                this._emit('tax.calculated', charge.tax)
              }

              if (charge.decision?.reason) {
                // Emit provider.changed if Konduyt switched from the original recommendation
                if (session.recommended && session.recommended !== vendorId) {
                  this._emit('provider.changed', {
                    from:   session.recommended,
                    to:     vendorId,
                    reason: 'Customer selected different provider',
                  })
                }
              }

              this._emit('payment.success', charge)
              this._emit('payment.completed', charge)
              resolve(charge)
            } catch (err) {
              this._emit('payment.failed', { error: { message: err.message, vendor: vendorId } })
              reject(err)
            }
          },
          onClose: () => {
            this._emit('checkout.closed', { reason: 'dismissed' })
            resolve(null)
          },
        })
      })
    }

    /**
     * Low-level charge without UI.
     * Use when you've built your own payment form.
     */
    async charge(options = {}) {
      const { amount, currency, vendor, customer, metadata } = options

      this._emit('payment.started', { amount, currency, vendor })

      try {
        const res = await request('POST', '/checkout/charge', {
          ...options,
          publishable_key: this._key,
        })

        if (res.tax) {
          this._emit('tax.calculated', res.tax)
        }

        if (res.decision?.reason) {
          this._emit('recommend.ready', {
            recommended: res.vendor,
            reason:      res.decision.reason,
            alternatives: res.decision.alternatives || [],
          })
        }

        if (res.status === 'success') {
          this._emit('payment.success', res)
          this._emit('payment.completed', res)
        } else {
          this._emit('payment.failed', res)
        }

        return res
      } catch (err) {
        this._emit('payment.failed', { error: { message: err.message } })
        throw err
      }
    }

    /**
     * Calculate tax for a transaction.
     * Emits tax.calculated with full jurisdiction guidance.
     */
    async tax(options = {}) {
      const res = await request('POST', '/tax/calculate', {
        ...options,
        publishable_key: this._key,
      })

      this._emit('tax.calculated', res)

      return res
    }

    /**
     * Check the status of a transaction.
     */
    async status(transactionId) {
      return request('GET', `/transactions/${transactionId}`, null, {
        'X-Konduyt-Key': this._key,
      })
    }

    /**
     * Register a handler for a Konduyt event.
     *
     * Available events:
     *   checkout.opened    — checkout sheet shown
     *   checkout.closed    — checkout sheet dismissed
     *   payment.started    — user confirmed payment
     *   payment.success    — payment completed
     *   payment.failed     — payment failed (includes error)
     *   payment.completed  — alias for payment.success
     *   provider.changed   — Konduyt switched providers
     *   tax.calculated     — tax was calculated
     *   recommend.ready    — recommendation result available
     *
     * @returns {Konduyt} this — for chaining
     */
    on(event, handler) {
      if (typeof handler !== 'function') throw new Error('Konduyt.on: handler must be a function')
      if (!this._handlers[event]) this._handlers[event] = []
      this._handlers[event].push(handler)
      return this
    }

    /**
     * Remove a specific handler or all handlers for an event.
     */
    off(event, handler) {
      if (!handler) {
        delete this._handlers[event]
      } else {
        this._handlers[event] = (this._handlers[event] || []).filter(h => h !== handler)
      }
      return this
    }

    _emit(event, data) {
      ;(this._handlers[event] || []).forEach(h => {
        try { h(data) } catch (e) { console.error('[Konduyt] Event handler error:', e) }
      })
    }
  }

  // Expose globally and as ESM default
  global.Konduyt = Konduyt

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Konduyt }
  }

})(typeof globalThis !== 'undefined' ? globalThis : window)
