/**
 * Konduyt Client SDK v1.1.0
 *
 * For use in browser and mobile environments.
 * Requires a PUBLISHABLE key (pk_live_... or pk_test_...).
 *
 * This SDK handles customer-facing payment interactions ONLY.
 * For server-side operations (tax, people, payroll, refunds),
 * use the Konduyt Server SDK with your secret key.
 *
 * See: https://konduyt.dev/docs/sdk/client
 */
;(function (global) {
  'use strict'

  const API_BASE = 'https://konduyt-api.onrender.com'

  function request(method, path, body) {
    return fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.detail || e.message || 'Request failed') })
      return res.json()
    })
  }

  function injectCSS(css) {
    if (document.getElementById('konduyt-styles')) return
    const s = document.createElement('style')
    s.id = 'konduyt-styles'; s.textContent = css
    document.head.appendChild(s)
  }

  function fmt(amount, currency) {
    try { return new Intl.NumberFormat('en', { style:'currency', currency }).format(amount) }
    catch { return currency + ' ' + amount.toFixed(2) }
  }

  const CSS = `
    .kd-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;animation:kd-in .18s ease}
    @keyframes kd-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .kd-sheet{width:100%;max-width:380px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,0.35);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .kd-header{padding:18px 20px 14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
    .kd-brand{display:flex;align-items:center;gap:10px}
    .kd-logo{width:28px;height:28px;border-radius:6px;background:var(--kd-accent,#FF5C35);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
    .kd-brand-name{font-size:15px;font-weight:600;color:#111}
    .kd-amount{font-size:15px;font-weight:700;color:#111}
    .kd-close{font-size:22px;color:#bbb;background:none;border:none;cursor:pointer;line-height:1;padding:2px}
    .kd-close:hover{color:#333}
    .kd-body{padding:18px 20px}
    .kd-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#aaa;margin-bottom:10px}
    .kd-opt{display:flex;align-items:center;gap:12px;padding:12px 14px;border:2px solid #eee;border-radius:12px;cursor:pointer;margin-bottom:8px;transition:border-color .15s,background .15s;position:relative}
    .kd-opt:hover{border-color:#ddd;background:#fafafa}
    .kd-opt.sel{border-color:var(--kd-accent,#FF5C35);background:#fff8f6}
    .kd-opt-icon{font-size:22px;width:36px;text-align:center;flex-shrink:0}
    .kd-opt-info{flex:1;min-width:0}
    .kd-opt-name{font-size:14px;font-weight:600;color:#111}
    .kd-opt-sub{font-size:11px;color:#888;margin-top:2px}
    .kd-opt-reason{font-size:11px;color:#22C55E;font-weight:600;margin-top:3px}
    .kd-badge{font-size:10px;font-weight:700;color:#fff;background:var(--kd-accent,#FF5C35);padding:2px 7px;border-radius:100px;white-space:nowrap;flex-shrink:0}
    .kd-btn{width:100%;padding:14px;background:var(--kd-accent,#FF5C35);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;margin-top:6px;transition:opacity .15s}
    .kd-btn:hover{opacity:.88}
    .kd-btn:disabled{opacity:.5;cursor:not-allowed}
    .kd-footer{text-align:center;padding:8px 20px 16px;font-size:11px;color:#ccc}
    .kd-footer a{color:var(--kd-accent,#FF5C35);text-decoration:none}
    .kd-err{font-size:13px;color:#ef4444;background:#fef2f2;border-radius:8px;padding:10px 14px;margin-top:10px}
  `

  function buildSheet({ amount, currency, vendors, theme, onSelect, onClose }) {
    injectCSS(CSS)
    const accent = theme.color || '#FF5C35'
    document.documentElement.style.setProperty('--kd-accent', accent)

    const overlay = document.createElement('div')
    overlay.className = 'kd-overlay'

    const sheet = document.createElement('div')
    sheet.className = 'kd-sheet'

    // Header
    const hdr = document.createElement('div'); hdr.className = 'kd-header'
    const brand = document.createElement('div'); brand.className = 'kd-brand'
    if (theme.logo) {
      const img = document.createElement('img')
      img.src = theme.logo; img.style.cssText = 'width:28px;height:28px;border-radius:6px;object-fit:cover'
      brand.appendChild(img)
    } else {
      const logo = document.createElement('div'); logo.className = 'kd-logo'
      logo.textContent = (theme.brandName || 'K')[0].toUpperCase()
      brand.appendChild(logo)
    }
    const bname = document.createElement('div'); bname.className = 'kd-brand-name'
    bname.textContent = theme.brandName || 'Checkout'
    brand.appendChild(bname)
    const amt = document.createElement('div'); amt.className = 'kd-amount'
    amt.textContent = fmt(amount, currency)
    const close = document.createElement('button'); close.className = 'kd-close'
    close.innerHTML = '&times;'
    close.onclick = () => { overlay.remove(); onClose?.() }
    hdr.appendChild(brand); hdr.appendChild(amt); hdr.appendChild(close)

    // Body
    const body = document.createElement('div'); body.className = 'kd-body'
    const lbl = document.createElement('div'); lbl.className = 'kd-label'
    lbl.textContent = 'Choose how to pay'; body.appendChild(lbl)

    let selected = vendors[0]?.id
    const optEls = {}

    vendors.forEach((v, i) => {
      const opt = document.createElement('div')
      opt.className = 'kd-opt' + (i === 0 ? ' sel' : '')
      optEls[v.id] = opt

      const icon = document.createElement('div'); icon.className = 'kd-opt-icon'
      icon.textContent = v.icon || '💳'

      const info = document.createElement('div'); info.className = 'kd-opt-info'
      const name = document.createElement('div'); name.className = 'kd-opt-name'
      name.textContent = v.name
      const sub = document.createElement('div'); sub.className = 'kd-opt-sub'
      sub.textContent = fmt(v.effective_amount || amount, currency)
      if (v.savings) {
        const s = document.createElement('span')
        s.style.cssText = 'color:#22C55E;font-weight:600'
        s.textContent = ` · saves ${fmt(v.savings, currency)}`
        sub.appendChild(s)
      }
      info.appendChild(name); info.appendChild(sub)
      if (i === 0 && v.reason) {
        const r = document.createElement('div'); r.className = 'kd-opt-reason'
        r.textContent = '● ' + v.reason; info.appendChild(r)
      }

      opt.appendChild(icon); opt.appendChild(info)
      if (i === 0) {
        const badge = document.createElement('span'); badge.className = 'kd-badge'
        badge.textContent = 'Best choice'; opt.appendChild(badge)
      }

      opt.onclick = () => {
        Object.values(optEls).forEach(e => e.classList.remove('sel'))
        opt.classList.add('sel'); selected = v.id
        btn.textContent = theme.buttonText || `Pay with ${v.name}`
      }
      body.appendChild(opt)
    })

    const btn = document.createElement('button'); btn.className = 'kd-btn'
    btn.textContent = theme.buttonText || `Pay with ${vendors[0]?.name}`
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = 'Processing…'
      try { await onSelect(selected) }
      catch (err) {
        btn.disabled = false
        btn.textContent = theme.buttonText || `Pay with ${vendors[0]?.name}`
        const e = document.createElement('div'); e.className = 'kd-err'
        e.textContent = err.message || 'Payment failed. Please try again.'
        body.appendChild(e); setTimeout(() => e.remove(), 5000)
      }
    }
    body.appendChild(btn)

    const footer = document.createElement('div'); footer.className = 'kd-footer'
    footer.innerHTML = 'Optimized by <a href="https://konduyt.dev" target="_blank" rel="noopener">Konduyt</a>'

    sheet.appendChild(hdr); sheet.appendChild(body); sheet.appendChild(footer)
    overlay.appendChild(sheet); document.body.appendChild(overlay)
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); onClose?.() } })
  }

  // ── KonduytClient ──────────────────────────────────────────────────────────

  class KonduytClient {
    constructor(config) {
      if (!config?.publishableKey) throw new Error('KonduytClient: publishableKey is required')
      if (config.publishableKey.startsWith('sk_'))
        throw new Error('KonduytClient: use a publishable key (pk_...), not a secret key. Secret keys belong in your server SDK.')
      this._key      = config.publishableKey
      this._sandbox  = config.publishableKey.startsWith('pk_test_')
      this._handlers = {}
      if (this._sandbox) console.info('[Konduyt] Sandbox mode — no real payments will be processed.')
    }

    /** Ask Konduyt which provider it recommends for this currency and why. */
    async recommend(options = {}) {
      const res = await request('POST', '/checkout/recommend', {
        publishable_key: this._key,
        currency: options.currency || 'KES',
        country:  options.country  || '',
        amount:   options.amount   || null,
      })
      this._emit('recommend.ready', res)
      return res
    }

    /** Launch the Konduyt checkout sheet. */
    async checkout(options = {}) {
      const { amount, currency = 'USD', theme = {}, metadata } = options
      if (!amount || amount <= 0) throw new Error('KonduytClient: amount must be a positive number')
      this._emit('checkout.opened', { amount, currency })

      let session
      try {
        session = await request('POST', '/checkout/init', { amount, currency, publishable_key: this._key, metadata })
      } catch (err) {
        this._emit('checkout.closed', { reason: 'error', error: err.message })
        throw err
      }

      return new Promise((resolve, reject) => {
        buildSheet({
          amount, currency, vendors: session.vendors, theme,
          onSelect: async (vendorId) => {
            this._emit('payment.started', { amount, currency, vendor: vendorId })
            try {
              const charge = await request('POST', '/checkout/charge', {
                session_id: session.session_id, vendor: vendorId, publishable_key: this._key,
              })
              if (charge.tax) this._emit('tax.calculated', charge.tax)
              if (session.recommended && session.recommended !== vendorId)
                this._emit('provider.changed', { from: session.recommended, to: vendorId, reason: 'Customer selected' })
              this._emit('payment.success', charge)
              this._emit('payment.completed', charge)
              resolve(charge)
            } catch (err) {
              this._emit('payment.failed', { error: { message: err.message, vendor: vendorId } })
              reject(err)
            }
          },
          onClose: () => { this._emit('checkout.closed', { reason: 'dismissed' }); resolve(null) },
        })
      })
    }

    /** Check transaction status (safe for client use). */
    async status(transactionId) {
      return request('GET', `/transactions/${transactionId}`, null)
    }

    on(event, handler) {
      if (typeof handler !== 'function') throw new Error('handler must be a function')
      if (!this._handlers[event]) this._handlers[event] = []
      this._handlers[event].push(handler)
      return this
    }

    off(event, handler) {
      if (!handler) delete this._handlers[event]
      else this._handlers[event] = (this._handlers[event] || []).filter(h => h !== handler)
      return this
    }

    _emit(event, data) {
      ;(this._handlers[event] || []).forEach(h => { try { h(data) } catch (e) { console.error('[Konduyt]', e) } })
    }
  }

  // Expose
  global.KonduytClient = KonduytClient
  // Backward compat — Konduyt points to KonduytClient
  global.Konduyt = KonduytClient

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KonduytClient, Konduyt: KonduytClient }
  }

})(typeof globalThis !== 'undefined' ? globalThis : window)
