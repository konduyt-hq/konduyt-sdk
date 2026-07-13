/**
 * Konduyt SDK v1.0.0
 * One integration. Every payment. Everywhere.
 * https://konduyt.dev
 *
 * Usage:
 *   <script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>
 *   <script>
 *     const konduyt = new Konduyt({ publishableKey: 'pk_live_...' })
 *     konduyt.checkout({ amount: 2000, currency: 'KES' })
 *   </script>
 */
;(function (global) {
  'use strict'

  const API_BASE = 'https://api.konduyt.dev'
  const CDN_BASE = 'https://cdn.konduyt.dev'

  // ── Utilities ────────────────────────────────────────────

  function request(method, path, body, headers = {}) {
    return fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    }).then(res => res.json())
  }

  function injectCSS(css) {
    if (document.getElementById('konduyt-styles')) return
    const style = document.createElement('style')
    style.id = 'konduyt-styles'
    style.textContent = css
    document.head.appendChild(style)
  }

  // ── Checkout UI ──────────────────────────────────────────

  const CHECKOUT_CSS = `
    .kd-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      animation: kd-fade-in 0.2s ease;
    }
    @keyframes kd-fade-in { from { opacity:0 } to { opacity:1 } }
    .kd-sheet {
      width: 100%; max-width: 380px;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .kd-header {
      padding: 18px 20px 14px;
      border-bottom: 1px solid #F0F0F0;
      display: flex; align-items: center; justify-content: space-between;
    }
    .kd-brand { display: flex; align-items: center; gap: 10px; }
    .kd-logo-img { width: 28px; height: 28px; border-radius: 6px; }
    .kd-logo-placeholder {
      width: 28px; height: 28px; border-radius: 6px;
      background: #FF5C35; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .kd-brand-name { font-size: 15px; font-weight: 600; color: #111; }
    .kd-amount { font-size: 15px; font-weight: 700; color: #111; }
    .kd-close { font-size: 20px; color: #999; background: none; border: none; cursor: pointer; line-height: 1; }
    .kd-close:hover { color: #333; }
    .kd-body { padding: 18px 20px; }
    .kd-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 10px; }
    .kd-option {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border: 2px solid #EEE;
      border-radius: 10px; cursor: pointer; margin-bottom: 8px;
      transition: border-color 0.15s;
    }
    .kd-option:hover { border-color: #DDD; }
    .kd-option.selected { border-color: var(--kd-accent, #FF5C35); background: #FFF8F6; }
    .kd-option-icon { font-size: 22px; width: 36px; text-align: center; }
    .kd-option-info { flex: 1; }
    .kd-option-name { font-size: 14px; font-weight: 600; color: #111; }
    .kd-option-cost { font-size: 12px; color: #777; }
    .kd-option-savings { font-size: 11px; font-weight: 600; color: #22C55E; }
    .kd-btn {
      width: 100%; padding: 14px;
      background: var(--kd-accent, #FF5C35);
      color: #fff; border: none; border-radius: 10px;
      font-size: 15px; font-weight: 600; cursor: pointer;
      margin-top: 14px; transition: opacity 0.15s;
    }
    .kd-btn:hover { opacity: 0.9; }
    .kd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .kd-footer {
      text-align: center; padding: 10px 20px 16px;
      font-size: 11px; color: #CCC;
    }
    .kd-footer a { color: #FF5C35; }
    .kd-error {
      font-size: 13px; color: #EF4444;
      background: #FEF2F2; border-radius: 8px;
      padding: 10px 14px; margin-top: 10px;
    }
  `

  function formatMoney(amount, currency) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
  }

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
      p.className = 'kd-logo-placeholder'; p.textContent = 'K'
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
    closeBtn.className = 'kd-close'; closeBtn.innerHTML = '&times;'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.onclick = () => { overlay.remove(); onClose?.() }

    header.appendChild(brand)
    header.appendChild(amountEl)
    header.appendChild(closeBtn)

    // Body
    const body = document.createElement('div')
    body.className = 'kd-body'

    const lbl = document.createElement('div')
    lbl.className = 'kd-label'; lbl.textContent = 'Choose how to pay'
    body.appendChild(lbl)

    let selected = vendors[0]?.id

    const optionEls = {}

    vendors.forEach((v, i) => {
      const opt = document.createElement('div')
      opt.className = 'kd-option' + (i === 0 ? ' selected' : '')
      opt.dataset.id = v.id
      optionEls[v.id] = opt

      opt.innerHTML = `
        <div class="kd-option-icon">${v.icon}</div>
        <div class="kd-option-info">
          <div class="kd-option-name">${v.name}</div>
          <div class="kd-option-cost">${formatMoney(v.effective_amount || amount, currency)}
            ${v.savings ? `<span class="kd-option-savings">· saves ${formatMoney(v.savings, currency)}</span>` : ''}
          </div>
        </div>
        ${i === 0 ? '<span style="font-size:11px;font-weight:700;color:#22C55E">Recommended</span>' : ''}
      `
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
      btn.disabled = true; btn.textContent = 'Processing…'
      await onSelect(selected)
      overlay.remove()
    }
    body.appendChild(btn)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'kd-footer'
    footer.innerHTML = 'Secured by <a href="https://konduyt.dev" target="_blank">Konduyt</a>'

    sheet.appendChild(header)
    sheet.appendChild(body)
    sheet.appendChild(footer)
    overlay.appendChild(sheet)
    document.body.appendChild(overlay)

    // Close on overlay click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { overlay.remove(); onClose?.() }
    })
  }

  // ── Konduyt Class ─────────────────────────────────────────

  class Konduyt {
    constructor(config) {
      if (!config?.publishableKey) throw new Error('Konduyt: publishableKey is required')
      this._key      = config.publishableKey
      this._sandbox  = config.publishableKey.startsWith('pk_test_')
      this._handlers = {}
    }

    /**
     * Launch the Konduyt checkout sheet.
     * Konduyt selects the best vendor automatically.
     */
    async checkout(options) {
      const { amount, currency = 'USD', theme = {}, metadata } = options

      // Fetch available vendors + routing from backend
      const res = await request('POST', '/checkout/init', {
        amount,
        currency,
        publishable_key: this._key,
        metadata,
      })

      if (res.error) throw new Error(res.error)

      return new Promise((resolve, reject) => {
        buildCheckoutUI({
          amount,
          currency,
          vendors:  res.vendors,
          theme,
          onSelect: async (vendorId) => {
            try {
              const charge = await request('POST', '/checkout/charge', {
                session_id: res.session_id,
                vendor:     vendorId,
                publishable_key: this._key,
              })
              this._emit('payment.success', charge)
              resolve(charge)
            } catch (err) {
              this._emit('payment.failed', { error: { message: err.message } })
              reject(err)
            }
          },
          onClose: () => resolve(null),
        })
      })
    }

    /**
     * Low-level charge — skips the UI, use when you've built your own.
     */
    async charge(options) {
      const res = await request('POST', '/checkout/charge', {
        ...options,
        publishable_key: this._key,
      })
      if (res.status === 'failed') this._emit('payment.failed', res)
      else this._emit('payment.success', res)
      return res
    }

    /**
     * Calculate tax for a transaction.
     */
    async tax(options) {
      return request('POST', '/tax/calculate', {
        ...options,
        publishable_key: this._key,
      })
    }

    /**
     * Check transaction status.
     */
    async status(transactionId) {
      return request('GET', `/transactions/${transactionId}`, null, {
        'X-Konduyt-Key': this._key,
      })
    }

    /**
     * Register a webhook event handler.
     */
    on(event, handler) {
      if (!this._handlers[event]) this._handlers[event] = []
      this._handlers[event].push(handler)
      return this
    }

    _emit(event, data) {
      const handlers = this._handlers[event] || []
      handlers.forEach(h => h(data))
    }
  }

  // Expose globally
  global.Konduyt = Konduyt

})(typeof globalThis !== 'undefined' ? globalThis : window)
